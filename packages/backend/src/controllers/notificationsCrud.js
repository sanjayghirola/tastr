import UserNotification from '../models/UserNotification.js';
import { paginationMeta } from '../utils/helpers.js';

// ─── GET /api/notifications — list user's notifications (paginated) ───────────
export async function listNotifications(req, res, next) {
  try {
    const { page = 1, limit = 20, type, unreadOnly } = req.query;
    const filter = { userId: req.user._id };
    if (type) filter.type = type;
    if (unreadOnly === 'true') filter.isRead = false;

    const [notifications, total] = await Promise.all([
      UserNotification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      UserNotification.countDocuments(filter),
    ]);

    res.json({ success: true, notifications, ...paginationMeta(total, Number(page), Number(limit)) });
  } catch (err) { next(err); }
}

// ─── GET /api/notifications/unread-count — unread badge count ─────────────────
export async function unreadCount(req, res, next) {
  try {
    const count = await UserNotification.countDocuments({ userId: req.user._id, isRead: false });
    res.json({ success: true, count });
  } catch (err) { next(err); }
}

// ─── PATCH /api/notifications/:id/read — mark one as read ────────────────────
export async function markRead(req, res, next) {
  try {
    await UserNotification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
    );
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ─── PATCH /api/notifications/read-all — mark all as read ────────────────────
export async function markAllRead(req, res, next) {
  try {
    await UserNotification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true },
    );
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ─── DELETE /api/notifications/:id — delete one notification ──────────────────
export async function deleteNotification(req, res, next) {
  try {
    await UserNotification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) { next(err); }
}
