import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Subscription from '../models/Subscription.js';
import { getStripe, isStripeEnabled } from '../config/stripe.js';
import { getRazorpay, isRazorpayEnabled } from '../config/razorpay.js';
import { SUBSCRIPTION_STATUS } from '@tastr/shared';

// ─── GET /api/subscriptions/plans ────────────────────────────────────────────
export async function listPlans(req, res, next) {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1, price: 1 }).lean();
    res.json({ success: true, plans });
  } catch (err) { next(err); }
}

// ─── GET /api/subscriptions/my ───────────────────────────────────────────────
export async function mySubscription(req, res, next) {
  try {
    const sub = await Subscription.findOne({ userId: req.user._id, status: SUBSCRIPTION_STATUS.ACTIVE })
      .populate('planId').lean();
    res.json({ success: true, subscription: sub || null });
  } catch (err) { next(err); }
}

// ─── POST /api/subscriptions/subscribe ───────────────────────────────────────
export async function subscribe(req, res, next) {
  try {
    const { planId, paymentMethodId, gateway } = req.body;
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) return res.status(404).json({ message: 'Plan not found' });

    const existing = await Subscription.findOne({ userId: req.user._id, status: SUBSCRIPTION_STATUS.ACTIVE });
    if (existing) return res.status(400).json({ message: 'Already subscribed. Cancel current plan first.' });

    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + (plan.interval === 'year' ? 12 : 1));

    // ─── Razorpay flow ───────────────────────────────────────────────────────
    if (gateway === 'RAZORPAY') {
      if (!isRazorpayEnabled()) return res.status(400).json({ message: 'Razorpay is not configured.' });
      try {
        const rzp = getRazorpay();
        const rzpOrder = await rzp.orders.create({
          amount: plan.price,
          currency: process.env.RAZORPAY_CURRENCY || 'INR',
          receipt: `sub_${req.user._id}_${Date.now()}`,
          notes: { userId: req.user._id.toString(), planId: planId.toString(), type: 'subscription' },
        });

        return res.json({
          success: true,
          gateway: 'RAZORPAY',
          razorpayOrder: {
            id: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency,
            key: process.env.RAZORPAY_KEY_ID,
          },
          planId,
        });
      } catch (rzpErr) {
        const msg = rzpErr?.error?.description || rzpErr?.message || 'Razorpay order creation failed';
        return res.status(500).json({ success: false, message: typeof msg === 'string' ? msg : JSON.stringify(msg) });
      }
    }

    // ─── Stripe flow ──────────────────────────────────────────────────────────
    if (!isStripeEnabled()) return res.status(400).json({ message: 'Stripe is not configured. Subscription billing requires Stripe or Razorpay.' });
    const stripe = getStripe();

    let stripeCustomerId = req.user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: req.user.email, name: req.user.name,
        metadata: { userId: req.user._id.toString() },
      });
      stripeCustomerId = customer.id;
      const { default: User } = await import('../models/User.js');
      await User.findByIdAndUpdate(req.user._id, { stripeCustomerId });
    }

    await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    let stripeSubId = null;
    if (plan.stripePriceId) {
      const stripeSub = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: plan.stripePriceId }],
        expand: ['latest_invoice.payment_intent'],
      });
      stripeSubId = stripeSub.id;
    }

    const sub = await Subscription.create({
      userId: req.user._id, planId, stripeCustomerId,
      stripeSubscriptionId: stripeSubId, renewalDate,
    });

    res.json({ success: true, subscription: await sub.populate('planId') });
  } catch (err) { next(err); }
}

// ─── POST /api/subscriptions/verify-razorpay ────────────────────────────────
export async function verifyRazorpaySubscription(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
    const crypto = (await import('crypto')).default;

    const secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const existing = await Subscription.findOne({ userId: req.user._id, status: SUBSCRIPTION_STATUS.ACTIVE });
    if (existing) return res.status(400).json({ message: 'Already subscribed.' });

    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + (plan.interval === 'year' ? 12 : 1));

    const sub = await Subscription.create({
      userId: req.user._id, planId,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      renewalDate,
    });

    res.json({ success: true, subscription: await sub.populate('planId') });
  } catch (err) { next(err); }
}

// ─── POST /api/subscriptions/cancel ──────────────────────────────────────────
export async function cancelSubscription(req, res, next) {
  try {
    const sub = await Subscription.findOne({ userId: req.user._id, status: SUBSCRIPTION_STATUS.ACTIVE });
    if (!sub) return res.status(404).json({ message: 'No active subscription' });

    if (sub.stripeSubscriptionId) {
      const stripe = getStripe();
      await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    }

    sub.cancelAtPeriodEnd = true;
    sub.cancelledAt = new Date();
    await sub.save();

    res.json({ success: true, message: 'Subscription will cancel at period end', subscription: sub });
  } catch (err) { next(err); }
}

// ─── ADMIN: GET /api/admin/subscriptions ─────────────────────────────────────
export async function adminListSubscriptions(req, res, next) {
  try {
    const { status, planId, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (planId) filter.planId = planId;
    const [subs, total] = await Promise.all([
      Subscription.find(filter).sort({ createdAt: -1 })
        .skip((page-1)*limit).limit(Number(limit))
        .populate('userId', 'name email phone')
        .populate('planId', 'name price interval').lean(),
      Subscription.countDocuments(filter),
    ]);
    // Plan breakdown
    const breakdown = await Subscription.aggregate([
      { $match: { status: SUBSCRIPTION_STATUS.ACTIVE } },
      { $group: { _id: '$planId', count: { $sum: 1 } } },
      { $lookup: { from: 'subscriptionplans', localField: '_id', foreignField: '_id', as: 'plan' } },
      { $unwind: '$plan' },
      { $project: { name: '$plan.name', count: 1 } },
    ]);
    res.json({ success: true, subscriptions: subs, total, page: Number(page), pages: Math.ceil(total/limit), breakdown });
  } catch (err) { next(err); }
}

// ─── ADMIN: POST /api/admin/subscriptions/plans ───────────────────────────────
export async function adminCreatePlan(req, res, next) {
  try {
    const plan = await SubscriptionPlan.create(req.body);
    res.status(201).json({ success: true, plan });
  } catch (err) { next(err); }
}

// ─── ADMIN: PUT /api/admin/subscriptions/plans/:id ────────────────────────────
export async function adminUpdatePlan(req, res, next) {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json({ success: true, plan });
  } catch (err) { next(err); }
}
