import mongoose from 'mongoose';
import { PLAN_INTERVAL } from '@tastr/shared';

const subscriptionPlanSchema = new mongoose.Schema({
  name:            { type: String, required: true },
  description:     String,
  price:           { type: Number, required: true },   // pence/period
  interval:        { type: String, enum: Object.values(PLAN_INTERVAL), default: PLAN_INTERVAL.MONTHLY },
  features:        [String],
  freeDelivery:    { type: Boolean, default: false },
  deliveryDiscount:{ type: Number, default: 0 },       // pence off each delivery
  isActive:        { type: Boolean, default: true },
  isFeatured:      { type: Boolean, default: false },
  stripePriceId:   String,
  sortOrder:       { type: Number, default: 0 },
}, { timestamps: true });

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
export default SubscriptionPlan;
