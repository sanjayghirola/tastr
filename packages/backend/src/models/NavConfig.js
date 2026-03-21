import mongoose from 'mongoose';

const navConfigSchema = new mongoose.Schema({
  platform:   { type: String, required: true, enum: ['customer','restaurant','admin'] },
  items:      [{
    key:     { type: String, required: true },
    label:   { type: String, required: true },
    enabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  }],
  updatedBy:  { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

navConfigSchema.index({ platform: 1 }, { unique: true });

const NavConfig = mongoose.model('NavConfig', navConfigSchema);
export default NavConfig;
