import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { applyReferralCode, getReferralStats } from '../controllers/referrals.js';

const router = Router();
router.use(verifyToken);

router.get('/stats', getReferralStats);
router.post('/apply', applyReferralCode);

export default router;
