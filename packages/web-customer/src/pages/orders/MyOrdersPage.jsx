import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import MainLayout from '../../layouts/MainLayout.jsx'
import {
  ArrowLeft, Package, Clock, CheckCircle2, XCircle,
  Truck, ChefHat, Star, Printer, RotateCcw, AlertTriangle,
  Phone, MessageCircle, Receipt, MapPin, CalendarDays, Filter,
} from 'lucide-react'

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  DELIVERED:       { label: 'Delivered',      color: 'bg-green-100 text-green-700 border-green-200',       icon: CheckCircle2,  dot: 'bg-green-500',   bar: 'from-green-400 to-green-500'  },
  CANCELLED:       { label: 'Cancelled',      color: 'bg-red-100 text-red-700 border-red-200',             icon: XCircle,       dot: 'bg-red-500',     bar: 'from-red-400 to-red-500'      },
  ON_WAY:          { label: 'On the Way',     color: 'bg-blue-100 text-blue-700 border-blue-200',          icon: Truck,         dot: 'bg-blue-500',    bar: 'from-blue-400 to-blue-500'    },
  PREPARING:       { label: 'Preparing',      color: 'bg-amber-100 text-amber-700 border-amber-200',       icon: ChefHat,       dot: 'bg-amber-500',   bar: 'from-amber-400 to-amber-500'  },
  PLACED:          { label: 'Placed',         color: 'bg-brand-100 text-brand-700 border-brand-200',       icon: Receipt,       dot: 'bg-brand-500',   bar: 'from-brand-400 to-brand-500'  },
  ACCEPTED:        { label: 'Accepted',       color: 'bg-cyan-100 text-cyan-700 border-cyan-200',          icon: CheckCircle2,  dot: 'bg-cyan-500',    bar: 'from-cyan-400 to-cyan-500'    },
  DRIVER_ASSIGNED: { label: 'Driver Assigned',color: 'bg-indigo-100 text-indigo-700 border-indigo-200',    icon: Truck,         dot: 'bg-indigo-500',  bar: 'from-indigo-400 to-indigo-500'},
  FAILED:          { label: 'Failed',         color: 'bg-red-100 text-red-700 border-red-200',             icon: XCircle,       dot: 'bg-red-400',     bar: 'from-red-400 to-red-500'      },
  PENDING:         { label: 'Pending',        color: 'bg-bg-section text-text-muted border-border',        icon: Clock,         dot: 'bg-border-dark', bar: 'from-gray-300 to-gray-400'    },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.PENDING
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}

