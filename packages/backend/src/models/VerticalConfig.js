import mongoose from 'mongoose';

const verticalConfigSchema = new mongoose.Schema({
  key:         { type: String, required: true, unique: true },
  label:       { type: String, required: true },
  enabled:     { type: Boolean, default: false },
  commission:  { type: Number, default: 15 },
  deliveryFee: { type: Number, default: 199 },
  icon:        { type: String, default: '' },
  color:       { type: String, default: '#C18B3C' },
  sortOrder:   { type: Number, default: 0 },
}, { timestamps: true });

const VerticalConfig = mongoose.model('VerticalConfig', verticalConfigSchema);
export default VerticalConfig;
