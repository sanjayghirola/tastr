import cloudinaryModule from 'cloudinary';
const cloudinary = cloudinaryModule.v2;
import multer from 'multer';
import { logger } from '../utils/logger.js';
import { CLOUDINARY_FOLDERS } from '@tastr/shared';

let cloudinaryReady = false;

export function initCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
    logger.warn('⚠️  Cloudinary not configured — uploads use memory fallback (dev mode)');
    return;
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key:    CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure:     true,
  });
  cloudinaryReady = true;
  logger.info('✅  Cloudinary configured');
}

// ─── Upload buffer to Cloudinary via stream ──────────────────────────────────
function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

// ─── Post-multer middleware: upload parsed files to Cloudinary ────────────────
function cloudinaryUpload(folder, allowedFormats = [], transformation = []) {
  return async (req, res, next) => {
    if (!cloudinaryReady) return next();

    try {
      // Handle single file (req.file)
      if (req.file && req.file.buffer) {
        const result = await uploadBufferToCloudinary(req.file.buffer, {
          folder,
          allowed_formats: allowedFormats.length ? allowedFormats : undefined,
          transformation:  transformation.length ? transformation : undefined,
          resource_type:   'auto',
        });
        req.file.path     = result.secure_url;
        req.file.filename = result.public_id;
        logger.info(`Cloudinary upload OK: ${result.public_id}`);
      }

      // Handle multiple files (req.files as array)
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          if (!file.buffer) continue;
          const result = await uploadBufferToCloudinary(file.buffer, {
            folder,
            allowed_formats: allowedFormats.length ? allowedFormats : undefined,
            transformation:  transformation.length ? transformation : undefined,
            resource_type:   'auto',
          });
          file.path     = result.secure_url;
          file.filename = result.public_id;
        }
      }

      // Handle files object from .fields() — req.files is { fieldname: [File] }
      if (req.files && !Array.isArray(req.files) && typeof req.files === 'object') {
        for (const fieldFiles of Object.values(req.files)) {
          for (const file of fieldFiles) {
            if (!file.buffer) continue;
            const result = await uploadBufferToCloudinary(file.buffer, {
              folder,
              allowed_formats: allowedFormats.length ? allowedFormats : undefined,
              resource_type:   'auto',
            });
            file.path     = result.secure_url;
            file.filename = result.public_id;
          }
        }
      }
    } catch (err) {
      logger.warn('Cloudinary upload failed (non-fatal):', err.message);
      // Continue without Cloudinary — files stay as memory buffers
    }

    next();
  };
}

// ─── Multer with memoryStorage (always) ──────────────────────────────────────
const memStorage = multer.memoryStorage();

function createUploadMiddleware(field, maxCount, folder, allowedFormats, transformation = []) {
  const upload = multer({ storage: memStorage, limits: { fileSize: 10 * 1024 * 1024 } });
  const multerHandler = maxCount > 1 ? upload.array(field, maxCount) : upload.single(field);
  const cloudinaryHandler = cloudinaryUpload(folder, allowedFormats, transformation);

  return (req, res, next) => {
    multerHandler(req, res, (err) => {
      if (err) {
        logger.warn('Multer parse error:', err.message);
        req.files = req.files || [];
        req.file  = req.file  || null;
        return next();
      }
      // After multer parses, upload to Cloudinary
      cloudinaryHandler(req, res, next);
    });
  };
}

// ─── Named export middlewares ────────────────────────────────────────────────
export const uploadAvatar           = createUploadMiddleware('profilePhoto', 1, CLOUDINARY_FOLDERS.USERS,       ['jpg','jpeg','png','webp'], [{ width:200,  height:200,  crop:'fill', gravity:'face' }]);
export const uploadRestaurantCovers = createUploadMiddleware('coverPhotos',  5, CLOUDINARY_FOLDERS.RESTAURANTS, ['jpg','jpeg','png','webp'], [{ width:1200, height:675,  crop:'fill' }]);
export const uploadRestaurantLogo   = createUploadMiddleware('logo',         1, CLOUDINARY_FOLDERS.RESTAURANTS, ['jpg','jpeg','png','webp'], [{ width:400,  height:400,  crop:'fill' }]);
export const uploadMenuItem         = createUploadMiddleware('photo',        1, CLOUDINARY_FOLDERS.MENU,        ['jpg','jpeg','png','webp'], [{ width:600,  height:600,  crop:'fill' }]);
export const uploadDriverDoc        = createUploadMiddleware('document',     1, CLOUDINARY_FOLDERS.DRIVERS,     ['jpg','jpeg','png','pdf']);
export const uploadStudentDoc       = createUploadMiddleware('document',     1, CLOUDINARY_FOLDERS.STUDENT_DOCS,['jpg','jpeg','png','pdf']);
export const uploadBanner           = createUploadMiddleware('image',        1, CLOUDINARY_FOLDERS.BANNERS,     ['jpg','jpeg','png','webp'], [{ width:1920, height:600, crop:'fill' }]);
export const uploadComplaintEvidence= createUploadMiddleware('evidence',     5, CLOUDINARY_FOLDERS.COMPLAINTS,  ['jpg','jpeg','png','pdf']);

