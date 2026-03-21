import mongoose from 'mongoose';
import { ENTITY_STATUS } from '@tastr/shared';

const driverSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  // ─── Personal / documents ──────────────────────────────────────────────────
  licenceNumber:     String,
  licenceDocUrl:     String,
  licenceDocPublicId:String,
  insuranceDocUrl:   String,
  insuranceDocPublicId: String,
  addressProofUrl:   String,
  nationalInsuranceNumber: String,

  // ─── Enhanced: Separate document types ─────────────────────────────────────
  vehicleInsuranceDocUrl:   String,
  vehicleInsuranceDocId:    String,
  foodInsuranceDocUrl:      String,
  foodInsuranceDocId:       String,
  rightToWorkDocUrl:        String,
  rightToWorkDocId:         String,
  profilePhotoUrl:          String,

  // ─── Enhanced: Full address ────────────────────────────────────────────────
  addressLine1: String,
  addressLine2: String,
  city:         String,
  postcode:     String,
  county:       String,

  // ─── Enhanced: Right to Work ───────────────────────────────────────────────
  dateOfBirth:            Date,
  rightToWorkShareCode:   String,
  rightToWorkVerified:    { type: Boolean, default: false },
  rightToWorkVerifiedAt:  Date,
  rightToWorkStatus:      { type: String, enum: ['pending', 'verified', 'failed', 'not_checked'], default: 'not_checked' },

  // ─── Enhanced: Bank details ────────────────────────────────────────────────
  bankAccountHolder: String,
  bankSortCode:      String,
  bankAccountNumber: String,

  // ─── Enhanced: Agreement acceptance ────────────────────────────────────────
  agreementAccepted:   { type: Boolean, default: false },
  agreementVersion:    String,
  agreementAcceptedAt: Date,

  // ─── Vehicle ───────────────────────────────────────────────────────────────
  vehicleType:  { type: String, enum: ['bicycle', 'motorbike', 'car', 'van'], default: 'bicycle' },
  vehiclePlate: String,

  // ─── Status ────────────────────────────────────────────────────────────────
  status:         { type: String, enum: Object.values(ENTITY_STATUS), default: ENTITY_STATUS.PENDING },
  isOnline:       { type: Boolean, default: false },
  rejectionReason:String,
  approvedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  approvedAt:     Date,

  // ─── Location ──────────────────────────────────────────────────────────────
  lastLocation: {
    lat:     Number,
    lng:     Number,
    bearing: Number,
    updatedAt: Date,
  },

  // ─── Stats ─────────────────────────────────────────────────────────────────
  totalDeliveries: { type: Number, default: 0 },
  avgRating:       { type: Number, default: 0 },
  ratingCount:     { type: Number, default: 0 },

  // ─── Stripe Connect (payouts) ──────────────────────────────────────────────
  stripeAccountId: String,

  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
}, { timestamps: true });

driverSchema.index({ status: 1, isOnline: 1 });
driverSchema.index({ 'lastLocation.lat': 1, 'lastLocation.lng': 1 });

const Driver = mongoose.model('Driver', driverSchema);
export default Driver;
