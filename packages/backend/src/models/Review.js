import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    orderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    targetType: { type: String, enum: ['restaurant', 'driver', 'app'], required: true },
    rating:     { type: Number, required: true, min: 1, max: 5 },
    comment:    { type: String, maxlength: 1000, trim: true },
    photos:     [{ type: String }], // Cloudinary URLs
    isVisible:  { type: Boolean, default: true },
    reply:      { type: String, maxlength: 500 },   // restaurant/driver reply
    repliedAt:  { type: Date },
  },
  { timestamps: true }
);

// One review per order per target type
reviewSchema.index({ orderId: 1, targetType: 1 }, { unique: true });
reviewSchema.index({ targetId: 1, targetType: 1 });
reviewSchema.index({ reviewerId: 1 });

export default mongoose.model('Review', reviewSchema);
