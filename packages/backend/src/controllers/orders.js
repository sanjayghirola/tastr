import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import Driver from "../models/Driver.js";
import Review from "../models/Review.js";
import Wallet from "../models/Wallet.js";
import User from "../models/User.js";
import PromoCode from "../models/PromoCode.js";
import { getStripe, isStripeEnabled } from "../config/stripe.js";
import { ORDER_STATUS, ORDER_TYPE, PAYMENT_METHOD } from "@tastr/shared";
import { paginationMeta, haversineKm } from "../utils/helpers.js";
import { emitNewOrder, emitOrderStatus } from "../sockets/index.js";
import { dispatchOrder } from "../services/dispatch.js";
import { calculatePricing, calculateDeliveryFee } from "../utils/pricingEngine.js";
import mongoose from "mongoose";
import { notifyOrderEvent } from "../services/notificationService.js";

const VAT_RATE = 0.2;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function calcCartSubtotal(items) {
  return items.reduce((sum, item) => {
    const tops = (item.selectedToppings || []).reduce((t, o) => t + (o.price || 0), 0);
    return sum + (item.price + tops) * item.quantity;
  }, 0);
}

async function buildOrderFromCart(cart, restaurant, deliveryAddress, extras = {}) {
  const items = cart.items.map((i) => ({
    menuItemId: i.menuItemId,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    photoUrl: i.photoUrl,
    selectedToppings: i.selectedToppings,
    note: i.note,
    subtotal: (i.price + (i.selectedToppings || []).reduce((s, t) => s + t.price, 0)) * i.quantity,
  }));

  const baseSubtotal = calcCartSubtotal(cart.items);
  const deliveryModel = restaurant.deliveryMode || "tastr";

  // ─── 1. Calculate delivery fee (distance tiers, surge, express) ────────
  const deliveryResult = await calculateDeliveryFee({
    restaurantAddress: restaurant.address,
    deliveryAddress,
    restaurantFee: restaurant.deliveryFee || 0,
    deliveryMethod: extras.deliveryMethod || "standard",
    subtotal: baseSubtotal,
    isSurgeActive: extras.isSurgeActive || false,
  });

  const deliveryFee = deliveryResult.deliveryFee;

  // ─── 2. Calculate platform pricing (markup, service fee, commission) ───
  const pricing = await calculatePricing({
    itemsSubtotal: baseSubtotal,
    deliveryFee,
    deliveryModel,
    restaurantId: cart.restaurantId,
    itemCount: items.length,
  });

  // ─── 3. Student discount ───────────────────────────────────────────────
  let studentDiscount = 0;
  if (extras.isStudentVerified && restaurant.offersStudentDiscount) {
    const pct = restaurant.studentDiscountPercent || 10;
    studentDiscount = Math.round((pricing.displaySubtotal * pct) / 100);
  }

  // ─── 4. Calculate totals ───────────────────────────────────────────────
  const discount = (cart.promoDiscount || 0) + (cart.giftCardAmount || 0) + studentDiscount;
  const taxable = Math.max(0, pricing.displaySubtotal - discount);
  const vatAmount = Math.round(taxable * VAT_RATE);
  const tip = cart.tip || 0;
  const donation = cart.donation || 0;

  // Customer total = display subtotal + service fee + delivery fee - discounts + VAT + tip + donation
  const total = Math.max(0, pricing.displaySubtotal + pricing.serviceFeeAmount + deliveryFee - discount + vatAmount + tip + donation);

  return {
    items,
    subtotal: pricing.displaySubtotal, // includes markup (customer-facing)
    deliveryFee,
    discount,
    vatAmount,
    tip,
    donation,
    total,
    studentDiscount,

    // ─── Platform pricing fields (stamped on Order) ──────────────────
    markupAmount: pricing.markupAmount,
    markupType: pricing.markupType,
    markupValue: pricing.markupValue,
    serviceFeeAmount: pricing.serviceFeeAmount,
    serviceFeeType: pricing.serviceFeeType,
    serviceFeeValue: pricing.serviceFeeValue,
    commissionRate: pricing.commissionRate,
    commissionAmount: pricing.commissionAmount,
    isCommissionOverride: pricing.isCommissionOverride,
    deliveryFeeDriver: pricing.deliveryFeeDriver,
    deliveryFeePlatform: pricing.deliveryFeePlatform,
    deliveryModel,
    restaurantPayout: pricing.restaurantPayout,
    driverPayout: pricing.driverPayout,
    platformRevenue: pricing.platformRevenue,

    // ─── Standard fields ─────────────────────────────────────────────
    promoCode: cart.promoCode,
    promoDiscount: cart.promoDiscount || 0,
    giftCardCode: cart.giftCardCode,
    giftCardAmount: cart.giftCardAmount || 0,
    walletAmountUsed: extras.walletAmountUsed || 0,
    deliveryAddress,
    customerNote: cart.customerNote,
    disposableEssentials: cart.disposableEssentials,
    restaurantId: cart.restaurantId,
    customerId: cart.userId,
  };
}

