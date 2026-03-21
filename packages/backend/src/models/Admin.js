import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '@tastr/shared';

const adminSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN], default: ROLES.SUB_ADMIN },
  permissions:  [String],
  status:       { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  lastLoginAt:  Date,
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => { delete ret.passwordHash; delete ret.__v; return ret; },
  },
});

adminSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

adminSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash') && !this.passwordHash.startsWith('$2')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
