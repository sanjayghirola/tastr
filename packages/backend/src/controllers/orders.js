import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import Driver from '../models/Driver.js';
import Review from '../models/Review.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import PromoCode from '../models/PromoCode.js';
import { getStripe, isStripeEnabled } from '../config/stripe.js';
import { ORDER_STATUS, ORDER_TYPE, PAYMENT_METHOD } from '@tastr/shared';
import { paginationMeta } from '../utils/helpers.js';
import { emitNewOrder, emitOrderStatus } from '../sockets/index.js';
import { dispatchOrder } from '../services/dispatch.js';
import mongoose from 'mongoose';
import { notifyOrderEvent } from '../services/notificationService.js';

const VAT_RATE = 0.20;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function calcCartSubtotal(items) {
  return items.reduce((sum, item) => {
    const tops = (item.selectedToppings || []).reduce((t, o) => t + (o.price || 0), 0);
    return sum + (item.price + tops) * item.quantity;
  }, 0);
}

async function buildOrderFromCart(cart, restaurant, deliveryAddress, extras = {}) {
  const items = cart.items.map(i => ({
    menuItemId:       i.menuItemId,
    name:             i.name,
    price:            i.price,
    quantity:         i.quantity,
    photoUrl:         i.photoUrl,
    selectedToppings: i.selectedToppings,
    note:             i.note,
    subtotal:         (i.price + (i.selectedToppings || []).reduce((s, t) => s + t.price, 0)) * i.quantity,
  }));

  const subtotal      = calcCartSubtotal(cart.items);
  const deliveryFee   = extras.expressSurcharge
    ? (restaurant.deliveryFee || 0) + (extras.expressSurcharge)
    : (restaurant.deliveryFee || 0);

  // Student discount — applied if restaurant offers it AND user is verified
  let studentDiscount = 0;
  if (extras.isStudentVerified && restaurant.offersStudentDiscount) {
    const pct = restaurant.studentDiscountPercent || 10;
    studentDiscount = Math.round(subtotal * pct / 100);
  }

  const discount      = (cart.promoDiscount || 0) + (cart.giftCardAmount || 0) + studentDiscount;
  const vatAmount     = Math.round(Math.max(0, subtotal - discount) * VAT_RATE);
  const tip           = cart.tip || 0;
  const donation      = cart.donation || 0;
  const total         = Math.max(0, subtotal + deliveryFee - discount + vatAmount + tip + donation);

  return {
    items, subtotal, deliveryFee, discount, vatAmount, tip, donation, total,
    studentDiscount,
    promoCode:        cart.promoCode,
    promoDiscount:    cart.promoDiscount || 0,
    giftCardCode:     cart.giftCardCode,
    giftCardAmount:   cart.giftCardAmount || 0,
    walletAmountUsed: extras.walletAmountUsed || 0,
    deliveryAddress,
    customerNote:         cart.customerNote,
    disposableEssentials: cart.disposableEssentials,
    restaurantId:         cart.restaurantId,
    customerId:           cart.userId,
  };
}

async function createPaymentIntent(amount, customerId, metadata = {}) {
  const stripe = getStripe();
  const user   = await User.findById(customerId).select('stripeCustomerId email').lean();
  let stripeCustomerId = user?.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ email: user?.email, metadata: { userId: customerId.toString() } });
    stripeCustomerId = customer.id;
    await User.findByIdAndUpdate(customerId, { stripeCustomerId });
  }
  return stripe.paymentIntents.create({
    amount, currency: 'gbp', customer: stripeCustomerId,
    automatic_payment_methods: { enabled: true },
    metadata: { ...metadata, userId: customerId.toString() },
  });
}

function resolveDeliveryAddress(user, addressId, addressBody) {
  if (addressBody) return addressBody;
  if (addressId) {
    const addr = user.addresses?.find(a => a._id.toString() === addressId);
    if (addr) return { label: addr.label, line1: addr.line1, city: addr.city, postcode: addr.postcode, lat: addr.lat, lng: addr.lng };
  }
  const def = user.addresses?.find(a => a.isDefault) || user.addresses?.[0];
  return def ? { label: def.label, line1: def.line1, city: def.city, postcode: def.postcode, lat: def.lat, lng: def.lng } : null;
}

