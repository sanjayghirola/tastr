import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchSearch, fetchRecentSearches, deleteRecentSearch, clearSearch } from '../../store/slices/restaurantsSlice.js'
import { RestaurantCard, MenuItemCard } from '../../components/cards/RestaurantCard.jsx'
import MainLayout from '../../layouts/MainLayout.jsx'
import { Search, ArrowLeft, X, SlidersHorizontal, Clock } from 'lucide-react'

const CUISINES = ['Pizza','Burgers','Indian','Chinese','Sushi','Vegan','Italian','Thai','Mexican','Japanese','Halal','Caribbean']
const DIETARY  = ['Vegan','Halal','Gluten-Free','Vegetarian']

function FiltersPanel({ filters, onChange, onClose }) {
  const [local, setLocal] = useState(filters)
  const set = (k, v) => setLocal(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-lg bg-bg-card md:rounded-3xl rounded-t-3xl px-5 py-5 max-h-[85vh] overflow-y-auto z-10 shadow-modal">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-text-primary">Filters</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg-section flex items-center justify-center hover:bg-brand-50 transition-colors"><X size={16} /></button>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-text-primary mb-2">Max Distance: <span className="text-brand-500 font-bold">{local.radiusKm} km</span></p>
            <input type="range" min="1" max="25" step="1" value={local.radiusKm} onChange={e => set('radiusKm', +e.target.value)} className="w-full accent-brand-500" />
            <div className="flex justify-between text-xs text-text-muted mt-1"><span>1 km</span><span>25 km</span></div>
          </div>

          <div>
            <p className="text-sm font-semibold text-text-primary mb-2">Min Rating</p>
            <div className="flex gap-2">
              {[0, 3, 3.5, 4, 4.5].map(r => (
                <button key={r} onClick={() => set('minRating', r)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all
                    ${local.minRating === r ? 'bg-brand-500 border-brand-500 text-white' : 'border-border text-text-secondary hover:border-brand-400'}`}>
                  {r === 0 ? 'Any' : `★ ${r}+`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-text-primary mb-2">
              Max Delivery Fee: <span className="text-brand-500 font-bold">{local.maxDeliveryFee === 9999 ? 'Any' : `£${(local.maxDeliveryFee / 100).toFixed(2)}`}</span>
            </p>
            <input type="range" min="0" max="500" step="50" value={local.maxDeliveryFee === 9999 ? 500 : local.maxDeliveryFee}
              onChange={e => set('maxDeliveryFee', +e.target.value === 500 ? 9999 : +e.target.value)} className="w-full accent-brand-500" />
          </div>

          <div>
            <p className="text-sm font-semibold text-text-primary mb-2">Cuisine</p>
            <div className="flex flex-wrap gap-2">
              {CUISINES.map(c => (
                <button key={c} onClick={() => set('cuisine', local.cuisine === c ? null : c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${local.cuisine === c ? 'bg-brand-500 border-brand-500 text-white' : 'border-border text-text-secondary hover:border-brand-400'}`}>{c}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-text-primary mb-2">Dietary</p>
            <div className="flex flex-wrap gap-2">
              {DIETARY.map(d => (
                <button key={d} onClick={() => set('dietary', local.dietary === d ? null : d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${local.dietary === d ? 'bg-brand-500 border-brand-500 text-white' : 'border-border text-text-secondary hover:border-brand-400'}`}>{d}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={() => { onChange({ radiusKm: 10, minRating: 0, maxDeliveryFee: 9999, cuisine: null, dietary: null }); onClose() }}
            className="flex-1 py-3 rounded-2xl border-2 border-border text-text-secondary text-sm font-semibold hover:border-brand-400 transition-colors">Clear All</button>
          <button onClick={() => { onChange(local); onClose() }}
            className="flex-1 py-3 rounded-2xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors">Apply Filters</button>
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  const navigate  = useNavigate()
  const dispatch  = useDispatch()
  const inputRef  = useRef()
  const { searchResults, recentSearches, isSearching } = useSelector(s => s.restaurants)

  const [query,      setQuery]      = useState('')
  const [tab,        setTab]        = useState('restaurants')
  const [showFilter, setShowFilter] = useState(false)
  const [filters,    setFilters]    = useState({ radiusKm: 10, minRating: 0, maxDeliveryFee: 9999, cuisine: null, dietary: null })

  useEffect(() => {
    dispatch(fetchRecentSearches())
    setTimeout(() => inputRef.current?.focus(), 100)
    return () => dispatch(clearSearch())
  }, [])

  const doSearch = (q) => {
    if (!q.trim()) return
    dispatch(fetchSearch({ q: q.trim(), ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v != null && v !== 9999)) }))
  }

  const hasResults = searchResults?.restaurants?.length > 0 || searchResults?.dishes?.length > 0

  return (
    <MainLayout>
      {showFilter && <FiltersPanel filters={filters} onChange={setFilters} onClose={() => setShowFilter(false)} />}

      <div className="px-4 lg:px-8 pt-6">
        {/* Search header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-bg-section flex items-center justify-center text-text-secondary hover:bg-brand-50 transition-colors flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 flex items-center gap-2.5 bg-bg-section rounded-2xl px-4 py-3 border border-border focus-within:border-brand-400 transition-colors">
            <Search size={16} className="text-text-muted flex-shrink-0" />
            <input ref={inputRef} type="text" value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch(query)}
              placeholder="Search restaurants and dishes…"
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none" />
            {query && (
              <button onClick={() => setQuery('')} className="text-text-muted hover:text-text-primary transition-colors"><X size={14} /></button>
            )}
          </div>
          <button onClick={() => setShowFilter(true)}
            className="w-10 h-10 rounded-full bg-bg-section flex items-center justify-center border border-border hover:border-brand-400 transition-colors flex-shrink-0">
            <SlidersHorizontal size={16} className="text-text-secondary" />
          </button>
        </div>

        {/* Active filters chips */}
        {(filters.cuisine || filters.dietary || filters.minRating > 0 || filters.radiusKm !== 10) && (
          <div className="flex gap-2 flex-wrap mb-4">
            {filters.cuisine && <span className="px-3 py-1 bg-brand-100 text-brand-700 text-xs font-semibold rounded-full">{filters.cuisine}</span>}
            {filters.dietary && <span className="px-3 py-1 bg-brand-100 text-brand-700 text-xs font-semibold rounded-full">{filters.dietary}</span>}
            {filters.minRating > 0 && <span className="px-3 py-1 bg-brand-100 text-brand-700 text-xs font-semibold rounded-full">★ {filters.minRating}+</span>}
            {filters.radiusKm !== 10 && <span className="px-3 py-1 bg-brand-100 text-brand-700 text-xs font-semibold rounded-full">{filters.radiusKm}km</span>}
          </div>
        )}

        {/* Recent searches */}
        {!hasResults && !isSearching && recentSearches?.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Recent</p>
            <div className="space-y-1">
              {recentSearches.map(s => (
                <div key={s.query} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-bg-section transition-colors">
                  <button onClick={() => { setQuery(s.query); doSearch(s.query) }}
                    className="flex items-center gap-3 text-sm text-text-primary flex-1 text-left">
                    <Clock size={14} className="text-text-muted flex-shrink-0" />
                    {s.query}
                  </button>
                  <button onClick={() => dispatch(deleteRecentSearch(s.query))}
                    className="text-text-muted hover:text-red-500 transition-colors p-1"><X size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {isSearching && <div className="flex justify-center py-16"><div className="spinner spinner-lg" /></div>}

        {/* Results */}
        {hasResults && !isSearching && (
          <>
            <div className="flex gap-2 mb-5">
              {['restaurants','dishes'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all capitalize
                    ${tab === t ? 'bg-brand-500 border-brand-500 text-white' : 'border-border text-text-secondary hover:border-brand-400'}`}>
                  {t} <span className="opacity-70">({t === 'restaurants' ? searchResults.restaurants.length : searchResults.dishes.length})</span>
                </button>
              ))}
            </div>

            {tab === 'restaurants' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {searchResults.restaurants.map(r => <RestaurantCard key={r._id} restaurant={r} />)}
              </div>
            )}

            {tab === 'dishes' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.dishes.map(item => (
                  <div key={item._id}>
                    <MenuItemCard item={item} onClick={() => navigate(`/restaurants/${item.restaurantId?._id}`)} />
                    {item.restaurantId?.name && <p className="text-xs text-text-muted mt-1 px-1">from {item.restaurantId.name}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty */}
        {!isSearching && !hasResults && query && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="font-bold text-text-primary text-lg">No results for "{query}"</h3>
            <p className="text-sm text-text-muted mt-2">Try a different term or adjust filters</p>
          </div>
        )}

        {!isSearching && !hasResults && !query && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🍽</div>
            <h3 className="font-bold text-text-primary">What are you craving?</h3>
            <p className="text-sm text-text-muted mt-2">Search for restaurants, cuisines or dishes</p>
          </div>
        )}

        <div className="h-8" />
      </div>
    </MainLayout>
  )
}
