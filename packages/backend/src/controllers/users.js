import User from '../models/User.js';
import CmsPage from '../models/CmsPage.js';
import { deleteCloudinaryAsset } from '../config/cloudinary.js';
import { geocodeAddress } from '../services/geocode.js';
import { revokeRefreshToken } from '../services/auth.js';
import { ERROR_CODES } from '@tastr/shared';

// ─── GET /api/users/me ────────────────────────────────────────────────────────
export async function getMe(req, res) {
  res.json({ success: true, user: req.user });
}

// ─── PUT /api/users/me ────────────────────────────────────────────────────────
export async function updateMe(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    const { name, email, phone, dietaryPreferences } = req.body;

    if (name)  user.name  = name;
    if (phone) user.phone = phone;

    // Email change — mark unverified until OTP confirm (handled via separate flow)
    if (email && email !== user.email) {
      const exists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (exists) return res.status(409).json({ success: false, code: ERROR_CODES.EMAIL_TAKEN, message: 'Email already in use' });
      user.email          = email.toLowerCase();
      user.isEmailVerified = false;
    }

    if (dietaryPreferences) user.dietaryPreferences = dietaryPreferences;

    // Profile photo upload via Cloudinary
    if (req.file) {
      // Delete old photo from Cloudinary if exists
      if (user.profilePhotoPublicId) await deleteCloudinaryAsset(user.profilePhotoPublicId);
      user.profilePhoto        = req.file.path;          // Cloudinary secure_url
      user.profilePhotoPublicId = req.file.filename;    // Cloudinary public_id
    }

    await user.save();
    res.json({ success: true, user });
  } catch (err) { next(err); }
}

// ─── PUT /api/users/me/password ───────────────────────────────────────────────
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ success: false, code: ERROR_CODES.INVALID_CREDENTIALS, message: 'Current password is incorrect' });

    user.passwordHash = newPassword; // pre-save hook hashes
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
}

// ─── DELETE /api/users/me (GDPR anonymise) ────────────────────────────────────
export async function deleteAccount(req, res, next) {
  try {
    const userId = req.user._id;
    const user   = await User.findById(userId);

    // Anonymise PII
    user.name         = 'Deleted User';
    user.email        = `deleted_${userId}@tastr.app`;
    user.phone        = null;
    user.passwordHash = null;
    user.profilePhoto = null;
    user.googleId     = null;
    user.facebookId   = null;
    user.appleId      = null;
    user.fcmToken     = null;
    user.addresses    = [];
    user.status       = 'SUSPENDED';
    await user.save();

    // Invalidate all refresh tokens by deleting from Redis
    const { getRedis } = await import('../config/redis.js');
    const redis = getRedis();
    const keys  = await redis.keys(`refresh:${userId}:*`);
    if (keys.length) await redis.del(...keys);

    res.json({ success: true, message: 'Account deleted' });
  } catch (err) { next(err); }
}

// ─── GET /api/users/me/export (GDPR export) ───────────────────────────────────
export async function exportData(req, res, next) {
  try {
    const user = await User.findById(req.user._id).lean();
    // Export safe subset
    const exportData = {
      profile: {
        name:               user.name,
        email:              user.email,
        phone:              user.phone,
        profilePhoto:       user.profilePhoto,
        dietaryPreferences: user.dietaryPreferences,
        createdAt:          user.createdAt,
      },
      addresses:    user.addresses,
      notifPrefs:   user.notifPrefs,
      referralCode: user.referralCode,
    };
    res.setHeader('Content-Disposition', 'attachment; filename="tastr-data-export.json"');
    res.json({ success: true, data: exportData, exportedAt: new Date().toISOString() });
  } catch (err) { next(err); }
}

// ─── GET /api/users/me/addresses ──────────────────────────────────────────────
export async function getAddresses(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    res.json({ success: true, addresses: user.addresses });
  } catch (err) { next(err); }
}

