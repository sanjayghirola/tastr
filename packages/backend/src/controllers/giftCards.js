import { nanoid } from 'nanoid';
import GiftCard from '../models/GiftCard.js';
import Wallet from '../models/Wallet.js';
import { getStripe, isStripeEnabled } from '../config/stripe.js';
import { getRazorpay, isRazorpayEnabled } from '../config/razorpay.js';
import { GIFT_CARD_STATUS, TRANSACTION_TYPE } from '@tastr/shared';

function genCode() {
  const part = () => nanoid(4).toUpperCase().replace(/[^A-Z0-9]/g, '0').padEnd(4,'0');
  return `TASTR-${part()}-${part()}-${part()}`;
}

// ─── GET /api/gift-cards/mine ─────────────────────────────────────────────────
export async function myGiftCards(req, res, next) {
  try {
    const cards = await GiftCard.find({ purchasedBy: req.user._id })
      .sort({ createdAt: -1 }).lean();
    const now = new Date();
    const result = cards.map(c => ({
      ...c,
      status: c.status === GIFT_CARD_STATUS.ACTIVE && c.expiresAt < now
        ? GIFT_CARD_STATUS.EXPIRED : c.status,
    }));
    res.json({ success: true, giftCards: result });
  } catch (err) { next(err); }
}

// ─── GET /api/gift-cards/:id ──────────────────────────────────────────────────
export async function getGiftCard(req, res, next) {
  try {
    const card = await GiftCard.findById(req.params.id).lean();
    if (!card) return res.status(404).json({ message: 'Gift card not found' });
    if (card.purchasedBy.toString() !== req.user._id.toString() &&
        card.redeemedBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json({ success: true, giftCard: card });
  } catch (err) { next(err); }
}

// ─── POST /api/gift-cards/purchase — create PaymentIntent (Stripe or Razorpay)
export async function purchaseGiftCard(req, res, next) {
  try {
    const { value, gateway, recipientEmail, recipientName, message } = req.body;
    if (!value || value < 1000) return res.status(400).json({ message: 'Minimum gift card value is £10' });

    // ─── Razorpay flow ───────────────────────────────────────────────────────
    if (gateway === 'RAZORPAY') {
      if (!isRazorpayEnabled()) return res.status(400).json({ message: 'Razorpay is not configured.' });
      try {
        const rzp = getRazorpay();
        const rzpOrder = await rzp.orders.create({
          amount: value,
          currency: process.env.RAZORPAY_CURRENCY || 'INR',
          receipt: `gc_${req.user._id}_${Date.now()}`,
          notes: { userId: req.user._id.toString(), type: 'gift_card', value: String(value) },
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
          value,
        });
      } catch (rzpErr) {
        const msg = rzpErr?.error?.description || rzpErr?.message || 'Razorpay order creation failed';
        return res.status(500).json({ success: false, message: typeof msg === 'string' ? msg : JSON.stringify(msg) });
      }
    }

    // ─── Stripe flow ──────────────────────────────────────────────────────────
    if (!isStripeEnabled()) return res.status(400).json({ message: 'No payment gateway configured. Please try Razorpay.' });
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.create({
      amount: value,
      currency: 'gbp',
      metadata: { userId: req.user._id.toString(), type: 'gift_card', value: String(value) },
    });
    res.json({ success: true, gateway: 'STRIPE', clientSecret: pi.client_secret, paymentIntentId: pi.id });
  } catch (err) { next(err); }
}

// ─── POST /api/gift-cards/purchase/confirm — Stripe confirmation ─────────────
export async function confirmGiftCardPurchase(req, res, next) {
  try {
    const { paymentIntentId, recipientEmail, recipientName, message } = req.body;
    if (!isStripeEnabled()) return res.status(400).json({ message: 'Stripe is not configured.' });
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== 'succeeded') return res.status(400).json({ message: 'Payment not completed' });
    if (pi.metadata?.userId !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });

    const existing = await GiftCard.findOne({ stripePaymentIntentId: paymentIntentId });
    if (existing) return res.json({ success: true, giftCard: existing });

    const value = Number(pi.metadata.value) || pi.amount;
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const card = await GiftCard.create({
      code: genCode(), value, balance: value,
      purchasedBy: req.user._id, expiresAt,
      stripePaymentIntentId: paymentIntentId,
      emailDelivery: recipientEmail ? { recipientEmail, recipientName, message } : undefined,
    });
    res.json({ success: true, giftCard: card });
  } catch (err) { next(err); }
}

