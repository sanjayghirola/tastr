import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { auditAction } from '../middleware/audit.js';
import { ROLES, ENTITY_STATUS } from '@tastr/shared';
import * as adminController from '../controllers/admin.js';

const router = Router();

router.use(verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN));

// ─── Restaurant list (all statuses) ──────────────────────────────────────────
router.get('/restaurants',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validate, adminController.getRestaurants,
);

// ─── Pending queue — MUST be before /:id ─────────────────────────────────────
router.get('/restaurants/pending',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validate, adminController.getPendingRestaurants,
);

// ─── Single detail ────────────────────────────────────────────────────────────
router.get('/restaurants/:id', [param('id').isMongoId()], validate, adminController.getRestaurantById);

// ─── Approve / reject ─────────────────────────────────────────────────────────
router.patch('/restaurants/:id/status', auditAction('UPDATE_RESTAURANT_STATUS', 'Restaurant'),
  [param('id').isMongoId(), body('status').isIn([ENTITY_STATUS.ACTIVE, ENTITY_STATUS.REJECTED, ENTITY_STATUS.SUSPENDED]), body('reason').optional().isString()],
  validate, adminController.updateRestaurantStatus,
);

// ─── Driver approvals ─────────────────────────────────────────────────────────
router.get('/drivers/pending',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validate, adminController.getPendingDrivers,
);

router.patch('/drivers/:id/status', auditAction('UPDATE_DRIVER_STATUS', 'Driver'),
  [param('id').isMongoId(), body('status').isIn([ENTITY_STATUS.ACTIVE, ENTITY_STATUS.REJECTED, 'REQUEST_DOCS']), body('reason').optional().isString()],
  validate, adminController.updateDriverStatus,
);

router.post('/drivers/create',
  [body('name').notEmpty(), body('email').isEmail(), body('phone').notEmpty(), body('password').isLength({ min: 6 })],
  validate, adminController.adminCreateDriver,
);

// ─── CMS ──────────────────────────────────────────────────────────────────────
router.get('/cms',         adminController.listCmsPages);
router.put('/cms/:slug',
  [param('slug').notEmpty(), body('title').notEmpty(), body('content').notEmpty()],
  validate, adminController.upsertCmsPage,
);

// ─── Orders ───────────────────────────────────────────────────────────────────
router.get('/orders',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validate, adminController.listOrders,
);
router.get('/orders/:id',    [param('id').isMongoId()], validate, adminController.getOrderById);
router.patch('/orders/:id/reassign', auditAction('REASSIGN_DRIVER', 'Order'),
  [param('id').isMongoId(), body('driverId').isMongoId()],
  validate, adminController.reassignDriver,
);
router.post('/orders/:id/refund', auditAction('ISSUE_REFUND', 'Order'),
  [param('id').isMongoId(), body('amountPence').isInt({ min: 1 }), body('reason').notEmpty()],
  validate, adminController.issueRefund,
);
router.patch('/orders/:id/cancel', auditAction('CANCEL_ORDER', 'Order'), [param('id').isMongoId()], validate, adminController.cancelOrderAdmin);

// ─── Online drivers (for live map / reassign) ─────────────────────────────────
router.get('/drivers', adminController.listDrivers);

// ─── Gift Cards ───────────────────────────────────────────────────────────────
import {
  adminListGiftCards, adminBatchCreate, adminUpdateGiftCard,
} from '../controllers/giftCards.js';
router.get('/gift-cards',            adminListGiftCards);
router.post('/gift-cards/batch',     adminBatchCreate);
router.patch('/gift-cards/:id',      adminUpdateGiftCard);

// ─── Subscriptions ────────────────────────────────────────────────────────────
import {
  adminListSubscriptions, adminCreatePlan, adminUpdatePlan,
} from '../controllers/subscriptions.js';
router.get('/subscriptions',           adminListSubscriptions);
router.post('/subscriptions/plans',    adminCreatePlan);
router.put('/subscriptions/plans/:id', adminUpdatePlan);

export default router;

// ─── Sales report ─────────────────────────────────────────────────────────────
router.get('/sales-report',   adminController.salesReport);

// ─── Platform stats ───────────────────────────────────────────────────────────
router.get('/platform-stats', adminController.platformStats);

// ─── Notif templates ──────────────────────────────────────────────────────────
router.get('/notif-templates',            adminController.listNotifTemplates);
router.put('/notif-templates/:trigger',   adminController.updateNotifTemplate);

// ─── Navigation config ────────────────────────────────────────────────────────
router.get('/nav-config',                 adminController.getNavConfig);
router.put('/nav-config',                 adminController.updateNavConfig);

// ─── Verticals / Catalog ──────────────────────────────────────────────────────
router.get('/verticals',                  adminController.listVerticals);
router.put('/verticals/:key',             adminController.updateVertical);
router.post('/verticals',                 adminController.createVertical);
