import Order from '../models/Order.js';
import { ORDER_STATUS } from '@tastr/shared';

const COMPLETED_STATUSES = [ORDER_STATUS.DELIVERED];

/**
 * GET /admin/reports/revenue-streams
 * Query: ?from=2026-01-01&to=2026-03-31&groupBy=month|week|day
 *
 * Returns aggregated breakdown of the 4 revenue streams:
 *  - Markup revenue
 *  - Service fee revenue
 *  - Commission revenue
 *  - Delivery margin revenue
 */
export async function getRevenueStreams(req, res) {
  try {
    const { from, to, groupBy = 'month' } = req.query;

    const match = { status: { $in: COMPLETED_STATUSES } };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    // Date grouping format
    const dateFormat = {
      day:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      week:  { $dateToString: { format: '%Y-W%V',   date: '$createdAt' } },
      month: { $dateToString: { format: '%Y-%m',     date: '$createdAt' } },
    }[groupBy] || { $dateToString: { format: '%Y-%m', date: '$createdAt' } };

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: dateFormat,
          totalOrders:      { $sum: 1 },
          grossRevenue:     { $sum: '$total' },
          markupRevenue:    { $sum: '$markupAmount' },
          serviceFeeRevenue:{ $sum: '$serviceFeeAmount' },
          commissionRevenue:{ $sum: '$commissionAmount' },
          deliveryMargin:   { $sum: '$deliveryFeePlatform' },
          platformRevenue:  { $sum: '$platformRevenue' },
          restaurantPayouts:{ $sum: '$restaurantPayout' },
          driverPayouts:    { $sum: '$driverPayout' },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const data = await Order.aggregate(pipeline);

    // Totals
    const totals = data.reduce((acc, d) => ({
      totalOrders:       acc.totalOrders + d.totalOrders,
      grossRevenue:      acc.grossRevenue + d.grossRevenue,
      markupRevenue:     acc.markupRevenue + d.markupRevenue,
      serviceFeeRevenue: acc.serviceFeeRevenue + d.serviceFeeRevenue,
      commissionRevenue: acc.commissionRevenue + d.commissionRevenue,
      deliveryMargin:    acc.deliveryMargin + d.deliveryMargin,
      platformRevenue:   acc.platformRevenue + d.platformRevenue,
      restaurantPayouts: acc.restaurantPayouts + d.restaurantPayouts,
      driverPayouts:     acc.driverPayouts + d.driverPayouts,
    }), {
      totalOrders: 0, grossRevenue: 0, markupRevenue: 0, serviceFeeRevenue: 0,
      commissionRevenue: 0, deliveryMargin: 0, platformRevenue: 0,
      restaurantPayouts: 0, driverPayouts: 0,
    });

    res.json({ data, totals, groupBy });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate revenue report', error: err.message });
  }
}

/**
 * GET /admin/reports/settlements
 * Weekly settlement summary for payouts overview.
 * Query: ?status=pending|settled|failed
 */
export async function getSettlementSummary(req, res) {
  try {
    const { status } = req.query;

    const match = { status: { $in: COMPLETED_STATUSES } };
    if (status) match.settlementStatus = status;

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$settlementWeek',
          totalOrders:    { $sum: 1 },
          totalRevenue:   { $sum: '$total' },
          totalCommission:{ $sum: '$commissionAmount' },
          totalMarkup:    { $sum: '$markupAmount' },
          totalServiceFee:{ $sum: '$serviceFeeAmount' },
          totalDelMargin: { $sum: '$deliveryFeePlatform' },
          totalRestPayout:{ $sum: '$restaurantPayout' },
          totalDrvPayout: { $sum: '$driverPayout' },
          statuses: { $push: '$settlementStatus' },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 52 }, // Last year of weeks
    ];

    const data = await Order.aggregate(pipeline);

    // Add status summary per week
    const weeks = data.map(w => ({
      ...w,
      pendingCount:  w.statuses.filter(s => s === 'pending').length,
      settledCount:  w.statuses.filter(s => s === 'settled').length,
      statuses: undefined,
    }));

    res.json({ weeks });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate settlement summary', error: err.message });
  }
}

/**
 * GET /admin/reports/restaurant/:id/commission
 * Per-restaurant commission report.
 */
export async function getRestaurantCommissionReport(req, res) {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const match = {
      restaurantId: new (await import('mongoose')).default.Types.ObjectId(id),
      status: { $in: COMPLETED_STATUSES },
    };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          orders:         { $sum: 1 },
          grossRevenue:   { $sum: '$total' },
          commissionTotal:{ $sum: '$commissionAmount' },
          avgCommission:  { $avg: '$commissionRate' },
          netPayout:      { $sum: '$restaurantPayout' },
          deliveryModel:  { $first: '$deliveryModel' },
        },
      },
      { $sort: { _id: -1 } },
    ];

    const data = await Order.aggregate(pipeline);
    res.json({ restaurantId: id, data });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate restaurant report', error: err.message });
  }
}
