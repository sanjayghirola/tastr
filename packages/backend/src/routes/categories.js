import { Router } from 'express';
import Banner from '../models/Banner.js';
import CuisineCategory from '../models/CuisineCategory.js';

export const bannersRouter = Router();
export const categoriesRouter = Router();

// GET /api/banners?type=hero
bannersRouter.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = { isActive: true };
    if (type) filter.type = type;
    const now = new Date();
    filter.$or = [
      { startDate: { $exists: false } },
      { startDate: { $lte: now }, endDate: { $gte: now } },
    ];
    const banners = await Banner.find(filter).sort({ sortOrder: 1 }).lean();
    res.json({ success: true, banners });
  } catch (err) { next(err); }
});

// GET /api/categories/cuisine
categoriesRouter.get('/cuisine', async (req, res, next) => {
  try {
    const categories = await CuisineCategory.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    if (!categories.length) {
      return res.json({
        success: true,
        categories: [
          { name: 'All', icon: '🍽' }, { name: 'Pizza', icon: '🍕' },
          { name: 'Burgers', icon: '🍔' }, { name: 'Indian', icon: '🍛' },
          { name: 'Chinese', icon: '🥡' }, { name: 'Sushi', icon: '🍣' },
          { name: 'Desserts', icon: '🍰' }, { name: 'Healthy', icon: '🥗' },
          { name: 'Beverages', icon: '🧃' }, { name: 'Breakfast', icon: '🍳' },
          { name: 'Italian', icon: '🍝' }, { name: 'Mexican', icon: '🌮' },
        ],
      });
    }
    res.json({ success: true, categories });
  } catch (err) { next(err); }
});
