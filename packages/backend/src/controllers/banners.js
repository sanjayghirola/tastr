import Banner from '../models/Banner.js';
import { uploadBanner as uploadBannerMiddleware } from '../config/cloudinary.js';

// GET /api/banners
export async function listBanners(req, res, next) {
  try {
    const { type, active } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (active === 'true') { filter.isActive = true; const now = new Date(); filter.$or = [{ startDate: null }, { startDate: { $lte: now } }]; }
    const banners = await Banner.find(filter).sort({ sortOrder: 1, createdAt: -1 }).lean();
    res.json({ success: true, banners });
  } catch (err) { next(err); }
}

// POST /api/banners
export async function createBanner(req, res, next) {
  try {
    const createdBy = req.admin?._id || req.user?._id;
    const data = { ...req.body, createdBy };
    if (req.file?.path) {
      data.imageUrl = req.file.path;
      data.imagePublicId = req.file.filename;
    } else if (!data.imageUrl) {
      // Dev fallback — Cloudinary not configured
      data.imageUrl = '';
    }
    const banner = await Banner.create(data);
    res.status(201).json({ success: true, banner });
  } catch (err) { next(err); }
}

// PUT /api/banners/:id
export async function updateBanner(req, res, next) {
  try {
    const data = { ...req.body };
    if (req.file?.path) { data.imageUrl = req.file.path; data.imagePublicId = req.file.filename; }
    const banner = await Banner.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    res.json({ success: true, banner });
  } catch (err) { next(err); }
}

// DELETE /api/banners/:id
export async function deleteBanner(req, res, next) {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

// Admin: GET /api/admin/banners
export async function adminListBanners(req, res, next) {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 }).populate('createdBy', 'name').lean();
    res.json({ success: true, banners });
  } catch (err) { next(err); }
}
