import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '@tastr/shared';
import * as cc from '../controllers/complaints.js';

const router = express.Router();

// POST /api/complaints
router.post('/',
  authenticate,
  [
    body('orderId').isMongoId(),
    body('type').isIn(['missing_item', 'wrong_item', 'quality', 'late_delivery', 'damaged', 'driver_behaviour', 'other']),
    body('description').notEmpty().isLength({ max: 2000 }),
    body('evidence').optional().isArray(),
  ],
  validate, cc.submitComplaint,
);

// GET /api/complaints/mine
router.get('/mine', authenticate, cc.myComplaints);

// GET /api/complaints/:id
router.get('/:id', authenticate, [param('id').isMongoId()], validate, cc.getComplaint);

// PATCH /api/complaints/:id/respond  (restaurant)
router.patch('/:id/respond',
  authenticate,
  requireRole(ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF),
  [
    param('id').isMongoId(),
    body('restaurantResponse').notEmpty().isLength({ max: 1000 }),
    body('restaurantAction').isIn(['accept_refund', 'dispute']),
  ],
  validate, cc.restaurantRespond,
);

// PATCH /api/complaints/:id/resolve  (admin)
router.patch('/:id/resolve',
  authenticate,
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN),
  [
    param('id').isMongoId(),
    body('resolution').isIn(['full_refund', 'partial_refund', 'declined']),
    body('refundAmount').optional().isInt({ min: 0 }),
    body('adminNote').optional().isString().isLength({ max: 1000 }),
  ],
  validate, cc.adminResolve,
);

// GET /api/complaints (admin — all)
router.get('/', authenticate, cc.listComplaints);

export default router;
