import AuditLog from '../models/AuditLog.js';

/**
 * Factory: creates audit-logging middleware for admin actions.
 * Captures before/after snapshots for state changes.
 * Usage: router.patch('/:id/status', auditAction('UPDATE_RESTAURANT_STATUS', 'Restaurant'), controller)
 */
export function auditAction(action, targetType, opts = {}) {
  return async (req, res, next) => {
    // Capture before-state if model provided
    let before = null;
    if (opts.model && req.params?.id) {
      try {
        before = await opts.model.findById(req.params.id).lean();
      } catch { /* non-fatal */ }
    }

    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      // Only log successful mutations
      if (res.statusCode < 400 && (req.admin || req.user)) {
        try {
          await AuditLog.create({
            adminId:    req.admin?._id || req.user?._id,
            adminName:  req.admin?.name || req.user?.name || 'unknown',
            action,
            targetType,
            targetId:   req.params?.id || body?.data?._id || body?.restaurant?._id || body?.driver?._id || body?.user?._id,
            before:     before ? JSON.parse(JSON.stringify(before)) : undefined,
            after:      body?.data || body?.restaurant || body?.driver || body?.user || body?.order || body,
            ip:         req.ip,
            userAgent:  req.headers['user-agent'],
            notes:      req.body?.reason || req.body?.note || undefined,
          });
        } catch { /* non-fatal */ }
      }
      return originalJson(body);
    };
    next();
  };
}
