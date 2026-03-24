import mongoose from 'mongoose';

const distanceTierSchema = new mongoose.Schema({
  minKm:    { type: Number, required: true },
  maxKm:    { type: Number, required: true },
  feePence: { type: Number, required: true },
}, { _id: false });

const commissionOverrideSchema = new mongoose.Schema({
  restaurantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  name:           { type: String },
  commissionRate: { type: Number },
}, { _id: false });

const platformConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },

  // ─── Item Markup ──────────────────────────────────────────────────────
  markup: {
    enabled: { type: Boolean, default: false },
    type:    { type: String, enum: ['fixed', 'percent'], default: 'percent' },
    value:   { type: Number, default: 10 },
  },

  // ─── Service Fee ──────────────────────────────────────────────────────
  serviceFee: {
    enabled: { type: Boolean, default: true },
    type:    { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
    value:   { type: Number, default: 150 },
  },

  // ─── Commission Rates ─────────────────────────────────────────────────
  commission: {
    selfDeliveryRate:  { type: Number, default: 10 },
    tastrDeliveryRate: { type: Number, default: 18 },
    tastrDeliveryMin:  { type: Number, default: 15 },
    tastrDeliveryMax:  { type: Number, default: 20 },
    overrides: [commissionOverrideSchema],
  },

  // ─── Delivery Fee Margin ──────────────────────────────────────────────
  deliveryMargin: {
    driverPercent: { type: Number, default: 70 },
  },

  // ─── Delivery Pricing (NEW) ───────────────────────────────────────────
  delivery: {
    platformBaseFee:       { type: Number, default: 199 },   // pence — fallback if no tier matches
    platformFeePercent:    { type: Number, default: 0 },     // optional % on top
    freeDeliveryThreshold: { type: Number, default: 0 },     // pence — 0 = disabled
    minOrderPlatform:      { type: Number, default: 0 },     // pence — minimum order value
    estimatedDeliveryMin:  { type: Number, default: 30 },    // minutes
    estimatedDeliveryMax:  { type: Number, default: 45 },    // minutes

    // Distance-based tiers
    tiers: {
      type: [distanceTierSchema],
      default: [
        { minKm: 0, maxKm: 2,  feePence: 99  },
        { minKm: 2, maxKm: 5,  feePence: 199 },
        { minKm: 5, maxKm: 10, feePence: 299 },
      ],
    },

    // Surge pricing
    surgeEnabled:        { type: Boolean, default: false },
    surgeMultiplier:     { type: Number, default: 1.5 },
    surgeTriggerMinutes: { type: Number, default: 20 },

    // Express delivery
    expressEnabled:  { type: Boolean, default: true },
    expressExtraFee: { type: Number, default: 200 },   // pence
  },

}, { timestamps: true });

// Ensure only one config doc exists
platformConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne({ key: 'pricing' });
  if (!config) {
    config = await this.create({ key: 'pricing' });
  }
  return config;
};

platformConfigSchema.statics.updateConfig = async function (data) {
  return this.findOneAndUpdate(
    { key: 'pricing' },
    { $set: data },
    { new: true, upsert: true, runValidators: true }
  );
};

const PlatformConfig = mongoose.model('PlatformConfig', platformConfigSchema);
export default PlatformConfig;