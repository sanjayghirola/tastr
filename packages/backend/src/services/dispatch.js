import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { haversineKm } from './directions.js';
import { getDriverSocketId, getOnlineDrivers } from '../sockets/driverHandlers.js';
import { notifyOrderEvent } from './notificationService.js';

const OFFER_TIMEOUT_MS       = 30_000; // 30 seconds
const MAX_DISPATCH_RADIUS_KM = 10;
const MAX_ACTIVE_DELIVERIES  = 3;      // max concurrent orders per driver
const OFFER_DRIVERS_PREFIX   = 'offer:drivers:';
const PENDING_DISPATCH_KEY   = 'dispatch:pending';

/**
 * Main dispatch entry point — BROADCAST MODEL.
 * Sends the delivery offer to ALL eligible nearby drivers simultaneously.
 * First driver to accept wins (via Redis lock in driverHandlers).
 *
 * @param {string} orderId
 * @param {string[]} excludeDriverIds - drivers to skip
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

    // Don't re-dispatch if a driver is already assigned
    if (order.driverId) {
      logger.info(`dispatchOrder: order ${orderId} already has driver ${order.driverId}`);
      return;
    }

    const restaurantLat = order.restaurantId?.address?.lat;
    const restaurantLng = order.restaurantId?.address?.lng;
    const hasRestaurantCoords = (restaurantLat != null && restaurantLng != null);

    if (!hasRestaurantCoords) {
      logger.warn(`dispatchOrder: restaurant "${order.restaurantId?.name}" has no lat/lng — skipping distance filter, allowing all online drivers`);
    } else {
      logger.info(`dispatchOrder: restaurant "${order.restaurantId?.name}" at [${restaurantLat}, ${restaurantLng}]`);
    }

    // Get all online driver IDs from Redis
    const onlineIds = await getOnlineDrivers();
    logger.info(`dispatchOrder: online drivers in Redis = [${onlineIds.join(', ')}] (${onlineIds.length} total)`);
    const candidateIds = onlineIds.filter(id => !excludeDriverIds.includes(id));

    if (candidateIds.length === 0) {
      logger.warn(`dispatchOrder: no online drivers for order ${orderId} (onlineIds=${onlineIds.length}, excluded=${excludeDriverIds.length})`);
      await _handleNoDrivers(order, Order);
      return;
    }

    // ─── Filter by radius and active delivery count ──────────────────────
    const redis = getRedis();
    const driversWithDistance = [];

    for (const driverId of candidateIds) {
      const locRaw = await redis.get(`driver:location:${driverId}`);
      if (!locRaw) {
        // Driver is online but hasn't sent location yet — try DB fallback
        const Driver = (await import('../models/Driver.js')).default;
        const dbDriver = await Driver.findById(driverId).select('lastLocation').lean();
        if (dbDriver?.lastLocation?.lat) {
          logger.info(`dispatchOrder: driver ${driverId} has no Redis location, using DB lastLocation`);
          const distKm = hasRestaurantCoords
            ? haversineKm(dbDriver.lastLocation.lat, dbDriver.lastLocation.lng, restaurantLat, restaurantLng)
            : 0; // no restaurant coords → allow all drivers
          if (distKm <= MAX_DISPATCH_RADIUS_KM) {
            const activeCount = await Order.countDocuments({ driverId, status: { $in: ['DRIVER_ASSIGNED', 'ON_WAY'] } });
            if (activeCount < MAX_ACTIVE_DELIVERIES) {
              driversWithDistance.push({ driverId, distKm, loc: dbDriver.lastLocation });
            } else {
              logger.info(`dispatchOrder: driver ${driverId} skipped — ${activeCount} active deliveries`);
            }
          } else {
            logger.info(`dispatchOrder: driver ${driverId} skipped — ${distKm.toFixed(1)}km away (max ${MAX_DISPATCH_RADIUS_KM}km)`);
          }
        } else {
          logger.info(`dispatchOrder: driver ${driverId} skipped — no location data in Redis or DB`);
        }
        continue;
      }

      const loc = JSON.parse(locRaw);
      const distKm = hasRestaurantCoords
        ? haversineKm(loc.lat, loc.lng, restaurantLat, restaurantLng)
        : 0; // no restaurant coords → allow all drivers

      if (hasRestaurantCoords && distKm > MAX_DISPATCH_RADIUS_KM) {
        logger.info(`dispatchOrder: driver ${driverId} skipped — ${distKm.toFixed(1)}km away (max ${MAX_DISPATCH_RADIUS_KM}km)`);
        continue;
      }

      // Check active delivery count — skip overloaded drivers
      const activeCount = await Order.countDocuments({
        driverId,
        status: { $in: ['DRIVER_ASSIGNED', 'ON_WAY'] },
      });
      if (activeCount >= MAX_ACTIVE_DELIVERIES) {
        logger.info(`dispatchOrder: driver ${driverId} skipped — ${activeCount} active deliveries`);
        continue;
      }

      driversWithDistance.push({ driverId, distKm, loc });
    }

    logger.info(`dispatchOrder: ${driversWithDistance.length} eligible drivers found for order ${orderId}`);

    if (driversWithDistance.length === 0) {
      logger.warn(`dispatchOrder: no eligible drivers for order ${orderId}`);
      await _handleNoDrivers(order, Order);
      return;
    }

    // ─── Score all drivers ───────────────────────────────────────────────
    const driverDocs = await Driver.find({
      _id: { $in: driversWithDistance.map(d => d.driverId) },
    }).select('rating').lean();

    const ratingMap = Object.fromEntries(
      driverDocs.map(d => [d._id.toString(), d.rating || 4])
    );

    const maxDist = Math.max(...driversWithDistance.map(d => d.distKm), 1);
    const scored = driversWithDistance.map(d => {
      const ratingScore    = ((ratingMap[d.driverId] || 4) / 5) * 50;
      const proximityScore = (1 - d.distKm / maxDist) * 50;
      return { ...d, score: ratingScore + proximityScore };
    });
    scored.sort((a, b) => b.score - a.score);

    // ─── Build the offer payload ─────────────────────────────────────────
    const offerPayload = {
      orderId,
      restaurant: {
        name:    order.restaurantId?.name,
        address: order.restaurantId?.address,
        lat:     restaurantLat,
        lng:     restaurantLng,
      },
      deliveryAddress: order.deliveryAddress,
      customerName:    order.customerName,
      items:           order.items?.length || 0,
      value:           order.total,
      prepTime:        order.prepTime || null,
      orderStatus:     order.status,
      estimatedDeliveryAt: order.estimatedDeliveryAt,
      timeoutMs:       OFFER_TIMEOUT_MS,
    };

    // ─── Broadcast to ALL eligible drivers ───────────────────────────────
    const { getIO } = await import('../sockets/index.js');
    const io = getIO();
    const driverNs = io.of('/driver');
    const sentToDriverIds = [];

    for (const driver of scored) {
      const socketId = await getDriverSocketId(driver.driverId);
      if (!socketId) continue;

      const personalOffer = {
        ...offerPayload,
        distanceKm:    driver.distKm.toFixed(1),
        deliveryFee:   order.deliveryFee || 0,
        driverEarning: order.driverPayout || order.deliveryFee || 0,
      };

      driverNs.to(socketId).emit('new:delivery-offer', personalOffer);
      sentToDriverIds.push(driver.driverId);
      logger.info(`Offer broadcast to driver ${driver.driverId} for order ${orderId}`);
    }

    if (sentToDriverIds.length === 0) {
      logger.warn(`dispatchOrder: no reachable sockets for order ${orderId}`);
      await _handleNoDrivers(order, Order);
      return;
    }

    // ─── Store which drivers received this offer (for revocation) ────────
    const ttl = Math.ceil(OFFER_TIMEOUT_MS / 1000) + 10;
    await redis.setex(
      `${OFFER_DRIVERS_PREFIX}${orderId}`,
      ttl,
      JSON.stringify(sentToDriverIds)
    );

    // ─── Register in pending set for Redis-based timeout polling ─────────
    const expiresAt = Date.now() + OFFER_TIMEOUT_MS;
    await redis.zadd(PENDING_DISPATCH_KEY, expiresAt, orderId);

    logger.info(`Offer broadcast to ${sentToDriverIds.length} drivers for order ${orderId}`);

  } catch (err) {
    logger.error('dispatchOrder error', err);
  }
}

/**
 * Handle the case when no drivers are available.
 */
