import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import PromoCode from '../models/PromoCode.js';
import { getStripe, isStripeEnabled } from '../config/stripe.js';
import { ORDER_STATUS, TRANSACTION_TYPE } from '@tastr/shared';
import { logger } from '../utils/logger.js';
import { notifyOrderEvent, notify } from '../services/notificationService.js';
import { emitNewOrder } from '../sockets/index.js';
import { dispatchOrder } from '../services/dispatch.js';

// ─── Helper: get or create Stripe customer ────────────────────────────────────
async function ensureStripeCustomer(userId) {
  const stripe = getStripe();
  const user   = await User.findById(userId).lean();
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: userId.toString() },
  });
  await User.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
  return customer.id;
}

// ─── POST /api/payments/intent ────────────────────────────────────────────────
export async function createIntent(req, res, next) {
  try {
    if (!isStripeEnabled()) return res.status(400).json({ success: false, message: 'Stripe is not configured. Use Razorpay or Wallet instead.' });
    const stripe     = getStripe();
    const customerId = await ensureStripeCustomer(req.user._id);
    const intent     = await stripe.paymentIntents.create({
      amount:   req.body.amount,
      currency: 'gbp',
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: { userId: req.user._id.toString(), orderId: req.body.orderId || '' },
    });
    res.json({ success: true, clientSecret: intent.client_secret, intentId: intent.id });
  } catch (err) { next(err); }
}

// ─── POST /api/payments/confirm ───────────────────────────────────────────────
export async function confirmPayment(req, res, next) {
  try {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(req.body.paymentIntentId);

    if (intent.status !== 'succeeded') {
      return res.status(400).json({ success: false, message: `Payment status: ${intent.status}` });
    }

    const order = await Order.findOne({ paymentIntentId: intent.id });
    if (order && order.status === ORDER_STATUS.PENDING) {
      order.status = ORDER_STATUS.PLACED;
      order.stripeChargeId = intent.latest_charge;
      order.timeline.push({ status: ORDER_STATUS.PLACED, actorType: 'system', note: 'Payment confirmed' });
      await order.save();
      await Cart.findOneAndDelete({ userId: req.user._id });
      if (order.promoCode) await PromoCode.findOneAndUpdate({ code: order.promoCode }, { $inc: { usedCount: 1 } });
    }

    res.json({ success: true, order });
  } catch (err) { next(err); }
}

// ─── GET /api/payments/methods ────────────────────────────────────────────────
export async function listMethods(req, res, next) {
  try {
    if (!isStripeEnabled()) return res.json({ success: true, methods: [], stripeEnabled: false });
    const stripe     = getStripe();
    const customerId = await ensureStripeCustomer(req.user._id);
    const methods    = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
    res.json({ success: true, methods: methods.data });
  } catch (err) { next(err); }
}

// ─── POST /api/payments/methods ───────────────────────────────────────────────
export async function addMethod(req, res, next) {
  try {
    if (!isStripeEnabled()) return res.status(400).json({ success: false, message: 'Stripe is not configured.' });
    const stripe     = getStripe();
    const customerId = await ensureStripeCustomer(req.user._id);
    // Returns a SetupIntent client_secret — frontend uses StripeCardElement to complete
    const setup = await stripe.setupIntents.create({
      customer:             customerId,
      payment_method_types: ['card'],
    });
    res.json({ success: true, clientSecret: setup.client_secret });
  } catch (err) { next(err); }
}

// ─── DELETE /api/payments/methods/:id ────────────────────────────────────────
export async function removeMethod(req, res, next) {
  try {
    const stripe = getStripe();
    await stripe.paymentMethods.detach(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ─── GET /api/payments/wallet ─────────────────────────────────────────────────
export async function getWallet(req, res, next) {
  try {
    let wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({ userId: req.user._id });
      await User.findByIdAndUpdate(req.user._id, { walletId: wallet._id });
    }
    res.json({ success: true, wallet: { balance: wallet.balance, transactions: wallet.transactions.slice(-20).reverse() } });
  } catch (err) { next(err); }
}

// ─── POST /api/payments/wallet/topup ─────────────────────────────────────────
export async function topupWallet(req, res, next) {
  try {
    const stripe     = getStripe();
    const customerId = await ensureStripeCustomer(req.user._id);
    const amount     = req.body.amount;   // pence

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'gbp',
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: { userId: req.user._id.toString(), type: 'wallet_topup' },
    });

    res.json({ success: true, clientSecret: intent.client_secret, intentId: intent.id });
  } catch (err) { next(err); }
}

// ─── GET /api/payments/promos/available ──────────────────────────────────────
export async function getAvailablePromos(req, res, next) {
  try {
    const now = new Date();
    const promos = await PromoCode.find({
      isActive: true,
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $or: [{ startsAt: null  }, { startsAt: { $lte: now } }] },
        { $or: [{ userIds: { $size: 0 } }, { userIds: req.user._id }] },
      ],
    }).select('-createdBy -__v').lean();
    res.json({ success: true, promos });
  } catch (err) { next(err); }
}

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
export async function stripeWebhook(req, res) {
  const stripe = getStripe();
  const sig    = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.warn(`Webhook signature failed: ${err.message}`);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const orderId = intent.metadata.orderId;

        if (intent.metadata.type === 'wallet_topup') {
          // Credit wallet
          const userId = intent.metadata.userId;
          let wallet = await Wallet.findOne({ userId });
          if (!wallet) { wallet = await Wallet.create({ userId }); }
          await wallet.credit(intent.amount, 'Wallet top-up', {
            type:        TRANSACTION_TYPE.TOP_UP,
            stripeId:    intent.id,
            description: 'Wallet top-up via card',
          });
          await User.findByIdAndUpdate(userId, { walletId: wallet._id });
          try { await notify(userId, { title: 'Wallet topped up', body: `£${(intent.amount/100).toFixed(2)} added to your wallet.`, type: 'wallet' }); } catch {}
        } else if (orderId) {
          const order = await Order.findById(orderId);
          if (order && order.status === ORDER_STATUS.PENDING) {
            order.status         = ORDER_STATUS.PLACED;
            order.stripeChargeId = intent.latest_charge;
            order.timeline.push({ status: ORDER_STATUS.PLACED, actorType: 'system', note: 'Payment confirmed via webhook' });
            await order.save();
            await Cart.findOneAndDelete({ userId: order.customerId });
            if (order.promoCode) await PromoCode.findOneAndUpdate({ code: order.promoCode }, { $inc: { usedCount: 1 } });
            try {
              emitNewOrder(order.restaurantId.toString(), order);
              dispatchOrder(order._id.toString());
            } catch { /* non-fatal */ }
            try { await notifyOrderEvent(order, 'order_placed'); } catch {}
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        const order  = await Order.findOne({ paymentIntentId: intent.id });
        if (order) {
          order.status = ORDER_STATUS.FAILED;
          order.timeline.push({ status: ORDER_STATUS.FAILED, actorType: 'system', note: intent.last_payment_error?.message });
          await order.save();
            try { await notifyOrderEvent(order, 'payment_failed'); } catch {}
          }
          break;
        }

        default:
        logger.info(`Unhandled webhook event: ${event.type}`);
    }
  } catch (err) {
    logger.error('Webhook handler error', err);
  }

  res.json({ received: true });
}