// ─── Order card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onClick }) {
  const cfg      = STATUS_CFG[order.status] || STATUS_CFG.PENDING
  const date     = new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time     = new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const coverUrl = order.restaurantId?.coverPhotos?.[0]?.url || order.restaurantId?.logoUrl

  return (
    <div onClick={onClick}
      className="group bg-bg-card rounded-2xl border border-border hover:border-brand-300 hover:shadow-lift transition-all cursor-pointer overflow-hidden">

      {/* Gradient status bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${cfg.bar}`} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Restaurant thumbnail */}
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-brand-50 flex-shrink-0 border border-border-light">
            {coverUrl
              ? <img src={coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              : <div className="w-full h-full flex items-center justify-center text-2xl">🍽</div>}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-sm text-text-primary leading-tight truncate pr-1">
                {order.restaurantId?.name || 'Restaurant'}
              </p>
              <StatusBadge status={order.status} />
            </div>

            <div className="flex items-center gap-2 mt-1.5 text-xs text-text-muted">
              <CalendarDays size={10} />
              <span>{date}</span>
              <span className="text-border">·</span>
              <Clock size={10} />
              <span>{time}</span>
            </div>

            <div className="flex items-center justify-between mt-2.5">
              <span className="text-xs text-text-muted font-mono bg-bg-section px-2 py-0.5 rounded-full border border-border-light">
                {order.orderId}
              </span>
              <span className="font-black text-brand-600 text-base">
                £{((order.total || 0) / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Item pills */}
        {order.items?.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {order.items.slice(0, 3).map((item, i) => (
              <span key={i} className="text-xs bg-bg-section text-text-secondary px-2.5 py-1 rounded-full border border-border-light">
                {item.quantity > 1 && <span className="font-bold">{item.quantity}× </span>}
                {item.name}
              </span>
            ))}
            {order.items.length > 3 && (
              <span className="text-xs bg-brand-50 text-brand-600 px-2.5 py-1 rounded-full border border-brand-200 font-semibold">
                +{order.items.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Rating modal ─────────────────────────────────────────────────────────────
function StarRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-light last:border-0">
      <span className="text-sm font-semibold text-text-primary">{label}</span>
      <div className="flex gap-1">
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => onChange(n)}
            className={`text-2xl transition-all hover:scale-110 ${n <= value ? '' : 'opacity-20 grayscale'}`}>⭐</button>
        ))}
      </div>
    </div>
  )
}

export function RatingModal({ order, onClose, onSubmitted }) {
  const [restaurantRating, setRestaurantRating] = useState(0)
  const [driverRating,     setDriverRating]     = useState(0)
  const [appRating,        setAppRating]        = useState(0)
  const [comment,          setComment]          = useState('')
  const [submitting,       setSubmitting]       = useState(false)

  async function submit() {
    if (!restaurantRating) return
    setSubmitting(true)
    try {
      await api.post(`/orders/${order._id}/rate`, {
        restaurantRating,
        driverRating:    driverRating || undefined,
        appRating:       appRating    || undefined,
        restaurantComment: comment,
      })
      onSubmitted?.()
      onClose()
    } catch { } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="bg-bg-card rounded-3xl w-full max-w-md shadow-modal p-6 animate-slide-up md:animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Rate Your Order</h3>
            <p className="text-xs text-text-muted mt-0.5">How was your experience?</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-bg-section flex items-center justify-center text-text-muted hover:bg-brand-50 transition-colors text-lg">✕</button>
        </div>
        <div className="divide-y divide-border-light">
          <StarRow label="🍽 Restaurant"   value={restaurantRating} onChange={setRestaurantRating} />
          {order.driverId && <StarRow label="🛵 Driver" value={driverRating} onChange={setDriverRating} />}
          <StarRow label="📱 App Experience" value={appRating} onChange={setAppRating} />
        </div>
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Share your experience… (optional)" rows={3}
          className="w-full mt-4 border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 resize-none bg-bg-input" />
        <button onClick={submit} disabled={!restaurantRating || submitting}
          className="w-full mt-4 py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-sm disabled:opacity-40 hover:bg-brand-600 transition-colors">
          {submitting ? 'Submitting…' : 'Submit Review'}
        </button>
      </div>
    </div>
  )
}

// ─── MyOrdersPage ─────────────────────────────────────────────────────────────
export default function MyOrdersPage() {
  const navigate = useNavigate()
  const [tab,      setTab]      = useState('active')
  const [orders,   setOrders]   = useState([])
  const [page,     setPage]     = useState(1)
  const [hasMore,  setHasMore]  = useState(true)
  const [loading,  setLoading]  = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const loaderRef = useRef(null)

  const ACTIVE_STATUSES = ['PLACED','ACCEPTED','PREPARING','DRIVER_ASSIGNED','ON_WAY']
  const PAST_STATUSES   = ['DELIVERED','CANCELLED','FAILED']

  const fetchOrders = useCallback(async (reset = false) => {
    if (loading) return
    setLoading(true)
    const p = reset ? 1 : page
    try {
      const statusFilter = tab === 'active' ? ACTIVE_STATUSES.join(',') : PAST_STATUSES.join(',')
      const params = new URLSearchParams({ page: p, limit: 15, status: statusFilter })
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo)   params.set('dateTo',   dateTo)
      const r = await api.get(`/orders?${params}`)
      const newOrders = r.data.orders || []
      setOrders(prev => reset ? newOrders : [...prev, ...newOrders])
      setHasMore(newOrders.length === 15)
      if (!reset) setPage(p => p + 1)
    } catch { } finally { setLoading(false) }
  }, [tab, page, dateFrom, dateTo])

  useEffect(() => {
    setOrders([])
    setPage(1)
    setHasMore(true)
    fetchOrders(true)
  }, [tab, dateFrom, dateTo])

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchOrders()
    }, { threshold: 0.1 })
    if (loaderRef.current) obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [hasMore, loading, fetchOrders])

  const hasDateFilter = dateFrom || dateTo

  return (
    <MainLayout>
      <div className="px-4 lg:px-8 pt-6 pb-10 max-w-4xl mx-auto">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-bg-section flex items-center justify-center hover:bg-brand-50 transition-colors flex-shrink-0">
            <ArrowLeft size={18} className="text-text-secondary" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-text-primary">My Orders</h1>
            <p className="text-xs text-text-muted">Track and manage your orders</p>
          </div>
          {/* Filter button — only for past */}
          {tab === 'past' && (
            <button onClick={() => setShowFilter(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                ${showFilter || hasDateFilter
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'bg-bg-card border-border text-text-secondary hover:border-brand-400'}`}>
              <Filter size={13} />
              {hasDateFilter ? 'Filtered' : 'Filter'}
            </button>
          )}
        </div>

        {/* ── Group Orders quick link ─────────────────────────── */}
        <button onClick={() => navigate('/groups/my')}
          className="w-full flex items-center gap-3 bg-bg-card rounded-2xl border border-border hover:border-brand-300 p-4 mb-5 transition-colors text-left">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-lg flex-shrink-0">👥</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text-primary">Group Orders</p>
            <p className="text-xs text-text-muted">Create or view shared group orders</p>
          </div>
          <span className="text-brand-500 text-sm font-semibold">View →</span>
        </button>

        {/* ── Tab row ────────────────────────────────────────── */}
        <div className="flex gap-2 mb-5 bg-bg-section rounded-2xl p-1.5 border border-border-light">
          {[
            { key: 'active', emoji: '🕐', label: 'Active' },
            { key: 'past',   emoji: '📦', label: 'Past'   },
          ].map(({ key, emoji, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${tab === key
                  ? 'bg-bg-card text-brand-600 shadow-sm border border-border'
                  : 'text-text-muted hover:text-text-secondary'}`}>
              <span>{emoji}</span>
              {label}
              {tab === key && orders.length > 0 && (
                <span className="ml-1 bg-brand-500 text-white text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {orders.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Date filter ────────────────────────────────────── */}
        {tab === 'past' && showFilter && (
          <div className="bg-bg-card rounded-2xl border border-border p-4 mb-5 animate-fade-in">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CalendarDays size={11} />Filter by date range
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-text-muted mb-1">From</p>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 bg-bg-input" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-text-muted mb-1">To</p>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 bg-bg-input" />
              </div>
              {hasDateFilter && (
                <button onClick={() => { setDateFrom(''); setDateTo('') }}
                  className="mt-5 px-3 py-2 text-xs text-red-500 font-semibold hover:bg-red-50 rounded-xl transition-colors border border-red-200">
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Orders grid ────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map(order => (
            <OrderCard key={order._id} order={order} onClick={() => navigate(`/orders/${order._id}`)} />
          ))}
        </div>

        {/* Loading spinner */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4 border-2 border-brand-100">
              <Package size={32} className="text-brand-300" />
            </div>
            <h3 className="font-bold text-text-primary text-lg">
              {tab === 'active' ? 'No active orders' : 'No past orders'}
            </h3>
            <p className="text-sm text-text-muted mt-1 max-w-xs">
              {tab === 'active'
                ? "You don't have any orders in progress right now"
                : hasDateFilter
                  ? 'No orders found in this date range'
                  : 'Your completed orders will appear here'}
            </p>
            {tab === 'active' && (
              <button onClick={() => navigate('/home')}
                className="mt-5 px-6 py-3 rounded-2xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-colors shadow-btn">
                Order Now
              </button>
            )}
            {tab === 'past' && hasDateFilter && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }}
                className="mt-4 px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-bg-section transition-colors">
                Clear filters
              </button>
            )}
          </div>
        )}

        <div ref={loaderRef} className="h-4" />
      </div>
    </MainLayout>
  )
}

// ─── OrderDetailPage ──────────────────────────────────────────────────────────
export function OrderDetailPage() {
  const { orderId } = useParams()
  const navigate    = useNavigate()
  const [order,      setOrder]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [showRating, setShowRating] = useState(false)

  useEffect(() => {
    api.get(`/orders/${orderId}`)
      .then(r => setOrder(r.data.order))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orderId])

  const reorder = async () => {
    if (!order) return
    try {
      for (const item of order.items) {
        if (!item.menuItemId) continue
        await api.post('/cart/items', {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          selectedToppings: item.selectedToppings || [],
          note: item.note,
        })
      }
      navigate('/cart')
    } catch (e) { alert(e.response?.data?.message || 'Could not reorder') }
  }

  if (loading) return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!order) return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center">
      <div className="text-center">
        <Package size={48} className="text-brand-200 mx-auto mb-3" />
        <p className="text-text-muted">Order not found</p>
      </div>
    </div>
  )

  const isDelivered = order.status === 'DELIVERED'
  const cfg  = STATUS_CFG[order.status] || STATUS_CFG.PENDING
  const date = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <>
      <div className="min-h-screen bg-bg-page print:bg-white">
        {/* Header */}
        <div className="bg-bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-20 print:hidden lg:pl-64">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-bg-section flex items-center justify-center hover:bg-brand-50 transition-colors">
            <ArrowLeft size={18} className="text-text-secondary" />
          </button>
          <div className="flex-1">
            <p className="font-bold text-text-primary">Order Details</p>
            <p className="text-xs text-text-muted font-mono">{order.orderId}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="max-w-2xl mx-auto px-4 lg:px-8 py-5 space-y-4 print:max-w-full">

          {/* Invoice header */}
          <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
            <div className={`h-1.5 w-full bg-gradient-to-r ${cfg.bar}`} />
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">Invoice</p>
                  <p className="font-black text-2xl text-text-primary mt-0.5">INV-{order.orderId}</p>
                  <p className="text-xs text-text-muted mt-1.5 flex items-center gap-1.5">
                    <Clock size={11} />{date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-muted font-medium">{order.restaurantId?.name}</p>
                  <p className="font-black text-brand-600 text-xl mt-1">£{((order.total || 0) / 100).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery address */}
          {order.deliveryAddress && (
            <div className="bg-bg-card rounded-2xl border border-border p-4">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <MapPin size={11} />Delivery Address
              </p>
              <p className="text-sm font-semibold text-text-primary">
                {order.deliveryAddress.line1 || order.deliveryAddress.addressLine1}
                {(order.deliveryAddress.line2 || order.deliveryAddress.addressLine2)
                  ? `, ${order.deliveryAddress.line2 || order.deliveryAddress.addressLine2}` : ''}
              </p>
              <p className="text-sm text-text-secondary mt-0.5">
                {order.deliveryAddress.city}, {order.deliveryAddress.postcode}
              </p>
            </div>
          )}

          {/* Items */}
          <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border-light bg-bg-section">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Items Ordered ({order.items?.length})
              </p>
            </div>
            <div className="divide-y divide-border-light">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4">
                  {item.photoUrl && (
                    <img src={item.photoUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between gap-2">
                      <p className="text-sm font-bold text-text-primary">{item.quantity}× {item.name}</p>
                      <p className="text-sm font-bold text-brand-600 flex-shrink-0">
                        £{((item.subtotal || item.price * item.quantity) / 100).toFixed(2)}
                      </p>
                    </div>
                    {item.selectedToppings?.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.selectedToppings.map((t, j) => (
                          <p key={j} className="text-xs text-text-muted">
                            + {t.optionName} {t.price > 0 ? `£${(t.price / 100).toFixed(2)}` : ''}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price summary */}
          <div className="bg-bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Price Summary</p>
            <div className="space-y-2">
              {[
                { label: 'Subtotal',   value: order.subtotal,    show: true },
                { label: 'Discount',   value: -order.discount,   show: (order.discount||0) > 0, green: true },
                { label: 'Delivery',   value: order.deliveryFee, show: true },
                { label: 'VAT (20%)', value: order.vatAmount,   show: true },
                { label: 'Driver tip', value: order.tip,         show: (order.tip||0) > 0 },
                { label: 'Donation',   value: order.donation,    show: (order.donation||0) > 0 },
              ].filter(r => r.show).map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{row.label}</span>
                  <span className={row.green ? 'text-green-600 font-semibold' : 'text-text-primary'}>
                    {row.green ? '-' : ''}£{(Math.abs(row.value || 0) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-base border-t border-border-light pt-2.5 mt-1">
                <span className="text-text-primary">Total</span>
                <span className="text-brand-600">£{((order.total || 0) / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Payment</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary capitalize">
                  {order.paymentMethod?.toLowerCase() || 'Card'}
                </p>
                {order.last4 && <p className="text-xs text-text-muted">•••• {order.last4}</p>}
              </div>
              <span className="text-xs bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full border border-green-200 flex items-center gap-1">
                <CheckCircle2 size={11} /> Paid
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button onClick={reorder}
              className="w-full py-4 rounded-2xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-colors flex items-center justify-center gap-2 shadow-btn">
              <RotateCcw size={16} /> Reorder
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => window.print()}
                className="py-3 rounded-2xl border border-border text-text-secondary font-semibold text-sm hover:bg-bg-section transition-colors flex items-center justify-center gap-2">
                <Printer size={15} /> Print Receipt
              </button>
              {isDelivered && !order.isRated && (
                <button onClick={() => setShowRating(true)}
                  className="py-3 rounded-2xl border border-brand-300 text-brand-600 font-semibold text-sm hover:bg-brand-50 transition-colors flex items-center justify-center gap-2">
                  <Star size={15} /> Rate Order
                </button>
              )}
            </div>
            {isDelivered && (
              <button onClick={() => navigate(`/complaints/new?orderId=${order._id}`)}
                className="w-full py-3 rounded-2xl border border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                <AlertTriangle size={15} /> Report a Problem
              </button>
            )}
          </div>

          {/* Help */}
          <div className="bg-bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-xs text-text-muted mb-3">Need help with this order?</p>
            <div className="flex gap-3">
              <a href="tel:+448001234567"
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-bg-section transition-colors flex items-center justify-center gap-1.5">
                <Phone size={13} /> Call us
              </a>
              <button onClick={() => navigate(`/tracking/${order._id}`)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-bg-section transition-colors flex items-center justify-center gap-1.5">
                <MessageCircle size={13} /> Live Chat
              </button>
            </div>
          </div>
        </div>
      </div>

      {showRating && (
        <RatingModal
          order={order}
          onClose={() => setShowRating(false)}
          onSubmitted={() => setOrder(o => ({ ...o, isRated: true }))}
        />
      )}
    </>
  )
}
