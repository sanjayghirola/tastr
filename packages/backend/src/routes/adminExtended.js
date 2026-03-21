import { Router } from 'express';
import { body, param } from 'express-validator';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { auditAction } from '../middleware/audit.js';
import { ROLES } from '@tastr/shared';
import * as ac from '../controllers/adminCustomers.js';
import { adminListPromos } from '../controllers/promos.js';
import { adminRevenueReport, adminRestaurantReport, adminDriverReport, adminDashboardStats } from '../controllers/analytics.js';
import { adminListBlasts } from '../controllers/notifications.js';
import { adminListBanners, createBanner, updateBanner, deleteBanner } from '../controllers/banners.js';
import { uploadBannerUpload } from '../config/cloudinary.js';

const router = Router();
router.use(verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN));

// ─── Customers ────────────────────────────────────────────────────────────────
router.get('/customers',            ac.listCustomers);
router.get('/customers/:id/profile',[param('id').isMongoId()], validate, ac.getCustomerProfile);
router.patch('/users/:id/ban', auditAction('BAN_USER', 'User'),      [param('id').isMongoId(), body('reason').notEmpty()], validate, ac.banUser);
router.patch('/users/:id/unban', auditAction('UNBAN_USER', 'User'),    [param('id').isMongoId()], validate, ac.unbanUser);

// ─── Drivers ─────────────────────────────────────────────────────────────────
router.get('/drivers-all',          ac.listDrivers);
router.get('/drivers/:id/profile',  [param('id').isMongoId()], validate, ac.getDriverProfile);

// ─── Sub-admins & Roles ───────────────────────────────────────────────────────
router.get('/sub-admins',           ac.listSubAdmins);
router.post('/sub-admins', auditAction('CREATE_SUB_ADMIN', 'Admin'),          [body('email').isEmail(), body('name').notEmpty(), body('password').isLength({ min: 8 })], validate, ac.createSubAdmin);
router.patch('/sub-admins/:id', auditAction('UPDATE_SUB_ADMIN', 'Admin'),     [param('id').isMongoId()], validate, ac.updateSubAdmin);
router.get('/roles',                ac.listAdminRoles);
router.post('/roles', auditAction('CREATE_ROLE', 'Role'),               [body('name').notEmpty()], validate, ac.createAdminRole);
router.put('/roles/:id', auditAction('UPDATE_ROLE', 'Role'),            [param('id').isMongoId()], validate, ac.updateAdminRole);

// ─── Audit logs ───────────────────────────────────────────────────────────────
router.get('/audit-logs',           ac.listAuditLogs);

// ─── Promos ───────────────────────────────────────────────────────────────────
router.get('/promos',               adminListPromos);

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
router.get('/dashboard-stats', adminDashboardStats);

// ─── Reports ─────────────────────────────────────────────────────────────────
router.get('/reports/revenue',      adminRevenueReport);
router.get('/reports/restaurants',  adminRestaurantReport);
router.get('/reports/drivers',      adminDriverReport);

// ─── Notification blasts ──────────────────────────────────────────────────────
router.get('/notifications/blasts', adminListBlasts);

// ─── Banners ─────────────────────────────────────────────────────────────────
router.get('/banners',              adminListBanners);
router.post('/banners', auditAction('CREATE_BANNER', 'Banner'),             uploadBannerUpload, createBanner);
router.put('/banners/:id', auditAction('UPDATE_BANNER', 'Banner'),          uploadBannerUpload, updateBanner);
router.delete('/banners/:id', auditAction('DELETE_BANNER', 'Banner'),       deleteBanner);

// ─── System logs ──────────────────────────────────────────────────────────────
import { listSystemLogs } from '../controllers/systemLogs.js';
router.get('/system-logs', listSystemLogs);

export default router;
