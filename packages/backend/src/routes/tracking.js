import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getTrackingData, updateDriverLocation } from '../controllers/tracking.js';

const router = express.Router();

// GET  /api/tracking/:orderId — last known driver location + ETA
router.get('/:orderId', authenticate, getTrackingData);

// POST /api/tracking/driver/location — REST fallback for location update
router.post('/driver/location', authenticate, updateDriverLocation);

export default router;
