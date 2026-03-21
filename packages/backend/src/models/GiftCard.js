import mongoose from 'mongoose';
import { GIFT_CARD_STATUS } from '@tastr/shared';

const giftCardSchema = new mongoose.Schema({
  code:        { type: String, required: true, unique: true, uppercase: true },
  value:       { type: Number, required: true },   // original value in pence
  balance:     { type: Number, required: true },   // remaining balance in pence
  purchasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  redeemedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  redeemedAt:  Date,
  status:      { type: String, enum: Object.values(GIFT_CARD_STATUS), default: GIFT_CARD_STATUS.ACTIVE },
  expiresAt:   { type: Date, required: true },
  stripePaymentIntentId: String,
  razorpayPaymentId: String,
  razorpayOrderId: String,
  emailDelivery: {
    recipientEmail: String,
    recipientName:  String,
    message:        String,
    sentAt:         Date,
  },
}, { timestamps: true });

giftCardSchema.index({ code: 1 });
giftCardSchema.index({ purchasedBy: 1 });
giftCardSchema.index({ redeemedBy: 1 });
giftCardSchema.index({ expiresAt: 1 });

const GiftCard = mongoose.model('GiftCard', giftCardSchema);
export default GiftCard;
