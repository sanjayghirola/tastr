import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Tag, Image, Bell, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  RefreshCw, Copy, ChevronRight, Calendar, Send, Users
} from 'lucide-react'
import api from '../../services/api.js'

const fmt = p => `£${(p / 100).toFixed(2)}`
const TABS = ['Promo Codes', 'Banners', 'Notifications']

// ─── Promo Codes Tab ──────────────────────────────────────────────────────────
function PromoTab() {
  const navigate = useNavigate()
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ show: false, editing: null })

  const load = async () => {
    try {
      const r = await api.get('/promos')
      setPromos(r.data.promos || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (promo) => {
    try {
      await api.put(`/promos/${promo._id}`, { isActive: !promo.isActive })
      setPromos(p => p.map(pr => pr._id === promo._id ? { ...pr, isActive: !pr.isActive } : pr))
    } catch {}
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this promo code?')) return
    await api.delete(`/promos/${id}`)
    setPromos(p => p.filter(pr => pr._id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{promos.length} promo code{promos.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setForm({ show: true, editing: null })}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
          <Plus size={15} /> Create Promo
        </button>
      </div>

      {loading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        : promos.length === 0 ? (
          <div className="bg-bg-section border border-dashed border-border rounded-2xl p-10 text-center">
            <Tag size={28} className="text-text-muted mx-auto mb-3" />
            <p className="font-semibold text-text-primary mb-1">No promo codes yet</p>
            <p className="text-text-muted text-sm">Create codes to attract and reward customers.</p>
          </div>
        ) : (
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-section">
                <tr>
                  {['Code', 'Type', 'Value', 'Min Order', 'Uses', 'Expires', 'Active', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {promos.map(p => (
                  <tr key={p._id} className="border-t border-border hover:bg-bg-section/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">{p.code}</code>
                        <button onClick={() => navigator.clipboard.writeText(p.code)} className="text-text-muted hover:text-brand-500 transition-colors"><Copy size={13} /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted capitalize">{p.type}</td>
                    <td className="px-4 py-3 font-semibold text-text-primary">
                      {p.type === 'percent' ? `${p.value}%` : p.type === 'fixed' ? fmt(p.value) : 'Free delivery'}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{p.minOrderAmount > 0 ? fmt(p.minOrderAmount) : '—'}</td>
                    <td className="px-4 py-3 text-text-muted">{p.usedCount}/{p.maxUses || '∞'}</td>
                    <td className="px-4 py-3 text-text-muted text-xs">{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('en-GB') : '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggle(p)}>
                        {p.isActive ? <ToggleRight size={22} className="text-brand-500" /> : <ToggleLeft size={22} className="text-text-muted" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setForm({ show: true, editing: p })} className="p-1.5 text-text-muted hover:text-brand-500 transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(p._id)} className="p-1.5 text-text-muted hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {form.show && <PromoFormModal promo={form.editing} onSave={() => { load(); setForm({ show: false, editing: null }) }} onClose={() => setForm({ show: false, editing: null })} />}
    </div>
  )
}

// ─── Promo Form Modal ─────────────────────────────────────────────────────────
function PromoFormModal({ promo, onSave, onClose }) {
  const genCode = () => Math.random().toString(36).slice(2, 10).toUpperCase()
  const [f, setF] = useState({
    code: promo?.code || genCode(),
    type: promo?.type || 'percent',
    value: promo?.value || '',
    minOrderAmount: promo?.minOrderAmount || 0,
    maxUses: promo?.maxUses || '',
    newUsersOnly: promo?.newUsersOnly || false,
    studentOnly: promo?.studentOnly || false,
    expiresAt: promo?.expiresAt ? promo.expiresAt.slice(0, 10) : '',
    isActive: promo?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setF(s => ({ ...s, [k]: v }))

  const discountPreview = () => {
    if (!f.value) return null
    const basket = 1500 // £15 example
    if (f.type === 'percent') return `On a £15 order: save ${fmt(Math.round(basket * f.value / 100))}`
    if (f.type === 'fixed') return `Save ${fmt(f.value)} on any qualifying order`
    return 'Free delivery on qualifying orders'
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...f, value: Number(f.value), minOrderAmount: Number(f.minOrderAmount) * 100, maxUses: f.maxUses ? Number(f.maxUses) : null }
      if (f.type !== 'percent') delete payload.maxDiscountPence
      if (promo) await api.put(`/promos/${promo._id}`, payload)
      else await api.post('/promos', payload)
      onSave()
    } catch (e) { alert(e.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const inputCls = "w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-bg-card rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary">{promo ? 'Edit Promo' : 'Create Promo Code'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><Plus size={18} className="rotate-45" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Code */}
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Code</label>
            <div className="flex gap-2">
              <input value={f.code} onChange={e => set('code', e.target.value.toUpperCase())} className={inputCls + ' flex-1 font-mono'} />
              <button onClick={() => set('code', genCode())} className="px-3 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors flex items-center gap-1.5">
                <RefreshCw size={13} /> Generate
              </button>
            </div>
          </div>
          {/* Type & Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">Type</label>
              <select value={f.type} onChange={e => set('type', e.target.value)} className={inputCls}>
                <option value="percent">Percentage %</option>
                <option value="fixed">Fixed £</option>
                <option value="free_delivery">Free Delivery</option>
              </select>
            </div>
            {f.type !== 'free_delivery' && (
              <div>
                <label className="text-sm font-semibold text-text-primary mb-1.5 block">
                  Value {f.type === 'percent' ? '(%)' : '(pence)'}
                </label>
                <input type="number" value={f.value} onChange={e => set('value', e.target.value)} className={inputCls} placeholder={f.type === 'percent' ? '10' : '500'} />
              </div>
            )}
          </div>
          {/* Min order / Max uses */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">Min Order (£)</label>
              <input type="number" value={f.minOrderAmount} onChange={e => set('minOrderAmount', e.target.value)} className={inputCls} placeholder="0.00" step="0.01" />
            </div>
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">Max Uses</label>
              <input type="number" value={f.maxUses} onChange={e => set('maxUses', e.target.value)} className={inputCls} placeholder="Unlimited" />
            </div>
          </div>
          {/* Expires */}
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Expiry Date</label>
            <input type="date" value={f.expiresAt} onChange={e => set('expiresAt', e.target.value)} className={inputCls} />
          </div>
          {/* Eligibility */}
          <div>
            <p className="text-sm font-semibold text-text-primary mb-2">Eligibility</p>
            <div className="space-y-2">
              {[['newUsersOnly', 'New users only'], ['studentOnly', 'Student users only']].map(([k, lbl]) => (
                <label key={k} className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => set(k, !f[k])}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${f[k] ? 'bg-brand-500 border-brand-500' : 'border-border bg-bg-card'}`}>
                    {f[k] && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span className="text-sm text-text-primary">{lbl}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Preview */}
          {discountPreview() && (
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-sm text-brand-700 font-medium">
              {discountPreview()}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : promo ? 'Save Changes' : 'Create Promo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Banners Tab ──────────────────────────────────────────────────────────────
function BannersTab() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = () => api.get('/banners').then(r => setBanners(r.data.banners || [])).catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete banner?')) return
    await api.delete(`/banners/${id}`)
    setBanners(b => b.filter(x => x._id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{banners.length} banner{banners.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
          <Plus size={15} /> Create Banner
        </button>
      </div>
      {loading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        : banners.length === 0 ? (
          <div className="bg-bg-section border border-dashed border-border rounded-2xl p-10 text-center">
            <Image size={28} className="text-text-muted mx-auto mb-3" />
            <p className="font-semibold text-text-primary mb-1">No banners yet</p>
            <p className="text-text-muted text-sm">Create a banner to promote offers to customers.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {banners.map(b => (
              <div key={b._id} className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="w-24 h-14 rounded-xl overflow-hidden bg-bg-section flex-shrink-0">
                  {b.imageUrl ? <img src={b.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Image size={20} className="text-text-muted" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary truncate">{b.title}</p>
                  <p className="text-xs text-text-muted">{b.type} · {b.isActive ? 'Active' : 'Inactive'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(b._id)} className="p-2 text-text-muted hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      {showCreate && <BannerFormModal onSave={() => { load(); setShowCreate(false) }} onClose={() => setShowCreate(false)} />}
    </div>
  )
}

// ─── Banner Form Modal ────────────────────────────────────────────────────────
function BannerFormModal({ onSave, onClose }) {
  const [f, setF] = useState({ title: '', type: 'hero', isActive: true, linkType: 'none', linkValue: '' })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setPreview(URL.createObjectURL(f)) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(f).forEach(([k, v]) => fd.append(k, v))
      if (file) fd.append('image', file)
      await api.post('/banners', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onSave()
    } catch (e) { alert(e.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const inputCls = "w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-bg-card rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary">Create Banner</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><Plus size={18} className="rotate-45" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Title</label>
            <input value={f.title} onChange={e => setF(s => ({ ...s, title: e.target.value }))} className={inputCls} placeholder="Banner title" />
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Type</label>
            <select value={f.type} onChange={e => setF(s => ({ ...s, type: e.target.value }))} className={inputCls}>
              <option value="hero">Hero Banner</option>
              <option value="promo">Promo Banner</option>
              <option value="gift">Gift Card</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Image</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-5 cursor-pointer hover:border-brand-400 transition-colors overflow-hidden">
              {preview ? <img src={preview} alt="" className="w-full h-32 object-cover rounded-lg" />
                : <><Image size={22} className="text-text-muted mb-2" /><span className="text-sm text-text-muted">Click to upload</span></>}
              <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
            </label>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!f.title || saving} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Create Banner'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab() {
  const [blasts, setBlasts] = useState([])
  const [showCompose, setShowCompose] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => api.get('/notifications/blasts').then(r => setBlasts(r.data.blasts || [])).catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{blasts.length} blast{blasts.length !== 1 ? 's' : ''} sent</p>
        <button onClick={() => setShowCompose(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
          <Send size={15} /> Send Blast
        </button>
      </div>
      {loading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        : blasts.length === 0 ? (
          <div className="bg-bg-section border border-dashed border-border rounded-2xl p-10 text-center">
            <Bell size={28} className="text-text-muted mx-auto mb-3" />
            <p className="font-semibold text-text-primary mb-1">No notifications sent yet</p>
            <p className="text-text-muted text-sm">Send a push notification to your customers.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {blasts.map(b => (
              <div key={b._id} className="bg-bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-text-primary">{b.title}</p>
                    <p className="text-sm text-text-muted mt-0.5">{b.body}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-3 ${b.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{b.status}</span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                  <span className="flex items-center gap-1.5"><Users size={12}/>{b.recipientCount} recipients</span>
                  <span className="flex items-center gap-1.5"><Calendar size={12}/>{new Date(b.createdAt).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      {showCompose && <NotifComposeModal onSave={() => { load(); setShowCompose(false) }} onClose={() => setShowCompose(false)} />}
    </div>
  )
}

// ─── Notification Compose Modal ───────────────────────────────────────────────
function NotifComposeModal({ onSave, onClose }) {
  const [f, setF] = useState({ title: '', body: '', segment: 'all', scheduledAt: '' })
  const [saving, setSaving] = useState(false)

  const titleRemaining = 50 - f.title.length
  const bodyRemaining = 150 - f.body.length

  const handleSend = async () => {
    setSaving(true)
    try {
      await api.post('/notifications/blast', f)
      onSave()
    } catch (e) { alert(e.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const inputCls = "w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-bg-card rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary">Send Notification</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><Plus size={18} className="rotate-45" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-text-primary">Title</label>
              <span className={`text-xs ${titleRemaining < 10 ? 'text-red-500' : 'text-text-muted'}`}>{titleRemaining}</span>
            </div>
            <input value={f.title} onChange={e => setF(s => ({ ...s, title: e.target.value.slice(0, 50) }))} className={inputCls} placeholder="Notification title" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-text-primary">Message</label>
              <span className={`text-xs ${bodyRemaining < 20 ? 'text-red-500' : 'text-text-muted'}`}>{bodyRemaining}</span>
            </div>
            <textarea value={f.body} onChange={e => setF(s => ({ ...s, body: e.target.value.slice(0, 150) }))} rows={3} className={inputCls + ' resize-none'} placeholder="Your message to customers…" />
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Target Audience</label>
            <select value={f.segment} onChange={e => setF(s => ({ ...s, segment: e.target.value }))} className={inputCls}>
              <option value="all">All Customers</option>
              <option value="students">Student Customers</option>
              <option value="tastr_plus">Tastr+ Subscribers</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Schedule (optional)</label>
            <input type="datetime-local" value={f.scheduledAt} onChange={e => setF(s => ({ ...s, scheduledAt: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">Cancel</button>
          <button onClick={handleSend} disabled={!f.title || !f.body || saving}
            className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <Send size={14} /> {saving ? 'Sending…' : f.scheduledAt ? 'Schedule' : 'Send Now'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Marketing Page ───────────────────────────────────────────────────────────
export default function MarketingPage() {
  const [tab, setTab] = useState(0)

  const ICONS = [Tag, Image, Bell]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Marketing</h1>
        <p className="text-text-muted text-sm mt-0.5">Manage promotions, banners, and customer notifications</p>
      </div>

      <div className="flex gap-1 bg-bg-section border border-border rounded-2xl p-1">
        {TABS.map((t, i) => {
          const Icon = ICONS[i]
          return (
            <button key={i} onClick={() => setTab(i)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === i ? 'bg-bg-card shadow-sm text-brand-600' : 'text-text-muted hover:text-text-primary'}`}>
              <Icon size={15} />{t}
            </button>
          )
        })}
      </div>

      {tab === 0 && <PromoTab />}
      {tab === 1 && <BannersTab />}
      {tab === 2 && <NotificationsTab />}
    </div>
  )
}
