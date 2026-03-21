import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchMyGiftCards, purchaseGiftCard, confirmGiftCard, redeemGiftCard } from '../../store/slices/walletSlice.js'
import { Button, Input } from '../../components/global/index.jsx'
import MainLayout from '../../layouts/MainLayout.jsx'
import api from '../../services/api.js'

const VALUES = [1000, 2500, 5000, 10000, 20000, 50000]
const TABS   = ['Active', 'Used', 'Expired']

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

function GiftCardItem({ card, onCopy }) {
  const statusColor = { active: 'text-green-600 bg-green-50', used: 'text-text-muted bg-bg-section', expired: 'text-red-500 bg-red-50' }
  return (
    <div className="bg-bg-card rounded-2xl p-5 border border-border">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-brand-500 text-lg">£{(card.value / 100).toFixed(2)}</p>
          {card.balance !== card.value && (
            <p className="text-xs text-text-muted">Remaining: £{(card.balance / 100).toFixed(2)}</p>
          )}
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${statusColor[card.status] || statusColor.active}`}>
          {card.status}
        </span>
      </div>
      <div className="flex items-center gap-2 bg-bg-section rounded-xl px-3 py-2 mb-3">
        <span className="font-mono text-sm text-text-primary flex-1">{card.code}</span>
        <button onClick={() => onCopy(card.code)} className="text-brand-500 text-xs font-semibold">Copy</button>
      </div>
      <p className="text-xs text-text-muted">Expires: {new Date(card.expiresAt).toLocaleDateString('en-GB')}</p>
    </div>
  )
}

export default function GiftCardsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const { giftCards, isLoading } = useSelector(s => s.wallet)
  const [tab, setTab]           = useState('Active')
  const [selValue, setSelValue] = useState(5000)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemMsg, setRedeemMsg]   = useState(null)
  const [purchased, setPurchased]   = useState(null)
  const [purchasing, setPurchasing] = useState(false)
  const [error, setError]           = useState(null)
  const [gateways, setGateways]     = useState({ stripe: false, razorpay: false })

  useEffect(() => {
    dispatch(fetchMyGiftCards())
    api.get('/payments/gateway-status').then(r => {
      setGateways({ stripe: !!r.data.stripe, razorpay: !!r.data.razorpay, razorpayKeyId: r.data.razorpayKeyId })
    }).catch(() => {})
  }, [dispatch])

  const filteredCards = giftCards.filter(c => c.status.toLowerCase() === tab.toLowerCase()
    || (tab === 'Active' && c.status === 'active'))

  // ─── Razorpay purchase flow ────────────────────────────────────────────────
  const handleRazorpayPurchase = useCallback(async () => {
    setPurchasing(true); setError(null)
    try {
      const { data } = await api.post('/gift-cards/purchase', { value: selValue, gateway: 'RAZORPAY' })
      if (!data.razorpayOrder) { setError('Failed to create order.'); setPurchasing(false); return }

      const loaded = await loadRazorpaySdk()
      if (!loaded) { setError('Failed to load Razorpay.'); setPurchasing(false); return }

      const options = {
        key: data.razorpayOrder.key || gateways.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.razorpayOrder.amount,
        currency: data.razorpayOrder.currency,
        name: 'Tastr',
        description: `Gift Card £${(selValue / 100).toFixed(0)}`,
        order_id: data.razorpayOrder.id,
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
        theme: { color: '#C18B3C' },
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/gift-cards/purchase/verify-razorpay', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              value: selValue,
            })
            setPurchased(verifyRes.data.giftCard)
            dispatch(fetchMyGiftCards())
          } catch (err) {
            setError(err.response?.data?.message || 'Payment verification failed.')
          }
          setPurchasing(false)
        },
        modal: { ondismiss: () => { setPurchasing(false) } },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (resp) => {
        setError(resp.error?.description || 'Payment failed.')
        setPurchasing(false)
      })
      rzp.open()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate payment.')
      setPurchasing(false)
    }
  }, [selValue, user, gateways, dispatch])

  // ─── Stripe purchase flow (original) ───────────────────────────────────────
  const handleStripePurchase = async () => {
    setPurchasing(true); setError(null)
    const res = await dispatch(purchaseGiftCard({ value: selValue }))
    if (purchaseGiftCard.fulfilled.match(res)) {
      const confirmRes = await dispatch(confirmGiftCard({ paymentIntentId: res.payload.paymentIntentId }))
      if (confirmGiftCard.fulfilled.match(confirmRes)) {
        setPurchased(confirmRes.payload.giftCard)
        dispatch(fetchMyGiftCards())
      }
    }
    setPurchasing(false)
  }

  const handlePurchase = () => {
    if (gateways.razorpay) handleRazorpayPurchase()
    else handleStripePurchase()
  }

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return
    const res = await dispatch(redeemGiftCard({ code: redeemCode.trim() }))
    if (redeemGiftCard.fulfilled.match(res)) {
      setRedeemMsg({ ok: true, text: `✅ £${(res.payload.credited / 100).toFixed(2)} added to your wallet!` })
      setRedeemCode('')
      dispatch(fetchMyGiftCards())
    } else {
      setRedeemMsg({ ok: false, text: res.payload?.message || 'Invalid code' })
    }
  }

  const copy = (code) => { navigator.clipboard.writeText(code).then(() => alert('Code copied!')) }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Gift Cards</h1>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

        {/* Purchase section */}
        {!purchased ? (
          <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl p-6 text-white">
            <p className="font-bold text-lg mb-1">🎁 Purchase a Gift Card</p>
            <p className="text-sm opacity-80 mb-4">Perfect for friends & family</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {VALUES.map(v => (
                <button key={v} onClick={() => setSelValue(v)}
                  className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                    ${selValue === v ? 'border-white bg-white text-brand-600' : 'border-white/40 text-white hover:border-white'}`}>
                  £{(v / 100).toFixed(0)}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="full" loading={purchasing} onClick={handlePurchase}>
              Buy £{(selValue / 100).toFixed(0)} Gift Card {gateways.razorpay ? 'via Razorpay' : ''}
            </Button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-3xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
            </div>
            <p className="font-bold text-green-700 mb-1">Gift Card Purchased!</p>
            <div className="font-mono text-lg bg-white rounded-xl px-4 py-2 my-3 border border-green-200 text-green-800">{purchased.code}</div>
            <p className="text-xs text-green-600 mb-4">Code has been saved to your account</p>
            <Button variant="primary" onClick={() => setPurchased(null)}>Buy Another</Button>
          </div>
        )}

        {/* Redeem section */}
        <div className="bg-bg-card rounded-2xl p-5 border border-border">
          <h2 className="font-bold text-text-primary mb-3">Redeem a Gift Card</h2>
          <div className="flex gap-2">
            <Input name="code" placeholder="TASTR-XXXX-XXXX-XXXX" value={redeemCode}
              onChange={e => { setRedeemCode(e.target.value.toUpperCase()); setRedeemMsg(null) }}
              className="flex-1 font-mono" />
            <Button variant="primary" onClick={handleRedeem} loading={isLoading} disabled={!redeemCode.trim()}>
              Redeem
            </Button>
          </div>
          {redeemMsg && (
            <p className={`text-sm mt-2 font-semibold ${redeemMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{redeemMsg.text}</p>
          )}
        </div>

        {/* My gift cards */}
        <div>
          <div className="flex gap-2 mb-4">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors
                  ${tab === t ? 'bg-brand-500 text-white' : 'bg-bg-section text-text-muted hover:text-text-primary'}`}>
                {t}
              </button>
            ))}
          </div>
          {filteredCards.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">No {tab.toLowerCase()} gift cards</div>
          ) : (
            <div className="space-y-3">
              {filteredCards.map(c => <GiftCardItem key={c._id} card={c} onCopy={copy} />)}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
