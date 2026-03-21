import mongoose from 'mongoose';

const menuCategorySchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name:         { type: String, required: true, trim: true },
  sortOrder:    { type: Number, default: 0 },
  isEnabled:    { type: Boolean, default: true },
}, { timestamps: true });

menuCategorySchema.index({ restaurantId: 1, sortOrder: 1 });

const MenuCategory = mongoose.model('MenuCategory', menuCategorySchema);
export default MenuCategory;
