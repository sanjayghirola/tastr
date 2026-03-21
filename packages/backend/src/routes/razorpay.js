import { Router } from 'express';
import { body } from 'express-validator';
import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/razorpayPayments.js';

const router = Router();

// Status check
router.get('/status', ctrl.getStatus);

// Authenticated routes
router.post('/order',
  verifyToken,
  [body('amount').isInt({ min: 100 })],
  validate,
  ctrl.createOrder,
);

router.post('/verify',
  verifyToken,
  [body('razorpay_order_id').notEmpty(), body('razorpay_payment_id').notEmpty(), body('razorpay_signature').notEmpty()],
  validate,
  ctrl.verifyPayment,
);

router.post('/wallet-topup',
  verifyToken,
  [body('amount').isInt({ min: 500 })],
  validate,
  ctrl.walletTopup,
);

router.post('/wallet-topup/verify',
  verifyToken,
  [body('razorpay_order_id').notEmpty(), body('razorpay_payment_id').notEmpty(), body('razorpay_signature').notEmpty()],
  validate,
  ctrl.verifyWalletTopup,
);

router.post('/refund',
  verifyToken,
  [body('paymentId').notEmpty()],
  validate,
  ctrl.initiateRefund,
);

// Webhook (raw body)
router.post('/webhook', express.json(), ctrl.razorpayWebhook);

export default router;
