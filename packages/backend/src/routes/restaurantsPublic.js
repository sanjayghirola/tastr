import { Router } from 'express';
import { query, param, body } from 'express-validator';
import { verifyToken, requireRole, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '@tastr/shared';
import * as ctrl from '../controllers/restaurantsPublic.js';

const router = Router();

// MongoDB ObjectId regex — only match 24-char hex strings
// This prevents /me, /status, /admin etc. from being caught by /:id
const MONGO_ID_RE = /^[a-f\d]{24}$/i;

/**
 * GET /api/restaurants
 * Public listing — no auth required, optional token for personalisation
 */
router.get('/',
  optionalAuth,
  [
    query('lat').optional().isFloat(),
    query('lng').optional().isFloat(),
    query('radiusKm').optional().isFloat({ min: 0.1, max: 50 }),
    query('cuisine').optional().isString(),
    query('minRating').optional().isFloat({ min: 0, max: 5 }),
    query('maxDeliveryFee').optional().isFloat({ min: 0 }),
    query('openNow').optional().isBoolean(),
    query('dietary').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 40 }),
    query('sort').optional().isIn(['rating', 'deliveryTime', 'distance', 'new']),
  ],
  validate,
  ctrl.listRestaurants,
);

/**
 * GET /api/restaurants/:id
 * Public restaurant detail — only matches valid MongoIds, so /me /status /admin pass through
 */
router.get('/:id',
  (req, res, next) => MONGO_ID_RE.test(req.params.id) ? next() : next('route'),
  [param('id').isMongoId()],
  validate,
  ctrl.getRestaurant,
);

/**
 * GET /api/restaurants/:id/menu
 */
router.get('/:id/menu',
  (req, res, next) => MONGO_ID_RE.test(req.params.id) ? next() : next('route'),
  [param('id').isMongoId()],
  validate,
  ctrl.getMenu,
);

/**
 * PATCH /api/restaurants/:id/online
 */
router.patch('/:id/online',
  (req, res, next) => MONGO_ID_RE.test(req.params.id) ? next() : next('route'),
  verifyToken,
  requireRole(ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF),
  [param('id').isMongoId(), body('isOnline').isBoolean()],
  validate,
  ctrl.toggleOnline,
);

export default router;
