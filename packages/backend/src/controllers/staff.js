import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import { ROLES } from '@tastr/shared';
import { logger } from '../utils/logger.js';

async function getMyRestaurant(userId) {
  const r = await Restaurant.findOne({ ownerId: userId });
  if (!r) throw Object.assign(new Error('Restaurant not found'), { statusCode: 404 });
  return r;
}

// GET /api/restaurants/staff
export async function listStaff(req, res, next) {
  try {
    const r = await getMyRestaurant(req.user._id);
    const staff = await User.find({ _id: { $in: r.staffIds } })
      .select('name email phone role status lastLoginAt').lean();
    res.json({ success: true, staff });
  } catch (err) { next(err); }
}

// POST /api/restaurants/staff — invite by email
export async function inviteStaff(req, res, next) {
  try {
    const { email, roleId, roleName } = req.body;
    const r = await getMyRestaurant(req.user._id);

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Create a pending staff account
      const { generateReferralCode } = await import('../utils/helpers.js');
      user = await User.create({
        name: email.split('@')[0],
        email: email.toLowerCase(),
        passwordHash: Math.random().toString(36).slice(-12),  // temp password
        role: ROLES.RESTAURANT_STAFF,
        status: 'PENDING',
        referralCode: generateReferralCode(),
      });
    }

    if (!r.staffIds.includes(user._id)) {
      r.staffIds.push(user._id);
      await r.save();
    }
    // Send invite email
    try {
      const { sendMail } = await import('../services/email.js');
      if (user.email) {
        const portalUrl = process.env.RESTAURANT_WEB_URL || 'http://localhost:3001';
        await sendMail?.({
          to: user.email,
          subject: `Tastr — You've been invited to join ${r.name}`,
          text: `Hi ${user.name},\n\nYou've been invited as staff to ${r.name} on Tastr.\n\nLog in to the partner portal to start: ${portalUrl}\n\nBest,\nThe Tastr Team`,
        });
      }
    } catch (emailErr) { logger.warn('Staff invite email failed:', emailErr.message); }
    res.status(201).json({ success: true, message: 'Staff invited', staff: { _id: user._id, name: user.name, email: user.email } });
  } catch (err) { next(err); }
}

// PUT /api/restaurants/staff/:staffId
export async function updateStaff(req, res, next) {
  try {
    const r = await getMyRestaurant(req.user._id);
    if (!r.staffIds.map(String).includes(req.params.staffId)) {
      return res.status(404).json({ message: 'Staff not found' });
    }
    const user = await User.findByIdAndUpdate(req.params.staffId, { role: req.body.role }, { new: true })
      .select('name email role status');
    res.json({ success: true, staff: user });
  } catch (err) { next(err); }
}

// DELETE /api/restaurants/staff/:staffId
export async function removeStaff(req, res, next) {
  try {
    const r = await getMyRestaurant(req.user._id);
    r.staffIds = r.staffIds.filter(id => id.toString() !== req.params.staffId);
    await r.save();
    res.json({ success: true, message: 'Staff removed' });
  } catch (err) { next(err); }
}

// GET /api/restaurants/roles
export async function listRoles(req, res, next) {
  try {
    const r = await getMyRestaurant(req.user._id);
    const roles = await Role.find({ $or: [{ restaurantId: r._id }, { isSystem: true }] }).lean();
    res.json({ success: true, roles });
  } catch (err) { next(err); }
}

// POST /api/restaurants/roles
export async function createRole(req, res, next) {
  try {
    const r = await getMyRestaurant(req.user._id);
    const role = await Role.create({ ...req.body, restaurantId: r._id, createdBy: req.user._id });
    res.status(201).json({ success: true, role });
  } catch (err) { next(err); }
}

// PUT /api/restaurants/roles/:roleId
export async function updateRole(req, res, next) {
  try {
    const role = await Role.findByIdAndUpdate(req.params.roleId, req.body, { new: true });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.json({ success: true, role });
  } catch (err) { next(err); }
}

// DELETE /api/restaurants/roles/:roleId
export async function deleteRole(req, res, next) {
  try {
    const role = await Role.findById(req.params.roleId);
    if (!role || role.isSystem) return res.status(400).json({ message: 'Cannot delete this role' });
    await role.deleteOne();
    res.json({ success: true });
  } catch (err) { next(err); }
}
