import Driver from '../models/Driver.js';
import User from '../models/User.js';
import { ROLES, ENTITY_STATUS, DRIVER_DOC_TYPE } from '@tastr/shared';
import * as authService from '../services/auth.js';
import { logger } from '../utils/logger.js';

// ─── POST /api/drivers/register ──────────────────────────────────────────────
// Called by the driver mobile app during sign-up
export async function registerDriver(req, res, next) {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ success: false, message: 'Name and password are required' });
    }
    if (!email && !phone) {
      return res.status(400).json({ success: false, message: 'Email or phone is required' });
    }

    // Check duplicates
    const orConditions = [];
    if (email) orConditions.push({ email: email.toLowerCase() });
    if (phone) orConditions.push({ phone });
    const existing = await User.findOne({ $or: orConditions });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email or phone already registered' });
    }

    // Create user with DRIVER role
    const user = await User.create({
      name,
      email:        email?.toLowerCase()?.trim(),
      phone,
      passwordHash: password,  // pre-save hook hashes it
      role:         ROLES.DRIVER,
      status:       ENTITY_STATUS.PENDING,
    });

    // Create driver record (starts as PENDING)
    const driver = await Driver.create({
      userId: user._id,
      status: ENTITY_STATUS.PENDING,
    });

    // Issue tokens so driver can proceed to profile setup
    const tokens = await authService.issueTokenPair(user);

    res.status(201).json({
      success: true,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
      tokens,
      driverId: driver._id,
    });
  } catch (err) { next(err); }
}

// ─── POST /api/drivers/docs ──────────────────────────────────────────────────
// Called by the driver mobile app to submit documents during profile setup
export async function submitDriverDocs(req, res, next) {
  try {
    const userId = req.user._id;

    // Find or create driver record
    let driver = await Driver.findOne({ userId });
    if (!driver) {
      driver = await Driver.create({ userId, status: ENTITY_STATUS.PENDING });
    }

    // ─── Extract uploaded file URLs from Cloudinary (or memory fallback) ───
    const filesObj = req._filesObj || req.files || {};

    function getFileUrl(fieldName) {
      const files = Array.isArray(filesObj) ? filesObj : filesObj[fieldName];
      if (!files) return null;
      const file = Array.isArray(files) ? files[0] : files;
      return file?.path || file?.location || null;
    }

    function getFileId(fieldName) {
      const files = Array.isArray(filesObj) ? filesObj : filesObj[fieldName];
      if (!files) return null;
      const file = Array.isArray(files) ? files[0] : files;
      return file?.filename || file?.key || null;
    }

    // ─── Update document URLs ─────────────────────────────────────────────
    const docUpdates = {};

    // Profile photo
    if (getFileUrl('profilePhoto')) {
      docUpdates.profilePhotoUrl = getFileUrl('profilePhoto');
    }

    // Driving licence
    if (getFileUrl('license') || getFileUrl('licence')) {
      docUpdates.licenceDocUrl = getFileUrl('license') || getFileUrl('licence');
      docUpdates.licenceDocPublicId = getFileId('license') || getFileId('licence');
    }

    // Vehicle insurance
    if (getFileUrl('vehicleInsurance')) {
      docUpdates.vehicleInsuranceDocUrl = getFileUrl('vehicleInsurance');
      docUpdates.vehicleInsuranceDocId = getFileId('vehicleInsurance');
    }
    // Legacy: 'insurance' field
    if (getFileUrl('insurance') && !docUpdates.vehicleInsuranceDocUrl) {
      docUpdates.vehicleInsuranceDocUrl = getFileUrl('insurance');
      docUpdates.insuranceDocPublicId = getFileId('insurance');
    }

    // Food delivery insurance
    if (getFileUrl('foodInsurance')) {
      docUpdates.foodInsuranceDocUrl = getFileUrl('foodInsurance');
      docUpdates.foodInsuranceDocId = getFileId('foodInsurance');
    }

    // Right to work document
    if (getFileUrl('rightToWork')) {
      docUpdates.rightToWorkDocUrl = getFileUrl('rightToWork');
      docUpdates.rightToWorkDocId = getFileId('rightToWork');
    }

    // Vehicle picture (stored as address proof or separate)
    if (getFileUrl('vehiclePic')) {
      docUpdates.addressProofUrl = getFileUrl('vehiclePic');
    }

    // Legacy fields: id, regCert, pollutionCert, signature, panCard, passbook
    if (getFileUrl('id')) {
      docUpdates.addressProofUrl = docUpdates.addressProofUrl || getFileUrl('id');
    }

    // ─── Update text fields from body ─────────────────────────────────────
    const body = req.body || {};

    if (body.vehiclePlate) docUpdates.vehiclePlate = body.vehiclePlate;
    if (body.vehicleType)  docUpdates.vehicleType = body.vehicleType;
    if (body.licenceNumber) docUpdates.licenceNumber = body.licenceNumber;
    if (body.nationalInsuranceNumber) docUpdates.nationalInsuranceNumber = body.nationalInsuranceNumber;

    // Enhanced v4 fields
    if (body.dateOfBirth)           docUpdates.dateOfBirth = new Date(body.dateOfBirth);
    if (body.addressLine1)          docUpdates.addressLine1 = body.addressLine1;
    if (body.addressLine2)          docUpdates.addressLine2 = body.addressLine2;
    if (body.city)                  docUpdates.city = body.city;
    if (body.postcode)              docUpdates.postcode = body.postcode;
    if (body.county)                docUpdates.county = body.county;
    if (body.rightToWorkShareCode)  docUpdates.rightToWorkShareCode = body.rightToWorkShareCode.replace(/[\s-]/g, '').toUpperCase();
    if (body.bankAccountHolder)     docUpdates.bankAccountHolder = body.bankAccountHolder;
    if (body.bankSortCode)          docUpdates.bankSortCode = body.bankSortCode;
    if (body.bankAccountNumber)     docUpdates.bankAccountNumber = body.bankAccountNumber;

    // Address from legacy 'address' field
    if (body.address && !body.addressLine1) {
      docUpdates.addressLine1 = body.address;
    }

    // Mark as PENDING (waiting for admin approval)
    docUpdates.status = ENTITY_STATUS.PENDING;

    // Apply all updates
    Object.assign(driver, docUpdates);
    await driver.save();

    // Also update user profile photo if provided
    if (docUpdates.profilePhotoUrl) {
      await User.findByIdAndUpdate(userId, { profilePhoto: docUpdates.profilePhotoUrl });
    }

    logger.info(`Driver ${driver._id} (user ${userId}) submitted documents`);

    res.json({
      success: true,
      message: 'Documents submitted. Pending admin approval.',
      driver: {
        _id: driver._id,
        status: driver.status,
        vehiclePlate: driver.vehiclePlate,
        vehicleType: driver.vehicleType,
      },
    });
  } catch (err) { next(err); }
}

