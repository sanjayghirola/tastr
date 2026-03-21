import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchCart, apiRemoveItem, apiUpdateItem, apiApplyPromo, apiRemovePromo,
  apiClearCart, apiUpdateExtras, clearPromoMessages, dismissClearedWarning,
} from '../../store/slices/cartSlice.js'
import { ConfirmModal } from '../../components/global/index.jsx'
import MainLayout from '../../layouts/MainLayout.jsx'
import { ArrowLeft, Trash2, ShoppingCart, X, Search, Loader2 } from 'lucide-react'
import api from '../../services/api.js'

const CHARITY_AMOUNTS = [1000, 2000, 3000, 4000, 5000, 10000]
const TIP_AMOUNTS     = [100, 200, 300, 500, 1000]

function PriceRow({ label, value, highlight = false, negative = false }) {
  const display = `${negative ? '-' : ''}£${(Math.abs(value) / 100).toFixed(2)}`
  return (
    <div className={`flex justify-between items-center py-1.5 ${highlight ? 'font-bold' : ''}`}>
      <span className={`text-sm ${highlight ? 'text-text-primary' : 'text-text-secondary'}`}>{label}</span>
      <span className={`text-sm ${negative ? 'text-green-600 font-semibold' : highlight ? 'text-brand-600 text-base font-bold' : 'text-text-primary'}`}>{display}</span>
    </div>
  )
}