async function _handleNoDrivers(order, Order) {
  await Order.findByIdAndUpdate(order._id, {
    $push: {
      timeline: {
        status: 'no_driver',
        at: new Date(),
        note: 'No drivers available — retrying shortly',
      },
    },
  });

  // Notify customer via socket
  try {
    const { getIO } = await import('../sockets/index.js');
    const io = getIO();
    io.to(`order:${order._id.toString()}`).emit('order:status', {
      orderId: order._id.toString(),
      status:  order.status,
      message: 'Looking for a driver — please wait',
      noDriver: true,
    });
  } catch {}

  // Notify customer via push notification
  try {
    await notifyOrderEvent(order, 'no_driver_available', {
      message: 'We are looking for a nearby driver. You will be notified when one is assigned.',
    });
  } catch {}

  // Schedule a retry in 60 seconds via Redis sorted set
  try {
    const redis = getRedis();
    await redis.zadd('dispatch:retry', Date.now() + 60_000, order._id.toString());
  } catch {}
}

/**
 * Revoke an offer from all drivers who received it (when one driver accepts).
 * Emits 'delivery-offer:revoked' so their UI removes the offer card.
 */
export async function revokeOfferFromOtherDrivers(orderId, acceptedDriverId) {
  try {
    const redis = getRedis();
    const driversRaw = await redis.get(`${OFFER_DRIVERS_PREFIX}${orderId}`);
    if (!driversRaw) return;

    const driverIds = JSON.parse(driversRaw);
    const { getIO } = await import('../sockets/index.js');
    const io = getIO();
    const driverNs = io.of('/driver');

    for (const driverId of driverIds) {
      if (driverId === acceptedDriverId) continue;
      const socketId = await getDriverSocketId(driverId);
      if (!socketId) continue;

      driverNs.to(socketId).emit('delivery-offer:revoked', {
        orderId,
        reason: 'accepted_by_another',
        message: 'This order was accepted by another driver.',
      });
    }

    // Clean up
    await redis.del(`${OFFER_DRIVERS_PREFIX}${orderId}`);
    await redis.zrem(PENDING_DISPATCH_KEY, orderId);

    logger.info(`Revoked offer for order ${orderId} from ${driverIds.length - 1} other drivers`);
  } catch (err) {
    logger.error('revokeOfferFromOtherDrivers error', err);
  }
}

