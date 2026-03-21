import { useEffect, useState } from 'react'
import { Truck, MapPin, DollarSign, Clock, Zap, Save, Plus, Trash2, Info } from 'lucide-react'
import api from '../../services/api.js'

function Card({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-bg-card border border-border rounded-2xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <Icon size={16} className="text-brand-500" />
        <h3 className="font-bold text-text-primary text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {hint && <p className="text-xs text-text-muted mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function NumInput({ value, onChange, prefix = '', suffix = '', min = 0, step = 1 }) {
  return (
    <div className="flex items-center border border-border rounded-xl overflow-hidden bg-bg-section w-32">
      {prefix && <span className="px-2.5 py-2 text-sm text-text-muted border-r border-border bg-bg-card">{prefix}</span>}
      <input
        type="number" min={min} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 px-2.5 py-2 text-sm text-text-primary bg-transparent focus:outline-none w-0 min-w-0"
      />
      {suffix && <span className="px-2.5 py-2 text-sm text-text-muted border-l border-border bg-bg-card">{suffix}</span>}
    </div>
  )
}

function Toggle({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-sm text-text-muted">{label}</span>}
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-brand-500' : 'bg-border'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

const DEFAULT_CONFIG = {
  platformBaseFee:      199,
  platformFeePercent:   0,
  freeDeliveryThreshold:0,
  surgeEnabled:         false,
  surgeMultiplier:      1.5,
  surgeTriggerMinutes:  20,
  expressEnabled:       true,
  expressExtraFee:      200,
  minOrderPlatform:     0,
  estimatedDeliveryMin: 30,
  estimatedDeliveryMax: 45,
  tiers: [
    { minKm: 0, maxKm: 2,  feePence: 99  },
    { minKm: 2, maxKm: 5,  feePence: 199 },
    { minKm: 5, maxKm: 10, feePence: 299 },
  ],
}

export default function DeliveryPricingPage() {
  const [cfg, setCfg]       = useState(DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const set = (key, val) => setCfg(c => ({ ...c, [key]: val }))

  const setTier = (i, field, val) => {
    const tiers = [...cfg.tiers]
    tiers[i] = { ...tiers[i], [field]: Number(val) }
    set('tiers', tiers)
  }

  const addTier = () => set('tiers', [...cfg.tiers, { minKm: 0, maxKm: 0, feePence: 0 }])
  const removeTier = i => set('tiers', cfg.tiers.filter((_, j) => j !== i))

  const handleSave = async () => {
    setSaving(true)
    try {
      // await api.put('/admin/platform-config/delivery', cfg)
      await new Promise(r => setTimeout(r, 600))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Delivery & Pricing</h1>
          <p className="text-text-muted text-sm mt-1">Platform-wide delivery fee rules and pricing configuration</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all
            ${saved ? 'bg-green-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-600'}`}
        >
          <Save size={15} />
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-2 gap-5">

        {/* Left column */}
        <div className="space-y-5">

          {/* Base Fees */}
          <Card title="Base Delivery Fees" icon={DollarSign}>
            <FieldRow label="Platform base delivery fee" hint="Default when no restaurant-specific tier applies">
              <NumInput prefix="£" value={(cfg.platformBaseFee / 100).toFixed(2)} step={0.01}
                onChange={v => set('platformBaseFee', Math.round(v * 100))} />
            </FieldRow>
            <FieldRow label="Free delivery threshold" hint="Orders above this value get free delivery (0 = off)">
              <NumInput prefix="£" value={(cfg.freeDeliveryThreshold / 100).toFixed(2)} step={0.01}
                onChange={v => set('freeDeliveryThreshold', Math.round(v * 100))} />
            </FieldRow>
            <FieldRow label="Platform minimum order" hint="Minimum basket value required to place an order">
              <NumInput prefix="£" value={(cfg.minOrderPlatform / 100).toFixed(2)} step={0.01}
                onChange={v => set('minOrderPlatform', Math.round(v * 100))} />
            </FieldRow>
          </Card>

          {/* Estimated Time */}
          <Card title="Estimated Delivery Time" icon={Clock}>
            <FieldRow label="Minimum estimate" hint="Lower bound shown to customers">
              <NumInput value={cfg.estimatedDeliveryMin} suffix="min" step={5}
                onChange={v => set('estimatedDeliveryMin', v)} />
            </FieldRow>
            <FieldRow label="Maximum estimate" hint="Upper bound shown to customers">
              <NumInput value={cfg.estimatedDeliveryMax} suffix="min" step={5}
                onChange={v => set('estimatedDeliveryMax', v)} />
            </FieldRow>
          </Card>

          {/* Express */}
          <Card title="Express Delivery" icon={Zap}>
            <FieldRow label="Enable express delivery" hint="Let customers pay extra for faster delivery">
              <Toggle value={cfg.expressEnabled} onChange={v => set('expressEnabled', v)} />
            </FieldRow>
            <FieldRow label="Express surcharge" hint="Extra fee added on top of base delivery fee">
              <NumInput prefix="£" value={(cfg.expressExtraFee / 100).toFixed(2)} step={0.01}
                onChange={v => set('expressExtraFee', Math.round(v * 100))} />
            </FieldRow>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Distance Tiers */}
          <Card title="Distance-Based Pricing Tiers" icon={MapPin}>
            <p className="text-xs text-text-muted mb-4">
              Default tiers for restaurants without custom delivery pricing.
            </p>
            <div className="space-y-2 mb-4">
              <div className="grid grid-cols-4 gap-2 text-xs font-bold text-text-muted uppercase tracking-wide px-1 mb-1">
                <span>From (km)</span><span>To (km)</span><span>Fee</span><span></span>
              </div>
              {cfg.tiers.map((tier, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-center">
                  <input type="number" min={0} step={0.5} value={tier.minKm}
                    onChange={e => setTier(i, 'minKm', e.target.value)}
                    className="border border-border rounded-xl px-3 py-2 text-sm focus:border-brand-500 focus:outline-none bg-bg-section" />
                  <input type="number" min={0} step={0.5} value={tier.maxKm}
                    onChange={e => setTier(i, 'maxKm', e.target.value)}
                    className="border border-border rounded-xl px-3 py-2 text-sm focus:border-brand-500 focus:outline-none bg-bg-section" />
                  <div className="flex items-center border border-border rounded-xl overflow-hidden bg-bg-section">
                    <span className="px-2 py-2 text-sm text-text-muted border-r border-border bg-bg-card">£</span>
                    <input type="number" min={0} step={0.01} value={(tier.feePence / 100).toFixed(2)}
                      onChange={e => setTier(i, 'feePence', Math.round(e.target.value * 100))}
                      className="flex-1 px-2 py-2 text-sm bg-transparent focus:outline-none w-0 min-w-0" />
                  </div>
                  <button onClick={() => removeTier(i)} disabled={cfg.tiers.length <= 1}
                    className="p-2 text-text-muted hover:text-red-500 transition-colors disabled:opacity-30 justify-self-center">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addTier} className="flex items-center gap-1.5 text-brand-500 text-sm font-semibold hover:text-brand-600 transition-colors">
              <Plus size={15} /> Add tier
            </button>
          </Card>

          {/* Surge Pricing */}
          <Card title="Surge Pricing" icon={Info}>
            <FieldRow label="Enable surge pricing" hint="Auto-increase fees during peak demand">
              <Toggle value={cfg.surgeEnabled} onChange={v => set('surgeEnabled', v)} />
            </FieldRow>
            {cfg.surgeEnabled && (<>
              <FieldRow label="Surge multiplier" hint="e.g. 1.5 = 50% more expensive">
                <NumInput value={cfg.surgeMultiplier} step={0.1} min={1}
                  onChange={v => set('surgeMultiplier', v)} />
              </FieldRow>
              <FieldRow label="Trigger: wait above" hint="Minutes above which surge activates">
                <NumInput value={cfg.surgeTriggerMinutes} suffix="min" step={5}
                  onChange={v => set('surgeTriggerMinutes', v)} />
              </FieldRow>
            </>)}
          </Card>

          {/* Summary Card */}
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3">Current Config Summary</p>
            <div className="space-y-2">
              {[
                ['Base fee', `£${(cfg.platformBaseFee / 100).toFixed(2)}`],
                ['Free delivery above', cfg.freeDeliveryThreshold > 0 ? `£${(cfg.freeDeliveryThreshold / 100).toFixed(2)}` : 'Disabled'],
                ['Express surcharge', cfg.expressEnabled ? `£${(cfg.expressExtraFee / 100).toFixed(2)}` : 'Disabled'],
                ['Surge pricing', cfg.surgeEnabled ? `×${cfg.surgeMultiplier} at ${cfg.surgeTriggerMinutes}min+` : 'Disabled'],
                ['Est. delivery', `${cfg.estimatedDeliveryMin}–${cfg.estimatedDeliveryMax} min`],
                ['Distance tiers', `${cfg.tiers.length} configured`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-text-muted">{label}</span>
                  <span className="font-semibold text-text-primary">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
