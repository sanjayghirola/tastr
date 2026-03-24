import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES, CLOUDINARY_FOLDERS } from '@tastr/shared';
import * as ctrl from '../controllers/drivers.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ─── Multer for driver document uploads (multi-field) ─────────────────────────
const memStorage = multer.memoryStorage();
const driverDocsUpload = multer({
  storage: memStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
}).fields([
  { name: 'profilePhoto',      maxCount: 1 },
  { name: 'license',           maxCount: 1 },
  { name: 'licence',           maxCount: 1 },  // alternate spelling
  { name: 'vehicleInsurance',  maxCount: 1 },
  { name: 'insurance',         maxCount: 1 },  // legacy field name
  { name: 'foodInsurance',     maxCount: 1 },
  { name: 'rightToWork',       maxCount: 1 },
  { name: 'vehiclePic',        maxCount: 1 },
  { name: 'id',                maxCount: 1 },  // legacy: ID proof
  { name: 'regCert',           maxCount: 1 },  // legacy: registration certificate
  { name: 'pollutionCert',     maxCount: 1 },  // legacy
  { name: 'signature',         maxCount: 1 },  // legacy
  { name: 'panCard',           maxCount: 1 },  // legacy
  { name: 'passbook',          maxCount: 1 },  // legacy
]);

// ─── Cloudinary upload post-processor ─────────────────────────────────────────
async function uploadToCloudinary(req, res, next) {
  try {
    const cloudinaryModule = await import('cloudinary');
    const cloudinary = cloudinaryModule.default?.v2 || cloudinaryModule.v2;

    if (!cloudinary.config().cloud_name || cloudinary.config().cloud_name === 'your_cloud_name') {
      // Cloudinary not configured — skip, files stay as memory buffers
      // Store filesObj for controller
      req._filesObj = req.files || {};
      return next();
    }

    if (req.files && typeof req.files === 'object') {
      for (const [fieldName, fileArray] of Object.entries(req.files)) {
        for (const file of fileArray) {
          if (!file.buffer) continue;
          try {
            const result = await new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                { folder: CLOUDINARY_FOLDERS.DRIVERS, resource_type: 'auto' },
                (err, result) => err ? reject(err) : resolve(result),
              );
              stream.end(file.buffer);
            });
            file.path = result.secure_url;
            file.filename = result.public_id;
          } catch (err) {
            logger.warn(`Cloudinary upload failed for ${fieldName}: ${err.message}`);
          }
        }
      }
    }

    req._filesObj = req.files || {};
    next();
  } catch (err) {
    logger.warn('Cloudinary processing error (non-fatal):', err.message);
    req._filesObj = req.files || {};
    next();
  }
}

// Combine multer + cloudinary into single middleware
function handleDriverDocUpload(req, res, next) {
  driverDocsUpload(req, res, (err) => {
    if (err) {
      logger.warn('Driver doc multer error:', err.message);
      req.files = req.files || {};
    }
    uploadToCloudinary(req, res, next);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC — driver registration (no auth)
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body().custom((_, { req }) => {
      if (!req.body.email && !req.body.phone) throw new Error('Email or phone is required');
      return true;
    }),
  ],
  validate,
  ctrl.registerDriver,
);

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTHENTICATED — driver self-service (any authenticated user with DRIVER role)
// ═══════════════════════════════════════════════════════════════════════════════

// Document submission — used during profile setup & resubmission
router.post('/docs',
  verifyToken,
  handleDriverDocUpload,
  ctrl.submitDriverDocs,
);

// Get own driver profile & approval status
router.get('/me',
  verifyToken,
  ctrl.getDriverProfile,
);

// Update driver profile
router.put('/me',
  verifyToken,
  ctrl.updateDriverProfile,
);

// Toggle online/offline
router.put('/me/online',
  verifyToken,
  [body('isOnline').isBoolean()],
  validate,
  ctrl.toggleOnline,
);

// Resubmit documents after rejection
router.post('/me/resubmit',
  verifyToken,
  handleDriverDocUpload,
  ctrl.resubmitDriverDocs,
);

export default router;
