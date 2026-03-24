import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import { setEx, getKey, delKey } from '../config/redis.js';
import { sendOtp } from './twilio.js';
import { generateReferralCode } from '../utils/helpers.js';
import { TOKEN_CONFIG, ROLES, ENTITY_STATUS, ERROR_CODES } from '@tastr/shared';
import { logger } from '../utils/logger.js';

// ─── Key helpers ──────────────────────────────────────────────────────────────
const otpKey      = (id) => `otp:${id}`;
const refreshKey  = (userId, jti) => `refresh:${userId}:${jti}`;

// ─── JWT helpers ──────────────────────────────────────────────────────────────
export function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: TOKEN_CONFIG.ACCESS_EXPIRY,
    algorithm: 'HS256',
  });
}

export async function signRefreshToken(userId, role) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: userId, role, jti }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: TOKEN_CONFIG.REFRESH_EXPIRY,
    algorithm: 'HS256',
  });
  // Store jti in Redis for revocation
  await setEx(refreshKey(userId, jti), 30 * 24 * 60 * 60, { valid: true });
  return token;
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export async function verifyRefreshToken(token) {
  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  try {
    const stored = await getKey(refreshKey(payload.sub, payload.jti));
    // If Redis is down (stored === null from memStore miss) but JWT is valid,
    // allow it — token revocation only works when Redis is available
    if (stored !== null && !stored?.valid) {
      throw Object.assign(new Error('Refresh token revoked'), { code: ERROR_CODES.TOKEN_INVALID });
    }
  } catch (err) {
    // Re-throw only actual revocation errors, not Redis connectivity errors
    if (err.code === ERROR_CODES.TOKEN_INVALID) throw err;
    logger.warn(`Redis unavailable during refresh token check — allowing JWT-only verification: ${err.message}`);
  }
  return payload;
}

export async function revokeRefreshToken(userId, jti) {
  await delKey(refreshKey(userId, jti));
}

// ─── OTP ──────────────────────────────────────────────────────────────────────
export async function createAndSendOtp(phone, purpose = 'verify') {
  const otp  = Math.floor(100000 + Math.random() * 900000).toString();
  const hash = await bcrypt.hash(otp, 8);
  await setEx(otpKey(`${purpose}:${phone}`), TOKEN_CONFIG.OTP_EXPIRY_SEC, { hash });

  if (process.env.NODE_ENV === 'production') {
    await sendOtp(phone, otp);
  } else {
    console.log(`[DEV OTP] ${phone} → ${otp}`); // safe dev console log
  }
}

export async function verifyOtp(phone, code, purpose = 'verify') {
  const stored = await getKey(otpKey(`${purpose}:${phone}`));
  if (!stored) throw Object.assign(new Error('OTP expired'), { code: ERROR_CODES.OTP_EXPIRED });
  const valid = await bcrypt.compare(code, stored.hash);
  if (!valid)  throw Object.assign(new Error('OTP invalid'), { code: ERROR_CODES.OTP_INVALID });
  await delKey(otpKey(`${purpose}:${phone}`));
}

// ─── Register ─────────────────────────────────────────────────────────────────
export async function registerUser({ name, email, phone, password, role }) {
  // Check uniqueness
  if (email) {
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) throw Object.assign(new Error('Email already in use'), { code: ERROR_CODES.EMAIL_TAKEN });
  }
  if (phone) {
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) throw Object.assign(new Error('Phone already in use'), { code: ERROR_CODES.PHONE_TAKEN });
  }

  // Determine role — only allow CUSTOMER or DRIVER from self-registration
  const allowedSelfRoles = [ROLES.CUSTOMER, ROLES.DRIVER];
  const finalRole = (role && allowedSelfRoles.includes(role)) ? role : ROLES.CUSTOMER;
  // Drivers start as PENDING until docs are approved
  const initialStatus = finalRole === ROLES.DRIVER ? ENTITY_STATUS.PENDING : ENTITY_STATUS.ACTIVE;

  const user = await User.create({
    name,
    email:        email?.toLowerCase(),
    phone,
    passwordHash: password, // pre-save hook hashes it
    role:         finalRole,
    status:       initialStatus,
    referralCode: generateReferralCode(),
  });

  return user;
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function loginUser({ identifier, password }) {
  // identifier = email or phone
  const isEmail = identifier.includes('@');
  const user = await User.findOne(isEmail ? { email: identifier.toLowerCase() } : { phone: identifier });

  if (!user) throw Object.assign(new Error('Invalid credentials'), { code: ERROR_CODES.INVALID_CREDENTIALS });
  if (user.status === ENTITY_STATUS.SUSPENDED) throw Object.assign(new Error('Account suspended'), { code: ERROR_CODES.ACCOUNT_SUSPENDED });

  const ok = await user.comparePassword(password);
  if (!ok) throw Object.assign(new Error('Invalid credentials'), { code: ERROR_CODES.INVALID_CREDENTIALS });

  user.lastLoginAt = new Date();
  await user.save();

  return user;
}

// ─── Admin Login ──────────────────────────────────────────────────────────────
export async function loginAdmin({ email, password }) {
  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin) throw Object.assign(new Error('Invalid credentials'), { code: ERROR_CODES.INVALID_CREDENTIALS });
  if (admin.status === 'SUSPENDED') throw Object.assign(new Error('Account suspended'), { code: ERROR_CODES.ACCOUNT_SUSPENDED });

  const ok = await admin.comparePassword(password);
  if (!ok) throw Object.assign(new Error('Invalid credentials'), { code: ERROR_CODES.INVALID_CREDENTIALS });

  admin.lastLoginAt = new Date();
  await admin.save();
  return admin;
}

// ─── Token pair helper ────────────────────────────────────────────────────────
export async function issueTokenPair(entity) {
  const accessToken  = signAccessToken({ sub: entity._id.toString(), role: entity.role });
  const refreshToken = await signRefreshToken(entity._id.toString(), entity.role);
  return { accessToken, refreshToken, expiresIn: 900 };
}

// ─── Password reset ───────────────────────────────────────────────────────────
export async function resetPassword({ phone, newPassword }) {
  const user = await User.findOne({ phone });
  if (!user) throw Object.assign(new Error('User not found'), { code: ERROR_CODES.USER_NOT_FOUND });
  user.passwordHash = newPassword; // pre-save hook hashes
  await user.save();
}

// ─── Social login / find-or-create ────────────────────────────────────────────
export async function handleSocialUser(oauthUser) {
  // oauthUser already created/found by passport strategy
  return issueTokenPair(oauthUser);
}
