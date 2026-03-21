import DriverStoreProduct from '../models/DriverStoreProduct.js';
import DriverStoreOrder from '../models/DriverStoreOrder.js';
import Wallet from '../models/Wallet.js';
import Driver from '../models/Driver.js';
import { logger } from '../utils/logger.js';

const fmt = p => `£${((p || 0) / 100).toFixed(2)}`;

// ─── Public / Driver Routes ───────────────────────────────────────────────────

// GET /api/driver-store/products
export async function listProducts(req, res, next) {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    const products = await DriverStoreProduct.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, products });
  } catch (err) { next(err); }
}

// GET /api/driver-store/products/:id
export async function getProduct(req, res, next) {
  try {
    const product = await DriverStoreProduct.findById(req.params.id).lean();
    if (!product || !product.isActive) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) { next(err); }
}

// POST /api/driver-store/checkout
export async function checkout(req, res, next) {
  try {
    const { items, paymentMethod = 'wallet', address } = req.body; // items: [{ productId, qty }]
    const userId = req.user._id;

    if (!items?.length) return res.status(400).json({ success: false, message: 'No items' });

    const driver = await Driver.findOne({ userId });
    if (!driver) return res.status(403).json({ success: false, message: 'Driver account required' });

    // Validate products + calculate total
    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await DriverStoreProduct.findById(item.productId);
      if (!product || !product.isActive) return res.status(400).json({ success: false, message: `Product not found: ${item.productId}` });
      if (product.stock < item.qty) return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
      total += product.price * item.qty;
      orderItems.push({ productId: product._id, name: product.name, price: product.price, qty: item.qty });
    }

    if (paymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || wallet.balance < total) {
        return res.status(400).json({ success: false, message: `Insufficient wallet balance. Need ${fmt(total)}, have ${fmt(wallet?.balance || 0)}` });
      }
      // Deduct wallet
      wallet.balance -= total;
      wallet.transactions.push({ type: 'debit', amount: -total, description: `Driver Store order (${orderItems.length} items)`, balanceAfter: wallet.balance });
      await wallet.save();
    }

    // Deduct stock
    for (const item of items) {
      await DriverStoreProduct.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty, soldCount: item.qty } });
    }

    const order = await DriverStoreOrder.create({
      driverId: driver._id, items: orderItems, total,
      paymentMethod, paymentStatus: 'paid', address,
    });

    res.status(201).json({ success: true, order });
  } catch (err) { next(err); }
}

// ─── Admin Routes ─────────────────────────────────────────────────────────────

export async function adminListProducts(req, res, next) {
  try {
    const products = await DriverStoreProduct.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, products });
  } catch (err) { next(err); }
}

export async function adminCreateProduct(req, res, next) {
  try {
    const data = { ...req.body };
    if (req.file?.path) { data.photoUrl = req.file.path; data.photoPublicId = req.file.filename; }
    if (data.price) data.price = Math.round(Number(data.price) * 100); // convert £ to pence if needed
    const product = await DriverStoreProduct.create(data);
    res.status(201).json({ success: true, product });
  } catch (err) { next(err); }
}

export async function adminUpdateProduct(req, res, next) {
  try {
    const data = { ...req.body };
    if (req.file?.path) { data.photoUrl = req.file.path; data.photoPublicId = req.file.filename; }
    const product = await DriverStoreProduct.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, product });
  } catch (err) { next(err); }
}

export async function adminDeleteProduct(req, res, next) {
  try {
    await DriverStoreProduct.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function adminToggleProduct(req, res, next) {
  try {
    const product = await DriverStoreProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });
    product.isActive = !product.isActive;
    await product.save();
    res.json({ success: true, product });
  } catch (err) { next(err); }
}

export async function adminListOrders(req, res, next) {
  try {
    const orders = await DriverStoreOrder.find()
      .populate('driverId', 'userId vehicleType')
      .sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, orders });
  } catch (err) { next(err); }
}