// ─── Auto-accept helper ──────────────────────────────────────────────────────
async function handleAutoAccept(order, restaurant) {
  if (!restaurant.autoAcceptOrders) return;
  const delayMs = (restaurant.autoAcceptDelayMins || 2) * 60 * 1000;
  const prepTime = restaurant.defaultPrepTime || 25;

  setTimeout(async () => {
    try {
      const freshOrder = await Order.findById(order._id);
      if (!freshOrder || freshOrder.status !== ORDER_STATUS.PLACED) return;
      freshOrder.status = ORDER_STATUS.ACCEPTED;
      freshOrder.prepTime = prepTime;
      freshOrder.autoAccepted = true;
      freshOrder.estimatedDeliveryAt = new Date(Date.now() + (prepTime + 15) * 60 * 1000);
      freshOrder.timeline.push({
        status: ORDER_STATUS.ACCEPTED, actorType: 'system',
        note: `Auto-accepted after ${restaurant.autoAcceptDelayMins || 2} min`,
      });
      await freshOrder.save();
      try {
        emitOrderStatus(freshOrder._id.toString(), {
          orderId: freshOrder._id.toString(), status: ORDER_STATUS.ACCEPTED,
          prepTime, autoAccepted: true,
        });
      } catch {}
      try { await notifyOrderEvent(freshOrder, 'order_accepted', { prepTime }); } catch {}
      try { dispatchOrder(freshOrder._id.toString()); } catch {}
    } catch (err) { console.error('Auto-accept error:', err); }
  }, delayMs);
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────
export async function createOrder(req, res, next) {
  try {
    const { deliveryAddressId, deliveryAddress: addrBody, paymentMethod, paymentMethodId, deliveryMethod = 'standard' } = req.body;
    const user = await User.findById(req.user._id).lean();
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart || !cart.items.length) return res.status(400).json({ success: false, message: 'Cart is empty' });

    const restaurant = await Restaurant.findById(cart.restaurantId).lean();
    if (!restaurant?.isOnline) return res.status(400).json({ success: false, message: 'Restaurant is currently offline' });

    // Check order queue limit
    if (restaurant.orderQueueLimit) {
      const activeCount = await Order.countDocuments({
        restaurantId: cart.restaurantId,
        status: { $in: [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING] },
      });
      if (activeCount >= restaurant.orderQueueLimit) {
        return res.status(400).json({ success: false, message: 'Restaurant order queue is full. Please try again later.' });
      }
    }

    const deliveryAddr = resolveDeliveryAddress(user, deliveryAddressId, addrBody);
    if (!deliveryAddr) return res.status(400).json({ success: false, message: 'Delivery address required' });

    const extras = { expressSurcharge: deliveryMethod === 'express' ? 200 : 0, isStudentVerified: !!user.isStudentVerified };
    const orderData = await buildOrderFromCart(cart, restaurant, deliveryAddr, extras);

    if (paymentMethod === PAYMENT_METHOD.WALLET) {
      const wallet = await Wallet.findOne({ userId: req.user._id });
      if (!wallet || wallet.balance < orderData.total) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }
    }

    const order = await Order.create({
      ...orderData, type: ORDER_TYPE.STANDARD, status: ORDER_STATUS.PENDING,
      paymentMethod, timeline: [{ status: ORDER_STATUS.PENDING, actorType: 'customer' }],
    });

    let clientSecret = null;
    let razorpayOrder = null;

    if (paymentMethod === PAYMENT_METHOD.RAZORPAY) {
      try {
        const { getRazorpay } = await import('../config/razorpay.js');
        const rzp = getRazorpay();
        const rzpOrder = await rzp.orders.create({
          amount: orderData.total, currency: process.env.RAZORPAY_CURRENCY || 'INR',
          receipt: order._id.toString(),
          notes: { orderId: order._id.toString(), userId: req.user._id.toString() },
        });
        order.paymentGateway = 'RAZORPAY';
        order.razorpayOrderId = rzpOrder.id;
        await order.save();
        razorpayOrder = { id: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency, key: process.env.RAZORPAY_KEY_ID };
      } catch (rzpErr) {
        await Order.findByIdAndDelete(order._id);
        return res.status(500).json({ success: false, message: 'Razorpay order creation failed: ' + rzpErr.message });
      }
    } else if (paymentMethod === PAYMENT_METHOD.CARD || paymentMethod === PAYMENT_METHOD.APPLE_PAY || paymentMethod === PAYMENT_METHOD.GOOGLE_PAY) {
      if (!isStripeEnabled()) {
        await Order.findByIdAndDelete(order._id);
        return res.status(400).json({ success: false, message: 'Stripe is not configured. Please use Razorpay or Wallet.' });
      }
      const intent = await createPaymentIntent(orderData.total, req.user._id, { orderId: order._id.toString() });
      order.paymentIntentId = intent.id;
      await order.save();
      clientSecret = intent.client_secret;
    } else if (paymentMethod === PAYMENT_METHOD.WALLET) {
      const wallet = await Wallet.findOne({ userId: req.user._id });
      await wallet.debit(orderData.total, `Order ${order.orderId}`, { orderId: order._id });
      order.status = ORDER_STATUS.PLACED;
      order.timeline.push({ status: ORDER_STATUS.PLACED, actorType: 'system', note: 'Paid via wallet' });
      await order.save();
      await Cart.findOneAndDelete({ userId: req.user._id });
      if (cart.promoCode) await PromoCode.findOneAndUpdate({ code: cart.promoCode }, { $inc: { usedCount: 1 } });
      try { emitNewOrder(order.restaurantId.toString(), order); } catch {}
      handleAutoAccept(order, restaurant);
    }

    res.status(201).json({ success: true, order, clientSecret, razorpayOrder });
  } catch (err) { next(err); }
}

