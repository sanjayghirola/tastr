import Driver from '../models/Driver.js';
import Order from '../models/Order.js';
import { getIO } from '../sockets/index.js';
import { logger } from '../utils/logger.js';

// Clustering config (in production stored in settings collection)
const CLUSTER_CONFIG = {
  radiusKm:    3,
  maxDrops:    4,
  timeWindowMs:120_000, // 2 minutes
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export async function runRouteClustering() {
  try {
    const now = new Date();
    const windowStart = new Date(now - CLUSTER_CONFIG.timeWindowMs);

    // Find orders awaiting driver pickup in last 2 mins
    const pendingOrders = await Order.find({
      status: 'ready_for_pickup',
      driverId: null,
      createdAt: { $gte: windowStart },
    }).populate('restaurantId', 'address name').lean();

    if (pendingOrders.length < 2) return;

    // Group by approximate zone (0.5° lat/lng grid)
    const zones = {};
    for (const order of pendingOrders) {
      const lat = order.restaurantId?.address?.lat;
      const lng = order.restaurantId?.address?.lng;
      if (!lat || !lng) continue;
      const key = `${Math.round(lat * 2) / 2},${Math.round(lng * 2) / 2}`;
      if (!zones[key]) zones[key] = [];
      zones[key].push(order);
    }

    // Find active online drivers
    const activeDrivers = await Driver.find({ isOnline: true, status: 'active' })
      .populate('userId', 'name').lean();

    const io = getIO();

    for (const [zone, orders] of Object.entries(zones)) {
      if (orders.length < 2) continue;
      const cluster = orders.slice(0, CLUSTER_CONFIG.maxDrops);

      const [zoneLat, zoneLng] = zone.split(',').map(Number);

      // Find nearby drivers
      const nearbyDrivers = activeDrivers.filter(d => {
        if (!d.currentLat || !d.currentLng) return false;
        return haversineKm(d.currentLat, d.currentLng, zoneLat, zoneLng) <= CLUSTER_CONFIG.radiusKm;
      });

      if (!nearbyDrivers.length) continue;

      // Emit multi-drop-route to eligible drivers
      for (const driver of nearbyDrivers) {
        io?.to(`driver:${driver._id}`).emit('multi-drop-route', {
          orders: cluster.map(o => ({
            orderId:    o._id,
            restaurant: o.restaurantId?.name,
            address:    o.deliveryAddress?.line1,
            total:      o.total,
          })),
          zone,
          expiresAt: new Date(Date.now() + 30_000), // 30s to accept
        });
      }

      logger.info(`Route clustering: zone ${zone} — ${cluster.length} drops, ${nearbyDrivers.length} drivers notified`);
    }
  } catch (err) {
    logger.error('Route clustering error:', err.message);
  }
}

export function registerClusteringJob(agenda) {
  agenda.define('route-clustering', async () => { await runRouteClustering(); });
  agenda.every('2 minutes', 'route-clustering');
  logger.info('✅ Route clustering job registered');
}
