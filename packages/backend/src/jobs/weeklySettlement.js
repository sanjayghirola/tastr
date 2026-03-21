/**
 * WEEKLY SETTLEMENT JOB
 *
 * Run via cron every Sunday at 23:59 (or Monday 00:00):
 *   cron.schedule('59 23 * * 0', runWeeklySettlement)
 *
 * What it does:
 *  1. Finds all delivered orders with settlementStatus = 'pending'
 *  2. Groups them by restaurant and driver
 *  3. Creates payout records
 *  4. Marks orders as 'settled'
 *  5. Updates wallet balances
 *
 * In production, step 3 would trigger Stripe Connect transfers.
 */

import Order from '../models/Order.js';
import Wallet from '../models/Wallet.js';
import { ORDER_STATUS } from '@tastr/shared';

function getWeekString(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-${String(weekNum).padStart(2, '0')}`;
}

export async function runWeeklySettlement() {
  const weekStr = getWeekString();
  console.log(`[Settlement] Starting weekly settlement for ${weekStr}`);

  try {
    // ─── 1. Find unsettled delivered orders ─────────────────────────────
    const orders = await Order.find({
      status: ORDER_STATUS.DELIVERED,
      settlementStatus: 'pending',
    });

    if (orders.length === 0) {
      console.log('[Settlement] No pending orders to settle');
      return { settled: 0 };
    }

    console.log(`[Settlement] Processing ${orders.length} orders`);

    // ─── 2. Group by restaurant ─────────────────────────────────────────
    const restaurantMap = {};
    const driverMap = {};

    for (const order of orders) {
      const rId = order.restaurantId.toString();
      if (!restaurantMap[rId]) {
        restaurantMap[rId] = { orders: 0, payout: 0, commission: 0, gross: 0, deliveryFeesKept: 0 };
      }
      restaurantMap[rId].orders += 1;
      restaurantMap[rId].payout += order.restaurantPayout || 0;
      restaurantMap[rId].commission += order.commissionAmount || 0;
      restaurantMap[rId].gross += order.total || 0;

      // Self-delivery restaurants keep delivery fees
      if (order.deliveryModel === 'own') {
        restaurantMap[rId].deliveryFeesKept += order.deliveryFee || 0;
      }

      // Group by driver (Tastr delivery only)
      if (order.driverId && order.deliveryModel === 'tastr') {
        const dId = order.driverId.toString();
        if (!driverMap[dId]) {
          driverMap[dId] = { deliveries: 0, payout: 0, tips: 0 };
        }
        driverMap[dId].deliveries += 1;
        driverMap[dId].payout += order.driverPayout || 0;
        driverMap[dId].tips += order.tip || 0;
      }
    }

    // ─── 3. Update restaurant wallets ───────────────────────────────────
    for (const [restaurantId, data] of Object.entries(restaurantMap)) {
      try {
        await Wallet.findOneAndUpdate(
          { ownerId: restaurantId, ownerType: 'restaurant' },
          {
            $inc: { balance: data.payout },
            $push: {
              transactions: {
                type: 'CREDIT',
                amount: data.payout,
                description: `Weekly settlement ${weekStr} (${data.orders} orders)`,
                meta: {
                  week: weekStr,
                  ordersCount: data.orders,
                  grossRevenue: data.gross,
                  commissionDeducted: data.commission,
                  deliveryFeesKept: data.deliveryFeesKept,
                },
                createdAt: new Date(),
              },
            },
          },
          { upsert: true }
        );
      } catch (err) {
        console.error(`[Settlement] Failed to update restaurant wallet ${restaurantId}:`, err.message);
      }
    }

    // ─── 4. Update driver wallets ───────────────────────────────────────
    for (const [driverId, data] of Object.entries(driverMap)) {
      try {
        const totalPayout = data.payout + data.tips;
        await Wallet.findOneAndUpdate(
          { ownerId: driverId, ownerType: 'driver' },
          {
            $inc: { balance: totalPayout },
            $push: {
              transactions: {
                type: 'CREDIT',
                amount: totalPayout,
                description: `Weekly settlement ${weekStr} (${data.deliveries} deliveries)`,
                meta: {
                  week: weekStr,
                  deliveries: data.deliveries,
                  deliveryEarnings: data.payout,
                  tips: data.tips,
                },
                createdAt: new Date(),
              },
            },
          },
          { upsert: true }
        );
      } catch (err) {
        console.error(`[Settlement] Failed to update driver wallet ${driverId}:`, err.message);
      }
    }

    // ─── 5. Mark orders as settled ──────────────────────────────────────
    const orderIds = orders.map(o => o._id);
    await Order.updateMany(
      { _id: { $in: orderIds } },
      {
        $set: {
          settlementStatus: 'settled',
          settlementWeek: weekStr,
          settledAt: new Date(),
        },
      }
    );

    const summary = {
      week: weekStr,
      ordersSettled: orders.length,
      restaurants: Object.keys(restaurantMap).length,
      drivers: Object.keys(driverMap).length,
      totalRestaurantPayouts: Object.values(restaurantMap).reduce((s, r) => s + r.payout, 0),
      totalDriverPayouts: Object.values(driverMap).reduce((s, d) => s + d.payout + d.tips, 0),
    };

    console.log('[Settlement] Complete:', summary);
    return summary;

  } catch (err) {
    console.error('[Settlement] Failed:', err);
    throw err;
  }
}

/**
 * Manual trigger endpoint for admin.
 * POST /admin/settlements/trigger
 */
export async function triggerSettlement(req, res) {
  try {
    const result = await runWeeklySettlement();
    res.json({ message: 'Settlement completed', ...result });
  } catch (err) {
    res.status(500).json({ message: 'Settlement failed', error: err.message });
  }
}
