import mongoose from 'mongoose';

const cuisineCategorySchema = new mongoose.Schema({
  name:      { type: String, required: true, unique: true, trim: true },
  icon:      { type: String, default: '🍽' },   // emoji or URL
  sortOrder: { type: Number, default: 0 },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

const CuisineCategory = mongoose.model('CuisineCategory', cuisineCategorySchema);
export default CuisineCategory;
