import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Search, Ban, Eye, User, ShoppingBag, Wallet, Users,
  GraduationCap, FileText, ChevronLeft, X
} from 'lucide-react'
import { Badge } from '../../components/global/index.jsx'
import api from '../../services/api.js'

const fmt = p => `£${((p || 0) / 100).toFixed(2)}`

// ─── Customers List Page ───────────────────────────────────────────────────────
export function CustomersPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [banModal, setBanModal] = useState(null)
  const [banReason, setBanReason] = useState('')
  const [banLoading, setBanLoading] = useState(false)

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, limit: 30 }
      if (q) params.q = q
      if (status) params.status = status
      const res = await api.get('/admin/customers', { params })
      setCustomers(res.data.customers || [])
      setPagination(res.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load(page) }, [page, q, status])

  const handleBan = async () => {
    setBanLoading(true)
    try {
      await api.patch(`/admin/users/${banModal._id}/ban`, { reason: banReason })
      setBanModal(null)
      setBanReason('')
      load(page)
    } catch (e) { alert(e.response?.data?.message || 'Failed') }
    finally { setBanLoading(false) }
  }

  const handleUnban = async (customer) => {
    if (!confirm(`Unban ${customer.name}?`)) return
    await api.patch(`/admin/users/${customer._id}/unban`)
    load(page)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Customers</h1>
          <p className="text-sm text-text-muted mt-0.5">{pagination?.total ?? 0} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-bg-card rounded-2xl border border-border">
        <div className="flex items-center gap-2 flex-1 min-w-40 border border-border rounded-xl px-3 py-2 bg-bg-section">
          <Search size={14} className="text-text-muted flex-shrink-0" />
          <input type="text" placeholder="Search name, email, phone…" value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
            className="bg-transparent text-sm focus:outline-none flex-1 text-text-primary placeholder:text-text-muted" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="text-sm border border-border rounded-xl px-3 py-2 focus:outline-none bg-bg-card text-text-primary">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="BANNED">Banned</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-section">
            <tr>
              {['Customer', 'Phone', 'Orders', 'Wallet', 'Joined', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-16 text-text-muted">Loading…</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-text-muted">No customers found</td></tr>
            ) : customers.map(c => (
              <tr key={c._id} className="border-t border-border hover:bg-bg-section/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600 flex-shrink-0">
                      {c.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">{c.name}</p>
                      <p className="text-xs text-text-muted">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-muted">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-text-muted">{c.orderCount ?? '—'}</td>
                <td className="px-4 py-3 text-text-muted">{c.walletBalance ? fmt(c.walletBalance) : '—'}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{new Date(c.createdAt).toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-3">
                  <Badge variant={c.status === 'ACTIVE' ? 'success' : c.status === 'BANNED' ? 'error' : 'warning'}>
                    {c.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => navigate(`/customers/${c._id}`)}
                      className="p-1.5 text-text-muted hover:text-brand-500 transition-colors" title="View profile">
                      <Eye size={14} />
                    </button>
                    {c.status !== 'BANNED' ? (
                      <button onClick={() => setBanModal(c)}
                        className="p-1.5 text-text-muted hover:text-red-500 transition-colors" title="Ban">
                        <Ban size={14} />
                      </button>
                    ) : (
                      <button onClick={() => handleUnban(c)}
                        className="p-1.5 text-text-muted hover:text-green-500 transition-colors text-xs font-semibold">
                        Unban
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination?.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-text-muted">Page {page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-border rounded-lg font-semibold disabled:opacity-40 hover:bg-bg-section transition-colors">← Prev</button>
              <button onClick={() => setPage(p => p+1)} disabled={page >= pagination.pages}
                className="px-3 py-1.5 text-xs border border-border rounded-lg font-semibold disabled:opacity-40 hover:bg-bg-section transition-colors">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {banModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-text-primary mb-1">Ban Customer</h3>
            <p className="text-sm text-text-muted mb-4">Banning <strong>{banModal.name}</strong> will prevent them from placing orders.</p>
            <textarea rows={3} value={banReason} onChange={e => setBanReason(e.target.value)}
              placeholder="Reason for ban…"
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setBanModal(null); setBanReason('') }}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">Cancel</button>
              <button onClick={handleBan} disabled={!banReason.trim() || banLoading}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50">
                {banLoading ? 'Banning…' : 'Ban Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Customer Detail Page ─────────────────────────────────────────────────────
const DETAIL_TABS = [
  { label: 'Overview',          Icon: User },
  { label: 'Orders',            Icon: ShoppingBag },
  { label: 'Wallet',            Icon: Wallet },
  { label: 'Referrals',         Icon: Users },
  { label: 'Student Verify',    Icon: GraduationCap },
  { label: 'Logs',              Icon: FileText },
]

const ORDER_STATUS_COLORS = {
  delivered: 'success', cancelled: 'error', pending: 'warning',
  confirmed: 'warning', preparing: 'warning',
}

export function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [banModal, setBanModal] = useState(false)
  const [banReason, setBanReason] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get(`/admin/customers/${id}/profile`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-20 p-6"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!data) return <div className="p-6 text-center text-text-muted py-20">Customer not found</div>

  const { customer, orders, wallet, subscription, orderStats } = data

  const handleBan = async () => {
    await api.patch(`/admin/users/${id}/ban`, { reason: banReason })
    setBanModal(false)
    setData(d => ({ ...d, customer: { ...d.customer, status: 'BANNED' } }))
  }

  const handleUnban = async () => {
    await api.patch(`/admin/users/${id}/unban`)
    setData(d => ({ ...d, customer: { ...d.customer, status: 'ACTIVE' } }))
  }

  return (
    <div className="p-6">
      {/* Back + header */}
      <button onClick={() => navigate('/customers')} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm mb-5 transition-colors">
        <ChevronLeft size={16} /> Back to Customers
      </button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-2xl font-extrabold text-brand-600">
            {customer.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{customer.name}</h1>
            <p className="text-sm text-text-muted">{customer.email}</p>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 inline-block ${customer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {customer.status}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          {customer.status !== 'BANNED' ? (
            <button onClick={() => setBanModal(true)}
              className="flex items-center gap-2 border border-red-300 text-red-500 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors">
              <Ban size={15} /> Ban
            </button>
          ) : (
            <button onClick={handleUnban}
              className="flex items-center gap-2 border border-green-300 text-green-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-50 transition-colors">
              Unban
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-section border border-border rounded-2xl p-1 mb-5 overflow-x-auto">
        {DETAIL_TABS.map(({ label, Icon }, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${tab === i ? 'bg-bg-card shadow-sm text-brand-600' : 'text-text-muted hover:text-text-primary'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Tab 0 — Overview */}
      {tab === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Orders',    value: orderStats?.total ?? 0 },
              { label: 'Completed',       value: orderStats?.completed ?? 0 },
              { label: 'Cancelled',       value: orderStats?.cancelled ?? 0 },
              { label: 'Total Spent',     value: orderStats?.totalSpent ? fmt(orderStats.totalSpent) : '£0' },
            ].map(s => (
              <div key={s.label} className="bg-bg-card border border-border rounded-2xl p-4 text-center">
                <p className="text-2xl font-extrabold text-text-primary">{s.value}</p>
                <p className="text-xs text-text-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-3">
            {[
              ['Full Name', customer.name],
              ['Email', customer.email],
              ['Phone', customer.phone || '—'],
              ['Joined', new Date(customer.createdAt).toLocaleDateString('en-GB')],
              ['Subscription', subscription ? subscription.planId?.name || 'Active' : 'None'],
              ['Student Verified', customer.isStudentVerified ? 'Yes' : 'No'],
              ['Referral Code', customer.referralCode || '—'],
            ].map(([lbl, val]) => (
              <div key={lbl} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wide">{lbl}</span>
                <span className="text-sm font-semibold text-text-primary">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 1 — Orders */}
      {tab === 1 && (
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-section">
              <tr>
                {['Order', 'Restaurant', 'Total', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(orders || []).length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-text-muted">No orders</td></tr>
              ) : (orders || []).map(o => (
                <tr key={o._id} className="border-t border-border hover:bg-bg-section/40">
                  <td className="px-4 py-3 font-mono text-xs text-brand-600">{o.orderId || o._id.slice(-6)}</td>
                  <td className="px-4 py-3 text-text-primary">{o.restaurantId?.name || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-text-primary">{fmt(o.total)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ORDER_STATUS_COLORS[o.status] || 'neutral'}>{o.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">{new Date(o.createdAt).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2 — Wallet */}
      {tab === 2 && (
        <div className="space-y-4">
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <p className="text-sm text-text-muted mb-1">Current Balance</p>
            <p className="text-4xl font-extrabold text-brand-500">{fmt(wallet?.balance || 0)}</p>
          </div>
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-section">
                <tr>
                  {['Type', 'Description', 'Amount', 'Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(wallet?.transactions || []).length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-text-muted">No transactions</td></tr>
                ) : (wallet?.transactions || []).map((t, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-3 capitalize text-text-muted text-xs">{t.type}</td>
                    <td className="px-4 py-3 text-text-primary">{t.description || '—'}</td>
                    <td className={`px-4 py-3 font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {t.amount >= 0 ? '+' : ''}{fmt(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">{new Date(t.createdAt).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3 — Referrals */}
      {tab === 3 && (
        <div className="bg-bg-card border border-border rounded-2xl p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[['Referral Code', customer.referralCode || '—'], ['Referred Users', '—'], ['Rewards Earned', '—']].map(([l, v]) => (
              <div key={l} className="bg-bg-section rounded-xl p-4 text-center">
                <p className="text-lg font-extrabold text-text-primary">{v}</p>
                <p className="text-xs text-text-muted mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-text-muted text-center">Full referral history from referrals service</p>
        </div>
      )}

      {/* Tab 4 — Student */}
      {tab === 4 && (
        <div className="bg-bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${customer.isStudentVerified ? 'bg-green-100' : 'bg-amber-100'}`}>
              <GraduationCap size={18} className={customer.isStudentVerified ? 'text-green-600' : 'text-amber-600'} />
            </div>
            <div>
              <p className="font-bold text-text-primary">Student Verification</p>
              <p className="text-sm text-text-muted">{customer.isStudentVerified ? 'Verified' : 'Not verified'}</p>
            </div>
          </div>
          {customer.studentEmail && <p className="text-sm text-text-primary">Student email: {customer.studentEmail}</p>}
        </div>
      )}

      {/* Tab 5 — Logs */}
      {tab === 5 && (
        <div className="bg-bg-card border border-border rounded-2xl p-6 text-center text-text-muted py-12">
          <FileText size={28} className="mx-auto mb-3 text-text-muted" />
          <p className="font-semibold text-text-primary mb-1">Activity Logs</p>
          <p className="text-sm">Customer activity logs from audit service</p>
        </div>
      )}

      {/* Ban Modal */}
      {banModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-text-primary mb-1">Ban Customer</h3>
            <p className="text-sm text-text-muted mb-4">This will prevent <strong>{customer.name}</strong> from placing orders.</p>
            <textarea rows={3} value={banReason} onChange={e => setBanReason(e.target.value)}
              placeholder="Reason for ban…"
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setBanModal(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">Cancel</button>
              <button onClick={handleBan} disabled={!banReason.trim()}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50">
                Ban Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomersPage
