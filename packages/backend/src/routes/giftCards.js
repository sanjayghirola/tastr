import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  myGiftCards, getGiftCard, purchaseGiftCard, confirmGiftCardPurchase,
  verifyRazorpayGiftCard, redeemGiftCard,
} from '../controllers/giftCards.js';

const router = Router();
router.use(verifyToken);

router.get('/mine',              myGiftCards);
router.get('/:id',               getGiftCard);
router.post('/purchase',         purchaseGiftCard);
router.post('/purchase/confirm', confirmGiftCardPurchase);
router.post('/purchase/verify-razorpay', verifyRazorpayGiftCard);
router.post('/redeem',           redeemGiftCard);

export default router;
