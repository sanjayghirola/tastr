import Restaurant from '../models/Restaurant.js';
import Driver from '../models/Driver.js';
import User from '../models/User.js';
import CmsPage from '../models/CmsPage.js';
import Order from '../models/Order.js';
import { ENTITY_STATUS, ROLES } from '@tastr/shared';
import { getStripe } from '../config/stripe.js';
import { notify } from '../services/notificationService.js';
import { sendRestaurantApproved, sendRestaurantRejected } from '../services/email.js';
import { paginationMeta } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import { emitOrderStatus } from '../sockets/index.js';

// ─── GET /api/admin/restaurants (all statuses) ───────────────────────────────
export async function getRestaurants(req, res, next) {
  try {
    const page   = parseInt(req.query.page  || '1');
    const limit  = parseInt(req.query.limit || '20');
    const skip   = (page - 1) * limit;
    const filter = {};
    if (req.query.status)  filter.status   = req.query.status;
    if (req.query.cuisine) filter.cuisines  = { $regex: req.query.cuisine, $options: 'i' };
    if (req.query.city)    filter['address.city'] = { $regex: req.query.city, $options: 'i' };
    if (req.query.q)       filter.$text     = { $search: req.query.q };

    const [restaurants, total] = await Promise.all([
      Restaurant.find(filter)
        .populate('ownerId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Restaurant.countDocuments(filter),
    ]);
    res.json({ success: true, restaurants, pagination: paginationMeta(total, page, limit) });
  } catch (err) { next(err); }
}

// ─── GET /api/admin/restaurants/:id ──────────────────────────────────────────
export async function getRestaurantById(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('ownerId', 'name email phone')
      .lean();
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    res.json({ success: true, restaurant });
  } catch (err) { next(err); }
}

