import { notify } from '../services/notificationService.js';
import Complaint from '../models/Complaint.js';
import Restaurant from '../models/Restaurant.js';
import Order from '../models/Order.js';
import Wallet from '../models/Wallet.js';
import { ORDER_STATUS, TRANSACTION_TYPE } from '@tastr/shared';
import { getStripe, isStripeEnabled } from '../config/stripe.js';
import { paginationMeta } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

const PAGE_SIZE = 20;

// ─── POST /api/complaints ─────────────────────────────────────────────────────
export async function submitComplaint(req, res, next) {
  try {
    const { orderId, type, description, evidence } = req.body;

    const order = await Order.findById(orderId).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (![ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(order.status)) {
      return res.status(400).json({ message: 'Complaints can only be raised for completed or cancelled orders' });
    }

    // Prevent duplicate complaints per order
    const existing = await Complaint.findOne({ orderId, customerId: req.user._id });
    if (existing) return res.status(409).json({ message: 'Complaint already submitted for this order' });

    const complaint = await Complaint.create({
      orderId,
      customerId:   req.user._id,
      restaurantId: order.restaurantId,
      type,
      description,
      evidence:     evidence || [],
      timeline: [{ action: 'complaint_opened', actorId: req.user._id, actorType: 'customer' }],
    });

    res.status(201).json({ success: true, complaint });
  } catch (err) { next(err); }
}

// ─── GET /api/complaints/mine ─────────────────────────────────────────────────
export async function myComplaints(req, res, next) {
  try {
    const complaints = await Complaint.find({ customerId: req.user._id })
      .populate('orderId', 'orderId status total createdAt')
      .populate('restaurantId', 'name logoUrl')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, complaints });
  } catch (err) { next(err); }
}

// ─── GET /api/complaints/:id ──────────────────────────────────────────────────
export async function getComplaint(req, res, next) {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('orderId', 'orderId status items total createdAt')
      .populate('customerId', 'name email phone')
      .populate('restaurantId', 'name logoUrl address')
      .lean();
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const userId   = req.user._id.toString();
    const isOwner  = complaint.customerId._id.toString() === userId;
    const isAdmin  = ['SUPER_ADMIN', 'SUB_ADMIN'].includes(req.user.role);
    const isRestaurant = ['RESTAURANT_OWNER', 'RESTAURANT_STAFF'].includes(req.user.role);
    if (!isOwner && !isAdmin && !isRestaurant) return res.status(403).json({ message: 'Access denied' });

    res.json({ success: true, complaint });
  } catch (err) { next(err); }
}

// ─── PATCH /api/complaints/:id/respond ───────────────────────────────────────
export async function restaurantRespond(req, res, next) {
  try {
    const { restaurantResponse, restaurantAction } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Verify requester owns this restaurant
    const restaurant = await Restaurant.findOne({ ownerId: req.user._id }).select('_id').lean();
    if (!restaurant || restaurant._id.toString() !== complaint.restaurantId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    complaint.restaurantResponse = restaurantResponse;
    complaint.restaurantAction   = restaurantAction;
    complaint.respondedAt        = new Date();
    complaint.status             = 'under_review';
    complaint.timeline.push({
      action:    'restaurant_responded',
      actorId:   req.user._id,
      actorType: 'restaurant',
      note:      restaurantAction,
    });
    await complaint.save();
    try { await notify(complaint.customerId.toString(), { title: 'Complaint updated', body: `Your complaint status: ${complaint.status}`, type: 'order', meta: { complaintId: complaint._id.toString() } }); } catch {}
    res.json({ success: true, complaint });
  } catch (err) { next(err); }
}

// ─── PATCH /api/complaints/:id/resolve ───────────────────────────────────────
export async function adminResolve(req, res, next) {
  try {
    const { resolution, refundAmount, adminNote } = req.body;
    const complaint = await Complaint.findById(req.params.id).populate('orderId');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    complaint.resolution  = resolution;
    complaint.adminNote   = adminNote;
    complaint.resolvedAt  = new Date();
    complaint.resolvedBy  = req.user._id;
    complaint.status      = 'resolved';

    if (resolution === 'full_refund' && complaint.orderId) {
      complaint.refundAmount = complaint.orderId.total;
    } else if (resolution === 'partial_refund' && refundAmount) {
      complaint.refundAmount = refundAmount;
    }

    // Update order with refund amount
    if (complaint.refundAmount > 0 && complaint.orderId) {
      await Order.findByIdAndUpdate(complaint.orderId._id, { refundAmount: complaint.refundAmount });
      // Process refund — Stripe charge refund or wallet credit
      try {
        const refundOrder = await Order.findById(complaint.orderId._id || complaint.orderId).lean();
        if (refundOrder?.stripeChargeId && isStripeEnabled()) {
          const stripe = getStripe();
          await stripe.refunds.create({
            charge: refundOrder.stripeChargeId,
            amount: complaint.refundAmount,
            reason: 'requested_by_customer',
          });
          logger.info(`Stripe refund of ${complaint.refundAmount} issued for order ${refundOrder._id}`);
        } else {
          // Fallback: credit to wallet
          let wallet = await Wallet.findOne({ userId: complaint.customerId });
          if (!wallet) wallet = await Wallet.create({ userId: complaint.customerId });
          await wallet.credit(complaint.refundAmount, `Refund for complaint #${complaint._id.toString().slice(-6)}`, {
            orderId: complaint.orderId._id || complaint.orderId,
          });
          logger.info(`Wallet refund of ${complaint.refundAmount} credited for complaint ${complaint._id}`);
        }
        await notify(complaint.customerId.toString(), {
          title: 'Refund issued',
          body: `A refund of £${(complaint.refundAmount / 100).toFixed(2)} has been processed.`,
          type: 'wallet',
          meta: { complaintId: complaint._id.toString() },
        });
      } catch (refundErr) {
        logger.error('Refund processing failed:', refundErr);
      }
    }

    complaint.timeline.push({
      action:    `resolved_${resolution}`,
      actorId:   req.user._id,
      actorType: 'admin',
      note:      adminNote,
    });
    await complaint.save();
    res.json({ success: true, complaint });
  } catch (err) { next(err); }
}

// ─── GET /api/complaints (admin) ─────────────────────────────────────────────
export async function listComplaints(req, res, next) {
  try {
    const page  = parseInt(req.query.page  || 1);
    const limit = parseInt(req.query.limit || PAGE_SIZE);
    const filter = {};
    if (req.query.status)       filter.status       = req.query.status;
    if (req.query.restaurantId) filter.restaurantId = req.query.restaurantId;

    // Restaurant role: own complaints only
    if (['RESTAURANT_OWNER', 'RESTAURANT_STAFF'].includes(req.user.role)) {
      const restaurant = await Restaurant.findOne({ ownerId: req.user._id }).select('_id').lean();
      if (restaurant) filter.restaurantId = restaurant._id;
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('orderId', 'orderId total')
        .populate('customerId', 'name')
        .populate('restaurantId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Complaint.countDocuments(filter),
    ]);
    res.json({ success: true, complaints, ...paginationMeta(total, page, limit) });
  } catch (err) { next(err); }
}
