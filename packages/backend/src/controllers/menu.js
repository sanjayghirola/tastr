import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import Restaurant from '../models/Restaurant.js';
import { deleteCloudinaryAsset } from '../config/cloudinary.js';

// helper: get restaurantId for the current user
async function getOwnerRestaurantId(userId) {
  const r = await Restaurant.findOne({ ownerId: userId }).select('_id');
  return r?._id;
}

// ─── GET /api/restaurants/me/menu  (restaurant portal) ────────────────────────
export async function getMyMenu(req, res, next) {
  try {
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    if (!restaurantId) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const [categories, items] = await Promise.all([
      MenuCategory.find({ restaurantId }).sort({ sortOrder: 1 }).lean(),
      MenuItem.find({ restaurantId }).sort({ sortOrder: 1 }).lean(),
    ]);

    const menu = categories.map(cat => ({
      ...cat,
      items: items.filter(i => i.categoryId.toString() === cat._id.toString()),
    }));

    res.json({ success: true, menu, categories, items });
  } catch (err) { next(err); }
}

// ─── GET /api/menu?restaurantId=  (admin view — no role restriction) ──────────
export async function getMenuByRestaurantId(req, res, next) {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) return res.status(400).json({ success: false, message: 'restaurantId required' });

    const [categories, items] = await Promise.all([
      MenuCategory.find({ restaurantId }).sort({ sortOrder: 1 }).lean(),
      MenuItem.find({ restaurantId }).sort({ sortOrder: 1 }).lean(),
    ]);

    const menu = categories.map(cat => ({
      ...cat,
      items: items.filter(i => i.categoryId.toString() === cat._id.toString()),
    }));

    res.json({ success: true, menu, categories, items });
  } catch (err) { next(err); }
}

