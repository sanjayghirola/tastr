import User from '../models/User.js';
import Restaurant, { REQUIRED_DOCS } from '../models/Restaurant.js';
import { deleteCloudinaryAsset } from '../config/cloudinary.js';
import { geocodeAddress } from '../services/geocode.js';
import { generateReferralCode } from '../utils/helpers.js';
import { ROLES, ENTITY_STATUS, DOC_STATUS } from '@tastr/shared';
import {
  sendRegistrationConfirmation,
  sendRestaurantApproved,
  sendRestaurantRejected,
} from '../services/email.js';

// ─── Helper: parse cuisines from body (string, JSON string, or array) ─────────
function parseCuisines(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : [val]; }
  catch { return val.split(',').map(c => c.trim()).filter(Boolean); }
}

// ─── Helper: parse opening hours from body ────────────────────────────────────
function parseHours(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); }
  catch { return []; }
}

// ─── Helper: save uploaded documents into restaurant.documents[] ─────────────
function applyUploadedDocs(restaurant, files) {
  if (!files || typeof files !== 'object') return;

  // files can be: req.files (array from .array()) OR req.files (object from .fields())
  // OR individual req.file from .single()
  const fileMap = {};

  if (Array.isArray(files)) {
    // multer array — keyed by fieldname
    files.forEach(f => { fileMap[f.fieldname] = f; });
  } else {
    // multer fields() — already keyed
    Object.entries(files).forEach(([k, arr]) => {
      if (Array.isArray(arr) && arr.length) fileMap[k] = arr[0];
    });
  }

  // Map file fieldnames → REQUIRED_DOCS keys
  const fieldToDocKey = {
    foodBusinessLicense: 'foodBusinessLicense',
    fhrsDoc:             'foodHygieneCert',
    addressProof:        'addressProof',
    bankProof:           'bankDetailsProof',
    logo:                null,                  // handled separately (logoUrl)
    ownerIdProof:        'ownerIdProof',
    ownerAddressDoc:     'addressProof',        // owner address proof maps to addressProof
    publicLiabilityIns:  'publicLiabilityIns',
    companyRegCert:      'companyRegCert',
    vatRegCert:          'vatRegCert',
    fireSafetyCert:      'fireSafetyCert',
    allergyForm:         'allergyInfoForm',
    foodHandlerCert:     'foodHandlerCert',
    alcoholLicense:      'alcoholLicense',
  };

  Object.entries(fieldToDocKey).forEach(([fieldName, docKey]) => {
    if (!docKey) return;
    const f = fileMap[fieldName];
    if (!f) return;

    const docDef = REQUIRED_DOCS.find(d => d.key === docKey);
    if (!docDef) return;

    let doc = restaurant.documents.find(d => d.key === docKey);
    if (!doc) {
      restaurant.documents.push({
        key:      docKey,
        label:    docDef.label,
        required: docDef.required,
        status:   DOC_STATUS.PENDING,
      });
      doc = restaurant.documents[restaurant.documents.length - 1];
    }

    doc.url         = f.path || '';
    doc.publicId    = f.filename || '';
    doc.filename    = f.originalname || '';
    doc.fileSizeBytes = f.size;
    doc.uploadedAt  = new Date();
    doc.status      = DOC_STATUS.PENDING;
  });

  // Logo handled separately
  if (fileMap.logo) {
    restaurant.logoUrl      = fileMap.logo.path || '';
    restaurant.logoPublicId = fileMap.logo.filename || '';
  }
}