// ─── POST /api/orders/schedule ────────────────────────────────────────────────
export async function createScheduledOrder(req, res, next) {
  try {
    const { deliveryAddressId, deliveryAddress: addrBody, paymentMethod, scheduledAt } = req.body;
    const user = await User.findById(req.user._id).lean();
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart || !cart.items.length) return res.status(400).json({ success: false, message: 'Cart is empty' });

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) return res.status(400).json({ success: false, message: 'Scheduled time must be in the future' });

    const restaurant = await Restaurant.findById(cart.restaurantId).lean();
    const deliveryAddr = resolveDeliveryAddress(user, deliveryAddressId, addrBody);
    if (!deliveryAddr) return res.status(400).json({ success: false, message: 'Delivery address required' });

    const orderData = await buildOrderFromCart(cart, restaurant, deliveryAddr);
    const order = await Order.create({
      ...orderData, type: ORDER_TYPE.SCHEDULED, status: ORDER_STATUS.PENDING,
      scheduledAt: scheduledDate, paymentMethod,
      timeline: [{ status: ORDER_STATUS.PENDING, actorType: 'customer' }],
    });

    let clientSecret = null;
    if (paymentMethod === PAYMENT_METHOD.CARD || paymentMethod === PAYMENT_METHOD.APPLE_PAY || paymentMethod === PAYMENT_METHOD.GOOGLE_PAY) {
      if (!isStripeEnabled()) return res.status(400).json({ success: false, message: 'Stripe is not configured.' });
      const intent = await createPaymentIntent(orderData.total, req.user._id, { orderId: order._id.toString() });
      order.paymentIntentId = intent.id;
      await order.save();
      clientSecret = intent.client_secret;
    }

    await Cart.findOneAndDelete({ userId: req.user._id });
    res.status(201).json({ success: true, order, clientSecret });
  } catch (err) { next(err); }
}

