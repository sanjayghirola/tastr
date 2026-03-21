import Wallet from '../models/Wallet.js';
import { getStripe, isStripeEnabled } from '../config/stripe.js';
import { TRANSACTION_TYPE } from '@tastr/shared';

function fmt(n) { return Math.round(Number(n)); }

// ─── GET /api/wallet ──────────────────────────────────────────────────────────
export async function getWallet(req, res, next) {
  try {
    let wallet = await Wallet.findOne({ userId: req.user._id }).lean();
    if (!wallet) {
      wallet = await Wallet.create({ userId: req.user._id, balance: 0, transactions: [] });
      wallet = wallet.toObject();
    }
    const recent = [...(wallet.transactions || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);
    res.json({ success: true, balance: wallet.balance, transactions: recent });
  } catch (err) { next(err); }
}

// ─── GET /api/wallet/transactions ─────────────────────────────────────────────
export async function getTransactions(req, res, next) {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const wallet = await Wallet.findOne({ userId: req.user._id }).lean();
    if (!wallet) return res.json({ success: true, transactions: [], total: 0 });

    let txs = wallet.transactions || [];
    if (type) txs = txs.filter(t => t.type === type);
    txs = txs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = txs.length;
    const skip  = (page - 1) * limit;
    txs = txs.slice(skip, skip + Number(limit));

    res.json({ success: true, transactions: txs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
}

// ─── POST /api/wallet/topup — create PaymentIntent ────────────────────────────
export async function createTopUp(req, res, next) {
  try {
    const { amount } = req.body;   // pence
    if (!amount || amount < 500) return res.status(400).json({ message: 'Minimum top-up is £5' });

    if (!isStripeEnabled()) return res.status(400).json({ message: 'Stripe is not configured. Use Razorpay wallet top-up instead.' });
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.create({
      amount: fmt(amount),
      currency: 'gbp',
      metadata: { userId: req.user._id.toString(), type: 'wallet_topup' },
    });
    res.json({ success: true, clientSecret: pi.client_secret, paymentIntentId: pi.id });
  } catch (err) { next(err); }
}

// ─── POST /api/wallet/topup/confirm — credit wallet after successful payment ──
export async function confirmTopUp(req, res, next) {
  try {
    const { paymentIntentId } = req.body;
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== 'succeeded') return res.status(400).json({ message: 'Payment not completed' });
    if (pi.metadata?.userId !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });

    // Idempotency — check if already credited
    let wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) wallet = await Wallet.create({ userId: req.user._id, balance: 0, transactions: [] });

    const alreadyCredited = wallet.transactions.some(t => t.stripeId === paymentIntentId);
    if (alreadyCredited) return res.json({ success: true, balance: wallet.balance, message: 'Already credited' });

    await wallet.credit(pi.amount, 'Wallet top-up', { stripeId: paymentIntentId, type: TRANSACTION_TYPE.TOP_UP });
    res.json({ success: true, balance: wallet.balance, credited: pi.amount });
  } catch (err) { next(err); }
}
