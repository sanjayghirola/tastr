import { getPayoutHistory, getPaymentSummary } from '../controllers/restaurantPayments.js';
import { Router } from 'express';
import { body, param } from 'express-validator';
import { uploadRestaurantDocs, uploadRestaurantLogo } from '../config/cloudinary.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '@tastr/shared';
import * as restaurantsController from '../controllers/restaurants.js';
import { getReuploadStatus } from '../controllers/restaurantDocs.js';
import { getMyMenu } from '../controllers/menu.js';

const router = Router();
const restaurantAuth = [verifyToken, requireRole(ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF)];

// ─── Public token-gated route — MUST be before any /:id wildcard routes ──────
router.get('/reupload-status', getReuploadStatus);

// ─── GET /api/restaurants/me/menu — restaurant portal full menu fetch ─────────
// Must be before /:id routes so 'me' isn't treated as a MongoId
router.get('/me/menu', ...restaurantAuth, getMyMenu);

// ─── Public ──────────────────────────────────────────────────────────────────
// POST /api/restaurants/register
// Accepts all doc fields + coverPhotos + logo in one multipart request
router.post(
  '/register',
  uploadRestaurantDocs,
  [
    body('name').notEmpty().withMessage('Restaurant name required'),
    body('businessEmail').isEmail().withMessage('Valid business email required'),
    body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
  ],
  validate,
  restaurantsController.registerRestaurant,
);

// ─── Owner / staff routes ─────────────────────────────────────────────────────
// GET /api/restaurants/status  (pending approval page)
router.get('/status',  verifyToken, restaurantsController.getRestaurantStatus);

// GET /api/restaurants/me  (restaurant dashboard — must NOT be GET / to avoid blocking public listing)
router.get('/me', verifyToken, requireRole(ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF), restaurantsController.getMyRestaurant);

// PUT /api/restaurants/profile (also aliased as /me)
router.put(
  '/profile',
  verifyToken,
  requireRole(ROLES.RESTAURANT_OWNER),
  uploadRestaurantLogo,
  restaurantsController.updateProfile,
);
router.put(
  '/me',
  verifyToken,
  requireRole(ROLES.RESTAURANT_OWNER),
  uploadRestaurantLogo,
  restaurantsController.updateProfile,
);

// PUT /api/restaurants/hours (also aliased as /me/hours)
router.put(
  '/hours',
  verifyToken,
  requireRole(ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF),
  restaurantsController.updateHours,
);
router.put(
  '/me/hours',
  verifyToken,
  requireRole(ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF),
  restaurantsController.updateHours,
);

// PUT /api/restaurants/online
router.put(
  '/online',
  verifyToken,
  requireRole(ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF),
  restaurantsController.setOnlineStatus,
);

// PUT /api/restaurants/delivery-settings
router.put(
  '/delivery-settings',
  verifyToken,
  requireRole(ROLES.RESTAURANT_OWNER),
  restaurantsController.updateDeliverySettings,
);

// PUT /api/restaurants/me/delivery  (alias used by restaurant portal)
router.put(
  '/me/delivery',
  verifyToken,
  requireRole(ROLES.RESTAURANT_OWNER),
  restaurantsController.updateDeliverySettings,
);

// GET/PUT /api/restaurants/me/kitchen-settings
router.get(
  '/me/kitchen-settings',
  verifyToken,
  requireRole(ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF),
  restaurantsController.getKitchenSettings,
);

router.put(
  '/me/kitchen-settings',
  verifyToken,
  requireRole(ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF),
  restaurantsController.updateKitchenSettings,
);

// ─── Admin routes ─────────────────────────────────────────────────────────────
// GET  /api/restaurants/admin/list
router.get(
  '/admin/list',
  verifyToken,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN),
  restaurantsController.adminListRestaurants,
);

// POST /api/restaurants/admin/create
router.post(
  '/admin/create',
  verifyToken,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN),
  uploadRestaurantDocs,
  [
    body('name').notEmpty().withMessage('Restaurant name required'),
    body('businessEmail').optional().isEmail().withMessage('Valid email required'),
  ],
  validate,
  restaurantsController.adminCreateRestaurant,
);

// PATCH /api/restaurants/admin/:id/approve
router.patch(
  '/admin/:id/approve',
  verifyToken,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN),
  [param('id').isMongoId()],
  validate,
  restaurantsController.approveRestaurant,
);

// PATCH /api/restaurants/admin/:id/reject
router.patch(
  '/admin/:id/reject',
  verifyToken,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN),
  [param('id').isMongoId(), body('reason').notEmpty().withMessage('Rejection reason required')],
  validate,
  restaurantsController.rejectRestaurant,
);

// PATCH /api/restaurants/admin/:id/suspend
router.patch(
  '/admin/:id/suspend',
  verifyToken,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN),
  [param('id').isMongoId()],
  validate,
  restaurantsController.suspendRestaurant,
);

// GET /api/restaurants/admin/:id
router.get(
  '/admin/:id',
  verifyToken,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN),
  [param('id').isMongoId()],
  validate,
  restaurantsController.adminGetRestaurant,
);

// ─── Restaurant payments ──────────────────────────────────────────────────────
router.get('/payments/payouts', verifyToken, requireRole(ROLES.RESTAURANT_OWNER), getPayoutHistory);
router.get('/payments/summary', verifyToken, requireRole(ROLES.RESTAURANT_OWNER), getPaymentSummary);

export default router;