// ─── POST /api/gift-cards/purchase/verify-razorpay ──────────────────────────
export async function verifyRazorpayGiftCard(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, value, recipientEmail, recipientName, message } = req.body;
    const crypto = (await import('crypto')).default;

    const secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Idempotency
    const existing = await GiftCard.findOne({ razorpayPaymentId: razorpay_payment_id });
    if (existing) return res.json({ success: true, giftCard: existing });

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const card = await GiftCard.create({
      code: genCode(),
      value: Number(value),
      balance: Number(value),
      purchasedBy: req.user._id,
      expiresAt,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      emailDelivery: recipientEmail ? { recipientEmail, recipientName, message } : undefined,
    });
    res.json({ success: true, giftCard: card });
  } catch (err) { next(err); }
}

// ─── POST /api/gift-cards/redeem ──────────────────────────────────────────────
export async function redeemGiftCard(req, res, next) {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Code is required' });

    const card = await GiftCard.findOne({ code: code.toUpperCase().trim() });
    if (!card) return res.status(404).json({ message: 'Invalid gift card code' });
    if (card.status !== GIFT_CARD_STATUS.ACTIVE) return res.status(400).json({ message: `Gift card is ${card.status}` });
    if (card.expiresAt < new Date()) return res.status(400).json({ message: 'Gift card has expired' });
    if (card.balance <= 0) return res.status(400).json({ message: 'Gift card has no remaining balance' });

    let wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) wallet = await Wallet.create({ userId: req.user._id, balance: 0, transactions: [] });

    const amount = card.balance;
    await wallet.credit(amount, `Gift card redeemed (${card.code})`, { type: TRANSACTION_TYPE.CREDIT });

    card.balance = 0;
    card.status = GIFT_CARD_STATUS.USED;
    card.redeemedBy = req.user._id;
    card.redeemedAt = new Date();
    await card.save();

    res.json({ success: true, credited: amount, balance: wallet.balance });
  } catch (err) { next(err); }
}

// ─── ADMIN: GET /api/admin/gift-cards ─────────────────────────────────────────
export async function adminListGiftCards(req, res, next) {
  try {
    const { status, page = 1, limit = 30, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }
    const [cards, total] = await Promise.all([
      GiftCard.find(filter).sort({ createdAt: -1 })
        .skip((page-1)*limit).limit(Number(limit))
        .populate('purchasedBy', 'name email')
        .populate('redeemedBy', 'name email').lean(),
      GiftCard.countDocuments(filter),
    ]);
    res.json({ success: true, giftCards: cards, total, page: Number(page), pages: Math.ceil(total/limit) });
  } catch (err) { next(err); }
}

// ─── ADMIN: POST /api/admin/gift-cards/batch ──────────────────────────────────
export async function adminBatchCreate(req, res, next) {
  try {
    const { value, quantity, expiryMonths = 12 } = req.body;
    if (!value || !quantity || quantity > 500) return res.status(400).json({ message: 'value and quantity (max 500) required' });

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + Number(expiryMonths));

    const cards = Array.from({ length: quantity }, () => ({
      code: genCode(),
      value: Number(value),
      balance: Number(value),
      purchasedBy: req.user._id,
      expiresAt,
    }));
    const created = await GiftCard.insertMany(cards);
    const codes = created.map(c => c.code);
    res.json({ success: true, count: created.length, codes });
  } catch (err) { next(err); }
}

// ─── ADMIN: PATCH /api/admin/gift-cards/:id ───────────────────────────────────
export async function adminUpdateGiftCard(req, res, next) {
  try {
    const card = await GiftCard.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!card) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true, giftCard: card });
  } catch (err) { next(err); }
}
