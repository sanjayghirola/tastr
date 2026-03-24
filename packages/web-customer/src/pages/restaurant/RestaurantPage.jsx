import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchRestaurant, fetchMenu } from '../../store/slices/restaurantsSlice.js'
import { MenuItemCard } from '../../components/cards/RestaurantCard.jsx'
import ItemModal from '../../components/modals/ItemModal.jsx'
import { selectCartCount, selectCartItems } from '../../store/slices/cartSlice.js'
import api from '../../services/api.js'
import { ArrowLeft, Star, Clock, Bike, ChevronRight, GraduationCap, MapPin, Shield, Zap, CalendarClock, Share2 } from 'lucide-react'

export default function RestaurantPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { state: navState } = useLocation()
  const dispatch  = useDispatch()
  const { current: restaurant, menu, isLoading, isMenuLoading } = useSelector(s => s.restaurants)
  const { user } = useSelector(s => s.auth)
  const cartCount = useSelector(selectCartCount)
  const cartItems = useSelector(selectCartItems)
  const [activeCategory, setActiveCategory] = useState(null)
  const [selectedItem,   setSelectedItem]   = useState(null)
  const [deliveryInfo,   setDeliveryInfo]   = useState(null)
  const [showAllHours,   setShowAllHours]   = useState(false)
  const sectionRefs = useRef({})

  // Group order context — passed from GroupOrderPage join flow
  const groupId   = navState?.groupId || null
  const groupName = navState?.groupName || null

  useEffect(() => {
    dispatch(fetchRestaurant(id))
    dispatch(fetchMenu(id))
  }, [id])

  useEffect(() => {
    if (menu.length > 0 && !activeCategory) setActiveCategory(menu[0]._id)
  }, [menu])

  // Check delivery radius using user's default address
  useEffect(() => {
    if (!restaurant || !user) return
    const addr = user.addresses?.find(a => a.isDefault) || user.addresses?.[0]
    if (!addr?.lat || !addr?.lng) return
    api.get(`/restaurants/${id}/delivery-check?lat=${addr.lat}&lng=${addr.lng}`)
      .then(r => setDeliveryInfo(r.data))
      .catch(() => {})
  }, [restaurant, user, id])

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActiveCategory(e.target.dataset.catId) }),
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    )
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [menu])

  const scrollToCategory = (catId) => {
    sectionRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (isLoading || !restaurant) return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center">
      <div className="spinner spinner-xl" />
    </div>
  )

  const r = restaurant
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.quantity + (i.selectedToppings || []).reduce((a, t) => a + (t.price||0), 0) * i.quantity, 0)
  const outOfRadius = deliveryInfo && !deliveryInfo.withinRadius
  const canOrder = r.isOpenNow !== false && r.isOnline !== false && !outOfRadius

  return (
    <>
      <div className="min-h-screen bg-bg-page">
        {/* ─── Hero cover ─────────────────────────────────────────────────── */}
        <div className="relative h-56 md:h-72 lg:h-80">
          {r.logoUrl
            ? <img src={r.logoUrl} alt={r.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-brand-600 via-brand-500 to-brand-300 flex items-center justify-center">
                <span className="text-8xl opacity-30">🍽</span>
              </div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

          {/* Top nav */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 lg:px-6 pt-5">
            <button onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors backdrop-blur-md">
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={() => navigator.share?.({ title: r.name, url: window.location.href }).catch(() => {})}
              className="w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors backdrop-blur-md">
              <Share2 size={16} />
            </button>
          </div>

          {/* Hero info */}
          <div className="absolute bottom-0 left-0 right-0 px-4 lg:px-6 pb-5">
            <div className="lg:max-w-7xl lg:mx-auto flex items-end justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl lg:text-3xl font-black text-white leading-tight drop-shadow-lg">{r.name}</h1>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {(r.cuisines || [r.cuisineType]).filter(Boolean).map(c => (
                    <span key={c} className="text-xs bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-md text-white font-medium">{c}</span>
                  ))}
                </div>
              </div>
              {r.logoUrl && (
                <img src={r.logoUrl} alt="" className="w-16 h-16 rounded-2xl border-2 border-white/80 object-cover flex-shrink-0 shadow-lg" />
              )}
            </div>
          </div>
        </div>

        {/* ─── Quick info bar ─────────────────────────────────────────────── */}
        <div className="bg-bg-card border-b border-border">
          <div className="lg:max-w-7xl lg:mx-auto px-4 lg:px-6 py-3.5">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              {r.avgRating > 0 && (
                <div className="flex items-center gap-1.5 bg-yellow-50 px-2.5 py-1 rounded-xl">
                  <Star size={13} className="text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-yellow-700">{r.avgRating.toFixed(1)}</span>
                  <span className="text-yellow-600/70 text-xs">({r.ratingCount || 0})</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-text-secondary">
                <Clock size={13} />
                <span className="font-medium">{r.estimatedDeliveryMin || 30}–{(r.estimatedDeliveryMin || 30) + 10} min</span>
              </div>
              <div className="flex items-center gap-1.5 text-text-secondary">
                <Bike size={13} />
                {r.deliveryFee === 0
                  ? <span className="text-green-600 font-semibold">Free delivery</span>
                  : <span className="font-medium">£{((r.deliveryFee || 250) / 100).toFixed(2)} delivery</span>}
              </div>
              {r.minOrderAmount > 0 && (
                <span className="text-text-muted text-xs bg-bg-section px-2 py-0.5 rounded-lg">Min £{(r.minOrderAmount / 100).toFixed(2)}</span>
              )}
              <div className={`ml-auto flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl ${r.isOpenNow ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${r.isOpenNow ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                {r.isOpenNow ? 'Open now' : 'Closed'}
              </div>
            </div>
            {r.description && <p className="text-sm text-text-secondary mt-2.5 leading-relaxed">{r.description}</p>}
          </div>
        </div>

        {/* ─── Delivery Radius Warning ────────────────────────────────────── */}
        {outOfRadius && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-3">
            <div className="lg:max-w-7xl lg:mx-auto flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-800">Out of Delivery Range</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Your address is {deliveryInfo.distanceKm} km away. This restaurant delivers within {deliveryInfo.deliveryRadiusKm} km.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Delivery features pills ────────────────────────────────────── */}
        {deliveryInfo && deliveryInfo.withinRadius && (
          <div className="bg-bg-card border-b border-border">
            <div className="lg:max-w-7xl lg:mx-auto px-4 lg:px-6 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {deliveryInfo.distanceKm != null && (
                <span className="flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 px-2.5 py-1 rounded-full whitespace-nowrap">
                  <MapPin size={11} /> {deliveryInfo.distanceKm} km away
                </span>
              )}
              {deliveryInfo.expressDeliveryEnabled && (
                <span className="flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full whitespace-nowrap">
                  <Zap size={11} /> Express available
                </span>
              )}
              {deliveryInfo.scheduledOrdersEnabled && (
                <span className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full whitespace-nowrap">
                  <CalendarClock size={11} /> Schedule orders
                </span>
              )}
              {deliveryInfo.tastrPlusFreeDelivery && (
                <span className="flex items-center gap-1 text-xs font-medium bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full whitespace-nowrap">
                  ⭐ Free with Tastr+
                </span>
              )}
            </div>
          </div>
        )}

        {/* ─── Group Order Context Banner ────────────────────────────────── */}
        {groupId && (
          <div className="bg-purple-50 border-b border-purple-200 px-4 py-3">
            <div className="lg:max-w-7xl lg:mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">👥</span>
                <div>
                  <p className="text-sm font-bold text-purple-700">Group Order: {groupName || 'Active'}</p>
                  <p className="text-xs text-purple-500">Items you add will go to the shared group cart</p>
                </div>
              </div>
              <button onClick={() => navigate(`/group/${groupId}/summary`)}
                className="px-3 py-1.5 rounded-xl bg-purple-500 text-white text-xs font-bold hover:bg-purple-600 transition-colors">
                View Group →
              </button>
            </div>
          </div>
        )}

        {/* ─── Student Discount Badge ──────────────────────────────────── */}
        {r.offersStudentDiscount && (
          <div className="bg-green-50 border-b border-green-200 px-4 py-2.5">
            <div className="lg:max-w-7xl lg:mx-auto flex items-center gap-2">
              <GraduationCap size={16} className="text-green-600" />
              <p className="text-sm text-green-700">
                <span className="font-bold">{r.studentDiscountPercent || 10}% Student Discount</span>
                {user?.isStudentVerified
                  ? <span className="ml-1 text-green-600">— applied at checkout!</span>
                  : <button onClick={() => navigate('/student-verify')} className="ml-1 text-green-600 underline font-medium">Verify now to unlock →</button>
                }
              </p>
            </div>
          </div>
        )}

        {/* ─── Desktop two-column layout ──────────────────────────────────── */}
        <div className="lg:flex lg:max-w-8xl lg:mx-auto lg:px-6">

          {/* ─── Left: restaurant info + menu ─────────────────────────────── */}
          <div className="flex-1 min-w-0 lg:pr-6">

            {/* ─── Restaurant Details (Location, Hours, Compliance) ──────── */}
            <div className="bg-bg-card px-4 lg:px-3 py-5 border-b border-border-light">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Location card */}
                {r.address && (
                  <div className="bg-bg-section rounded-2xl p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center">
                        <MapPin size={13} className="text-brand-600" />
                      </div>
                      <p className="text-xs font-bold text-text-primary uppercase tracking-wide">Location</p>
                    </div>
                    <p className="text-sm text-text-primary font-medium">{r.address.line1 || r.address.streetAddress}</p>
                    <p className="text-xs text-text-muted mt-0.5">{[r.address.city, r.address.postcode].filter(Boolean).join(', ')}</p>
                    {r.address.lat && (
                      <a href={`https://maps.google.com/?q=${r.address.lat},${r.address.lng}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-brand-500 font-semibold mt-2 inline-flex items-center gap-1 hover:underline">
                        View on map <ChevronRight size={12} />
                      </a>
                    )}
                  </div>
                )}

                {/* Hours card */}
                {r.openingHours?.length > 0 && (
                  <div className="bg-bg-section rounded-2xl p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Clock size={13} className="text-blue-600" />
                      </div>
                      <p className="text-xs font-bold text-text-primary uppercase tracking-wide">Hours</p>
                    </div>
                    <div className="space-y-0.5">
                      {(showAllHours ? r.openingHours : r.openingHours.slice(0, 3)).map((h, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className={`font-medium ${h.isOpen ? 'text-text-primary' : 'text-text-muted'}`}>{h.day}</span>
                          <span className={h.isOpen ? 'text-text-secondary' : 'text-text-muted'}>
                            {h.isOpen ? `${h.open} – ${h.close}` : 'Closed'}
                          </span>
                        </div>
                      ))}
                    </div>
                    {r.openingHours.length > 3 && (
                      <button onClick={() => setShowAllHours(v => !v)}
                        className="text-xs text-brand-500 font-semibold mt-1.5 hover:underline">
                        {showAllHours ? 'Show less' : `Show all ${r.openingHours.length} days`}
                      </button>
                    )}
                  </div>
                )}

                {/* Compliance card */}
                <div className="bg-bg-section rounded-2xl p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                      <Shield size={13} className="text-green-600" />
                    </div>
                    <p className="text-xs font-bold text-text-primary uppercase tracking-wide">Safety</p>
                  </div>
                  {r.foodHygieneRating != null && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-text-secondary">Hygiene:</span>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <div key={n} className={`w-4 h-4 rounded-sm text-[9px] font-bold flex items-center justify-center
                            ${n <= r.foodHygieneRating ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            {n}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {r.fhrsNumber && <p className="text-xs text-text-muted">FHRS: {r.fhrsNumber}</p>}
                  {r.companyRegNumber && <p className="text-xs text-text-muted">Reg: {r.companyRegNumber}</p>}
                  {r.vatNumber && <p className="text-xs text-text-muted">VAT: {r.vatNumber}</p>}
                  {!r.foodHygieneRating && !r.fhrsNumber && !r.companyRegNumber && (
                    <p className="text-xs text-text-muted">Registered food business</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky category nav */}
            <div className="sticky px-3 top-0 z-20 bg-bg-card border-b border-border-light shadow-sm">
              <div className="flex gap-1 px-4 lg:px-0 py-2.5 overflow-x-auto no-scrollbar">
                {menu.map(cat => (
                  <button key={cat._id} onClick={() => scrollToCategory(cat._id)}
                    className={`px-4 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0
                      ${activeCategory === cat._id ? 'bg-brand-500 text-white shadow-sm' : 'text-text-secondary hover:bg-bg-section hover:text-text-primary'}`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu sections */}
            <div className="px-4 lg:px-0 pb-8">
              {isMenuLoading ? (
                <div className="flex justify-center py-16"><div className="spinner spinner-lg" /></div>
              ) : menu.length === 0 ? (
                <div className="text-center py-16 text-text-muted text-sm">Menu not available yet</div>
              ) : (
                menu.map(cat => (
                  <div key={cat._id} ref={el => { sectionRefs.current[cat._id] = el }} data-cat-id={cat._id} className="pt-7">
                    <h2 className="text-lg font-black text-text-primary mb-4">{cat.name}</h2>
                    {/* 2-column grid on medium+ */}
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${outOfRadius ? 'opacity-50 pointer-events-none' : ''}`}>
                      {cat.items.map(item => (
                        <MenuItemCard key={item._id} item={item} restaurantId={r._id} restaurantName={r.name} onClick={outOfRadius ? undefined : setSelectedItem} />
                      ))}
                    </div>
                  </div>
                ))
              )}
              {outOfRadius && menu.length > 0 && (
                <div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-center">
                  <p className="text-sm font-semibold text-red-800">You are outside this restaurant's delivery area</p>
                  <p className="text-xs text-red-600 mt-1">Browse the menu, but ordering is not available for your current address.</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Right: Desktop cart sidebar ─────────────────────────────── */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-4 pt-4">
              <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-card">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-bold text-text-primary">Your Order</h3>
                  {cartCount === 0 && <p className="text-sm text-text-muted mt-1">Add items to get started</p>}
                </div>

                {cartCount > 0 ? (
                  <>
                    <div className="px-5 py-3 space-y-3 max-h-72 overflow-y-auto">
                      {cartItems.map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                          {item.photoUrl && <img src={item.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary leading-tight">{item.name}</p>
                            {item.selectedToppings?.length > 0 && (
                              <p className="text-xs text-text-muted mt-0.5">{item.selectedToppings.map(t => t.optionName).join(', ')}</p>
                            )}
                            <p className="text-xs text-text-muted">×{item.quantity}</p>
                          </div>
                          <span className="text-sm font-bold text-brand-600 flex-shrink-0">
                            £{((item.price * item.quantity + (item.selectedToppings || []).reduce((a, t) => a + (t.price||0), 0) * item.quantity) / 100).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-4 border-t border-border space-y-3">
                      <div className="flex justify-between text-sm text-text-muted">
                        <span>Subtotal</span>
                        <span className="font-semibold text-text-primary">£{(cartTotal / 100).toFixed(2)}</span>
                      </div>
                      {r.deliveryFee > 0 && (
                        <div className="flex justify-between text-sm text-text-muted">
                          <span>Delivery</span>
                          <span>£{(r.deliveryFee / 100).toFixed(2)}</span>
                        </div>
                      )}
                      <button onClick={() => navigate('/cart')}
                        className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 active:scale-95 transition-all flex items-center justify-between px-4">
                        <span>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
                        <span>Go to Cart</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="px-5 py-10 text-center">
                    <div className="text-4xl mb-2">🛒</div>
                    <p className="text-sm text-text-muted">Your cart is empty</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Mobile: floating cart button ─────────────────────────────── */}
        {groupId ? (
          <div className="lg:hidden fixed bottom-20 left-4 right-4 z-30">
            <button onClick={() => navigate(`/group/${groupId}/summary`)}
              className="w-full py-3.5 rounded-2xl bg-purple-600 text-white font-bold flex items-center justify-between px-5 shadow-lg hover:bg-purple-700 transition-colors">
              <span className="text-lg">👥</span>
              <span>View Group Summary</span>
              <ChevronRight size={18} />
            </button>
          </div>
        ) : cartCount > 0 && (
          <div className="lg:hidden fixed bottom-20 left-4 right-4 z-30">
            <button onClick={() => navigate('/cart')}
              className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold flex items-center justify-between px-5 shadow-brand hover:bg-brand-600 transition-colors">
              <span className="bg-white/20 rounded-full w-7 h-7 text-sm flex items-center justify-center font-black">{cartCount}</span>
              <span>View Order · £{(cartTotal / 100).toFixed(2)}</span>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {selectedItem && (
        <ItemModal item={selectedItem} restaurant={r} onClose={() => setSelectedItem(null)} isRestaurantOpen={canOrder} groupId={groupId} />
      )}
    </>
  )
}
