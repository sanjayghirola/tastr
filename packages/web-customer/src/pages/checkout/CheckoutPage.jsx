import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { fetchCart } from '../../store/slices/cartSlice.js'
import MainLayout from '../../layouts/MainLayout.jsx'
import api from '../../services/api.js'

export default function CheckoutPage() {
  const navigate   = useNavigate()
  const dispatch   = useDispatch()
  const { addresses } = useSelector(s => s.auth.user || {})
  const cart       = useSelector(s => s.cart)
  const [selectedAddr,   setSelectedAddr]   = useState(null)
  const [deliveryMethod, setDeliveryMethod] = useState('standard')
  const [deliveryInfo,   setDeliveryInfo]   = useState(null)
  const [loadingInfo,    setLoadingInfo]    = useState(false)

  const restaurantId = cart.cart?.restaurantId?._id || cart.restaurantId

  useEffect(() => {
    dispatch(fetchCart())
    const def = addresses?.find(a => a.isDefault) || addresses?.[0]
    if (def) setSelectedAddr(def._id)
  }, [dispatch])

  // Fetch delivery settings from restaurant when address changes
  useEffect(() => {
    if (!selectedAddr || !restaurantId) return
    const addr = addresses?.find(a => a._id === selectedAddr)
    if (!addr?.lat || !addr?.lng) { setDeliveryInfo(null); return }
    setLoadingInfo(true)
    api.get(`/restaurants/${restaurantId}/delivery-check?lat=${addr.lat}&lng=${addr.lng}`)
      .then(r => {
        setDeliveryInfo(r.data)
        if (deliveryMethod === 'express' && !r.data.expressDeliveryEnabled) setDeliveryMethod('standard')
        if (deliveryMethod === 'scheduled' && !r.data.scheduledOrdersEnabled) setDeliveryMethod('standard')
      })
      .catch(() => setDeliveryInfo(null))
      .finally(() => setLoadingInfo(false))
  }, [selectedAddr, restaurantId])

  if (!cart.items?.length) {
    navigate('/cart'); return null
  }

  // Build delivery methods dynamically based on restaurant settings
  const DELIVERY_METHODS = [
    { id: 'standard', label: 'Standard Delivery', desc: '30–60 mins', icon: '🚗', extra: 0 },
  ]
  if (deliveryInfo?.expressDeliveryEnabled) {
    const fee = deliveryInfo.expressDeliveryExtraFee || 200
    DELIVERY_METHODS.push({
      id: 'express', label: 'Express Delivery', desc: '15–25 mins', icon: '⚡',
      extra: fee, badge: `+£${(fee / 100).toFixed(2)}`,
    })
  }
  if (deliveryInfo?.scheduledOrdersEnabled) {
    DELIVERY_METHODS.push({
      id: 'scheduled', label: 'Scheduled Delivery',
      desc: `Choose date & time${deliveryInfo?.scheduledAdvanceHours ? ` (${deliveryInfo.scheduledAdvanceHours}h advance)` : ''}`,
      icon: '🗓', extra: 0,
    })
  }

  const handleProceed = () => {
    if (deliveryMethod === 'scheduled') {
      navigate('/checkout/schedule', { state: { addressId: selectedAddr } })
      return
    }
    navigate('/checkout/payment', { state: { addressId: selectedAddr, deliveryMethod } })
  }

  const outOfRadius = deliveryInfo && !deliveryInfo.withinRadius

  return (
    <MainLayout>
      <div className="px-4 pt-10 pb-32">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-bg-section flex items-center justify-center">‹</button>
          <h1 className="text-xl font-bold text-text-primary">Checkout</h1>
        </div>

        {/* Delivery address */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-text-primary uppercase tracking-wider">Delivery Address</p>
            <button onClick={() => navigate('/profile/addresses/add')} className="text-xs text-brand-500 font-semibold hover:text-brand-600">+ Add New</button>
          </div>

          {(addresses || []).length === 0 ? (
            <div className="text-center py-8 bg-bg-section rounded-2xl border border-border">
              <p className="text-text-muted text-sm">No saved addresses</p>
              <button onClick={() => navigate('/profile/addresses/add')} className="mt-2 text-sm text-brand-500 font-semibold">+ Add address</button>
            </div>
          ) : (
            <div className="space-y-2">
              {(addresses || []).map(addr => (
                <label key={addr._id} className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all
                  ${selectedAddr === addr._id ? 'border-brand-500 bg-brand-50' : 'border-border bg-bg-card hover:border-brand-300'}`}>
                  <input type="radio" name="address" value={addr._id} checked={selectedAddr === addr._id}
                    onChange={() => setSelectedAddr(addr._id)} className="mt-0.5 accent-brand-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-600 uppercase">{addr.label}</span>
                      {addr.isDefault && <span className="text-xs bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full font-medium">Default</span>}
                    </div>
                    <p className="text-sm text-text-primary mt-0.5">{addr.line1}</p>
                    <p className="text-xs text-text-muted">{addr.city}, {addr.postcode}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Out of radius warning */}
        {outOfRadius && (
          <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-200">
            <p className="text-sm font-semibold text-red-800">📍 Out of Delivery Range</p>
            <p className="text-xs text-red-600 mt-1">
              Your selected address is {deliveryInfo.distanceKm} km away. This restaurant only delivers within {deliveryInfo.deliveryRadiusKm} km.
              Please choose a different address or try another restaurant.
            </p>
          </div>
        )}

        {/* Delivery distance info */}
        {deliveryInfo && deliveryInfo.withinRadius && deliveryInfo.distanceKm != null && (
          <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2">
            <span className="text-green-600 text-sm">📍</span>
            <p className="text-xs text-green-700">
              {deliveryInfo.distanceKm} km from restaurant · Delivery fee: £{(deliveryInfo.deliveryFee / 100).toFixed(2)}
              {deliveryInfo.minOrderAmount > 0 && ` · Min order: £${(deliveryInfo.minOrderAmount / 100).toFixed(2)}`}
            </p>
          </div>
        )}

        {/* Delivery method */}
        {!outOfRadius && (
          <div className="mb-6">
            <p className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">Delivery Method</p>
            {loadingInfo ? (
              <div className="flex items-center justify-center py-6 text-text-muted text-sm">
                <span className="animate-spin mr-2">⏳</span> Checking delivery options…
              </div>
            ) : (
              <div className="space-y-2">
                {DELIVERY_METHODS.map(m => (
                  <label key={m.id} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all
                    ${deliveryMethod === m.id ? 'border-brand-500 bg-brand-50' : 'border-border bg-bg-card hover:border-brand-300'}`}>
                    <input type="radio" name="delivery" value={m.id} checked={deliveryMethod === m.id}
                      onChange={() => setDeliveryMethod(m.id)} className="accent-brand-500" />
                    <span className="text-2xl">{m.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary">{m.label}</p>
                        {m.badge && <span className="text-xs bg-brand-100 text-brand-600 font-semibold px-1.5 py-0.5 rounded-full">{m.badge}</span>}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{m.desc}</p>
                    </div>
                    {deliveryMethod === m.id && <span className="text-brand-500 text-lg">✓</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Checkout button */}
      <div className="hidden lg:flex justify-center px-4 lg:px-8 pb-10 pt-4">
        <button onClick={handleProceed}
          disabled={outOfRadius || (!selectedAddr && (addresses || []).length > 0)}
          className="w-full max-w-3xl py-4 rounded-2xl bg-brand-500 text-white font-bold text-base shadow-brand hover:bg-brand-600 disabled:opacity-50 transition-colors">
          {outOfRadius ? 'Out of Delivery Range' : deliveryMethod === 'scheduled' ? 'Choose Schedule →' : 'Proceed to Payment →'}
        </button>
      </div>
      <div className="lg:hidden fixed bottom-20 left-0 right-0 px-4 flex justify-center z-30">
        <button onClick={handleProceed}
          disabled={outOfRadius || (!selectedAddr && (addresses || []).length > 0)}
          className="w-full py-4 rounded-2xl bg-brand-500 text-white font-bold text-base shadow-brand hover:bg-brand-600 disabled:opacity-50 transition-colors">
          {outOfRadius ? 'Out of Delivery Range' : deliveryMethod === 'scheduled' ? 'Choose Schedule →' : 'Proceed to Payment →'}
        </button>
      </div>
    </MainLayout>
  )
}
