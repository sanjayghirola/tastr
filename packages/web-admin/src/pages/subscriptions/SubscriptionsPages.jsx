import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api.js'
import { Button, Input } from '../../components/global/index.jsx'

const STATUS_COLORS = {
  active:    'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  past_due:  'bg-red-100 text-red-600',
  expired:   'bg-orange-100 text-orange-600',
}

// ─── SubscriptionsPage ────────────────────────────────────────────────────────
export default function AdminSubscriptionsPage() {
  const navigate = useNavigate()
  const [data, setData]           = useState([])
  const [breakdown, setBreakdown] = useState([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [status, setStatus]       = useState('')
  const [page, setPage]           = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 30 }
      if (status) params.status = status
      const res = await api.get('/admin/subscriptions', { params })
      setData(res.data.subscriptions)
      setTotal(res.data.total)
      setBreakdown(res.data.breakdown || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, status])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Subscriptions</h1>
          <p className="text-text-muted text-sm mt-1">{total} subscribers</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/subscriptions/plans/new')}>+ New Plan</Button>
      </div>

      {/* Plan breakdown */}
      {breakdown.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {breakdown.map(b => (
            <div key={b._id} className="bg-bg-card border border-border rounded-2xl p-4">
              <p className="text-2xl font-bold text-brand-500">{b.count}</p>
              <p className="text-xs text-text-muted mt-1">{b.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'active', 'cancelled', 'past_due', 'expired'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors
              ${status === s ? 'bg-brand-500 text-white' : 'bg-bg-section text-text-muted hover:text-text-primary'}`}>
            {s.replace('_', ' ') || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-bg-card rounded-2xl overflow-hidden border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-section">
            <tr>
              {['User', 'Plan', 'Start Date', 'Renewal Date', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-text-muted">Loading…</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-text-muted">No subscriptions found</td></tr>
            ) : data.map(s => (
              <tr key={s._id} className="border-t border-border hover:bg-bg-section/50 cursor-pointer"
                onClick={() => navigate(`/subscriptions/${s._id}`)}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-text-primary">{s.userId?.name || '—'}</p>
                  <p className="text-xs text-text-muted">{s.userId?.email}</p>
                </td>
                <td className="px-4 py-3 text-text-primary font-medium">{s.planId?.name || '—'}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{new Date(s.startDate).toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{s.renewalDate ? new Date(s.renewalDate).toLocaleDateString('en-GB') : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${STATUS_COLORS[s.status] || ''}`}>
                    {s.cancelAtPeriodEnd ? 'cancelling' : s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-text-muted">Showing {data.length} of {total}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-3 py-1 rounded-lg text-xs font-semibold border border-border disabled:opacity-40">Prev</button>
            <button onClick={() => setPage(p => p+1)} disabled={data.length < 30}
              className="px-3 py-1 rounded-lg text-xs font-semibold border border-border disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PlanEditorPage ───────────────────────────────────────────────────────────
export function PlanEditorPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', price: '', interval: 'month',
    features: [''], freeDelivery: false, isFeatured: false, isActive: true, sortOrder: 0,
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const setFeature = (i, val) => {
    const fs = [...form.features]
    fs[i] = val
    set('features', fs)
  }
  const addFeature = () => set('features', [...form.features, ''])
  const removeFeature = (i) => set('features', form.features.filter((_, j) => j !== i))

  const handleSave = async () => {
    setLoading(true)
    try {
      const payload = {
        ...form,
        price: Math.round(parseFloat(form.price) * 100),
        features: form.features.filter(Boolean),
      }
      await api.post('/admin/subscriptions/plans', payload)
      setSaved(true)
      setTimeout(() => navigate('/subscriptions'), 1500)
    } finally { setLoading(false) }
  }

  if (saved) return (
    <div className="p-6 text-center">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><polyline points="20 6 9 17 4 12"/></svg></div>
      <p className="font-bold text-text-primary">Plan created! Redirecting…</p>
    </div>
  )

  return (
    <div className="p-6">
      <button onClick={() => navigate('/subscriptions')} className="text-brand-500 text-sm font-semibold mb-6">← Back</button>
      <h1 className="text-2xl font-bold text-text-primary mb-6">New Subscription Plan</h1>

      <div className="bg-bg-card rounded-2xl p-6 space-y-5 border border-border">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-semibold text-text-primary mb-1 block">Plan Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Tastr Plus"
              className="tastr-input w-full py-3 px-4 text-sm border border-border rounded-[10px] focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1 block">Price (£)</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)}
              placeholder="9.99"
              className="tastr-input w-full py-3 px-4 text-sm border border-border rounded-[10px] focus:border-brand-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1 block">Billing Interval</label>
            <select value={form.interval} onChange={e => set('interval', e.target.value)}
              className="tastr-input w-full py-3 px-4 text-sm border border-border rounded-[10px] focus:border-brand-500 focus:outline-none bg-white">
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-text-primary mb-2 block">Features</label>
          <div className="space-y-2">
            {form.features.map((f, i) => (
              <div key={i} className="flex gap-2">
                <input value={f} onChange={e => setFeature(i, e.target.value)} placeholder={`Feature ${i+1}`}
                  className="flex-1 tastr-input py-2.5 px-3 text-sm border border-border rounded-xl focus:border-brand-500 focus:outline-none" />
                <button onClick={() => removeFeature(i)} className="text-red-400 hover:text-red-600 px-2">✕</button>
              </div>
            ))}
            <button onClick={addFeature} className="text-brand-500 text-sm font-semibold">+ Add feature</button>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          {[
            ['freeDelivery', 'Free delivery on all orders'],
            ['isFeatured',   'Mark as featured (highlighted)'],
            ['isActive',     'Active (visible to customers)'],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-text-primary">{label}</span>
              <button onClick={() => set(key, !form[key])}
                className={`w-12 h-6 rounded-full transition-colors relative ${form[key] ? 'bg-brand-500' : 'bg-border'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${form[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>

        <Button variant="primary" size="full" loading={loading} onClick={handleSave}
          disabled={!form.name || !form.price}>
          Create Plan
        </Button>
      </div>
    </div>
  )
}
