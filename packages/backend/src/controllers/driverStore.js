import DriverStoreProduct from "../models/DriverStoreProduct.js";
import DriverStoreOrder from "../models/DriverStoreOrder.js";
import Wallet from "../models/Wallet.js";
import Driver from "../models/Driver.js";
import User from "../models/User.js";
import { getStripe, isStripeEnabled } from "../config/stripe.js";
import { logger } from "../utils/logger.js";

const fmt = (p) => `£${((p || 0) / 100).toFixed(2)}`;

async function createStorePaymentIntent(amount, userId, metadata = {}) {
  const stripe = getStripe();
  const user = await User.findById(userId).select("stripeCustomerId email").lean();
  let stripeCustomerId = user?.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ email: user?.email, metadata: { userId: userId.toString() } });
    stripeCustomerId = customer.id;
    await User.findByIdAndUpdate(userId, { stripeCustomerId });
  }
  return stripe.paymentIntents.create({
    amount,
    currency: process.env.STRIPE_CURRENCY || "gbp",
    customer: stripeCustomerId,
    automatic_payment_methods: { enabled: true },
    metadata: { ...metadata, userId: userId.toString(), source: "driver_store" },
  });
}

// GET /api/driver-store/products
export async function listProducts(req, res, next) {
  try {
    const { category, search } = req.query;
    const filter = { isActive: true };
    if (category && category !== "all") filter.category = category;
    if (search) filter.name = { $regex: search, $options: "i" };
    res.json({ success: true, products: await DriverStoreProduct.find(filter).sort({ createdAt: -1 }).lean() });
  } catch (err) {
    next(err);
  }
}

// GET /api/driver-store/products/:id
export async function getProduct(req, res, next) {
  try {
    const product = await DriverStoreProduct.findById(req.params.id).lean();
    if (!product || !product.isActive) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
}

// GET /api/driver-store/payment-methods
export async function getPaymentMethods(req, res, next) {
  try {
    let razorpayEnabled = false;
    try {
      const { isRazorpayEnabled } = await import("../config/razorpay.js");
      razorpayEnabled = isRazorpayEnabled();
    } catch {}
    res.json({
      success: true,
      methods: { wallet: true, stripe: isStripeEnabled(), razorpay: razorpayEnabled },
      razorpayKey: razorpayEnabled ? process.env.RAZORPAY_KEY_ID : null,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/driver-store/checkout
export async function checkout(req, res, next) {
  try {
    const { items, paymentMethod = "wallet", deliveryAddress } = req.body;
    const userId = req.user._id;

    if (!items?.length) return res.status(400).json({ success: false, message: "Cart is empty" });
    if (!deliveryAddress?.line1) return res.status(400).json({ success: false, message: "Delivery address is required" });
    if (!["wallet", "stripe", "razorpay"].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: "Invalid payment method" });
    }

    const driver = await Driver.findOne({ userId });
    if (!driver) return res.status(403).json({ success: false, message: "Driver account required" });

    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await DriverStoreProduct.findById(item.productId);
      if (!product || !product.isActive) return res.status(400).json({ success: false, message: `Product not found: ${item.productId}` });
      if (product.stock < item.qty)
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}. Only ${product.stock} left.` });
      const subtotal = product.price * item.qty;
      total += subtotal;
      orderItems.push({ productId: product._id, name: product.name, photoUrl: product.photoUrl, price: product.price, qty: item.qty, subtotal });
    }

    const order = await DriverStoreOrder.create({
      driverId: driver._id,
      userId,
      items: orderItems,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === "wallet" ? "paid" : "pending",
      status: "placed",
      deliveryAddress,
    });

    // ─── WALLET ─────────────────────────────────────────────────────────
    if (paymentMethod === "wallet") {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || wallet.balance < total) {
        await DriverStoreOrder.findByIdAndDelete(order._id);
        return res
          .status(400)
          .json({ success: false, message: `Insufficient wallet balance. Need ${fmt(total)}, have ${fmt(wallet?.balance || 0)}` });
      }
      wallet.balance -= total;
      wallet.transactions.push({ type: "debit", amount: -total, description: `Driver Store #${order.orderId}`, balanceAfter: wallet.balance });
      await wallet.save();
      for (const item of items) await DriverStoreProduct.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty, soldCount: item.qty } });
      return res.status(201).json({ success: true, order, paymentMethod: "wallet" });
    }

    // ─── STRIPE ─────────────────────────────────────────────────────────
    if (paymentMethod === "stripe") {
      if (!isStripeEnabled()) {
        await DriverStoreOrder.findByIdAndDelete(order._id);
        return res.status(400).json({ success: false, message: "Stripe payments not configured" });
      }
      try {
        const pi = await createStorePaymentIntent(total, userId, { orderId: order._id.toString(), storeOrderId: order.orderId });
        order.stripePaymentIntentId = pi.id;
        order.paymentStatus = "pending";
        await order.save();
        return res.status(201).json({ success: true, order, paymentMethod: "stripe", clientSecret: pi.client_secret, paymentIntentId: pi.id });
      } catch (err) {
        await DriverStoreOrder.findByIdAndDelete(order._id);
        return res.status(500).json({ success: false, message: "Stripe error: " + err.message });
      }
    }

    // ─── RAZORPAY ───────────────────────────────────────────────────────
    if (paymentMethod === "razorpay") {
      try {
        const { getRazorpay } = await import("../config/razorpay.js");
        const rzp = getRazorpay();
        const rzpOrder = await rzp.orders.create({
          amount: total,
          currency: process.env.RAZORPAY_CURRENCY || "INR",
          receipt: order.orderId,
          notes: { userId: userId.toString(), storeOrderId: order._id.toString() },
        });
        order.razorpayOrderId = rzpOrder.id;
        order.paymentStatus = "pending";
        await order.save();
        return res
          .status(201)
          .json({
            success: true,
            order,
            paymentMethod: "razorpay",
            razorpayOrder: { id: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency },
            razorpayKey: process.env.RAZORPAY_KEY_ID,
          });
      } catch (err) {
        await DriverStoreOrder.findByIdAndDelete(order._id);
        return res.status(500).json({ success: false, message: "Razorpay error: " + err.message });
      }
    }
  } catch (err) {
    next(err);
  }
}