// ─── Categories ───────────────────────────────────────────────────────────────
export async function getCategories(req, res, next) {
  try {
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    if (!restaurantId) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    const cats = await MenuCategory.find({ restaurantId }).sort({ sortOrder: 1 });
    // Attach item counts
    const counts = await MenuItem.aggregate([
      { $match: { restaurantId } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map(c => [c._id.toString(), c.count]));
    const result = cats.map(c => ({ ...c.toObject(), itemCount: countMap[c._id.toString()] || 0 }));
    res.json({ success: true, categories: result });
  } catch (err) { next(err); }
}

export async function createCategory(req, res, next) {
  try {
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    if (!restaurantId) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    const count = await MenuCategory.countDocuments({ restaurantId });
    const cat = await MenuCategory.create({ restaurantId, name: req.body.name, sortOrder: count });
    res.status(201).json({ success: true, category: cat });
  } catch (err) { next(err); }
}

export async function updateCategory(req, res, next) {
  try {
    const { name, sortOrder, isEnabled } = req.body;
    const cat = await MenuCategory.findById(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
    if (name !== undefined)      cat.name      = name;
    if (sortOrder !== undefined) cat.sortOrder = sortOrder;
    if (isEnabled !== undefined) cat.isEnabled = isEnabled;
    await cat.save();
    res.json({ success: true, category: cat });
  } catch (err) { next(err); }
}

export async function deleteCategory(req, res, next) {
  try {
    const cat = await MenuCategory.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
    const items = await MenuItem.find({ categoryId: req.params.id });
    for (const item of items) {
      if (item.photoPublicId) await deleteCloudinaryAsset(item.photoPublicId);
    }
    await MenuItem.deleteMany({ categoryId: req.params.id });
    res.json({ success: true, message: 'Category and items deleted' });
  } catch (err) { next(err); }
}

export async function reorderCategories(req, res, next) {
  try {
    await Promise.all(req.body.order.map(({ id, sortOrder }) =>
      MenuCategory.findByIdAndUpdate(id, { sortOrder }),
    ));
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ─── Parse nutrition from request body ────────────────────────────────────────
function parseNutrition(body) {
  const fields = ['calories','fat','saturates','carbs','sugars','protein','salt','fibre'];
  const n = {};
  for (const f of fields) {
    if (body[`nutrition_${f}`] !== undefined && body[`nutrition_${f}`] !== '') {
      n[f] = parseFloat(body[`nutrition_${f}`]);
    }
  }
  return Object.keys(n).length ? n : undefined;
}

function parseAllergens(body) {
  if (!body.allergens) return [];
  return Array.isArray(body.allergens) ? body.allergens : JSON.parse(body.allergens);
}

// ─── Items ────────────────────────────────────────────────────────────────────
export async function createItem(req, res, next) {
  try {
    const restaurantId = await getOwnerRestaurantId(req.user._id);
    if (!restaurantId) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const { name, description, price, categoryId, calories, dietary, toppingGroups, sortOrder } = req.body;

    const nutrition = parseNutrition(req.body);
    const allergens = parseAllergens(req.body);

    // Handle memoryStorage fallback (no Cloudinary configured)
    let photoUrl = req.file?.path || '';
    if (!photoUrl && req.file?.buffer) {
      photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const item = await MenuItem.create({
      restaurantId,
      categoryId,
      name,
      description,
      price:    parseInt(price),
      calories: calories ? parseInt(calories) : undefined,
      nutrition,
      allergens,
      dietary:  dietary ? (Array.isArray(dietary) ? dietary : JSON.parse(dietary)) : [],
      toppingGroups: toppingGroups ? (typeof toppingGroups === 'string' ? JSON.parse(toppingGroups) : toppingGroups) : [],
      sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      photoUrl,
      photoPublicId: req.file?.filename || '',
    });

    res.status(201).json({ success: true, item });
  } catch (err) { next(err); }
}

export async function getItem(req, res, next) {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, item });
  } catch (err) { next(err); }
}

export async function updateItem(req, res, next) {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const fields = ['name','description','price','categoryId','calories','sortOrder'];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        item[f] = ['price','calories','sortOrder'].includes(f) ? parseInt(req.body[f]) : req.body[f];
      }
    }
    if (req.body.dietary) item.dietary = Array.isArray(req.body.dietary) ? req.body.dietary : JSON.parse(req.body.dietary);
    if (req.body.toppingGroups) item.toppingGroups = typeof req.body.toppingGroups === 'string' ? JSON.parse(req.body.toppingGroups) : req.body.toppingGroups;

    const nutrition = parseNutrition(req.body);
    if (nutrition) item.nutrition = nutrition;

    if (req.body.allergens !== undefined) item.allergens = parseAllergens(req.body);

    if (req.file) {
      if (item.photoPublicId) await deleteCloudinaryAsset(item.photoPublicId);
      let photoUrl = req.file.path || '';
      if (!photoUrl && req.file.buffer) {
        photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }
      item.photoUrl      = photoUrl;
      item.photoPublicId = req.file.filename || '';
    }
    await item.save();
    res.json({ success: true, item });
  } catch (err) { next(err); }
}

export async function deleteItem(req, res, next) {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.photoPublicId) await deleteCloudinaryAsset(item.photoPublicId);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function toggleAvailability(req, res, next) {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, { isAvailable: req.body.isAvailable }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, item });
  } catch (err) { next(err); }
}

export async function bulkToggleAvailability(req, res, next) {
  try {
    await MenuItem.updateMany({ _id: { $in: req.body.ids } }, { isAvailable: req.body.isAvailable });
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ─── Toppings ─────────────────────────────────────────────────────────────────
export async function addToppingGroup(req, res, next) {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    item.toppingGroups.push(req.body);
    await item.save();
    res.json({ success: true, item });
  } catch (err) { next(err); }
}

export async function updateToppingGroup(req, res, next) {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    const group = item.toppingGroups.id(req.params.toppingId);
    if (!group) return res.status(404).json({ success: false, message: 'Topping group not found' });
    Object.assign(group, req.body);
    await item.save();
    res.json({ success: true, item });
  } catch (err) { next(err); }
}

export async function deleteToppingGroup(req, res, next) {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    item.toppingGroups = item.toppingGroups.filter(g => g._id.toString() !== req.params.toppingId);
    await item.save();
    res.json({ success: true, item });
  } catch (err) { next(err); }
}


