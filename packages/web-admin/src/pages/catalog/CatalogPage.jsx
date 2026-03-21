import { useEffect, useState } from 'react'
import { Plus, Save, ToggleLeft, ToggleRight, Percent, Truck, Package } from 'lucide-react'
import api from '../../services/api.js'

const fmt = p => `£${(p / 100).toFixed(2)}`

export function CatalogPage() {
  const [verticals, setVerticals] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    api.get('/admin/verticals')
      .then(r => setVerticals(r.data.verticals || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const updateField = (key, field, value) => {
    setVerticals(vs => vs.map(v => v.key === key ? { ...v, [field]: value } : v))
  }

  const saveVertical = async (v) => {
    setSaving(v.key)
    try {
      await api.put(`/admin/verticals/${v.key}`, v)
      setSaved(v.key)
      setTimeout(() => setSaved(null), 2000)
    } catch (e) { alert('Save failed') }
    finally { setSaving(null) }
  }

  const handleCreate = async (data) => {
    try {
      const res = await api.post('/admin/verticals', data)
      setVerticals(res.data.verticals || [])
      setShowCreate(false)
    } catch (e) { alert('Failed to create vertical') }
  }

  if (loading) return (
    <div className="p-6 flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const inp = "w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section"

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Catalog & Verticals</h1>
          <p className="text-text-muted text-sm mt-0.5">Configure service verticals and per-category settings</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
          <Plus size={15} /> Add Vertical
        </button>
      </div>

      <div className="space-y-4">
        {verticals.map(v => (
          <div key={v.key} className={`bg-bg-card border-2 rounded-2xl p-5 transition-colors ${v.enabled ? 'border-brand-300' : 'border-border opacity-75'}`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{v.icon}</span>
                <div>
                  <h3 className="font-bold text-text-primary text-lg">{v.label}</h3>
                  <code className="text-xs text-text-muted font-mono">{v.key}</code>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${v.enabled ? 'bg-green-100 text-green-700' : 'bg-border text-text-muted'}`}>
                  {v.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button onClick={() => updateField(v.key, 'enabled', !v.enabled)}>
                  {v.enabled
                    ? <ToggleRight size={28} className="text-brand-500 cursor-pointer" />
                    : <ToggleLeft size={28} className="text-text-muted cursor-pointer" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5 flex items-center gap-1.5 block">
                  <Percent size={11} /> Commission (%)
                </label>
                <input type="number" value={v.commission} step="0.5" min="0" max="50"
                  onChange={e => updateField(v.key, 'commission', Number(e.target.value))}
                  className={inp} />
              </div>
              <div>
                <label className="text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5 flex items-center gap-1.5 block">
                  <Truck size={11} /> Delivery Fee (pence)
                </label>
                <input type="number" value={v.deliveryFee} step="10" min="0"
                  onChange={e => updateField(v.key, 'deliveryFee', Number(e.target.value))}
                  className={inp} />
                <p className="text-xs text-text-muted mt-1">{fmt(v.deliveryFee)}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5 block">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input type="color" value={v.color || '#C18B3C'}
                    onChange={e => updateField(v.key, 'color', e.target.value)}
                    className="w-10 h-10 rounded-xl border border-border cursor-pointer p-0.5 bg-bg-section" />
                  <input value={v.color || '#C18B3C'}
                    onChange={e => updateField(v.key, 'color', e.target.value)}
                    className={inp + ' flex-1 font-mono text-xs'} />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={() => saveVertical(v)} disabled={saving === v.key}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${saved === v.key ? 'bg-green-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-600'} disabled:opacity-50`}>
                <Save size={14} /> {saving === v.key ? 'Saving…' : saved === v.key ? 'Saved ✓' : 'Save Changes'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <CreateVerticalModal onSave={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function CreateVerticalModal({ onSave, onClose }) {
  const [f, setF] = useState({ key: '', label: '', icon: '📦', color: '#6366F1', commission: 15, deliveryFee: 199, enabled: false })
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  const inp = "w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-bg-card rounded-2xl max-w-sm w-full shadow-2xl p-6">
        <h2 className="text-lg font-bold text-text-primary mb-5">Add Vertical</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Key (unique slug)</label>
            <input value={f.key} onChange={e => set('key', e.target.value.toLowerCase().replace(/\s+/g, '_'))} className={inp} placeholder="e.g. pharmacy" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Label</label>
            <input value={f.label} onChange={e => set('label', e.target.value)} className={inp} placeholder="e.g. Pharmacy" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Icon (emoji)</label>
              <input value={f.icon} onChange={e => set('icon', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Commission %</label>
              <input type="number" value={f.commission} onChange={e => set('commission', Number(e.target.value))} className={inp} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section">Cancel</button>
          <button onClick={() => onSave(f)} disabled={!f.key || !f.label}
            className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-50">
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

export default CatalogPage
