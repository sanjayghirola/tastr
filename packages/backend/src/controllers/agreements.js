import Agreement from '../models/Agreement.js';
import AgreementAcceptance from '../models/AgreementAcceptance.js';
import { logger } from '../utils/logger.js';

// ─── PUBLIC: Get active agreement by type ────────────────────────────────────
// GET /api/agreements/:type  (type = 'restaurant' | 'driver')
export async function getActiveAgreement(req, res, next) {
  try {
    const { type } = req.params;
    if (!['restaurant', 'driver'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid agreement type' });
    }
    const agreement = await Agreement.findOne({ type, isActive: true }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, agreement: agreement || null });
  } catch (err) { next(err); }
}

// ─── PUBLIC: Accept agreement ────────────────────────────────────────────────
// POST /api/agreements/:type/accept
export async function acceptAgreement(req, res, next) {
  try {
    const { type } = req.params;
    const userId = req.user._id;

    const agreement = await Agreement.findOne({ type, isActive: true }).sort({ createdAt: -1 });
    if (!agreement) return res.status(404).json({ success: false, message: 'No active agreement found' });

    const acceptance = await AgreementAcceptance.findOneAndUpdate(
      { userId, agreementId: agreement._id },
      {
        userId,
        agreementId: agreement._id,
        agreementType: type,
        version: agreement.version,
        acceptedAt: new Date(),
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
        userAgent: req.headers['user-agent'] || '',
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, acceptance });
  } catch (err) { next(err); }
}

// ─── PUBLIC: Check if user accepted latest agreement ─────────────────────────
// GET /api/agreements/:type/status
export async function getAcceptanceStatus(req, res, next) {
  try {
    const { type } = req.params;
    const agreement = await Agreement.findOne({ type, isActive: true }).sort({ createdAt: -1 }).lean();
    if (!agreement) return res.json({ success: true, accepted: true, agreement: null });

    const acceptance = await AgreementAcceptance.findOne({
      userId: req.user._id,
      agreementId: agreement._id,
    }).lean();

    res.json({
      success: true,
      accepted: !!acceptance,
      acceptedAt: acceptance?.acceptedAt || null,
      agreement: { _id: agreement._id, title: agreement.title, version: agreement.version },
    });
  } catch (err) { next(err); }
}

// ─── ADMIN: List all agreements ──────────────────────────────────────────────
export async function adminListAgreements(req, res, next) {
  try {
    const agreements = await Agreement.find().sort({ type: 1, createdAt: -1 }).lean();
    res.json({ success: true, agreements });
  } catch (err) { next(err); }
}

// ─── ADMIN: Create/update agreement ─────────────────────────────────────────
export async function adminUpsertAgreement(req, res, next) {
  try {
    const { type, title, content, version } = req.body;
    if (!type || !title || !content) {
      return res.status(400).json({ success: false, message: 'Type, title, and content are required' });
    }

    // Deactivate previous active agreement of this type
    await Agreement.updateMany({ type, isActive: true }, { isActive: false });

    const agreement = await Agreement.create({
      type, title, content,
      version: version || '1.0',
      isActive: true,
      updatedBy: req.user._id,
    });

    res.status(201).json({ success: true, agreement });
  } catch (err) { next(err); }
}

// ─── ADMIN: Get acceptance records ──────────────────────────────────────────
export async function adminListAcceptances(req, res, next) {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.agreementType = type;

    const [records, total] = await Promise.all([
      AgreementAcceptance.find(filter)
        .populate('userId', 'name email phone')
        .populate('agreementId', 'title version type')
        .sort({ acceptedAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      AgreementAcceptance.countDocuments(filter),
    ]);

    res.json({ success: true, records, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) { next(err); }
}
