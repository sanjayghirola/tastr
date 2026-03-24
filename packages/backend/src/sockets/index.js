import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { verifyAccessToken } from '../services/auth.js';
import { registerOrderHandlers } from './orderHandlers.js';
import { registerDriverHandlers } from './driverHandlers.js';
import { registerChatHandlers } from './chatHandlers.js';

let io;

/**
 * Socket auth middleware — verifies JWT and extracts user info.
 *
 * FIXED: Uses verifyAccessToken (JWT_ACCESS_SECRET) instead of JWT_SECRET.
 * FIXED: Maps JWT 'sub' field → 'id' for all socket handlers.
 */
function socketAuthMiddleware(socket, next) {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = verifyAccessToken(token);
    // JWT payload is { sub, role, iat, exp }
    // Map to { id, role } for consistent access across all handlers
    socket.user = {
      id:   decoded.sub,
      role: decoded.role,
    };
    next();
  } catch (err) {
    logger.warn(`Socket auth failed: ${err.message}`);
    next(new Error('Invalid token'));
  }
}

export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (process.env.CLIENT_URLS || '').split(',').map(u => u.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ─── Redis pub/sub adapter for multi-instance ──────────────────────────
  try {
    const pubClient = getRedis().duplicate();
    const subClient = getRedis().duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.io Redis adapter connected');
  } catch (err) {
    logger.error('Socket.io Redis adapter error', err);
  }

  // ─── Auth middleware — root namespace ───────────────────────────────────
  io.use(socketAuthMiddleware);

  // ─── Namespaces ────────────────────────────────────────────────────────
  const customerNs   = io.of('/customer');
  const restaurantNs = io.of('/restaurant');
  const driverNs     = io.of('/driver');

  // Apply same auth middleware to all namespaces
  [customerNs, restaurantNs, driverNs].forEach(ns => {
    ns.use(socketAuthMiddleware);
  });

  // ─── Root namespace connections ────────────────────────────────────────
  io.on('connection', socket => {
    logger.info(`Socket connected: ${socket.id} user=${socket.user?.id} role=${socket.user?.role}`);
    registerOrderHandlers(io, socket);
    registerChatHandlers(io, socket);

    socket.on('disconnect', reason => {
      logger.info(`Socket disconnected: ${socket.id} reason=${reason}`);
    });
  });

  // ─── Driver namespace ──────────────────────────────────────────────────
  driverNs.on('connection', socket => {
    logger.info(`Driver socket connected: ${socket.id} userId=${socket.user?.id}`);
    registerDriverHandlers(io, driverNs, socket);
  });

  // ─── Restaurant namespace ──────────────────────────────────────────────
  restaurantNs.on('connection', socket => {
    const restaurantId = socket.handshake.query?.restaurantId;
    if (restaurantId) {
      socket.join(`restaurant:${restaurantId}`);
      logger.info(`Restaurant ${restaurantId} joined namespace`);
    }
  });

  logger.info('Socket.io server initialised');
  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialised');
  return io;
}

/**
 * Emit order status update to all clients in the order room
 */
export function emitOrderStatus(orderId, payload) {
  if (!io) return;
  io.to(`order:${orderId}`).emit('order:status', payload);
}

/**
 * Emit new order to restaurant namespace room
 */
export function emitNewOrder(restaurantId, order) {
  if (!io) return;
  io.of('/restaurant').to(`restaurant:${restaurantId}`).emit('new:order', order);
}

/**
 * Emit delivery offer to a specific driver
 */
export function emitDeliveryOffer(driverSocketId, offer) {
  if (!io) return;
  io.of('/driver').to(driverSocketId).emit('new:delivery-offer', offer);
}