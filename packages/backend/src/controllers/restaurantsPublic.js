import Restaurant from '../models/Restaurant.js';
import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import { ENTITY_STATUS } from '@tastr/shared';
import { haversineKm, paginationMeta } from '../utils/helpers.js';

// ─── GET /api/restaurants ─────────────────────────────────────────────────────
export async function listRestaurants(req, res, next) {
  try {
    const {
      lat, lng, radiusKm = 10,
      cuisine, minRating = 0, maxDeliveryFee,
      openNow, dietary,
      page = 1, limit = 20,
      sort = 'rating', q,
    } = req.query;

    const filter = { status: ENTITY_STATUS.ACTIVE };

    if (cuisine) filter.cuisines = { $regex: cuisine, $options: 'i' };
    if (minRating > 0) filter.avgRating = { $gte: parseFloat(minRating) };
    if (maxDeliveryFee !== undefined) filter.deliveryFee = { $lte: parseFloat(maxDeliveryFee) };
    if (dietary) {
      // Dietary filter matches against menu items in P3 — here filter by cuisine/description
      filter.description = { $regex: dietary, $options: 'i' };
    }
    if (q) filter.$text = { $search: q };

    let restaurants = await Restaurant.find(filter)
      .select('-bankAccountLast4 -bankSortCode -stripeAccountId -staffIds')
      .lean();

    // Geo filter — done in-memory (small dataset; use $geoNear index in production)
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radius  = parseFloat(radiusKm);
      restaurants = restaurants.filter(r => {
        if (!r.address?.lat) return true; // include if no coords set
        const dist = haversineKm(userLat, userLng, r.address.lat, r.address.lng);
        r._distanceKm = Math.round(dist * 10) / 10;
        return dist <= radius;
      });
    }

    // openNow filter
    if (openNow === 'true') {
      const now   = new Date();
      const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const today = days[now.getDay()];
      const time  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      restaurants = restaurants.filter(r => {
        if (!r.isOnline) return false;
        const h = r.openingHours?.find(h => h.day === today);
        if (!h || !h.isOpen) return false;
        return time >= h.open && time <= h.close;
      });
    }

    // Compute isOpenNow for each restaurant
    const now   = new Date();
    const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const today = days[now.getDay()];
    const time  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    restaurants.forEach(r => {
      const h = r.openingHours?.find(h => h.day === today);
      r.isOpenNow = r.isOnline && h?.isOpen && time >= h?.open && time <= h?.close;
      r.todayHours = h || null;
    });

    // Sort
    if (sort === 'rating')       restaurants.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
    else if (sort === 'distance') restaurants.sort((a, b) => (a._distanceKm || 0) - (b._distanceKm || 0));
    else if (sort === 'deliveryTime') restaurants.sort((a, b) => (a.estimatedDeliveryMin || 0) - (b.estimatedDeliveryMin || 0));
    else if (sort === 'new')     restaurants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate
    const total   = restaurants.length;
    const skip    = (parseInt(page) - 1) * parseInt(limit);
    const results = restaurants.slice(skip, skip + parseInt(limit));

    res.json({ success: true, restaurants: results, pagination: paginationMeta(total, parseInt(page), parseInt(limit)) });
  } catch (err) { next(err); }
}

// ─── GET /api/restaurants/:id ─────────────────────────────────────────────────
export async function getRestaurant(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({ _id: req.params.id, status: ENTITY_STATUS.ACTIVE })
      .select('-bankAccountLast4 -bankSortCode -stripeAccountId')
      .lean();
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    // Is open now?
    const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const now   = new Date();
    const today = days[now.getDay()];
    const time  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const todayHours = restaurant.openingHours?.find(h => h.day === today);
    restaurant.isOpenNow = restaurant.isOnline && todayHours?.isOpen && time >= todayHours?.open && time <= todayHours?.close;
    restaurant.todayHours = todayHours || null;

    res.json({ success: true, restaurant });
  } catch (err) { next(err); }
}

// ─── GET /api/restaurants/:id/menu ───────────────────────────────────────────
export async function getMenu(req, res, next) {
  try {
    const categories = await MenuCategory.find({ restaurantId: req.params.id, isEnabled: true })
      .sort({ sortOrder: 1 }).lean();

    const items = await MenuItem.find({ restaurantId: req.params.id, isAvailable: true })
      .sort({ sortOrder: 1 }).lean();

    const menu = categories.map(cat => ({
      ...cat,
      items: items.filter(i => i.categoryId.toString() === cat._id.toString()),
    })).filter(cat => cat.items.length > 0);

    res.json({ success: true, menu });
  } catch (err) { next(err); }
}

// ─── PATCH /api/restaurants/:id/online ───────────────────────────────────────
export async function toggleOnline(req, res, next) {
  try {
    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { isOnline: req.body.isOnline },
      { new: true },
    );
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    res.json({ success: true, isOnline: restaurant.isOnline });
  } catch (err) { next(err); }
}
