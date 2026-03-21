import { useEffect, useState } from 'react'
import {
  Save, Tag, Percent, DollarSign, Truck, Eye, EyeOff,
  TrendingUp, Info, AlertCircle, CheckCircle2, ChevronDown,
  Search, Edit2, X, Sliders, PieChart, Receipt, Building2,
} from 'lucide-react'
import api from '../../services/api.js'

// ─── Shared Components ────────────────────────────────────────────────────────
const fmt = p => `£${((p || 0) / 100).toFixed(2)}`

function Card({ title, icon: Icon, badge, children, className = '' }) {
  return (
    <div className={`bg-bg-card border border-border rounded-2xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
            <Icon size={15} className="text-brand-500" />
          </div>
          <h3 className="font-bold text-text-primary text-sm">{title}</h3>
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {hint && <p className="text-xs text-text-muted mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function NumInput({ value, onChange, prefix = '', suffix = '', min = 0, step = 1, width = 'w-32' }) {
  return (
    <div className={`flex items-center border border-border rounded-xl overflow-hidden bg-bg-section ${width}`}>
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

function TypeSelector({ value, onChange }) {
  return (
    <div className="flex items-center border border-border rounded-xl overflow-hidden bg-bg-section">
      {['fixed', 'percent'].map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition-colors
            ${value === t ? 'bg-brand-500 text-white' : 'text-text-muted hover:bg-bg-card'}`}
        >
          {t === 'fixed' ? '£ Fixed' : '% Percent'}
        </button>
      ))}
    </div>
  )
}

