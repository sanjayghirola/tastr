import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  adminId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  adminName:  String,
  action:     { type: String, required: true },      // e.g. 'APPROVE_RESTAURANT'
  targetType: { type: String, required: true },      // e.g. 'Restaurant', 'User'
  targetId:   mongoose.Schema.Types.ObjectId,
  before:     mongoose.Schema.Types.Mixed,
  after:      mongoose.Schema.Types.Mixed,
  ip:         String,
  userAgent:  String,
  notes:      String,
}, { timestamps: true });

auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