// ─── POST /api/restaurants/register ──────────────────────────────────────────
export async function registerRestaurant(req, res, next) {
  try {
    const {
      // Restaurant basic info (new field names from form)
      name, legalBusinessName, cuisineType, hygieneRating,
      companyRegNumber, vatNumber, businessPhone, businessEmail,
      fhrsNumber, password, description,
      // Address
      postcode, streetAddress, city, googleMapsPin, addressDocType,
      // Banking
      accountHolderName, bankName, sortCode, accountNumber,
      // Settings
      deliveryMode,
      // Student discount
      offersStudentDiscount, studentDiscountPercent,
      // Owner info (step 2)
      ownerName, dob, ownerPhone, ownerEmail,
      // Team
      myRole, teamMembers,
      // Legacy field support (in case old form still sends these)
      email: legacyEmail, phone: legacyPhone, address: legacyAddress,
    } = req.body;

    // Resolve email/phone — new form uses businessEmail/businessPhone
    const resolvedEmail = (businessEmail || legacyEmail || '').toLowerCase().trim();
    const resolvedPhone = businessPhone || legacyPhone || '';
    const resolvedAddress = streetAddress || legacyAddress || '';

    if (!resolvedEmail) return res.status(400).json({ success: false, message: 'Email is required' });
    if (!password)      return res.status(400).json({ success: false, message: 'Password is required' });

    // 1. Check duplicate
    const existingUser = await User.findOne({
      $or: [
        { email: resolvedEmail },
        ...(resolvedPhone ? [{ phone: resolvedPhone }] : []),
      ],
    });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email or phone already registered' });
    }

    // 2. Create owner user account
    const owner = await User.create({
      name:         ownerName || name,  // owner name from step 2, fallback to restaurant name
      email:        resolvedEmail,
      phone:        ownerPhone || resolvedPhone,
      passwordHash: password,
      role:         ROLES.RESTAURANT_OWNER,
      status:       ENTITY_STATUS.ACTIVE,
      referralCode: generateReferralCode(),
      ...(dob ? { dateOfBirth: new Date(dob) } : {}),
    });

    // 3. Geocode address
    let lat = null, lng = null;
    try {
      const geo = await geocodeAddress(`${resolvedAddress}, ${city || ''}, ${postcode || ''}`);
      lat = geo.lat; lng = geo.lng;
    } catch { /* geocode optional — don't block registration */ }

    // 4. Cover photos from req.files array (field: coverPhotos)
    const coverPhotos = (Array.isArray(req.files) ? req.files : [])
      .filter(f => f.fieldname === 'coverPhotos' && f.path)
      .map(f => ({ url: f.path, publicId: f.filename }));

    // 5. Parse opening hours & cuisines
    const openingHours = parseHours(req.body.openingHours);
    const cuisines     = parseCuisines(req.body.cuisines || cuisineType);

    // 6. Create restaurant
    const restaurant = await Restaurant.create({
      ownerId:           owner._id,
      name:              name || '',
      legalBusinessName: legalBusinessName || '',
      description:       description || '',
      phone:             resolvedPhone,
      email:             resolvedEmail,
      cuisines,
      foodHygieneRating: hygieneRating ? Number(hygieneRating) : undefined,
      companyRegNumber:  companyRegNumber || '',
      vatNumber:         vatNumber || '',
      fhrsNumber:        fhrsNumber || '',
      address: {
        line1:    resolvedAddress,
        city:     city || '',
        postcode: postcode || '',
        country:  'GB',
        lat,
        lng,
      },
      coverPhotos,
      openingHours,
      deliveryMode:      deliveryMode || 'tastr',
      offersStudentDiscount: offersStudentDiscount === true || offersStudentDiscount === 'true',
      studentDiscountPercent: studentDiscountPercent ? Number(studentDiscountPercent) : 10,
      // Banking
      bankAccountHolder: accountHolderName || '',
      bankName:          bankName || '',
      bankSortCode:      sortCode || '',
      bankAccountLast4:  accountNumber ? String(accountNumber).slice(-4) : '',
      bankAccountNumber: accountNumber || '',
      // Documents array starts empty — populated from uploaded files below
      documents: [],
      status: ENTITY_STATUS.PENDING,
    });

    // 7. Save uploaded documents into documents[]
    if (req.files) {
      applyUploadedDocs(restaurant, req.files);
      await restaurant.save();
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted. Under review.',
      restaurantId: restaurant._id,
    });

    // Send confirmation email (non-blocking)
    sendRegistrationConfirmation({
      to:             resolvedEmail,
      restaurantName: name || '',
      ownerName:      ownerName || name || '',
    }).catch(err => {}); // non-fatal
  } catch (err) { next(err); }
}

