import { useEffect, useState } from 'react'
import {
  Tag, Image, Bell, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  RefreshCw, Copy, Send, Users, Calendar, Download, Search, Eye
} from 'lucide-react'
import api from '../../services/api.js'

const fmt = p => `£${(p / 100).toFixed(2)}`
const MAIN_TABS = ['Promo Codes', 'Banners', 'Notification Blasts']
const MAIN_ICONS = [Tag, Image, Bell]

// ─── Promo Codes Panel ────────────────────────────────────────────────────────
function PromoPanel() {
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | promoObj
  const [q, setQ] = useState('')

  const load = () => api.get('/admin/promos').then(r => setPromos(r.data.promos || [])).catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleToggle = async (p) => {
    await api.put(`/promos/${p._id}`, { isActive: !p.isActive })
    setPromos(prev => prev.map(pr => pr._id === p._id ? { ...pr, isActive: !pr.isActive } : pr))
  }
  const handleDelete = async (id) => {
    if (!confirm('Delete this promo?')) return
    await api.delete(`/promos/${id}`)
    setPromos(p => p.filter(pr => pr._id !== id))
  }

  const filtered = promos.filter(p => !q || p.code.includes(q.toUpperCase()) || p.description?.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-bg-section w-64">
          <Search size={14} className="text-text-muted flex-shrink-0" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search code…"
            className="bg-transparent text-sm focus:outline-none flex-1 placeholder:text-text-muted" />
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
          <Plus size={15} /> Create Promo
        </button>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-section">
            <tr>
              {['Code', 'Type', 'Value', 'Min Order', 'Uses', 'Restaurant', 'Expires', 'Active', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} className="text-center py-12 text-text-muted">Loading…</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={9} className="text-center py-12 text-text-muted">No promos found</td></tr>
              : filtered.map(p => (
              <tr key={p._id} className="border-t border-border hover:bg-bg-section/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded text-xs">{p.code}</code>
                    <button onClick={() => navigator.clipboard.writeText(p.code)} className="text-text-muted hover:text-brand-500"><Copy size={12} /></button>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-muted capitalize text-xs">{p.type}</td>
                <td className="px-4 py-3 font-semibold">{p.type === 'percent' ? `${p.value}%` : p.type === 'fixed' ? fmt(p.value) : 'Free del.'}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{p.minOrderAmount > 0 ? fmt(p.minOrderAmount) : '—'}</td>
                <td className="px-4 py-3 text-text-muted">{p.usedCount}/{p.maxUses || '∞'}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{p.restaurantId ? p.restaurantId.name || 'Specific' : 'All'}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('en-GB') : '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(p)}>
                    {p.isActive ? <ToggleRight size={22} className="text-brand-500" /> : <ToggleLeft size={22} className="text-text-muted" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setModal(p)} className="p-1.5 text-text-muted hover:text-brand-500 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(p._id)} className="p-1.5 text-text-muted hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <PromoModal promo={modal === 'create' ? null : modal}
          onSave={() => { load(); setModal(null) }}
          onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ─── Promo Modal ──────────────────────────────────────────────────────────────
function PromoModal({ promo, onSave, onClose }) {
  const gen = () => 'TASTR' + Math.random().toString(36).slice(2, 7).toUpperCase()
  const [f, setF] = useState({
    code: promo?.code || gen(), type: promo?.type || 'percent',
    value: promo?.value || '', minOrderAmount: promo?.minOrderAmount ? promo.minOrderAmount / 100 : 0,
    maxUses: promo?.maxUses || '', newUsersOnly: promo?.newUsersOnly || false,
    studentOnly: promo?.studentOnly || false, expiresAt: promo?.expiresAt?.slice(0, 10) || '',
    description: promo?.description || '', isActive: promo?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setF(s => ({ ...s, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...f, value: Number(f.value),
        minOrderAmount: Math.round(Number(f.minOrderAmount) * 100),
        maxUses: f.maxUses ? Number(f.maxUses) : null,
      }
      if (promo) await api.put(`/promos/${promo._id}`, payload)
      else await api.post('/promos', payload)
      onSave()
    } catch (e) { alert(e.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const inp = "w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-bg-card rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-bg-card z-10">
          <h2 className="text-lg font-bold text-text-primary">{promo ? 'Edit Promo Code' : 'Create Promo Code'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg-section flex items-center justify-center text-text-muted hover:text-text-primary">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Code</label>
            <div className="flex gap-2">
              <input value={f.code} onChange={e => set('code', e.target.value.toUpperCase())} className={inp + ' flex-1 font-mono'} />
              <button onClick={() => set('code', gen())} className="px-3 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section flex items-center gap-1.5">
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Description</label>
            <input value={f.description} onChange={e => set('description', e.target.value)} className={inp} placeholder="Internal description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">Type</label>
              <select value={f.type} onChange={e => set('type', e.target.value)} className={inp}>
                <option value="percent">Percentage %</option>
                <option value="fixed">Fixed £</option>
                <option value="free_delivery">Free Delivery</option>
              </select>
            </div>
            {f.type !== 'free_delivery' && (
              <div>
                <label className="text-sm font-semibold text-text-primary mb-1.5 block">Value {f.type === 'percent' ? '(%)' : '(£ pence)'}</label>
                <input type="number" value={f.value} onChange={e => set('value', e.target.value)} className={inp} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">Min Order (£)</label>
              <input type="number" step="0.01" value={f.minOrderAmount} onChange={e => set('minOrderAmount', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">Max Uses</label>
              <input type="number" value={f.maxUses} onChange={e => set('maxUses', e.target.value)} className={inp} placeholder="Unlimited" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Expiry Date</label>
            <input type="date" value={f.expiresAt} onChange={e => set('expiresAt', e.target.value)} className={inp} />
          </div>
          <div className="space-y-2">
            {[['newUsersOnly', 'New users only'], ['studentOnly', 'Student users only']].map(([k, lbl]) => (
              <label key={k} className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-bg-section">
                <div onClick={() => set(k, !f[k])}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${f[k] ? 'bg-brand-500 border-brand-500' : 'border-border'}`}>
                  {f[k] && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
                <span className="text-sm text-text-primary">{lbl}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section">Cancel</button>
          <button onClick={handleSave} disabled={saving || !f.code}
            className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-50">
            {saving ? 'Saving…' : promo ? 'Save Changes' : 'Create Promo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Banners Panel ────────────────────────────────────────────────────────────
function BannersPanel() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editBanner, setEditBanner] = useState(null)

  const load = () => api.get('/admin/banners').then(r => setBanners(r.data.banners || [])).catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete banner?')) return
    await api.delete(`/admin/banners/${id}`)
    setBanners(b => b.filter(x => x._id !== id))
  }

  const handleToggle = async (b) => {
    await api.put(`/admin/banners/${b._id}`, { isActive: !b.isActive })
    setBanners(prev => prev.map(x => x._id === b._id ? { ...x, isActive: !x.isActive } : x))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
          <Plus size={15} /> Create Banner
        </button>
      </div>

      {loading ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        : banners.length === 0 ? (
          <div className="bg-bg-section border border-dashed border-border rounded-2xl p-10 text-center">
            <Image size={28} className="text-text-muted mx-auto mb-3" />
            <p className="font-semibold text-text-primary">No banners yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {banners.map(b => (
              <div key={b._id} className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="w-28 h-16 rounded-xl overflow-hidden bg-bg-section flex-shrink-0">
                  {b.imageUrl ? <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Image size={20} className="text-text-muted" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary">{b.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-muted capitalize">{b.type}</span>
                    {b.startDate && <span className="text-xs text-text-muted">{new Date(b.startDate).toLocaleDateString('en-GB')} — {b.endDate ? new Date(b.endDate).toLocaleDateString('en-GB') : '∞'}</span>}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-border text-text-muted'}`}>{b.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleToggle(b)}>
                    {b.isActive ? <ToggleRight size={22} className="text-brand-500" /> : <ToggleLeft size={22} className="text-text-muted" />}
                  </button>
                  <button onClick={() => setEditBanner(b)} className="p-2 text-text-muted hover:text-brand-500 transition-colors"><Pencil size={15} /></button>
                  <button onClick={() => handleDelete(b._id)} className="p-2 text-text-muted hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      {(showCreate || editBanner) && (
        <BannerModal banner={editBanner}
          onSave={() => { load(); setShowCreate(false); setEditBanner(null) }}
          onClose={() => { setShowCreate(false); setEditBanner(null) }} />
      )}
    </div>
  )
}

function BannerModal({ banner, onSave, onClose }) {
  const [f, setF] = useState({
    title: banner?.title || '', type: banner?.type || 'hero',
    isActive: banner?.isActive ?? true, linkType: banner?.linkType || 'none',
    linkValue: banner?.linkValue || '', startDate: banner?.startDate?.slice(0, 10) || '',
    endDate: banner?.endDate?.slice(0, 10) || '', sortOrder: banner?.sortOrder ?? 0,
  })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(banner?.imageUrl || null)
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
      if (banner) await api.put(`/admin/banners/${banner._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      else await api.post('/admin/banners', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onSave()
    } catch (e) { alert(e.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const inp = "w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-bg-card rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-bg-card">
          <h2 className="text-lg font-bold">{banner ? 'Edit Banner' : 'Create Banner'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg-section flex items-center justify-center text-text-muted">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Title</label>
            <input value={f.title} onChange={e => setF(s => ({ ...s, title: e.target.value }))} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">Type</label>
              <select value={f.type} onChange={e => setF(s => ({ ...s, type: e.target.value }))} className={inp}>
                <option value="hero">Hero</option>
                <option value="promo">Promo</option>
                <option value="student">Student</option>
                <option value="gift">Gift Card</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">Sort Order</label>
              <input type="number" value={f.sortOrder} onChange={e => setF(s => ({ ...s, sortOrder: e.target.value }))} className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">Start Date</label>
              <input type="date" value={f.startDate} onChange={e => setF(s => ({ ...s, startDate: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">End Date</label>
              <input type="date" value={f.endDate} onChange={e => setF(s => ({ ...s, endDate: e.target.value }))} className={inp} />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Image</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-brand-400 transition-colors">
              {preview ? <img src={preview} alt="" className="w-full h-32 object-cover rounded-lg" />
                : <><Image size={22} className="text-text-muted mb-1" /><span className="text-sm text-text-muted">Upload image</span></>}
              <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
            </label>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section">Cancel</button>
          <button onClick={handleSave} disabled={!f.title || saving}
            className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-50">
            {saving ? 'Saving…' : banner ? 'Save Changes' : 'Create Banner'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Notification Blasts Panel ────────────────────────────────────────────────
function BlastsPanel() {
  const [blasts, setBlasts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)

  const load = () => api.get('/admin/notifications/blasts').then(r => setBlasts(r.data.blasts || [])).catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
          <Send size={15} /> Send Blast
        </button>
      </div>

      {loading ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        : blasts.length === 0 ? (
          <div className="bg-bg-section border border-dashed border-border rounded-2xl p-10 text-center">
            <Bell size={28} className="text-text-muted mx-auto mb-3" />
            <p className="font-semibold text-text-primary">No blasts sent yet</p>
          </div>
        ) : (
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-section">
                <tr>
                  {['Title', 'Segment', 'Recipients', 'Scheduled', 'Status', 'Sent By'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {blasts.map(b => (
                  <tr key={b._id} className="border-t border-border hover:bg-bg-section/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-text-primary">{b.title}</p>
                      <p className="text-xs text-text-muted truncate max-w-48">{b.body}</p>
                    </td>
                    <td className="px-4 py-3 text-text-muted capitalize text-sm">{b.segment}</td>
                    <td className="px-4 py-3 text-text-muted">{b.recipientCount?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-text-muted text-xs">{b.scheduledAt ? new Date(b.scheduledAt).toLocaleString('en-GB') : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${b.status === 'sent' ? 'bg-green-100 text-green-700' : b.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs capitalize">{b.sentByType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {showCompose && (
        <BlastModal onSave={() => { load(); setShowCompose(false) }} onClose={() => setShowCompose(false)} />
      )}
    </div>
  )
}

function BlastModal({ onSave, onClose }) {
  const [f, setF] = useState({ title: '', body: '', segment: 'all', scheduledAt: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  const SEGMENTS = [
    { value: 'all', label: 'All Users' },
    { value: 'students', label: 'Student Users' },
    { value: 'tastr_plus', label: 'Tastr+ Subscribers' },
  ]
  const handleSend = async () => {
    setSaving(true)
    try { await api.post('/notifications/blast', f); onSave() }
    catch (e) { alert(e.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }
  const inp = "w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section"
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-bg-card rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold">Send Platform Notification</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg-section flex items-center justify-center text-text-muted">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Title <span className="text-text-muted font-normal">({50 - f.title.length} left)</span></label>
            <input value={f.title} onChange={e => set('title', e.target.value.slice(0, 50))} className={inp} placeholder="Push notification title" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Message <span className="text-text-muted font-normal">({150 - f.body.length} left)</span></label>
            <textarea rows={3} value={f.body} onChange={e => set('body', e.target.value.slice(0, 150))} className={inp + ' resize-none'} placeholder="Message body…" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Target Segment</label>
            <div className="space-y-2">
              {SEGMENTS.map(s => (
                <label key={s.value} className="flex items-center gap-3 cursor-pointer p-3 border border-border rounded-xl hover:bg-bg-section transition-colors">
                  <input type="radio" name="segment" value={s.value} checked={f.segment === s.value}
                    onChange={() => set('segment', s.value)} className="accent-brand-500" />
                  <span className="text-sm font-medium">{s.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Schedule (optional)</label>
            <input type="datetime-local" value={f.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} className={inp} />
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section">Cancel</button>
          <button onClick={handleSend} disabled={!f.title || !f.body || saving}
            className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2">
            <Send size={14} /> {saving ? 'Sending…' : f.scheduledAt ? 'Schedule' : 'Send Now'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Admin Marketing Page ─────────────────────────────────────────────────────
export function MarketingPage() {
  const [tab, setTab] = useState(0)
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Marketing & Promotions</h1>
        <p className="text-text-muted text-sm mt-0.5">Platform-wide promos, banners, and push notifications</p>
      </div>
      <div className="flex gap-1 bg-bg-section border border-border rounded-2xl p-1">
        {MAIN_TABS.map((t, i) => {
          const Icon = MAIN_ICONS[i]
          return (
            <button key={i} onClick={() => setTab(i)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === i ? 'bg-bg-card shadow-sm text-brand-600' : 'text-text-muted hover:text-text-primary'}`}>
              <Icon size={15} />{t}
            </button>
          )
        })}
      </div>
      {tab === 0 && <PromoPanel />}
      {tab === 1 && <BannersPanel />}
      {tab === 2 && <BlastsPanel />}
    </div>
  )
}

export default MarketingPage
