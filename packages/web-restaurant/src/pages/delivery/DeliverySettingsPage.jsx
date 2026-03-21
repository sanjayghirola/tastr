import { useState, useEffect, useRef } from 'react'
import { Toggle, Button, Input } from '../../components/global/index.jsx'
import api from '../../services/api.js'

const TABS = ['Model', 'Radius', 'Fees', 'Methods', 'Tastr+', 'Schedule']

// ─── Delivery Model Tab ───────────────────────────────────────────────────────
function ModelTab({ settings, onChange }) {
  const mode = settings.deliveryMode || 'tastr'
  const OPTIONS = [
    {
      val: 'tastr', label: 'Tastr Delivery', emoji: '🚴',
      sub: 'Tastr provides delivery drivers. Commission: 15–20%. Delivery fee is split between driver and Tastr.',
      pros: ['No driver management', 'Wider coverage', 'Driver tracking included'],
    },
    {
      val: 'own', label: 'Self Delivery', emoji: '🏪',
      sub: 'You manage your own delivery team. Commission: 10%. You keep 100% of the delivery fee.',
      pros: ['Lower commission', 'Full delivery fee', 'Your own drivers'],
    },
  ]
  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-lg">💡</span>
        <div>
          <p className="text-sm font-semibold text-blue-800">You can change your delivery model at any time</p>
          <p className="text-xs text-blue-600 mt-0.5">Switching takes effect from the next order. Existing orders continue with their current model.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {OPTIONS.map(opt => (
          <button key={opt.val} onClick={() => onChange({ deliveryMode: opt.val })}
            className={`text-left p-5 rounded-2xl border-2 transition-all
              ${mode === opt.val ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-border bg-bg-section hover:border-brand-300'}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{opt.emoji}</span>
              <div>
                <p className={`font-bold ${mode === opt.val ? 'text-brand-600' : 'text-text-primary'}`}>{opt.label}</p>
                {mode === opt.val && (
                  <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full font-semibold">Current</span>
                )}
              </div>
            </div>
            <p className="text-xs text-text-muted leading-relaxed mb-3">{opt.sub}</p>
            <div className="space-y-1.5">
              {opt.pros.map(p => (
                <div key={p} className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="text-green-500">✓</span> {p}
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-bg-section border border-border rounded-2xl p-4">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Commission comparison</p>
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 rounded-xl ${mode === 'own' ? 'bg-green-50 border border-green-200' : 'bg-bg-card border border-border'}`}>
            <p className="text-xs text-text-muted mb-1">Self Delivery</p>
            <p className="text-xl font-black text-text-primary">10%</p>
            <p className="text-xs text-green-600 mt-1">+ keep 100% delivery fee</p>
          </div>
          <div className={`p-3 rounded-xl ${mode === 'tastr' ? 'bg-blue-50 border border-blue-200' : 'bg-bg-card border border-border'}`}>
            <p className="text-xs text-text-muted mb-1">Tastr Delivery</p>
            <p className="text-xl font-black text-text-primary">15–20%</p>
            <p className="text-xs text-blue-600 mt-1">Delivery fee split with driver</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Radius Tab ───────────────────────────────────────────────────────────────
function RadiusTab({ settings, onChange }) {
  const radiusKm = settings.deliveryRadiusKm || 5

  return (
    <div className="space-y-5">
      <div className="bg-bg-section rounded-2xl p-4 border border-border">
        <p className="text-sm font-bold text-text-primary mb-1">Delivery Radius</p>
        <p className="text-xs text-text-muted mb-4">Set how far you deliver from your restaurant location</p>

        {/* Map placeholder - Google Maps RadiusMapPicker */}
        <div className="w-full h-48 rounded-xl bg-brand-50 border-2 border-dashed border-brand-200 flex flex-col items-center justify-center mb-4 relative overflow-hidden">
          <div className="text-4xl mb-2">🗺</div>
          <p className="text-sm text-text-muted text-center">Google Maps radius picker</p>
          <p className="text-xs text-text-muted">Requires VITE_GOOGLE_MAPS_KEY</p>
          {/* Circle indicator */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-full border-2 border-brand-500 bg-brand-500/10 transition-all duration-300"
              style={{ width: `${Math.min(radiusKm * 18, 160)}px`, height: `${Math.min(radiusKm * 18, 160)}px` }}
            />
            <div className="absolute w-3 h-3 rounded-full bg-brand-500" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-text-primary">Radius: <span className="text-brand-500">{radiusKm} km</span></p>
          </div>
          <input type="range" min="1" max="25" step="0.5" value={radiusKm}
            onChange={e => onChange({ deliveryRadiusKm: parseFloat(e.target.value) })}
            className="w-full accent-brand-500" />
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>1 km</span><span>25 km</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Fees Tab ─────────────────────────────────────────────────────────────────
function FeesTab({ settings, onChange }) {
  const tiers = settings.deliveryTiers || []
  const minOrder = settings.minOrderAmount || 0

  const addTier = () => {
    const last = tiers[tiers.length - 1]
    onChange({
      deliveryTiers: [...tiers, {
        minKm:    last ? last.maxKm : 0,
        maxKm:    last ? last.maxKm + 3 : 3,
        feePence: 250,
      }],
    })
  }

  const updateTier = (i, patch) => {
    const updated = tiers.map((t, idx) => idx === i ? { ...t, ...patch } : t)
    onChange({ deliveryTiers: updated })
  }

  const removeTier = i => onChange({ deliveryTiers: tiers.filter((_, idx) => idx !== i) })

  return (
    <div className="space-y-4">
      <div className="bg-bg-section rounded-2xl p-4 border border-border">
        <p className="text-sm font-bold text-text-primary mb-3">Delivery Fee Tiers</p>

        {tiers.length === 0 ? (
          <div className="text-center py-6 text-text-muted text-sm">
            <p>No fee tiers configured</p>
            <p className="text-xs mt-1">A flat fee of £{((settings.deliveryFee || 250) / 100).toFixed(2)} applies</p>
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-text-muted px-1">
              <span>Min km</span><span>Max km</span><span>Fee (£)</span><span></span>
            </div>
            {tiers.map((tier, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-center">
                <input type="number" min="0" step="0.5" value={tier.minKm}
                  onChange={e => updateTier(i, { minKm: parseFloat(e.target.value) })}
                  className="border border-border rounded-lg px-2 py-1.5 text-sm text-center focus:border-brand-500 focus:outline-none" />
                <input type="number" min="0" step="0.5" value={tier.maxKm}
                  onChange={e => updateTier(i, { maxKm: parseFloat(e.target.value) })}
                  className="border border-border rounded-lg px-2 py-1.5 text-sm text-center focus:border-brand-500 focus:outline-none" />
                <input type="number" min="0" step="0.01" value={(tier.feePence / 100).toFixed(2)}
                  onChange={e => updateTier(i, { feePence: Math.round(parseFloat(e.target.value || 0) * 100) })}
                  className="border border-border rounded-lg px-2 py-1.5 text-sm text-center focus:border-brand-500 focus:outline-none" />
                <button onClick={() => removeTier(i)} className="text-error-500 hover:text-error-600 text-center text-sm">🗑</button>
              </div>
            ))}
          </div>
        )}

        <button onClick={addTier} className="w-full py-2 rounded-xl border-2 border-dashed border-brand-200 text-sm font-semibold text-brand-500 hover:bg-brand-50 hover:border-brand-400 transition-all">
          + Add Tier
        </button>
      </div>

      <div className="bg-bg-section rounded-2xl p-4 border border-border">
        <p className="text-sm font-bold text-text-primary mb-3">Minimum Order Amount</p>
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-sm">£</span>
          <input type="number" min="0" step="0.01" value={(minOrder / 100).toFixed(2)}
            onChange={e => onChange({ minOrderAmount: Math.round(parseFloat(e.target.value || 0) * 100) })}
            className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
      </div>
    </div>
  )
}

// ─── Methods Tab ──────────────────────────────────────────────────────────────
function MethodsTab({ settings, onChange }) {
  return (
    <div className="space-y-3">
      {[
        {
          key: 'standardDelivery',
          label: 'Standard Delivery',
          desc: 'Default 30–60 min delivery',
          icon: '🚗',
          alwaysOn: true,
        },
        {
          key: 'expressDeliveryEnabled',
          label: 'Express Delivery',
          desc: 'Faster 15–25 min delivery',
          icon: '⚡',
          extraKey: 'expressDeliveryExtraFee',
          extraLabel: 'Extra charge (£)',
        },
        {
          key: 'scheduledOrdersEnabled',
          label: 'Scheduled Orders',
          desc: 'Allow customers to pre-book delivery times',
          icon: '🗓',
        },
      ].map(m => (
        <div key={m.key} className="bg-bg-section rounded-2xl p-4 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{m.icon}</span>
              <div>
                <p className="text-sm font-semibold text-text-primary">{m.label}</p>
                <p className="text-xs text-text-muted">{m.desc}</p>
              </div>
            </div>
            {m.alwaysOn ? (
              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">Always on</span>
            ) : (
              <Toggle checked={!!settings[m.key]} onChange={v => onChange({ [m.key]: v })} />
            )}
          </div>
          {m.extraKey && settings[m.key] && (
            <div className="mt-3 pt-3 border-t border-border-light flex items-center gap-2">
              <span className="text-xs text-text-muted">{m.extraLabel}</span>
              <input type="number" min="0" step="0.01"
                value={((settings[m.extraKey] || 200) / 100).toFixed(2)}
                onChange={e => onChange({ [m.extraKey]: Math.round(parseFloat(e.target.value || 0) * 100) })}
                className="w-20 border border-border rounded-lg px-2 py-1 text-sm text-center focus:border-brand-500 focus:outline-none" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Tastr+ Tab ───────────────────────────────────────────────────────────────
function TastrPlusTab({ settings, onChange }) {
  return (
    <div className="bg-gradient-to-br from-brand-600 to-brand-400 rounded-2xl p-5 text-white">
      <div className="flex items-center gap-3 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <div>
          <p className="font-black text-lg">Tastr+ Free Delivery</p>
          <p className="text-sm text-white/80">Attract premium subscribers</p>
        </div>
      </div>
      <p className="text-sm text-white/90 mb-4">
        Enable this to offer free delivery to Tastr+ subscribers. Tastr covers the delivery cost — you pay nothing extra.
      </p>
      <div className="flex items-center justify-between bg-white/20 rounded-xl p-3 backdrop-blur-sm">
        <span className="text-sm font-semibold">Free delivery for Tastr+ subscribers</span>
        <Toggle
          checked={!!settings.tastrPlusFreeDelivery}
          onChange={v => onChange({ tastrPlusFreeDelivery: v })}
        />
      </div>
    </div>
  )
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────
function ScheduleTab({ settings, onChange }) {
  return (
    <div className="space-y-4">
      <div className="bg-bg-section rounded-2xl p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">Enable Scheduled Orders</p>
            <p className="text-xs text-text-muted">Allow customers to pre-book future delivery slots</p>
          </div>
          <Toggle checked={!!settings.scheduledOrdersEnabled} onChange={v => onChange({ scheduledOrdersEnabled: v })} />
        </div>

        {settings.scheduledOrdersEnabled && (
          <div className="pt-3 border-t border-border-light space-y-3">
            <div>
              <p className="text-xs font-semibold text-text-secondary mb-1.5">Minimum advance booking</p>
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="72" value={settings.scheduledAdvanceHours || 24}
                  onChange={e => onChange({ scheduledAdvanceHours: parseInt(e.target.value || 24) })}
                  className="w-20 border border-border rounded-xl px-3 py-2 text-sm text-center focus:border-brand-500 focus:outline-none" />
                <span className="text-sm text-text-secondary">hours in advance</span>
              </div>
            </div>
            <p className="text-xs text-text-muted">
              Customers must place scheduled orders at least {settings.scheduledAdvanceHours || 24}h before the desired delivery time.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DeliverySettingsPage() {
  const [tab,      setTab]      = useState('Radius')
  const [settings, setSettings] = useState({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    api.get('/restaurants/me').then(r => setSettings(r.data.restaurant || {})).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleChange = (patch) => {
    setSettings(prev => ({ ...prev, ...patch }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/restaurants/me/delivery', {
        deliveryMode:            settings.deliveryMode,
        deliveryRadiusKm:        settings.deliveryRadiusKm,
        deliveryFee:             settings.deliveryFee,
        minOrderAmount:          settings.minOrderAmount,
        expressDeliveryEnabled:  settings.expressDeliveryEnabled,
        expressDeliveryExtraFee: settings.expressDeliveryExtraFee,
        scheduledOrdersEnabled:  settings.scheduledOrdersEnabled,
        scheduledAdvanceHours:   settings.scheduledAdvanceHours,
        tastrPlusFreeDelivery:   settings.tastrPlusFreeDelivery,
        deliveryTiers:           settings.deliveryTiers,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner spinner-lg" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Delivery Settings</h1>
          <p className="text-sm text-text-muted">Configure how you deliver to customers</p>
        </div>
        <Button variant={saved ? 'success' : 'primary'} size="md" loading={saving} onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save Changes'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-5 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all -mb-px
              ${tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Model'    && <ModelTab    settings={settings} onChange={handleChange} />}
      {tab === 'Radius'   && <RadiusTab   settings={settings} onChange={handleChange} />}
      {tab === 'Fees'     && <FeesTab     settings={settings} onChange={handleChange} />}
      {tab === 'Methods'  && <MethodsTab  settings={settings} onChange={handleChange} />}
      {tab === 'Tastr+'   && <TastrPlusTab settings={settings} onChange={handleChange} />}
      {tab === 'Schedule' && <ScheduleTab settings={settings} onChange={handleChange} />}
    </div>
  )
}