/**
 * Poll for expired dispatch offers (replaces fragile setTimeout).
 * Call on a setInterval (e.g. every 5 seconds).
 */
export async function processExpiredOffers() {
  try {
    const redis = getRedis();
    const now = Date.now();
    const expiredOrderIds = await redis.zrangebyscore(PENDING_DISPATCH_KEY, 0, now);
    if (!expiredOrderIds || expiredOrderIds.length === 0) return;

    const Order = (await import('../models/Order.js')).default;

    for (const orderId of expiredOrderIds) {
      await redis.zrem(PENDING_DISPATCH_KEY, orderId);

      const order = await Order.findById(orderId).select('driverId status').lean();
      if (!order || order.driverId) continue;
      if (!['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status)) continue;

      logger.info(`Offer expired for order ${orderId}, no driver accepted`);

      // Revoke from all drivers
      const driversRaw = await redis.get(`${OFFER_DRIVERS_PREFIX}${orderId}`);
      if (driversRaw) {
        const driverIds = JSON.parse(driversRaw);
        const { getIO } = await import('../sockets/index.js');
        const io = getIO();
        const driverNs = io.of('/driver');

        for (const driverId of driverIds) {
          const socketId = await getDriverSocketId(driverId);
          if (socketId) {
            driverNs.to(socketId).emit('delivery-offer:revoked', {
              orderId,
              reason: 'expired',
              message: 'This delivery offer has expired.',
            });
          }
        }
        await redis.del(`${OFFER_DRIVERS_PREFIX}${orderId}`);
      }

      // Re-dispatch with fresh pool (exclude nobody — give everyone another chance)
      await dispatchOrder(orderId);
    }
  } catch (err) {
    logger.error('processExpiredOffers error', err);
  }
}

/**
 * Poll for orders that need dispatch retry (no drivers were available).
 */
export async function processDispatchRetries() {
  try {
    const redis = getRedis();
    const now = Date.now();
    const retryOrderIds = await redis.zrangebyscore('dispatch:retry', 0, now);
    if (!retryOrderIds || retryOrderIds.length === 0) return;

    const Order = (await import('../models/Order.js')).default;

    for (const orderId of retryOrderIds) {
      await redis.zrem('dispatch:retry', orderId);
      const order = await Order.findById(orderId).select('driverId status').lean();
      if (!order || order.driverId) continue;
      if (!['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status)) continue;

      logger.info(`Retrying dispatch for order ${orderId}`);
      await dispatchOrder(orderId);
    }
  } catch (err) {
    logger.error('processDispatchRetries error', err);
  }
}