// ─── GET /api/restaurants/status ─────────────────────────────────────────────
export async function getRestaurantStatus(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({ ownerId: req.user._id })
      .select('name status isOnline rejectionReason createdAt documents')
      .lean();

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'No restaurant application found' });
    }

    // Build documentSlots (all required doc slots, filled in with actual status)
    const docMap = {};
    for (const d of (restaurant.documents || [])) docMap[d.key] = d;
    restaurant.documentSlots = REQUIRED_DOCS.map(rd => ({
      ...rd,
      ...(docMap[rd.key] || { status: DOC_STATUS.NOT_UPLOADED, url: '' }),
    }));

    res.json({ success: true, restaurant });
  } catch (err) { next(err); }
}

// ─── GET /api/restaurants/me ──────────────────────────────────────────────────
export async function getMyRestaurant(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({ ownerId: req.user._id }).lean();
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    res.json({ success: true, restaurant });
  } catch (err) { next(err); }
}

// ─── PUT /api/restaurants/profile ────────────────────────────────────────────
export async function updateMyRestaurant(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({ ownerId: req.user._id });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const {
      name, legalBusinessName, description, phone, email,
      foodHygieneRating, companyRegNumber, vatNumber, fhrsNumber,
    } = req.body;

    if (name              !== undefined) restaurant.name              = name;
    if (legalBusinessName !== undefined) restaurant.legalBusinessName = legalBusinessName;
    if (description       !== undefined) restaurant.description       = description;
    if (phone             !== undefined) restaurant.phone             = phone;
    if (email             !== undefined) restaurant.email             = email;
    if (foodHygieneRating !== undefined) restaurant.foodHygieneRating = Number(foodHygieneRating);
    if (companyRegNumber  !== undefined) restaurant.companyRegNumber  = companyRegNumber;
    if (vatNumber         !== undefined) restaurant.vatNumber         = vatNumber;
    if (fhrsNumber        !== undefined) restaurant.fhrsNumber        = fhrsNumber;

    const cuisines = parseCuisines(req.body.cuisines);
    if (cuisines.length) restaurant.cuisines = cuisines;

    // Logo upload
    if (req.file) {
      if (restaurant.logoPublicId) await deleteCloudinaryAsset(restaurant.logoPublicId);
      restaurant.logoUrl      = req.file.path;
      restaurant.logoPublicId = req.file.filename;
    }

    await restaurant.save();
    res.json({ success: true, restaurant });
  } catch (err) { next(err); }
}

// ─── PUT /api/restaurants/me/hours ────────────────────────────────────────────
export async function updateHours(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({ ownerId: req.user._id });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    restaurant.openingHours = parseHours(req.body.hours || req.body.openingHours);
    await restaurant.save();
    res.json({ success: true, openingHours: restaurant.openingHours });
  } catch (err) { next(err); }
}

// ─── PUT /api/restaurants/me/notification-prefs ───────────────────────────────
export async function updateNotifPrefs(req, res, next) {
  try {
    const { emailNewOrder, emailDailyReport, inAppNewOrder, inAppComplaint } = req.body;
    const user = await User.findById(req.user._id);
    user.notifPrefs = { ...user.notifPrefs, emailNewOrder, emailDailyReport, inAppNewOrder, inAppComplaint };
    await user.save();
    res.json({ success: true, notifPrefs: user.notifPrefs });
  } catch (err) { next(err); }
}

// ─── PUT /api/restaurants/me/delivery ────────────────────────────────────────
export async function updateDeliverySettings(req, res, next) {
  try {
    // Includes all delivery-related model fields
    const FIELDS = [
      'deliveryMode', 'deliveryRadiusKm', 'deliveryCoverageMode',
      'deliveryFee', 'minOrderAmount',
      'expressDeliveryEnabled', 'expressDeliveryExtraFee',
      'scheduledOrdersEnabled', 'scheduledAdvanceHours',
      'tastrPlusFreeDelivery', 'deliveryTiers',
    ];
    const updates = {};
    for (const f of FIELDS) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    const restaurant = await Restaurant.findOneAndUpdate(
      { ownerId: req.user._id },
      { $set: updates },
      { new: true },
    );
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    res.json({ success: true, restaurant });
  } catch (err) { next(err); }
}

