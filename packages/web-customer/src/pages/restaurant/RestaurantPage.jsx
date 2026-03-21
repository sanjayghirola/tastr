import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchRestaurant, fetchMenu } from '../../store/slices/restaurantsSlice.js'
import { MenuItemCard } from '../../components/cards/RestaurantCard.jsx'
import ItemModal from '../../components/modals/ItemModal.jsx'
import { selectCartCount, selectCartItems } from '../../store/slices/cartSlice.js'
import { ArrowLeft, Star, Clock, Bike, ChevronRight, GraduationCap } from 'lucide-react'

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

  return (
    <>
      <div className="min-h-screen bg-bg-page">
        {/* ─── Hero cover ─────────────────────────────────────────────────── */}
        <div className="relative h-52 md:h-72 lg:h-80">
          {r.coverPhotos?.[0]?.url
            ? <img src={r.coverPhotos[0].url} alt={r.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-brand-200 to-brand-400 flex items-center justify-center text-8xl">🍽</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <button onClick={() => navigate(-1)}
            className="absolute top-5 left-4 lg:left-6 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-sm">
            <ArrowLeft size={18} />
          </button>
          <div className="absolute bottom-5 left-4 lg:left-6 right-4 lg:right-6 text-white">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-black leading-tight">{r.name}</h1>
                <div className="flex items-center gap-2 flex-wrap mt-1.5">
                  {(r.cuisines || []).map(c => (
                    <span key={c} className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">{c}</span>
                  ))}
                </div>
              </div>
              {r.logoUrl && (
                <img src={r.logoUrl} alt="" className="w-16 h-16 rounded-2xl border-2 border-white object-cover flex-shrink-0" />
              )}
            </div>
          </div>
        </div>

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
        <div className="lg:flex lg:max-w-7xl lg:mx-auto lg:px-6">

          {/* ─── Left: restaurant info + menu ─────────────────────────────── */}
          <div className="flex-1 min-w-0 lg:pr-6">

            {/* Restaurant meta strip */}
            <div className="bg-bg-card px-4 lg:px-0 py-4 border-b border-border-light">
              <div className="flex items-center gap-5 text-sm text-text-secondary flex-wrap">
                {r.avgRating > 0 && (
                  <span className="flex items-center gap-1.5 font-semibold text-text-primary">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    {r.avgRating.toFixed(1)}
                    <span className="font-normal text-text-muted text-xs">({r.ratingCount || 0} reviews)</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {r.estimatedDeliveryMin || 30}–{(r.estimatedDeliveryMin || 30) + 10} min
                </span>
                <span className="flex items-center gap-1.5">
                  <Bike size={14} />
                  {r.deliveryFee === 0 ? <span className="text-green-600 font-semibold">Free delivery</span> : `£${((r.deliveryFee || 250) / 100).toFixed(2)} delivery`}
                </span>
                {r.minOrderAmount > 0 && <span className="text-text-muted">Min £{(r.minOrderAmount / 100).toFixed(2)}</span>}
              </div>
              {r.description && <p className="text-sm text-text-secondary mt-2 leading-relaxed">{r.description}</p>}
              <div className={`mt-2 text-xs font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${r.isOpenNow ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${r.isOpenNow ? 'bg-green-500' : 'bg-red-500'}`} />
                {r.isOpenNow ? 'Open now' : 'Closed'}
                {!r.isOpenNow && r.todayHours?.open && ` · Opens ${r.todayHours.open}`}
              </div>
            </div>

            {/* ─── Restaurant Details (Location, Hours, Licence) ─────────── */}
            <div className="bg-bg-card px-4 lg:px-0 py-4 border-b border-border-light space-y-4">
              {/* Location */}
              {r.address && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-600"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-primary uppercase tracking-wide">Location</p>
                    <p className="text-sm text-text-secondary mt-0.5">{r.address.line1}</p>
                    <p className="text-sm text-text-muted">{[r.address.city, r.address.postcode].filter(Boolean).join(', ')}</p>
                    {r.address.lat && (
                      <a href={`https://maps.google.com/?q=${r.address.lat},${r.address.lng}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-brand-500 font-semibold mt-1 inline-block hover:underline">
                        View on map →
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Opening Hours */}
              {r.openingHours?.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-text-primary uppercase tracking-wide">Opening Hours</p>
                    <div className="mt-1 space-y-0.5">
                      {r.openingHours.map((h, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className={`font-medium ${h.isOpen ? 'text-text-primary' : 'text-text-muted'}`}>{h.day}</span>
                          <span className={h.isOpen ? 'text-text-secondary' : 'text-text-muted'}>
                            {h.isOpen ? `${h.open} – ${h.close}` : 'Closed'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Food Hygiene & Licence */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600"><path d="M9 12l2 2 4-4"/><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/></svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-primary uppercase tracking-wide">Food Safety & Compliance</p>
                  {r.foodHygieneRating != null && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-text-primary">Hygiene Rating:</span>
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200">{r.foodHygieneRating}/5</span>
                    </div>
                  )}
                  {r.fhrsNumber && (
                    <p className="text-xs text-text-muted mt-0.5">FHRS: {r.fhrsNumber}</p>
                  )}
                  {r.companyRegNumber && (
                    <p className="text-xs text-text-muted mt-0.5">Company Reg: {r.companyRegNumber}</p>
                  )}
                  {r.vatNumber && (
                    <p className="text-xs text-text-muted mt-0.5">VAT: {r.vatNumber}</p>
                  )}
                  {!r.foodHygieneRating && !r.fhrsNumber && !r.companyRegNumber && (
                    <p className="text-xs text-text-muted mt-0.5">Registered food business</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky category nav */}
            <div className="sticky top-0 z-20 bg-bg-card border-b border-border-light overflow-x-auto no-scrollbar">
              <div className="flex gap-1 px-4 lg:px-0 py-2">
                {menu.map(cat => (
                  <button key={cat._id} onClick={() => scrollToCategory(cat._id)}
                    className={`px-4 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0
                      ${activeCategory === cat._id ? 'bg-brand-500 text-white' : 'text-text-secondary hover:bg-bg-section hover:text-text-primary'}`}>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {cat.items.map(item => (
                        <MenuItemCard key={item._id} item={item} restaurantId={r._id} restaurantName={r.name} onClick={setSelectedItem} />
                      ))}
                    </div>
                  </div>
                ))
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
        {/* Bottom bar — group order view or personal cart */}
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
        <ItemModal item={selectedItem} restaurant={r} onClose={() => setSelectedItem(null)} isRestaurantOpen={r.isOpenNow !== false && r.isOnline !== false} groupId={groupId} />
      )}
    </>
  )
}
