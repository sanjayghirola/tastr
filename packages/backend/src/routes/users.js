import { Router } from 'express';
import { body, param } from 'express-validator';
import { uploadAvatar } from '../config/cloudinary.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '@tastr/shared';
import * as usersController from '../controllers/users.js';

const router  = Router();


// All routes require authentication
router.use(verifyToken);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get own profile
 *     responses:
 *       200: { description: User profile }
 */
router.get('/me', usersController.getMe);

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     tags: [Users]
 *     summary: Update profile (name, email, phone, photo, dietary prefs)
 */
router.put('/me',
  uploadAvatar,
  [
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 chars'),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().isMobilePhone(),
    body('dietaryPreferences').optional().isArray(),
  ],
  validate,
  usersController.updateMe,
);

/**
 * @swagger
 * /api/users/me/password:
 *   put:
 *     tags: [Users]
 *     summary: Change password (requires current password)
 */
router.put('/me/password',
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Min 8 characters'),
  ],
  validate,
  usersController.changePassword,
);

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     tags: [Users]
 *     summary: GDPR — anonymise and delete own account
 */
router.delete('/me', usersController.deleteAccount);

/**
 * @swagger
 * /api/users/me/export:
 *   get:
 *     tags: [Users]
 *     summary: GDPR — export all personal data as JSON
 */
router.get('/me/export', usersController.exportData);

// ─── Addresses ────────────────────────────────────────────────────────────────
router.get('/me/addresses', usersController.getAddresses);

router.post('/me/addresses',
  [
    body('label').optional().isIn(['Home', 'Work', 'Other']),
    body('line1').notEmpty().withMessage('Address line 1 required'),
    body('city').notEmpty().withMessage('City required'),
    body('postcode').notEmpty().withMessage('Postcode required'),
    body('landmark').optional().isString(),
  ],
  validate,
  usersController.addAddress,
);

router.put('/me/addresses/:id',
  [
    param('id').isMongoId(),
    body('label').optional().isIn(['Home', 'Work', 'Other']),
    body('line1').optional().notEmpty(),
    body('city').optional().notEmpty(),
    body('postcode').optional().notEmpty(),
  ],
  validate,
  usersController.updateAddress,
);

router.delete('/me/addresses/:id',
  [param('id').isMongoId()],
  validate,
  usersController.deleteAddress,
);

router.patch('/me/addresses/:id/default',
  [param('id').isMongoId()],
  validate,
  usersController.setDefaultAddress,
);

// ─── FCM token ────────────────────────────────────────────────────────────────
router.post('/me/fcm-token',
  [body('token').notEmpty().withMessage('FCM token required')],
  validate,
  usersController.updateFcmToken,
);

// ─── Notification preferences ─────────────────────────────────────────────────
router.put('/me/notification-prefs',
  [
    body('orderUpdates').optional().isBoolean(),
    body('promotions').optional().isBoolean(),
    body('wallet').optional().isBoolean(),
    body('groupOrders').optional().isBoolean(),
  ],
  validate,
  usersController.updateNotifPrefs,
);

// ─── CMS pages (public) ───────────────────────────────────────────────────────
router.get('/cms/:slug', usersController.getCmsPage);

// ─── In-app notifications ─────────────────────────────────────────────────────
router.get('/notifications',                  verifyToken, usersController.getNotifications);
router.post('/notifications/mark-all-read',   verifyToken, usersController.markAllNotificationsRead);
router.patch('/notifications/:id/read',       verifyToken, usersController.markNotificationRead);

export default router;