// ─── POST /api/restaurants/admin/create ──────────────────────────────────────
export async function adminCreateRestaurant(req, res, next) {
  try {
    const {
      name, legalBusinessName, cuisineType, hygieneRating,
      companyRegNumber, vatNumber, businessPhone, businessEmail,
      fhrsNumber, password, description,
      postcode, streetAddress, city, googleMapsPin, addressDocType,
      accountHolderName, bankName, sortCode, accountNumber,
      deliveryMode,
      ownerName, dob, ownerPhone, ownerEmail,
      myRole, teamMembers,
      // Legacy support
      email: legacyEmail, phone: legacyPhone, address: legacyAddress,
      ownerPassword,
    } = req.body;

    const resolvedEmail = (businessEmail || legacyEmail || '').toLowerCase().trim();
    const resolvedPhone = businessPhone || legacyPhone || '';
    const resolvedAddress = streetAddress || legacyAddress || '';

    // 1. Create owner user
    let ownerId = req.body.ownerId;
    if (!ownerId) {
      const existing = await User.findOne({ email: resolvedEmail });
      if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

      const owner = await User.create({
        name:         ownerName || name,
        email:        resolvedEmail,
        phone:        ownerPhone || resolvedPhone,
        passwordHash: password || ownerPassword,
        role:         ROLES.RESTAURANT_OWNER,
        status:       ENTITY_STATUS.ACTIVE,
        referralCode: generateReferralCode(),
        ...(dob ? { dateOfBirth: new Date(dob) } : {}),
      });
      ownerId = owner._id;
    }

    // 2. Geocode
    let lat = null, lng = null;
    try {
      const geo = await geocodeAddress(`${resolvedAddress}, ${city || ''}, ${postcode || ''}`);
      lat = geo.lat; lng = geo.lng;
    } catch { /* optional */ }

    // 3. Cover photos
    const coverPhotos = (Array.isArray(req.files) ? req.files : [])
      .filter(f => f.fieldname === 'coverPhotos' && f.path)
      .map(f => ({ url: f.path, publicId: f.filename }));

    const openingHours = parseHours(req.body.openingHours);
    const cuisines     = parseCuisines(req.body.cuisines || cuisineType);

    // 4. Create restaurant — admin-created are immediately ACTIVE
    const restaurant = await Restaurant.create({
      ownerId,
      name:              name || '',
      legalBusinessName: legalBusinessName || '',
      description:       description || '',
      phone:             resolvedPhone,
      email:             resolvedEmail,
      cuisines,
      foodHygieneRating: hygieneRating ? Number(hygieneRating) : undefined,
      companyRegNumber:  companyRegNumber || '',
      vatNumber:         vatNumber || '',
      fhrsNumber:        fhrsNumber || '',
      address: {
        line1:    resolvedAddress,
        city:     city || '',
        postcode: postcode || '',
        country:  'GB',
        lat,
        lng,
      },
      coverPhotos,
      openingHours,
      deliveryMode:      deliveryMode || 'tastr',
      bankAccountHolder: accountHolderName || '',
      bankName:          bankName || '',
      bankSortCode:      sortCode || '',
      bankAccountLast4:  accountNumber ? String(accountNumber).slice(-4) : '',
      bankAccountNumber: accountNumber || '',
      documents: [],
      status: ENTITY_STATUS.ACTIVE,  // admin-created skip review
    });

    // 5. Save uploaded documents
    if (req.files) {
      applyUploadedDocs(restaurant, req.files);
      await restaurant.save();
    }

    res.status(201).json({ success: true, restaurant });
  } catch (err) { next(err); }
}

// ─── GET /api/restaurants/admin/list ─────────────────────────────────────────
export async function adminListRestaurants(req, res, next) {
  try {
    const { page = 1, limit = 20, status, cuisine, city, q } = req.query;
    const filter = {};
    if (status)  filter.status           = status;
    if (cuisine) filter.cuisines          = { $in: [cuisine] };
    if (city)    filter['address.city']  = new RegExp(city, 'i');
    if (q)       filter.$or = [{ name: new RegExp(q,'i') }, { email: new RegExp(q,'i') }];

    const [restaurants, total] = await Promise.all([
      Restaurant.find(filter).sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(Number(limit))
        .populate('ownerId', 'name email phone').lean(),
      Restaurant.countDocuments(filter),
    ]);
    res.json({
      success: true, restaurants,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
}

// ─── GET /api/restaurants/admin/:id ──────────────────────────────────────────
export async function adminGetRestaurant(req, res, next) {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('ownerId', 'name email phone').lean();
    if (!restaurant) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, restaurant });
  } catch (err) { next(err); }
}