async function createPaymentIntent(amount, customerId, metadata = {}) {
  const stripe = getStripe();
  const user = await User.findById(customerId).select("stripeCustomerId email").lean();
  let stripeCustomerId = user?.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ email: user?.email, metadata: { userId: customerId.toString() } });
    stripeCustomerId = customer.id;
    await User.findByIdAndUpdate(customerId, { stripeCustomerId });
  }
  return stripe.paymentIntents.create({
    amount,
    currency: "gbp",
    customer: stripeCustomerId,
    automatic_payment_methods: { enabled: true },
    metadata: { ...metadata, userId: customerId.toString() },
  });
}

function resolveDeliveryAddress(user, addressId, addressBody) {
  if (addressBody) return addressBody;
  if (addressId) {
    const addr = user.addresses?.find((a) => a._id.toString() === addressId);
    if (addr) return { label: addr.label, line1: addr.line1, city: addr.city, postcode: addr.postcode, lat: addr.lat, lng: addr.lng };
  }
  const def = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
  return def ? { label: def.label, line1: def.line1, city: def.city, postcode: def.postcode, lat: def.lat, lng: def.lng } : null;
}

// ─── Auto-accept helper ──────────────────────────────────────────────────────
async function handleAutoAccept(order, restaurant) {
  if (!restaurant.autoAcceptOrders) return;
  const delayMs = (restaurant.autoAcceptDelayMins || 2) * 60 * 1000;
  const prepTime = restaurant.defaultPrepTime || 25;

  setTimeout(async () => {
    try {
      const freshOrder = await Order.findById(order._id);
      if (!freshOrder || freshOrder.status !== ORDER_STATUS.PLACED) return;
      freshOrder.status = ORDER_STATUS.ACCEPTED;
      freshOrder.prepTime = prepTime;
      freshOrder.autoAccepted = true;
      freshOrder.estimatedDeliveryAt = new Date(Date.now() + (prepTime + 15) * 60 * 1000);
      freshOrder.timeline.push({
        status: ORDER_STATUS.ACCEPTED,
        actorType: "system",
        note: `Auto-accepted after ${restaurant.autoAcceptDelayMins || 2} min`,
      });
      await freshOrder.save();
      try {
        emitOrderStatus(freshOrder._id.toString(), {
          orderId: freshOrder._id.toString(),
          status: ORDER_STATUS.ACCEPTED,
          prepTime,
          autoAccepted: true,
        });
      } catch {}
      try {
        await notifyOrderEvent(freshOrder, "order_accepted", { prepTime });
      } catch {}
      try {
        dispatchOrder(freshOrder._id.toString());
      } catch {}
    } catch (err) {
      console.error("Auto-accept error:", err);
    }
  }, delayMs);
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────
export async function createOrder(req, res, next) {
  try {
    const { deliveryAddressId, deliveryAddress: addrBody, paymentMethod, paymentMethodId, deliveryMethod = "standard" } = req.body;
    const user = await User.findById(req.user._id).lean();
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart || !cart.items.length) return res.status(400).json({ success: false, message: "Cart is empty" });

    const restaurant = await Restaurant.findById(cart.restaurantId).lean();
    if (!restaurant?.isOnline) return res.status(400).json({ success: false, message: "Restaurant is currently offline" });

    // Check order queue limit
    if (restaurant.orderQueueLimit) {
      const activeCount = await Order.countDocuments({
        restaurantId: cart.restaurantId,
        status: { $in: [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING] },
      });
      if (activeCount >= restaurant.orderQueueLimit) {
        return res.status(400).json({ success: false, message: "Restaurant order queue is full. Please try again later." });
      }
    }

    const deliveryAddr = resolveDeliveryAddress(user, deliveryAddressId, addrBody);
    if (!deliveryAddr) return res.status(400).json({ success: false, message: "Delivery address required" });

    // ─── Delivery radius check ────────────────────────────────────────────
    if (deliveryAddr.lat && restaurant.address?.lat && restaurant.deliveryRadiusKm) {
      const distKm = haversineKm(deliveryAddr.lat, deliveryAddr.lng, restaurant.address.lat, restaurant.address.lng);
      if (distKm > restaurant.deliveryRadiusKm) {
        return res
          .status(400)
          .json({
            success: false,
            message: `Delivery address is ${distKm.toFixed(1)} km away. This restaurant only delivers within ${restaurant.deliveryRadiusKm} km.`,
          });
      }
    }

    // ─── Express delivery check ───────────────────────────────────────────
    if (deliveryMethod === "express" && !restaurant.expressDeliveryEnabled) {
      return res.status(400).json({ success: false, message: "This restaurant does not offer express delivery." });
    }

    // ─── Scheduled delivery check ─────────────────────────────────────────
    if (deliveryMethod === "scheduled" && !restaurant.scheduledOrdersEnabled) {
      return res.status(400).json({ success: false, message: "This restaurant does not accept scheduled orders." });
    }

    const extras = { deliveryMethod, isStudentVerified: !!user.isStudentVerified };
    const orderData = await buildOrderFromCart(cart, restaurant, deliveryAddr, extras);

    if (paymentMethod === PAYMENT_METHOD.WALLET) {
      const wallet = await Wallet.findOne({ userId: req.user._id });
      if (!wallet || wallet.balance < orderData.total) {
        return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
      }
    }

    const order = await Order.create({
      ...orderData,
      type: ORDER_TYPE.STANDARD,
      status: ORDER_STATUS.PENDING,
      paymentMethod,
      timeline: [{ status: ORDER_STATUS.PENDING, actorType: "customer" }],
    });

    let clientSecret = null;
    let razorpayOrder = null;

    if (paymentMethod === PAYMENT_METHOD.RAZORPAY) {
      try {
        const { getRazorpay } = await import("../config/razorpay.js");
        const rzp = getRazorpay();
        const rzpOrder = await rzp.orders.create({
          amount: orderData.total,
          currency: process.env.RAZORPAY_CURRENCY || "INR",
          receipt: order._id.toString(),
          notes: { orderId: order._id.toString(), userId: req.user._id.toString() },
        });
        order.paymentGateway = "RAZORPAY";
        order.razorpayOrderId = rzpOrder.id;
        await order.save();
        razorpayOrder = { id: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency, key: process.env.RAZORPAY_KEY_ID };
      } catch (rzpErr) {
        await Order.findByIdAndDelete(order._id);
        return res.status(500).json({ success: false, message: "Razorpay order creation failed: " + rzpErr.message });
      }
    } else if (paymentMethod === PAYMENT_METHOD.CARD || paymentMethod === PAYMENT_METHOD.APPLE_PAY || paymentMethod === PAYMENT_METHOD.GOOGLE_PAY) {
      if (!isStripeEnabled()) {
        await Order.findByIdAndDelete(order._id);
        return res.status(400).json({ success: false, message: "Stripe is not configured. Please use Razorpay or Wallet." });
      }
      const intent = await createPaymentIntent(orderData.total, req.user._id, { orderId: order._id.toString() });
      order.paymentIntentId = intent.id;
      await order.save();
      clientSecret = intent.client_secret;
    } else if (paymentMethod === PAYMENT_METHOD.WALLET) {
      const wallet = await Wallet.findOne({ userId: req.user._id });
      await wallet.debit(orderData.total, `Order ${order.orderId}`, { orderId: order._id });
      order.status = ORDER_STATUS.PLACED;
      order.timeline.push({ status: ORDER_STATUS.PLACED, actorType: "system", note: "Paid via wallet" });
      await order.save();
      await Cart.findOneAndDelete({ userId: req.user._id });
      if (cart.promoCode) await PromoCode.findOneAndUpdate({ code: cart.promoCode }, { $inc: { usedCount: 1 } });
      try {
        emitNewOrder(order.restaurantId.toString(), order);
      } catch {}
      handleAutoAccept(order, restaurant);
    }

    res.status(201).json({ success: true, order, clientSecret, razorpayOrder });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/orders/schedule ────────────────────────────────────────────────
export async function createScheduledOrder(req, res, next) {
  try {
    const { deliveryAddressId, deliveryAddress: addrBody, paymentMethod, scheduledAt } = req.body;
    const user = await User.findById(req.user._id).lean();
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart || !cart.items.length) return res.status(400).json({ success: false, message: "Cart is empty" });

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) return res.status(400).json({ success: false, message: "Scheduled time must be in the future" });

    const restaurant = await Restaurant.findById(cart.restaurantId).lean();

    // ─── Scheduled orders check ───────────────────────────────────────────
    if (!restaurant.scheduledOrdersEnabled) {
      return res.status(400).json({ success: false, message: "This restaurant does not accept scheduled orders." });
    }

    const deliveryAddr = resolveDeliveryAddress(user, deliveryAddressId, addrBody);
    if (!deliveryAddr) return res.status(400).json({ success: false, message: "Delivery address required" });

    // ─── Delivery radius check ────────────────────────────────────────────
    if (deliveryAddr.lat && restaurant.address?.lat && restaurant.deliveryRadiusKm) {
      const distKm = haversineKm(deliveryAddr.lat, deliveryAddr.lng, restaurant.address.lat, restaurant.address.lng);
      if (distKm > restaurant.deliveryRadiusKm) {
        return res
          .status(400)
          .json({
            success: false,
            message: `Delivery address is ${distKm.toFixed(1)} km away. This restaurant only delivers within ${restaurant.deliveryRadiusKm} km.`,
          });
      }
    }

    const orderData = await buildOrderFromCart(cart, restaurant, deliveryAddr);
    const order = await Order.create({
      ...orderData,
      type: ORDER_TYPE.SCHEDULED,
      status: ORDER_STATUS.PENDING,
      scheduledAt: scheduledDate,
      paymentMethod,
      timeline: [{ status: ORDER_STATUS.PENDING, actorType: "customer" }],
    });

    let clientSecret = null;
    if (paymentMethod === PAYMENT_METHOD.CARD || paymentMethod === PAYMENT_METHOD.APPLE_PAY || paymentMethod === PAYMENT_METHOD.GOOGLE_PAY) {
      if (!isStripeEnabled()) return res.status(400).json({ success: false, message: "Stripe is not configured." });
      const intent = await createPaymentIntent(orderData.total, req.user._id, { orderId: order._id.toString() });
      order.paymentIntentId = intent.id;
      await order.save();
      clientSecret = intent.client_secret;
    }

    await Cart.findOneAndDelete({ userId: req.user._id });
    res.status(201).json({ success: true, order, clientSecret });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/orders/gift ────────────────────────────────────────────────────
export async function createGiftOrder(req, res, next) {
  try {
    const { paymentMethod, giftRecipient } = req.body;
    const user = await User.findById(req.user._id).lean();
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart || !cart.items.length) return res.status(400).json({ success: false, message: "Cart is empty" });

    const restaurant = await Restaurant.findById(cart.restaurantId).lean();
    const orderData = await buildOrderFromCart(cart, restaurant, giftRecipient.address);
    const order = await Order.create({
      ...orderData,
      type: ORDER_TYPE.GIFT,
      status: ORDER_STATUS.PENDING,
      giftRecipient,
      paymentMethod,
      timeline: [{ status: ORDER_STATUS.PENDING, actorType: "customer" }],
    });

    let clientSecret = null;
    let razorpayOrder = null;
    if (paymentMethod === PAYMENT_METHOD.RAZORPAY) {
      try {
        const { getRazorpay } = await import("../config/razorpay.js");
        const rzp = getRazorpay();
        const rzpOrder = await rzp.orders.create({
          amount: orderData.total,
          currency: process.env.RAZORPAY_CURRENCY || "INR",
          receipt: order._id.toString(),
          notes: { orderId: order._id.toString(), userId: req.user._id.toString() },
        });
        order.paymentGateway = "RAZORPAY";
        order.razorpayOrderId = rzpOrder.id;
        await order.save();
        razorpayOrder = { id: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency, key: process.env.RAZORPAY_KEY_ID };
      } catch (rzpErr) {
        return res.status(500).json({ success: false, message: "Razorpay order creation failed: " + rzpErr.message });
      }
    } else if (paymentMethod !== PAYMENT_METHOD.WALLET) {
      if (!isStripeEnabled()) return res.status(400).json({ success: false, message: "Stripe is not configured." });
      const intent = await createPaymentIntent(orderData.total, req.user._id, { orderId: order._id.toString() });
      order.paymentIntentId = intent.id;
      await order.save();
      clientSecret = intent.client_secret;
    }

    await Cart.findOneAndDelete({ userId: req.user._id });
    res.status(201).json({ success: true, order, clientSecret, razorpayOrder });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/orders ──────────────────────────────────────────────────────────
export async function listMyOrders(req, res, next) {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const role = req.query.role?.toLowerCase();

    let filter = {};

    // ─── Driver role: query by driverId (resolve User._id → Driver._id) ──
    if (role === "driver") {
      const driver = await Driver.findOne({ userId: req.user._id }).select("_id").lean();
      if (!driver) {
        return res.json({ success: true, orders: [], total: 0, page, limit });
      }
      filter.driverId = driver._id;

      // Map "active" status shortcut to actual order statuses
      if (req.query.status === "active") {
        filter.status = { $in: ["DRIVER_ASSIGNED", "ON_WAY", "READY"] };
      } else if (req.query.status) {
        const statuses = req.query.status.split(",").map((s) => s.trim().toUpperCase());
        filter.status = { $in: statuses };
      }
    } else {
      // ─── Customer (default): query by customerId ─────────────────────
      filter.customerId = req.user._id;

      if (req.query.status) {
        const statuses = req.query.status.split(",").map((s) => s.trim().toUpperCase());
        filter.status = { $in: statuses };
      }
    }

    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) filter.createdAt.$lte = new Date(new Date(req.query.dateTo).setHours(23, 59, 59, 999));
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("restaurantId", "name logoUrl address")
        .populate("driverId", "name profilePhoto phone")
        .populate("customerId", "name phone")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    // Strip sensitive OTP/PIN fields based on role
    const sanitizedOrders = orders.map((o) => {
      const cleaned = { ...o };
      if (role === "driver") {
        delete cleaned.pickupPin;
        delete cleaned.deliveryOtp;
      } else {
        // Customer: can see deliveryOtp but not pickupPin
        delete cleaned.pickupPin;
      }
      return cleaned;
    });

    res.json({ success: true, orders: sanitizedOrders, ...paginationMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
export async function getOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
      .populate("restaurantId", "name logoUrl phone address")
      .populate({
        path: "driverId",
        select: "name phone profilePhoto vehicleType vehiclePlate userId",
        populate: {
          path: "userId",
          select: "name email phone role", // choose fields you need
        },
      })
      .populate("customerId", "name phone email")
      .lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const userId = req.user._id.toString();
    const isCustomer = order.customerId?._id?.toString() === userId;
    const isAdmin = ["SUPER_ADMIN", "SUB_ADMIN"].includes(req.user.role);

    // Driver check: order.driverId is a Driver doc (not User), so resolve
    let isDriver = false;
    if (order.driverId && req.user.role === "DRIVER") {
      const driverDoc = await Driver.findOne({ userId: req.user._id }).select("_id").lean();
      isDriver = driverDoc && order.driverId._id?.toString() === driverDoc._id.toString();
    }

    let isRestaurant = false;
    if (!isCustomer && !isDriver && !isAdmin) {
      const rest = await Restaurant.findOne({
        _id: order.restaurantId?._id || order.restaurantId,
        $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
      })
        .select("_id")
        .lean();
      isRestaurant = !!rest;
    }

    if (!isCustomer && !isDriver && !isAdmin && !isRestaurant) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // ─── Strip sensitive OTP/PIN fields based on role ────────────────────
    // Customer sees deliveryOtp (to give to driver) but NOT pickupPin
    // Restaurant sees pickupPin (to give to driver) but NOT deliveryOtp
    // Driver sees NEITHER (they must enter them, not read them)
    // Admin sees everything
    if (isCustomer) {
      delete order.pickupPin;
    } else if (isRestaurant) {
      delete order.deliveryOtp;
    } else if (isDriver) {
      delete order.pickupPin;
      delete order.deliveryOtp;
    }

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/orders/restaurant/active ───────────────────────────────────────
export async function getRestaurantOrders(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    })
      .select("_id autoAcceptOrders autoAcceptDelayMins defaultPrepTime orderQueueLimit kitchenAlerts")
      .lean();
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    const orders = await Order.find({
      restaurantId: restaurant._id,
      status: { $nin: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED, ORDER_STATUS.FAILED] },
    })
      .populate("customerId", "name phone email")
      .populate("driverId", "name phone vehicleType vehiclePlate")
      .sort({ createdAt: -1 })
      .lean();

    // Restaurant sees pickupPin (to show driver) but NOT deliveryOtp
    const sanitizedOrders = orders.map((o) => {
      const c = { ...o };
      delete c.deliveryOtp;
      return c;
    });

    res.json({
      success: true,
      orders: sanitizedOrders,
      settings: {
        autoAcceptOrders: restaurant.autoAcceptOrders,
        autoAcceptDelayMins: restaurant.autoAcceptDelayMins,
        defaultPrepTime: restaurant.defaultPrepTime,
        orderQueueLimit: restaurant.orderQueueLimit,
        kitchenAlerts: restaurant.kitchenAlerts,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/orders/restaurant/history ──────────────────────────────────────
export async function getRestaurantOrderHistory(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    })
      .select("_id")
      .lean();
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const filter = { restaurantId: restaurant._id };

    if (req.query.status) {
      filter.status = { $in: req.query.status.split(",").map((s) => s.trim().toUpperCase()) };
    } else {
      filter.status = { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED] };
    }
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) filter.createdAt.$lte = new Date(new Date(req.query.dateTo).setHours(23, 59, 59, 999));
    }
    if (req.query.q) filter.orderId = new RegExp(req.query.q, "i");

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("customerId", "name phone email")
        .populate("driverId", "name phone")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, orders, ...paginationMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/orders/restaurant/all ──────────────────────────────────────────
export async function getRestaurantAllOrders(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    })
      .select("_id")
      .lean();
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const filter = { restaurantId: restaurant._id };

    if (req.query.status) {
      filter.status = { $in: req.query.status.split(",").map((s) => s.trim().toUpperCase()) };
    }
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) filter.createdAt.$lte = new Date(new Date(req.query.dateTo).setHours(23, 59, 59, 999));
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("customerId", "name phone email")
        .populate("driverId", "name phone vehicleType vehiclePlate")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, orders, ...paginationMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/orders/:id/status ────────────────────────────────────────────