// ─── POST /api/users/me/addresses ────────────────────────────────────────────
export async function addAddress(req, res, next) {
  try {
    const { label, line1, line2, city, postcode, country, landmark } = req.body;
    const user = await User.findById(req.user._id);

    // Geocode
    const geoStr = `${line1}, ${city}, ${postcode}`;
    const { lat, lng } = await geocodeAddress(geoStr);

    const isDefault = user.addresses.length === 0; // first address is default

    user.addresses.push({ label: label || 'Home', line1, line2, city, postcode, country: country || 'GB', landmark, lat, lng, isDefault });
    await user.save();

    res.status(201).json({ success: true, addresses: user.addresses });
  } catch (err) { next(err); }
}

// ─── PUT /api/users/me/addresses/:id ─────────────────────────────────────────
export async function updateAddress(req, res, next) {
  try {
    const user    = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.id);
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    const { label, line1, line2, city, postcode, landmark } = req.body;
    if (label)    address.label    = label;
    if (line1)    address.line1    = line1;
    if (line2)    address.line2    = line2;
    if (city)     address.city     = city;
    if (postcode) address.postcode = postcode;
    if (landmark) address.landmark = landmark;

    // Re-geocode if address fields changed
    if (line1 || city || postcode) {
      const { lat, lng } = await geocodeAddress(`${address.line1}, ${address.city}, ${address.postcode}`);
      address.lat = lat;
      address.lng = lng;
    }

    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) { next(err); }
}

// ─── DELETE /api/users/me/addresses/:id ──────────────────────────────────────
export async function deleteAddress(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    user.addresses  = user.addresses.filter(a => a._id.toString() !== req.params.id);
    // Ensure at least one default
    if (user.addresses.length && !user.addresses.some(a => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) { next(err); }
}

// ─── PATCH /api/users/me/addresses/:id/default ───────────────────────────────
export async function setDefaultAddress(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.forEach(a => { a.isDefault = a._id.toString() === req.params.id; });
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) { next(err); }
}

// ─── POST /api/users/me/fcm-token ────────────────────────────────────────────
export async function updateFcmToken(req, res, next) {
  try {
    await User.findByIdAndUpdate(req.user._id, { fcmToken: req.body.token });
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ─── PUT /api/users/me/notification-prefs ────────────────────────────────────
export async function updateNotifPrefs(req, res, next) {
  try {
    const { orderUpdates, promotions, wallet, groupOrders } = req.body;
    const user = await User.findById(req.user._id);
    if (orderUpdates !== undefined) user.notifPrefs.orderUpdates = orderUpdates;
    if (promotions   !== undefined) user.notifPrefs.promotions   = promotions;
    if (wallet       !== undefined) user.notifPrefs.wallet       = wallet;
    if (groupOrders  !== undefined) user.notifPrefs.groupOrders  = groupOrders;
    await user.save();
    res.json({ success: true, notifPrefs: user.notifPrefs });
  } catch (err) { next(err); }
}

// ─── GET /api/users/cms/:slug ─────────────────────────────────────────────────
export async function getCmsPage(req, res, next) {
  try {
    const page = await CmsPage.findOne({ slug: req.params.slug });
    if (!page) {
      // Return default placeholder
      return res.json({ success: true, page: { slug: req.params.slug, title: req.params.slug, content: '<p>Content coming soon.</p>' } });
    }
    res.json({ success: true, page });
  } catch (err) { next(err); }
}

// ─── In-app Notifications ─────────────────────────────────────────────────────
import UserNotification from "../models/UserNotification.js";

export async function getNotifications(req, res, next) {
  try {
    const { limit = 50, page = 1 } = req.query;
    const userId = req.user._id;
    const notifications = await UserNotification.find({ userId })
      .sort({ createdAt: -1 }).limit(Number(limit)).skip((page - 1) * limit).lean();
    res.json({ success: true, notifications });
  } catch (err) { next(err); }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await UserNotification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function markNotificationRead(req, res, next) {
  try {
    const notif = await UserNotification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, notification: notif });
  } catch (err) { next(err); }
}
