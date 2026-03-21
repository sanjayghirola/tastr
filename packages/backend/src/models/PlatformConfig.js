const mongoose = require('mongoose')

const platformConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },

  // ─── Item Markup ──────────────────────────────────────────────────────
  markup: {
    enabled: { type: Boolean, default: false },
    type:    { type: String, enum: ['fixed', 'percent'], default: 'percent' },
    value:   { type: Number, default: 10 }, // pence if fixed, percent if percent
  },

  // ─── Service Fee ──────────────────────────────────────────────────────
  serviceFee: {
    enabled: { type: Boolean, default: true },
    type:    { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
    value:   { type: Number, default: 150 }, // pence (£1.50) or percent
  },

  // ─── Commission Rates ─────────────────────────────────────────────────
  commission: {
    selfDeliveryRate:  { type: Number, default: 10 },   // %
    tastrDeliveryRate: { type: Number, default: 18 },   // %
    tastrDeliveryMin:  { type: Number, default: 15 },   // %
    tastrDeliveryMax:  { type: Number, default: 20 },   // %
    overrides: [{
      restaurantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
      name:           { type: String },
      commissionRate: { type: Number },
    }],
  },

  // ─── Delivery Fee Margin ──────────────────────────────────────────────
  deliveryMargin: {
    driverPercent: { type: Number, default: 70 }, // driver gets 70%, Tastr keeps 30%
  },

}, { timestamps: true })

// Ensure only one config doc exists
platformConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne({ key: 'pricing' })
  if (!config) {
    config = await this.create({ key: 'pricing' })
  }
  return config
}

platformConfigSchema.statics.updateConfig = async function (data) {
  return this.findOneAndUpdate(
    { key: 'pricing' },
    { $set: data },
    { new: true, upsert: true, runValidators: true }
  )
}

module.exports = mongoose.model('PlatformConfig', platformConfigSchema)