// ─── GET /api/drivers/me ─────────────────────────────────────────────────────
// Called by the driver mobile app to check approval status
export async function getDriverProfile(req, res, next) {
  try {
    const userId = req.user._id;

    const driver = await Driver.findOne({ userId })
      .populate('userId', 'name email phone profilePhoto role status')
      .lean();

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    res.json({
      success: true,
      driver: {
        _id:              driver._id,
        status:           driver.status,
        rejectionReason:  driver.rejectionReason,
        isOnline:         driver.isOnline,
        vehicleType:      driver.vehicleType,
        vehiclePlate:     driver.vehiclePlate,
        totalDeliveries:  driver.totalDeliveries,
        avgRating:        driver.avgRating,
        ratingCount:      driver.ratingCount,
        profilePhotoUrl:  driver.profilePhotoUrl,
        addressLine1:     driver.addressLine1,
        city:             driver.city,
        postcode:         driver.postcode,
        rightToWorkVerified:   driver.rightToWorkVerified,
        rightToWorkStatus:     driver.rightToWorkStatus,
        agreementAccepted:     driver.agreementAccepted,
        agreementVersion:      driver.agreementVersion,
        lastLocation:     driver.lastLocation,
        createdAt:        driver.createdAt,
        user: driver.userId,
      },
    });
  } catch (err) { next(err); }
}

// ─── PUT /api/drivers/me ─────────────────────────────────────────────────────
// Update driver profile fields (non-doc fields)
export async function updateDriverProfile(req, res, next) {
  try {
    const userId = req.user._id;
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    const allowed = [
      'vehicleType', 'vehiclePlate', 'addressLine1', 'addressLine2',
      'city', 'postcode', 'county', 'bankAccountHolder', 'bankSortCode', 'bankAccountNumber',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    Object.assign(driver, updates);
    await driver.save();

    res.json({ success: true, driver });
  } catch (err) { next(err); }
}

// ─── PUT /api/drivers/me/online ──────────────────────────────────────────────
// Toggle driver online/offline status
export async function toggleOnline(req, res, next) {
  try {
    const userId = req.user._id;
    const { isOnline } = req.body;

    const driver = await Driver.findOneAndUpdate(
      { userId, status: ENTITY_STATUS.ACTIVE },
      { isOnline: !!isOnline },
      { new: true },
    );

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Active driver profile not found' });
    }

    res.json({ success: true, isOnline: driver.isOnline });
  } catch (err) { next(err); }
}

// ─── POST /api/drivers/me/resubmit ──────────────────────────────────────────
// Resubmit docs after rejection (same as submitDriverDocs but resets status)
export { submitDriverDocs as resubmitDriverDocs };
