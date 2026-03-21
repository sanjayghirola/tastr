import { Router } from 'express';
import { param } from 'express-validator';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/notificationsCrud.js';

const router = Router();
router.use(verifyToken);

router.get('/',                          ctrl.listNotifications);
router.get('/unread-count',              ctrl.unreadCount);
router.patch('/:id/read', [param('id').isMongoId()], validate, ctrl.markRead);
router.patch('/read-all',                ctrl.markAllRead);
router.delete('/:id',     [param('id').isMongoId()], validate, ctrl.deleteNotification);

export default router;
