import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../../layouts/MainLayout.jsx'
import api from '../../services/api.js'
import { ArrowLeft, CreditCard, Plus, Trash2, X, Loader2 } from 'lucide-react'

const BRAND_ICONS = {
  visa: '💳', mastercard: '💳', amex: '💳', discover: '💳',
}

function CardItem({ method, onRemove, removing }) {
  const card = method.card || {}
  return (
    <div className="flex items-center gap-4 bg-bg-card rounded-2xl p-4 border border-border">
      <div className="w-12 h-8 rounded-lg bg-bg-section flex items-center justify-center text-xl">
        {BRAND_ICONS[card.brand] || '💳'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary capitalize">
          {card.brand || 'Card'} •••• {card.last4}
        </p>
        <p className="text-xs text-text-muted">
          Expires {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
        </p>
      </div>
      <button
        onClick={() => onRemove(method.id)}
        disabled={removing === method.id}
        className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        {removing === method.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>
    </div>
  )
}

function AddCardModal({ onClose, onAdded }) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry]       = useState('')
  const [cvv, setCvv]             = useState('')
  const [name, setName]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const formatCardNumber = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(.{4})/g, '$1 ').trim()
  }

  const formatExpiry = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 4)
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2)
    return digits
  }

  const handleAdd = async () => {
    setLoading(true); setError(null)
    try {
      const [expMonth, expYear] = expiry.split('/')
      await api.post('/payments/methods', {
        cardNumber: cardNumber.replace(/\s/g, ''),
        expMonth: parseInt(expMonth),
        expYear: parseInt('20' + expYear),
        cvc: cvv,
        name,
      })
      onAdded()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add card. Please check your details.')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-text-primary">Card Details</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg-section flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Card number</label>
            <input type="text" value={cardNumber}
              onChange={e => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="Enter the card number" maxLength={19}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">Expiry date</label>
              <input type="text" value={expiry}
                onChange={e => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY" maxLength={5}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white" />
            </div>
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">CVV</label>
              <input type="password" value={cvv}
                onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="CVV" maxLength={4}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Card name</label>
            <input type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter card name"
              className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-200">{error}</p>}

          <button onClick={handleAdd} disabled={loading || !cardNumber || !expiry || !cvv}
            className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Adding...</> : 'Add card'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PaymentMethodsPage() {
  const navigate = useNavigate()
  const [methods, setMethods]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [removing, setRemoving] = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [gateways, setGateways] = useState({ stripe: false, razorpay: false })

  const fetchMethods = async () => {
    setLoading(true)
    try {
      const [methodsRes, gwRes] = await Promise.all([
        api.get('/payments/methods').catch(() => ({ data: { methods: [] } })),
        api.get('/payments/gateway-status').catch(() => ({ data: {} })),
      ])
      setMethods(methodsRes.data.methods || [])
      setGateways({ stripe: !!gwRes.data.stripe, razorpay: !!gwRes.data.razorpay })
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchMethods() }, [])

  const handleRemove = async (methodId) => {
    if (!confirm('Remove this card?')) return
    setRemoving(methodId)
    try {
      await api.delete(`/payments/methods/${methodId}`)
      setMethods(prev => prev.filter(m => m.id !== methodId))
    } catch {} finally { setRemoving(null) }
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-10">
        {showAdd && <AddCardModal onClose={() => setShowAdd(false)} onAdded={fetchMethods} />}

        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-bg-section flex items-center justify-center hover:bg-brand-50 transition-colors">
            <ArrowLeft size={18} className="text-text-secondary" />
          </button>
          <h1 className="text-xl font-bold text-text-primary">Payment Methods</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* UPI / Digital wallets */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-text-primary">Digital Wallets</p>
              </div>
              <div className="space-y-2">
                {gateways.razorpay && (
                  <div className="flex items-center gap-3 bg-bg-card rounded-2xl p-4 border border-border">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-sm">R</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-text-primary">Razorpay</p>
                      <p className="text-xs text-text-muted">UPI, Cards, Netbanking, Wallets</p>
                    </div>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">Available</span>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-bg-card rounded-2xl p-4 border border-border">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg">🍎</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">Apple Pay</p>
                    <p className="text-xs text-text-muted">Pay securely with Apple Pay</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Saved cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-text-primary">Cards</p>
                {gateways.stripe && (
                  <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-colors">
                    <Plus size={12} /> Add
                  </button>
                )}
              </div>

              {methods.length === 0 ? (
                <div className="text-center py-8 bg-bg-section rounded-2xl border border-border">
                  <CreditCard size={28} className="text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">No saved cards</p>
                  {gateways.stripe && (
                    <button onClick={() => setShowAdd(true)}
                      className="mt-2 text-sm text-brand-500 font-semibold">+ Add a card</button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {methods.map(m => (
                    <CardItem key={m.id} method={m} onRemove={handleRemove} removing={removing} />
                  ))}
                </div>
              )}
            </div>

            {!gateways.stripe && !gateways.razorpay && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm text-amber-700 font-semibold">No payment gateways configured</p>
                <p className="text-xs text-amber-600 mt-1">Contact support or use wallet balance for payments.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
