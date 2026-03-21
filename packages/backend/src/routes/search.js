import { Router } from 'express';
import { query } from 'express-validator';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import Banner from '../models/Banner.js';
import CuisineCategory from '../models/CuisineCategory.js';
import User from '../models/User.js';
import { ENTITY_STATUS } from '@tastr/shared';
import { paginationMeta } from '../utils/helpers.js';

const router = Router();

/**
 * @swagger
 * /api/search:
 *   get:
 *     tags: [Search]
 *     summary: Full-text search across restaurants and dishes
 */
router.get('/',
  optionalAuth,
  [query('q').notEmpty().withMessage('Query required'), query('page').optional().isInt({ min: 1 })],
  validate,
  async (req, res, next) => {
    try {
      const { q, page = 1, limit = 20, type = 'all' } = req.query;
      const skip  = (parseInt(page) - 1) * parseInt(limit);
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

      const [restaurants, dishes] = await Promise.all([
        type === 'dishes' ? [] : Restaurant.find({
          status: ENTITY_STATUS.ACTIVE,
          $or: [{ name: regex }, { description: regex }, { cuisines: regex }],
        }).select('name cuisines logoUrl avgRating deliveryFee estimatedDeliveryMin address isOnline').limit(parseInt(limit)).lean(),

        type === 'restaurants' ? [] : MenuItem.find({
          isAvailable: true,
          $or: [{ name: regex }, { description: regex }],
        }).populate('restaurantId', 'name cuisines logoUrl isOnline deliveryFee').limit(parseInt(limit)).lean(),
      ]);

      // Save recent search for authenticated users
      if (req.user) {
        await User.findByIdAndUpdate(req.user._id, {
          $push: {
            recentSearches: {
              $each: [{ query: q, searchedAt: new Date() }],
              $slice: -10,  // keep last 10
            },
          },
        });
      }

      res.json({ success: true, restaurants, dishes, query: q, pagination: paginationMeta(restaurants.length + dishes.length, parseInt(page), parseInt(limit)) });
    } catch (err) { next(err); }
  },
);

/**
 * Recent searches for authenticated users
 */
router.get('/recent', optionalAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.json({ success: true, searches: [] });
    const user = await User.findById(req.user._id).select('recentSearches');
    res.json({ success: true, searches: (user?.recentSearches || []).reverse() });
  } catch (err) { next(err); }
});

/**
 * Delete a recent search
 */
router.delete('/recent/:query', optionalAuth, async (req, res, next) => {
  try {
    if (!req.user) return res.json({ success: true });
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { recentSearches: { query: decodeURIComponent(req.params.query) } },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
