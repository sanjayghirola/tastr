import { Router } from 'express';
import { verifyToken, requireRole, optionalAuth } from '../middleware/auth.js';
import { ROLES } from '@tastr/shared';
import {
  getActiveAgreement, acceptAgreement, getAcceptanceStatus,
  adminListAgreements, adminUpsertAgreement, adminListAcceptances,
} from '../controllers/agreements.js';

const router = Router();

// Public — get active agreement text
router.get('/:type', getActiveAgreement);

// Authenticated — accept and check status
router.post('/:type/accept', verifyToken, acceptAgreement);
router.get('/:type/status',  verifyToken, getAcceptanceStatus);

// Admin — manage agreements
router.get('/admin/all',          verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminListAgreements);
router.post('/admin/upsert',     verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminUpsertAgreement);
router.get('/admin/acceptances', verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminListAcceptances);

export default router;
