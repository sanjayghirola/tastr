import mongoose from 'mongoose';

const userNotificationSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, required: true },
  body:     { type: String, default: '' },
  type:     { type: String, enum: ['order','wallet','promo','referral','review','alert','info','success'], default: 'info' },
  isRead:   { type: Boolean, default: false },
  meta:     { type: mongoose.Schema.Types.Mixed, default: {} }, // { orderId, etc. }
}, { timestamps: true });

userNotificationSchema.index({ userId: 1, createdAt: -1 });
userNotificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model('UserNotification', userNotificationSchema);
