import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, ENTITY_STATUS, DIETARY_TAGS } from '@tastr/shared';

const addressSchema = new mongoose.Schema({
  label:    { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
  line1:    { type: String, required: true },
  line2:    String,
  city:     { type: String, required: true },
  postcode: { type: String, required: true },
  country:  { type: String, default: 'GB' },
  lat:      Number,
  lng:      Number,
  landmark: String,
  isDefault:{ type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  // ─── Identity ──────────────────────────────────────────────────────────────
  name:         { type: String, required: true, trim: true },
  email:        { type: String, lowercase: true, trim: true, sparse: true },
  phone:        { type: String, sparse: true },
  passwordHash: { type: String },

  // ─── OAuth ─────────────────────────────────────────────────────────────────
  googleId:   { type: String, sparse: true },
  facebookId: { type: String, sparse: true },
  appleId:    { type: String, sparse: true },

  // ─── Role & Status ─────────────────────────────────────────────────────────
  role:   { type: String, enum: Object.values(ROLES),          default: ROLES.CUSTOMER },
  status: { type: String, enum: Object.values(ENTITY_STATUS),  default: ENTITY_STATUS.ACTIVE },

  // ─── Profile ───────────────────────────────────────────────────────────────
  profilePhoto:       String,
  profilePhotoPublicId: String,
  dietaryPreferences: [{ type: String, enum: DIETARY_TAGS }],
  addresses:          [addressSchema],

  // ─── Verification ──────────────────────────────────────────────────────────
  isEmailVerified:    { type: Boolean, default: false },
  isPhoneVerified:    { type: Boolean, default: false },
  isStudentVerified:  { type: Boolean, default: false },
  studentEmail:       String,
  banReason:          String,

  // ─── Platform refs ─────────────────────────────────────────────────────────
  walletId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
  referralCode:     { type: String, unique: true, sparse: true },
  referredBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralRewarded: { type: Boolean, default: false },

  // ─── Recent searches (P3) ──────────────────────────────────────────────────
  recentSearches: [{ query: String, searchedAt: { type: Date, default: Date.now } }],

  // ─── Push / notifications ──────────────────────────────────────────────────
  fcmToken:     String,
  notifPrefs: {
    orderUpdates:  { type: Boolean, default: true },
    promotions:    { type: Boolean, default: true },
    wallet:        { type: Boolean, default: true },
    groupOrders:   { type: Boolean, default: true },
  },

  // ─── Subscription ──────────────────────────────────────────────────────────
  activePlanId:         { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
  stripeCustomerId:     String,

  // ─── Timestamps ────────────────────────────────────────────────────────────
  lastLoginAt: Date,
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.passwordHash;
      delete ret.__v;
      return ret;
    },
  },
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ referralCode: 1 }, { sparse: true });
userSchema.index({ status: 1, role: 1 });

// ─── Methods ──────────────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (plainPwd) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainPwd, this.passwordHash);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toJSON();
  return obj;
};

// ─── Pre-save ─────────────────────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash') && this.passwordHash && !this.passwordHash.startsWith('$2')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

const User = mongoose.model('User', userSchema);
export default User;
