import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { ROLES } from '@tastr/shared';
import { sendBlast, listBlasts, adminListBlasts } from '../controllers/notifications.js';
import { auditAction } from '../middleware/audit.js';

const router = Router();
router.post('/blast',       verifyToken, auditAction('SEND_NOTIFICATION_BLAST', 'Notification'), sendBlast);
router.get('/blasts',       verifyToken, listBlasts);
router.get('/admin/blasts', verifyToken, requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), adminListBlasts);
export default router;
