import mongoose from 'mongoose';

const notifTemplateSchema = new mongoose.Schema({
  trigger:   { type: String, required: true, unique: true },
  title:     { type: String, required: true },
  body:      { type: String, required: true },
  channel:   { type: String, enum: ['push','email','sms','all'], default: 'push' },
  isActive:  { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

const NotifTemplate = mongoose.model('NotifTemplate', notifTemplateSchema);
export default NotifTemplate;
