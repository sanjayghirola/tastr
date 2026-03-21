import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { haversineKm } from './directions.js';
import { getDriverSocketId } from '../sockets/driverHandlers.js';

const OFFER_TIMEOUT_MS  = 30_000; // 30 seconds
const MAX_DISPATCH_RADIUS_KM = 10;

/**
 * Main dispatch entry point.
 * Called when an order is placed (from orders controller) or when a driver declines.
 *
 * @param {string} orderId
 * @param {string[]} excludeDriverIds - drivers already tried
 */
export async function dispatchOrder(orderId, excludeDriverIds = []) {
  try {
    const Order  = (await import('../models/Order.js')).default;
    const Driver = (await import('../models/Driver.js')).default;

    const order = await Order.findById(orderId)
      .populate('restaurantId', 'name address')
      .lean();

    if (!order) {
      logger.warn(`dispatchOrder: order ${orderId} not found`);
      return;
    }

    const restaurantLat = order.restaurantId?.address?.lat;
    const restaurantLng = order.restaurantId?.address?.lng;

    // Get online driver IDs from Redis
    const onlineIds = await getRedis().smembers('drivers:online');
    const candidateIds = onlineIds.filter(id => !excludeDriverIds.includes(id));

    if (candidateIds.length === 0) {
      logger.warn(`dispatchOrder: no online drivers for order ${orderId}`);
      await Order.findByIdAndUpdate(orderId, {
        $push: { timeline: { status: 'no_driver', at: new Date(), note: 'No drivers available' } },
      });
      return;
    }

    // Load driver locations from Redis and filter by radius
    const driversWithDistance = [];
    for (const driverId of candidateIds) {
      const locRaw = await getRedis().get(`driver:location:${driverId}`);
      if (!locRaw) continue;

      const loc = JSON.parse(locRaw);
      const distKm = (restaurantLat != null && restaurantLng != null)
        ? haversineKm(loc.lat, loc.lng, restaurantLat, restaurantLng)
        : 999;

      if (distKm > MAX_DISPATCH_RADIUS_KM) continue;

      driversWithDistance.push({ driverId, distKm, loc });
    }

    if (driversWithDistance.length === 0) {
      logger.warn(`dispatchOrder: no drivers within ${MAX_DISPATCH_RADIUS_KM}km for order ${orderId}`);
      return;
    }

    // Score: rating (0–5 scaled to 0–50) + proximity (0–50 inversely)
    const driverDocs = await Driver.find({
      _id: { $in: driversWithDistance.map(d => d.driverId) },
    }).select('rating').lean();

    const ratingMap = Object.fromEntries(driverDocs.map(d => [d._id.toString(), d.rating || 4]));

    const maxDist = Math.max(...driversWithDistance.map(d => d.distKm), 1);
    const scored = driversWithDistance.map(d => {
      const ratingScore = ((ratingMap[d.driverId] || 4) / 5) * 50;
      const proximityScore = (1 - d.distKm / maxDist) * 50;
      return { ...d, score: ratingScore + proximityScore };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // Get driver's socket ID
    const socketId = await getDriverSocketId(best.driverId);
    if (!socketId) {
      logger.warn(`dispatchOrder: driver ${best.driverId} has no socket`);
      return dispatchOrder(orderId, [...excludeDriverIds, best.driverId]);
    }

    // Send offer
    const { getIO } = await import('../sockets/index.js');
    const io = getIO();
    io.of('/driver').to(socketId).emit('new:delivery-offer', {
      orderId,
      restaurant: {
        name:    order.restaurantId?.name,
        address: order.restaurantId?.address,
        lat:     restaurantLat,
        lng:     restaurantLng,
      },
      deliveryAddress: order.deliveryAddress,
      items:           order.items?.length,
      value: order.total,
      distanceKm:      best.distKm.toFixed(1),
      timeoutMs:       OFFER_TIMEOUT_MS,
    });

    logger.info(`Offer sent to driver ${best.driverId} for order ${orderId}`);

    // Set a timeout key in Redis; if driver doesn't accept, try next
    await getRedis().psetex(`offer:${best.driverId}:${orderId}`, OFFER_TIMEOUT_MS + 2000, 'pending');

    setTimeout(async () => {
      const stillPending = await getRedis().get(`offer:${best.driverId}:${orderId}`);
      if (stillPending) {
        logger.info(`Offer timeout: driver ${best.driverId} did not respond for order ${orderId}`);
        await getRedis().del(`offer:${best.driverId}:${orderId}`);
        dispatchOrder(orderId, [...excludeDriverIds, best.driverId]);
      }
    }, OFFER_TIMEOUT_MS);
  } catch (err) {
    logger.error('dispatchOrder error', err);
  }
}
