import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { ROLES } from '@tastr/shared';
import { uploadMenuItem } from '../config/cloudinary.js';
import {
  listProducts, getProduct, checkout,
  adminListProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminToggleProduct, adminListOrders
} from '../controllers/driverStore.js';

const router = Router();

// Public driver-facing routes
router.get('/products',          listProducts);
router.get('/products/:id',      getProduct);
router.post('/checkout',         verifyToken, checkout);

// Admin routes
router.get('/admin/products',            verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminListProducts);
router.post('/admin/products',           verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), uploadMenuItem, adminCreateProduct);
router.put('/admin/products/:id',        verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), uploadMenuItem, adminUpdateProduct);
router.delete('/admin/products/:id',     verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminDeleteProduct);
router.patch('/admin/products/:id/toggle', verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminToggleProduct);
router.get('/admin/orders',              verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminListOrders);

export default router;
