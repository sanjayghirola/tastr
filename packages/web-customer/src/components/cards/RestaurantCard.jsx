import { useNavigate } from 'react-router-dom'
import { Star, Clock, Bike, Flame } from 'lucide-react'

const DIETARY_ICONS = { Vegan: '🌱', Vegetarian: '🥦', 'Gluten-Free': '🌾', Halal: '☪️', 'Nut-Free': '🥜', 'Dairy-Free': '🥛' }

export function RestaurantCard({ restaurant: r, className = '' }) {
  const navigate = useNavigate()
  const cover = r.coverPhotos?.[0]?.url
  console.log('RestaurantCard render', r)
  console.log('RestaurantCard cover', cover)

  return (
    <div
      onClick={() => navigate(`/restaurants/${r._id}`)}
      className={`group bg-bg-card rounded-2xl overflow-hidden border border-border-light hover:border-brand-300 hover:shadow-elevated transition-all duration-200 cursor-pointer ${className}`}
    >
      {/* Cover */}
      <div className="relative h-40 bg-brand-50 overflow-hidden">
        {r.logoUrl
          ? <img src={cover ? cover : r.logoUrl} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center">
              {r.logoUrl ? <img src={r.logoUrl} alt={r.name} className="h-20 w-20 rounded-full object-cover opacity-70" /> : <span className="text-5xl opacity-40">🍽</span>}
            </div>}

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-start">
          <div className="flex flex-col gap-1">
            {r.deliveryFee === 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500 text-white shadow-sm">Free Delivery</span>
            )}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${(r.isOpenNow ?? r.isOnline) ? 'bg-green-500 text-white' : 'bg-black/60 text-white'}`}>
            {(r.isOpenNow ?? r.isOnline) ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-text-primary text-sm leading-tight">{r.name}</h3>
          {r.avgRating > 0 && (
            <div className="flex items-center gap-0.5 flex-shrink-0 bg-yellow-50 px-1.5 py-0.5 rounded-md">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[11px] font-bold text-yellow-700">{r.avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Cuisines */}
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          {(r.cuisines || []).slice(0, 2).map(c => (
            <span key={c} className="text-[11px] text-text-muted">{c}</span>
          ))}
          {(r.cuisines || []).length > 2 && <span className="text-[11px] text-text-muted">+{r.cuisines.length - 2}</span>}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 text-[11px] text-text-muted flex-wrap">
          <span className="flex items-center gap-1"><Clock size={10} />{r.estimatedDeliveryMin || 30}–{(r.estimatedDeliveryMin || 30) + 10} min</span>
          <span className="text-border">·</span>
          {r.deliveryFee === 0
            ? <span className="text-green-600 font-semibold">Free delivery</span>
            : <span className="flex items-center gap-1"><Bike size={10} />£{((r.deliveryFee || 250) / 100).toFixed(2)}</span>}
          {r._distanceKm != null && <><span className="text-border">·</span><span>{r._distanceKm} km</span></>}
        </div>
      </div>
    </div>
  )
}

export function MenuItemCard({ item, onClick, className = '' }) {
  const n = item.nutrition || {}
  const cal = n.calories ?? item.calories

  return (
    <div
      onClick={() => onClick?.(item)}
      className={`group bg-bg-card rounded-xl overflow-hidden border border-border-light hover:border-brand-300 hover:shadow-card transition-all cursor-pointer flex gap-3 p-3 ${className}`}
    >
      {/* Photo */}
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-brand-50 flex-shrink-0 relative">
        {item.photoUrl
          ? <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
          : <div className="w-full h-full flex items-center justify-center text-2xl opacity-40">🍽</div>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-text-primary text-sm leading-tight">{item.name}</h4>
        {item.description && (
          <p className="text-xs text-text-muted mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {(item.dietary || []).slice(0, 3).map(d => (
            <span key={d} className="text-xs" title={d}>{DIETARY_ICONS[d] || d.slice(0,1)}</span>
          ))}
          {cal && (
            <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
              <Flame size={9} className="text-orange-400" />{cal}kcal
            </span>
          )}
          {item.allergens?.length > 0 && (
            <span className="text-[10px] text-red-500 font-semibold">⚠️ Allergens</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold text-brand-600">£{(item.price / 100).toFixed(2)}</span>
          <button
            onClick={e => { e.stopPropagation(); onClick?.(item) }}
            className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-base font-bold hover:bg-brand-600 active:scale-90 transition-all flex-shrink-0"
          >+</button>
        </div>
      </div>
    </div>
  )
}