function AmountPillRow({ amounts, selected, onChange, label, currency = true }) {
  const [custom, setCustom] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  return (
    <div>
      {label && <p className="text-xs text-text-secondary mb-2">{label}</p>}
      <div className="flex gap-2 flex-wrap">
        {amounts.map(a => (
          <button key={a} onClick={() => onChange(selected === a ? 0 : a)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all
              ${selected === a ? 'bg-brand-500 border-brand-500 text-white' : 'bg-bg-card border-border text-text-secondary hover:border-brand-400'}`}>
            {currency ? `£${(a / 100).toFixed(0)}` : a}
          </button>
        ))}
        <button onClick={() => setShowCustom(v => !v)}
          className="px-3 py-1.5 rounded-full text-sm font-semibold border border-dashed border-brand-300 text-brand-500 hover:bg-brand-50 transition-all">
          Other
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-text-muted">{currency ? '£' : ''}</span>
          <input type="number" min="0" value={custom} onChange={e => setCustom(e.target.value)}
            placeholder="0.00" className="flex-1 border border-border rounded-xl px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          <button onClick={() => { onChange(Math.round(parseFloat(custom || 0) * 100)); setShowCustom(false) }}
            className="px-3 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold">Set</button>
        </div>
      )}
    </div>
  )
}

// ─── Promo Code Picker Modal ──────────────────────────────────────────────────
function PromoPickerModal({ onClose, onSelect }) {
  const [promos, setPromos]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    api.get('/promos').then(r => {
      setPromos(r.data.promos || r.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = promos.filter(p => {
    if (!search) return true
    return p.code?.toLowerCase().includes(search.toLowerCase()) ||
           p.title?.toLowerCase().includes(search.toLowerCase()) ||
           p.description?.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-lg font-bold text-text-primary">Select Promo Codes</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg-section flex items-center justify-center"><X size={16} /></button>
        </div>

        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 bg-bg-section border border-border rounded-xl px-3 py-2.5">
            <Search size={16} className="text-text-muted flex-shrink-0" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search promo codes..." className="flex-1 bg-transparent text-sm focus:outline-none text-text-primary placeholder:text-text-muted" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              {search ? 'No promos matching your search' : 'No available promo codes'}
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-text-muted mb-3">Available promo codes</p>
              <div className="space-y-3">
                {filtered.map(p => (
                  <div key={p._id || p.code} className="bg-bg-card rounded-2xl p-4 border border-border hover:border-brand-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-base font-bold text-brand-500">{p.code}</p>
                      <button onClick={() => { onSelect(p.code); onClose() }}
                        className="px-4 py-1.5 rounded-full bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-colors">
                        Apply
                      </button>
                    </div>
                    {p.title && <p className="text-sm font-semibold text-text-primary">{p.title}</p>}
                    {p.description && <p className="text-xs text-text-muted mt-0.5">{p.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                      {p.expiresAt && (
                        <span className="flex items-center gap-1">📅 Expires {new Date(p.expiresAt).toLocaleDateString('en-GB')}</span>
                      )}
                      {p.minOrderAmount > 0 && (
                        <span className="flex items-center gap-1">⏱ Min £{(p.minOrderAmount / 100).toFixed(0)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CartPage() {
  const navigate   = useNavigate()
  const dispatch   = useDispatch()
  const { items, subtotal, promoCode, promoDiscount, tip, donation,
          isGift, giftRecipient, customerNote, disposableEssentials,
          isLoading, promoLoading, promoError, promoSuccess, clearedCartWarning,
          cart } = useSelector(s => s.cart)
  const restaurant = cart?.restaurantId

  const [promoInput,     setPromoInput]     = useState('')
  const [showDonation,   setShowDonation]   = useState(false)
  const [showGiftFields, setShowGiftFields] = useState(isGift)
  const [confirmClear,   setConfirmClear]   = useState(false)
  const [showPromoModal, setShowPromoModal] = useState(false)

  useEffect(() => { dispatch(fetchCart()) }, [dispatch])
  useEffect(() => { if (promoCode) setPromoInput(promoCode) }, [promoCode])

  const deliveryFee = restaurant?.deliveryFee ?? 0
  const serviceFee  = cart?.serviceFee ?? 0         // from backend platform config
  const markupTotal = cart?.markupTotal ?? 0         // total markup included in subtotal (for reporting only)
  const vatAmount   = Math.round((subtotal - promoDiscount) * 0.20)
  const total       = Math.max(0, subtotal + deliveryFee + serviceFee - promoDiscount + vatAmount + tip + donation)

  const handleQty = (item, delta) => {
    const newQty = item.quantity + delta
    if (newQty <= 0) dispatch(apiRemoveItem(item._id))
    else dispatch(apiUpdateItem({ itemId: item._id, quantity: newQty }))
  }

  const handleExtras = (data) => dispatch(apiUpdateExtras(data))

  // Empty cart
  if (!isLoading && items.length === 0) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-4">
            <ShoppingCart size={36} className="text-brand-300" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Your cart is empty</h2>
          <p className="text-sm text-text-muted mt-2 mb-6">Add items from a restaurant to get started</p>
          <button onClick={() => navigate('/home')} className="px-6 py-3 rounded-2xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors">
            Start Ordering
          </button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <ConfirmModal
        isOpen={clearedCartWarning}
        onClose={() => dispatch(dismissClearedWarning())}
        onConfirm={() => dispatch(dismissClearedWarning())}
        title="Cart updated"
        message="Your previous cart was cleared because you added items from a different restaurant."
        confirmLabel="OK"
        variant="primary"
      />
      <ConfirmModal
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => { dispatch(apiClearCart()); setConfirmClear(false) }}
        title="Clear cart?"
        message="All items will be removed from your cart."
        confirmLabel="Clear Cart"
        variant="danger"
      />

      <div className="px-4 lg:px-8 pt-6 pb-36 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-bg-section flex items-center justify-center hover:bg-brand-50 transition-colors">
            <ArrowLeft size={18} className="text-text-secondary" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-text-primary">My Cart</h1>
            {restaurant?.name && <p className="text-xs text-text-muted">{restaurant.name}</p>}
          </div>
          <button onClick={() => setConfirmClear(true)} className="flex items-center gap-1 text-xs text-red-500 font-semibold hover:text-red-600 transition-colors">
            <Trash2 size={13} />Clear
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><div className="spinner spinner-lg" /></div>
        ) : (
          <div className="space-y-4">
            {/* Cart items */}
            <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border-light bg-bg-section">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Items ({items.length})</p>
              </div>
              <div className="divide-y divide-border-light">
                {items.map(item => {
                  const toppingTotal = (item.selectedToppings || []).reduce((s, t) => s + t.price, 0)
                  const unitPrice    = item.price + toppingTotal
                  return (
                    <div key={item._id} className="flex gap-3 p-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-brand-50 flex-shrink-0">
                        {item.photoUrl
                          ? <img src={item.photoUrl} className="w-full h-full object-cover" alt={item.name} />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">🍽</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{item.name}</p>
                        {(item.selectedToppings || []).length > 0 && (
                          <p className="text-xs text-text-muted mt-0.5 truncate">{item.selectedToppings.map(t => t.optionName).join(', ')}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold text-brand-600">£{(unitPrice / 100).toFixed(2)}</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleQty(item, -1)} className="w-7 h-7 rounded-full border-2 border-brand-400 text-brand-500 font-bold flex items-center justify-center hover:bg-brand-50 transition-colors">−</button>
                            <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                            <button onClick={() => handleQty(item, +1)} className="w-7 h-7 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center hover:bg-brand-600 transition-colors">+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Extras */}
            {/* Donation */}
            <div className="bg-bg-card rounded-2xl p-4 border border-border">
              <button className="w-full flex items-center justify-between" onClick={() => setShowDonation(v => !v)}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🤝</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-text-primary">Donate to charity</p>
                    <p className="text-xs text-text-muted">Help feed those in need</p>
                  </div>
                </div>
                <span className={`text-text-muted transition-transform ${showDonation ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {showDonation && (
                <div className="mt-3 pt-3 border-t border-border-light">
                  <AmountPillRow amounts={CHARITY_AMOUNTS} selected={donation} onChange={v => handleExtras({ donation: v })} />
                </div>
              )}
            </div>

            {/* Order notes */}
            <div className="bg-bg-card rounded-2xl p-4 border border-border">
              <p className="text-sm font-semibold text-text-primary mb-2">📝 Order instructions</p>
              <textarea
                value={customerNote}
                onChange={e => handleExtras({ customerNote: e.target.value })}
                placeholder="Any special instructions for the restaurant?"
                rows={2}
                className="w-full border border-border rounded-xl p-3 text-sm resize-none focus:border-brand-500 focus:outline-none bg-bg-input"
              />
            </div>

            {/* Disposable essentials */}
            <label className="flex items-center justify-between bg-bg-card rounded-2xl p-4 border border-border cursor-pointer hover:bg-brand-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xl">🥄</span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Disposable essentials</p>
                  <p className="text-xs text-text-muted">Cutlery, straws, tissues</p>
                </div>
              </div>
              <input type="checkbox" checked={disposableEssentials}
                onChange={e => handleExtras({ disposableEssentials: e.target.checked })}
                className="w-5 h-5 accent-brand-500 rounded" />
            </label>

            {/* Send as gift */}
            <div className="bg-bg-card rounded-2xl p-4 border border-border">
              <button className="w-full flex items-center justify-between" onClick={() => { setShowGiftFields(v => !v); handleExtras({ isGift: !isGift }) }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎁</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-text-primary">Send as gift</p>
                    <p className="text-xs text-text-muted">Deliver to someone else</p>
                  </div>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors ${isGift ? 'bg-brand-500' : 'bg-border-dark'} relative flex-shrink-0`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isGift ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </button>
              {showGiftFields && (
                <div className="mt-3 pt-3 border-t border-border-light">
                  <button onClick={() => navigate('/checkout/gift')} className="w-full text-center text-sm text-brand-500 font-semibold py-2 rounded-xl hover:bg-brand-50 transition-colors">
                    Add gift recipient details →
                  </button>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-bg-card rounded-2xl p-4 border border-border">
              <p className="text-sm font-semibold text-text-primary mb-3">💚 Tip your driver</p>
              <AmountPillRow amounts={TIP_AMOUNTS} selected={tip} onChange={v => handleExtras({ tip: v })} />
            </div>

            {/* Promo code */}
            <div className="bg-bg-card rounded-2xl p-4 border border-border">
              <p className="text-sm font-semibold text-text-primary mb-2">🏷 Add promo code</p>
              {promoSuccess ? (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-sm text-green-700 font-medium">{promoSuccess}</p>
                  <button onClick={() => { dispatch(apiRemovePromo()); setPromoInput('') }} className="text-xs text-red-500 font-semibold">Remove</button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input type="text" value={promoInput}
                      onChange={e => setPromoInput(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && dispatch(apiApplyPromo(promoInput))}
                      placeholder="Enter promo code"
                      className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm uppercase tracking-wider focus:border-brand-500 focus:outline-none bg-bg-input" />
                    <button
                      onClick={() => setShowPromoModal(true)}
                      className="px-4 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-semibold hover:border-brand-300 transition-colors bg-bg-card">
                      Choose
                    </button>
                  </div>
                  {promoInput && (
                    <button
                      onClick={() => dispatch(apiApplyPromo(promoInput))}
                      disabled={!promoInput || promoLoading}
                      className="mt-2 w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 disabled:opacity-50 transition-colors">
                      {promoLoading ? '…' : 'Apply Code'}
                    </button>
                  )}
                  {promoError && <p className="text-xs text-red-500 mt-1.5">{promoError}</p>}
                </>
              )}
            </div>
            {showPromoModal && (
              <PromoPickerModal
                onClose={() => setShowPromoModal(false)}
                onSelect={(code) => {
                  setPromoInput(code)
                  dispatch(apiApplyPromo(code))
                }}
              />
            )}

            {/* Price breakdown */}
            <div className="bg-bg-card rounded-2xl p-4 border border-border">
              <p className="text-sm font-bold text-text-primary mb-3">Price Breakdown</p>
              <PriceRow label="Items total"       value={subtotal} />
              {promoDiscount > 0 && <PriceRow label="Discount" value={promoDiscount} negative />}
              <PriceRow label="VAT (20%)"         value={vatAmount} />
              {serviceFee > 0 && <PriceRow label="Service fee" value={serviceFee} />}
              <PriceRow label="Delivery"          value={deliveryFee} />
              {tip > 0      && <PriceRow label="Driver tip"        value={tip} />}
              {donation > 0 && <PriceRow label="Charity donation"  value={donation} />}
              <div className="border-t border-border-light mt-2 pt-2">
                <PriceRow label="Total" value={total} highlight />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Checkout button — fixed on mobile, inline on desktop */}
      {items.length > 0 && (
        <>
          {/* Desktop: inline button inside content flow */}
          <div className="hidden lg:flex justify-center px-4 lg:px-8 pb-10 pt-4">
            <button
              onClick={() => navigate('/checkout')}
              className="w-full max-w-3xl py-4 rounded-2xl bg-brand-500 text-white font-bold text-base flex items-center justify-between px-5 shadow-brand hover:bg-brand-600 transition-colors"
            >
              <span className="bg-white/20 rounded-full w-7 h-7 text-sm flex items-center justify-center font-black">🛒</span>
              <span>Proceed to Checkout</span>
              <span className="text-white/90 font-bold">£{(total / 100).toFixed(2)}</span>
            </button>
          </div>
          {/* Mobile: fixed at bottom */}
          <div className="lg:hidden fixed bottom-20 left-0 right-0 px-4 z-30 flex justify-center pointer-events-none">
            <button
              onClick={() => navigate('/checkout')}
              className="w-full max-w-3xl py-4 rounded-2xl bg-brand-500 text-white font-bold text-base flex items-center justify-between px-5 shadow-brand hover:bg-brand-600 transition-colors pointer-events-auto"
            >
              <span className="bg-white/20 rounded-full w-7 h-7 text-sm flex items-center justify-center font-black">🛒</span>
              <span>Proceed to Checkout</span>
              <span className="text-white/90 font-bold">£{(total / 100).toFixed(2)}</span>
            </button>
          </div>
        </>
      )}
    </MainLayout>
  )
}
