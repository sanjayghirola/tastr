import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'DriverStoreProduct', required: true },
  name:        String,
  price:       Number,
  qty:         { type: Number, default: 1 },
}, { _id: false });

const driverStoreOrderSchema = new mongoose.Schema({
  driverId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  items:        [itemSchema],
  total:        { type: Number, required: true },
  paymentMethod:{ type: String, enum: ['wallet','stripe'], default: 'wallet' },
  paymentStatus:{ type: String, enum: ['pending','paid','failed'], default: 'pending' },
  stripePaymentIntentId: String,
  address:      String,
}, { timestamps: true });

export default mongoose.model('DriverStoreOrder', driverStoreOrderSchema);
