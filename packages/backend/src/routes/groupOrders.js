import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as gc from '../controllers/groupOrders.js';

const router = express.Router();

// GET  /api/group-orders/my
router.get('/my', authenticate, gc.myGroups);

// POST /api/group-orders
router.post('/',
  authenticate,
  [
    body('name').notEmpty().trim().isLength({ max: 80 }),
    body('restaurantId').isMongoId(),
    body('deliveryAddress').optional().isObject(),
  ],
  validate, gc.createGroup,
);

// GET  /api/group-orders/:id
router.get('/:id', authenticate, [param('id').isMongoId()], validate, gc.getGroup);

// POST /api/group-orders/:id/join
router.post('/:id/join',
  authenticate,
  [param('id').isMongoId(), body('inviteCode').notEmpty().trim()],
  validate, gc.joinGroup,
);

// POST /api/group-orders/:id/items
router.post('/:id/items',
  authenticate,
  [
    param('id').isMongoId(),
    body('menuItemId').isMongoId(),
    body('name').notEmpty(),
    body('price').isInt({ min: 0 }),
    body('quantity').isInt({ min: 1 }),
    body('subtotal').isInt({ min: 0 }),
    body('selectedToppings').optional().isArray(),
  ],
  validate, gc.addItem,
);

// PUT  /api/group-orders/:id/items/:itemId
router.put('/:id/items/:itemId',
  authenticate,
  [param('id').isMongoId(), param('itemId').isMongoId()],
  validate, gc.updateItem,
);

// DELETE /api/group-orders/:id/items/:itemId
router.delete('/:id/items/:itemId',
  authenticate,
  [param('id').isMongoId(), param('itemId').isMongoId()],
  validate, gc.removeItem,
);

// GET  /api/group-orders/:id/summary
router.get('/:id/summary', authenticate, [param('id').isMongoId()], validate, gc.getSummary);

// PUT  /api/group-orders/:id/address  (host sets delivery address)
router.put('/:id/address',
  authenticate,
  [param('id').isMongoId(), body('line1').notEmpty()],
  validate, gc.setDeliveryAddress,
);

// POST /api/group-orders/:id/checkout  (host only)
router.post('/:id/checkout',
  authenticate,
  [param('id').isMongoId(), body('paymentMethod').notEmpty()],
  validate, gc.checkout,
);

// POST /api/group-orders/:id/repeat
router.post('/:id/repeat', authenticate, [param('id').isMongoId()], validate, gc.repeatGroup);

export default router;
