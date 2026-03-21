import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as rc from '../controllers/reviews.js';

const router = express.Router();

// POST /api/reviews
router.post('/',
  authenticate,
  [
    body('orderId').isMongoId(),
    body('targetId').isMongoId(),
    body('targetType').isIn(['restaurant', 'driver', 'app']),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().isString().isLength({ max: 1000 }),
    body('photos').optional().isArray(),
  ],
  validate, rc.submitReview,
);

// POST /api/reviews/order/:orderId  — submit all ratings for an order at once
router.post('/order/:orderId',
  authenticate,
  [param('orderId').isMongoId()],
  validate, rc.submitOrderReviews,
);

// GET /api/reviews/restaurant/:id
router.get('/restaurant/:id',
  [param('id').isMongoId(), query('page').optional().isInt({ min: 1 })],
  validate, rc.getRestaurantReviews,
);

// GET /api/reviews/driver/:id
router.get('/driver/:id',
  [param('id').isMongoId(), query('page').optional().isInt({ min: 1 })],
  validate, rc.getDriverReviews,
);

export default router;
