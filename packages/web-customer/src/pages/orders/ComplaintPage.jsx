import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

const COMPLAINT_TYPES = [
  { value: 'missing_item',     label: '📦 Missing Item',        desc: 'Item was not in the delivery' },
  { value: 'wrong_item',       label: '❌ Wrong Item',           desc: 'Received the wrong item' },
  { value: 'quality',          label: '😞 Poor Quality',        desc: 'Food quality was unsatisfactory' },
  { value: 'late_delivery',    label: '⏰ Late Delivery',        desc: 'Order arrived very late' },
  { value: 'damaged',          label: '💔 Damaged Packaging',   desc: 'Food was damaged or spilled' },
  { value: 'driver_behaviour', label: '🚗 Driver Behaviour',    desc: 'Issue with the driver' },
  { value: 'other',            label: '📝 Other',               desc: 'Something else went wrong' },
];

export default function ComplaintPage() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const orderId       = params.get('orderId');

  const [type,        setType]        = useState('');
  const [description, setDescription] = useState('');
  const [evidence,    setEvidence]    = useState([]); // base64 previews
  const [uploading,   setUploading]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [submitted,   setSubmitted]   = useState(false);

  function handleFileChange(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setEvidence(prev => [...prev, { preview: ev.target.result, file }]);
      reader.readAsDataURL(file);
    });
  }

  async function submit() {
    if (!type)              return setError('Please select a complaint type');
    if (!description.trim()) return setError('Please describe the issue');
    if (!orderId)           return setError('Order ID is missing');

    setSubmitting(true);
    setError('');

    try {
      // Upload evidence images to Cloudinary via backend
      const uploadedUrls = [];
      for (const ev of evidence) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', ev.file);
        const r = await api.post('/users/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        uploadedUrls.push(r.data.url);
      }
      setUploading(false);

      await api.post('/complaints', { orderId, type, description: description.trim(), evidence: uploadedUrls });
      setSubmitted(true);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  if (submitted) return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-green-50 border-4 border-green-400 flex items-center justify-center text-4xl mb-4">✅</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Complaint Submitted</h2>
      <p className="text-gray-500 text-sm mb-8 max-w-xs">
        Our team will review your complaint and get back to you within 24 hours.
      </p>
      <button onClick={() => navigate('/orders')} className="w-full max-w-xs py-3 rounded-2xl bg-[#C18B3C] text-white font-bold text-sm">
        Back to Orders
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="bg-white border-b border-[#E8D9C0] px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-[#C18B3C] font-bold text-lg">←</button>
        <p className="font-bold text-gray-800">Report a Problem</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Type selection */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">What went wrong?</label>
          <div className="space-y-2">
            {COMPLAINT_TYPES.map(ct => (
              <label key={ct.value}
                className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-colors
                  ${type === ct.value ? 'border-[#C18B3C] bg-[#FAF0E0]' : 'border-[#E8D9C0] bg-white hover:border-[#C18B3C]/40'}`}>
                <input type="radio" name="type" value={ct.value} checked={type === ct.value}
                  onChange={() => setType(ct.value)} className="accent-[#C18B3C]" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{ct.label}</p>
                  <p className="text-xs text-gray-400">{ct.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Describe the issue</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Please give us as much detail as possible…"
            className="w-full border border-[#E8D9C0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#C18B3C] resize-none bg-white"
          />
          <p className="text-xs text-gray-400 text-right mt-1">{description.length}/2000</p>
        </div>

        {/* Evidence upload */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Evidence (optional)</label>
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[#E8D9C0] rounded-2xl cursor-pointer hover:border-[#C18B3C] transition-colors bg-white">
            <span className="text-2xl mb-1">📷</span>
            <span className="text-xs text-gray-400">Tap to add photos</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          </label>
          {evidence.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {evidence.map((ev, i) => (
                <div key={i} className="relative">
                  <img src={ev.preview} className="w-16 h-16 rounded-xl object-cover border border-[#E8D9C0]" alt="" />
                  <button onClick={() => setEvidence(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm px-1">{error}</p>}

        <button
          onClick={submit}
          disabled={submitting || uploading}
          className="w-full py-4 rounded-2xl bg-[#C18B3C] text-white font-bold text-sm disabled:opacity-40 hover:bg-[#a97430] transition-colors"
        >
          {uploading ? 'Uploading photos…' : submitting ? 'Submitting…' : 'Submit Complaint'}
        </button>
      </div>
    </div>
  );
}
