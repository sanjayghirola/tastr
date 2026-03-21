import mongoose from 'mongoose';

const toppingOptionSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  price: { type: Number, default: 0 },   // pence / cents
}, { _id: true });

const toppingGroupSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  required:     { type: Boolean, default: false },
  multiSelect:  { type: Boolean, default: false },
  min:          { type: Number, default: 0 },
  max:          { type: Number, default: 1 },
  options:      [toppingOptionSchema],
}, { _id: true });

const ALLERGEN_LIST = ['Celery','Cereals','Crustaceans','Eggs','Fish','Lupin','Milk','Molluscs','Mustard','Nuts','Peanuts','Sesame','Soya','Sulphites'];

const nutritionSchema = new mongoose.Schema({
  calories: { type: Number },   // kcal
  fat:      { type: Number },   // grams
  saturates:{ type: Number },   // grams
  carbs:    { type: Number },   // grams
  sugars:   { type: Number },   // grams
  protein:  { type: Number },   // grams
  salt:     { type: Number },   // grams
  fibre:    { type: Number },   // grams
}, { _id: false });

const menuItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  categoryId:   { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory', required: true },

  name:         { type: String, required: true, trim: true },
  description:  { type: String },
  price:        { type: Number, required: true },          // pence / cents
  calories:     { type: Number },                          // kept for quick display
  nutrition:    { type: nutritionSchema, default: {} },
  allergens:    [{ type: String, enum: ALLERGEN_LIST }],
  photoUrl:     String,
  photoPublicId:String,

  dietary:      [{ type: String, enum: ['Vegan','Vegetarian','Gluten-Free','Halal','Nut-Free','Dairy-Free'] }],
  toppingGroups:[toppingGroupSchema],

  isAvailable:  { type: Boolean, default: true },
  sortOrder:    { type: Number, default: 0 },
}, { timestamps: true });

menuItemSchema.index({ restaurantId: 1, categoryId: 1, sortOrder: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export { ALLERGEN_LIST };
export default MenuItem;
