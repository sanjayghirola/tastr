import Wallet from '../models/Wallet.js';
import Order from '../models/Order.js';
import { ORDER_STATUS } from '@tastr/shared';

/**
 * GET /restaurants/payments/wallet
 * Returns the restaurant's wallet balance and pending payout amount.
 */
export async function getRestaurantWallet(req, res) {
  try {
    const restaurantId = req.restaurant?._id || req.params.id;

    // Get or create wallet
    let wallet = await Wallet.findOne({ ownerId: restaurantId, ownerType: 'restaurant' });
    if (!wallet) {
      wallet = await Wallet.create({ ownerId: restaurantId, ownerType: 'restaurant', balance: 0 });
    }

    // Calculate pending payout (delivered but unsettled orders)
    const pendingOrders = await Order.aggregate([
      {
        $match: {
          restaurantId: wallet.ownerId,
          status: ORDER_STATUS.DELIVERED,
          settlementStatus: 'pending',
        },
      },
      {
        $group: {
          _id: null,
          pendingPayout: { $sum: '$restaurantPayout' },
          pendingOrders: { $sum: 1 },
        },
      },
    ]);

    const pending = pendingOrders[0] || { pendingPayout: 0, pendingOrders: 0 };

    res.json({
      balance: wallet.balance,
      pendingPayout: pending.pendingPayout,
      pendingOrders: pending.pendingOrders,
      transactions: (wallet.transactions || []).slice(-20).reverse(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch wallet', error: err.message });
  }
}

/**
 * GET /drivers/wallet
 * Returns the driver's wallet balance, earnings, and pending payout.
 */
export async function getDriverWallet(req, res) {
  try {
    const driverId = req.driver?._id || req.params.id;

    let wallet = await Wallet.findOne({ ownerId: driverId, ownerType: 'driver' });
    if (!wallet) {
      wallet = await Wallet.create({ ownerId: driverId, ownerType: 'driver', balance: 0 });
    }

    // Pending earnings (delivered but unsettled)
    const pendingOrders = await Order.aggregate([
      {
        $match: {
          driverId: wallet.ownerId,
          status: ORDER_STATUS.DELIVERED,
          settlementStatus: 'pending',
        },
      },
      {
        $group: {
          _id: null,
          pendingPayout: { $sum: '$driverPayout' },
          pendingTips: { $sum: '$tip' },
          deliveries: { $sum: 1 },
        },
      },
    ]);

    const pending = pendingOrders[0] || { pendingPayout: 0, pendingTips: 0, deliveries: 0 };

    // This week's completed deliveries
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const thisWeek = await Order.aggregate([
      {
        $match: {
          driverId: wallet.ownerId,
          status: ORDER_STATUS.DELIVERED,
          createdAt: { $gte: weekStart },
        },
      },
      {
        $group: {
          _id: null,
          earnings: { $sum: '$driverPayout' },
          tips: { $sum: '$tip' },
          deliveries: { $sum: 1 },
        },
      },
    ]);

    const week = thisWeek[0] || { earnings: 0, tips: 0, deliveries: 0 };

    res.json({
      balance: wallet.balance,
      pendingPayout: pending.pendingPayout + pending.pendingTips,
      pendingDeliveries: pending.deliveries,
      thisWeek: {
        earnings: week.earnings,
        tips: week.tips,
        deliveries: week.deliveries,
        total: week.earnings + week.tips,
      },
      transactions: (wallet.transactions || []).slice(-20).reverse(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch driver wallet', error: err.message });
  }
}

/**
 * GET /restaurants/payments/summary
 * Monthly summary with commission breakdown.
 */
export async function getRestaurantPaymentSummary(req, res) {
  try {
    const restaurantId = req.restaurant?._id || req.params.id;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const summary = await Order.aggregate([
      {
        $match: {
          restaurantId,
          status: ORDER_STATUS.DELIVERED,
          createdAt: { $gte: monthStart },
        },
      },
      {
        $group: {
          _id: null,
          gross: { $sum: '$total' },
          fee: { $sum: '$commissionAmount' },
          net: { $sum: '$restaurantPayout' },
          orders: { $sum: 1 },
          deliveryFeeKept: {
            $sum: {
              $cond: [{ $eq: ['$deliveryModel', 'own'] }, '$deliveryFee', 0],
            },
          },
          avgCommissionRate: { $avg: '$commissionRate' },
        },
      },
    ]);

    const data = summary[0] || { gross: 0, fee: 0, net: 0, orders: 0, deliveryFeeKept: 0, avgCommissionRate: 0 };

    // Get restaurant delivery mode
    const Restaurant = (await import('../models/Restaurant.js')).default;
    const restaurant = await Restaurant.findById(restaurantId).select('deliveryMode').lean();

    res.json({
      thisMonth: {
        ...data,
        deliveryMode: restaurant?.deliveryMode || 'tastr',
        commissionRate: Math.round(data.avgCommissionRate || 0),
        isOverride: false, // TODO: check PlatformConfig overrides
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payment summary', error: err.message });
  }
}