// ─── GET /api/admin/restaurants/pending ──────────────────────────────────────
export async function getPendingRestaurants(req, res, next) {
  try {
    const page  = parseInt(req.query.page  || '1');
    const limit = parseInt(req.query.limit || '20');
    const skip  = (page - 1) * limit;

    const [restaurants, total] = await Promise.all([
      Restaurant.find({ status: ENTITY_STATUS.PENDING })
        .populate('ownerId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Restaurant.countDocuments({ status: ENTITY_STATUS.PENDING }),
    ]);

    res.json({
      success: true,
      restaurants,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) { next(err); }
}

// ─── PATCH /api/admin/restaurants/:id/status ─────────────────────────────────
export async function updateRestaurantStatus(req, res, next) {
  try {
    const { status, reason } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    restaurant.status = status;
    if (status === ENTITY_STATUS.REJECTED) {
      restaurant.rejectionReason = reason || 'Application rejected';
    } else if (status === ENTITY_STATUS.ACTIVE) {
      restaurant.approvedBy = req.user._id;
      restaurant.approvedAt = new Date();
    }
    await restaurant.save();

    // Send notification + email to restaurant owner
    try {
      const owner = await User.findById(restaurant.ownerId).lean();
      if (owner) {
        if (status === ENTITY_STATUS.ACTIVE) {
          await notify(owner._id.toString(), { title: 'Restaurant Approved!', body: `${restaurant.name} is now live on Tastr.`, type: 'success', meta: { restaurantId: restaurant._id.toString() } });
          if (owner.email) await sendRestaurantApproved({ to: owner.email, restaurantName: restaurant.name, ownerName: owner.name }).catch(() => {});
        } else if (status === ENTITY_STATUS.REJECTED) {
          await notify(owner._id.toString(), { title: 'Application Update', body: `${restaurant.name} was not approved. ${reason || ''}`, type: 'alert', meta: { restaurantId: restaurant._id.toString() } });
          if (owner.email) await sendRestaurantRejected({ to: owner.email, restaurantName: restaurant.name, ownerName: owner.name, reason }).catch(() => {});
        } else if (status === ENTITY_STATUS.SUSPENDED) {
          await notify(owner._id.toString(), { title: 'Account Suspended', body: `${restaurant.name} has been suspended. Contact support for details.`, type: 'alert' });
        }
      }
    } catch (notifErr) { logger.warn('Restaurant status notification failed:', notifErr.message); }

    logger.info(`Admin ${req.user._id} set restaurant ${req.params.id} → ${status}`);
    res.json({ success: true, restaurant });
  } catch (err) { next(err); }
}

// ─── GET /api/admin/drivers/pending ──────────────────────────────────────────
export async function getPendingDrivers(req, res, next) {
  try {
    const page  = parseInt(req.query.page  || '1');
    const limit = parseInt(req.query.limit || '20');
    const skip  = (page - 1) * limit;

    const [drivers, total] = await Promise.all([
      Driver.find({ status: ENTITY_STATUS.PENDING })
        .populate('userId', 'name email phone profilePhoto')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Driver.countDocuments({ status: ENTITY_STATUS.PENDING }),
    ]);

    res.json({
      success: true,
      drivers,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) { next(err); }
}

// ─── PATCH /api/admin/drivers/:id/status ─────────────────────────────────────
export async function updateDriverStatus(req, res, next) {
  try {
    const status = (req.body.status || '').toUpperCase();
    const reason = req.body.reason;
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    if (status === 'REQUEST_DOCS') {
      // Keep PENDING, store rejection reason as doc request message
      driver.rejectionReason = reason || 'Additional documents required';
    } else {
      driver.status = status;
      if (status === ENTITY_STATUS.REJECTED) {
        driver.rejectionReason = reason;
      } else if (status === ENTITY_STATUS.SUSPENDED) {
        driver.rejectionReason = reason;
        driver.isOnline = false;
      } else if (status === ENTITY_STATUS.ACTIVE) {
        driver.approvedBy = req.user._id;
        driver.approvedAt = new Date();
        driver.rejectionReason = null;
        // Also activate the user account
        await User.findByIdAndUpdate(driver.userId, { status: ENTITY_STATUS.ACTIVE });
      }
    }
    await driver.save();

    logger.info(`Admin ${req.user._id} set driver ${req.params.id} → ${status}`);
    res.json({ success: true, driver });
  } catch (err) { next(err); }
}

// ─── CMS ──────────────────────────────────────────────────────────────────────
export async function listCmsPages(req, res, next) {
  try {
    const pages = await CmsPage.find().lean();
    res.json({ success: true, pages });
  } catch (err) { next(err); }
}

export async function upsertCmsPage(req, res, next) {
  try {
    const { title, content } = req.body;
    const page = await CmsPage.findOneAndUpdate(
      { slug: req.params.slug },
      { title, content, updatedBy: req.admin?._id || req.user?._id },
      { upsert: true, new: true },
    );
    res.json({ success: true, page });
  } catch (err) { next(err); }
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function listOrders(req, res, next) {
  try {
    const page   = parseInt(req.query.page  || 1);
    const limit  = parseInt(req.query.limit || 20);
    const filter = {};
    if (req.query.status)   filter.status = req.query.status;
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo)   filter.createdAt.$lte = new Date(req.query.dateTo + 'T23:59:59Z');
    }
    if (req.query.search) {
      filter.$or = [
        { orderId: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customerId', 'name email')
        .populate('restaurantId', 'name')
        .populate('driverId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, orders, ...paginationMeta(total, page, limit) });
  } catch (err) { next(err); }
}

export async function getOrderById(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('restaurantId', 'name address phone')
      .populate('driverId', 'name photo vehicle rating')
      .lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) { next(err); }
}

export async function reassignDriver(req, res, next) {
  try {
    const { driverId } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { driverId, $push: { timeline: { status: 'driver_assigned', actorId: req.user._id, actorType: 'admin', note: `Driver reassigned by admin` } } },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    try { emitOrderStatus(order._id.toString(), { orderId: order._id.toString(), status: 'driver_assigned', driverId }); } catch {}
    res.json({ success: true, order });
  } catch (err) { next(err); }
}

export async function issueRefund(req, res, next) {
  try {
    const { amountPence, reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    // Attempt Stripe refund if charge exists
    if (order.stripeChargeId || order.paymentIntentId) {
      try {
        const stripe = getStripe();
        await stripe.refunds.create({
          payment_intent: order.paymentIntentId,
          amount: amountPence || undefined, // null = full refund
          reason: 'requested_by_customer',
        });
      } catch (refundErr) {
        logger.warn(`Stripe refund failed for order ${order._id}: ${refundErr.message}`);
      }
    }
    order.refundAmount = amountPence;
    order.timeline.push({ status: 'refunded', actorId: req.user._id, actorType: 'admin', note: `Refund £${(amountPence/100).toFixed(2)}: ${reason}` });
    await order.save();
    try { await notify(order.customerId.toString(), { title: 'Refund issued', body: `A refund of £${(amountPence/100).toFixed(2)} has been initiated for your order.`, type: 'wallet', meta: { orderId: order._id.toString(), event: 'refund_issued' } }); } catch {}
    res.json({ success: true, order });
  } catch (err) { next(err); }
}

export async function cancelOrderAdmin(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.status = 'cancelled';
    order.timeline.push({ status: 'cancelled', actorId: req.user._id, actorType: 'admin', note: req.body.reason || 'Cancelled by admin' });
    await order.save();
    try { emitOrderStatus(order._id.toString(), { orderId: order._id.toString(), status: 'cancelled' }); } catch {}
    res.json({ success: true, order });
  } catch (err) { next(err); }
}

export async function listDrivers(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || 50);
    const filter = {};
    if (req.query.status === 'online') {
      // Get online driver IDs from Redis
      const { getRedis } = await import('../config/redis.js');
      const onlineIds = await getRedis().smembers('drivers:online');
      filter._id = { $in: onlineIds };
    }
    const drivers = await Driver.find(filter)
      .select('name photo vehicle rating phone lastLocation')
      .limit(limit)
      .lean();
    res.json({ success: true, drivers });
  } catch (err) { next(err); }
}

// ─── Sales Report ─────────────────────────────────────────────────────────────
export async function salesReport(req, res, next) {
  try {
    const { from, to } = req.query;
    const match = { status: 'delivered' };
    if (from || to) { match.createdAt = {}; if (from) match.createdAt.$gte = new Date(from); if (to) match.createdAt.$lte = new Date(to); }
    const data = await (await import('../models/Order.js')).default.aggregate([
      { $match: match },
      { $group: { _id: '$restaurantId', orders: { $sum: 1 }, revenue: { $sum: '$total' }, avgOrder: { $avg: '$total' } } },
      { $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'r' } },
      { $unwind: '$r' },
      { $project: { name: '$r.name', city: '$r.address.city', orders: 1, revenue: 1, avgOrder: { $round: ['$avgOrder', 0] } } },
      { $sort: { revenue: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// ─── Platform stats (for dashboard) ──────────────────────────────────────────
export async function platformStats(req, res, next) {
  try {
    const [Order, Restaurant, Driver, User] = await Promise.all([
      import('../models/Order.js'), import('../models/Restaurant.js'),
      import('../models/Driver.js'), import('../models/User.js'),
    ]);
    const today = new Date(); today.setHours(0,0,0,0);
    const [liveOrders, todayOrders, activeRestaurants, activeDrivers, newCustomers] = await Promise.all([
      Order.default.countDocuments({ status: { $in: ['confirmed','preparing','ready','on_the_way'] } }),
      Order.default.countDocuments({ createdAt: { $gte: today } }),
      Restaurant.default.countDocuments({ status: 'active', isOnline: true }),
      Driver.default.countDocuments({ status: 'active', isOnline: true }),
      User.default.countDocuments({ role: 'CUSTOMER', createdAt: { $gte: today } }),
    ]);
    res.json({ success: true, liveOrders, todayOrders, activeRestaurants, activeDrivers, newCustomers });
  } catch (err) { next(err); }
}

// ─── Notif templates ──────────────────────────────────────────────────────────
const DEFAULT_TEMPLATES = [
  { trigger: 'order_placed',    title: 'Order Confirmed', body: 'Your order #{{orderId}} has been confirmed.' },
  { trigger: 'driver_assigned', title: 'Driver on the Way', body: '{{driverName}} is heading to the restaurant.' },
  { trigger: 'order_delivered', title: 'Order Delivered', body: 'Your order has been delivered. Enjoy!' },
  { trigger: 'otp',             title: 'Your OTP', body: 'Your Tastr verification code is {{otp}}.' },
  { trigger: 'refund_issued',   title: 'Refund Issued', body: '{{amount}} has been refunded to your wallet.' },
];
let notifTemplates = [...DEFAULT_TEMPLATES];
export async function listNotifTemplates(req, res) { res.json({ success: true, templates: notifTemplates }); }
export async function updateNotifTemplate(req, res) {
  const { trigger } = req.params;
  notifTemplates = notifTemplates.map(t => t.trigger === trigger ? { ...t, ...req.body } : t);
  res.json({ success: true, templates: notifTemplates });
}

// ─── Navigation config ────────────────────────────────────────────────────────
let navConfig = {
  customer: [
    { key: 'home',     label: 'Home',     enabled: true },
    { key: 'search',   label: 'Search',   enabled: true },
    { key: 'orders',   label: 'Orders',   enabled: true },
    { key: 'wallet',   label: 'Wallet',   enabled: true },
    { key: 'profile',  label: 'Profile',  enabled: true },
  ],
  restaurant: [
    { key: 'dashboard',  label: 'Dashboard', enabled: true },
    { key: 'orders',     label: 'Orders',    enabled: true },
    { key: 'menu',       label: 'Menu',      enabled: true },
    { key: 'marketing',  label: 'Marketing', enabled: true },
  ],
};
export async function getNavConfig(req, res) { res.json({ success: true, navConfig }); }
export async function updateNavConfig(req, res) { navConfig = req.body; res.json({ success: true, navConfig }); }

// ─── Catalog / Verticals ──────────────────────────────────────────────────────
let verticals = [
  { key: 'food',         label: 'Food',         enabled: true,  commission: 15, deliveryFee: 199, icon: '🍔', color: '#C18B3C' },
  { key: 'grocery',      label: 'Grocery',       enabled: true,  commission: 12, deliveryFee: 149, icon: '🛒', color: '#10B981' },
  { key: 'alcohol',      label: 'Alcohol',       enabled: false, commission: 18, deliveryFee: 299, icon: '🍺', color: '#6366F1' },
  { key: 'health_care',  label: 'Health & Care', enabled: false, commission: 10, deliveryFee: 199, icon: '💊', color: '#EC4899' },
];
export async function listVerticals(req, res) { res.json({ success: true, verticals }); }
export async function updateVertical(req, res) {
  const { key } = req.params;
  verticals = verticals.map(v => v.key === key ? { ...v, ...req.body } : v);
  res.json({ success: true, verticals });
}
export async function createVertical(req, res) {
  verticals.push(req.body);
  res.status(201).json({ success: true, verticals });
}

// ─── POST /api/admin/drivers/create ──────────────────────────────────────────
export async function adminCreateDriver(req, res, next) {
  try {
    const {
      name, email, phone, password,
      vehicleType, vehiclePlate,
      nationalInsuranceNumber, licenceNumber,
      city, postcode,
    } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, phone and password are required' });
    }

    // Check duplicate
    const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, ...(phone ? [{ phone }] : [])] });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email or phone already registered' });
    }

    // Create user account with DRIVER role
    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      phone,
      passwordHash: password,
      role: ROLES.DRIVER,
      status: ENTITY_STATUS.ACTIVE,
    });

    // Create driver record
    const driver = await Driver.create({
      userId: user._id,
      vehicleType: vehicleType || 'bicycle',
      vehiclePlate: vehiclePlate || '',
      nationalInsuranceNumber: nationalInsuranceNumber || '',
      licenceNumber: licenceNumber || '',
      status: ENTITY_STATUS.ACTIVE,
      approvedBy: req.user._id,
      approvedAt: new Date(),
    });

    res.status(201).json({ success: true, driver, user: { _id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) { next(err); }
}

// ─── GET /api/admin/drivers-all ──────────────────────────────────────────────
export async function listAllDrivers(req, res, next) {
  try {
    const { page = 1, limit = 30, status, q } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (status) filter.status = status.toUpperCase();
    
    let drivers;
    let total;

    if (q) {
      // Search by name/email — need to join with User
      const userFilter = {
        role: 'DRIVER',
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } },
        ],
      };
      const matchingUsers = await User.find(userFilter).select('_id').lean();
      const userIds = matchingUsers.map(u => u._id);
      filter.userId = { $in: userIds };
    }

    [drivers, total] = await Promise.all([
      Driver.find(filter)
        .populate('userId', 'name email phone profilePhoto')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Driver.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / parseInt(limit));
    res.json({ success: true, drivers, total, page: parseInt(page), pages });
  } catch (err) { next(err); }
}

// ─── GET /api/admin/drivers/:id/profile ──────────────────────────────────────
export async function getDriverProfile(req, res, next) {
  try {
    const driver = await Driver.findById(req.params.id)
      .populate('userId', 'name email phone profilePhoto status createdAt')
      .lean();

    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    // Fetch recent deliveries
    const deliveries = await Order.find({ driverId: driver._id, status: 'DELIVERED' })
      .populate('restaurantId', 'name')
      .select('orderNumber total driverPayout tip status createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, driver, deliveries });
  } catch (err) { next(err); }
}
