import { Router } from 'express';
import { body, param } from 'express-validator';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/cart.js';

const router = Router();
router.use(verifyToken);

// GET /api/cart
router.get('/', ctrl.getCart);

// POST /api/cart/items
router.post('/items',
  [
    body('menuItemId').isMongoId(),
    body('quantity').isInt({ min: 1, max: 99 }),
    body('selectedToppings').optional().isArray(),
    body('note').optional().isString().isLength({ max: 200 }),
  ],
  validate, ctrl.addItem,
);

// PATCH /api/cart/items/:itemId
router.patch('/items/:itemId',
  [
    body('quantity').optional().isInt({ min: 0, max: 99 }),
    body('selectedToppings').optional().isArray(),
    body('note').optional().isString().isLength({ max: 200 }),
  ],
  validate, ctrl.updateItem,
);

// DELETE /api/cart/items/:itemId
router.delete('/items/:itemId', ctrl.removeItem);

// DELETE /api/cart
router.delete('/', ctrl.clearCart);

// POST /api/cart/promo
router.post('/promo',
  [body('code').notEmpty().trim().toUpperCase()],
  validate, ctrl.applyPromo,
);

// DELETE /api/cart/promo
router.delete('/promo', ctrl.removePromo);

// PATCH /api/cart/extras  (tip, donation, note, disposables, isGift)
router.patch('/extras',
  [
    body('tip').optional().isInt({ min: 0 }),
    body('donation').optional().isInt({ min: 0 }),
    body('customerNote').optional().isString().isLength({ max: 500 }),
    body('disposableEssentials').optional().isBoolean(),
    body('isGift').optional().isBoolean(),
    body('giftRecipient').optional().isObject(),
  ],
  validate, ctrl.updateExtras,
);

export default router;
