import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';

// GET /api/restaurants/payments/payouts
export async function getPayoutHistory(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({ ownerId: req.user._id }).lean();
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    // Aggregate weekly payouts from delivered orders
    const payouts = await Order.aggregate([
      { $match: { restaurantId: restaurant._id, status: 'delivered' } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%W', date: '$createdAt' } },
        ordersCount: { $sum: 1 },
        grossRevenue: { $sum: '$subtotal' },
        platformFee: { $sum: { $multiply: ['$subtotal', 0.15] } }, // 15% commission
      }},
      { $addFields: { netPayout: { $subtract: ['$grossRevenue', '$platformFee'] }, status: 'completed' } },
      { $sort: { _id: -1 } },
      { $limit: 24 },
    ]);
    res.json({ success: true, payouts, bankAccountLast4: restaurant.bankAccountLast4, bankSortCode: restaurant.bankSortCode });
  } catch (err) { next(err); }
}

// GET /api/restaurants/payments/summary
export async function getPaymentSummary(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({ ownerId: req.user._id }).lean();
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    const now = new Date(), startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthStats] = await Order.aggregate([
      { $match: { restaurantId: restaurant._id, status: 'delivered', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, gross: { $sum: '$subtotal' }, orders: { $sum: 1 } } },
    ]);
    const gross = monthStats?.gross || 0;
    const fee = Math.round(gross * 0.15);
    res.json({ success: true, thisMonth: { gross, fee, net: gross - fee, orders: monthStats?.orders || 0 } });
  } catch (err) { next(err); }
}
