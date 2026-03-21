import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import Driver from '../models/Driver.js';
import { ORDER_STATUS } from '@tastr/shared';
import { paginationMeta } from '../utils/helpers.js';

const PAGE_SIZE = 20;

// ─── POST /api/reviews ────────────────────────────────────────────────────────
export async function submitReview(req, res, next) {
  try {
    const { orderId, targetId, targetType, rating, comment, photos } = req.body;

    // Verify order exists and is delivered
    const order = await Order.findById(orderId).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (order.status !== ORDER_STATUS.DELIVERED) {
      return res.status(400).json({ message: 'Can only review delivered orders' });
    }

    const review = await Review.create({
      orderId, reviewerId: req.user._id, targetId, targetType, rating, comment, photos: photos || [],
    });

    await updateTargetRating(targetId, targetType);
    res.status(201).json({ success: true, review });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Already reviewed this order' });
    next(err);
  }
}

// ─── POST /api/reviews/order/:orderId ────────────────────────────────────────
// Submit all ratings at once: { restaurant: {rating, comment}, driver: {rating}, app: {rating} }
export async function submitOrderReviews(req, res, next) {
  try {
    const { orderId } = req.params;
    const { restaurant, driver, app } = req.body;

    const order = await Order.findById(orderId).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (order.status !== ORDER_STATUS.DELIVERED) {
      return res.status(400).json({ message: 'Can only review delivered orders' });
    }

    const created = [];

    if (restaurant?.rating) {
      try {
        const r = await Review.create({
          orderId, reviewerId: req.user._id,
          targetId: order.restaurantId, targetType: 'restaurant',
          rating: restaurant.rating, comment: restaurant.comment, photos: restaurant.photos || [],
        });
        created.push(r);
        await updateTargetRating(order.restaurantId, 'restaurant');
      } catch (e) { if (e.code !== 11000) throw e; }
    }

    if (driver?.rating && order.driverId) {
      try {
        const r = await Review.create({
          orderId, reviewerId: req.user._id,
          targetId: order.driverId, targetType: 'driver',
          rating: driver.rating, comment: driver.comment,
        });
        created.push(r);
        await updateTargetRating(order.driverId, 'driver');
      } catch (e) { if (e.code !== 11000) throw e; }
    }

    if (app?.rating) {
      try {
        const r = await Review.create({
          orderId, reviewerId: req.user._id,
          targetId: req.user._id, targetType: 'app',
          rating: app.rating, comment: app.comment,
        });
        created.push(r);
      } catch (e) { if (e.code !== 11000) throw e; }
    }

    // Mark order as rated
    await Order.findByIdAndUpdate(orderId, { isRated: true });

    res.status(201).json({ success: true, reviews: created });
  } catch (err) { next(err); }
}

// ─── GET /api/reviews/restaurant/:id ─────────────────────────────────────────
export async function getRestaurantReviews(req, res, next) {
  try {
    const page  = parseInt(req.query.page || 1);
    const limit = PAGE_SIZE;
    const [reviews, total] = await Promise.all([
      Review.find({ targetId: req.params.id, targetType: 'restaurant', isVisible: true })
        .populate('reviewerId', 'name photo')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments({ targetId: req.params.id, targetType: 'restaurant', isVisible: true }),
    ]);
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    res.json({ success: true, reviews, averageRating: avg.toFixed(1), ...paginationMeta(total, page, limit) });
  } catch (err) { next(err); }
}

// ─── GET /api/reviews/driver/:id ─────────────────────────────────────────────
export async function getDriverReviews(req, res, next) {
  try {
    const page  = parseInt(req.query.page || 1);
    const limit = PAGE_SIZE;
    const [reviews, total] = await Promise.all([
      Review.find({ targetId: req.params.id, targetType: 'driver', isVisible: true })
        .populate('reviewerId', 'name photo')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments({ targetId: req.params.id, targetType: 'driver', isVisible: true }),
    ]);
    res.json({ success: true, reviews, ...paginationMeta(total, page, limit) });
  } catch (err) { next(err); }
}

// ─── Helper: rolling average rating ──────────────────────────────────────────
async function updateTargetRating(targetId, targetType) {
  const agg = await Review.aggregate([
    { $match: { targetId: new mongoose.Types.ObjectId(targetId), targetType, isVisible: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg   = agg[0]?.avg  || 0;
  const count = agg[0]?.count || 0;

  if (targetType === 'restaurant') {
    await Restaurant.findByIdAndUpdate(targetId, { rating: parseFloat(avg.toFixed(2)), reviewCount: count });
  } else if (targetType === 'driver') {
    await Driver.findByIdAndUpdate(targetId, { rating: parseFloat(avg.toFixed(2)), reviewCount: count });
  }
}
