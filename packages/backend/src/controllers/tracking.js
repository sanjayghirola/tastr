import { getRedis } from '../config/redis.js';
import Order from '../models/Order.js';
import { getETA } from '../services/directions.js';
import { getIO } from '../sockets/index.js';

export async function getTrackingData(req, res, next) {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .select('driverId deliveryAddress status')
      .populate('driverId', 'name photo vehicle rating phone')
      .lean();

    if (!order) return res.status(404).json({ message: 'Order not found' });

    let driverLocation = null;
    let eta = null;

    if (order.driverId) {
      const locRaw = await getRedis().get(`driver:location:${order.driverId._id}`);
      if (locRaw) {
        driverLocation = JSON.parse(locRaw);

        // Calculate ETA from driver's last location to delivery address
        if (order.deliveryAddress?.lat && order.deliveryAddress?.lng) {
          eta = await getETA(
            { lat: driverLocation.lat, lng: driverLocation.lng },
            { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng }
          );
        }
      }
    }

    res.json({
      orderId,
      status:         order.status,
      driver:         order.driverId,
      driverLocation,
      deliveryAddress: order.deliveryAddress,
      eta,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateDriverLocation(req, res, next) {
  try {
    const driverId = req.user._id.toString();
    const { orderId, lat, lng, bearing = 0, speed = 0 } = req.body;

    if (!orderId || lat == null || lng == null) {
      return res.status(400).json({ message: 'orderId, lat and lng are required' });
    }

    const locationData = { lat, lng, bearing, speed, ts: Date.now() };
    await getRedis().setex(`driver:location:${driverId}`, 600, JSON.stringify(locationData));

    // Also emit via socket if IO is available
    try {
      const io = getIO();
      const order = await Order.findById(orderId).select('deliveryAddress').lean();
      let eta = null;
      if (order?.deliveryAddress?.lat) {
        eta = await getETA(
          { lat, lng },
          { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng }
        );
      }
      io.to(`order:${orderId}`).emit('tracking:update', {
        orderId, lat, lng, bearing, speed, eta, ts: Date.now(),
      });
    } catch {
      // Socket not available — REST fallback, that's fine
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