// ─── POST /api/orders/gift ────────────────────────────────────────────────────
export async function createGiftOrder(req, res, next) {
  try {
    const { paymentMethod, giftRecipient } = req.body;
    const user = await User.findById(req.user._id).lean();
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart || !cart.items.length) return res.status(400).json({ success: false, message: 'Cart is empty' });

    const restaurant = await Restaurant.findById(cart.restaurantId).lean();
    const orderData  = await buildOrderFromCart(cart, restaurant, giftRecipient.address);
    const order = await Order.create({
      ...orderData, type: ORDER_TYPE.GIFT, status: ORDER_STATUS.PENDING,
      giftRecipient, paymentMethod,
      timeline: [{ status: ORDER_STATUS.PENDING, actorType: 'customer' }],
    });

    let clientSecret = null;
    let razorpayOrder = null;
    if (paymentMethod === PAYMENT_METHOD.RAZORPAY) {
      try {
        const { getRazorpay } = await import('../config/razorpay.js');
        const rzp = getRazorpay();
        const rzpOrder = await rzp.orders.create({
          amount: orderData.total, currency: process.env.RAZORPAY_CURRENCY || 'INR',
          receipt: order._id.toString(),
          notes: { orderId: order._id.toString(), userId: req.user._id.toString() },
        });
        order.paymentGateway = 'RAZORPAY';
        order.razorpayOrderId = rzpOrder.id;
        await order.save();
        razorpayOrder = { id: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency, key: process.env.RAZORPAY_KEY_ID };
      } catch (rzpErr) {
        return res.status(500).json({ success: false, message: 'Razorpay order creation failed: ' + rzpErr.message });
      }
    } else if (paymentMethod !== PAYMENT_METHOD.WALLET) {
      if (!isStripeEnabled()) return res.status(400).json({ success: false, message: 'Stripe is not configured.' });
      const intent = await createPaymentIntent(orderData.total, req.user._id, { orderId: order._id.toString() });
      order.paymentIntentId = intent.id;
      await order.save();
      clientSecret = intent.client_secret;
    }

    await Cart.findOneAndDelete({ userId: req.user._id });
    res.status(201).json({ success: true, order, clientSecret, razorpayOrder });
  } catch (err) { next(err); }
}

// ─── GET /api/orders ──────────────────────────────────────────────────────────
export async function listMyOrders(req, res, next) {
  try {
    const page  = parseInt(req.query.page  || '1');
    const limit = parseInt(req.query.limit || '20');
    const filter = { customerId: req.user._id };

    if (req.query.status) {
      const statuses = req.query.status.split(',').map(s => s.trim().toUpperCase());
      filter.status = { $in: statuses };
    }
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo)   filter.createdAt.$lte = new Date(new Date(req.query.dateTo).setHours(23, 59, 59, 999));
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('restaurantId', 'name logoUrl')
        .populate('driverId',     'name profilePhoto')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, orders, ...paginationMeta(total, page, limit) });
  } catch (err) { next(err); }
}

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
export async function getOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurantId', 'name logoUrl phone address')
      .populate('driverId',     'name phone profilePhoto vehicleType vehiclePlate')
      .populate('customerId',   'name phone email')
      .lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const userId = req.user._id.toString();
    const isCustomer   = order.customerId?._id?.toString() === userId;
    const isDriver     = order.driverId?._id?.toString() === userId;
    const isAdmin      = ['SUPER_ADMIN', 'SUB_ADMIN'].includes(req.user.role);

    let isRestaurant = false;
    if (!isCustomer && !isDriver && !isAdmin) {
      const rest = await Restaurant.findOne({
        _id: order.restaurantId?._id || order.restaurantId,
        $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
      }).select('_id').lean();
      isRestaurant = !!rest;
    }

    if (!isCustomer && !isDriver && !isAdmin && !isRestaurant) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({ success: true, order });
  } catch (err) { next(err); }
}

// ─── GET /api/orders/restaurant/active ───────────────────────────────────────
export async function getRestaurantOrders(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    }).select('_id autoAcceptOrders autoAcceptDelayMins defaultPrepTime orderQueueLimit kitchenAlerts').lean();
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const orders = await Order.find({
      restaurantId: restaurant._id,
      status: { $nin: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED, ORDER_STATUS.FAILED] },
    })
      .populate('customerId', 'name phone email')
      .populate('driverId', 'name phone vehicleType vehiclePlate')
      .sort({ createdAt: -1 }).lean();

    res.json({ success: true, orders, settings: {
      autoAcceptOrders: restaurant.autoAcceptOrders,
      autoAcceptDelayMins: restaurant.autoAcceptDelayMins,
      defaultPrepTime: restaurant.defaultPrepTime,
      orderQueueLimit: restaurant.orderQueueLimit,
      kitchenAlerts: restaurant.kitchenAlerts,
    }});
  } catch (err) { next(err); }
}

