import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getWallet, getTransactions, createTopUp, confirmTopUp } from '../controllers/wallet.js';

const router = Router();
router.use(verifyToken);

router.get('/',              getWallet);
router.get('/transactions',  getTransactions);
router.post('/topup',        createTopUp);
router.post('/topup/confirm',confirmTopUp);

export default router;
