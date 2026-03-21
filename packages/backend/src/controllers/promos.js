import PromoCode from '../models/PromoCode.js';
import Cart from '../models/Cart.js';
import { ROLES } from '@tastr/shared';

// GET /api/promos
export async function listPromos(req, res, next) {
  try {
    const { restaurantId, page = 1, limit = 30 } = req.query;
    const filter = { isActive: true };
    if (restaurantId) filter.restaurantId = restaurantId;
    const promos = await PromoCode.find(filter).sort({ createdAt: -1 })
      .skip((page-1)*limit).limit(Number(limit)).lean();
    res.json({ success: true, promos });
  } catch (err) { next(err); }
}

// POST /api/promos
export async function createPromo(req, res, next) {
  try {
    const data = { ...req.body };
    if (req.user) data.createdBy = req.user._id;
    if (req.admin) data.createdBy = req.admin._id;
    const promo = await PromoCode.create(data);
    res.status(201).json({ success: true, promo });
  } catch (err) { next(err); }
}

// PUT /api/promos/:id
export async function updatePromo(req, res, next) {
  try {
    const promo = await PromoCode.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!promo) return res.status(404).json({ message: 'Promo not found' });
    res.json({ success: true, promo });
  } catch (err) { next(err); }
}

// DELETE /api/promos/:id
export async function deletePromo(req, res, next) {
  try {
    await PromoCode.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

// POST /api/promos/validate
export async function validatePromo(req, res, next) {
  try {
    const { code, cartTotal, restaurantId, userId } = req.body;
    const promo = await PromoCode.findOne({ code: code?.toUpperCase(), isActive: true });
    if (!promo) return res.status(404).json({ valid: false, message: 'Invalid promo code' });

    const now = new Date();
    if (promo.expiresAt && promo.expiresAt < now) return res.status(400).json({ valid: false, message: 'Promo has expired' });
    if (promo.startsAt && promo.startsAt > now) return res.status(400).json({ valid: false, message: 'Promo not yet active' });
    if (promo.maxUses && promo.usedCount >= promo.maxUses) return res.status(400).json({ valid: false, message: 'Promo code limit reached' });
    if (promo.minOrderAmount && cartTotal < promo.minOrderAmount) {
      return res.status(400).json({ valid: false, message: `Minimum order £${(promo.minOrderAmount/100).toFixed(2)} required` });
    }
    if (promo.restaurantId && promo.restaurantId.toString() !== restaurantId) {
      return res.status(400).json({ valid: false, message: 'Promo not valid for this restaurant' });
    }

    // Calculate discount
    let discount = 0;
    if (promo.type === 'percent') {
      discount = Math.round(cartTotal * promo.value / 100);
      if (promo.maxDiscountPence) discount = Math.min(discount, promo.maxDiscountPence);
    } else if (promo.type === 'fixed') {
      discount = promo.value;
    } else if (promo.type === 'free_delivery') {
      discount = 0;  // handled at order level
    }

    res.json({ valid: true, discount, type: promo.type, promo });
  } catch (err) { next(err); }
}

// GET /api/admin/promos
export async function adminListPromos(req, res, next) {
  try {
    const { page = 1, limit = 30, isActive, restaurantId } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (restaurantId) filter.restaurantId = restaurantId;
    const [promos, total] = await Promise.all([
      PromoCode.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)).lean(),
      PromoCode.countDocuments(filter),
    ]);
    res.json({ success: true, promos, total, page: Number(page) });
  } catch (err) { next(err); }
}
