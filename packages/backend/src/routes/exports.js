import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { ROLES } from '@tastr/shared';
import * as ctrl from '../controllers/exports.js';

const router = Router();
router.use(verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN));

router.get('/orders',      ctrl.exportOrders);
router.get('/customers',   ctrl.exportCustomers);
router.get('/drivers',     ctrl.exportDrivers);
router.get('/audit-logs',  ctrl.exportAuditLogs);
router.get('/complaints',  ctrl.exportComplaints);
router.get('/gift-cards',  ctrl.exportGiftCards);
router.get('/revenue',     ctrl.exportRevenue);

export default router;
