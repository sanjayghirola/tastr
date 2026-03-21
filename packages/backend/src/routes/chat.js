import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getChatHistory, markChatRead } from '../controllers/chat.js';

const router = express.Router();

// GET  /api/chat/:orderId/history
router.get('/:orderId/history', authenticate, getChatHistory);

// PATCH /api/chat/:orderId/read
router.patch('/:orderId/read', authenticate, markChatRead);

export default router;