// ─── Multi-field upload for restaurant registration ──────────────────────────
export const uploadRestaurantDocs = (req, res, next) => {
  const upload = multer({ storage: memStorage, limits: { fileSize: 10 * 1024 * 1024 } });
  const RESTAURANT_DOC_FIELDS = [
    { name: 'coverPhotos',        maxCount: 5 },
    { name: 'logo',               maxCount: 1 },
    { name: 'foodBusinessLicense', maxCount: 1 },
    { name: 'fhrsDoc',            maxCount: 1 },
    { name: 'addressProof',       maxCount: 1 },
    { name: 'bankProof',          maxCount: 1 },
    { name: 'ownerIdProof',       maxCount: 1 },
    { name: 'ownerAddressDoc',    maxCount: 1 },
    { name: 'publicLiabilityIns', maxCount: 1 },
    { name: 'companyRegCert',     maxCount: 1 },
    { name: 'vatRegCert',         maxCount: 1 },
    { name: 'fireSafetyCert',     maxCount: 1 },
    { name: 'allergyForm',        maxCount: 1 },
    { name: 'foodHandlerCert',    maxCount: 1 },
    { name: 'alcoholLicense',     maxCount: 1 },
  ];
  upload.fields(RESTAURANT_DOC_FIELDS)(req, res, (err) => {
    if (err) {
      logger.warn('Restaurant doc upload error:', err.message);
      req.files = req.files || {};
    }
    // Upload to Cloudinary
    const handler = cloudinaryUpload(CLOUDINARY_FOLDERS.RESTAURANTS, ['jpg','jpeg','png','webp','pdf']);
    handler(req, res, () => {
      // Flatten req.files from object to array for controller compat
      if (req.files && !Array.isArray(req.files)) {
        req._filesObj = req.files;
        req.files     = Object.values(req.files).flat();
      }
      next();
    });
  });
};

// ─── Single doc upload ───────────────────────────────────────────────────────
export const uploadSingleDoc = (req, res, next) => {
  const upload = multer({ storage: memStorage, limits: { fileSize: 20 * 1024 * 1024 } });
  upload.single('document')(req, res, (err) => {
    if (err) {
      logger.warn('Single doc upload error:', err.message);
      req.file = null;
      return next();
    }
    const handler = cloudinaryUpload(CLOUDINARY_FOLDERS.RESTAURANTS, ['jpg','jpeg','png','webp','pdf']);
    handler(req, res, next);
  });
};

// ─── Delete asset ────────────────────────────────────────────────────────────
export async function deleteCloudinaryAsset(publicId) {
  if (!cloudinaryReady || !publicId) return;
  try { await cloudinary.uploader.destroy(publicId); }
  catch (err) { logger.warn(`Cloudinary delete failed ${publicId}: ${err.message}`); }
}

// ─── Legacy exports (compat) ─────────────────────────────────────────────────
export const avatarStorage            = memStorage;
export const restaurantCoverStorage   = memStorage;
export const menuItemStorage          = memStorage;
export const driverDocStorage         = memStorage;
export const studentDocStorage        = memStorage;
export const bannerStorage            = memStorage;
export const complaintEvidenceStorage = memStorage;
export const getRestaurantCoverUpload = () => ({ array: (f, n) => uploadRestaurantCovers, single: (f) => uploadRestaurantLogo });
export const getAvatarUpload          = () => ({ single: (f) => uploadAvatar });
export const getMenuItemUpload        = () => ({ single: (f) => uploadMenuItem });
export const uploadBannerUpload       = uploadBanner;
