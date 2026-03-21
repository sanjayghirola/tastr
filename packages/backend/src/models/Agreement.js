import mongoose from 'mongoose';

const agreementSchema = new mongoose.Schema({
  type:        { type: String, enum: ['restaurant', 'driver'], required: true },
  title:       { type: String, required: true },
  content:     { type: String, required: true },   // rich HTML
  version:     { type: String, required: true, default: '1.0' },
  isActive:    { type: Boolean, default: true },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

agreementSchema.index({ type: 1, isActive: 1 });

export default mongoose.model('Agreement', agreementSchema);
