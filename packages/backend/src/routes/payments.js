import { Router } from 'express';
import { body, param } from 'express-validator';
import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/payments.js';
import { isStripeEnabled } from '../config/stripe.js';
import { isRazorpayEnabled } from '../config/razorpay.js';

const router = Router();

// ─── Gateway status (which payment methods are available) ─────────────────────
router.get('/gateway-status', (req, res) => {
  res.json({
    success: true,
    stripe:   isStripeEnabled(),
    razorpay: isRazorpayEnabled(),
    wallet:   true,
    razorpayKeyId: isRazorpayEnabled() ? process.env.RAZORPAY_KEY_ID : null,
  });
});

// ─── Stripe PaymentIntents ────────────────────────────────────────────────────
router.post('/intent',
  verifyToken,
  [body('amount').isInt({ min: 50 }), body('orderId').optional().isMongoId()],
  validate,
  ctrl.createIntent,
);

router.post('/confirm',
  verifyToken,
  [body('paymentIntentId').notEmpty()],
  validate,
  ctrl.confirmPayment,
);

// ─── Saved payment methods ────────────────────────────────────────────────────
router.get('/methods',  verifyToken, ctrl.listMethods);
router.post('/methods', verifyToken, ctrl.addMethod);
router.delete('/methods/:id', verifyToken, ctrl.removeMethod);

// ─── Wallet ───────────────────────────────────────────────────────────────────
router.get('/wallet',       verifyToken, ctrl.getWallet);
router.post('/wallet/topup',
  verifyToken,
  [body('amount').isInt({ min: 500, max: 100000 })],   // £5 – £1000
  validate,
  ctrl.topupWallet,
);

// ─── Available promos for current user ───────────────────────────────────────
router.get('/promos/available', verifyToken, ctrl.getAvailablePromos);

// ─── Stripe webhook (raw body!) ───────────────────────────────────────────────
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  ctrl.stripeWebhook,
);

export default router;