// ─── GET /api/orders/restaurant/history ──────────────────────────────────────
export async function getRestaurantOrderHistory(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    }).select('_id').lean();
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const page  = parseInt(req.query.page  || '1');
    const limit = parseInt(req.query.limit || '20');
    const filter = { restaurantId: restaurant._id };

    if (req.query.status) {
      filter.status = { $in: req.query.status.split(',').map(s => s.trim().toUpperCase()) };
    } else {
      filter.status = { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED] };
    }
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo)   filter.createdAt.$lte = new Date(new Date(req.query.dateTo).setHours(23, 59, 59, 999));
    }
    if (req.query.q) filter.orderId = new RegExp(req.query.q, 'i');

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customerId', 'name phone email')
        .populate('driverId',   'name phone')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, orders, ...paginationMeta(total, page, limit) });
  } catch (err) { next(err); }
}

// ─── GET /api/orders/restaurant/all ──────────────────────────────────────────
export async function getRestaurantAllOrders(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    }).select('_id').lean();
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const page  = parseInt(req.query.page  || '1');
    const limit = parseInt(req.query.limit || '20');
    const filter = { restaurantId: restaurant._id };

    if (req.query.status) {
      filter.status = { $in: req.query.status.split(',').map(s => s.trim().toUpperCase()) };
    }
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo)   filter.createdAt.$lte = new Date(new Date(req.query.dateTo).setHours(23, 59, 59, 999));
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customerId', 'name phone email')
        .populate('driverId',   'name phone vehicleType vehiclePlate')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, orders, ...paginationMeta(total, page, limit) });
  } catch (err) { next(err); }
}

// ─── PATCH /api/orders/:id/status ────────────────────────────────────────────
export async function updateOrderStatus(req, res, next) {
  try {
    const { status, note, prepTime } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const normalizedStatus = status.toUpperCase();
    const validTransitions = {
      PLACED:          ['ACCEPTED', 'REJECTED', 'CANCELLED'],
      ACCEPTED:        ['PREPARING', 'CANCELLED'],
      PREPARING:       ['READY', 'CANCELLED'],
      READY:           ['DRIVER_ASSIGNED', 'ON_WAY', 'DELIVERED'],
      DRIVER_ASSIGNED: ['ON_WAY', 'DELIVERED'],
      ON_WAY:          ['DELIVERED'],
    };

    const allowed = validTransitions[order.status] || [];
    if (allowed.length > 0 && !allowed.includes(normalizedStatus)) {
      return res.status(400).json({ success: false, message: `Cannot transition from ${order.status} to ${normalizedStatus}` });
    }

    order.status = normalizedStatus;
    order.timeline.push({ status: normalizedStatus, actorId: req.user._id, actorType: 'restaurant', note });

    if (normalizedStatus === 'ACCEPTED' && prepTime) {
      order.prepTime = prepTime;
      order.estimatedDeliveryAt = new Date(Date.now() + (prepTime + 15) * 60 * 1000);
    }
    if (normalizedStatus === 'READY') order.readyAt = new Date();
    if (normalizedStatus === 'ON_WAY') order.pickedUpAt = new Date();

    await order.save();

    try {
      const payload = { orderId: order._id.toString(), status: normalizedStatus, note };
      if (normalizedStatus === 'ACCEPTED' && prepTime) payload.prepTime = prepTime;
      emitOrderStatus(order._id.toString(), payload);
    } catch {}
    try { await notifyOrderEvent(order, normalizedStatus.toLowerCase(), { note }); } catch {}

    if (normalizedStatus === 'READY' && !order.driverId) {
      try { dispatchOrder(order._id.toString()); } catch {}
    }

    const populated = await Order.findById(order._id)
      .populate('customerId', 'name phone email')
      .populate('driverId', 'name phone vehicleType vehiclePlate').lean();
    res.json({ success: true, order: populated });
  } catch (err) { next(err); }
}