// POST /api/driver-store/confirm-stripe
export async function confirmStripePayment(req, res, next) {
  try {
    const { orderId, paymentIntentId } = req.body;
    const order = await DriverStoreOrder.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.userId?.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: "Not your order" });
    if (order.paymentStatus === "paid") return res.json({ success: true, order, message: "Already confirmed" });
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId || order.stripePaymentIntentId);
    if (pi.status !== "succeeded") return res.status(400).json({ success: false, message: `Payment not completed. Status: ${pi.status}` });
    order.paymentStatus = "paid";
    order.stripePaymentIntentId = pi.id;
    await order.save();
    for (const item of order.items) await DriverStoreProduct.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty, soldCount: item.qty } });
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

// POST /api/driver-store/verify-razorpay
export async function verifyRazorpayPayment(req, res, next) {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const order = await DriverStoreOrder.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.userId?.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: "Not your order" });
    if (order.paymentStatus === "paid") return res.json({ success: true, order, message: "Already confirmed" });
    const crypto = await import("crypto");
    const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
    const generated = crypto.default.createHmac("sha256", secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (generated !== razorpay_signature) {
      order.paymentStatus = "failed";
      await order.save();
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
    order.paymentStatus = "paid";
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();
    for (const item of order.items) await DriverStoreProduct.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty, soldCount: item.qty } });
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

// GET /api/driver-store/my-orders
export async function myOrders(req, res, next) {
  try {
    const driver = await Driver.findOne({ userId: req.user._id }).select("_id").lean();
    if (!driver) return res.json({ success: true, orders: [] });
    const filter = { driverId: driver._id };
    if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
    const page = parseInt(req.query.page || "1"),
      limit = parseInt(req.query.limit || "20");
    const [orders, total] = await Promise.all([
      DriverStoreOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DriverStoreOrder.countDocuments(filter),
    ]);
    res.json({ success: true, orders, total, page, limit });
  } catch (err) {
    next(err);
  }
}

// GET /api/driver-store/my-orders/:id
export async function myOrderDetail(req, res, next) {
  try {
    const driver = await Driver.findOne({ userId: req.user._id }).select("_id").lean();
    if (!driver) return res.status(403).json({ success: false, message: "Driver account required" });
    const order = await DriverStoreOrder.findOne({ _id: req.params.id, driverId: driver._id }).populate("items.productId", "photoUrl").lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

// Admin
export async function adminListProducts(req, res, next) {
  try {
    res.json({ success: true, products: await DriverStoreProduct.find().sort({ createdAt: -1 }).lean() });
  } catch (err) {
    next(err);
  }
}
export async function adminCreateProduct(req, res, next) {
  try {
    const d = { ...req.body };
    if (req.file?.path) {
      d.photoUrl = req.file.path;
      d.photoPublicId = req.file.filename;
    }
    if (d.price) d.price = Math.round(Number(d.price) * 100);
    res.status(201).json({ success: true, product: await DriverStoreProduct.create(d) });
  } catch (err) {
    next(err);
  }
}
export async function adminUpdateProduct(req, res, next) {
  try {
    const d = { ...req.body };
    if (req.file?.path) {
      d.photoUrl = req.file.path;
      d.photoPublicId = req.file.filename;
    }
    const p = await DriverStoreProduct.findByIdAndUpdate(req.params.id, d, { new: true });
    if (!p) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, product: p });
  } catch (err) {
    next(err);
  }
}
export async function adminDeleteProduct(req, res, next) {
  try {
    await DriverStoreProduct.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
export async function adminToggleProduct(req, res, next) {
  try {
    const p = await DriverStoreProduct.findById(req.params.id);
    if (!p) return res.status(404).json({ success: false, message: "Not found" });
    p.isActive = !p.isActive;
    await p.save();
    res.json({ success: true, product: p });
  } catch (err) {
    next(err);
  }
}
export async function adminListOrders(req, res, next) {
  try {
    const f = {};
    if (req.query.status && req.query.status !== "all") f.status = req.query.status;
    res.json({
      success: true,
      orders: await DriverStoreOrder.find(f)
        .populate("driverId", "userId vehicleType")
        .populate("userId", "name phone email")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
    });
  } catch (err) {
    next(err);
  }
}
export async function adminUpdateOrderStatus(req, res, next) {
  try {
    const u = {};
    const { status, trackingNumber, trackingUrl, adminNote } = req.body;
    if (status) u.status = status;
    if (trackingNumber) u.trackingNumber = trackingNumber;
    if (trackingUrl) u.trackingUrl = trackingUrl;
    if (adminNote) u.adminNote = adminNote;
    if (status === "shipped") u.shippedAt = new Date();
    if (status === "delivered") u.deliveredAt = new Date();
    const o = await DriverStoreOrder.findByIdAndUpdate(req.params.id, u, { new: true });
    if (!o) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, order: o });
  } catch (err) {
    next(err);
  }
}
