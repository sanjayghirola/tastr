import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const groupItemToppingSchema = new mongoose.Schema({
  groupName:  { type: String, required: true },
  optionName: { type: String, required: true },
  price:      { type: Number, default: 0 },
}, { _id: false });

const groupItemSchema = new mongoose.Schema({
  menuItemId:       { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name:             { type: String, required: true },
  price:            { type: Number, required: true },
  quantity:         { type: Number, required: true, min: 1 },
  photoUrl:         String,
  selectedToppings: [groupItemToppingSchema],
  note:             String,
  subtotal:         { type: Number, required: true },
}, { _id: true });

const groupMemberSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  displayName: { type: String, required: true },
  items:       [groupItemSchema],
  subtotal:    { type: Number, default: 0 },
  joinedAt:    { type: Date, default: Date.now },
}, { _id: false });

const groupOrderSchema = new mongoose.Schema(
  {
    hostId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name:         { type: String, required: true, trim: true, maxlength: 80 },
    inviteCode:   { type: String, unique: true },
    members:      [groupMemberSchema],
    status:       { type: String, enum: ['open', 'locked', 'ordered', 'cancelled'], default: 'open' },
    expiresAt:    { type: Date, default: () => new Date(Date.now() + 2 * 60 * 60 * 1000) }, // 2h TTL
    mainOrderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    deliveryAddress: {
      line1: String, line2: String,
      city: String, postcode: String, country: { type: String, default: 'GB' },
      lat: Number, lng: Number,
    },
  },
  { timestamps: true }
);

// Generate invite code before save
groupOrderSchema.pre('save', function (next) {
  if (!this.inviteCode) {
    this.inviteCode = nanoid(8).toUpperCase();
  }
  next();
});

// Recalculate member subtotals
groupOrderSchema.methods.recalcMember = function (userId) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  if (member) {
    member.subtotal = member.items.reduce((sum, item) => sum + item.subtotal, 0);
  }
};

// Virtual: grand total across all members
groupOrderSchema.virtual('grandTotal').get(function () {
  return this.members.reduce((sum, m) => sum + m.subtotal, 0);
});

groupOrderSchema.index({ hostId: 1 });
groupOrderSchema.index({ 'members.userId': 1 });
groupOrderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('GroupOrder', groupOrderSchema);
