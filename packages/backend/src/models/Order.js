import mongoose from 'mongoose';
import { ORDER_STATUS, ORDER_TYPE, PAYMENT_METHOD } from '@tastr/shared';
import { nanoid } from 'nanoid';

const orderItemToppingSchema = new mongoose.Schema({
  groupName:  { type: String, required: true },
  optionName: { type: String, required: true },
  price:      { type: Number, default: 0 },
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  menuItemId:        { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name:              { type: String, required: true },
  price:             { type: Number, required: true },       // unit price at time of order (pence)
  quantity:          { type: Number, required: true, min: 1 },
  photoUrl:          String,
  selectedToppings:  [orderItemToppingSchema],
  note:              String,
  subtotal:          { type: Number, required: true },       // price * qty + toppings
}, { _id: true });

const timelineSchema = new mongoose.Schema({
  status:    { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  note:      String,
  actorId:   { type: mongoose.Schema.Types.ObjectId },
  actorType: { type: String, enum: ['customer', 'restaurant', 'driver', 'system', 'admin'] },
}, { _id: false });

const giftRecipientSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  phone:    { type: String, required: true },
  address:  {
    line1: String, line2: String, city: String,
    postcode: String, country: { type: String, default: 'GB' },
    lat: Number, lng: Number,
  },
  message:  String,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  // ─── Identifiers ──────────────────────────────────────────────────────────
  orderId:       { type: String, unique: true },       // human-readable e.g. TAS-X8F2K
  customerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  driverId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

  // ─── Items ────────────────────────────────────────────────────────────────
  items:         [orderItemSchema],

  // ─── Amounts (all in pence) ───────────────────────────────────────────────
  subtotal:      { type: Number, required: true },
  deliveryFee:   { type: Number, default: 0 },
  discount:      { type: Number, default: 0 },
  vatAmount:     { type: Number, default: 0 },
  tip:           { type: Number, default: 0 },
  donation:      { type: Number, default: 0 },
  total:         { type: Number, required: true },

  // ─── Platform Pricing (populated at order time) ───────────────────────────
  markupAmount:         { type: Number, default: 0 },
  markupType:           { type: String, enum: ['fixed', 'percent', null], default: null },
  markupValue:          { type: Number, default: 0 },
  serviceFeeAmount:     { type: Number, default: 0 },
  serviceFeeType:       { type: String, enum: ['fixed', 'percent', null], default: null },
  serviceFeeValue:      { type: Number, default: 0 },
  commissionRate:       { type: Number, default: 0 },
  commissionAmount:     { type: Number, default: 0 },
  isCommissionOverride: { type: Boolean, default: false },
  deliveryFeeDriver:    { type: Number, default: 0 },
  deliveryFeePlatform:  { type: Number, default: 0 },
  deliveryModel:        { type: String, enum: ['own', 'tastr'], default: 'tastr' },
  restaurantPayout:     { type: Number, default: 0 },
  driverPayout:         { type: Number, default: 0 },
  platformRevenue:      { type: Number, default: 0 },
  settlementStatus:     { type: String, enum: ['pending', 'settled', 'failed'], default: 'pending' },
  settlementWeek:       String,
  settledAt:            Date,

  // ─── Type & status ────────────────────────────────────────────────────────
  type:          { type: String, enum: Object.values(ORDER_TYPE), default: ORDER_TYPE.STANDARD },
  status:        { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.PENDING },
  timeline:      [timelineSchema],

  // ─── Delivery ─────────────────────────────────────────────────────────────
  deliveryAddress: {
    label: String, line1: String, line2: String,
    city: String, postcode: String, country: { type: String, default: 'GB' },
    lat: Number, lng: Number,
  },
  scheduledAt:   Date,
  estimatedDeliveryAt: Date,

  // ─── Gift ─────────────────────────────────────────────────────────────────
  giftRecipient: giftRecipientSchema,

  // ─── Payment ──────────────────────────────────────────────────────────────
  paymentMethod:     { type: String, enum: Object.values(PAYMENT_METHOD), default: PAYMENT_METHOD.CARD },
  paymentGateway:     { type: String, enum: ['STRIPE', 'RAZORPAY'], default: 'STRIPE' },
  razorpayOrderId:   String,
  razorpayPaymentId: String,
  paymentIntentId:   String,
  stripeChargeId:    String,
  promoCode:         String,
  promoDiscount:     { type: Number, default: 0 },
  giftCardCode:      String,
  giftCardAmount:    { type: Number, default: 0 },
  studentDiscount:   { type: Number, default: 0 },
  walletAmountUsed:  { type: Number, default: 0 },

  // ─── Extras ───────────────────────────────────────────────────────────────
  disposableEssentials: { type: Boolean, default: false },
  customerNote:    String,

  // ─── Verification PINs ──────────────────────────────────────────────────
  pickupPin:       { type: String },  // 4-digit PIN — driver enters at restaurant to collect
  deliveryOtp:     { type: String },  // 4-digit OTP — customer gives to driver on delivery
  pickupVerified:  { type: Boolean, default: false },
  deliveryVerified:{ type: Boolean, default: false },

  // ─── Ratings (set in P6) ──────────────────────────────────────────────────
  ratings: {
    restaurant: { score: Number, comment: String, submittedAt: Date },
    driver:     { score: Number, comment: String, submittedAt: Date },
  },

  // ─── Refund (set in P6) ───────────────────────────────────────────────────
  refundAmount:   { type: Number, default: 0 },
  refundedAt:     Date,

  // ─── Post-order ───────────────────────────────────────────────────────────
  isRated:        { type: Boolean, default: false },
  groupOrderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'GroupOrder' },

  // ─── Restaurant order management ────────────────────────────────────────
  prepTime:        { type: Number },           // estimated prep time in minutes
  rejectionReason: String,
  readyAt:         Date,
  pickedUpAt:      Date,
  autoAccepted:    { type: Boolean, default: false },
}, { timestamps: true });

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ driverId: 1, status: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderId: 1 }, { unique: true });

// Auto-generate human-readable orderId and verification PINs
orderSchema.pre('validate', function (next) {
  if (!this.orderId) {
    this.orderId = `TAS-${nanoid(5).toUpperCase()}`;
  }
  // Generate 4-digit pickup PIN (restaurant shows → driver enters to collect)
  if (!this.pickupPin) {
    this.pickupPin = String(Math.floor(1000 + Math.random() * 9000));
  }
  // Generate 4-digit delivery OTP (customer receives → gives to driver)
  if (!this.deliveryOtp) {
    this.deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);
export default Order;