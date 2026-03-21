import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  subtitle:    String,
  imageUrl:    { type: String, default: '' },
  imagePublicId: String,
  linkType:    { type: String, enum: ['restaurant', 'category', 'promo', 'external', 'none'], default: 'none' },
  linkValue:   String,              // restaurantId, category slug, promo code, or URL
  type:        { type: String, enum: ['hero', 'promo', 'student', 'gift'], default: 'hero' },
  isActive:    { type: Boolean, default: true },
  sortOrder:   { type: Number, default: 0 },
  startDate:   Date,
  endDate:     Date,
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

bannerSchema.index({ type: 1, isActive: 1, sortOrder: 1 });

const Banner = mongoose.model('Banner', bannerSchema);
export default Banner;
