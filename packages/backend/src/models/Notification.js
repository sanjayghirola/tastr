import mongoose from 'mongoose';
import { NOTIF_SEGMENT } from '@tastr/shared';

const notifBlastSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  body:        { type: String, required: true },
  segment:     { type: String, enum: Object.values(NOTIF_SEGMENT), default: NOTIF_SEGMENT.ALL },
  restaurantId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  sentBy:      { type: mongoose.Schema.Types.ObjectId },
  sentByType:  { type: String, enum: ['admin', 'restaurant'] },
  scheduledAt: Date,
  sentAt:      Date,
  recipientCount: { type: Number, default: 0 },
  status:      { type: String, enum: ['draft','scheduled','sent','failed'], default: 'draft' },
}, { timestamps: true });

const NotifBlast = mongoose.model('NotifBlast', notifBlastSchema);
export default NotifBlast;
