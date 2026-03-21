import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { getETA } from '../services/directions.js';

const DRIVER_ONLINE_SET   = 'drivers:online';
const DRIVER_SOCKET_KEY   = id => `driver:socket:${id}`;
const DRIVER_LOCATION_KEY = id => `driver:location:${id}`;
const OFFER_TIMEOUT_KEY   = (driverId, orderId) => `offer:${driverId}:${orderId}`;

export function registerDriverHandlers(io, driverNs, socket) {
  const driverId = socket.user?.id;

  socket.on('driver:online', async () => {
    try {
      const redis = getRedis();
      await redis.sadd(DRIVER_ONLINE_SET, driverId);
      await redis.setex(DRIVER_SOCKET_KEY(driverId), 3600, socket.id);
      logger.info(`Driver ${driverId} is online`);
      socket.emit('driver:status', { online: true });
    } catch (err) { logger.error('driver:online error', err); }
  });

  socket.on('driver:offline', async () => {
    await _driverOffline(driverId);
    socket.emit('driver:status', { online: false });
  });

  socket.on('disconnect', async () => { await _driverOffline(driverId); });

  socket.on('driver:location', async ({ orderId, lat, lng, bearing, speed } = {}) => {
    if (!orderId || lat == null || lng == null) return;
    try {
      const redis = getRedis();
      const locationData = { lat, lng, bearing: bearing || 0, speed: speed || 0, ts: Date.now() };
      await redis.setex(DRIVER_LOCATION_KEY(driverId), 600, JSON.stringify(locationData));

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

  socket.on('delivery:accepted', async ({ orderId } = {}) => {
    if (!orderId) return;
    try {
      await getRedis().del(OFFER_TIMEOUT_KEY(driverId, orderId));

      const { default: Order } = await import('../models/Order.js');
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          driverId,
          status: 'driver_assigned',
          $push: { timeline: { status: 'driver_assigned', at: new Date(), note: `Driver ${driverId} accepted` } },
        },
        { new: true }
      ).populate('driverId', 'name photo vehicle rating phone').lean();

      if (!order) return;

      io.to(`order:${orderId}`).emit('order:status', {
        orderId,
        status: 'driver_assigned',
        driver: order.driverId,
      });
      socket.emit('delivery:confirmed', { orderId });
      logger.info(`Driver ${driverId} accepted order ${orderId}`);
    } catch (err) { logger.error('delivery:accepted error', err); }
  });

  socket.on('delivery:declined', async ({ orderId } = {}) => {
    if (!orderId) return;
    try {
      await getRedis().del(OFFER_TIMEOUT_KEY(driverId, orderId));
      logger.info(`Driver ${driverId} declined order ${orderId}`);
      const { dispatchOrder } = await import('../services/dispatch.js');
      await dispatchOrder(orderId, [driverId]);
    } catch (err) { logger.error('delivery:declined error', err); }
  });
}

async function _driverOffline(driverId) {
  try {
    const redis = getRedis();
    await redis.srem(DRIVER_ONLINE_SET, driverId);
    await redis.del(DRIVER_SOCKET_KEY(driverId));
    logger.info(`Driver ${driverId} is offline`);
  } catch (err) { logger.error('_driverOffline error', err); }
}

export async function getDriverSocketId(driverId) {
  return getRedis().get(DRIVER_SOCKET_KEY(driverId));
}

export async function getOnlineDrivers() {
  return getRedis().smembers('drivers:online');
}
