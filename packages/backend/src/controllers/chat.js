import ChatMessage from '../models/ChatMessage.js';
import Order from '../models/Order.js';
import Driver from '../models/Driver.js';

export async function getChatHistory(req, res, next) {
  try {
    const { orderId } = req.params;
    const userId = req.user._id.toString();

    // Verify access
    const order = await Order.findById(orderId).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isCustomer = order.customerId?.toString() === userId;
    const isAdmin    = ['SUPER_ADMIN', 'SUB_ADMIN'].includes(req.user.role);

    // Driver check: resolve User._id → Driver._id
    let isDriver = false;
    if (req.user.role === 'DRIVER' && order.driverId) {
      const driverDoc = await Driver.findOne({ userId: req.user._id }).select('_id').lean();
      isDriver = driverDoc && order.driverId.toString() === driverDoc._id.toString();
    }

    if (!isCustomer && !isDriver && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await ChatMessage.find({ orderId })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ messages });
  } catch (err) {
    next(err);
  }
}

export async function markChatRead(req, res, next) {
  try {
    const { orderId } = req.params;
    const userId = req.user._id.toString();

    await ChatMessage.updateMany(
      { orderId, senderId: { $ne: userId }, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}