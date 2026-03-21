import mongoose from 'mongoose';
import { ENTITY_STATUS, DOC_STATUS } from '@tastr/shared';

const openingHoursSchema = new mongoose.Schema({
  day:     { type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
  isOpen:  { type: Boolean, default: true },
  open:    { type: String, default: '09:00' },
  close:   { type: String, default: '22:00' },
}, { _id: false });

// ─── Per-document sub-schema ──────────────────────────────────────────────────
const docSchema = new mongoose.Schema({
  key:              String,                   // e.g. 'foodHygieneCert'
  label:            String,                   // human label
  required:         { type: Boolean, default: true },
  url:              { type: String, default: '' },
  publicId:         String,
  filename:         String,
  fileSizeBytes:    Number,
  uploadedAt:       Date,
  status:           { type: String, enum: Object.values(DOC_STATUS), default: DOC_STATUS.NOT_UPLOADED },
  rejectionReason:  String,
  reviewedAt:       Date,
  reviewedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  reuploadRequested:{ type: Boolean, default: false },
  reuploadToken:    String,   // short-lived token emailed to restaurant
}, { _id: false });

const postcodeRuleSchema = new mongoose.Schema({
  type:    { type: String, enum: ['allow','block'], default: 'block' },
  pattern: { type: String, required: true },  // e.g. 'SW1A*'
  notes:   String,
}, { timestamps: true });

const restaurantSchema = new mongoose.Schema({
  ownerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // ─── Basic info ────────────────────────────────────────────────────────────
  name:             { type: String, required: true, trim: true },
  legalBusinessName:String,
  description:      String,
  phone:            String,
  email:            String,
  cuisines:         [String],
  verticals:        [{ type: String, enum: ['food','grocery','alcohol','health'] }],
  foodHygieneRating:{ type: Number, min: 0, max: 5 },

  // ─── Compliance numbers ────────────────────────────────────────────────────
  companyRegNumber: String,
  vatNumber:        String,
  fhrsNumber:       String,

  // ─── Media ────────────────────────────────────────────────────────────────
  logoUrl:         String,
  logoPublicId:    String,
  coverPhotos:     [{ url: String, publicId: String }],

  // ─── Location ─────────────────────────────────────────────────────────────
  address: {
    line1:    String,
    city:     String,
    postcode: String,
    country:  { type: String, default: 'GB' },
    lat:      Number,
    lng:      Number,
  },

  // ─── Status & approval ────────────────────────────────────────────────────
  status:          { type: String, enum: Object.values(ENTITY_STATUS), default: ENTITY_STATUS.PENDING },
  isOnline:        { type: Boolean, default: false },
  rejectionReason: String,
  approvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  approvedAt:      Date,

  // ─── Documents ────────────────────────────────────────────────────────────
  documents: [docSchema],

  // ─── Banking ──────────────────────────────────────────────────────────────
  bankAccountHolder:  String,
  bankName:           String,
  bankAccountLast4:   String,
  bankSortCode:       String,
  bankAccountNumber:  String,   // store encrypted in prod; last4 for display
  stripeAccountId:    String,

  // ─── Delivery config ──────────────────────────────────────────────────────
  deliveryMode:         { type: String, enum: ['tastr','own','both'], default: 'tastr' },
  deliveryRadiusKm:     { type: Number, default: 5 },
  deliveryCoverageMode: { type: String, enum: ['distance','distance_blocked','postcode_only'], default: 'distance_blocked' },
  minOrderAmount:       { type: Number, default: 0 },
  deliveryFee:          { type: Number, default: 250 },
  estimatedDeliveryMin: { type: Number, default: 30 },
  expressDeliveryEnabled:   { type: Boolean, default: false },
  expressDeliveryExtraFee:  { type: Number, default: 200 },
  scheduledOrdersEnabled:   { type: Boolean, default: false },
  scheduledAdvanceHours:    { type: Number, default: 24 },
  tastrPlusFreeDelivery:    { type: Boolean, default: false },
  deliveryTiers: [{
    minKm:   { type: Number, required: true },
    maxKm:   { type: Number, required: true },
    feePence:{ type: Number, required: true },
    _id: false,
  }],
  postcodeRules: [postcodeRuleSchema],

  // ─── Hours ────────────────────────────────────────────────────────────────
  openingHours: [openingHoursSchema],

  // ─── Stats ────────────────────────────────────────────────────────────────
  avgRating:   { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },

  // ─── Kitchen & preparation ──────────────────────────────────────────────
  autoAcceptOrders:    { type: Boolean, default: false },
  autoAcceptDelayMins: { type: Number, default: 2 },
  defaultPrepTime:     { type: Number, default: 25 },      // minutes
  orderQueueLimit:     { type: Number, default: 10 },
  kitchenAlerts:       { type: Boolean, default: true },
  autoPrintOrders:     { type: Boolean, default: false },
  prepTimeTracking:    { type: Boolean, default: true },

  // ─── Subscription ─────────────────────────────────────────────────────────
  offersFreeDeliveryForTastrPlus: { type: Boolean, default: false },

  // ─── Student Discount ──────────────────────────────────────────────────────
  offersStudentDiscount:  { type: Boolean, default: false },
  studentDiscountPercent: { type: Number, default: 10, min: 0, max: 50 },
}, { timestamps: true });

restaurantSchema.index({ status: 1 });
restaurantSchema.index({ 'address.lat': 1, 'address.lng': 1 });
restaurantSchema.index({ cuisines: 1 });
restaurantSchema.index({ name: 'text', description: 'text' });

// ─── Default required documents ───────────────────────────────────────────────
export const REQUIRED_DOCS = [
  { key: 'foodHygieneCert',     label: 'Food Hygiene Rating Certificate',               required: true  },
  { key: 'foodBusinessLicense', label: 'Food Business License',                         required: true  },
  { key: 'ownerIdProof',        label: 'Owner ID Proof',                                required: true  },
  { key: 'addressProof',        label: 'Address Proof',                                 required: true  },
  { key: 'bankDetailsProof',    label: 'Bank Details Proof',                            required: true  },
  { key: 'alcoholLicense',      label: 'Alcohol License',                               required: false },
  { key: 'publicLiabilityIns',  label: 'Public Liability / Employer\'s Liability Insurance', required: false },
  { key: 'companyRegCert',      label: 'Company Registration Certificate',              required: false },
  { key: 'vatRegCert',          label: 'VAT Registration Certificate',                  required: false },
  { key: 'fireSafetyCert',      label: 'Fire Safety Certificate',                       required: false },
  { key: 'allergyInfoForm',     label: 'Allergy Information Form',                      required: false },
  { key: 'foodHandlerCert',     label: 'Food Handler Training Certificate',             required: false },
];

export default mongoose.model('Restaurant', restaurantSchema);
