import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriverStoreProduct', required: true },
  name:      String,
  photoUrl:  String,
  price:     Number,     // pence at time of purchase
  qty:       { type: Number, default: 1 },
  subtotal:  Number,     // price * qty
}, { _id: false });

const driverStoreOrderSchema = new mongoose.Schema({
  orderId:       { type: String, unique: true },  // human-readable e.g. DSO-X8F2K
  driverId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items:         [itemSchema],
  itemCount:     { type: Number, default: 0 },
  total:         { type: Number, required: true },   // pence

  // Payment
  paymentMethod: { type: String, enum: ['wallet', 'stripe'], default: 'wallet' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  stripePaymentIntentId: String,
  razorpayOrderId:       String,
  razorpayPaymentId:     String,

  // Fulfillment (managed by admin)
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'placed',
  },
  trackingNumber: String,
  trackingUrl:    String,
  adminNote:      String,
  shippedAt:      Date,
  deliveredAt:    Date,

  // Delivery address
  deliveryAddress: {
    line1:    String,
    line2:    String,
    city:     String,
    postcode: String,
    country:  { type: String, default: 'GB' },
    phone:    String,
  },
}, { timestamps: true });

driverStoreOrderSchema.index({ driverId: 1, createdAt: -1 });
driverStoreOrderSchema.index({ userId: 1, createdAt: -1 });
driverStoreOrderSchema.index({ status: 1 });

// Auto-generate order ID
driverStoreOrderSchema.pre('validate', function (next) {
  if (!this.orderId) {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    this.orderId = `DSO-${code}`;
  }
  this.itemCount = this.items?.reduce((s, i) => s + i.qty, 0) || 0;
  next();
});

export default mongoose.model('DriverStoreOrder', driverStoreOrderSchema);