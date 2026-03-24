import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { ROLES } from '@tastr/shared';
import { uploadMenuItem } from '../config/cloudinary.js';
import {
  listProducts, getProduct, checkout, getPaymentMethods,
  confirmStripePayment, verifyRazorpayPayment,
  myOrders, myOrderDetail,
  adminListProducts, adminCreateProduct, adminUpdateProduct,
  adminDeleteProduct, adminToggleProduct, adminListOrders, adminUpdateOrderStatus,
} from '../controllers/driverStore.js';

const router = Router();

// Driver-facing
router.get('/products',            listProducts);
router.get('/products/:id',        getProduct);
router.get('/payment-methods',     verifyToken, getPaymentMethods);
router.post('/checkout',           verifyToken, checkout);
router.post('/confirm-stripe',     verifyToken, confirmStripePayment);
router.post('/verify-razorpay',    verifyToken, verifyRazorpayPayment);
router.get('/my-orders',           verifyToken, myOrders);
router.get('/my-orders/:id',       verifyToken, myOrderDetail);

// Admin
router.get('/admin/products',              verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminListProducts);
router.post('/admin/products',             verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), uploadMenuItem, adminCreateProduct);
router.put('/admin/products/:id',          verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), uploadMenuItem, adminUpdateProduct);
router.delete('/admin/products/:id',       verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminDeleteProduct);
router.patch('/admin/products/:id/toggle', verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminToggleProduct);
router.get('/admin/orders',                verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminListOrders);
router.patch('/admin/orders/:id/status',   verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminUpdateOrderStatus);

export default router;