import Cart from '../models/Cart.js';
import MenuItem from '../models/MenuItem.js';
import Restaurant from '../models/Restaurant.js';
import PromoCode from '../models/PromoCode.js';
import Order from '../models/Order.js';
import { ENTITY_STATUS } from '@tastr/shared';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function calcSubtotal(items) {
  return items.reduce((sum, item) => {
    const tops = item.selectedToppings.reduce((t, o) => t + (o.price || 0), 0);
    return sum + (item.price + tops) * item.quantity;
  }, 0);
}

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) cart = new Cart({ userId, items: [] });
  return cart;
}

// ─── GET /api/cart ────────────────────────────────────────────────────────────
export async function getCart(req, res, next) {
  try {
    const cart = await Cart.findOne({ userId: req.user._id })
      .populate('restaurantId', 'name logoUrl isOnline deliveryFee estimatedDeliveryMin minOrderAmount')
      .lean({ virtuals: true });

    if (!cart) return res.json({ success: true, cart: null });

    const subtotal = calcSubtotal(cart.items);
    res.json({ success: true, cart: { ...cart, subtotal } });
  } catch (err) { next(err); }
}

// ─── POST /api/cart/items ─────────────────────────────────────────────────────
export async function addItem(req, res, next) {
  try {
    const { menuItemId, quantity, selectedToppings = [], note } = req.body;

    const menuItem = await MenuItem.findById(menuItemId).lean();
    if (!menuItem || !menuItem.isAvailable) {
      return res.status(404).json({ success: false, message: 'Item not available' });
    }

    const restaurant = await Restaurant.findById(menuItem.restaurantId)
      .select('name logoUrl isOnline status deliveryFee estimatedDeliveryMin minOrderAmount').lean();
    if (!restaurant || restaurant.status !== ENTITY_STATUS.ACTIVE) {
      return res.status(400).json({ success: false, message: 'Restaurant not available' });
    }
    if (!restaurant.isOnline) {
      return res.status(400).json({ success: false, message: 'Restaurant is currently closed. Please try again when they are open.' });
    }

    let cart = await getOrCreateCart(req.user._id);

    // Same-restaurant guard
    let clearedCart = false;
    if (cart.restaurantId && cart.restaurantId.toString() !== menuItem.restaurantId.toString()) {
      cart.items           = [];
      cart.promoCode       = undefined;
      cart.promoDiscount   = 0;
      cart.giftCardCode    = undefined;
      cart.giftCardAmount  = 0;
      cart.tip             = 0;
      cart.donation        = 0;
      clearedCart          = true;
    }

    cart.restaurantId   = menuItem.restaurantId;
    cart.restaurantName = restaurant.name;

    // Validate toppings
    const validToppings = [];
    for (const sel of selectedToppings) {
      const group = menuItem.toppingGroups?.find(g => g._id.toString() === sel.groupId || g.name === sel.groupName);
      if (!group) continue;
      const option = group.options.find(o => o.name === sel.optionName);
      if (!option) continue;
      validToppings.push({ groupName: group.name, optionName: option.name, price: option.price || 0 });
    }

    // Check if same item+toppings already in cart
    const toppingKey  = JSON.stringify(validToppings.map(t => t.optionName).sort());
    const existing    = cart.items.find(i =>
      i.menuItemId.toString() === menuItemId &&
      JSON.stringify(i.selectedToppings.map(t => t.optionName).sort()) === toppingKey
    );

    if (existing) {
      existing.quantity += quantity;
      if (note !== undefined) existing.note = note;
    } else {
      cart.items.push({
        menuItemId,
        name:             menuItem.name,
        price:            menuItem.price,
        quantity,
        photoUrl:         menuItem.photoUrl,
        selectedToppings: validToppings,
        note,
      });
    }

    await cart.save();
    const subtotal = calcSubtotal(cart.items);
    res.json({ success: true, cart: { ...cart.toObject(), subtotal }, clearedCart });
  } catch (err) { next(err); }
}

