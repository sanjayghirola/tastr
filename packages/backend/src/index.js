import 'dotenv/config';
import * as Sentry from '@sentry/node';
import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';

import { connectDB } from './config/db.js';
import { connectRedis } from './config/redis.js';
import { initCloudinary } from './config/cloudinary.js';
import { initEmail } from './services/email.js';
import { initStripe } from './config/stripe.js';
import { initPassport } from './config/passport.js';
import { setupSwagger } from './config/swagger.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/error.js';
import { logger } from './utils/logger.js';

import authRoutes          from './routes/auth.js';
import userRoutes          from './routes/users.js';
import adminRoutes         from './routes/admin.js';
import restaurantRoutes    from './routes/restaurants.js';
import restaurantsPublic   from './routes/restaurantsPublic.js';
import menuRoutes          from './routes/menu.js';
import searchRoutes        from './routes/search.js';
import { bannersRouter, categoriesRouter } from './routes/categories.js';
import cartRoutes         from './routes/cart.js';
import ordersRoutes       from './routes/orders.js';
import paymentsRoutes     from './routes/payments.js';
import trackingRoutes     from './routes/tracking.js';
import chatRoutes         from './routes/chat.js';
import groupOrdersRoutes  from './routes/groupOrders.js';
import reviewsRoutes      from './routes/reviews.js';
import complaintsRoutes   from './routes/complaints.js';
import walletRoutes       from './routes/wallet.js';
import giftCardsRoutes    from './routes/giftCards.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import referralsRoutes    from './routes/referrals.js';
import analyticsRoutes    from './routes/analytics.js';
import staffRoutes        from './routes/staff.js';
import promosRoutes       from './routes/promos.js';
import notificationsRoutes from './routes/notifications.js';
import adminExtendedRoutes from './routes/adminExtended.js';
import studentVerifRoutes  from './routes/studentVerification.js';
import driverStoreRoutes   from './routes/driverStore.js';
import restaurantDocsRoutes from './routes/restaurantDocs.js';
import { initSocketServer } from './sockets/index.js';
import razorpayRoutes       from './routes/razorpay.js';
import notifCrudRoutes      from './routes/notificationsCrud.js';
import exportRoutes         from './routes/exports.js';
import agreementRoutes      from './routes/agreements.js';
import driverSelfRoutes     from './routes/drivers.js';
import newRoutes            from './routes/newRoutes.js';
import { initRazorpay }     from './config/razorpay.js';
import { requestLogger }    from './middleware/requestLogger.js';

// ─── Sentry init ─────────────────────────────────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.2,
  });
}

const app = express();

// ─── Security & parsing middleware ───────────────────────────────────────────
app.use(Sentry.Handlers.requestHandler());
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return cb(null, true);
    // In development, allow any localhost regardless of port
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }
    const allowed = (process.env.CLIENT_URLS || '').split(',').map(u => u.trim());
    if (allowed.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
// Skip JSON parsing for Stripe webhook (needs raw buffer)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Global rate limiter ─────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Passport ────────────────────────────────────────────────────────────────
initPassport(app);

// ─── Swagger docs ────────────────────────────────────────────────────────────
setupSwagger(app);

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, ts: new Date().toISOString() });
});

// ─── API routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/admin',         adminRoutes);
// PUBLIC routes first — GET /api/restaurants must not be blocked by protected restaurantRoutes
app.use('/api/restaurants',   restaurantsPublic);
app.use('/api/restaurants',   restaurantRoutes);
app.use('/api/menu',          menuRoutes);
app.use('/api/search',        searchRoutes);
app.use('/api/cart',          cartRoutes);
app.use('/api/orders',        ordersRoutes);
app.use('/api/payments',      paymentsRoutes);
app.use('/api/razorpay',      razorpayRoutes);
app.use('/api/tracking',      trackingRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/group-orders',  groupOrdersRoutes);
app.use('/api/reviews',       reviewsRoutes);
app.use('/api/complaints',    complaintsRoutes);
app.use('/api/wallet',        walletRoutes);
app.use('/api/gift-cards',    giftCardsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/users/referral',referralsRoutes);
app.use('/api',              analyticsRoutes);
app.use('/api/restaurants/staff', staffRoutes);
app.use('/api/promos',       promosRoutes);
app.use('/api/notifications',notificationsRoutes);
app.use('/api/admin',        adminExtendedRoutes);
app.use('/api/banners',       bannersRouter);
app.use('/api/student-verification', studentVerifRoutes);
app.use('/api/driver-store',  driverStoreRoutes);
app.use('/api',               restaurantDocsRoutes);
app.use('/api/categories',    categoriesRouter);
app.use('/api/notifications/templates', notifCrudRoutes);
app.use('/api/exports',       exportRoutes);
app.use('/api/agreements',   agreementRoutes);
app.use('/api/drivers',      driverSelfRoutes);
app.use('/api',              newRoutes);

// ─── Request logger (system logs) ────────────────────────────────────────────
app.use(requestLogger);

// ─── Error handlers ──────────────────────────────────────────────────────────
app.use(Sentry.Handlers.errorHandler());
app.use(notFound);
app.use(errorHandler);

// ─── Boot ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;
const httpServer = createServer(app);

async function boot() {
  try {
    await connectDB();
    await connectRedis();   // non-fatal — logs warning if unavailable
    initCloudinary();
    initEmail();
    initStripe();
  try { initRazorpay(); } catch (e) { logger.warn('Razorpay init skipped:', e.message); }

    // Initialise Socket.io (must be after connectRedis so Redis adapter can connect)
    initSocketServer(httpServer);

    // ─── Dispatch polling (replaces fragile setTimeout) ──────────────────
    try {
      const { processExpiredOffers, processDispatchRetries } = await import('./services/dispatch.js');
      // Check for expired offers every 5 seconds
      setInterval(() => processExpiredOffers().catch(e => logger.error('Offer poll error', e)), 5000);
      // Check for dispatch retries (no-driver orders) every 15 seconds
      setInterval(() => processDispatchRetries().catch(e => logger.error('Retry poll error', e)), 15000);
      logger.info('Dispatch polling started (offers: 5s, retries: 15s)');
    } catch (err) {
      logger.warn('Dispatch polling init failed:', err.message);
    }

    httpServer.listen(PORT, () => {
      logger.info(`🚀  Tastr API running on port ${PORT} [${process.env.NODE_ENV}]`);
      logger.info(`📚  Swagger docs: http://localhost:${PORT}/api/docs`);
      logger.info(`🔌  Socket.io listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Boot failed', err);
    process.exit(1);
  }
}

boot();

export default app;