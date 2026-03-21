import crypto from 'crypto';

/**
 * Generates a unique 8-character alphanumeric referral code
 */
export function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Generates a random 8-char invite code for group orders
 */
export function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Calculates distance in km between two lat/lng points (Haversine)
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Paginates a mongoose query
 */
export function paginate(query, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
}

/**
 * Build pagination meta
 */
export function paginationMeta(total, page, limit) {
  return {
    total,
    page:       Number(page),
    limit:      Number(limit),
    totalPages: Math.ceil(total / limit),
    hasNext:    page * limit < total,
    hasPrev:    page > 1,
  };
}

/**
 * Async wrapper — removes try/catch boilerplate in controllers
 */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
