import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { ROLES } from '@tastr/shared';
import { getRestaurantAnalytics, adminRevenueReport, adminRestaurantReport, adminDriverReport } from '../controllers/analytics.js';

const router = Router();
router.get('/restaurants/my/analytics',   verifyToken, getRestaurantAnalytics);
router.get('/restaurants/:id/analytics',  verifyToken, getRestaurantAnalytics);
router.get('/admin/reports/revenue',      verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminRevenueReport);
router.get('/admin/reports/restaurants',  verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminRestaurantReport);
router.get('/admin/reports/drivers',      verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminDriverReport);
export default router;
