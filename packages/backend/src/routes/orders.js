import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '@tastr/shared';
import * as ctrl from '../controllers/orders.js';

const router = Router();

const restaurantAuth = [verifyToken, requireRole(ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF)];

// ─── Customer order creation ──────────────────────────────────────────────────
router.post('/',
  verifyToken,
  [
    body('deliveryAddressId').optional().isMongoId(),
    body('deliveryAddress').optional().isObject(),
    body('paymentMethod').isIn(['CARD','WALLET','APPLE_PAY','GOOGLE_PAY','RAZORPAY']),
    body('paymentMethodId').optional().isString(),
    body('deliveryMethod').optional().isIn(['standard','express','scheduled']),
  ],
  validate,
  ctrl.createOrder,
);

router.post('/schedule',
  verifyToken,
  [
    body('deliveryAddressId').optional().isMongoId(),
    body('deliveryAddress').optional().isObject(),
    body('paymentMethod').isIn(['CARD','WALLET','APPLE_PAY','GOOGLE_PAY','RAZORPAY']),
    body('scheduledAt').isISO8601(),
  ],
  validate,
  ctrl.createScheduledOrder,
);

router.post('/gift',
  verifyToken,
  [
    body('paymentMethod').isIn(['CARD','WALLET','APPLE_PAY','GOOGLE_PAY','RAZORPAY']),
    body('giftRecipient.name').notEmpty(),
    body('giftRecipient.phone').notEmpty(),
  ],
  validate,
  ctrl.createGiftOrder,
);

// ─── Customer order reads ─────────────────────────────────────────────────────
router.get('/',   verifyToken, ctrl.listMyOrders);

// ─── Restaurant order management (MUST be before /:id) ─────────────────────
router.get('/restaurant/active',
  ...restaurantAuth,
  ctrl.getRestaurantOrders,
);

router.get('/restaurant/history',
  ...restaurantAuth,
  ctrl.getRestaurantOrderHistory,
);

router.get('/restaurant/all',
  ...restaurantAuth,
  ctrl.getRestaurantAllOrders,
);

// ─── Single order detail ────────────────────────────────────────────────────
router.get('/:id', verifyToken, [param('id').isMongoId()], validate, ctrl.getOrder);

// ─── Restaurant: accept / reject / status / assign / cancel / deliver ───────
router.patch('/:id/accept',
  ...restaurantAuth,
  [param('id').isMongoId(), body('prepTime').optional().isInt({ min: 1, max: 120 })],
  validate,
  ctrl.acceptOrder,
);

router.patch('/:id/reject',
  ...restaurantAuth,
  [param('id').isMongoId(), body('reason').optional().isString()],
  validate,
  ctrl.rejectOrder,
);

router.patch('/:id/status',
  verifyToken,
  requireRole(ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF, ROLES.DRIVER, ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN),
  [param('id').isMongoId(), body('status').notEmpty()],
  validate,
  ctrl.updateOrderStatus,
);

router.patch('/:id/assign-driver',
  ...restaurantAuth,
  [param('id').isMongoId(), body('driverId').optional().isMongoId()],
  validate,
  ctrl.assignDriver,
);

router.patch('/:id/mark-delivered',
  verifyToken,
  requireRole(ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF, ROLES.DRIVER),
  [param('id').isMongoId()],
  validate,
  ctrl.markDelivered,
);

router.patch('/:id/restaurant-cancel',
  ...restaurantAuth,
  [param('id').isMongoId(), body('reason').optional().isString()],
  validate,
  ctrl.restaurantCancelOrder,
);

// ─── Customer: cancel ───────────────────────────────────────────────────────
router.patch('/:id/cancel',
  verifyToken,
  [param('id').isMongoId(), body('reason').optional().isString()],
  validate,
  ctrl.cancelOrder,
);

// ─── Driver: verify pickup PIN at restaurant ─────────────────────────────────
router.post('/:id/verify-pickup',
  verifyToken,
  requireRole(ROLES.DRIVER),
  [param('id').isMongoId(), body('pin').notEmpty().isLength({ min: 4, max: 4 })],
  validate,
  ctrl.verifyPickupPin,
);

// ─── Driver: verify delivery OTP from customer ──────────────────────────────
router.post('/:id/verify-delivery',
  verifyToken,
  requireRole(ROLES.DRIVER),
  [param('id').isMongoId(), body('otp').notEmpty().isLength({ min: 4, max: 4 })],
  validate,
  ctrl.verifyDeliveryOtp,
);

// ─── Rate order (triggers review) ────────────────────────────────────────────
router.post('/:id/rate',
  verifyToken,
  [
    param('id').isMongoId(),
    body('restaurantRating').optional().isInt({ min: 1, max: 5 }),
    body('driverRating').optional().isInt({ min: 1, max: 5 }),
    body('appRating').optional().isInt({ min: 1, max: 5 }),
    body('restaurantComment').optional().isString().isLength({ max: 1000 }),
    body('driverComment').optional().isString(),
  ],
  validate,
  ctrl.rateOrder,
);

export default router;