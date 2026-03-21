import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Search, Eye, CheckCircle2, XCircle, FileText,
  Truck, Star, Package, DollarSign, ChevronLeft,
  MapPin, Phone, User, Activity, BadgeCheck, AlertTriangle,
  Plus, X, UserPlus
} from 'lucide-react'
import { Badge } from '../../components/global/index.jsx'
import api from '../../services/api.js'

const fmt = p => `£${((p || 0) / 100).toFixed(2)}`
const VEHICLE_ICONS = { bicycle: '🚲', motorbike: '🏍', car: '🚗', van: '🚐' }
const STATUS_VARIANT = { active: 'success', pending: 'warning', rejected: 'error', suspended: 'neutral', request_docs: 'warning' }
const inputCls = 'w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20 bg-bg-section placeholder:text-text-muted transition-colors'

function Field({ label, required, hint, children, error }) {
  return (
    <div>
      <label className="text-sm font-semibold text-text-primary mb-1.5 block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-text-muted font-normal ml-1.5 text-xs">({hint})</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function AddDriverModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    vehicleType: 'bicycle', vehiclePlate: '',
    nationalInsuranceNumber: '', licenceNumber: '',
    // Enhanced: full address
    addressLine1: '', addressLine2: '', city: '', postcode: '', county: '',
    // Enhanced: Right to Work
    dateOfBirth: '', rightToWorkShareCode: '',
    // Enhanced: Bank details
    bankAccountHolder: '', bankSortCode: '', bankAccountNumber: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) {
      setError('Name, email, phone and password are required'); return
    }
    setLoading(true); setError('')
    try {
      await api.post('/admin/drivers/create', form)
      onSuccess()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create driver')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-bg-card rounded-3xl border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-7 py-5 border-b border-border sticky top-0 bg-bg-card rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
              <UserPlus size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Add New Driver</h2>
              <p className="text-xs text-text-muted">Create a driver account manually</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-section rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-7 space-y-6">
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Personal Information</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" required>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. James Wilson" className={inputCls} />
              </Field>
              <Field label="Email Address" required>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="driver@example.com" className={inputCls} />
              </Field>
              <Field label="Phone Number" required>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+44 7700 000000" className={inputCls} />
              </Field>
              <Field label="Password" required hint="min 8 chars">
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Temporary password" className={inputCls} />
              </Field>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Vehicle Details</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Vehicle Type" required>
                <select value={form.vehicleType} onChange={e => set('vehicleType', e.target.value)} className={inputCls}>
                  <option value="bicycle">🚲 Bicycle</option>
                  <option value="motorbike">🏍 Motorbike</option>
                  <option value="car">🚗 Car</option>
                  <option value="van">🚐 Van</option>
                </select>
              </Field>
              <Field label="Vehicle Plate">
                <input value={form.vehiclePlate} onChange={e => set('vehiclePlate', e.target.value.toUpperCase())} placeholder="e.g. AB12 CDE" className={inputCls} />
              </Field>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Identity & Compliance</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="NI Number">
                <input value={form.nationalInsuranceNumber} onChange={e => set('nationalInsuranceNumber', e.target.value.toUpperCase())} placeholder="e.g. QQ 12 34 56 C" className={inputCls} />
              </Field>
              <Field label="Licence Number">
                <input value={form.licenceNumber} onChange={e => set('licenceNumber', e.target.value)} placeholder="Driving licence number" className={inputCls} />
              </Field>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Full Address</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Address Line 1" required>
                  <input value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} placeholder="e.g. 42 High Street" className={inputCls} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Address Line 2">
                  <input value={form.addressLine2} onChange={e => set('addressLine2', e.target.value)} placeholder="e.g. Flat 3" className={inputCls} />
                </Field>
              </div>
              <Field label="City" required>
                <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. London" className={inputCls} />
              </Field>
              <Field label="Postcode" required>
                <input value={form.postcode} onChange={e => set('postcode', e.target.value)} placeholder="e.g. EC1A 1BB" className={inputCls} />
              </Field>
              <Field label="County">
                <input value={form.county} onChange={e => set('county', e.target.value)} placeholder="e.g. Greater London" className={inputCls} />
              </Field>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Right to Work Verification</p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-blue-700">Share code is verified via UK Visas & Immigration. Date of birth is required for the check.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date of Birth" required>
                <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Right to Work Share Code" hint="9 characters from gov.uk">
                <input value={form.rightToWorkShareCode} onChange={e => set('rightToWorkShareCode', e.target.value.toUpperCase())} placeholder="e.g. A1B2C3D4E" maxLength={9} className={inputCls} />
              </Field>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Bank Details</p>
            <p className="text-xs text-text-muted mb-3">Used for weekly earnings payouts</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Account Holder Name" required>
                  <input value={form.bankAccountHolder} onChange={e => set('bankAccountHolder', e.target.value)} placeholder="e.g. James Wilson" className={inputCls} />
                </Field>
              </div>
              <Field label="Sort Code" required>
                <input value={form.bankSortCode} onChange={e => set('bankSortCode', e.target.value)} placeholder="e.g. 20-30-40" className={inputCls} />
              </Field>
              <Field label="Account Number" required>
                <input value={form.bankAccountNumber} onChange={e => set('bankAccountNumber', e.target.value)} placeholder="e.g. 12345678" className={inputCls} />
              </Field>
            </div>
          </div>

          {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-border text-text-primary font-bold py-3 rounded-xl text-sm hover:bg-bg-section transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 bg-brand-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</> : <><UserPlus size={15} /> Create Driver</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Drivers List Page ─────────────────────────────────────────────────────────
export function DriversPage() {
  const navigate = useNavigate()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, limit: 30 }
      if (q) params.q = q
      if (statusFilter) params.status = statusFilter
      const res = await api.get('/admin/drivers-all', { params })
      setDrivers(res.data.drivers || [])
      setPagination(res.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load(page) }, [page, q, statusFilter])

  return (
    <div className="p-6 space-y-5">
      {showAddModal && (
        <AddDriverModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); load(1) }} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Drivers</h1>
          <p className="text-sm text-text-muted mt-0.5">{pagination?.total ?? 0} registered</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors shadow-sm">
          <Plus size={16} /> Add Driver
        </button>
      </div>

      <div className="flex flex-wrap gap-3 p-4 bg-bg-card rounded-2xl border border-border">
        <div className="flex items-center gap-2 flex-1 min-w-48 border border-border rounded-xl px-3 py-2 bg-bg-section">
          <Search size={14} className="text-text-muted flex-shrink-0" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }}
            placeholder="Search name, email…"
            className="bg-transparent text-sm focus:outline-none flex-1 placeholder:text-text-muted" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="text-sm border border-border rounded-xl px-3 py-2 focus:outline-none bg-bg-card">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-section">
            <tr>
              {['Driver', 'Vehicle', 'NI Number', 'Deliveries', 'Rating', 'Online', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-16 text-text-muted">Loading…</td></tr>
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <Truck size={32} className="mx-auto text-text-muted mb-3 opacity-40" />
                  <p className="text-text-muted text-sm">No drivers found</p>
                  <button onClick={() => setShowAddModal(true)} className="mt-3 text-brand-500 text-sm font-semibold hover:text-brand-600 transition-colors">
                    + Add your first driver
                  </button>
                </td>
              </tr>
            ) : drivers.map(d => (
              <tr key={d._id} className="border-t border-border hover:bg-bg-section/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                      {(d.userId?.name || d.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">{d.userId?.name || d.name || '—'}</p>
                      <p className="text-xs text-text-muted">{d.userId?.email || d.email || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-primary">
                  <span className="mr-1">{VEHICLE_ICONS[d.vehicleType] || '🚲'}</span>
                  <span className="capitalize text-sm">{d.vehicleType || 'bicycle'}</span>
                </td>
                <td className="px-4 py-3 text-text-muted font-mono text-xs">{d.nationalInsuranceNumber || '—'}</td>
                <td className="px-4 py-3 text-text-muted">{d.totalDeliveries || 0}</td>
                <td className="px-4 py-3">
                  {d.avgRating > 0 ? (
                    <span className="flex items-center gap-1 text-amber-500 font-semibold text-sm">
                      <Star size={13} fill="currentColor" />{d.avgRating.toFixed(1)}
                    </span>
                  ) : <span className="text-text-muted">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`w-2 h-2 rounded-full inline-block ${d.isOnline ? 'bg-green-500' : 'bg-border'}`} />
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[d.status?.toLowerCase()] || 'neutral'}>{d.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/drivers/${d._id}`)} className="p-1.5 text-text-muted hover:text-brand-500 transition-colors">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination?.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-text-muted">Page {page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-border rounded-lg font-semibold disabled:opacity-40 hover:bg-bg-section">← Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}
                className="px-3 py-1.5 text-xs border border-border rounded-lg font-semibold disabled:opacity-40 hover:bg-bg-section">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Driver Detail Page ────────────────────────────────────────────────────────
const DETAIL_TABS = [
  { label: 'Overview',   Icon: User },
  { label: 'Deliveries', Icon: Package },
  { label: 'Earnings',   Icon: DollarSign },
  { label: 'Documents',  Icon: FileText },
  { label: 'Activity',   Icon: Activity },
]

export function DriverDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [driver, setDriver] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`/admin/drivers/${id}/profile`)
      .then(r => { setDriver(r.data.driver); setDeliveries(r.data.deliveries || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleStatus = async (status, reason = '') => {
    setActionLoading(true)
    try {
      await api.patch(`/admin/drivers/${id}/status`, { status, reason })
      setDriver(d => ({ ...d, status }))
    } catch (e) { alert(e.response?.data?.message || 'Failed') }
    finally { setActionLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-20 p-6"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!driver) return <div className="p-6 text-center text-text-muted py-20">Driver not found</div>

  const earnings = deliveries.reduce((s, d) => s + (d.driverEarnings || 0), 0)

  return (
    <div className="p-6">
      <button onClick={() => navigate('/drivers')} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm mb-5 transition-colors">
        <ChevronLeft size={16} /> Back to Drivers
      </button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl font-extrabold text-blue-600">
            {(driver.userId?.name || '?')[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{driver.userId?.name || '—'}</h1>
            <p className="text-sm text-text-muted">{driver.userId?.email || '—'}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={STATUS_VARIANT[driver.status?.toLowerCase()] || 'neutral'}>{driver.status}</Badge>
              {driver.isOnline && <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">Online</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {driver.status !== 'active' && (
            <button onClick={() => handleStatus('active')} disabled={actionLoading}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 transition-colors disabled:opacity-50">
              <CheckCircle2 size={15} /> Approve
            </button>
          )}
          {driver.status === 'active' && (
            <button onClick={() => { const r = prompt('Reason for suspension?'); if (r) handleStatus('suspended', r) }}
              disabled={actionLoading}
              className="flex items-center gap-2 border border-amber-300 text-amber-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-50 transition-colors disabled:opacity-50">
              Suspend
            </button>
          )}
          {driver.status !== 'rejected' && driver.status !== 'active' && (
            <button onClick={() => { const r = prompt('Reason for rejection?'); if (r) handleStatus('rejected', r) }}
              disabled={actionLoading}
              className="flex items-center gap-2 border border-red-300 text-red-500 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-50">
              <XCircle size={15} /> Reject
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Deliveries', value: driver.totalDeliveries || 0, Icon: Truck, color: 'bg-blue-500' },
          { label: 'Avg Rating', value: driver.avgRating > 0 ? `★ ${driver.avgRating.toFixed(1)}` : '—', Icon: Star, color: 'bg-amber-500' },
          { label: 'Total Earnings', value: fmt(earnings), Icon: DollarSign, color: 'bg-green-500' },
        ].map(s => (
          <div key={s.label} className="bg-bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.Icon size={15} className="text-white" />
              </div>
              <p className="text-xs text-text-muted">{s.label}</p>
            </div>
            <p className="text-2xl font-extrabold text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-bg-section border border-border rounded-2xl p-1 mb-5 overflow-x-auto">
        {DETAIL_TABS.map(({ label, Icon }, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${tab === i ? 'bg-bg-card shadow-sm text-brand-600' : 'text-text-muted hover:text-text-primary'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Account</p>
            {[['Name', driver.userId?.name || '—'],['Email', driver.userId?.email || '—'],['Phone', driver.userId?.phone || '—'],['Joined', driver.createdAt ? new Date(driver.createdAt).toLocaleDateString('en-GB') : '—']].map(([l, v]) => (
              <div key={l} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wide">{l}</span>
                <span className="text-sm font-semibold text-text-primary">{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Vehicle & Compliance</p>
            {[['Vehicle Type', driver.vehicleType ? `${VEHICLE_ICONS[driver.vehicleType]} ${driver.vehicleType}` : '—'],['Vehicle Plate', driver.vehiclePlate || '—'],['NI Number', driver.nationalInsuranceNumber || '—'],['Licence Number', driver.licenceNumber || '—']].map(([l, v]) => (
              <div key={l} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wide">{l}</span>
                <span className="text-sm font-semibold text-text-primary">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-section">
              <tr>{['Order', 'Restaurant', 'Total', 'Rating', 'Date'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-text-muted">No deliveries</td></tr>
              ) : deliveries.map(d => (
                <tr key={d._id} className="border-t border-border hover:bg-bg-section/40">
                  <td className="px-4 py-3 font-mono text-xs text-brand-600">{d.orderId || d._id.slice(-6)}</td>
                  <td className="px-4 py-3 text-text-primary">{d.restaurantId?.name || '—'}</td>
                  <td className="px-4 py-3 font-semibold">{fmt(d.total)}</td>
                  <td className="px-4 py-3">{d.driverRating ? <span className="text-amber-500">★ {d.driverRating}</span> : '—'}</td>
                  <td className="px-4 py-3 text-text-muted text-xs">{new Date(d.createdAt).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[{ label: 'Total Earned', value: fmt(earnings) },{ label: 'This Month', value: '—' },{ label: 'Avg per Delivery', value: deliveries.length > 0 ? fmt(earnings / deliveries.length) : '—' }].map(s => (
              <div key={s.label} className="bg-bg-card border border-border rounded-2xl p-4 text-center">
                <p className="text-2xl font-extrabold text-text-primary">{s.value}</p>
                <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-bg-card border border-border rounded-2xl p-5 text-center py-10">
            <DollarSign size={28} className="mx-auto mb-2 text-text-muted" />
            <p className="text-sm text-text-muted">Detailed earnings breakdown from payouts service</p>
          </div>
        </div>
      )}

      {tab === 3 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Driving Licence', url: driver.licenceDocUrl, status: driver.licenceDocUrl ? 'uploaded' : 'missing' },
            { label: 'Insurance', url: driver.insuranceDocUrl, status: driver.insuranceDocUrl ? 'uploaded' : 'missing' },
            { label: 'Address Proof', url: driver.addressProofUrl, status: driver.addressProofUrl ? 'uploaded' : 'missing' },
          ].map(doc => (
            <div key={doc.label} className="bg-bg-card border border-border rounded-2xl p-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${doc.status === 'uploaded' ? 'bg-green-100' : 'bg-amber-100'}`}>
                <FileText size={20} className={doc.status === 'uploaded' ? 'text-green-600' : 'text-amber-600'} />
              </div>
              <p className="font-semibold text-text-primary mb-1">{doc.label}</p>
              <p className={`text-xs mb-4 ${doc.status === 'uploaded' ? 'text-green-600' : 'text-amber-600'}`}>
                {doc.status === 'uploaded' ? '✓ Uploaded' : '⚠ Not uploaded'}
              </p>
              {doc.url && (
                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="block text-center px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
                  View
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 4 && (
        <div className="bg-bg-card border border-border rounded-2xl p-6 text-center py-12">
          <Activity size={28} className="mx-auto mb-2 text-text-muted" />
          <p className="font-semibold text-text-primary mb-1">Activity Log</p>
          <p className="text-sm text-text-muted">Driver activity from audit log service</p>
        </div>
      )}
    </div>
  )
}

export default DriversPage
