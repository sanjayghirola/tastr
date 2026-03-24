import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { getETA } from '../services/directions.js';

const DRIVER_ONLINE_SET   = 'drivers:online';
const DRIVER_SOCKET_KEY   = id => `driver:socket:${id}`;
const DRIVER_LOCATION_KEY = id => `driver:location:${id}`;
const ACCEPT_LOCK_PREFIX  = 'order:accept-lock:';

export function registerDriverHandlers(io, driverNs, socket) {
  // socket.user.id = User._id (from JWT 'sub' field)
  const userId = socket.user?.id;
  // We'll resolve the actual Driver._id on the first event
  let driverDocId = null;

  /**
   * Resolve the Driver document from User._id.
   * Caches the result for the socket lifetime.
   */
  async function resolveDriverId() {
    if (driverDocId) return driverDocId;
    try {
      const { default: Driver } = await import('../models/Driver.js');
      const driver = await Driver.findOne({ userId }).select('_id').lean();
      if (!driver) {
        logger.warn(`No Driver document found for userId=${userId}`);
        return null;
      }
      driverDocId = driver._id.toString();
      logger.info(`Resolved Driver._id=${driverDocId} for userId=${userId}`);
      return driverDocId;
    } catch (err) {
      logger.error('resolveDriverId error', err);
      return null;
    }
  }

  // ─── Go online ─────────────────────────────────────────────────────────
  socket.on('driver:online', async () => {
    try {
      const driverId = await resolveDriverId();
      if (!driverId) {
        socket.emit('driver:status', { online: false, error: 'Driver profile not found' });
        return;
      }

      const redis = getRedis();
      await redis.sadd(DRIVER_ONLINE_SET, driverId);
      await redis.setex(DRIVER_SOCKET_KEY(driverId), 3600, socket.id);

      logger.info(`Driver online: driverId=${driverId} userId=${userId} socketId=${socket.id}`);

      // Verify it was stored
      const isMember = await redis.sismember(DRIVER_ONLINE_SET, driverId);
      logger.info(`Redis verify: ${driverId} in drivers:online = ${isMember}`);

      socket.emit('driver:status', { online: true });
    } catch (err) { logger.error('driver:online error', err); }
  });

  // ─── Go offline ────────────────────────────────────────────────────────
  socket.on('driver:offline', async () => {
    const driverId = await resolveDriverId();
    if (driverId) await _driverOffline(driverId);
    socket.emit('driver:status', { online: false });
  });

  socket.on('disconnect', async () => {
    const driverId = driverDocId; // use cached, don't query DB on disconnect
    if (driverId) await _driverOffline(driverId);
  });

  // ─── Location updates ─────────────────────────────────────────────────
  socket.on('driver:location', async ({ orderId, lat, lng, bearing, speed } = {}) => {
    if (lat == null || lng == null) return;
    try {
      const driverId = await resolveDriverId();
      if (!driverId) return;

      const redis = getRedis();
      const locationData = { lat, lng, bearing: bearing || 0, speed: speed || 0, ts: Date.now() };
      await redis.setex(DRIVER_LOCATION_KEY(driverId), 600, JSON.stringify(locationData));

      if (!orderId) return;

      const { default: Order } = await import('../models/Order.js');
      const order = await Order.findById(orderId).select('deliveryAddress status').lean();
      if (!order) return;

      let eta = null;
      try {
        eta = await getETA(
          { lat, lng },
          { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng }
        );
      } catch { /* ETA optional */ }

      io.to(`order:${orderId}`).emit('tracking:update', {
        orderId, lat, lng,
        bearing: bearing || 0,
        speed: speed || 0,
        eta,
        ts: Date.now(),
      });
    } catch (err) { logger.error('driver:location error', err); }
  });

  // ─── Accept delivery — FIRST-ACCEPT-WINS via Redis lock ───────────────
  socket.on('delivery:accepted', async ({ orderId } = {}) => {
    if (!orderId) return;
    try {
      const driverId = await resolveDriverId();
      if (!driverId) return;

      const redis = getRedis();
      const lockKey = `${ACCEPT_LOCK_PREFIX}${orderId}`;

      // Atomic SET NX — only the first driver to set this key wins
      const acquired = await redis.set(lockKey, driverId, 'NX', 'EX', 60);
      if (!acquired) {
        socket.emit('delivery:accepted:failed', {
          orderId,
          reason: 'already_accepted',
          message: 'This order was already accepted by another driver.',
        });
        logger.info(`Driver ${driverId} tried to accept order ${orderId} but lock already held`);
        return;
      }

      const { default: Order } = await import('../models/Order.js');

      // Double-check no driver is assigned yet
      const existingOrder = await Order.findById(orderId).select('driverId status').lean();
      if (existingOrder?.driverId) {
        await redis.del(lockKey);
        socket.emit('delivery:accepted:failed', {
          orderId,
          reason: 'already_accepted',
          message: 'This order was already accepted by another driver.',
        });
        return;
      }

      // Assign the driver (using Driver._id, not User._id)
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          driverId,
          status: 'DRIVER_ASSIGNED',
          $push: {
            timeline: {
              status: 'DRIVER_ASSIGNED',
              at: new Date(),
              actorId: driverId,
              actorType: 'driver',
              note: `Driver ${driverId} accepted`,
            },
          },
        },
        { new: true }
      ).populate('driverId', 'name photo vehicle rating phone').lean();

      if (!order) {
        await redis.del(lockKey);
        return;
      }

      // Notify order room (customer + restaurant)
      io.to(`order:${orderId}`).emit('order:status', {
        orderId,
        status: 'DRIVER_ASSIGNED',
        driver: order.driverId,
      });

      // Confirm to the accepting driver
      socket.emit('delivery:confirmed', { orderId, order });

      // Revoke offer from all other drivers
      const { revokeOfferFromOtherDrivers } = await import('../services/dispatch.js');
      await revokeOfferFromOtherDrivers(orderId, driverId);

      logger.info(`Driver ${driverId} accepted order ${orderId} — offer revoked from others`);
    } catch (err) { logger.error('delivery:accepted error', err); }
  });

  // ─── Decline delivery ──────────────────────────────────────────────────
  socket.on('delivery:declined', async ({ orderId } = {}) => {
    if (!orderId) return;
    const driverId = await resolveDriverId();
    logger.info(`Driver ${driverId} declined order ${orderId}`);
    // In broadcast model, no action needed — offer stays live for others
  });

  // ─── Pickup confirmed — driver collected order from restaurant ─────────
  socket.on('delivery:picked-up', async ({ orderId } = {}) => {
    if (!orderId) return;
    try {
      const driverId = await resolveDriverId();
      if (!driverId) return;

      const { default: Order } = await import('../models/Order.js');
      const order = await Order.findById(orderId);
      if (!order) return;
      if (order.driverId?.toString() !== driverId) {
        socket.emit('error', { message: 'You are not assigned to this order' });
        return;
      }

      if (!['DRIVER_ASSIGNED', 'READY'].includes(order.status)) {
        socket.emit('error', { message: `Cannot pick up order with status: ${order.status}` });
        return;
      }

      order.status = 'ON_WAY';
      order.pickedUpAt = new Date();
      order.timeline.push({
        status: 'ON_WAY',
        actorId: driverId,
        actorType: 'driver',
        note: 'Driver collected order from restaurant',
      });
      await order.save();

      // Notify customer + restaurant
      io.to(`order:${orderId}`).emit('order:status', {
        orderId,
        status: 'ON_WAY',
        pickedUpAt: order.pickedUpAt,
      });

      // Confirm to driver
      socket.emit('delivery:pickup-confirmed', { orderId, status: 'ON_WAY' });

      logger.info(`Driver ${driverId} picked up order ${orderId} — status ON_WAY`);

      try {
        const { notifyOrderEvent } = await import('../services/notificationService.js');
        await notifyOrderEvent(order, 'order_on_way', {});
      } catch {}
    } catch (err) { logger.error('delivery:picked-up error', err); }
  });

  // ─── Driver joins order room (to receive status updates) ───────────────
  socket.on('driver:join-order', ({ orderId } = {}) => {
    if (!orderId) return;
    socket.join(`order:${orderId}`);
    logger.info(`Driver userId=${userId} joined order room: order:${orderId}`);
  });

  socket.on('driver:leave-order', ({ orderId } = {}) => {
    if (!orderId) return;
    socket.leave(`order:${orderId}`);
  });
}

async function _driverOffline(driverId) {
  try {
    const redis = getRedis();
    await redis.srem(DRIVER_ONLINE_SET, driverId);
    await redis.del(DRIVER_SOCKET_KEY(driverId));
    logger.info(`Driver offline: driverId=${driverId}`);
  } catch (err) { logger.error('_driverOffline error', err); }
}

export async function getDriverSocketId(driverId) {
  return getRedis().get(DRIVER_SOCKET_KEY(driverId));
}

export async function getOnlineDrivers() {
  return getRedis().smembers('drivers:online');
}