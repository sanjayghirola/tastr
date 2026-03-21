import mongoose from 'mongoose';

const cmsPageSchema = new mongoose.Schema({
  slug:       { type: String, required: true, unique: true }, // 'privacy-policy' | 'terms'
  title:      { type: String, required: true },
  content:    { type: String, required: true },   // rich HTML string
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

const CmsPage = mongoose.model('CmsPage', cmsPageSchema);
export default CmsPage;
