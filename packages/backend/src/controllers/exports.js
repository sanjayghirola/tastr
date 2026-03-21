import Order from '../models/Order.js';
import User from '../models/User.js';
import Driver from '../models/Driver.js';
import AuditLog from '../models/AuditLog.js';
import Complaint from '../models/Complaint.js';
import Wallet from '../models/Wallet.js';
import GiftCard from '../models/GiftCard.js';
import { sendCSV } from '../services/exportService.js';

// ─── GET /api/admin/exports/orders ────────────────────────────────────────────
export async function exportOrders(req, res, next) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }
    const orders = await Order.find(filter)
      .populate('customerId', 'name email')
      .populate('restaurantId', 'name')
      .populate('driverId', 'name')
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

    const data = orders.map(o => ({
      orderId: o.orderId || o._id.toString().slice(-8),
      customer: o.customerId?.name || '',
      customerEmail: o.customerId?.email || '',
      restaurant: o.restaurantId?.name || '',
      driver: o.driverId?.name || '',
      status: o.status,
      subtotal: (o.subtotal / 100).toFixed(2),
      deliveryFee: (o.deliveryFee / 100).toFixed(2),
      total: (o.total / 100).toFixed(2),
      paymentMethod: o.paymentMethod || '',
      type: o.type || 'STANDARD',
      createdAt: o.createdAt,
    }));

    sendCSV(res, data,
      ['orderId','customer','customerEmail','restaurant','driver','status','subtotal','deliveryFee','total','paymentMethod','type','createdAt'],
      'orders-export.csv',
      { orderId: 'Order ID', customerEmail: 'Customer Email', deliveryFee: 'Delivery Fee', paymentMethod: 'Payment Method', createdAt: 'Date' }
    );
  } catch (err) { next(err); }
}

// ─── GET /api/admin/exports/customers ─────────────────────────────────────────
export async function exportCustomers(req, res, next) {
  try {
    const users = await User.find({ role: 'CUSTOMER' })
      .select('name email phone status createdAt isStudentVerified')
      .sort({ createdAt: -1 })
      .limit(50000)
      .lean();

    sendCSV(res, users,
      ['name','email','phone','status','isStudentVerified','createdAt'],
      'customers-export.csv',
      { isStudentVerified: 'Student Verified', createdAt: 'Joined Date' }
    );
  } catch (err) { next(err); }
}

// ─── GET /api/admin/exports/drivers ───────────────────────────────────────────
export async function exportDrivers(req, res, next) {
  try {
    const drivers = await Driver.find()
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(50000)
      .lean();

    const data = drivers.map(d => ({
      name: d.userId?.name || d.name || '',
      email: d.userId?.email || '',
      phone: d.userId?.phone || '',
      vehicle: d.vehicle?.type || '',
      status: d.status,
      rating: d.rating || '',
      reviewCount: d.reviewCount || 0,
      createdAt: d.createdAt,
    }));

    sendCSV(res, data,
      ['name','email','phone','vehicle','status','rating','reviewCount','createdAt'],
      'drivers-export.csv',
      { reviewCount: 'Reviews', createdAt: 'Registered Date' }
    );
  } catch (err) { next(err); }
}

// ─── GET /api/admin/exports/audit-logs ────────────────────────────────────────
export async function exportAuditLogs(req, res, next) {
  try {
    const filter = {};
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(50000).lean();

    const data = logs.map(l => ({
      admin: l.adminName || '',
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId?.toString() || '',
      ip: l.ip || '',
      notes: l.notes || '',
      createdAt: l.createdAt,
    }));

    sendCSV(res, data,
      ['admin','action','targetType','targetId','ip','notes','createdAt'],
      'audit-logs-export.csv',
      { targetType: 'Target Type', targetId: 'Target ID', createdAt: 'Date' }
    );
  } catch (err) { next(err); }
}

// ─── GET /api/admin/exports/complaints ────────────────────────────────────────
export async function exportComplaints(req, res, next) {
  try {
    const complaints = await Complaint.find()
      .populate('customerId', 'name email')
      .populate('restaurantId', 'name')
      .sort({ createdAt: -1 })
      .limit(50000)
      .lean();

    const data = complaints.map(c => ({
      orderId: c.orderId?.toString()?.slice(-8) || '',
      customer: c.customerId?.name || '',
      restaurant: c.restaurantId?.name || '',
      type: c.type || '',
      status: c.status,
      description: (c.description || '').substring(0, 200),
      resolution: c.resolution || '',
      createdAt: c.createdAt,
    }));

    sendCSV(res, data,
      ['orderId','customer','restaurant','type','status','description','resolution','createdAt'],
      'complaints-export.csv'
    );
  } catch (err) { next(err); }
}

// ─── GET /api/admin/exports/gift-cards ────────────────────────────────────────
export async function exportGiftCards(req, res, next) {
  try {
    const cards = await GiftCard.find().sort({ createdAt: -1 }).limit(50000).lean();

    const data = cards.map(c => ({
      code: c.code,
      value: (c.value / 100).toFixed(2),
      balance: (c.balance / 100).toFixed(2),
      status: c.status,
      purchasedBy: c.purchasedBy?.toString() || '',
      redeemedBy: c.redeemedBy?.toString() || '',
      expiresAt: c.expiresAt || '',
      createdAt: c.createdAt,
    }));

    sendCSV(res, data,
      ['code','value','balance','status','purchasedBy','redeemedBy','expiresAt','createdAt'],
      'gift-cards-export.csv'
    );
  } catch (err) { next(err); }
}

// ─── GET /api/admin/exports/revenue ───────────────────────────────────────────
export async function exportRevenue(req, res, next) {
  try {
    const match = { status: 'delivered' };
    if (req.query.from || req.query.to) {
      match.createdAt = {};
      if (req.query.from) match.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) match.createdAt.$lte = new Date(req.query.to);
    }

    const data = await Order.aggregate([
      { $match: match },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orders: { $sum: 1 },
        revenue: { $sum: '$total' },
        avgOrder: { $avg: '$total' },
      }},
      { $sort: { _id: 1 } },
    ]);

    const formatted = data.map(d => ({
      date: d._id,
      orders: d.orders,
      revenue: (d.revenue / 100).toFixed(2),
      avgOrder: (d.avgOrder / 100).toFixed(2),
    }));

    sendCSV(res, formatted,
      ['date','orders','revenue','avgOrder'],
      'revenue-export.csv',
      { avgOrder: 'Avg Order Value' }
    );
  } catch (err) { next(err); }
}
