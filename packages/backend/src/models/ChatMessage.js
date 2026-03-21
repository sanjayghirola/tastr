import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    orderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    senderId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    senderRole: { type: String, enum: ['customer', 'driver', 'restaurant', 'admin'], required: true },
    text:       { type: String, required: true, maxlength: 1000 },
    read:       { type: Boolean, default: false },
    readAt:     { type: Date },
  },
  { timestamps: true }
);

chatMessageSchema.index({ orderId: 1, createdAt: 1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
