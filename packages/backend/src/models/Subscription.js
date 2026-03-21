import mongoose from 'mongoose';
import { SUBSCRIPTION_STATUS } from '@tastr/shared';

const subscriptionSchema = new mongoose.Schema({
  userId:                 { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  planId:                 { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  status:                 { type: String, enum: Object.values(SUBSCRIPTION_STATUS), default: SUBSCRIPTION_STATUS.ACTIVE },
  startDate:              { type: Date, default: Date.now },
  renewalDate:            Date,
  cancelledAt:            Date,
  cancelAtPeriodEnd:      { type: Boolean, default: false },
  stripeSubscriptionId:   String,
  stripeCustomerId:       String,
  razorpayPaymentId:      String,
  razorpayOrderId:        String,
  billingHistory: [{
    invoiceId:  String,
    amount:     Number,
    status:     String,
    paidAt:     Date,
  }],
}, { timestamps: true });

subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ renewalDate: 1, status: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