// ─── PATCH /api/orders/:id/accept ────────────────────────────────────────────
export async function acceptOrder(req, res, next) {
  try {
    const { prepTime } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const restaurant = await Restaurant.findOne({
      _id: order.restaurantId,
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    }).select('_id defaultPrepTime').lean();
    if (!restaurant) return res.status(403).json({ success: false, message: 'Access denied' });
    if (order.status !== ORDER_STATUS.PLACED) {
      return res.status(400).json({ success: false, message: `Cannot accept order with status: ${order.status}` });
    }

    const actualPrepTime = prepTime || restaurant.defaultPrepTime || 25;
    order.status = ORDER_STATUS.ACCEPTED;
    order.prepTime = actualPrepTime;
    order.estimatedDeliveryAt = new Date(Date.now() + (actualPrepTime + 15) * 60 * 1000);
    order.timeline.push({ status: ORDER_STATUS.ACCEPTED, actorId: req.user._id, actorType: 'restaurant', note: `Prep time: ${actualPrepTime} min` });
    await order.save();

    try { emitOrderStatus(order._id.toString(), { orderId: order._id.toString(), status: ORDER_STATUS.ACCEPTED, prepTime: actualPrepTime }); } catch {}
    try { await notifyOrderEvent(order, 'order_accepted', { prepTime: actualPrepTime }); } catch {}
    try { dispatchOrder(order._id.toString()); } catch {}

    const populated = await Order.findById(order._id)
      .populate('customerId', 'name phone email')
      .populate('driverId', 'name phone vehicleType vehiclePlate').lean();
    res.json({ success: true, order: populated });
  } catch (err) { next(err); }
}

// ─── PATCH /api/orders/:id/reject ────────────────────────────────────────────
export async function rejectOrder(req, res, next) {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const restaurant = await Restaurant.findOne({
      _id: order.restaurantId,
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    }).select('_id').lean();
    if (!restaurant) return res.status(403).json({ success: false, message: 'Access denied' });
    if (order.status !== ORDER_STATUS.PLACED) {
      return res.status(400).json({ success: false, message: `Cannot reject order with status: ${order.status}` });
    }

    order.status = ORDER_STATUS.REJECTED;
    order.rejectionReason = reason || 'Order rejected by restaurant';
    order.timeline.push({ status: ORDER_STATUS.REJECTED, actorId: req.user._id, actorType: 'restaurant', note: reason || 'Order rejected by restaurant' });
    await order.save();

    try { emitOrderStatus(order._id.toString(), { orderId: order._id.toString(), status: ORDER_STATUS.REJECTED, reason }); } catch {}
    try { await notifyOrderEvent(order, 'order_rejected', { reason }); } catch {}
    res.json({ success: true, order });
  } catch (err) { next(err); }
}

// ─── PATCH /api/orders/:id/assign-driver ─────────────────────────────────────
export async function assignDriver(req, res, next) {
  try {
    const { driverId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const restaurant = await Restaurant.findOne({
      _id: order.restaurantId,
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    }).select('_id').lean();
    if (!restaurant) return res.status(403).json({ success: false, message: 'Access denied' });

    if (driverId) {
      const driver = await Driver.findById(driverId).lean();
      if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    order.driverId = driverId || null;
    if (driverId) {
      order.status = ORDER_STATUS.DRIVER_ASSIGNED;
      order.timeline.push({ status: ORDER_STATUS.DRIVER_ASSIGNED, actorId: req.user._id, actorType: 'restaurant', note: 'Driver manually assigned' });
    }
    await order.save();

    try { emitOrderStatus(order._id.toString(), { orderId: order._id.toString(), status: order.status, driverId }); } catch {}
    try { await notifyOrderEvent(order, 'driver_assigned', {}); } catch {}

    const populated = await Order.findById(order._id)
      .populate('customerId', 'name phone email')
      .populate('driverId', 'name phone vehicleType vehiclePlate').lean();
    res.json({ success: true, order: populated });
  } catch (err) { next(err); }
}

// ─── PATCH /api/orders/:id/mark-delivered ────────────────────────────────────
export async function markDelivered(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const deliverable = [ORDER_STATUS.ON_WAY, ORDER_STATUS.DRIVER_ASSIGNED, ORDER_STATUS.READY];
    if (!deliverable.includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot mark delivered from status: ${order.status}` });
    }

    order.status = ORDER_STATUS.DELIVERED;
    order.timeline.push({
      status: ORDER_STATUS.DELIVERED, actorId: req.user._id,
      actorType: req.user.role === 'DRIVER' ? 'driver' : 'restaurant',
      note: req.body.note || 'Marked as delivered',
    });
    await order.save();

    try { emitOrderStatus(order._id.toString(), { orderId: order._id.toString(), status: ORDER_STATUS.DELIVERED }); } catch {}
    try { await notifyOrderEvent(order, 'order_delivered', {}); } catch {}
    res.json({ success: true, order });
  } catch (err) { next(err); }
}

// ─── PATCH /api/orders/:id/restaurant-cancel ─────────────────────────────────
export async function restaurantCancelOrder(req, res, next) {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const restaurant = await Restaurant.findOne({
      _id: order.restaurantId,
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    }).select('_id').lean();
    if (!restaurant) return res.status(403).json({ success: false, message: 'Access denied' });

    const cancellable = [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY];
    if (!cancellable.includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel order with status: ${order.status}` });
    }

    order.status = ORDER_STATUS.CANCELLED;
    order.timeline.push({ status: ORDER_STATUS.CANCELLED, actorId: req.user._id, actorType: 'restaurant', note: reason || 'Cancelled by restaurant' });
    await order.save();

    try { emitOrderStatus(order._id.toString(), { orderId: order._id.toString(), status: ORDER_STATUS.CANCELLED, reason }); } catch {}
    try { await notifyOrderEvent(order, 'order_cancelled', { reason }); } catch {}
    res.json({ success: true, order });
  } catch (err) { next(err); }
}

