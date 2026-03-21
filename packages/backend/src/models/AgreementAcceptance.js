import mongoose from 'mongoose';

const agreementAcceptanceSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  agreementId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Agreement', required: true },
  agreementType: { type: String, enum: ['restaurant', 'driver'], required: true },
  version:       { type: String, required: true },
  acceptedAt:    { type: Date, default: Date.now },
  ipAddress:     String,
  userAgent:     String,
}, { timestamps: true });

agreementAcceptanceSchema.index({ userId: 1, agreementType: 1 });
agreementAcceptanceSchema.index({ agreementId: 1 });

export default mongoose.model('AgreementAcceptance', agreementAcceptanceSchema);
