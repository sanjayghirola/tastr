import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, CheckCircle2, XCircle, PauseCircle, Search, Filter } from 'lucide-react'
import { Badge, Button } from '../../components/global/index.jsx'
import api from '../../services/api.js'
import { ENTITY_STATUS } from '@tastr/shared'

const STATUS_VARIANTS = {
  [ENTITY_STATUS.PENDING]:   'warning',
  [ENTITY_STATUS.ACTIVE]:    'success',
  [ENTITY_STATUS.REJECTED]:  'error',
  [ENTITY_STATUS.SUSPENDED]: 'neutral',
}

const CUISINES = ['All','Pizza','Indian','Chinese','Italian','Japanese','Thai','Mexican','Burgers']

function ActionMenu({ restaurant, onAction }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-bg-section transition-colors font-medium">
        Actions ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-bg-card border border-border rounded-xl shadow-modal z-20 py-1 min-w-[160px]"
          onMouseLeave={() => setOpen(false)}>
          <button onClick={() => { onAction('view', restaurant); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-bg-section transition-colors text-text-primary">
            <Eye size={13} /> View Details
          </button>
          {restaurant.status !== ENTITY_STATUS.ACTIVE && (
            <button onClick={() => { onAction('approve', restaurant); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-bg-section transition-colors text-green-600">
              <CheckCircle2 size={13} /> Approve
            </button>
          )}
          {restaurant.status === ENTITY_STATUS.ACTIVE && (
            <button onClick={() => { onAction('suspend', restaurant); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-bg-section transition-colors text-amber-600">
              <PauseCircle size={13} /> Suspend
            </button>
          )}
          {restaurant.status !== ENTITY_STATUS.REJECTED && restaurant.status !== ENTITY_STATUS.ACTIVE && (
            <button onClick={() => { onAction('reject', restaurant); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-bg-section transition-colors text-red-500">
              <XCircle size={13} /> Reject
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function RestaurantsPage() {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState([])
  const [pagination,  setPagination]  = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [page,        setPage]        = useState(1)
  const [filters,     setFilters]     = useState({ status: '', cuisine: '', city: '', q: '' })
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason,setRejectReason]= useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) }
      const res = await api.get('/admin/restaurants', { params })
      setRestaurants(res.data.restaurants || [])
      setPagination(res.data.pagination || null)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(page) }, [page, filters])

  const handleAction = async (action, restaurant) => {
    if (action === 'view') { navigate(`/restaurants/${restaurant._id}`); return }
    if (action === 'reject') { setRejectModal(restaurant); return }

    setActionLoading(true)
    try {
      if (action === 'approve') await api.patch(`/admin/restaurants/${restaurant._id}/status`, { status: 'active' })
      if (action === 'suspend') await api.patch(`/admin/restaurants/${restaurant._id}/status`, { status: 'suspended' })
      load(page)
    } catch (e) { alert(e.response?.data?.message || 'Action failed') }
    finally { setActionLoading(false) }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return
    setActionLoading(true)
    try {
      await api.patch(`/admin/restaurants/${rejectModal._id}/status`, { status: 'rejected', reason: rejectReason })
      setRejectModal(null)
      setRejectReason('')
      load(page)
    } catch (e) { alert(e.response?.data?.message || 'Failed') }
    finally { setActionLoading(false) }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Restaurants</h1>
          <p className="text-sm text-text-muted mt-0.5">{pagination?.total ?? 0} total</p>
        </div>
        <button
          onClick={() => navigate('/restaurants/add')}
          className="flex items-center gap-2 bg-brand-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-brand-600 transition-colors"
        >
          <Plus size={16} /> Add Restaurant
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 p-4 bg-bg-card rounded-2xl border border-border">
        <div className="flex items-center gap-2 flex-1 min-w-40 border border-border rounded-xl px-3 py-2 bg-bg-section">
          <Search size={14} className="text-text-muted flex-shrink-0" />
          <input type="text" placeholder="Search by name…" value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
            className="bg-transparent text-sm focus:outline-none flex-1 text-text-primary placeholder:text-text-muted" />
        </div>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="text-sm border border-border rounded-xl px-3 py-2 focus:border-brand-500 focus:outline-none bg-bg-card text-text-primary">
          <option value="">All Statuses</option>
          {Object.values(ENTITY_STATUS).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <select value={filters.cuisine} onChange={e => setFilters(f => ({ ...f, cuisine: e.target.value === 'All' ? '' : e.target.value }))}
          className="text-sm border border-border rounded-xl px-3 py-2 focus:border-brand-500 focus:outline-none bg-bg-card text-text-primary">
          {CUISINES.map(c => <option key={c} value={c === 'All' ? '' : c}>{c}</option>)}
        </select>
        <input type="text" placeholder="City…" value={filters.city}
          onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
          className="text-sm border border-border rounded-xl px-3 py-2 focus:border-brand-500 focus:outline-none bg-bg-section w-28" />
      </div>

      {/* Table */}
      <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-section">
            <tr>
              {['Restaurant', 'Owner', 'City', 'Cuisine', 'Rating', 'Status', 'Applied', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-16 text-text-muted">Loading…</td></tr>
            ) : restaurants.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-text-muted">No restaurants found</td></tr>
            ) : restaurants.map(r => (
              <tr key={r._id} className="border-t border-border hover:bg-bg-section/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {r.logoUrl ? (
                      <img src={r.logoUrl} alt="" className="w-9 h-9 rounded-xl object-cover border border-border flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm flex-shrink-0">
                        {r.name?.[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-text-primary">{r.name}</p>
                      <p className="text-xs text-text-muted">{r.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-muted">{r.ownerId?.name || '—'}</td>
                <td className="px-4 py-3 text-text-muted">{r.address?.city || '—'}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{(r.cuisines || []).slice(0, 2).join(', ') || '—'}</td>
                <td className="px-4 py-3 text-text-muted">{r.avgRating > 0 ? `★ ${r.avgRating.toFixed(1)}` : '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANTS[r.status] || 'neutral'}>
                    {r.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleDateString('en-GB')}
                </td>
                <td className="px-4 py-3">
                  <ActionMenu restaurant={r} onAction={handleAction} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-text-muted">Page {page} of {pagination.pages} — {pagination.total} total</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-border rounded-lg font-semibold disabled:opacity-40 hover:bg-bg-section transition-colors">
                ← Prev
              </button>
              <button onClick={() => setPage(p => p+1)} disabled={page >= pagination.pages}
                className="px-3 py-1.5 text-xs border border-border rounded-lg font-semibold disabled:opacity-40 hover:bg-bg-section transition-colors">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card rounded-2xl p-6 max-w-sm w-full shadow-modal">
            <h3 className="font-bold text-text-primary mb-1">Reject Restaurant</h3>
            <p className="text-sm text-text-muted mb-4">Provide a reason for rejecting <strong>{rejectModal.name}</strong>.</p>
            <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection…"
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">
                Cancel
              </button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50">
                {actionLoading ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
