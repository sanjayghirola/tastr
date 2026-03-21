import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import { ORDER_STATUS } from '@tastr/shared';

// GET /api/restaurants/my/analytics OR /api/restaurants/:id/analytics
export async function getRestaurantAnalytics(req, res, next) {
  try {
    let id = req.params.id;
    // If accessing 'my' analytics, look up by owner
    if (id === 'my' || !id) {
      const r = await Restaurant.findOne({ ownerId: req.user._id }).select('_id').lean();
      if (!r) return res.status(404).json({ message: 'Restaurant not found' });
      id = r._id;
    }
    id = new mongoose.Types.ObjectId(id);
    const { days = 30 } = req.query;
    const since = new Date(); since.setDate(since.getDate() - Number(days));

    const [revenueAgg, topItems, hourAgg, completedCount] = await Promise.all([
      // Daily revenue
      Order.aggregate([
        { $match: { restaurantId: id, status: ORDER_STATUS.DELIVERED, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // Top items
      Order.aggregate([
        { $match: { restaurantId: id, status: ORDER_STATUS.DELIVERED, createdAt: { $gte: since } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.menuItemId', name: { $first: '$items.name' }, count: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { count: -1 } }, { $limit: 5 },
      ]),
      // Busy hours
      Order.aggregate([
        { $match: { restaurantId: id, createdAt: { $gte: since } } },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // Completed count
      Order.countDocuments({ restaurantId: id, status: ORDER_STATUS.DELIVERED, createdAt: { $gte: since } }),
    ]);

    const totalRevenue = revenueAgg.reduce((s, d) => s + d.revenue, 0);
    const totalOrders  = revenueAgg.reduce((s, d) => s + d.orders, 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    res.json({
      success: true,
      period: { days: Number(days), since },
      summary: { totalRevenue, totalOrders, avgOrderValue, completedCount },
      dailyRevenue: revenueAgg,
      topItems,
      busyHours: hourAgg,
    });
  } catch (err) { next(err); }
}

// GET /api/admin/reports/revenue
export async function adminRevenueReport(req, res, next) {
  try {
    const { from, to } = req.query;
    const match = { status: ORDER_STATUS.DELIVERED };
    if (from || to) { match.createdAt = {}; if (from) match.createdAt.$gte = new Date(from); if (to) match.createdAt.$lte = new Date(to); }

    const data = await Order.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 }, avgOrder: { $avg: '$total' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// GET /api/admin/reports/restaurants
export async function adminRestaurantReport(req, res, next) {
  try {
    const data = await Order.aggregate([
      { $match: { status: ORDER_STATUS.DELIVERED } },
      { $group: { _id: '$restaurantId', orders: { $sum: 1 }, revenue: { $sum: '$total' }, avgOrder: { $avg: '$total' } } },
      { $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'restaurant' } },
      { $unwind: '$restaurant' },
      { $project: { name: '$restaurant.name', orders: 1, revenue: 1, avgOrder: { $round: ['$avgOrder', 0] } } },
      { $sort: { revenue: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// GET /api/admin/reports/drivers
export async function adminDriverReport(req, res, next) {
  try {
    const Driver = (await import('../models/Driver.js')).default;
    const data = await Order.aggregate([
      { $match: { status: ORDER_STATUS.DELIVERED, driverId: { $exists: true } } },
      { $group: { _id: '$driverId', deliveries: { $sum: 1 }, avgRating: { $avg: '$driverRating' } } },
      { $lookup: { from: 'drivers', localField: '_id', foreignField: '_id', as: 'driver' } },
      { $unwind: '$driver' },
      { $project: { name: '$driver.name', deliveries: 1, avgRating: { $round: ['$avgRating', 1] } } },
      { $sort: { deliveries: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// GET /api/admin/dashboard-stats — single endpoint for admin dashboard
export async function adminDashboardStats(req, res, next) {
  try {
    const Driver = (await import('../models/Driver.js')).default;
    const User = (await import('../models/User.js')).default;
    const Subscription = (await import('../models/Subscription.js')).default;
    const Complaint = (await import('../models/Complaint.js')).default;
    const AuditLog = (await import('../models/AuditLog.js')).default;

    const today = new Date(); today.setHours(0,0,0,0);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalOrders, activeRestaurants, activeDrivers, totalCustomers,
      revenueToday, ordersToday, ordersByStatus,
      monthlyRevenue, pendingComplaints, activeSubscriptions,
      recentActivity
    ] = await Promise.all([
      Order.countDocuments(),
      Restaurant.countDocuments({ status: 'ACTIVE' }),
      Driver.countDocuments({ isOnline: true }),
      User.countDocuments({ role: 'CUSTOMER', status: 'ACTIVE' }),
      Order.aggregate([
        { $match: { status: ORDER_STATUS.DELIVERED, createdAt: { $gte: today } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Monthly revenue chart
      Order.aggregate([
        { $match: { status: ORDER_STATUS.DELIVERED, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' }, orders: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),
      Complaint.countDocuments({ status: { $in: ['open', 'under_review'] } }),
      Subscription.countDocuments({ status: 'active' }),
      // Recent activity from audit logs
      AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const todayData = revenueToday[0] || { revenue: 0, count: 0 };
    const statusMap = {};
    ordersByStatus.forEach(s => { statusMap[s._id] = s.count; });

    res.json({
      success: true,
      metrics: {
        totalOrders,
        activeRestaurants,
        activeDrivers,
        totalCustomers,
        revenueToday: todayData.revenue,
        ordersToday: todayData.count,
        pendingComplaints,
        activeSubscriptions,
      },
      ordersByStatus: statusMap,
      monthlyRevenue,
      recentActivity: recentActivity.map(a => ({
        text: `${a.action}: ${a.targetType} ${a.targetId?.toString().slice(-6) || ''}`,
        time: a.createdAt,
        type: a.action.includes('APPROVE') ? 'success' : a.action.includes('REJECT') ? 'error' : 'info',
        adminName: a.adminName,
      })),
    });
  } catch (err) { next(err); }
}
