import mongoose from 'mongoose';

const driverStoreProductSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  photoUrl:     { type: String, default: '' },
  photoPublicId:String,
  price:        { type: Number, required: true },   // pence
  stock:        { type: Number, default: 0 },
  category:     { type: String, enum: ['equipment','clothing','accessories','safety','other'], default: 'equipment' },
  isActive:     { type: Boolean, default: true },
  soldCount:    { type: Number, default: 0 },
}, { timestamps: true });

driverStoreProductSchema.index({ isActive: 1, category: 1 });

export default mongoose.model('DriverStoreProduct', driverStoreProductSchema);
