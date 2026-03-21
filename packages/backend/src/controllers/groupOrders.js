import GroupOrder from '../models/GroupOrder.js';
import Order from '../models/Order.js';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import { nanoid } from 'nanoid';
import { getIO } from '../sockets/index.js';
import { ORDER_STATUS, ORDER_TYPE, PAYMENT_METHOD } from '@tastr/shared';
import { getStripe, isStripeEnabled } from '../config/stripe.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function emitGroupEvent(groupId, event, payload) {
  try { getIO().to(`group:${groupId}`).emit(event, payload); } catch { /* non-fatal */ }
}

// ─── POST /api/group-orders ───────────────────────────────────────────────────
export async function createGroup(req, res, next) {
  try {
    const { name, restaurantId, deliveryAddress } = req.body;
    const restaurant = await Restaurant.findById(restaurantId).select('name isOnline').lean();
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const group = await GroupOrder.create({
      hostId:       req.user._id,
      restaurantId,
      name,
      deliveryAddress,
      members: [{
        userId:      req.user._id,
        displayName: req.user.name || req.user.email,
        items:       [],
        subtotal:    0,
      }],
    });

    await group.populate('restaurantId', 'name logoUrl address');
    res.status(201).json({ success: true, group });
  } catch (err) { next(err); }
}

// ─── GET /api/group-orders/my ─────────────────────────────────────────────────
export async function myGroups(req, res, next) {
  try {
    const groups = await GroupOrder.find({
      $or: [{ hostId: req.user._id }, { 'members.userId': req.user._id }],
      status: { $in: ['open', 'locked'] },
    })
      .populate('restaurantId', 'name logoUrl')
      .populate('hostId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, groups });
  } catch (err) { next(err); }
}

// ─── GET /api/group-orders/:id ────────────────────────────────────────────────
export async function getGroup(req, res, next) {
  try {
    const group = await GroupOrder.findById(req.params.id)
      .populate('restaurantId', 'name logoUrl address cuisineCategory')
      .populate('hostId', 'name photo')
      .populate('members.userId', 'name photo')
      .lean();
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json({ success: true, group });
  } catch (err) { next(err); }
}

// ─── POST /api/group-orders/:id/join ─────────────────────────────────────────
export async function joinGroup(req, res, next) {
  try {
    const { inviteCode } = req.body;
    const group = await GroupOrder.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.status !== 'open') return res.status(400).json({ message: 'Group is no longer accepting members' });
    if (group.inviteCode !== inviteCode.toUpperCase()) return res.status(400).json({ message: 'Invalid invite code' });

    const alreadyMember = group.members.some(m => m.userId.toString() === req.user._id.toString());
    if (!alreadyMember) {
      group.members.push({
        userId:      req.user._id,
        displayName: req.user.name || req.user.email,
        items:       [],
        subtotal:    0,
      });
      await group.save();
      emitGroupEvent(group._id, 'group:member-joined', {
        groupId: group._id,
        userId:  req.user._id,
        name:    req.user.name,
      });
    }

    await group.populate('restaurantId', 'name logoUrl');
    res.json({ success: true, group });
  } catch (err) { next(err); }
}

// ─── POST /api/group-orders/:id/items ────────────────────────────────────────
export async function addItem(req, res, next) {
  try {
    const group = await GroupOrder.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.status !== 'open') return res.status(400).json({ message: 'Group is locked for editing' });

    const member = group.members.find(m => m.userId.toString() === req.user._id.toString());
    if (!member) return res.status(403).json({ message: 'You are not a member of this group' });

    const { menuItemId, name, price, quantity, photoUrl, selectedToppings, note, subtotal } = req.body;
    const newItem = { menuItemId, name, price, quantity, photoUrl: photoUrl || '', selectedToppings: selectedToppings || [], note: note || '', subtotal };
    member.items.push(newItem);
    const item = member.items[member.items.length - 1];
    group.recalcMember(req.user._id);
    await group.save();

    emitGroupEvent(group._id, 'group:item-added', { groupId: group._id, userId: req.user._id, item });
    res.status(201).json({ success: true, item, memberSubtotal: member.subtotal });
  } catch (err) { next(err); }
}

