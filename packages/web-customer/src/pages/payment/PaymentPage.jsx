import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from '../../services/api.js'
import MainLayout from '../../layouts/MainLayout.jsx'
import { CreditCard, Wallet, Shield, ChevronLeft, Loader2 } from 'lucide-react'

const CARD_ICONS = { visa: '💳', mastercard: '💳', amex: '💳' }

function PriceRow({ label, value, highlight, negative }) {
  return (
    <div className={`flex justify-between py-1.5 ${highlight ? 'font-bold' : ''}`}>
      <span className={`text-sm ${highlight ? 'text-text-primary' : 'text-text-secondary'}`}>{label}</span>
      <span className={`text-sm ${negative ? 'text-green-600' : highlight ? 'text-brand-600' : 'text-text-primary'}`}>
        {negative ? '-' : ''}£{(Math.abs(value) / 100).toFixed(2)}
      </span>
    </div>
  )
}

// ─── Load Razorpay SDK dynamically ────────────────────────────────────────────
function loadRazorpaySdk() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

export default function PaymentPage() {
  const navigate       = useNavigate()
  const location       = useLocation()
  const { addressId, deliveryMethod, scheduledAt } = location.state || {}
  const cart           = useSelector(s => s.cart)
  const { user }       = useSelector(s => s.auth)

  const [savedMethods, setSavedMethods] = useState([])
  const [selectedPM,   setSelectedPM]   = useState(null)
  const [useNewCard,   setUseNewCard]   = useState(false)
  const [wallet,       setWallet]       = useState(null)
  const [gateway,      setGateway]      = useState(null) // null until we know what's available
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [gateways,     setGateways]     = useState({ stripe: false, razorpay: false, wallet: true, razorpayKeyId: null })

  useEffect(() => {
    // Check which gateways are available
    api.get('/payments/gateway-status').then(r => {
      const gw = r.data
      setGateways(gw)
      // Auto-select first available gateway
      if (gw.razorpay) setGateway('RAZORPAY')
      else if (gw.stripe) setGateway('CARD')
      else setGateway('WALLET')
    }).catch(() => {
      // Fallback: try razorpay status
      setGateway('WALLET')
    })

    // Load saved Stripe methods (will return empty if Stripe disabled)
    api.get('/payments/methods').then(r => {
      setSavedMethods(r.data.methods || [])
      if (r.data.methods?.length > 0) setSelectedPM(r.data.methods[0].id)
      else setUseNewCard(true)
    }).catch(() => setUseNewCard(true))

    // Load wallet
    api.get('/payments/wallet').then(r => setWallet(r.data.wallet)).catch(() => {})
  }, [])

  const deliveryFee   = cart.cart?.restaurantId?.deliveryFee ?? 0
  const subtotal      = cart.subtotal || 0
  const promoDiscount = cart.promoDiscount || 0
  const tip           = cart.tip || 0
  const donation      = cart.donation || 0
  const vatAmount     = Math.round((subtotal - promoDiscount) * 0.20)
  const total         = Math.max(0, subtotal + deliveryFee - promoDiscount + vatAmount + tip + donation)

  const selectGateway = (gw) => {
    setGateway(gw)
    if (gw === 'WALLET') { setSelectedPM(null); setUseNewCard(false) }
    if (gw === 'RAZORPAY') { setSelectedPM(null); setUseNewCard(false) }
    if (gw === 'CARD' && savedMethods.length > 0) setSelectedPM(savedMethods[0].id)
  }

  // ─── Razorpay Checkout ────────────────────────────────────────────────────
  const handleRazorpay = useCallback(async (orderData) => {
    const loaded = await loadRazorpaySdk()
    if (!loaded) { setError('Failed to load Razorpay. Please try again.'); return }

    const rzpOrder = orderData.razorpayOrder
    const options = {
      key: rzpOrder.key || gateways.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      name: 'Tastr',
      description: `Order payment`,
      order_id: rzpOrder.id,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: { color: '#C18B3C' },
      handler: async (response) => {
        // Verify payment on backend
        try {
          await api.post('/razorpay/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            orderId: orderData.order._id,
          })
          navigate('/order-success', { state: { order: orderData.order } })
        } catch (err) {
          const msg = err.response?.data?.message || 'Payment verification failed. Contact support.'
          setError(msg)
          setLoading(false)
        }
      },
      modal: {
        ondismiss: () => { setLoading(false); setError('Payment was cancelled.') }
      }
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', (resp) => {
      setError(resp.error?.description || 'Payment failed. Please try again.')
      setLoading(false)
    })
    rzp.open()
  }, [user, navigate])

  // ─── Pay Handler ──────────────────────────────────────────────────────────
  const handlePay = async () => {
    setLoading(true); setError(null)
    try {
      const endpoint = deliveryMethod === 'scheduled' ? '/orders/schedule' :
                       deliveryMethod === 'gift'      ? '/orders/gift'     : '/orders'

      const paymentMethod = gateway === 'RAZORPAY' ? 'RAZORPAY' : gateway === 'WALLET' ? 'WALLET' : 'CARD'

      const body = {
        deliveryAddressId: addressId,
        paymentMethod,
        paymentMethodId:   gateway === 'CARD' ? selectedPM : undefined,
        deliveryMethod:    deliveryMethod || 'standard',
      }
      if (scheduledAt) body.scheduledAt = scheduledAt
      if (deliveryMethod === 'gift') body.giftRecipient = cart.giftRecipient

      const res = await api.post(endpoint, body)

      if (res.data.razorpayOrder) {
        // Razorpay flow — open Razorpay Checkout
        await handleRazorpay(res.data)
      } else if (res.data.clientSecret) {
        // Stripe flow — redirect to Stripe confirmation
        navigate('/checkout/stripe-confirm', {
          state: { clientSecret: res.data.clientSecret, orderId: res.data.order._id, orderRef: res.data.order.orderId },
        })
      } else {
        // Wallet or free — already complete
        navigate('/order-success', { state: { order: res.data.order } })
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed. Please try again.')
      setLoading(false)
    }
  }

  const canPay = gateway === 'WALLET' || gateway === 'RAZORPAY' || (gateway === 'CARD' && (selectedPM || useNewCard))

  // No gateways available warning
  const noGateways = !gateways.stripe && !gateways.razorpay && !(wallet?.balance >= total)

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-bg-section flex items-center justify-center hover:bg-brand-50 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-text-primary">Payment</h1>
        </div>

        {/* ─── Order Summary ─────────────────────────────────────────── */}
        <div className="bg-bg-card rounded-2xl p-4 mb-5 border border-border">
          <p className="text-sm font-bold text-text-primary mb-3">Price Breakdown</p>
          <PriceRow label="Items total" value={subtotal} />
          {promoDiscount > 0 && <PriceRow label="Discount" value={promoDiscount} negative />}
          <PriceRow label="VAT (20%)" value={vatAmount} />
          <PriceRow label="Delivery" value={deliveryFee} />
          {tip > 0 && <PriceRow label="Tip" value={tip} />}
          {donation > 0 && <PriceRow label="Donation" value={donation} />}
          <div className="border-t border-border-light mt-2 pt-2">
            <PriceRow label="Total" value={total} highlight />
          </div>
        </div>

        {/* ─── Payment Gateway Selection ─────────────────────────────── */}
        <p className="text-sm font-bold text-text-primary mb-3">Choose payment method</p>
        <div className="grid grid-cols-2 gap-3 mb-5">

          {/* Card (Stripe) — only if Stripe is configured */}
          {gateways.stripe && (
            <button onClick={() => selectGateway('CARD')}
              className={`p-4 rounded-2xl border text-left transition-all ${gateway === 'CARD' ? 'border-brand-500 bg-brand-50' : 'border-border bg-bg-card hover:border-brand-300'}`}>
              <CreditCard size={20} className={gateway === 'CARD' ? 'text-brand-500' : 'text-text-muted'} />
              <p className="text-sm font-semibold text-text-primary mt-2">Credit / Debit Card</p>
              <p className="text-[11px] text-text-muted">Visa, Mastercard, Amex</p>
            </button>
          )}

          {/* Razorpay — only if Razorpay is configured */}
          {gateways.razorpay && (
            <button onClick={() => selectGateway('RAZORPAY')}
              className={`p-4 rounded-2xl border text-left transition-all ${gateway === 'RAZORPAY' ? 'border-brand-500 bg-brand-50' : 'border-border bg-bg-card hover:border-brand-300'}`}>
              <div className={`w-5 h-5 rounded flex items-center justify-center text-xs font-black ${gateway === 'RAZORPAY' ? 'bg-brand-500 text-white' : 'bg-blue-100 text-blue-600'}`}>R</div>
              <p className="text-sm font-semibold text-text-primary mt-2">Razorpay</p>
              <p className="text-[11px] text-text-muted">UPI, Cards, Netbanking</p>
            </button>
          )}

          {/* Wallet */}
          {wallet && wallet.balance >= total && (
            <button onClick={() => selectGateway('WALLET')}
              className={`p-4 rounded-2xl border text-left transition-all ${gateway === 'WALLET' ? 'border-brand-500 bg-brand-50' : 'border-border bg-bg-card hover:border-brand-300'}`}>
              <Wallet size={20} className={gateway === 'WALLET' ? 'text-brand-500' : 'text-text-muted'} />
              <p className="text-sm font-semibold text-text-primary mt-2">Tastr Wallet</p>
              <p className="text-[11px] text-text-muted">Balance: £{(wallet.balance / 100).toFixed(2)}</p>
            </button>
          )}
        </div>

        {/* ─── Stripe Saved Cards (only when CARD selected AND Stripe enabled) ── */}
        {gateway === 'CARD' && gateways.stripe && savedMethods.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-2">Saved Cards</p>
            <div className="space-y-2">
              {savedMethods.map(m => (
                <label key={m.id}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${selectedPM === m.id && !useNewCard ? 'border-brand-500 bg-brand-50' : 'border-border bg-bg-card hover:border-brand-300'}`}>
                  <input type="radio" name="card" checked={selectedPM === m.id && !useNewCard}
                    onChange={() => { setSelectedPM(m.id); setUseNewCard(false) }} className="accent-brand-500" />
                  <span className="text-xl">{CARD_ICONS[m.card?.brand] || '💳'}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary capitalize">{m.card?.brand} •••• {m.card?.last4}</p>
                    <p className="text-xs text-text-muted">Expires {m.card?.exp_month}/{m.card?.exp_year}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ─── Add New Card (Stripe) ─────────────────────────────────── */}
        {gateway === 'CARD' && (
          <div className={`p-4 rounded-2xl border cursor-pointer transition-all mb-5 ${useNewCard ? 'border-brand-500 bg-brand-50' : 'border-border bg-bg-card hover:border-brand-300'}`}
            onClick={() => { setUseNewCard(true); setSelectedPM(null) }}>
            <div className="flex items-center gap-3">
              <input type="radio" checked={useNewCard} onChange={() => {}} className="accent-brand-500" />
              <p className="text-sm font-semibold text-text-primary">+ Add New Card</p>
            </div>
            {useNewCard && (
              <div className="mt-3 pt-3 border-t border-border-light">
                <div className="bg-bg-section rounded-xl p-3 border border-border text-sm text-text-muted text-center">
                  Stripe secure card input
                  <br /><span className="text-xs">Requires @stripe/stripe-js + @stripe/react-stripe-js</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Razorpay info ─────────────────────────────────────────── */}
        {gateway === 'RAZORPAY' && (
          <div className="mb-5 p-4 rounded-2xl bg-blue-50 border border-blue-200">
            <p className="text-sm font-semibold text-blue-800">Razorpay Checkout</p>
            <p className="text-xs text-blue-600 mt-1">You will be redirected to Razorpay's secure payment page where you can pay via UPI, Cards, Netbanking, or Wallets.</p>
          </div>
        )}

        {/* ─── Wallet info ───────────────────────────────────────────── */}
        {gateway === 'WALLET' && (
          <div className="mb-5 p-4 rounded-2xl bg-green-50 border border-green-200">
            <p className="text-sm font-semibold text-green-800">Pay with Wallet</p>
            <p className="text-xs text-green-600 mt-1">£{(total / 100).toFixed(2)} will be deducted from your Tastr Wallet balance.</p>
          </div>
        )}

        {/* No gateways warning */}
        {noGateways && (
          <div className="mb-5 p-4 rounded-2xl bg-yellow-50 border border-yellow-200">
            <p className="text-sm font-semibold text-yellow-800">No payment methods available</p>
            <p className="text-xs text-yellow-600 mt-1">Please contact support or top up your wallet. The admin needs to configure Stripe or Razorpay payment keys.</p>
          </div>
        )}

        {/* Error */}
        {error && <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

        {/* Security note */}
        <p className="text-xs text-text-muted text-center flex items-center justify-center gap-1.5 mb-6">
          <Shield size={12} /> Your payment is secure and encrypted
        </p>

        {/* ─── Pay Button (INLINE, not fixed) ────────────────────────── */}
        <button
          onClick={handlePay}
          disabled={loading || !canPay}
          className="w-full py-4 rounded-2xl bg-brand-500 text-white font-bold text-base shadow-brand hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /><span>Processing…</span></>
          ) : (
            `Pay £${(total / 100).toFixed(2)}`
          )}
        </button>
      </div>
    </MainLayout>
  )
}