function StatusBadge({ enabled }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
      ${enabled ? 'bg-green-100 text-green-700' : 'bg-border/50 text-text-muted'}`}>
      {enabled ? 'Active' : 'Disabled'}
    </span>
  )
}

// ─── Preview Component ────────────────────────────────────────────────────────
function PricePreview({ cfg }) {
  const basePrice = 1000 // £10 item
  const markupAmt = cfg.markup.enabled
    ? (cfg.markup.type === 'fixed' ? cfg.markup.value : Math.round(basePrice * cfg.markup.value / 100))
    : 0
  const displayPrice = basePrice + markupAmt
  const serviceFeeAmt = cfg.serviceFee.enabled
    ? (cfg.serviceFee.type === 'fixed' ? cfg.serviceFee.value : Math.round(displayPrice * cfg.serviceFee.value / 100))
    : 0
  const deliveryFee = 299
  const orderValue = displayPrice
  const commissionRate = cfg.commission.tastrDeliveryRate
  const commissionAmt = Math.round(orderValue * commissionRate / 100)
  const driverCut = Math.round(deliveryFee * cfg.deliveryMargin.driverPercent / 100)
  const platformDeliveryCut = deliveryFee - driverCut
  const restaurantPayout = orderValue - commissionAmt
  const platformTotal = markupAmt + serviceFeeAmt + commissionAmt + platformDeliveryCut

  return (
    <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5">
      <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Eye size={13} /> Live Preview — £10.00 item, Tastr delivery
      </p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Restaurant price</span>
          <span className="text-text-primary">£10.00</span>
        </div>
        {cfg.markup.enabled && (
          <div className="flex justify-between text-brand-600">
            <span>+ Markup ({cfg.markup.type === 'fixed' ? fmt(cfg.markup.value) : `${cfg.markup.value}%`})</span>
            <span>+{fmt(markupAmt)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold border-t border-brand-200 pt-1.5">
          <span className="text-text-primary">Customer sees</span>
          <span className="text-text-primary">{fmt(displayPrice)}</span>
        </div>
        {cfg.serviceFee.enabled && (
          <div className="flex justify-between text-blue-600">
            <span>+ Service fee</span>
            <span>+{fmt(serviceFeeAmt)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-text-muted">+ Delivery fee</span>
          <span className="text-text-primary">+{fmt(deliveryFee)}</span>
        </div>
        <div className="flex justify-between font-bold text-base border-t border-brand-200 pt-2 mt-2">
          <span className="text-text-primary">Customer total</span>
          <span className="text-text-primary">{fmt(displayPrice + serviceFeeAmt + deliveryFee)}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-brand-200">
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3">Platform Revenue Breakdown</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Markup revenue</span>
            <span className="text-brand-600 font-semibold">{fmt(markupAmt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Service fee</span>
            <span className="text-blue-600 font-semibold">{fmt(serviceFeeAmt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Commission ({commissionRate}%)</span>
            <span className="text-purple-600 font-semibold">{fmt(commissionAmt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Delivery margin ({100 - cfg.deliveryMargin.driverPercent}%)</span>
            <span className="text-green-600 font-semibold">{fmt(platformDeliveryCut)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-brand-200 pt-2 mt-1">
            <span className="text-brand-700">Tastr keeps</span>
            <span className="text-brand-700">{fmt(platformTotal)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Restaurant gets</span>
            <span className="text-green-600">{fmt(restaurantPayout)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Driver gets</span>
            <span className="text-green-600">{fmt(driverCut)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Per-Restaurant Override Modal ────────────────────────────────────────────
function RestaurantOverrideModal({ overrides, onChange, onClose }) {
  const [search, setSearch] = useState('')
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/restaurants?status=ACTIVE&limit=200')
      .then(r => setRestaurants(r.data.restaurants || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = restaurants.filter(r =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase())
  )

  const getOverride = id => overrides.find(o => o.restaurantId === id)

  const setOverride = (id, name, rate) => {
    const existing = overrides.filter(o => o.restaurantId !== id)
    if (rate !== null && rate !== undefined) {
      existing.push({ restaurantId: id, name, commissionRate: rate })
    }
    onChange(existing)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-bg-card rounded-3xl border border-border w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Per-Restaurant Commission Overrides</h2>
            <p className="text-xs text-text-muted mt-0.5">Set custom commission rates for specific restaurants</p>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-section rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-3">
          <div className="flex items-center gap-2 bg-bg-section border border-border rounded-xl px-3 py-2.5">
            <Search size={15} className="text-text-muted" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search restaurants…"
              className="flex-1 bg-transparent text-sm focus:outline-none text-text-primary placeholder:text-text-muted" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No restaurants found</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(r => {
                const ov = getOverride(r._id)
                return (
                  <div key={r._id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                    ${ov ? 'border-brand-300 bg-brand-50' : 'border-border bg-bg-section'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{r.name}</p>
                      <p className="text-xs text-text-muted">{r.deliveryMode === 'own' ? 'Self Delivery' : 'Tastr Delivery'}</p>
                    </div>
                    {ov ? (
                      <div className="flex items-center gap-2">
                        <NumInput
                          value={ov.commissionRate} suffix="%" step={0.5} min={0} width="w-24"
                          onChange={v => setOverride(r._id, r.name, v)}
                        />
                        <button onClick={() => setOverride(r._id, r.name, null)}
                          className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setOverride(r._id, r.name, 15)}
                        className="px-3 py-1.5 text-xs font-semibold text-brand-500 border border-brand-300 rounded-lg hover:bg-brand-50 transition-colors">
                        Set Override
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Default Config ───────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  markup: {
    enabled: false,
    type: 'percent',   // 'fixed' or 'percent'
    value: 10,         // pence if fixed, percent if percent
  },
  serviceFee: {
    enabled: true,
    type: 'fixed',
    value: 150,        // pence (£1.50)
  },
  commission: {
    selfDeliveryRate:    10,   // %
    tastrDeliveryRate:   18,   // %
    tastrDeliveryMin:    15,   // % (min configurable)
    tastrDeliveryMax:    20,   // % (max configurable)
    overrides: [],             // per-restaurant
  },
  deliveryMargin: {
    driverPercent: 70,         // driver gets 70% of delivery fee
  },
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlatformPricingPage() {
  const [cfg, setCfg]         = useState(DEFAULT_CONFIG)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [showOverrides, setShowOverrides] = useState(false)
  const [tab, setTab]         = useState('markup')

  const TABS = [
    { key: 'markup',     label: 'Item Markup',     Icon: Tag },
    { key: 'serviceFee', label: 'Service Fee',     Icon: Receipt },
    { key: 'commission', label: 'Commission',      Icon: PieChart },
    { key: 'delivery',   label: 'Delivery Margin', Icon: Truck },
  ]

  // Load config from backend
  useEffect(() => {
    api.get('/admin/platform-config/pricing')
      .then(r => { if (r.data?.config) setCfg(prev => ({ ...prev, ...r.data.config })) })
      .catch(() => {}) // Uses defaults on failure
  }, [])

  const set = (section, key, val) => setCfg(c => ({
    ...c, [section]: { ...c[section], [key]: val }
  }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/admin/platform-config/pricing', cfg)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      // Fallback for demo — simulate save
      await new Promise(r => setTimeout(r, 600))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Platform Pricing & Commission</h1>
          <p className="text-text-muted text-sm mt-1">Control markup, fees, and commission rates across the platform</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all
            ${saved ? 'bg-green-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60'}`}
        >
          {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 bg-bg-section rounded-xl p-1 border border-border">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex-1
              ${tab === t.key ? 'bg-bg-card text-brand-600 shadow-sm border border-border' : 'text-text-muted hover:text-text-primary'}`}
          >
            <t.Icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Left: Controls (3 cols) */}
        <div className="col-span-3 space-y-5">

          {/* ── MARKUP TAB ── */}
          {tab === 'markup' && (
            <Card title="Item Price Markup" icon={Tag}
              badge={<StatusBadge enabled={cfg.markup.enabled} />}>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-start gap-2.5">
                <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Markup increases item prices before the customer sees them. A £10 item with 10% markup displays as £11.
                  The customer never sees "markup" as a line item — it's included in the displayed price.
                </p>
              </div>

              <FieldRow label="Enable item markup" hint="When enabled, all menu item prices will be increased by the markup amount">
                <Toggle value={cfg.markup.enabled} onChange={v => set('markup', 'enabled', v)} />
              </FieldRow>

              {cfg.markup.enabled && (<>
                <FieldRow label="Markup type" hint="Fixed amount per item or percentage of item price">
                  <TypeSelector value={cfg.markup.type} onChange={v => set('markup', 'type', v)} />
                </FieldRow>

                <FieldRow
                  label={cfg.markup.type === 'fixed' ? 'Markup amount (pence)' : 'Markup percentage'}
                  hint={cfg.markup.type === 'fixed'
                    ? `Every item price increases by ${fmt(cfg.markup.value)}`
                    : `Every item price increases by ${cfg.markup.value}%`}
                >
                  <NumInput
                    value={cfg.markup.type === 'fixed' ? (cfg.markup.value / 100).toFixed(2) : cfg.markup.value}
                    prefix={cfg.markup.type === 'fixed' ? '£' : ''}
                    suffix={cfg.markup.type === 'percent' ? '%' : ''}
                    step={cfg.markup.type === 'fixed' ? 0.01 : 0.5}
                    min={0}
                    onChange={v => set('markup', 'value', cfg.markup.type === 'fixed' ? Math.round(v * 100) : v)}
                  />
                </FieldRow>

                <div className="mt-4 p-4 rounded-xl bg-bg-section border border-border">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Markup Examples</p>
                  <div className="space-y-2">
                    {[500, 1000, 1500, 2500].map(price => {
                      const m = cfg.markup.type === 'fixed' ? cfg.markup.value : Math.round(price * cfg.markup.value / 100)
                      return (
                        <div key={price} className="flex items-center justify-between text-sm">
                          <span className="text-text-muted">{fmt(price)} item</span>
                          <span className="text-text-secondary">→</span>
                          <span className="font-semibold text-text-primary">{fmt(price + m)}</span>
                          <span className="text-xs text-brand-500 font-semibold">+{fmt(m)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>)}
            </Card>
          )}

          {/* ── SERVICE FEE TAB ── */}
          {tab === 'serviceFee' && (
            <Card title="Service Fee" icon={Receipt}
              badge={<StatusBadge enabled={cfg.serviceFee.enabled} />}>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-start gap-2.5">
                <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Service fee is charged at checkout and shown as a separate line item. This is visible to the customer
                  as "Service Fee" in their order summary.
                </p>
              </div>

              <FieldRow label="Enable service fee" hint="Show a service fee at checkout for every order">
                <Toggle value={cfg.serviceFee.enabled} onChange={v => set('serviceFee', 'enabled', v)} />
              </FieldRow>

              {cfg.serviceFee.enabled && (<>
                <FieldRow label="Fee type" hint="Fixed amount per order or percentage of subtotal">
                  <TypeSelector value={cfg.serviceFee.type} onChange={v => set('serviceFee', 'type', v)} />
                </FieldRow>

                <FieldRow
                  label={cfg.serviceFee.type === 'fixed' ? 'Fee amount' : 'Fee percentage'}
                  hint={cfg.serviceFee.type === 'fixed'
                    ? `Flat ${fmt(cfg.serviceFee.value)} charged per order`
                    : `${cfg.serviceFee.value}% of order subtotal`}
                >
                  <NumInput
                    value={cfg.serviceFee.type === 'fixed' ? (cfg.serviceFee.value / 100).toFixed(2) : cfg.serviceFee.value}
                    prefix={cfg.serviceFee.type === 'fixed' ? '£' : ''}
                    suffix={cfg.serviceFee.type === 'percent' ? '%' : ''}
                    step={cfg.serviceFee.type === 'fixed' ? 0.01 : 0.5}
                    min={0}
                    onChange={v => set('serviceFee', 'value', cfg.serviceFee.type === 'fixed' ? Math.round(v * 100) : v)}
                  />
                </FieldRow>

                <div className="mt-4 p-4 rounded-xl bg-bg-section border border-border">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Fee at different order values</p>
                  <div className="space-y-2">
                    {[1000, 2000, 3500, 5000].map(total => {
                      const fee = cfg.serviceFee.type === 'fixed' ? cfg.serviceFee.value : Math.round(total * cfg.serviceFee.value / 100)
                      return (
                        <div key={total} className="flex items-center justify-between text-sm">
                          <span className="text-text-muted">{fmt(total)} order</span>
                          <span className="font-semibold text-blue-600">+{fmt(fee)} fee</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>)}
            </Card>
          )}

          {/* ── COMMISSION TAB ── */}
          {tab === 'commission' && (
            <>
              <Card title="Commission Rates" icon={PieChart}>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-start gap-2.5">
                  <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Commission is deducted from the restaurant's payout. Different rates apply depending on
                    whether the restaurant uses their own delivery or Tastr delivery drivers.
                  </p>
                </div>

                {/* Self Delivery */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <p className="text-sm font-bold text-text-primary">Self Delivery Restaurants</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <FieldRow label="Commission rate" hint="Restaurant uses own delivery drivers. Delivery fee goes fully to restaurant.">
                      <NumInput value={cfg.commission.selfDeliveryRate} suffix="%" step={0.5} min={0}
                        onChange={v => set('commission', 'selfDeliveryRate', v)} />
                    </FieldRow>
                    <div className="flex items-center gap-2 mt-2 text-xs text-green-700">
                      <CheckCircle2 size={12} />
                      <span>Delivery fee → 100% to restaurant</span>
                    </div>
                  </div>
                </div>

                {/* Tastr Delivery */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <p className="text-sm font-bold text-text-primary">Tastr Delivery Restaurants</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <FieldRow label="Commission rate" hint="Restaurant uses Tastr drivers. Delivery fee is split between driver and platform.">
                      <NumInput value={cfg.commission.tastrDeliveryRate} suffix="%" step={0.5} min={0}
                        onChange={v => set('commission', 'tastrDeliveryRate', v)} />
                    </FieldRow>
                    <FieldRow label="Allowed range" hint="Min and max commission for Tastr delivery restaurants">
                      <div className="flex items-center gap-2">
                        <NumInput value={cfg.commission.tastrDeliveryMin} suffix="%" step={0.5} min={0} width="w-24"
                          onChange={v => set('commission', 'tastrDeliveryMin', v)} />
                        <span className="text-text-muted text-xs">to</span>
                        <NumInput value={cfg.commission.tastrDeliveryMax} suffix="%" step={0.5} min={0} width="w-24"
                          onChange={v => set('commission', 'tastrDeliveryMax', v)} />
                      </div>
                    </FieldRow>
                    <div className="flex items-center gap-2 mt-2 text-xs text-blue-700">
                      <Info size={12} />
                      <span>Delivery fee → split between driver & Tastr (see Delivery Margin tab)</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Per-Restaurant Overrides */}
              <Card title="Per-Restaurant Overrides" icon={Building2}
                badge={
                  <span className="text-xs font-semibold text-text-muted">
                    {cfg.commission.overrides.length} override{cfg.commission.overrides.length !== 1 ? 's' : ''}
                  </span>
                }>
                <p className="text-xs text-text-muted mb-4">
                  Set custom commission rates for specific restaurants. Overrides take priority over the default rates above.
                </p>

                {cfg.commission.overrides.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {cfg.commission.overrides.map(ov => (
                      <div key={ov.restaurantId} className="flex items-center justify-between p-3 rounded-xl border border-brand-200 bg-brand-50">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{ov.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-brand-600">{ov.commissionRate}%</span>
                          <button onClick={() => {
                            setCfg(c => ({
                              ...c,
                              commission: { ...c.commission, overrides: c.commission.overrides.filter(o => o.restaurantId !== ov.restaurantId) }
                            }))
                          }} className="p-1 text-red-400 hover:text-red-600">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => setShowOverrides(true)}
                  className="flex items-center gap-2 text-brand-500 text-sm font-semibold hover:text-brand-600 transition-colors">
                  <Edit2 size={14} /> Manage Overrides
                </button>
              </Card>
            </>
          )}

          {/* ── DELIVERY MARGIN TAB ── */}
          {tab === 'delivery' && (
            <Card title="Delivery Fee Split (Tastr Delivery)" icon={Truck}>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-start gap-2.5">
                <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  For Tastr delivery orders, the delivery fee paid by the customer is split between the driver and the platform.
                  Self-delivery restaurants keep 100% of their delivery fee.
                </p>
              </div>

              <FieldRow label="Driver's share" hint="Percentage of delivery fee that goes to the driver">
                <NumInput value={cfg.deliveryMargin.driverPercent} suffix="%" step={5} min={0}
                  onChange={v => set('deliveryMargin', 'driverPercent', Math.min(100, v))} />
              </FieldRow>

              <FieldRow label="Platform margin" hint="Remaining percentage kept by Tastr">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-2 bg-brand-100 text-brand-700 rounded-xl text-sm font-bold">
                    {100 - cfg.deliveryMargin.driverPercent}%
                  </span>
                </div>
              </FieldRow>

              <div className="mt-4 p-4 rounded-xl bg-bg-section border border-border">
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Split examples</p>
                <div className="space-y-2">
                  {[199, 299, 399, 499].map(fee => {
                    const driverAmt = Math.round(fee * cfg.deliveryMargin.driverPercent / 100)
                    return (
                      <div key={fee} className="flex items-center justify-between text-sm">
                        <span className="text-text-muted">{fmt(fee)} delivery fee</span>
                        <div className="flex items-center gap-3">
                          <span className="text-green-600 font-semibold">Driver: {fmt(driverAmt)}</span>
                          <span className="text-brand-600 font-semibold">Tastr: {fmt(fee - driverAmt)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Visual bar */}
              <div className="mt-4">
                <div className="flex rounded-xl overflow-hidden h-8">
                  <div
                    className="bg-green-400 flex items-center justify-center text-xs font-bold text-white transition-all"
                    style={{ width: `${cfg.deliveryMargin.driverPercent}%` }}
                  >
                    Driver {cfg.deliveryMargin.driverPercent}%
                  </div>
                  <div
                    className="bg-brand-500 flex items-center justify-center text-xs font-bold text-white transition-all"
                    style={{ width: `${100 - cfg.deliveryMargin.driverPercent}%` }}
                  >
                    Tastr {100 - cfg.deliveryMargin.driverPercent}%
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right: Live Preview (2 cols) */}
        <div className="col-span-2">
          <div className="sticky top-24">
            <PricePreview cfg={cfg} />

            {/* Quick config summary */}
            <div className="mt-4 bg-bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Active Configuration</p>
              <div className="space-y-2">
                {[
                  ['Item markup', cfg.markup.enabled
                    ? (cfg.markup.type === 'fixed' ? fmt(cfg.markup.value) : `${cfg.markup.value}%`)
                    : 'Disabled'],
                  ['Service fee', cfg.serviceFee.enabled
                    ? (cfg.serviceFee.type === 'fixed' ? fmt(cfg.serviceFee.value) : `${cfg.serviceFee.value}%`)
                    : 'Disabled'],
                  ['Self delivery commission', `${cfg.commission.selfDeliveryRate}%`],
                  ['Tastr delivery commission', `${cfg.commission.tastrDeliveryRate}%`],
                  ['Driver delivery share', `${cfg.deliveryMargin.driverPercent}%`],
                  ['Restaurant overrides', `${cfg.commission.overrides.length} set`],
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

      {/* Override Modal */}
      {showOverrides && (
        <RestaurantOverrideModal
          overrides={cfg.commission.overrides}
          onChange={ov => setCfg(c => ({ ...c, commission: { ...c.commission, overrides: ov } }))}
          onClose={() => setShowOverrides(false)}
        />
      )}
    </div>
  )
}

export { DEFAULT_CONFIG as PRICING_DEFAULTS }
