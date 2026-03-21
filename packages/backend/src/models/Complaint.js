import mongoose from 'mongoose';

const complaintTimelineSchema = new mongoose.Schema({
  action:    { type: String, required: true },
  actorId:   { type: mongoose.Schema.Types.ObjectId },
  actorType: { type: String, enum: ['customer', 'restaurant', 'admin', 'system'] },
  note:      { type: String },
  at:        { type: Date, default: Date.now },
}, { _id: false });

const complaintSchema = new mongoose.Schema(
  {
    orderId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    customerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },

    type: {
      type: String,
      enum: ['missing_item', 'wrong_item', 'quality', 'late_delivery', 'damaged', 'driver_behaviour', 'other'],
      required: true,
    },
    description: { type: String, required: true, maxlength: 2000 },
    evidence:    [{ type: String }], // Cloudinary URLs

    // Status flow: open → under_review → resolved / closed
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved', 'closed'],
      default: 'open',
    },

    // Restaurant response
    restaurantResponse: { type: String, maxlength: 1000 },
    restaurantAction:   { type: String, enum: ['accept_refund', 'dispute', null], default: null },
    respondedAt:        { type: Date },

    // Admin resolution
    resolution: {
      type: String,
      enum: ['full_refund', 'partial_refund', 'declined', null],
      default: null,
    },
    refundAmount: { type: Number, default: 0 }, // pence
    adminNote:    { type: String, maxlength: 1000 },
    resolvedAt:   { type: Date },
    resolvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

    timeline: [complaintTimelineSchema],
  },
  { timestamps: true }
);

complaintSchema.index({ customerId: 1 });
complaintSchema.index({ restaurantId: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ orderId: 1 });

export default mongoose.model('Complaint', complaintSchema);