// ─── PATCH /api/orders/:id/cancel (customer) ────────────────────────────────
export async function cancelOrder(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const cancellable = [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED];
    if (!cancellable.includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel order with status: ${order.status}` });
    }
    order.status = ORDER_STATUS.CANCELLED;
    order.timeline.push({ status: ORDER_STATUS.CANCELLED, actorId: req.user._id, actorType: 'customer', note: req.body.reason });
    await order.save();
    try { await notifyOrderEvent(order, 'order_cancelled', { reason: req.body.reason }); } catch {}
    res.json({ success: true, order });
  } catch (err) { next(err); }
}

// ─── POST /api/orders/:id/rate ────────────────────────────────────────────────
export async function rateOrder(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, customerId: req.user._id }).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== ORDER_STATUS.DELIVERED) {
      return res.status(400).json({ success: false, message: 'Can only rate delivered orders' });
    }

    const { restaurantRating, driverRating, appRating, restaurantComment, driverComment } = req.body;
    const created = [];

    if (restaurantRating) {
      try {
        const r = await Review.create({ orderId: order._id, reviewerId: req.user._id, targetId: order.restaurantId, targetType: 'restaurant', rating: restaurantRating, comment: restaurantComment });
        created.push(r);
        const agg = await Review.aggregate([
          { $match: { targetId: new mongoose.Types.ObjectId(order.restaurantId), targetType: 'restaurant', isVisible: true } },
          { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
        ]);
        if (agg[0]) await Restaurant.findByIdAndUpdate(order.restaurantId, { rating: parseFloat(agg[0].avg.toFixed(2)), reviewCount: agg[0].count });
      } catch (e) { if (e.code !== 11000) throw e; }
    }

    if (driverRating && order.driverId) {
      try {
        const r = await Review.create({ orderId: order._id, reviewerId: req.user._id, targetId: order.driverId, targetType: 'driver', rating: driverRating, comment: driverComment });
        created.push(r);
        const agg = await Review.aggregate([
          { $match: { targetId: new mongoose.Types.ObjectId(order.driverId), targetType: 'driver', isVisible: true } },
          { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
        ]);
        if (agg[0]) await Driver.findByIdAndUpdate(order.driverId, { rating: parseFloat(agg[0].avg.toFixed(2)), reviewCount: agg[0].count });
      } catch (e) { if (e.code !== 11000) throw e; }
    }

    if (appRating) {
      try {
        const r = await Review.create({ orderId: order._id, reviewerId: req.user._id, targetId: req.user._id, targetType: 'app', rating: appRating });
        created.push(r);
      } catch (e) { if (e.code !== 11000) throw e; }
    }

    await Order.findByIdAndUpdate(order._id, { isRated: true });
    res.json({ success: true, reviews: created });
  } catch (err) { next(err); }
}
