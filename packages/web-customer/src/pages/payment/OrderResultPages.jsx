import { useNavigate, useLocation } from 'react-router-dom'
import MainLayout from '../../layouts/MainLayout.jsx'

export function OrderSuccessPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { order } = location.state || {}

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        {/* Animated checkmark */}
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full bg-green-100 flex items-center justify-center animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-full border-4 border-green-300 animate-ping opacity-30" />
        </div>

        <h1 className="text-2xl font-black text-text-primary mb-2">Order Placed! 🎉</h1>
        <p className="text-text-secondary text-sm mb-4">Your order has been received and is being prepared</p>

        {order && (
          <div className="bg-brand-50 border border-brand-200 rounded-2xl px-6 py-4 mb-6 w-full max-w-xs">
            <p className="text-xs text-text-muted">Order Reference</p>
            <p className="text-xl font-black text-brand-600 tracking-wider">{order.orderId}</p>
            {order.restaurantId?.name && (
              <p className="text-sm text-text-secondary mt-1">from {order.restaurantId.name}</p>
            )}
            {order.estimatedDeliveryAt && (
              <p className="text-xs text-text-muted mt-2">
                ETA: {new Date(order.estimatedDeliveryAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 w-full max-w-xs">
          <button
            onClick={() => navigate(`/orders/${order?._id || ''}`, { state: { order } })}
            className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors"
          >
            Track Order
          </button>
          <button
            onClick={() => navigate('/home')}
            className="w-full py-3.5 rounded-2xl border-2 border-border text-text-secondary font-semibold hover:border-brand-400 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </MainLayout>
  )
}

export function OrderUnsuccessfulPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { reason } = location.state || {}

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="w-28 h-28 rounded-full bg-error-100 flex items-center justify-center mb-6 animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-error-500 flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-black text-text-primary mb-2">Payment Failed</h1>
        <p className="text-text-secondary text-sm mb-2">Your order could not be placed</p>
        {reason && <p className="text-xs text-error-600 bg-error-50 px-3 py-2 rounded-xl mb-6 border border-error-200">{reason}</p>}
        {!reason && <p className="text-xs text-text-muted mb-6">Please check your payment details and try again</p>}

        <div className="space-y-3 w-full max-w-xs">
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/help')}
            className="w-full py-3.5 rounded-2xl border-2 border-border text-text-secondary font-semibold hover:border-brand-400 transition-colors"
          >
            Contact Support
          </button>
        </div>
      </div>
    </MainLayout>
  )
}
