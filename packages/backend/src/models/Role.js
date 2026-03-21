import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },  // null = admin-defined
  permissions:  [{ type: String }],
  isSystem:     { type: Boolean, default: false },   // system roles cannot be deleted
  createdBy:    { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

roleSchema.index({ restaurantId: 1 });

const Role = mongoose.model('Role', roleSchema);
export default Role;
