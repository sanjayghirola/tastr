import { verifyAccessToken } from '../services/auth.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import { ERROR_CODES, ROLES } from '@tastr/shared';

/**
 * verifyToken — attaches req.user (or req.admin) from JWT
 */
export async function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, code: ERROR_CODES.UNAUTHORIZED, message: 'No token provided' });
    }

    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    // Admin token
    if (payload.role === ROLES.SUPER_ADMIN || payload.role === ROLES.SUB_ADMIN) {
      const admin = await Admin.findById(payload.sub).lean();
      if (!admin || admin.status === 'SUSPENDED') {
        return res.status(401).json({ success: false, code: ERROR_CODES.UNAUTHORIZED, message: 'Account not active' });
      }
      req.admin = admin;
      req.user  = admin; // unified access
      req.userType = 'admin';
    } else {
      const user = await User.findById(payload.sub).lean();
      if (!user || user.status === 'SUSPENDED') {
        return res.status(401).json({ success: false, code: ERROR_CODES.UNAUTHORIZED, message: 'Account not active' });
      }
      req.user     = user;
      req.userType = 'user';
    }

    req.tokenPayload = payload;
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError'
      ? ERROR_CODES.TOKEN_EXPIRED
      : ERROR_CODES.TOKEN_INVALID;
    return res.status(401).json({ success: false, code, message: 'Invalid or expired token' });
  }
}

/**
 * requireRole(...roles) — factory that returns middleware
 * Usage: requireRole(ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN)
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, code: ERROR_CODES.UNAUTHORIZED, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, code: ERROR_CODES.FORBIDDEN, message: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * optionalAuth — attaches req.user if token present, does not fail if absent
 */
export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();
    const payload = verifyAccessToken(header.slice(7));
    const user = await User.findById(payload.sub).lean();
    if (user) req.user = user;
  } catch {
    // silently ignore invalid token on optional routes
  }
  next();
}

// Alias for consistency across routes
export const authenticate = verifyToken;
