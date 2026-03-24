import { Router } from 'express';
import { body } from 'express-validator';
import passport from 'passport';

import { validate } from '../middleware/validate.js';
import { verifyToken } from '../middleware/auth.js';
import { authLimiter, otpLimiter, adminAuthLimiter } from '../middleware/rateLimit.js';
import * as authController from '../controllers/auth.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
//  CUSTOMER AUTH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new customer
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, password]
 *             properties:
 *               name:     { type: string, example: "John Smith" }
 *               email:    { type: string, format: email }
 *               phone:    { type: string, example: "+447911123456" }
 *               password: { type: string, minLength: 8, example: "Password1" }
 *     responses:
 *       201:
 *         description: Registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 user:    { $ref: '#/components/schemas/User' }
 *                 tokens:  { $ref: '#/components/schemas/AuthTokens' }
 *       409: { description: Email or phone already taken }
 *       422: { description: Validation error }
 */
router.post('/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail().withMessage('Invalid email'),
    body('phone').optional({ values: 'falsy' }).isString().withMessage('Invalid phone number'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body().custom((_, { req }) => {
      if (!req.body.email && !req.body.phone) throw new Error('Email or phone is required');
      return true;
    }),
  ],
  validate,
  authController.register,
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email/phone + password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier: { type: string, description: "Email or phone" }
 *               password:   { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 user:    { $ref: '#/components/schemas/User' }
 *                 tokens:  { $ref: '#/components/schemas/AuthTokens' }
 *       401: { description: Invalid credentials }
 */
router.post('/login',
  authLimiter,
  [
    body('identifier').notEmpty().withMessage('Email or phone is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login,
);

/**
 * @swagger
 * /api/auth/otp/send:
 *   post:
 *     tags: [Auth]
 *     summary: Send OTP to phone number
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, purpose]
 *             properties:
 *               phone:   { type: string, example: "+447911123456" }
 *               purpose: { type: string, enum: [verify, reset, login] }
 *     responses:
 *       200: { description: OTP sent }
 *       429: { description: Too many OTP requests }
 */
router.post('/otp/send',
  otpLimiter,
  [
    body('phone').isString().notEmpty().withMessage('Valid phone number required'),
    body('purpose').isIn(['verify', 'reset', 'login']).withMessage('Invalid purpose'),
  ],
  validate,
  authController.sendOtp,
);

/**
 * @swagger
 * /api/auth/otp/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP code
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, otp, purpose]
 *             properties:
 *               phone:   { type: string }
 *               otp:     { type: string, minLength: 6, maxLength: 6 }
 *               purpose: { type: string, enum: [verify, reset, login] }
 *     responses:
 *       200: { description: OTP verified }
 *       410: { description: OTP expired }
 *       422: { description: OTP invalid }
 */
router.post('/otp/verify',
  [
    body('phone').isString().notEmpty().withMessage('Valid phone required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('6-digit OTP required'),
    body('purpose').isIn(['verify', 'reset', 'login']).withMessage('Invalid purpose'),
  ],
  validate,
  authController.verifyOtp,
);

/**
 * @swagger
 * /api/auth/password/reset:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password after OTP verified
 *     security: []
 */
router.post('/password/reset',
  [
    body('phone').isString().notEmpty().withMessage('Valid phone required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 chars'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP required'),
  ],
  validate,
  authController.resetPassword,
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh token
 *     security: []
 */
router.post('/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token required')],
  validate,
  authController.refreshToken,
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout — invalidate refresh token
 */
router.post('/logout',
  verifyToken,
  authController.logout,
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 */
router.get('/me',
  verifyToken,
  authController.getMe,
);

// ─────────────────────────────────────────────────────────────────────────────
//  SOCIAL OAUTH — Google
// ─────────────────────────────────────────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/oauth/failure' }),
  authController.oauthCallback,
);

// ─────────────────────────────────────────────────────────────────────────────
//  SOCIAL OAUTH — Facebook
// ─────────────────────────────────────────────────────────────────────────────
router.get('/facebook',
  passport.authenticate('facebook', { scope: ['email'], session: false }),
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/api/auth/oauth/failure' }),
  authController.oauthCallback,
);

// OAuth failure
router.get('/oauth/failure', (_req, res) => {
  res.redirect(`${process.env.CLIENT_URLS?.split(',')[0]}/auth/login?error=oauth_failed`);
});

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN AUTH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/auth/admin/login:
 *   post:
 *     tags: [Admin Auth]
 *     summary: Admin login (no social, stricter rate limit)
 *     security: []
 */
router.post('/admin/login',
  adminAuthLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  authController.adminLogin,
);

/**
 * @swagger
 * /api/auth/restaurant/login:
 *   post:
 *     tags: [Restaurant Auth]
 *     summary: Restaurant owner/staff login
 *     security: []
 */
router.post('/restaurant/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  authController.restaurantLogin,
);


// ─── Admin: self-service profile & password ────────────────────────────────────
router.put('/admin/profile',
  verifyToken,
  [body('name').optional().trim().notEmpty(), body('email').optional().isEmail().normalizeEmail()],
  validate,
  authController.updateAdminProfile,
);

router.put('/admin/password',
  verifyToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 8 }).withMessage('At least 8 characters'),
  ],
  validate,
  authController.changeAdminPassword,
);

export default router;
