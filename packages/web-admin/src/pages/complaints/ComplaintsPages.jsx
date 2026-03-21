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
  missing_item: 'Missing Item', wrong_item: 'Wrong Item', quality: 'Poor Quality',
  late_delivery: 'Late Delivery', damaged: 'Damaged', driver_behaviour: 'Driver', other: 'Other',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-500' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
}

// ─── Admin Complaints List ────────────────────────────────────────────────────
export function AdminComplaintsPage() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [filter,     setFilter]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit });
    if (filter) params.set('status', filter);
    api.get(`/complaints?${params}`)
      .then(r => { setComplaints(r.data.complaints || []); setTotal(r.data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter, page]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Complaints</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[['', 'All'], ['open', 'Open'], ['under_review', 'Under Review'], ['resolved', 'Resolved'], ['closed', 'Closed']].map(([val, label]) => (
          <button key={val} onClick={() => { setFilter(val); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors
              ${filter === val ? 'bg-[#C18B3C] text-white' : 'bg-white border border-[#E8D9C0] text-gray-500 hover:border-[#C18B3C]'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E8D9C0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8D9C0] bg-[#FAF7F2]">
                {['Order #', 'Customer', 'Restaurant', 'Type', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              ) : complaints.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No complaints found</td></tr>
              ) : complaints.map(c => (
                <tr key={c._id} className="border-b border-[#E8D9C0] hover:bg-[#FAF7F2] cursor-pointer"
                  onClick={() => navigate(`/complaints/${c._id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-[#C18B3C]">{c.orderId?.orderId || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{c.customerId?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.restaurantId?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{TYPE_LABELS[c.type] || c.type}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-[#C18B3C] text-xs">View →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {Math.ceil(total / limit) > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E8D9C0]">
            <p className="text-xs text-gray-400">{total} total</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 disabled:opacity-40">← Prev</button>
              <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Escalation Timeline ──────────────────────────────────────────────────────
function EscalationTimeline({ events }) {
  if (!events?.length) return null;
  return (
    <div className="space-y-3">
      {events.map((ev, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ring-2
            ${ev.actorType === 'admin' ? 'bg-[#C18B3C] ring-[#C18B3C]/20'
            : ev.actorType === 'restaurant' ? 'bg-blue-500 ring-blue-100'
            : 'bg-gray-400 ring-gray-100'}`} />
          <div>
            <p className="text-sm font-semibold text-gray-700 capitalize">{ev.action.replace(/_/g, ' ')}</p>
            {ev.note && <p className="text-xs text-gray-500">{ev.note}</p>}
            <p className="text-xs text-gray-300 mt-0.5">
              {ev.actorType} · {new Date(ev.at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Admin Complaint Detail Page ──────────────────────────────────────────────
export function AdminComplaintDetailPage() {
  const { id }  = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [resolution, setResolution] = useState('full_refund');
  const [amount,     setAmount]     = useState('');
  const [adminNote,  setAdminNote]  = useState('');
  const [resolving,  setResolving]  = useState(false);

  useEffect(() => {
    api.get(`/complaints/${id}`)
      .then(r => setComplaint(r.data.complaint))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function resolve() {
    setResolving(true);
    try {
      const body = { resolution, adminNote };
      if (resolution === 'partial_refund' && amount) {
        body.refundAmount = Math.round(parseFloat(amount) * 100);
      }
      const r = await api.patch(`/complaints/${id}/resolve`, body);
      setComplaint(r.data.complaint);
    } catch { alert('Failed to resolve complaint'); }
    finally { setResolving(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-[#C18B3C] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!complaint) return <div className="p-6 text-gray-400">Not found</div>;

  const canResolve = !['resolved', 'closed'].includes(complaint.status);
  const orderTotal = (complaint.orderId?.total || 0) / 100;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/complaints')} className="text-[#C18B3C] text-sm font-semibold mb-4 block">← Complaints</button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Complaint info */}
        <div className="bg-white rounded-2xl border border-[#E8D9C0] p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-gray-700">{TYPE_LABELS[complaint.type]}</h3>
            <StatusBadge status={complaint.status} />
          </div>
          <p className="text-sm text-gray-600 bg-[#FAF7F2] rounded-xl p-3 mb-3">{complaint.description}</p>
          <div className="text-xs text-gray-400 space-y-0.5">
            <p>Order: <span className="font-mono text-[#C18B3C]">{complaint.orderId?.orderId}</span></p>
            <p>Customer: {complaint.customerId?.name}</p>
            <p>Restaurant: {complaint.restaurantId?.name}</p>
            <p>Date: {new Date(complaint.createdAt).toLocaleString()}</p>
          </div>
        </div>

        {/* Evidence */}
        {complaint.evidence?.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8D9C0] p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Evidence</p>
            <div className="flex gap-2 flex-wrap">
              {complaint.evidence.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} className="w-20 h-20 rounded-xl object-cover border border-[#E8D9C0]" alt="" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Restaurant response */}
        {complaint.restaurantResponse && (
          <div className="bg-white rounded-2xl border border-[#E8D9C0] p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Restaurant Response</p>
            <p className="text-sm text-gray-700">{complaint.restaurantResponse}</p>
            <p className="text-xs text-gray-400 mt-1 capitalize">Action: {complaint.restaurantAction?.replace('_', ' ')}</p>
          </div>
        )}

        {/* Resolution form */}
        {canResolve ? (
          <div className="bg-white rounded-2xl border border-[#E8D9C0] p-5 shadow-sm">
            <p className="font-bold text-gray-700 mb-4">Resolve Complaint</p>

            <div className="space-y-2 mb-4">
              {[
                ['full_refund',    `Full Refund (£${orderTotal.toFixed(2)})`],
                ['partial_refund', 'Partial Refund'],
                ['declined',       'Decline Refund'],
              ].map(([val, label]) => (
                <label key={val} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                  ${resolution === val ? 'border-[#C18B3C] bg-[#FAF0E0]' : 'border-gray-200 hover:border-[#C18B3C]/40'}`}>
                  <input type="radio" name="resolution" value={val} checked={resolution === val}
                    onChange={() => setResolution(val)} className="accent-[#C18B3C]" />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            {resolution === 'partial_refund' && (
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">Refund Amount (£)</label>
                <input type="number" step="0.01" min="0.01" max={orderTotal}
                  value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder={`Max £${orderTotal.toFixed(2)}`}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#C18B3C]" />
              </div>
            )}

            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1">Admin Note</label>
              <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                rows={3} placeholder="Internal note…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#C18B3C] resize-none" />
            </div>

            <button onClick={resolve} disabled={resolving}
              className="w-full py-3 rounded-2xl bg-[#C18B3C] text-white font-bold text-sm disabled:opacity-40 hover:bg-[#a97430]">
              {resolving ? 'Resolving…' : 'Resolve Complaint'}
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm">
            <p className="font-semibold text-green-700 mb-1">Resolved</p>
            <p className="text-sm text-green-600 capitalize">{complaint.resolution?.replace('_', ' ')}</p>
            {complaint.refundAmount > 0 && <p className="text-xs text-green-500 mt-1">Refund: £{(complaint.refundAmount / 100).toFixed(2)}</p>}
            {complaint.adminNote && <p className="text-xs text-gray-500 mt-1">{complaint.adminNote}</p>}
          </div>
        )}

        {/* Escalation timeline */}
        <div className="bg-white rounded-2xl border border-[#E8D9C0] p-4 shadow-sm md:col-span-2">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Escalation Timeline</p>
          <EscalationTimeline events={complaint.timeline} />
        </div>
      </div>
    </div>
  );
}