// ─── PUT /api/group-orders/:id/items/:itemId ──────────────────────────────────
export async function updateItem(req, res, next) {
  try {
    const group = await GroupOrder.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.status !== 'open') return res.status(400).json({ message: 'Group is locked' });

    const member = group.members.find(m => m.userId.toString() === req.user._id.toString());
    if (!member) return res.status(403).json({ message: 'Not a member' });

    const item = member.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const { quantity, selectedToppings, note, subtotal } = req.body;
    if (quantity != null) item.quantity = quantity;
    if (selectedToppings != null) item.selectedToppings = selectedToppings;
    if (note != null) item.note = note;
    if (subtotal != null) item.subtotal = subtotal;

    group.recalcMember(req.user._id);
    await group.save();

    emitGroupEvent(group._id, 'group:item-updated', { groupId: group._id, userId: req.user._id, item });
    res.json({ success: true, item, memberSubtotal: member.subtotal });
  } catch (err) { next(err); }
}

// ─── DELETE /api/group-orders/:id/items/:itemId ───────────────────────────────
export async function removeItem(req, res, next) {
  try {
    const group = await GroupOrder.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.status !== 'open') return res.status(400).json({ message: 'Group is locked' });

    const member = group.members.find(m => m.userId.toString() === req.user._id.toString());
    if (!member) return res.status(403).json({ message: 'Not a member' });

    member.items.pull(req.params.itemId);
    group.recalcMember(req.user._id);
    await group.save();

    res.json({ success: true });
  } catch (err) { next(err); }
}

// ─── GET /api/group-orders/:id/summary ───────────────────────────────────────
export async function getSummary(req, res, next) {
  try {
    const group = await GroupOrder.findById(req.params.id)
      .populate('members.userId', 'name photo')
      .lean();
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const grandTotal = group.members.reduce((s, m) => s + m.subtotal, 0);
    const allItems   = group.members.flatMap(m => m.items.map(i => ({ ...i, memberName: m.userId?.name || m.displayName })));

    res.json({ success: true, group, grandTotal, allItems });
  } catch (err) { next(err); }
}

// ─── PUT /api/group-orders/:id/address ────────────────────────────────────────
export async function setDeliveryAddress(req, res, next) {
  try {
    const group = await GroupOrder.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the host can set the delivery address' });
    }
    const { line1, line2, city, postcode, country, lat, lng } = req.body;
    if (!line1) return res.status(400).json({ message: 'Address line 1 is required' });
    group.deliveryAddress = { line1, line2, city, postcode, country: country || 'GB', lat, lng };
    await group.save();
    res.json({ success: true, deliveryAddress: group.deliveryAddress });
  } catch (err) { next(err); }
}

// ─── POST /api/group-orders/:id/checkout ─────────────────────────────────────
export async function checkout(req, res, next) {
  try {
    const group = await GroupOrder.findById(req.params.id).populate('restaurantId').lean();
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the host can checkout' });
    }
    if (group.status !== 'open') return res.status(400).json({ message: 'Group already checked out' });

    // Flatten all member items
    const allItems = group.members.flatMap(m =>
      m.items.map(item => ({ ...item, _id: undefined }))
    );
    if (allItems.length === 0) return res.status(400).json({ message: 'No items in group order' });

    const grandTotal = group.members.reduce((s, m) => s + m.subtotal, 0);
    const VAT_RATE = 0.20;
    const vatAmount   = Math.round(grandTotal * VAT_RATE);
    const total       = grandTotal + vatAmount;

    const { paymentMethod, deliveryAddressId, deliveryAddress: inlineAddr } = req.body;
    const user = await User.findById(req.user._id).lean();
    let addr = null;
    // 1. Inline address from request body (new address form)
    if (inlineAddr?.line1) {
      addr = inlineAddr;
    }
    // 2. Saved address by ID
    else if (deliveryAddressId) {
      addr = user.addresses?.find(a => a._id.toString() === deliveryAddressId);
    }
    // 3. Address stored on the group
    else if (group.deliveryAddress?.line1) {
      addr = group.deliveryAddress;
    }
    // 4. User's default address
    else {
      const def = user.addresses?.find(a => a.isDefault) || user.addresses?.[0];
      if (def) addr = { line1: def.line1, city: def.city, postcode: def.postcode, lat: def.lat, lng: def.lng };
    }
    if (!addr) return res.status(400).json({ message: 'Delivery address required. Please add an address before checkout.' });

    const order = await Order.create({
      orderId:      `TAS-${nanoid(5).toUpperCase()}`,
      customerId:   req.user._id,
      restaurantId: group.restaurantId._id,
      items:        allItems,
      subtotal:    grandTotal,
      vatAmount,
      total,
      deliveryFee: 0,
      discount:    0,
      type:          ORDER_TYPE.GROUP,
      status:        ORDER_STATUS.PENDING,
      paymentMethod,
      deliveryAddress: addr,
      timeline: [{ status: ORDER_STATUS.PENDING, actorType: 'customer', note: 'Group order checkout' }],
    });

    // Lock the group
    await GroupOrder.findByIdAndUpdate(req.params.id, { status: 'locked', mainOrderId: order._id });

    // Payment
    let clientSecret = null;
    let razorpayOrder = null;

    if (paymentMethod === 'RAZORPAY') {
      try {
        const { getRazorpay } = await import('../config/razorpay.js');
        const rzp = getRazorpay();
        const rzpOrder = await rzp.orders.create({
          amount: total,
          currency: process.env.RAZORPAY_CURRENCY || 'INR',
          receipt: order._id.toString(),
          notes: { orderId: order._id.toString(), userId: req.user._id.toString() },
        });
        order.paymentGateway = 'RAZORPAY';
        order.razorpayOrderId = rzpOrder.id;
        await order.save();
        razorpayOrder = { id: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency, key: process.env.RAZORPAY_KEY_ID };
      } catch (rzpErr) {
        return res.status(500).json({ success: false, message: 'Razorpay failed: ' + rzpErr.message });
      }
    } else if ([PAYMENT_METHOD.CARD, PAYMENT_METHOD.APPLE_PAY, PAYMENT_METHOD.GOOGLE_PAY].includes(paymentMethod)) {
      if (!isStripeEnabled()) return res.status(400).json({ success: false, message: 'Stripe is not configured.' });
      const stripe  = getStripe();
      const intent  = await stripe.paymentIntents.create({
        amount:   total,
        currency: 'gbp',
        metadata: { orderId: order._id.toString(), userId: req.user._id.toString() },
      });
      order.paymentIntentId = intent.id;
      await order.save();
      clientSecret = intent.client_secret;
    }

    emitGroupEvent(req.params.id, 'group:checkout-started', { groupId: req.params.id, orderId: order._id });
    res.status(201).json({ success: true, order, clientSecret, razorpayOrder });
  } catch (err) { next(err); }
}

// ─── POST /api/group-orders/:id/repeat ───────────────────────────────────────
export async function repeatGroup(req, res, next) {
  try {
    const original = await GroupOrder.findById(req.params.id).lean();
    if (!original) return res.status(404).json({ message: 'Group not found' });

    const newGroup = await GroupOrder.create({
      hostId:       req.user._id,
      restaurantId: original.restaurantId,
      name:         `${original.name} (repeat)`,
      deliveryAddress: original.deliveryAddress,
      members: [{
        userId:      req.user._id,
        displayName: req.user.name || req.user.email,
        items:       [],
        subtotal:    0,
      }],
    });

    await newGroup.populate('restaurantId', 'name logoUrl');
    res.status(201).json({ success: true, group: newGroup });
  } catch (err) { next(err); }
}
