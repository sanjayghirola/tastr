import SystemLog from '../models/SystemLog.js';

/**
 * Log error responses (4xx/5xx) to SystemLog for admin querying.
 * Does NOT log successful requests to avoid DB bloat.
 */
export function requestLogger(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    if (res.statusCode >= 400) {
      SystemLog.create({
        level: res.statusCode >= 500 ? 'error' : 'warn',
        message: body?.message || `${req.method} ${req.path} → ${res.statusCode}`,
        meta: { body: typeof body === 'object' ? body : undefined },
        ip: req.ip,
        userId: req.user?._id || req.admin?._id,
        path: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
      }).catch(() => {});
    }
    return originalJson(body);
  };
  next();
}
