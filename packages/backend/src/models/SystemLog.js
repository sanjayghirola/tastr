import mongoose from 'mongoose';

const systemLogSchema = new mongoose.Schema({
  level:     { type: String, enum: ['error','warn','info','debug'], default: 'info' },
  message:   { type: String, required: true },
  stack:     String,
  meta:      mongoose.Schema.Types.Mixed,
  source:    { type: String, default: 'backend' },
  ip:        String,
  userId:    mongoose.Schema.Types.ObjectId,
  path:      String,
  method:    String,
  statusCode: Number,
}, { timestamps: true });

systemLogSchema.index({ createdAt: -1 });
systemLogSchema.index({ level: 1, createdAt: -1 });

const SystemLog = mongoose.model('SystemLog', systemLogSchema);
export default SystemLog;
