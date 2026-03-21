import { useEffect, useState } from 'react'
import { Search, GraduationCap, CheckCircle2, XCircle, Eye, X, ZoomIn } from 'lucide-react'
import { Badge } from '../../components/global/index.jsx'
import api from '../../services/api.js'

const STATUS_VARIANT = { pending: 'warning', approved: 'success', rejected: 'error' }

// ─── Document Viewer ───────────────────────────────────────────────────────────
function DocumentViewer({ url, onClose }) {
  const [zoomed, setZoomed] = useState(false)
  if (!url) return (
    <div className="bg-bg-section rounded-2xl p-8 text-center">
      <GraduationCap size={28} className="mx-auto mb-2 text-text-muted" />
      <p className="text-sm text-text-muted">No document uploaded</p>
    </div>
  )
  const isPDF = url.toLowerCase().includes('.pdf')
  return (
    <div>
      {isPDF ? (
        <div className="bg-bg-section rounded-2xl p-6 text-center">
          <p className="text-sm text-text-muted mb-3">PDF document attached</p>
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
            Open PDF
          </a>
        </div>
      ) : (
        <div className={`relative ${zoomed ? 'fixed inset-4 z-50 bg-black/90 flex items-center justify-center rounded-2xl' : ''}`}>
          <img
            src={url} alt="Student ID"
            onClick={() => setZoomed(z => !z)}
            className={`rounded-2xl cursor-zoom-in transition-all ${zoomed ? 'max-h-full max-w-full object-contain' : 'w-full max-h-80 object-contain border border-border bg-bg-section'}`}
          />
          {zoomed && (
            <button onClick={() => setZoomed(false)}
              className="absolute top-4 right-4 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30">
              <X size={18} />
            </button>
          )}
          {!zoomed && (
            <button onClick={() => setZoomed(true)}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg">
              <ZoomIn size={12} /> Zoom
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Review Modal ──────────────────────────────────────────────────────────────
function ReviewModal({ verification, onClose, onSuccess }) {
  const [action, setAction]     = useState(null)
  const [reason, setReason]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async () => {
    if (!action) return
    if (action === 'reject' && !reason.trim()) { setError('Rejection reason required'); return }
    setLoading(true); setError('')
    try {
      await api.patch(`/student-verification/admin/${verification._id}/review`, { action, rejectionReason: reason })
      onSuccess()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to review')
    } finally { setLoading(false) }
  }

  const v = verification
  const u = v.userId || {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-bg-card rounded-3xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-7 py-5 border-b border-border sticky top-0 bg-bg-card rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-100 flex items-center justify-center">
              <GraduationCap size={18} className="text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Review Application</h2>
              <p className="text-xs text-text-muted">{u.name || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-bg-section transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-7 space-y-6">
          {/* Student Info */}
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Student Information</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Full Name', u.name],
                ['Email', u.email],
                ['Phone', u.phone],
                ['Student Email', v.studentEmail],
                ['Institution', v.institution],
                ['Submitted', v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-GB') : '—'],
              ].map(([label, val]) => (
                <div key={label} className="bg-bg-section rounded-xl p-3">
                  <p className="text-xs text-text-muted mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-text-primary break-words">{val || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Document Viewer */}
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Identity Document</p>
            <DocumentViewer url={v.idDocumentUrl} />
          </div>

          <div className="h-px bg-border" />

          {/* Action */}
          {v.status === 'pending' && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Decision</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setAction('approve')}
                  className={`py-3 rounded-2xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2
                    ${action === 'approve' ? 'bg-green-500 border-green-500 text-white' : 'border-green-300 text-green-600 hover:bg-green-50'}`}>
                  <CheckCircle2 size={15} /> Approve
                </button>
                <button onClick={() => setAction('reject')}
                  className={`py-3 rounded-2xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2
                    ${action === 'reject' ? 'bg-red-500 border-red-500 text-white' : 'border-red-300 text-red-500 hover:bg-red-50'}`}>
                  <XCircle size={15} /> Reject
                </button>
              </div>
              {action === 'reject' && (
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                  placeholder="Reason for rejection (shown to student)…"
                  className="w-full border border-border rounded-2xl p-3.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section resize-none" />
              )}
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button onClick={handleSubmit} disabled={!action || loading}
                className="w-full py-3 bg-brand-500 text-white font-bold rounded-2xl text-sm hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</> : `${action === 'approve' ? 'Approve Application' : action === 'reject' ? 'Reject Application' : 'Select a decision'}`}
              </button>
            </div>
          )}

          {v.status !== 'pending' && (
            <div className={`p-4 rounded-2xl ${v.status === 'approved' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-bold mb-1 ${v.status === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
                {v.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
              </p>
              {v.rejectionReason && <p className="text-sm text-red-700">{v.rejectionReason}</p>}
              {v.reviewedAt && <p className="text-xs text-text-muted mt-1">Reviewed {new Date(v.reviewedAt).toLocaleDateString('en-GB')}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Queue Page ───────────────────────────────────────────────────────────
export default function StudentVerificationPage() {
  const [verifications, setVerifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const [page, setPage]                   = useState(1)
  const [pagination, setPagination]       = useState(null)
  const [statusFilter, setStatusFilter]   = useState('pending')
  const [q, setQ]                         = useState('')
  const [selected, setSelected]           = useState(null)

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, limit: 20 }
      if (statusFilter) params.status = statusFilter
      const res = await api.get('/student-verification/admin/queue', { params })
      setVerifications(res.data.verifications || [])
      setPagination(res.data.pagination)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load(page) }, [page, statusFilter])

  const filtered = q ? verifications.filter(v =>
    v.userId?.name?.toLowerCase().includes(q.toLowerCase()) ||
    v.userId?.email?.toLowerCase().includes(q.toLowerCase()) ||
    v.institution?.toLowerCase().includes(q.toLowerCase())
  ) : verifications

  return (
    <div className="p-6 space-y-5">
      {selected && (
        <ReviewModal
          verification={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); load(page) }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Student Verification</h1>
          <p className="text-sm text-text-muted mt-0.5">{pagination?.total ?? 0} applications</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-bg-card rounded-2xl border border-border">
        <div className="flex items-center gap-2 flex-1 min-w-48 border border-border rounded-xl px-3 py-2 bg-bg-section">
          <Search size={14} className="text-text-muted flex-shrink-0" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search student, institution…"
            className="bg-transparent text-sm focus:outline-none flex-1 placeholder:text-text-muted" />
        </div>
        <div className="flex gap-2">
          {['pending','approved','rejected',''].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors capitalize
                ${statusFilter === s ? 'bg-brand-500 text-white' : 'bg-bg-section text-text-muted hover:text-text-primary border border-border'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-section">
            <tr>
              {['Student', 'Institution', 'Student Email', 'Status', 'Submitted', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-16 text-text-muted">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16">
                <GraduationCap size={28} className="mx-auto mb-2 text-text-muted opacity-40" />
                <p className="text-text-muted text-sm">No applications found</p>
              </td></tr>
            ) : filtered.map(v => (
              <tr key={v._id} className="border-t border-border hover:bg-bg-section/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600 flex-shrink-0">
                      {(v.userId?.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">{v.userId?.name || '—'}</p>
                      <p className="text-xs text-text-muted">{v.userId?.email || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-primary text-sm">{v.institution || '—'}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{v.studentEmail || '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[v.status] || 'neutral'}>{v.status}</Badge>
                </td>
                <td className="px-4 py-3 text-text-muted text-xs">{new Date(v.createdAt).toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setSelected(v)}
                    className="flex items-center gap-1.5 text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors">
                    <Eye size={13} /> Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-text-muted">Page {page} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-border rounded-lg font-semibold disabled:opacity-40 hover:bg-bg-section">← Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs border border-border rounded-lg font-semibold disabled:opacity-40 hover:bg-bg-section">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
