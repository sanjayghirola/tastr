import ChatMessage from '../models/ChatMessage.js';
import { logger } from '../utils/logger.js';

export function registerChatHandlers(io, socket) {
  const userId = socket.user?.id;

  // ─── Send a chat message ─────────────────────────────────────────────────
  socket.on('chat:message', async ({ orderId, text } = {}) => {
    if (!orderId || !text?.trim()) return;

    try {
      const msg = await ChatMessage.create({
        orderId,
        senderId: userId,
        senderRole: socket.user?.role || 'customer',
        text: text.trim(),
      });

      const payload = {
        _id:        msg._id,
        orderId,
        senderId:   userId,
        senderRole: msg.senderRole,
        text:       msg.text,
        createdAt:  msg.createdAt,
        read:       false,
      };

      // Broadcast to entire order room (both customer and driver)
      io.to(`order:${orderId}`).emit('chat:message', payload);
    } catch (err) {
      logger.error('chat:message error', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // ─── Typing indicator ────────────────────────────────────────────────────
  socket.on('chat:typing', ({ orderId, isTyping } = {}) => {
    if (!orderId) return;
    socket.to(`order:${orderId}`).emit('chat:typing', {
      orderId,
      senderId: userId,
      isTyping: Boolean(isTyping),
    });
  });

  // ─── Mark messages read ──────────────────────────────────────────────────
  socket.on('chat:read', async ({ orderId } = {}) => {
    if (!orderId) return;
    try {
      await ChatMessage.updateMany(
        { orderId, senderId: { $ne: userId }, read: false },
        { read: true }
      );
      socket.to(`order:${orderId}`).emit('chat:read', { orderId, readBy: userId });
    } catch (err) {
      logger.error('chat:read error', err);
    }
  });
}
