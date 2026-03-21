import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const STATUS_CFG = {
  open:         { label: 'Open',         bg: 'bg-red-100',    text: 'text-red-700'    },
  under_review: { label: 'Under Review', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  resolved:     { label: 'Resolved',     bg: 'bg-green-100',  text: 'text-green-700'  },
  closed:       { label: 'Closed',       bg: 'bg-gray-100',   text: 'text-gray-500'   },
};

const TYPE_LABELS = {
  missing_item:     'Missing Item',
  wrong_item:       'Wrong Item',
  quality:          'Poor Quality',
  late_delivery:    'Late Delivery',
  damaged:          'Damaged Packaging',
  driver_behaviour: 'Driver Behaviour',
  other:            'Other',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-500' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
}

// ─── ComplaintsPage (list) ────────────────────────────────────────────────────
export function RestaurantComplaintsPage() {
  const navigate  = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [filter,     setFilter]     = useState('');
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const params = filter ? `?status=${filter}` : '';
    api.get(`/complaints${params}`)
      .then(r => setComplaints(r.data.complaints || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Complaints</h1>

        {/* Status filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[['', 'All'], ['open', 'Open'], ['under_review', 'Under Review'], ['resolved', 'Resolved']].map(([val, label]) => (
            <button key={val} onClick={() => { setFilter(val); setLoading(true); }}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors
                ${filter === val ? 'bg-[#C18B3C] text-white' : 'bg-white border border-[#E8D9C0] text-gray-500 hover:border-[#C18B3C]'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E8D9C0] overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#C18B3C] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><polyline points="20 6 9 17 4 12"/></svg></div>
              <p className="text-sm">No complaints here!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8D9C0] bg-[#FAF7F2]">
                    {['Order #', 'Customer', 'Type', 'Status', 'Date', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c._id} className="border-b border-[#E8D9C0] hover:bg-[#FAF7F2] cursor-pointer"
                      onClick={() => navigate(`/complaints/${c._id}`)}>
                      <td className="px-4 py-3 font-mono text-xs text-[#C18B3C]">{c.orderId?.orderId || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{c.customerId?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{TYPE_LABELS[c.type] || c.type}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-[#C18B3C] text-xs">View →</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ComplaintDetailPage ──────────────────────────────────────────────────────
export function RestaurantComplaintDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [response,  setResponse]  = useState('');
  const [action,    setAction]    = useState('accept_refund');
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get(`/complaints/${id}`)
      .then(r => { setComplaint(r.data.complaint); if (r.data.complaint.restaurantResponse) setSubmitted(true); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function submitResponse() {
    if (!response.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/complaints/${id}/respond`, { restaurantResponse: response, restaurantAction: action });
      setSubmitted(true);
      setComplaint(c => ({ ...c, restaurantResponse: response, restaurantAction: action, status: 'under_review' }));
    } catch { alert('Failed to submit response'); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#C18B3C] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!complaint) return <div className="p-6 text-gray-400">Complaint not found</div>;

  return (
    <div className="min-h-screen bg-[#FAF7F2] p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/complaints')} className="text-[#C18B3C] text-sm font-semibold mb-4 block">← Back to Complaints</button>

        <div className="space-y-4">
          {/* Complaint detail */}
          <div className="bg-white rounded-2xl border border-[#E8D9C0] p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-gray-800">{TYPE_LABELS[complaint.type]}</p>
                <p className="text-xs text-gray-400 mt-0.5">Order {complaint.orderId?.orderId} · {complaint.customerId?.name}</p>
              </div>
              <StatusBadge status={complaint.status} />
            </div>
            <p className="text-sm text-gray-700 bg-[#FAF7F2] rounded-xl p-3">{complaint.description}</p>
          </div>

          {/* Evidence photos */}
          {complaint.evidence?.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8D9C0] p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Evidence</p>
              <div className="flex gap-2 flex-wrap">
                {complaint.evidence.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} className="w-20 h-20 rounded-xl object-cover border border-[#E8D9C0] hover:opacity-80" alt={`Evidence ${i + 1}`} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Order items reference */}
          {complaint.orderId?.items?.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8D9C0] p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Order Items</p>
              {complaint.orderId.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span>{item.quantity}× {item.name}</span>
                  <span className="text-gray-500">£{(item.subtotal / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Response form or submitted response */}
          {!submitted ? (
            <div className="bg-white rounded-2xl border border-[#E8D9C0] p-5 shadow-sm">
              <p className="font-bold text-gray-800 mb-4">Your Response</p>

              {/* Action choice */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button onClick={() => setAction('accept_refund')}
                  className={`py-3 rounded-xl text-sm font-semibold border transition-colors
                    ${action === 'accept_refund' ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 text-gray-600 hover:border-green-400'}`}>
                  ✓ Accept Refund
                </button>
                <button onClick={() => setAction('dispute')}
                  className={`py-3 rounded-xl text-sm font-semibold border transition-colors
                    ${action === 'dispute' ? 'bg-red-500 text-white border-red-500' : 'border-gray-200 text-gray-600 hover:border-red-400'}`}>
                  ✗ Dispute
                </button>
              </div>

              <textarea
                value={response}
                onChange={e => setResponse(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Provide a detailed response to the customer's complaint…"
                className="w-full border border-[#E8D9C0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#C18B3C] resize-none"
              />
              <button
                onClick={submitResponse}
                disabled={saving || !response.trim()}
                className="w-full mt-3 py-3 rounded-2xl bg-[#C18B3C] text-white font-bold text-sm disabled:opacity-40 hover:bg-[#a97430]"
              >
                {saving ? 'Submitting…' : 'Submit Response'}
              </button>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="text-sm font-semibold text-green-700 mb-1">Response submitted</p>
              <p className="text-sm text-green-600">{complaint.restaurantResponse}</p>
              <p className="text-xs text-green-500 mt-1 capitalize">Action: {complaint.restaurantAction?.replace('_', ' ')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
