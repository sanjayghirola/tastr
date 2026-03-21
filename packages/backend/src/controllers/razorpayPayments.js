import crypto from 'crypto';
import Order from '../models/Order.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import PromoCode from '../models/PromoCode.js';
import { getRazorpay, isRazorpayEnabled } from '../config/razorpay.js';
import { ORDER_STATUS, TRANSACTION_TYPE } from '@tastr/shared';
import { logger } from '../utils/logger.js';
import { emitNewOrder } from '../sockets/index.js';
import { dispatchOrder } from '../services/dispatch.js';

// ─── GET /api/razorpay/status — check if Razorpay is enabled ─────────────────
export async function getStatus(req, res) {
  res.json({ success: true, enabled: isRazorpayEnabled() });
}

// ─── POST /api/razorpay/order — create Razorpay order ────────────────────────
export async function createOrder(req, res, next) {
  try {
    const rzp = getRazorpay();
    const { amount, currency = 'INR', orderId } = req.body;

    const rzpOrder = await rzp.orders.create({
      amount: Math.round(amount), // paise
      currency,
      receipt: orderId || `rcpt_${Date.now()}`,
      notes: { userId: req.user._id.toString(), orderId: orderId || '' },
    });

    res.json({
      success: true,
      order: {
        id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        receipt: rzpOrder.receipt,
      },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) { next(err); }
}

// ─── POST /api/razorpay/verify — verify Razorpay payment signature ───────────
export async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    const secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    if (!secret) {
      logger.error('RAZORPAY_KEY_SECRET is not set in environment');
      return res.status(500).json({ success: false, message: 'Razorpay secret key not configured on server' });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    logger.info(`Razorpay verify: order=${razorpay_order_id}, payment=${razorpay_payment_id}, sigMatch=${expected === razorpay_signature}`);

    if (expected !== razorpay_signature) {
      logger.warn(`Razorpay signature mismatch. Expected=${expected.substring(0,10)}..., Got=${(razorpay_signature||'').substring(0,10)}...`);
      return res.status(400).json({ success: false, message: 'Payment signature verification failed. Please contact support with your payment ID: ' + razorpay_payment_id });
    }

    // Payment verified — update order
    if (orderId) {
      const order = await Order.findById(orderId);
      if (order && order.status === ORDER_STATUS.PENDING) {
        order.status = ORDER_STATUS.PLACED;
        order.paymentGateway = 'RAZORPAY';
        order.razorpayPaymentId = razorpay_payment_id;
        order.razorpayOrderId = razorpay_order_id;
        order.timeline.push({ status: ORDER_STATUS.PLACED, actorType: 'system', note: 'Razorpay payment verified' });
        await order.save();
        await Cart.findOneAndDelete({ userId: order.customerId });
        if (order.promoCode) await PromoCode.findOneAndUpdate({ code: order.promoCode }, { $inc: { usedCount: 1 } });
        try {
          emitNewOrder(order.restaurantId.toString(), order);
          dispatchOrder(order._id.toString());
        } catch { /* non-fatal */ }
      }
    }

    res.json({ success: true, paymentId: razorpay_payment_id });
  } catch (err) { next(err); }
}

// ─── POST /api/razorpay/wallet-topup — wallet top-up via Razorpay ────────────
export async function walletTopup(req, res, next) {
  try {
    const rzp = getRazorpay();
    const { amount, currency = 'INR' } = req.body;

    const rzpOrder = await rzp.orders.create({
      amount: Math.round(amount),
      currency,
      receipt: `wallet_${req.user._id}_${Date.now()}`,
      notes: { userId: req.user._id.toString(), type: 'wallet_topup' },
    });

    res.json({
      success: true,
      order: { id: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency },
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) { next(err); }
}

// ─── POST /api/razorpay/wallet-topup/verify ──────────────────────────────────
export async function verifyWalletTopup(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    const secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    let wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) wallet = await Wallet.create({ userId: req.user._id, balance: 0, transactions: [] });

    const alreadyCredited = wallet.transactions.some(t => t.stripeId === razorpay_payment_id);
    if (alreadyCredited) return res.json({ success: true, balance: wallet.balance, message: 'Already credited' });

    await wallet.credit(amount, 'Wallet top-up via Razorpay', {
      stripeId: razorpay_payment_id, // reusing field for gateway payment ID
      type: TRANSACTION_TYPE.TOP_UP,
      gateway: 'RAZORPAY',
    });

    res.json({ success: true, balance: wallet.balance, credited: amount });
  } catch (err) { next(err); }
}

// ─── POST /api/razorpay/refund — initiate refund via Razorpay ────────────────
export async function initiateRefund(req, res, next) {
  try {
    const rzp = getRazorpay();
    const { paymentId, amount, orderId, reason } = req.body;

    const refund = await rzp.payments.refund(paymentId, {
      amount: amount ? Math.round(amount) : undefined, // partial or full
      notes: { orderId: orderId || '', reason: reason || '' },
    });

    if (orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        order.refundAmount = amount || order.total;
        order.timeline.push({ status: 'refunded', actorType: 'system', note: `Razorpay refund: ${refund.id}` });
        await order.save();
      }
    }

    res.json({ success: true, refund: { id: refund.id, amount: refund.amount, status: refund.status } });
  } catch (err) { next(err); }
}

