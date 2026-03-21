import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { createTopUp, confirmTopUp, fetchWallet } from '../../store/slices/walletSlice.js'
import { Button } from '../../components/global/index.jsx'
import MainLayout from '../../layouts/MainLayout.jsx'
import api from '../../services/api.js'

const AMOUNTS = [1000, 2000, 5000, 10000, 0] // 0 = other
const LABELS  = ['£10', '£20', '£50', '£100', 'Other']

// ─── Load Razorpay SDK ───────────────────────────────────────────────────────
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

export default function TopUpPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user }     = useSelector(s => s.auth)
  const { isLoading } = useSelector(s => s.wallet)
  const [selected, setSelected]   = useState(2000)
  const [custom, setCustom]       = useState('')
  const [step, setStep]           = useState('amount') // amount | gateway | card | processing | success | error
  const [clientSecret, setClientSecret] = useState(null)
  const [piId, setPiId]           = useState(null)
  const [gateway, setGateway]     = useState(null)
  const [gateways, setGateways]   = useState({ stripe: false, razorpay: false })
  const [error, setError]         = useState(null)
  const [processing, setProcessing] = useState(false)

  const amount = selected || (parseFloat(custom) * 100 || 0)

  // Check available gateways
  useEffect(() => {
    api.get('/payments/gateway-status').then(r => {
      const gw = r.data || {}
      setGateways({ stripe: !!gw.stripe, razorpay: !!gw.razorpay, razorpayKeyId: gw.razorpayKeyId })
      // Auto-select
      if (gw.razorpay) setGateway('razorpay')
      else if (gw.stripe) setGateway('stripe')
    }).catch(() => {
      // Fallback: try both
      setGateways({ stripe: true, razorpay: false })
      setGateway('stripe')
    })
  }, [])

  // ─── Stripe top-up flow ────────────────────────────────────────────────────
  const handleStripeTopUp = async () => {
    if (amount < 500) return setError('Minimum top-up is £5')
    setProcessing(true); setError(null)
    try {
      const res = await dispatch(createTopUp({ amount }))
      if (createTopUp.fulfilled.match(res)) {
        setClientSecret(res.payload.clientSecret)
        setPiId(res.payload.paymentIntentId)
        setStep('card')
      } else {
        setError('Failed to create top-up. Please try again.')
      }
    } catch { setError('Something went wrong.') }
    finally { setProcessing(false) }
  }

  const handleStripeConfirm = async () => {
    setProcessing(true); setError(null)
    try {
      const res = await dispatch(confirmTopUp({ paymentIntentId: piId }))
      if (confirmTopUp.fulfilled.match(res)) {
        dispatch(fetchWallet())
        setStep('success')
      } else {
        setError('Payment confirmation failed.')
      }
    } catch { setError('Something went wrong.') }
    finally { setProcessing(false) }
  }

  // ─── Razorpay top-up flow ─────────────────────────────────────────────────
  const handleRazorpayTopUp = useCallback(async () => {
    if (amount < 500) return setError('Minimum top-up is £5')
    setProcessing(true); setError(null)
    try {
      // Create Razorpay order on backend
      const { data } = await api.post('/razorpay/wallet-topup', {
        amount,
        currency: 'INR',
      })

      const loaded = await loadRazorpaySdk()
      if (!loaded) { setError('Failed to load Razorpay.'); setProcessing(false); return }

      const options = {
        key: data.key || gateways.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'Tastr',
        description: 'Wallet Top-Up',
        order_id: data.order.id,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#C18B3C' },
        handler: async (response) => {
          try {
            await api.post('/razorpay/wallet-topup/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount,
            })
            dispatch(fetchWallet())
            setStep('success')
          } catch (err) {
            setError(err.response?.data?.message || 'Payment verification failed.')
          }
          setProcessing(false)
        },
        modal: {
          ondismiss: () => { setProcessing(false); setError('Payment was cancelled.') },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (resp) => {
        setError(resp.error?.description || 'Payment failed.')
        setProcessing(false)
      })
      rzp.open()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate payment.')
      setProcessing(false)
    }
  }, [amount, user, gateways, dispatch])

  const handleProceed = () => {
    if (gateway === 'razorpay') handleRazorpayTopUp()
    else handleStripeTopUp()
  }

  // ─── Success screen ───────────────────────────────────────────────────────
  if (step === 'success') return (
    <MainLayout>
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Top-up Successful!</h2>
        <p className="text-text-muted mb-8">£{(amount / 100).toFixed(2)} has been added to your wallet.</p>
        <Button variant="primary" size="full" onClick={() => navigate('/wallet')}>Back to Wallet</Button>
      </div>
    </MainLayout>
  )

  return (
    <MainLayout>
      <div className="max-w-sm mx-auto px-4 py-6">
        <button onClick={() => step === 'card' ? setStep('amount') : navigate(-1)}
          className="text-brand-500 text-sm font-semibold mb-6 flex items-center gap-1">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-text-primary mb-6">Top Up Wallet</h1>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {/* ─── Step 1: Select Amount ──────────────────────────────────── */}
        {step === 'amount' && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {AMOUNTS.map((amt, i) => (
                <button key={i}
                  onClick={() => { setSelected(amt); setCustom(''); setError(null) }}
                  className={`py-3 rounded-2xl border-2 font-bold text-sm transition-all
                    ${selected === amt && (amt !== 0 || custom === '')
                      ? 'border-brand-500 bg-brand-50 text-brand-600'
                      : 'border-border text-text-primary hover:border-brand-300'}`}>
                  {LABELS[i]}
                </button>
              ))}
            </div>

            {selected === 0 && (
              <div className="mb-6">
                <label className="text-sm font-semibold text-text-primary mb-1 block">Enter amount (£)</label>
                <input type="number" min="5" max="500" value={custom}
                  onChange={e => setCustom(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full py-3 px-4 text-sm border border-border rounded-xl focus:border-brand-500 focus:outline-none bg-white" />
              </div>
            )}

            {/* ─── Payment Gateway Selection ─────────────────────────── */}
            <p className="text-sm font-bold text-text-primary mb-3">Payment method</p>
            <div className="space-y-2 mb-6">
              {gateways.razorpay && (
                <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all
                  ${gateway === 'razorpay' ? 'border-brand-500 bg-brand-50' : 'border-border bg-white hover:border-brand-300'}`}>
                  <input type="radio" name="gw" checked={gateway === 'razorpay'}
                    onChange={() => setGateway('razorpay')} className="accent-brand-500" />
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">R</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">Razorpay</p>
                    <p className="text-xs text-text-muted">UPI, Cards, Netbanking, Wallets</p>
                  </div>
                </label>
              )}

              {gateways.stripe && (
                <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all
                  ${gateway === 'stripe' ? 'border-brand-500 bg-brand-50' : 'border-border bg-white hover:border-brand-300'}`}>
                  <input type="radio" name="gw" checked={gateway === 'stripe'}
                    onChange={() => setGateway('stripe')} className="accent-brand-500" />
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">💳</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">Credit / Debit Card</p>
                    <p className="text-xs text-text-muted">Visa, Mastercard, Amex</p>
                  </div>
                </label>
              )}
            </div>

            <Button variant="primary" size="full" loading={processing} onClick={handleProceed}
              disabled={!amount || amount < 500 || !gateway}>
              {gateway === 'razorpay' ? `Pay £${(amount / 100).toFixed(2)} via Razorpay` : `Continue → £${(amount / 100).toFixed(2)}`}
            </Button>
          </>
        )}

        {/* ─── Step 2: Stripe Card Input ─────────────────────────────── */}
        {step === 'card' && (
          <div className="space-y-4">
            <div className="bg-bg-card rounded-2xl p-5 border border-border">
              <p className="text-xs text-text-muted mb-3 font-semibold uppercase tracking-wide">Card Details</p>
              {/* In production: mount Stripe CardElement here via @stripe/react-stripe-js */}
              <div className="h-12 border border-border rounded-xl flex items-center px-4 text-text-muted text-sm bg-white">
                <span className="flex items-center gap-2">💳 Enter your card details to proceed</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>🔒</span> Your payment is secure and encrypted
            </div>
            <Button variant="primary" size="full" loading={processing} onClick={handleStripeConfirm}>
              Pay £{(amount / 100).toFixed(2)}
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