export async function updateOrderStatus(req, res, next) {
  try {
    const { status, note, prepTime } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const normalizedStatus = status.toUpperCase();
    const validTransitions = {
      PLACED: ["ACCEPTED", "REJECTED", "CANCELLED"],
      ACCEPTED: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY", "CANCELLED"],
      READY: ["DRIVER_ASSIGNED", "ON_WAY", "DELIVERED"],
      DRIVER_ASSIGNED: ["ON_WAY", "DELIVERED"],
      ON_WAY: ["DELIVERED"],
    };

    const allowed = validTransitions[order.status] || [];
    if (allowed.length > 0 && !allowed.includes(normalizedStatus)) {
      return res.status(400).json({ success: false, message: `Cannot transition from ${order.status} to ${normalizedStatus}` });
    }

    order.status = normalizedStatus;

    // Determine actor type based on user role
    const isDriverRole = req.user.role === "DRIVER";
    const actorType = isDriverRole ? "driver" : "restaurant";

    // If driver, verify they're assigned to this order
    if (isDriverRole) {
      const driverDoc = await Driver.findOne({ userId: req.user._id }).select("_id").lean();
      if (!driverDoc || order.driverId?.toString() !== driverDoc._id.toString()) {
        return res.status(403).json({ success: false, message: "You are not assigned to this order" });
      }
    }

    order.timeline.push({ status: normalizedStatus, actorId: req.user._id, actorType, note });

    if (normalizedStatus === "ACCEPTED" && prepTime) {
      order.prepTime = prepTime;
      order.estimatedDeliveryAt = new Date(Date.now() + (prepTime + 15) * 60 * 1000);
    }
    if (normalizedStatus === "READY") order.readyAt = new Date();
    if (normalizedStatus === "ON_WAY") order.pickedUpAt = new Date();

    await order.save();

    try {
      const payload = { orderId: order._id.toString(), status: normalizedStatus, note };
      if (normalizedStatus === "ACCEPTED" && prepTime) payload.prepTime = prepTime;
      emitOrderStatus(order._id.toString(), payload);
    } catch {}
    try {
      await notifyOrderEvent(order, normalizedStatus.toLowerCase(), { note });
    } catch {}

    if (normalizedStatus === "READY" && !order.driverId) {
      try {
        dispatchOrder(order._id.toString());
      } catch {}
    }

    const populated = await Order.findById(order._id)
      .populate("customerId", "name phone email")
      .populate("driverId", "name phone vehicleType vehiclePlate")
      .lean();
    res.json({ success: true, order: populated });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/orders/:id/accept ────────────────────────────────────────────
export async function acceptOrder(req, res, next) {
  try {
    const { prepTime } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const restaurant = await Restaurant.findOne({
      _id: order.restaurantId,
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    })
      .select("_id defaultPrepTime")
      .lean();
    if (!restaurant) return res.status(403).json({ success: false, message: "Access denied" });
    if (order.status !== ORDER_STATUS.PLACED) {
      return res.status(400).json({ success: false, message: `Cannot accept order with status: ${order.status}` });
    }

    const actualPrepTime = prepTime || restaurant.defaultPrepTime || 25;
    order.status = ORDER_STATUS.ACCEPTED;
    order.prepTime = actualPrepTime;
    order.estimatedDeliveryAt = new Date(Date.now() + (actualPrepTime + 15) * 60 * 1000);
    order.timeline.push({ status: ORDER_STATUS.ACCEPTED, actorId: req.user._id, actorType: "restaurant", note: `Prep time: ${actualPrepTime} min` });
    await order.save();

    try {
      emitOrderStatus(order._id.toString(), { orderId: order._id.toString(), status: ORDER_STATUS.ACCEPTED, prepTime: actualPrepTime });
    } catch {}
    try {
      await notifyOrderEvent(order, "order_accepted", { prepTime: actualPrepTime });
    } catch {}
    // Dispatch to drivers immediately — drivers see food prep status in real-time
    // and prepTime is included in the offer so they can make informed accept decisions
    try {
      dispatchOrder(order._id.toString());
    } catch {}

    const populated = await Order.findById(order._id)
      .populate("customerId", "name phone email")
      .populate("driverId", "name phone vehicleType vehiclePlate")
      .lean();
    res.json({ success: true, order: populated });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/orders/:id/reject ────────────────────────────────────────────
export async function rejectOrder(req, res, next) {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const restaurant = await Restaurant.findOne({
      _id: order.restaurantId,
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    })
      .select("_id")
      .lean();
    if (!restaurant) return res.status(403).json({ success: false, message: "Access denied" });
    if (order.status !== ORDER_STATUS.PLACED) {
      return res.status(400).json({ success: false, message: `Cannot reject order with status: ${order.status}` });
    }

    order.status = ORDER_STATUS.REJECTED;
    order.rejectionReason = reason || "Order rejected by restaurant";
    order.timeline.push({
      status: ORDER_STATUS.REJECTED,
      actorId: req.user._id,
      actorType: "restaurant",
      note: reason || "Order rejected by restaurant",
    });
    await order.save();

    try {
      emitOrderStatus(order._id.toString(), { orderId: order._id.toString(), status: ORDER_STATUS.REJECTED, reason });
    } catch {}
    try {
      await notifyOrderEvent(order, "order_rejected", { reason });
    } catch {}
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/orders/:id/assign-driver ─────────────────────────────────────
export async function assignDriver(req, res, next) {
  try {
    const { driverId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const restaurant = await Restaurant.findOne({
      _id: order.restaurantId,
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    })
      .select("_id")
      .lean();
    if (!restaurant) return res.status(403).json({ success: false, message: "Access denied" });

    if (driverId) {
      const driver = await Driver.findById(driverId).lean();
      if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });
    }

    order.driverId = driverId || null;
    if (driverId) {
      order.status = ORDER_STATUS.DRIVER_ASSIGNED;
      order.timeline.push({ status: ORDER_STATUS.DRIVER_ASSIGNED, actorId: req.user._id, actorType: "restaurant", note: "Driver manually assigned" });
    }
    await order.save();

    try {
      emitOrderStatus(order._id.toString(), { orderId: order._id.toString(), status: order.status, driverId });
    } catch {}
    try {
      await notifyOrderEvent(order, "driver_assigned", {});
    } catch {}

    const populated = await Order.findById(order._id)
      .populate("customerId", "name phone email")
      .populate("driverId", "name phone vehicleType vehiclePlate")
      .lean();
    res.json({ success: true, order: populated });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/orders/:id/mark-delivered ────────────────────────────────────
export async function markDelivered(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // If driver, verify they're assigned to this order
    if (req.user.role === "DRIVER") {
      const driverDoc = await Driver.findOne({ userId: req.user._id }).select("_id").lean();
      if (!driverDoc || order.driverId?.toString() !== driverDoc._id.toString()) {
        return res.status(403).json({ success: false, message: "You are not assigned to this order" });
      }
    }

    const deliverable = [ORDER_STATUS.ON_WAY, ORDER_STATUS.DRIVER_ASSIGNED, ORDER_STATUS.READY];
    if (!deliverable.includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot mark delivered from status: ${order.status}` });
    }

    order.status = ORDER_STATUS.DELIVERED;
    order.deliveredAt = new Date();
    order.timeline.push({
      status: ORDER_STATUS.DELIVERED,
      actorId: req.user._id,
      actorType: req.user.role === "DRIVER" ? "driver" : "restaurant",
      note: req.body.note || "Marked as delivered",
    });
    await order.save();

    try {
      emitOrderStatus(order._id.toString(), { orderId: order._id.toString(), status: ORDER_STATUS.DELIVERED });
    } catch {}
    try {
      await notifyOrderEvent(order, "order_delivered", {});
    } catch {}
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/orders/:id/restaurant-cancel ─────────────────────────────────
export async function restaurantCancelOrder(req, res, next) {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const restaurant = await Restaurant.findOne({
      _id: order.restaurantId,
      $or: [{ ownerId: req.user._id }, { staffIds: req.user._id }],
    })
      .select("_id")
      .lean();
    if (!restaurant) return res.status(403).json({ success: false, message: "Access denied" });

    const cancellable = [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY];
    if (!cancellable.includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel order with status: ${order.status}` });
    }

    order.status = ORDER_STATUS.CANCELLED;
    order.timeline.push({
      status: ORDER_STATUS.CANCELLED,
      actorId: req.user._id,
      actorType: "restaurant",
      note: reason || "Cancelled by restaurant",
    });
    await order.save();

    try {
      emitOrderStatus(order._id.toString(), { orderId: order._id.toString(), status: ORDER_STATUS.CANCELLED, reason });
    } catch {}
    try {
      await notifyOrderEvent(order, "order_cancelled", { reason });
    } catch {}
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/orders/:id/cancel (customer) ────────────────────────────────
export async function cancelOrder(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    const cancellable = [ORDER_STATUS.PLACED, ORDER_STATUS.ACCEPTED];
    if (!cancellable.includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel order with status: ${order.status}` });
    }
    order.status = ORDER_STATUS.CANCELLED;
    order.timeline.push({ status: ORDER_STATUS.CANCELLED, actorId: req.user._id, actorType: "customer", note: req.body.reason });
    await order.save();
    try {
      await notifyOrderEvent(order, "order_cancelled", { reason: req.body.reason });
    } catch {}
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/orders/:id/rate ────────────────────────────────────────────────
export async function rateOrder(req, res, next) {
  try {
    const order = await Order.findOne({ _id: req.params.id, customerId: req.user._id }).lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.status !== ORDER_STATUS.DELIVERED) {
      return res.status(400).json({ success: false, message: "Can only rate delivered orders" });
    }

    const { restaurantRating, driverRating, appRating, restaurantComment, driverComment } = req.body;
    const created = [];

    if (restaurantRating) {
      try {
        const r = await Review.create({
          orderId: order._id,
          reviewerId: req.user._id,
          targetId: order.restaurantId,
          targetType: "restaurant",
          rating: restaurantRating,
          comment: restaurantComment,
        });
        created.push(r);
        const agg = await Review.aggregate([
          { $match: { targetId: new mongoose.Types.ObjectId(order.restaurantId), targetType: "restaurant", isVisible: true } },
          { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
        ]);
        if (agg[0]) await Restaurant.findByIdAndUpdate(order.restaurantId, { rating: parseFloat(agg[0].avg.toFixed(2)), reviewCount: agg[0].count });
      } catch (e) {
        if (e.code !== 11000) throw e;
      }
    }

    if (driverRating && order.driverId) {
      try {
        const r = await Review.create({
          orderId: order._id,
          reviewerId: req.user._id,
          targetId: order.driverId,
          targetType: "driver",
          rating: driverRating,
          comment: driverComment,
        });
        created.push(r);
        const agg = await Review.aggregate([
          { $match: { targetId: new mongoose.Types.ObjectId(order.driverId), targetType: "driver", isVisible: true } },
          { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
        ]);
        if (agg[0]) await Driver.findByIdAndUpdate(order.driverId, { rating: parseFloat(agg[0].avg.toFixed(2)), reviewCount: agg[0].count });
      } catch (e) {
        if (e.code !== 11000) throw e;
      }
    }

    if (appRating) {
      try {
        const r = await Review.create({ orderId: order._id, reviewerId: req.user._id, targetId: req.user._id, targetType: "app", rating: appRating });
        created.push(r);
      } catch (e) {
        if (e.code !== 11000) throw e;
      }
    }

    await Order.findByIdAndUpdate(order._id, { isRated: true });
    res.json({ success: true, reviews: created });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/orders/:id/verify-pickup ──────────────────────────────────────
// Driver enters the 4-digit PIN displayed at the restaurant to confirm collection.
export async function verifyPickupPin(req, res, next) {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ success: false, message: "PIN is required" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Verify this driver is assigned
    const driver = await Driver.findOne({ userId: req.user._id }).select("_id").lean();
    if (!driver || order.driverId?.toString() !== driver._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not assigned to this order" });
    }

    if (!["DRIVER_ASSIGNED", "READY"].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot verify pickup for status: ${order.status}` });
    }

    // Verify PIN
    if (order.pickupPin !== pin.trim()) {
      return res.status(400).json({ success: false, message: "Incorrect PIN. Please check with the restaurant." });
    }

    // Mark as verified and transition to ON_WAY
    order.pickupVerified = true;
    order.status = ORDER_STATUS.ON_WAY || "ON_WAY";
    order.pickedUpAt = new Date();
    order.timeline.push({
      status: "ON_WAY",
      actorId: driver._id,
      actorType: "driver",
      note: "Pickup verified with PIN — driver collected order",
    });
    await order.save();

    // Notify customer
    try {
      emitOrderStatus(order._id.toString(), {
        orderId: order._id.toString(),
        status: "ON_WAY",
        pickedUpAt: order.pickedUpAt,
        pickupVerified: true,
      });
    } catch {}
    try {
      await notifyOrderEvent(order, "order_on_way", {});
    } catch {}

    res.json({ success: true, message: "Pickup verified", order });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/orders/:id/verify-delivery ────────────────────────────────────
// Driver enters the 4-digit OTP that the customer has, to confirm delivery.
export async function verifyDeliveryOtp(req, res, next) {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: "OTP is required" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Verify this driver is assigned
    const driver = await Driver.findOne({ userId: req.user._id }).select("_id").lean();
    if (!driver || order.driverId?.toString() !== driver._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not assigned to this order" });
    }

    if (!["ON_WAY", "DRIVER_ASSIGNED"].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot verify delivery for status: ${order.status}` });
    }

    // Verify OTP
    if (order.deliveryOtp !== otp.trim()) {
      return res.status(400).json({ success: false, message: "Incorrect OTP. Please ask the customer for the correct code." });
    }

    // Mark as delivered
    order.deliveryVerified = true;
    order.status = ORDER_STATUS.DELIVERED || "DELIVERED";
    order.deliveredAt = new Date();
    order.timeline.push({
      status: "DELIVERED",
      actorId: driver._id,
      actorType: "driver",
      note: "Delivery verified with OTP — order completed",
    });
    await order.save();

    // Notify customer
    try {
      emitOrderStatus(order._id.toString(), {
        orderId: order._id.toString(),
        status: "DELIVERED",
        deliveryVerified: true,
      });
    } catch {}
    try {
      await notifyOrderEvent(order, "order_delivered", {});
    } catch {}

    // Return order with earnings info
    const populated = await Order.findById(order._id).populate("restaurantId", "name").populate("driverId", "name").lean();
    res.json({ success: true, message: "Delivery verified", order: populated });
  } catch (err) {
    next(err);
  }
}
