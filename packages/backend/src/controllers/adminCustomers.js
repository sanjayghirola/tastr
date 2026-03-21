import User from '../models/User.js';
import Order from '../models/Order.js';
import Wallet from '../models/Wallet.js';
import Subscription from '../models/Subscription.js';
import AuditLog from '../models/AuditLog.js';

// GET /api/admin/customers
export async function listCustomers(req, res, next) {
  try {
    const { page = 1, limit = 30, q, status } = req.query;
    const filter = { role: 'CUSTOMER' };
    if (status) filter.status = status;
    if (q) filter.$or = [
      { name: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
      { phone: new RegExp(q, 'i') },
    ];
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 })
        .skip((page-1)*limit).limit(Number(limit))
        .select('-passwordHash').lean(),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, customers: users, total, page: Number(page), pages: Math.ceil(total/limit) });
  } catch (err) { next(err); }
}

// GET /api/admin/customers/:id/profile
export async function getCustomerProfile(req, res, next) {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash').lean();
    if (!user) return res.status(404).json({ message: 'Customer not found' });

    const [orders, wallet, subscription] = await Promise.all([
      Order.find({ userId: req.params.id }).sort({ createdAt: -1 }).limit(20)
        .populate('restaurantId', 'name').lean(),
      Wallet.findOne({ userId: req.params.id }).lean(),
      Subscription.findOne({ userId: req.params.id, status: 'active' }).populate('planId', 'name').lean(),
    ]);

    const orderStats = {
      total:     orders.length,
      completed: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalSpent: orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0),
    };
    orderStats.avgValue = orderStats.completed > 0 ? Math.round(orderStats.totalSpent / orderStats.completed) : 0;

    res.json({ success: true, customer: user, orders, wallet, subscription, orderStats });
  } catch (err) { next(err); }
}

// PATCH /api/admin/users/:id/ban
export async function banUser(req, res, next) {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'BANNED', banReason: reason }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    await AuditLog.create({ adminId: req.admin._id, adminName: req.admin.name, action: 'BAN_USER', targetType: 'User', targetId: user._id, after: { reason }, ip: req.ip });
    res.json({ success: true, user });
  } catch (err) { next(err); }
}

// PATCH /api/admin/users/:id/unban
export async function unbanUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'ACTIVE', $unset: { banReason: '' } }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    await AuditLog.create({ adminId: req.admin._id, adminName: req.admin.name, action: 'UNBAN_USER', targetType: 'User', targetId: user._id, ip: req.ip });
    res.json({ success: true, user });
  } catch (err) { next(err); }
}

// GET /api/admin/drivers
export async function listDrivers(req, res, next) {
  try {
    const Driver = (await import('../models/Driver.js')).default;
    const { page = 1, limit = 30, q, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
    const [drivers, total] = await Promise.all([
      Driver.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)).populate('userId', 'name email phone').lean(),
      Driver.countDocuments(filter),
    ]);
    res.json({ success: true, drivers, total, page: Number(page), pages: Math.ceil(total/limit) });
  } catch (err) { next(err); }
}

// GET /api/admin/drivers/:id/profile
export async function getDriverProfile(req, res, next) {
  try {
    const Driver = (await import('../models/Driver.js')).default;
    const driver = await Driver.findById(req.params.id).populate('userId', 'name email phone').lean();
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    const deliveries = await Order.find({ driverId: req.params.id, status: 'delivered' }).limit(20).lean();
    res.json({ success: true, driver, deliveries });
  } catch (err) { next(err); }
}

// GET /api/admin/audit-logs
export async function listAuditLogs(req, res, next) {
  try {
    const { page = 1, limit = 50, adminId, targetType } = req.query;
    const filter = {};
    if (adminId) filter.adminId = adminId;
    if (targetType) filter.targetType = targetType;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)).lean(),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ success: true, logs, total, page: Number(page), pages: Math.ceil(total/limit) });
  } catch (err) { next(err); }
}

// GET /api/admin/sub-admins
export async function listSubAdmins(req, res, next) {
  try {
    const Admin = (await import('../models/Admin.js')).default;
    const admins = await Admin.find({ role: 'SUB_ADMIN' }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, admins });
  } catch (err) { next(err); }
}

// POST /api/admin/sub-admins
export async function createSubAdmin(req, res, next) {
  try {
    const Admin = (await import('../models/Admin.js')).default;
    const { name, email, password, permissions } = req.body;
    const exists = await Admin.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    const admin = await Admin.create({ name, email, passwordHash: password, role: 'SUB_ADMIN', permissions: permissions || [], createdBy: req.admin._id });
    res.status(201).json({ success: true, admin });
  } catch (err) { next(err); }
}

// PATCH /api/admin/sub-admins/:id
export async function updateSubAdmin(req, res, next) {
  try {
    const Admin = (await import('../models/Admin.js')).default;
    const admin = await Admin.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json({ success: true, admin });
  } catch (err) { next(err); }
}

// Admin Roles
export async function listAdminRoles(req, res, next) {
  try {
    const roles = await (await import('../models/Role.js')).default.find({ restaurantId: null }).lean();
    res.json({ success: true, roles });
  } catch (err) { next(err); }
}

export async function createAdminRole(req, res, next) {
  try {
    const Role = (await import('../models/Role.js')).default;
    const role = await Role.create({ ...req.body, restaurantId: null, createdBy: req.admin._id });
    res.status(201).json({ success: true, role });
  } catch (err) { next(err); }
}

export async function updateAdminRole(req, res, next) {
  try {
    const Role = (await import('../models/Role.js')).default;
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!role) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true, role });
  } catch (err) { next(err); }
}
