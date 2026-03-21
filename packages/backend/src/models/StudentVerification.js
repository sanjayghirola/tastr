import mongoose from 'mongoose';

const studentVerificationSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  institution:      { type: String, required: true },
  studentEmail:     { type: String, required: true },
  emailVerified:    { type: Boolean, default: false },
  studentIdExpiry:  { type: Date },
  idDocumentUrl:    { type: String, default: '' },
  idDocumentPublicId: String,
  status:           { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  reviewedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  reviewedAt:       Date,
  rejectionReason:  String,
  submittedAt:      { type: Date, default: Date.now },
}, { timestamps: true });

studentVerificationSchema.index({ userId: 1 });
studentVerificationSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('StudentVerification', studentVerificationSchema);
