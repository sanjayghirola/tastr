import * as authService from '../services/auth.js';
import { verifyRefreshToken, revokeRefreshToken, issueTokenPair } from '../services/auth.js';
import User from '../models/User.js';
import { ROLES, ERROR_CODES } from '@tastr/shared';

// ─── Register ─────────────────────────────────────────────────────────────────
export async function register(req, res, next) {
  try {
    const { name, email, phone, password } = req.body;
    const user = await authService.registerUser({ name, email, phone, password });
    const tokens = await authService.issueTokenPair(user);

    res.status(201).json({ success: true, user, tokens });
  } catch (err) { next(err); }
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;
    const user = await authService.loginUser({ identifier, password });
    const tokens = await authService.issueTokenPair(user);

    res.json({ success: true, user, tokens });
  } catch (err) { next(err); }
}

// ─── Admin Login ──────────────────────────────────────────────────────────────
export async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    const admin = await authService.loginAdmin({ email, password });
    const tokens = await authService.issueTokenPair(admin);

    res.json({ success: true, user: admin, tokens });
  } catch (err) { next(err); }
}

// ─── Restaurant Login ─────────────────────────────────────────────────────────
export async function restaurantLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    // Restaurant owners are Users with role RESTAURANT_OWNER or RESTAURANT_STAFF
    const user = await authService.loginUser({ identifier: email, password });

    if (![ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF].includes(user.role)) {
      return res.status(403).json({
        success: false,
        code: ERROR_CODES.FORBIDDEN,
        message: 'Not a restaurant account',
      });
    }

    const tokens = await authService.issueTokenPair(user);
    res.json({ success: true, user, tokens });
  } catch (err) { next(err); }
}

// ─── Send OTP ─────────────────────────────────────────────────────────────────
export async function sendOtp(req, res, next) {
  try {
    const { phone, purpose } = req.body;
    await authService.createAndSendOtp(phone, purpose);
    res.json({ success: true, message: 'OTP sent' });
  } catch (err) { next(err); }
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────
export async function verifyOtp(req, res, next) {
  try {
    const { phone, otp, purpose } = req.body;
    await authService.verifyOtp(phone, otp, purpose);

    // For login via OTP — issue tokens
    if (purpose === 'login') {
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({ success: false, code: ERROR_CODES.USER_NOT_FOUND, message: 'User not found' });
      }
      const tokens = await authService.issueTokenPair(user);
      return res.json({ success: true, verified: true, user, tokens });
    }

    // For verify/reset — just confirm
    res.json({ success: true, verified: true });
  } catch (err) { next(err); }
}

// ─── Reset Password ───────────────────────────────────────────────────────────
export async function resetPassword(req, res, next) {
  try {
    const { phone, otp, newPassword } = req.body;
    // Verify OTP first
    await authService.verifyOtp(phone, otp, 'reset');
    await authService.resetPassword({ phone, newPassword });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) { next(err); }
}

// ─── Refresh Token ────────────────────────────────────────────────────────────
export async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const payload = await verifyRefreshToken(refreshToken);

    // Rotate: revoke old, issue new pair
    await revokeRefreshToken(payload.sub, payload.jti);

    let entity;
    if (payload.role === ROLES.SUPER_ADMIN || payload.role === ROLES.SUB_ADMIN) {
      const Admin = (await import('../models/Admin.js')).default;
      entity = await Admin.findById(payload.sub);
    } else {
      entity = await User.findById(payload.sub);
    }

    if (!entity) {
      return res.status(401).json({ success: false, code: ERROR_CODES.UNAUTHORIZED, message: 'User not found' });
    }

    const tokens = await issueTokenPair(entity);
    res.json({ success: true, tokens });
  } catch (err) { next(err); }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logout(req, res, next) {
  try {
    const { jti, sub } = req.tokenPayload;
    if (jti) await revokeRefreshToken(sub, jti);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
}

// ─── Get Me ───────────────────────────────────────────────────────────────────
export async function getMe(req, res) {
  res.json({ success: true, user: req.user });
}

// ─── OAuth Callback ───────────────────────────────────────────────────────────
export async function oauthCallback(req, res, next) {
  try {
    const tokens = await authService.issueTokenPair(req.user);
    const clientUrl = process.env.CLIENT_URLS?.split(',')[0] || 'http://localhost:3000';
    // Redirect to frontend with tokens in query (frontend picks them up and stores in memory)
    const params = new URLSearchParams({
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    res.redirect(`${clientUrl}/auth/oauth-callback?${params.toString()}`);
  } catch (err) { next(err); }
}

// ─── Admin: update own profile ────────────────────────────────────────────────
export async function updateAdminProfile(req, res, next) {
  try {
    const { name, email } = req.body;
    const admin = await (await import('../models/Admin.js')).default.findById(req.admin._id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    if (name)  admin.name  = name.trim();
    if (email) admin.email = email.toLowerCase().trim();
    await admin.save();
    res.json({ success: true, user: admin.toJSON() });
  } catch (err) { next(err); }
}

// ─── Admin: change own password ───────────────────────────────────────────────
export async function changeAdminPassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await (await import('../models/Admin.js')).default.findById(req.admin._id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    const ok = await admin.comparePassword(currentPassword);
    if (!ok) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    admin.passwordHash = newPassword; // pre-save hook will hash it
    await admin.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) { next(err); }
}
