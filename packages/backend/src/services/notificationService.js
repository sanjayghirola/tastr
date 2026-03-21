import UserNotification from '../models/UserNotification.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

/**
 * Create an in-app notification for a user.
 * This is the central place to dispatch notifications.
 * FCM/Web Push can be added here later.
 */
export async function notify(userId, { title, body, type = 'info', meta = {} }) {
  try {
    const notif = await UserNotification.create({ userId, title, body, type, meta });

    // TODO: FCM push delivery
    // Send FCM push when Firebase Admin SDK is configured
    try {
      const admin = await import('firebase-admin');
      const app = admin.apps?.length ? admin.app() : null;
      if (app) {
        const user = await User.findById(userId).select('fcmToken notifPrefs').lean();
        if (user?.fcmToken && user?.notifPrefs?.[type] !== false) {
          await admin.messaging().send({
            token: user.fcmToken,
            notification: { title, body },
            data: { ...Object.fromEntries(Object.entries(meta).map(([k,v]) => [k, String(v)])), type },
          });
        }
      }
    } catch { /* FCM not configured or token invalid — non-fatal */ }

    // Emit via Socket.io if available
    try {
      const { getIO } = await import('../sockets/index.js');
      const io = getIO();
      io.to(`user:${userId}`).emit('notification:new', notif);
    } catch { /* socket not available */ }

    return notif;
  } catch (err) {
    logger.error('notificationService.notify failed', err);
    return null;
  }
}

/**
 * Create notifications for multiple users (e.g., blasts)
 */
export async function notifyMany(userIds, { title, body, type = 'info', meta = {} }) {
  try {
    const docs = userIds.map(userId => ({ userId, title, body, type, meta }));
    await UserNotification.insertMany(docs, { ordered: false });
  } catch (err) {
    logger.error('notificationService.notifyMany failed', err);
  }
}

/**
 * Order lifecycle notifications
 */
export async function notifyOrderEvent(order, eventType, extraData = {}) {
  const templates = {
    order_placed:    { title: 'Order confirmed', body: `Your order #${order.orderId || order._id.toString().slice(-6)} has been placed.` },
    order_accepted:  { title: 'Order accepted', body: `The restaurant is now preparing your order.` },
    order_preparing: { title: 'Being prepared', body: `Your food is being prepared.` },
    driver_assigned: { title: 'Driver assigned', body: `${extraData.driverName || 'A driver'} is heading to the restaurant.` },
    order_on_way:    { title: 'On the way!', body: `Your order is on its way to you.` },
    order_delivered:  { title: 'Delivered!', body: `Your order has been delivered. Enjoy!` },
    order_cancelled:  { title: 'Order cancelled', body: `Your order has been cancelled. ${extraData.reason || ''}` },
    payment_failed:   { title: 'Payment failed', body: `Payment for your order failed. Please try again.` },
    refund_issued:    { title: 'Refund issued', body: `A refund of ${extraData.amount || ''} has been initiated.` },
  };

  const tmpl = templates[eventType];
  if (!tmpl) return;

  await notify(order.customerId?.toString?.() || order.customerId, {
    title: tmpl.title,
    body: tmpl.body,
    type: 'order',
    meta: { orderId: order._id.toString(), event: eventType, ...extraData },
  });
}
