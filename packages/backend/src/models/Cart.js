import mongoose from 'mongoose';

const cartItemToppingSchema = new mongoose.Schema({
  groupName:  String,
  optionName: String,
  price:      { type: Number, default: 0 },
}, { _id: false });

const cartItemSchema = new mongoose.Schema({
  menuItemId:       { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name:             { type: String, required: true },
  price:            { type: Number, required: true },   // unit price in pence
  quantity:         { type: Number, required: true, min: 1 },
  photoUrl:         String,
  selectedToppings: [cartItemToppingSchema],
  note:             String,
}, { _id: true });

const cartSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  restaurantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  restaurantName: String,
  items:          [cartItemSchema],

  // Promo / gift card
  promoCode:         String,
  promoDiscount:     { type: Number, default: 0 },  // pence
  giftCardCode:      String,
  giftCardAmount:    { type: Number, default: 0 },  // pence

  // Extras
  tip:                  { type: Number, default: 0 },    // pence
  donation:             { type: Number, default: 0 },    // pence
  disposableEssentials: { type: Boolean, default: false },
  customerNote:         String,
  isGift:               { type: Boolean, default: false },
  giftRecipient: {
    name: String, phone: String,
    address: { line1: String, city: String, postcode: String },
    message: String,
  },

  // TTL index — cart expires after 30 min of inactivity
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 60 * 1000) },
}, { timestamps: true });

cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Computed subtotal virtual
cartSchema.virtual('subtotal').get(function () {
  return this.items.reduce((sum, item) => {
    const toppingTotal = item.selectedToppings.reduce((t, top) => t + (top.price || 0), 0);
    return sum + (item.price + toppingTotal) * item.quantity;
  }, 0);
});

// Reset TTL on any modification
cartSchema.pre('save', function (next) {
  this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  next();
});

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
