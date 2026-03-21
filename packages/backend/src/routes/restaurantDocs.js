import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { ROLES } from '@tastr/shared';
import { uploadSingleDoc } from '../config/cloudinary.js';
import {
  adminReviewDocument, adminRequestReupload, adminListAllRestaurants,
  adminGetRestaurantDetail, adminSetRestaurantStatus,
  restaurantReuploadDocument, restaurantUploadDocument, getReuploadStatus,
} from '../controllers/restaurantDocs.js';

const adminAuth = [verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN)];

const router = Router();

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get('/admin/restaurants/all',                     ...adminAuth, adminListAllRestaurants);
router.get('/admin/restaurants/:id/detail',              ...adminAuth, adminGetRestaurantDetail);
router.patch('/admin/restaurants/:id/status',            ...adminAuth, adminSetRestaurantStatus);
router.patch('/admin/restaurants/:id/documents/:docKey', ...adminAuth, adminReviewDocument);
router.post('/admin/restaurants/:id/request-reupload',   ...adminAuth, adminRequestReupload);

// ─── Restaurant portal routes ─────────────────────────────────────────────────
router.post('/restaurants/documents/upload',   verifyToken, uploadSingleDoc, restaurantUploadDocument);
router.post('/restaurants/documents/reupload', uploadSingleDoc, restaurantReuploadDocument);
router.get('/restaurants/reupload-status',     getReuploadStatus);

export default router;
