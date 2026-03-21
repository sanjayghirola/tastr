import mongoose from 'mongoose';
import { TRANSACTION_TYPE } from '@tastr/shared';

const transactionSchema = new mongoose.Schema({
  type:        { type: String, enum: Object.values(TRANSACTION_TYPE), required: true },
  amount:      { type: Number, required: true },   // pence — positive = credit, negative = debit
  description: { type: String, required: true },
  orderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  stripeId:    String,
  balanceAfter:{ type: Number, required: true },
  meta:        mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const walletSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance:      { type: Number, default: 0 },   // pence
  transactions: [transactionSchema],
  isLocked:     { type: Boolean, default: false },  // fraud hold
}, { timestamps: true });

walletSchema.index({ userId: 1 }, { unique: true });

// Credit / debit helpers
walletSchema.methods.credit = async function (amount, description, meta = {}) {
  this.balance += amount;
  this.transactions.push({
    type: TRANSACTION_TYPE.CREDIT, amount, description,
    balanceAfter: this.balance, ...meta,
  });
  return this.save();
};

walletSchema.methods.debit = async function (amount, description, meta = {}) {
  if (this.balance < amount) throw new Error('Insufficient wallet balance');
  this.balance -= amount;
  this.transactions.push({
    type: TRANSACTION_TYPE.DEBIT, amount: -amount, description,
    balanceAfter: this.balance, ...meta,
  });
  return this.save();
};

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