// ─── POST /api/razorpay/webhook — Razorpay webhook handler ───────────────────
export async function razorpayWebhook(req, res) {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  if (secret) {
    const signature = req.headers['x-razorpay-signature'];
    const expected = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (expected !== signature) {
      logger.warn('Razorpay webhook signature mismatch');
      return res.status(400).json({ error: 'Invalid signature' });
    }
  }

  const event = req.body.event;
  const payload = req.body.payload;

  try {
    switch (event) {
      case 'payment.captured': {
        const payment = payload.payment?.entity;
        const orderId = payment?.notes?.orderId;
        if (payment?.notes?.type === 'wallet_topup') {
          const userId = payment.notes.userId;
          let wallet = await Wallet.findOne({ userId });
          if (!wallet) wallet = await Wallet.create({ userId });
          const exists = wallet.transactions.some(t => t.stripeId === payment.id);
          if (!exists) {
            await wallet.credit(payment.amount, 'Wallet top-up via Razorpay', {
              stripeId: payment.id, type: TRANSACTION_TYPE.TOP_UP, gateway: 'RAZORPAY',
            });
          }
        } else if (orderId) {
          const order = await Order.findById(orderId);
          if (order && order.status === ORDER_STATUS.PENDING) {
            order.status = ORDER_STATUS.PLACED;
            order.paymentGateway = 'RAZORPAY';
            order.razorpayPaymentId = payment.id;
            order.timeline.push({ status: ORDER_STATUS.PLACED, actorType: 'system', note: 'Razorpay payment captured via webhook' });
            await order.save();
            try {
              emitNewOrder(order.restaurantId.toString(), order);
              dispatchOrder(order._id.toString());
            } catch {}
          }
        }
        break;
      }
      case 'payment.failed': {
        const payment = payload.payment?.entity;
        const orderId = payment?.notes?.orderId;
        if (orderId) {
          const order = await Order.findById(orderId);
          if (order) {
            order.status = ORDER_STATUS.FAILED;
            order.timeline.push({ status: ORDER_STATUS.FAILED, actorType: 'system', note: 'Razorpay payment failed' });
            await order.save();
          }
        }
        break;
      }
      case 'refund.created': {
        logger.info(`Razorpay refund created: ${payload.refund?.entity?.id}`);
        break;
      }
      default:
        logger.info(`Unhandled Razorpay webhook: ${event}`);
    }
  } catch (err) {
    logger.error('Razorpay webhook handler error', err);
  }

  res.json({ status: 'ok' });
}
