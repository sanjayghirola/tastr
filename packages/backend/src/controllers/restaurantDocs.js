import Restaurant, { REQUIRED_DOCS } from '../models/Restaurant.js';
import { ENTITY_STATUS, DOC_STATUS } from '@tastr/shared';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import {
  sendDocumentReuploadRequest,
  sendDocumentResubmitted,
} from '../services/email.js';

// ─── Helper: compute overall restaurant approval state ────────────────────────
export function computeRestaurantDocStatus(restaurant) {
  const requiredDocs = REQUIRED_DOCS.filter(d => d.required);
  for (const rd of requiredDocs) {
    const doc = restaurant.documents?.find(d => d.key === rd.key);
    if (!doc || doc.status !== DOC_STATUS.APPROVED) return false;
  }
  return true;
}

// ─── Admin: PATCH /api/admin/restaurants/:id/documents/:docKey ────────────────
export async function adminReviewDocument(req, res, next) {
  try {
    const { id, docKey } = req.params;
    const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'
    const adminId = req.user?._id;

    const restaurant = await Restaurant.findById(id).populate('ownerId', 'name email');
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const docIdx = restaurant.documents.findIndex(d => d.key === docKey);
    if (docIdx === -1) return res.status(404).json({ success: false, message: 'Document not found' });

    const doc = restaurant.documents[docIdx];

    if (action === 'approve') {
      doc.status = DOC_STATUS.APPROVED;
      doc.rejectionReason = null;
      doc.reviewedAt = new Date();
      doc.reviewedBy = adminId;
      doc.reuploadRequested = false;
      doc.reuploadToken = null;
    } else if (action === 'reject') {
      if (!rejectionReason?.trim()) return res.status(400).json({ success: false, message: 'Rejection reason required' });
      doc.status = DOC_STATUS.REJECTED;
      doc.rejectionReason = rejectionReason;
      doc.reviewedAt = new Date();
      doc.reviewedBy = adminId;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    // Check if all required docs are now approved → auto-activate
    const allApproved = computeRestaurantDocStatus(restaurant);
    if (allApproved && restaurant.status !== ENTITY_STATUS.ACTIVE) {
      restaurant.status = ENTITY_STATUS.ACTIVE;
      restaurant.approvedBy = adminId;
      restaurant.approvedAt = new Date();
      logger.info(`Restaurant ${id} auto-activated: all required docs approved`);
    }

    await restaurant.save();
    res.json({ success: true, document: doc, restaurantStatus: restaurant.status });
  } catch (err) { next(err); }
}

// ─── Admin: POST /api/admin/restaurants/:id/request-reupload ─────────────────
export async function adminRequestReupload(req, res, next) {
  try {
    const { id } = req.params;
    const { docKeys } = req.body; // array of doc keys to request reupload

    if (!docKeys?.length) return res.status(400).json({ success: false, message: 'docKeys required' });

    const restaurant = await Restaurant.findById(id).populate('ownerId', 'name email');
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const token = crypto.randomBytes(32).toString('hex');

    for (const key of docKeys) {
      let doc = restaurant.documents.find(d => d.key === key);

      // If doc doesn't exist in array yet (not yet uploaded), create a placeholder so token can be saved
      if (!doc) {
        const docDef = REQUIRED_DOCS.find(d => d.key === key);
        if (!docDef) continue;
        restaurant.documents.push({
          key,
          label:    docDef.label,
          required: docDef.required,
          status:   DOC_STATUS.REJECTED,
          url:      '',
        });
        doc = restaurant.documents[restaurant.documents.length - 1];
      }

      // Only request reupload for rejected docs
      if (doc.status === DOC_STATUS.REJECTED || !doc.url) {
        doc.reuploadRequested = true;
        doc.reuploadToken     = token;
      }
    }

    // Set restaurant to DOCS_REQUIRED so it shows correct state on pending page
    restaurant.status = ENTITY_STATUS.DOCS_REQUIRED;
    await restaurant.save();

    const reuploadLink = `${process.env.RESTAURANT_WEB_URL || 'http://localhost:3001'}/documents/reupload?token=${token}&restaurantId=${id}`;
    logger.info(`Reupload link for restaurant ${id}: ${reuploadLink}`);

    // Send email to restaurant owner
    const owner = restaurant.ownerId;
    const ownerEmail = owner?.email || restaurant.email;
    const ownerName  = owner?.name  || restaurant.name;
    if (ownerEmail) {
      const rejectedDocLabels = docKeys.map(key => {
        const doc = restaurant.documents.find(d => d.key === key);
        return { label: doc?.label || key, rejectionReason: doc?.rejectionReason || '' };
      });
      sendDocumentReuploadRequest({
        to:           ownerEmail,
        restaurantName: restaurant.name,
        ownerName,
        rejectedDocs: rejectedDocLabels,
        reuploadLink,
      }).catch(err => logger.warn(`Reupload email failed: ${err.message}`));
    }

    res.json({ success: true, reuploadLink, message: 'Reupload request sent' });
  } catch (err) { next(err); }
}

// ─── Admin: GET /api/admin/restaurants (all, with filters) ───────────────────
export async function adminListAllRestaurants(req, res, next) {
  try {
    const { page = 1, limit = 20, status, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ];

    const [restaurants, total] = await Promise.all([
      Restaurant.find(filter)
        .populate('ownerId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Restaurant.countDocuments(filter),
    ]);

    res.json({ success: true, restaurants, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
}

// ─── Admin: GET /api/admin/restaurants/:id (full detail) ─────────────────────
export async function adminGetRestaurantDetail(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('ownerId', 'name email phone dateOfBirth')
      .populate('documents.reviewedBy', 'name email')
      .lean();
    if (!restaurant) return res.status(404).json({ success: false, message: 'Not found' });

    // Ensure all doc slots exist (for display)
    const docMap = {};
    for (const d of (restaurant.documents || [])) docMap[d.key] = d;
    restaurant.documentSlots = REQUIRED_DOCS.map(rd => docMap[rd.key] || { ...rd, status: DOC_STATUS.NOT_UPLOADED, url: '' });

    res.json({ success: true, restaurant });
  } catch (err) { next(err); }
}

// ─── Admin: PATCH /api/admin/restaurants/:id/status ──────────────────────────
export async function adminSetRestaurantStatus(req, res, next) {
  try {
    const { status, reason } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Not found' });

    restaurant.status = status;
    if (status === ENTITY_STATUS.REJECTED) restaurant.rejectionReason = reason;
    else if (status === ENTITY_STATUS.ACTIVE) { restaurant.approvedBy = req.user._id; restaurant.approvedAt = new Date(); }
    await restaurant.save();
    res.json({ success: true, restaurant });
  } catch (err) { next(err); }
}

// ─── Restaurant: POST /api/restaurants/documents/reupload ────────────────────
export async function restaurantReuploadDocument(req, res, next) {
  try {
    const { restaurantId, token, docKey } = req.body;

    if (!token || !restaurantId || !docKey) {
      return res.status(400).json({ success: false, message: 'restaurantId, token and docKey are required' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Not found' });

    // Match by token + key — reuploadRequested may already be false if submitted before
    const doc = restaurant.documents.find(d => d.key === docKey && d.reuploadToken === token);
    if (!doc) return res.status(403).json({ success: false, message: 'Invalid reupload token or document key' });

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    // Cloudinary gives req.file.path (URL) + req.file.filename (publicId)
    // memoryStorage (dev) gives req.file.buffer — convert to base64 data URI so admin can still preview
    let fileUrl = req.file.path || '';
    let publicId = req.file.filename || '';
    if (!fileUrl && req.file.buffer) {
      const mime = req.file.mimetype || 'image/jpeg';
      fileUrl = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
      publicId = '';
    }

    doc.url           = fileUrl;
    doc.publicId      = publicId;
    doc.filename      = req.file.originalname || '';
    doc.fileSizeBytes = req.file.size;
    doc.uploadedAt    = new Date();
    doc.status        = DOC_STATUS.PENDING;
    doc.rejectionReason   = null;
    doc.reuploadRequested = false;
    // Keep reuploadToken so multiple docs can be reuploaded in one session

    // If restaurant was DOCS_REQUIRED, move back to PENDING for re-review
    if (restaurant.status === ENTITY_STATUS.DOCS_REQUIRED) {
      restaurant.status = ENTITY_STATUS.PENDING;
    }

    await restaurant.save();

    // Notify admin
    sendDocumentResubmitted({
      restaurantName: restaurant.name,
      docLabel: doc.label || docKey,
    }).catch(() => {});

    res.json({ success: true, document: doc });
  } catch (err) { next(err); }
}

// ─── Restaurant: POST /api/restaurants/documents/upload ──────────────────────
// Used during initial registration to upload docs one by one
export async function restaurantUploadDocument(req, res, next) {
  try {
    const { docKey } = req.body;
    const userId = req.user._id;

    const restaurant = await Restaurant.findOne({ ownerId: userId });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const docDef = REQUIRED_DOCS.find(d => d.key === docKey);
    if (!docDef) return res.status(400).json({ success: false, message: 'Invalid document type' });

    let doc = restaurant.documents.find(d => d.key === docKey);
    if (!doc) {
      restaurant.documents.push({ key: docKey, label: docDef.label, required: docDef.required });
      doc = restaurant.documents[restaurant.documents.length - 1];
    }

    let fileUrl = req.file.path || '';
    let publicId = req.file.filename || '';
    if (!fileUrl && req.file.buffer) {
      const mime = req.file.mimetype || 'image/jpeg';
      fileUrl = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
      publicId = '';
    }

    doc.url           = fileUrl;
    doc.publicId      = publicId;
    doc.filename      = req.file.originalname || '';
    doc.fileSizeBytes = req.file.size;
    doc.uploadedAt    = new Date();
    doc.status        = DOC_STATUS.PENDING;

    await restaurant.save();
    res.json({ success: true, document: doc });
  } catch (err) { next(err); }
}

// ─── GET /api/restaurants/reupload-status?token=&restaurantId= ──────────────
export async function getReuploadStatus(req, res, next) {
  try {
    const { token, restaurantId } = req.query;
    if (!token || !restaurantId) return res.status(400).json({ success: false, message: 'token and restaurantId required' });

    const restaurant = await Restaurant.findById(restaurantId).lean();
    if (!restaurant) return res.status(404).json({ success: false, message: 'Not found' });

    // Match docs by token — show both pending-reupload and already-reuploaded (reuploadRequested may be false after upload)
    const rejectedDocs = (restaurant.documents || [])
      .filter(d => d.reuploadToken === token)
      .map(d => ({
        key:             d.key,
        label:           d.label,
        status:          d.status,
        rejectionReason: d.rejectionReason,
        reuploadRequested: d.reuploadRequested,
        url:             d.url || '',
      }));

    res.json({ success: true, rejectedDocs, restaurantName: restaurant.name });
  } catch (err) { next(err); }
}
