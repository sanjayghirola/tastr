import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { ROLES } from '@tastr/shared';
import {
  listPlans, mySubscription, subscribe, cancelSubscription,
  verifyRazorpaySubscription,
  adminListSubscriptions, adminCreatePlan, adminUpdatePlan,
} from '../controllers/subscriptions.js';

const router = Router();

// Public
router.get('/plans', listPlans);

// Customer
router.get('/my',      verifyToken, mySubscription);
router.post('/subscribe', verifyToken, subscribe);
router.post('/verify-razorpay', verifyToken, verifyRazorpaySubscription);
router.post('/cancel',    verifyToken, cancelSubscription);

// Admin
router.get('/admin',            verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminListSubscriptions);
router.post('/admin/plans',     verifyToken, requireRole(ROLES.SUPER_ADMIN), adminCreatePlan);
router.put('/admin/plans/:id',  verifyToken, requireRole(ROLES.SUPER_ADMIN), adminUpdatePlan);

export default router;
