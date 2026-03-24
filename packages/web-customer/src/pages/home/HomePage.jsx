import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchRestaurants, fetchBanners, fetchCategories, setUserLocation } from '../../store/slices/restaurantsSlice.js'
import { RestaurantCard } from '../../components/cards/RestaurantCard.jsx'
import MainLayout from '../../layouts/MainLayout.jsx'
import { Search } from 'lucide-react'

function HeroBanner({ banners, navigate }) {
  const [idx, setIdx] = useState(0)
  if (!banners?.length) return null
  const b = banners[idx]
  return (
    <div
      className="relative rounded-2xl overflow-hidden h-56 md:h-96 cursor-pointer"
      onClick={() => b.linkType !== 'none' && navigate(b.linkType === 'restaurant' ? `/restaurants/${b.linkValue}` : (b.linkValue || '/home'))}
    >
      <img
        src={b.imageUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format'}
        alt={b.title} className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-4 left-5 text-white">
        <p className="font-bold text-xl leading-tight">{b.title}</p>
        {b.subtitle && <p className="text-sm text-white/80 mt-0.5">{b.subtitle}</p>}
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-4 right-5 flex gap-1">
          {banners.map((_, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setIdx(i) }}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryPill({ cat, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all flex-shrink-0
        ${active ? 'bg-brand-500 border-brand-500 text-white shadow-sm' : 'bg-bg-card border-border text-text-secondary hover:border-brand-400'}`}>
      <span>{cat.icon}</span>
      <span>{cat.name}</span>
    </button>
  )
}

export default function HomePage() {
  const navigate  = useNavigate()
  const dispatch  = useDispatch()
  const { user }  = useSelector(s => s.auth)
  const { list: restaurants, banners, categories, isLoading } = useSelector(s => s.restaurants)
  const [activeCuisine, setActiveCuisine] = useState(null)

  useEffect(() => {
    dispatch(fetchBanners('hero'))
    dispatch(fetchCategories())
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          dispatch(setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
          dispatch(fetchRestaurants({ lat: pos.coords.latitude, lng: pos.coords.longitude, radiusKm: 10 }))
        },
        () => dispatch(fetchRestaurants({}))
      )
    } else {
      dispatch(fetchRestaurants({}))
    }
  }, [dispatch])

  useEffect(() => {
    dispatch(fetchRestaurants(activeCuisine ? { cuisine: activeCuisine } : {}))
  }, [activeCuisine, dispatch])

  const featured    = restaurants.filter(r => r.avgRating >= 4).slice(0, 6)
  const recommended = restaurants.slice(0, 8)

  return (
    <MainLayout>
      <div className="max-w-8xl mx-auto px-4 lg:px-8">

        {/* ─── Mobile search bar (desktop search is in header) ────────── */}
        <div className="md:hidden pt-4 pb-3">
          <button onClick={() => navigate('/search')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-bg-section rounded-2xl border border-border text-text-muted hover:border-brand-400 transition-colors">
            <Search size={16} className="text-text-muted flex-shrink-0" />
            <span className="flex-1 text-left text-sm">Search restaurants and dishes…</span>
          </button>
        </div>

        {/* ─── Hero banner ─────────────────────────────────────────────── */}
        <div className="mb-6 pt-2 lg:pt-6">
          <HeroBanner banners={banners} navigate={navigate} />
        </div>

        {/* ─── Category pills ──────────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 -mx-4 lg:-mx-0 px-4 lg:px-0">
          {[{ name: 'All', icon: '🍽' }, ...categories].map(cat => (
            <CategoryPill key={cat.name} cat={cat}
              active={activeCuisine === cat.name || (!activeCuisine && cat.name === 'All')}
              onClick={() => setActiveCuisine(cat.name === 'All' ? null : cat.name)} />
          ))}
        </div>

        {/* ─── Student promo + Gift cards (side-by-side on desktop) ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-r from-brand-600 to-brand-400 rounded-2xl p-5 flex items-center justify-between">
            <div className="text-white">
              <p className="text-xs font-semibold opacity-80">Exclusive offer</p>
              <p className="text-2xl font-black leading-tight">30% OFF</p>
              <p className="text-xs opacity-80 mt-0.5">for verified students</p>
            </div>
            <div className="text-right">
              <span className="text-4xl">🎓</span>
              <button onClick={() => navigate('/student-verify')}
                className="block mt-2 bg-white text-brand-600 text-xs font-bold px-4 py-1.5 rounded-full hover:bg-brand-50 transition-colors">
                {user?.isStudentVerified ? 'Redeem' : 'Verify ID'}
              </button>
            </div>
          </div>

          <div onClick={() => navigate('/gift-cards')}
            className="bg-bg-card border border-brand-200 rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:border-brand-400 hover:shadow-card transition-all">
            <div className="text-4xl">🎁</div>
            <div className="flex-1">
              <p className="font-bold text-text-primary">Gift Cards</p>
              <p className="text-xs text-text-muted mt-0.5">Treat someone — send a Tastr gift card</p>
            </div>
            <span className="text-brand-500 font-bold text-lg">→</span>
          </div>
        </div>

        {/* ─── Recommended grid ─────────────────────────────────────────── */}
        {recommended.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-primary">🍽 Tailored to your cravings</h2>
              <button onClick={() => navigate('/search')} className="text-sm font-semibold text-brand-500 hover:text-brand-600 transition-colors">See all ›</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recommended.map(r => <RestaurantCard key={r._id} restaurant={r} />)}
            </div>
          </section>
        )}

        {/* ─── Featured ─────────────────────────────────────────────────── */}
        {featured.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-primary">⭐ Featured restaurants</h2>
              <button onClick={() => navigate('/search')} className="text-sm font-semibold text-brand-500 hover:text-brand-600 transition-colors">See all ›</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map(r => <RestaurantCard key={r._id} restaurant={r} />)}
            </div>
          </section>
        )}

        {/* Loading */}
        {isLoading && <div className="flex justify-center py-16"><div className="spinner spinner-lg" /></div>}

        {/* Empty */}
        {!isLoading && restaurants.length === 0 && (
          <div className="text-center py-20 px-8">
            <div className="text-6xl mb-4">🍽</div>
            <h3 className="text-lg font-bold text-text-primary">No restaurants found</h3>
            <p className="text-sm text-text-muted mt-2">Try expanding your search radius or check back later</p>
          </div>
        )}

        <div className="h-6" />
      </div>
    </MainLayout>
  )
}
