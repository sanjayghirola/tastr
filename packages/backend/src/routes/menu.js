import { Router } from 'express';
import { body, param } from 'express-validator';
import { uploadMenuItem } from '../config/cloudinary.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '@tastr/shared';
import * as ctrl from '../controllers/menu.js';

const router = Router();

// ─── Admin/public menu fetch by restaurantId — no role restriction ─────────────
// Used by admin panel: GET /api/menu?restaurantId=xxx
// Must be BEFORE the router.use(verifyToken, requireRole(...)) below
router.get('/', verifyToken, ctrl.getMenuByRestaurantId);

// All routes below this line require restaurant owner / staff role
router.use(verifyToken, requireRole(ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF));

// ─── Categories ───────────────────────────────────────────────────────────────
router.get('/categories',                                    ctrl.getCategories);
router.post('/categories',
  [body('name').notEmpty()], validate,                       ctrl.createCategory);
router.put('/categories/:id',
  [param('id').isMongoId(), body('name').optional().notEmpty()], validate, ctrl.updateCategory);
router.delete('/categories/:id',
  [param('id').isMongoId()], validate,                       ctrl.deleteCategory);
router.patch('/categories/reorder',
  [body('order').isArray()], validate,                       ctrl.reorderCategories);

// ─── Items ────────────────────────────────────────────────────────────────────
router.post('/items',
  uploadMenuItem,
  [
    body('name').notEmpty(),
    body('price').isInt({ min: 1 }),
    body('categoryId').isMongoId(),
  ],
  validate,
  ctrl.createItem,
);

router.get('/items/:id',  [param('id').isMongoId()], validate, ctrl.getItem);

router.put('/items/:id',
  uploadMenuItem,
  [param('id').isMongoId()],
  validate,
  ctrl.updateItem,
);

router.delete('/items/:id',
  [param('id').isMongoId()], validate,                       ctrl.deleteItem);

router.patch('/items/:id/availability',
  [param('id').isMongoId(), body('isAvailable').isBoolean()], validate, ctrl.toggleAvailability);

router.patch('/items/bulk-availability',
  [body('ids').isArray(), body('isAvailable').isBoolean()], validate, ctrl.bulkToggleAvailability);

// ─── Toppings ─────────────────────────────────────────────────────────────────
router.post('/items/:id/toppings',
  [param('id').isMongoId(), body('name').notEmpty(), body('options').isArray()], validate, ctrl.addToppingGroup);

router.put('/items/:id/toppings/:toppingId',
  [param('id').isMongoId(), param('toppingId').isMongoId()], validate, ctrl.updateToppingGroup);

router.delete('/items/:id/toppings/:toppingId',
  [param('id').isMongoId(), param('toppingId').isMongoId()], validate, ctrl.deleteToppingGroup);

export default router;