// ─── PATCH /api/cart/items/:itemId ────────────────────────────────────────────
export async function updateItem(req, res, next) {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not in cart' });

    const { quantity, selectedToppings, note } = req.body;
    if (quantity !== undefined) {
      if (quantity <= 0) { item.deleteOne(); }
      else               { item.quantity = quantity; }
    }
    if (note !== undefined) item.note = note;
    if (selectedToppings !== undefined) item.selectedToppings = selectedToppings;

    if (!cart.items.length) {
      cart.restaurantId   = undefined;
      cart.restaurantName = undefined;
    }

    await cart.save();
    const subtotal = calcSubtotal(cart.items);
    res.json({ success: true, cart: { ...cart.toObject(), subtotal } });
  } catch (err) { next(err); }
}

// ─── DELETE /api/cart/items/:itemId ───────────────────────────────────────────
export async function removeItem(req, res, next) {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not in cart' });
    item.deleteOne();

    if (!cart.items.length) {
      cart.restaurantId   = undefined;
      cart.restaurantName = undefined;
    }
    await cart.save();
    const subtotal = calcSubtotal(cart.items);
    res.json({ success: true, cart: { ...cart.toObject(), subtotal } });
  } catch (err) { next(err); }
}

// ─── DELETE /api/cart ─────────────────────────────────────────────────────────
export async function clearCart(req, res, next) {
  try {
    await Cart.findOneAndDelete({ userId: req.user._id });
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ─── POST /api/cart/promo ─────────────────────────────────────────────────────
export async function applyPromo(req, res, next) {
  try {
    const { code } = req.body;
    const now      = new Date();

    const promo = await PromoCode.findOne({
      code: code.toUpperCase(),
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      $or: [{ startsAt: null  }, { startsAt: { $lte: now } }],
    });

    if (!promo) return res.status(400).json({ success: false, message: 'Invalid or expired promo code' });

    // Usage check
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return res.status(400).json({ success: false, message: 'Promo code has reached maximum uses' });
    }

    // Per-user check
    const userOrderCount = await Order.countDocuments({ customerId: req.user._id, promoCode: code });
    if (userOrderCount >= promo.maxUsesPerUser) {
      return res.status(400).json({ success: false, message: 'You have already used this promo code' });
    }

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return res.status(400).json({ success: false, message: 'Cart is empty' });

    const subtotal = calcSubtotal(cart.items);
    if (subtotal < promo.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order £${(promo.minOrderAmount / 100).toFixed(2)} required`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (promo.type === 'percent') {
      discount = Math.round(subtotal * promo.value / 100);
      if (promo.maxDiscountPence) discount = Math.min(discount, promo.maxDiscountPence);
    } else if (promo.type === 'fixed') {
      discount = Math.min(promo.value, subtotal);
    } else if (promo.type === 'free_delivery') {
      const restaurant = await Restaurant.findById(cart.restaurantId).select('deliveryFee').lean();
      discount = restaurant?.deliveryFee || 0;
    }

    cart.promoCode     = promo.code;
    cart.promoDiscount = discount;
    await cart.save();

    res.json({
      success: true,
      discount,
      message: `Promo applied! You saved £${(discount / 100).toFixed(2)}`,
    });
  } catch (err) { next(err); }
}

// ─── DELETE /api/cart/promo ───────────────────────────────────────────────────
export async function removePromo(req, res, next) {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (cart) {
      cart.promoCode     = undefined;
      cart.promoDiscount = 0;
      await cart.save();
    }
    res.json({ success: true });
  } catch (err) { next(err); }
}

// ─── PATCH /api/cart/extras ───────────────────────────────────────────────────
export async function updateExtras(req, res, next) {
  try {
    const { tip, donation, customerNote, disposableEssentials, isGift, giftRecipient } = req.body;
    const cart = await getOrCreateCart(req.user._id);
    if (tip                  !== undefined) cart.tip                  = tip;
    if (donation             !== undefined) cart.donation             = donation;
    if (customerNote         !== undefined) cart.customerNote         = customerNote;
    if (disposableEssentials !== undefined) cart.disposableEssentials = disposableEssentials;
    if (isGift               !== undefined) cart.isGift               = isGift;
    if (giftRecipient        !== undefined) cart.giftRecipient        = giftRecipient;
    await cart.save();
    const subtotal = calcSubtotal(cart.items);
    res.json({ success: true, cart: { ...cart.toObject(), subtotal } });
  } catch (err) { next(err); }
}
