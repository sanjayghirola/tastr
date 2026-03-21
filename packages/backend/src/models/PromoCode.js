import mongoose from 'mongoose';

const promoCategorySchema = new mongoose.Schema({
  type:             { type: String, enum: ['percent', 'fixed', 'free_delivery'], required: true },
  value:            { type: Number, required: true },   // percent (0–100) or pence
  maxDiscountPence: Number,                             // cap on percent discounts

  // Eligibility
  minOrderAmount:   { type: Number, default: 0 },       // pence
  maxUses:          { type: Number, default: null },     // null = unlimited
  maxUsesPerUser:   { type: Number, default: 1 },
  usedCount:        { type: Number, default: 0 },

  // Targeting
  restaurantId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },  // null = any
  userIds:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],       // empty = any
  newUsersOnly:     { type: Boolean, default: false },
  studentOnly:      { type: Boolean, default: false },

  // Dates
  startsAt:         Date,
  expiresAt:        Date,

  isActive:         { type: Boolean, default: true },
  code:             { type: String, required: true, uppercase: true, unique: true, trim: true },
  description:      String,
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

promoCategorySchema.index({ code: 1 }, { unique: true });
promoCategorySchema.index({ isActive: 1, expiresAt: 1 });

const PromoCode = mongoose.model('PromoCode', promoCategorySchema);
export default PromoCode;
