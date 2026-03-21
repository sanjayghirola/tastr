import Order from '../models/Order.js';
import { logger } from '../utils/logger.js';

export function registerOrderHandlers(io, socket) {
  /**
   * Customer/restaurant joins an order room to receive live updates
   * Client emits: join:order { orderId }
   */
  socket.on('join:order', async ({ orderId } = {}) => {
    if (!orderId) return;

    try {
      // Verify user has access to this order
      const order = await Order.findById(orderId).lean();
      if (!order) return socket.emit('error', { message: 'Order not found' });

      const userId = socket.user?.id;
      const isCustomer  = order.customerId?.toString() === userId;
      const isDriver    = order.driverId?.toString()   === userId;
      const isAdmin     = socket.user?.role === 'admin';
      const isRestaurant = socket.user?.role === 'restaurant';

      if (!isCustomer && !isDriver && !isAdmin && !isRestaurant) {
        return socket.emit('error', { message: 'Access denied' });
      }

      socket.join(`order:${orderId}`);
      logger.info(`Socket ${socket.id} joined order:${orderId}`);

      // Send current status on join
      socket.emit('order:current', {
        orderId,
        status: order.status,
        timeline: order.timeline,
        driverId: order.driverId,
      });
    } catch (err) {
      logger.error('join:order error', err);
      socket.emit('error', { message: 'Failed to join order room' });
    }
  });

  /**
   * Leave an order room
   */
  socket.on('leave:order', ({ orderId } = {}) => {
    if (orderId) {
      socket.leave(`order:${orderId}`);
      logger.info(`Socket ${socket.id} left order:${orderId}`);
    }
  });
}

/**
 * Join a group order room for live updates
 */
export function registerGroupHandlers(io, socket) {
  socket.on('join:group', ({ groupId } = {}) => {
    if (groupId) {
      socket.join(`group:${groupId}`);
    }
  });
  socket.on('leave:group', ({ groupId } = {}) => {
    if (groupId) socket.leave(`group:${groupId}`);
  });
}
