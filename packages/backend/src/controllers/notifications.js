import NotifBlast from '../models/Notification.js';
import User from '../models/User.js';
import { NOTIF_SEGMENT } from '@tastr/shared';
import { notifyMany } from '../services/notificationService.js';

// POST /api/notifications/blast
export async function sendBlast(req, res, next) {
  try {
    const { title, body, segment = NOTIF_SEGMENT.ALL, restaurantId, scheduledAt } = req.body;
    const sentBy   = req.admin?._id || req.user?._id;
    const sentByType = req.admin ? 'admin' : 'restaurant';

    // Count recipients
    const filter = { status: 'ACTIVE' };
    if (segment === NOTIF_SEGMENT.STUDENTS)   filter.isStudentVerified = true;
    if (segment === NOTIF_SEGMENT.TASTR_PLUS) filter['subscription'] = { $exists: true };
    const recipientCount = await User.countDocuments(filter);

    const blast = await NotifBlast.create({
      title, body, segment, restaurantId, sentBy, sentByType,
      scheduledAt: scheduledAt || null,
      status: scheduledAt ? 'scheduled' : 'sent',
      sentAt: scheduledAt ? null : new Date(),
      recipientCount,
    });

    // Deliver to in-app notifications for non-scheduled blasts
    if (!scheduledAt) {
      try {
        const users = await User.find(filter).select('_id').lean();
        const userIds = users.map(u => u._id.toString());
        await notifyMany(userIds, { title, body, type: 'promo', meta: { blastId: blast._id.toString() } });
      } catch (err) {
        // non-fatal — blast record still created
      }
    }
    res.json({ success: true, blast });
  } catch (err) { next(err); }
}

// GET /api/notifications/blasts
export async function listBlasts(req, res, next) {
  try {
    const filter = {};
    if (req.user) filter.sentBy = req.user._id;
    const blasts = await NotifBlast.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, blasts });
  } catch (err) { next(err); }
}

// Admin: GET /api/admin/notifications/blasts
export async function adminListBlasts(req, res, next) {
  try {
    const blasts = await NotifBlast.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, blasts });
  } catch (err) { next(err); }
}
