import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { ROLES } from '@tastr/shared';
import { uploadStudentDoc } from '../config/cloudinary.js';
import { submitVerification, getMyStatus, adminListVerifications, reviewVerification, sendStudentEmailOtp, verifyStudentEmailOtp } from '../controllers/studentVerification.js';

const router = Router();

// Customer routes
router.post('/send-otp',   verifyToken, sendStudentEmailOtp);
router.post('/verify-otp', verifyToken, verifyStudentEmailOtp);
router.post('/submit',     verifyToken, uploadStudentDoc, submitVerification);
router.get('/my-status',   verifyToken, getMyStatus);

// Admin routes
router.get('/admin/queue',           verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminListVerifications);
router.patch('/admin/:id/review',    verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), reviewVerification);

export default router;
