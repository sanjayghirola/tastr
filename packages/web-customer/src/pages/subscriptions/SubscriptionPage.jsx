import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchPlans, fetchMySub, subscribePlan, cancelSub } from '../../store/slices/walletSlice.js'
import { Button } from '../../components/global/index.jsx'
import MainLayout from '../../layouts/MainLayout.jsx'
import api from '../../services/api.js'

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

function PlanCard({ plan, current, onSubscribe, subscribing }) {
  const isActive = current?.planId?._id === plan._id || current?.planId === plan._id
  return (
    <div className={`relative bg-bg-card rounded-3xl p-6 border-2 transition-all
      ${plan.isFeatured ? 'border-brand-500 shadow-modal' : 'border-border'}`}>
      {plan.isFeatured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">
          Most Popular
        </span>
      )}
      <h3 className="font-bold text-text-primary text-lg mb-1">{plan.name}</h3>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-3xl font-extrabold text-brand-500">£{(plan.price / 100).toFixed(2)}</span>
        <span className="text-text-muted text-sm">/{plan.interval}</span>
      </div>
      <ul className="space-y-2 mb-6">
        {plan.freeDelivery && (
          <li className="flex items-center gap-2 text-sm text-text-primary">
            <span className="text-green-500">✓</span> Free delivery on all orders
          </li>
        )}
        {(plan.features || []).map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-text-primary">
            <span className="text-green-500">✓</span> {f}
          </li>
        ))}
      </ul>
      {isActive ? (
        <div className="bg-green-50 text-green-700 text-sm font-bold text-center py-2.5 rounded-2xl">
          ✓ Current Plan
        </div>
      ) : (
        <Button variant={plan.isFeatured ? 'primary' : 'outline'} size="full"
          loading={subscribing === plan._id} onClick={() => onSubscribe(plan._id, plan.price)}>
          Subscribe
        </Button>
      )}
    </div>
  )
}

function ActiveSubCard({ sub, onCancel, loading }) {
  const plan = sub.planId
  return (
    <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl p-6 text-white">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm opacity-80">Active Plan</p>
          <p className="text-2xl font-extrabold">{plan?.name || 'Tastr+'}</p>
        </div>
        <span className="text-3xl">⭐</span>
      </div>
      <div className="space-y-2 text-sm mb-6">
        <div className="flex justify-between"><span className="opacity-80">Price</span><span className="font-bold">£{((plan?.price || 0) / 100).toFixed(2)}/{plan?.interval}</span></div>
        <div className="flex justify-between"><span className="opacity-80">Renews</span><span className="font-bold">{new Date(sub.renewalDate).toLocaleDateString('en-GB')}</span></div>
        <div className="flex justify-between"><span className="opacity-80">Status</span><span className="font-bold capitalize">{sub.cancelAtPeriodEnd ? '⚠️ Cancels at period end' : sub.status}</span></div>
      </div>
      {!sub.cancelAtPeriodEnd && (
        <button onClick={onCancel} disabled={loading}
          className="w-full border border-white/50 text-white text-sm font-semibold py-2.5 rounded-2xl hover:bg-white/10 transition-colors">
          Cancel Subscription
        </button>
      )}
    </div>
  )
}

export default function SubscriptionPage() {
  const dispatch = useDispatch()
  const { user } = useSelector(s => s.auth)
  const { plans, subscription, isLoading } = useSelector(s => s.wallet)
  const [cancelled, setCancelled] = useState(false)
  const [subscribing, setSubscribing] = useState(null)
  const [gateways, setGateways] = useState({ stripe: false, razorpay: false })
  const [error, setError] = useState(null)

  useEffect(() => {
    dispatch(fetchPlans())
    dispatch(fetchMySub())
    api.get('/payments/gateway-status').then(r => {
      setGateways({ stripe: !!r.data.stripe, razorpay: !!r.data.razorpay, razorpayKeyId: r.data.razorpayKeyId })
    }).catch(() => {})
  }, [dispatch])

  const handleRazorpaySubscribe = useCallback(async (planId, price) => {
    setSubscribing(planId); setError(null)
    try {
      const { data } = await api.post('/subscriptions/subscribe', { planId, gateway: 'RAZORPAY' })

      if (!data.razorpayOrder) { setError('Failed to create order.'); setSubscribing(null); return }

      const loaded = await loadRazorpaySdk()
      if (!loaded) { setError('Failed to load Razorpay.'); setSubscribing(null); return }

      const options = {
        key: data.razorpayOrder.key || gateways.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.razorpayOrder.amount,
        currency: data.razorpayOrder.currency,
        name: 'Tastr',
        description: 'Subscription Payment',
        order_id: data.razorpayOrder.id,
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
        theme: { color: '#C18B3C' },
        handler: async (response) => {
          try {
            await api.post('/subscriptions/verify-razorpay', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId,
            })
            dispatch(fetchMySub())
          } catch (err) {
            setError(err.response?.data?.message || 'Payment verification failed.')
          }
          setSubscribing(null)
        },
        modal: { ondismiss: () => { setSubscribing(null) } },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (resp) => {
        setError(resp.error?.description || 'Payment failed.')
        setSubscribing(null)
      })
      rzp.open()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate payment.')
      setSubscribing(null)
    }
  }, [user, gateways, dispatch])

  const handleSubscribe = async (planId, price) => {
    if (gateways.razorpay) {
      handleRazorpaySubscribe(planId, price)
    } else if (gateways.stripe) {
      // Stripe flow: try to use saved payment method
      setSubscribing(planId); setError(null)
      try {
        const methodsRes = await api.get('/payments/methods')
        const methods = methodsRes.data?.methods || []
        if (methods.length === 0) {
          setError('Please add a card in Payment Methods before subscribing.')
          setSubscribing(null)
          return
        }
        const res = await dispatch(subscribePlan({ planId, paymentMethodId: methods[0].id }))
        if (subscribePlan.fulfilled.match(res)) dispatch(fetchMySub())
      } catch (err) {
        setError(err.response?.data?.message || 'Subscription failed.')
      }
      setSubscribing(null)
    } else {
      setError('No payment gateway available. Please contact support.')
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You will keep benefits until the end of the period.')) return
    const res = await dispatch(cancelSub())
    if (cancelSub.fulfilled.match(res)) setCancelled(true)
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Subscription</h1>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

        {subscription && <ActiveSubCard sub={subscription} onCancel={handleCancel} loading={isLoading} />}
        {cancelled && <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold rounded-2xl p-4 text-center">Subscription will cancel at end of period</div>}

        <div>
          <h2 className="font-bold text-text-primary mb-4">
            {subscription ? 'Available Plans' : 'Choose Your Plan'}
          </h2>
          {plans.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">No plans available</div>
          ) : (
            <div className="space-y-4">
              {plans.map(p => <PlanCard key={p._id} plan={p} current={subscription}
                onSubscribe={handleSubscribe} subscribing={subscribing} />)}
            </div>
          )}
        </div>

        {/* Benefits overview */}
        <div className="bg-bg-card rounded-2xl p-5 border border-border">
          <h3 className="font-bold text-text-primary mb-3">Why Subscribe?</h3>
          {[
            ['🚚', 'Free Delivery', 'No delivery fee on every order'],
            ['⚡', 'Priority Support', 'Skip the queue, get help first'],
            ['🎓', 'Student Deals', 'Exclusive discounts for students'],
            ['🎁', 'Exclusive Promos', 'Members-only offers every week'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-text-primary">{title}</p>
                <p className="text-xs text-text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
