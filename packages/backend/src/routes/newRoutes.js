/**
 * NEW ROUTES — add these to your Express app.
 *
 * Usage in your main server file:
 *   import newRoutes from './routes/newRoutes.js';
 *   app.use(newRoutes);
 *
 * Or merge individual route groups into your existing route files.
 */

import { Router } from 'express';

// Controllers
import { getPricingConfig, updatePricingConfig } from '../controllers/platformConfigController.js';
import { getActiveAgreement, acceptAgreement, createAgreement, listAcceptances } from '../controllers/agreementController.js';
import { getRevenueStreams, getSettlementSummary, getRestaurantCommissionReport } from '../controllers/revenueReportController.js';
import { triggerSettlement } from '../jobs/weeklySettlement.js';
import { getRestaurantWallet, getDriverWallet, getRestaurantPaymentSummary } from '../controllers/walletController.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES (require admin auth middleware)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Platform Pricing & Commission ──────────────────────────────────────────
router.get ('/admin/platform-config/pricing', /* adminAuth, */ getPricingConfig);
router.put ('/admin/platform-config/pricing', /* adminAuth, */ updatePricingConfig);

// ─── Agreements (admin management) ──────────────────────────────────────────
router.post('/admin/agreements',                   /* adminAuth, */ createAgreement);
router.get ('/admin/agreements/:type/acceptances',  /* adminAuth, */ listAcceptances);

// ─── Revenue Reports ────────────────────────────────────────────────────────
router.get ('/admin/reports/revenue-streams',               /* adminAuth, */ getRevenueStreams);
router.get ('/admin/reports/settlements',                    /* adminAuth, */ getSettlementSummary);
router.get ('/admin/reports/restaurant/:id/commission',      /* adminAuth, */ getRestaurantCommissionReport);

// ─── Manual Settlement Trigger ──────────────────────────────────────────────
router.post('/admin/settlements/trigger', /* adminAuth, */ triggerSettlement);


// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC / AUTH ROUTES (agreement serving)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Agreements (public-facing) ─────────────────────────────────────────────
router.get ('/agreements/:type',        getActiveAgreement);
router.post('/agreements/:type/accept', /* auth, */ acceptAgreement);


// ═══════════════════════════════════════════════════════════════════════════════
// RESTAURANT ROUTES (require restaurant auth middleware)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Restaurant Wallet & Payments ───────────────────────────────────────────
router.get('/restaurants/payments/wallet',  /* restaurantAuth, */ getRestaurantWallet);
router.get('/restaurants/payments/summary', /* restaurantAuth, */ getRestaurantPaymentSummary);


// ═══════════════════════════════════════════════════════════════════════════════
// DRIVER ROUTES (require driver auth middleware)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Driver Wallet ──────────────────────────────────────────────────────────
router.get('/drivers/wallet', /* driverAuth, */ getDriverWallet);


export default router;