// ─── PATCH /api/restaurants/admin/:id/suspend ────────────────────────────────
export async function suspendRestaurant(req, res, next) {
  try {
    const r = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { status: ENTITY_STATUS.SUSPENDED, isOnline: false },
      { new: true }
    );
    if (!r) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, restaurant: r });
  } catch (err) { next(err); }
}

// ─── PATCH /api/restaurants/admin/:id/approve ────────────────────────────────
export async function approveRestaurant(req, res, next) {
  try {
    const r = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { status: ENTITY_STATUS.ACTIVE, approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    ).populate('ownerId', 'name email');
    if (!r) return res.status(404).json({ success: false, message: 'Not found' });

    // Send approval email
    const ownerEmail = r.ownerId?.email || r.email;
    const ownerName  = r.ownerId?.name  || r.name;
    if (ownerEmail) {
      sendRestaurantApproved({ to: ownerEmail, restaurantName: r.name, ownerName }).catch(() => {});
    }

    res.json({ success: true, restaurant: r });
  } catch (err) { next(err); }
}

// ─── PATCH /api/restaurants/admin/:id/reject ─────────────────────────────────
export async function rejectRestaurant(req, res, next) {
  try {
    const { reason } = req.body;
    const r = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { status: ENTITY_STATUS.REJECTED, rejectionReason: reason },
      { new: true }
    ).populate('ownerId', 'name email');
    if (!r) return res.status(404).json({ success: false, message: 'Not found' });

    // Send rejection email
    const ownerEmail = r.ownerId?.email || r.email;
    const ownerName  = r.ownerId?.name  || r.name;
    if (ownerEmail) {
      sendRestaurantRejected({ to: ownerEmail, restaurantName: r.name, ownerName, reason }).catch(() => {});
    }

    res.json({ success: true, restaurant: r });
  } catch (err) { next(err); }
}

// ─── PUT /api/restaurants/profile (alias) ────────────────────────────────────
export const updateProfile = updateMyRestaurant;

// ─── PUT /api/restaurants/online ─────────────────────────────────────────────
export async function setOnlineStatus(req, res, next) {
  try {
    const { isOnline } = req.body;
    const r = await Restaurant.findOneAndUpdate(
      { ownerId: req.user._id },
      { isOnline: Boolean(isOnline) },
      { new: true }
    );
    if (!r) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    res.json({ success: true, isOnline: r.isOnline });
  } catch (err) { next(err); }
}

// ─── PUT /api/restaurants/me/kitchen-settings ────────────────────────────────
export async function updateKitchenSettings(req, res, next) {
  try {
    const FIELDS = [
      'autoAcceptOrders', 'autoAcceptDelayMins', 'defaultPrepTime',
      'orderQueueLimit', 'kitchenAlerts', 'autoPrintOrders', 'prepTimeTracking',
    ];
    const updates = {};
    for (const f of FIELDS) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    const restaurant = await Restaurant.findOneAndUpdate(
      { $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }] },
      { $set: updates },
      { new: true },
    );
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    res.json({ success: true, settings: {
      autoAcceptOrders: restaurant.autoAcceptOrders,
      autoAcceptDelayMins: restaurant.autoAcceptDelayMins,
      defaultPrepTime: restaurant.defaultPrepTime,
      orderQueueLimit: restaurant.orderQueueLimit,
      kitchenAlerts: restaurant.kitchenAlerts,
      autoPrintOrders: restaurant.autoPrintOrders,
      prepTimeTracking: restaurant.prepTimeTracking,
    }});
  } catch (err) { next(err); }
}

// ─── GET /api/restaurants/me/kitchen-settings ────────────────────────────────
export async function getKitchenSettings(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    }).select('autoAcceptOrders autoAcceptDelayMins defaultPrepTime orderQueueLimit kitchenAlerts autoPrintOrders prepTimeTracking').lean();
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    res.json({ success: true, settings: restaurant });
  } catch (err) { next(err); }
}
