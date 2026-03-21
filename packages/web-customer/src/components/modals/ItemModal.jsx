import { useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { apiAddItem } from '../../store/slices/cartSlice.js'
import api from '../../services/api.js'
import { X, Flame, Beef, Wheat, Droplets, Info, AlertTriangle } from 'lucide-react'

const DIETARY_ICONS = { Vegan: '🌱', Vegetarian: '🥦', 'Gluten-Free': '🌾', Halal: '☪️', 'Nut-Free': '🥜', 'Dairy-Free': '🥛' }
const DIETARY_COLORS = {
  Vegan: 'bg-green-50 text-green-700 border-green-200',
  Vegetarian: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Gluten-Free': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Halal: 'bg-teal-50 text-teal-700 border-teal-200',
  'Nut-Free': 'bg-orange-50 text-orange-700 border-orange-200',
  'Dairy-Free': 'bg-blue-50 text-blue-700 border-blue-200',
}

function ToppingGroup({ group, selections, onChange }) {
  const selected = selections[group._id] || []

  const toggle = (option) => {
    const prev = selections[group._id] || []
    if (group.multiSelect) {
      const has = prev.some(o => o.name === option.name)
      if (has) onChange(group._id, prev.filter(o => o.name !== option.name))
      else {
        if (group.max && prev.length >= group.max) return
        onChange(group._id, [...prev, option])
      }
    } else {
      onChange(group._id, prev.some(o => o.name === option.name) ? [] : [option])
    }
  }

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm font-bold text-text-primary">{group.name}</h4>
        {group.required && <span className="text-xs bg-red-50 text-red-600 font-semibold px-2 py-0.5 rounded-full border border-red-100">Required</span>}
        {group.max > 1 && <span className="text-xs text-text-muted">Up to {group.max}</span>}
      </div>
      <div className="space-y-2">
        {group.options.map(opt => {
          const isSelected = selected.some(o => o.name === opt.name)
          return (
            <button key={opt.name} type="button" onClick={() => toggle(opt)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left
                ${isSelected ? 'border-brand-500 bg-brand-50' : 'border-border bg-bg-card hover:border-brand-300'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center
                  ${isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-300'}`}>
                  {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
                <span className="text-sm text-text-primary">{opt.name}</span>
              </div>
              {opt.price > 0 && <span className="text-sm font-semibold text-brand-600">+£{(opt.price / 100).toFixed(2)}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function NutritionRow({ label, value, unit, highlight }) {
  if (value == null || value === '') return null
  return (
    <div className={`flex items-center justify-between py-2 border-b border-border-light last:border-0 ${highlight ? 'font-bold' : ''}`}>
      <span className={`text-sm ${highlight ? 'text-text-primary font-bold' : 'text-text-secondary'}`}>{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-brand-600 text-base' : 'text-text-primary'}`}>{value}<span className="text-xs text-text-muted font-normal ml-0.5">{unit}</span></span>
    </div>
  )
}

export default function ItemModal({ item, restaurant, onClose, isRestaurantOpen = true, groupId = null }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isAuthenticated } = useSelector(s => s.auth)
  const [qty,    setQty]    = useState(1)
  const [sels,   setSels]   = useState({})
  const [note,   setNote]   = useState('')
  const [errors, setErrors] = useState([])
  const [tab,    setTab]    = useState('order') // 'order' | 'nutrition'
  const [adding, setAdding] = useState(false)

  const toppingTotal = useMemo(() =>
    Object.values(sels).flat().reduce((sum, o) => sum + (o.price || 0), 0), [sels])

  const lineTotal = (item.price + toppingTotal) * qty

  const handleChange = (groupId, options) => {
    setSels(prev => ({ ...prev, [groupId]: options }))
    setErrors(prev => prev.filter(e => e !== groupId))
  }

  const validate = () => {
    const errs = (item.toppingGroups || []).filter(g => g.required && !(sels[g._id]?.length)).map(g => g._id)
    setErrors(errs)
    return errs.length === 0
  }

  const handleAdd = async () => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      onClose()
      navigate('/auth/login', { state: { from: { pathname: `/restaurants/${restaurant._id}` } } })
      return
    }
    if (!validate()) return
    const selectedToppings = Object.values(sels).flat().map(o => ({
      groupName: '', optionName: o.name, price: o.price || 0,
    }))
    const toppingSum = selectedToppings.reduce((s, t) => s + t.price, 0)

    if (groupId) {
      // Add item to group order via API
      setAdding(true)
      try {
        await api.post(`/group-orders/${groupId}/items`, {
          menuItemId:   item._id,
          name:         item.name,
          price:        item.price,
          photoUrl:     item.photoUrl || '',
          selectedToppings,
          quantity:     qty,
          note,
          subtotal:     (item.price + toppingSum) * qty,
        })
        onClose()
      } catch (e) {
        alert(e.response?.data?.message || 'Failed to add item to group order')
      } finally { setAdding(false) }
    } else {
      // Add to personal cart
      dispatch(apiAddItem({
        restaurantId: restaurant._id,
        menuItemId:   item._id,
        name:         item.name,
        price:        item.price,
        photoUrl:     item.photoUrl,
        selectedToppings,
        quantity:     qty,
        note,
      }))
      onClose()
    }
  }

  const n = item.nutrition || {}
  const hasNutrition = n.calories != null || n.fat != null || n.protein != null || n.carbs != null || item.calories != null
  const hasAllergens = item.allergens?.length > 0

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 p-0 md:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-bg-card w-full md:max-w-xl md:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-modal">

        {/* Photo */}
        <div className="relative h-52 md:h-60 bg-brand-50 flex-shrink-0">
          {item.photoUrl
            ? <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-7xl">🍽</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
            <X size={16} />
          </button>
          {/* Quick nutrition badge on photo */}
          {(item.calories || n.calories) && (
            <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <Flame size={12} className="text-orange-400" />
              <span className="text-white text-xs font-semibold">{n.calories || item.calories} kcal</span>
            </div>
          )}
        </div>

        {/* Item header */}
        <div className="px-5 pt-4 pb-3 border-b border-border-light flex-shrink-0">
          <h2 className="text-xl font-bold text-text-primary">{item.name}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {(item.dietary || []).map(d => (
              <span key={d} className={`text-xs px-2 py-0.5 rounded-full font-medium border ${DIETARY_COLORS[d] || 'bg-brand-50 text-brand-700 border-brand-200'}`}>
                {DIETARY_ICONS[d]} {d}
              </span>
            ))}
          </div>
          {item.description && <p className="text-sm text-text-secondary mt-2 leading-relaxed">{item.description}</p>}
        </div>

        {/* Tab bar — only show if has nutrition/allergens */}
        {(hasNutrition || hasAllergens) && (
          <div className="flex border-b border-border-light flex-shrink-0">
            <button onClick={() => setTab('order')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === 'order' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-text-muted hover:text-text-secondary'}`}>
              Customise
            </button>
            <button onClick={() => setTab('nutrition')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${tab === 'nutrition' ? 'text-brand-600 border-b-2 border-brand-500' : 'text-text-muted hover:text-text-secondary'}`}>
              <Info size={13} />
              Nutrition & Allergens
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* ─── Order tab ─── */}
          {tab === 'order' && (
            <div className="px-5 py-4">
              {/* Toppings */}
              {(item.toppingGroups || []).length > 0 && (
                <div className="mb-4">
                  {item.toppingGroups.map(g => (
                    <div key={g._id}>
                      {errors.includes(g._id) && (
                        <p className="text-xs text-red-600 font-medium mb-1">Please make a selection for "{g.name}"</p>
                      )}
                      <ToppingGroup group={g} selections={sels} onChange={handleChange} />
                    </div>
                  ))}
                </div>
              )}

              {/* Special instructions */}
              <div>
                <p className="text-sm font-semibold text-text-primary mb-1.5">Special Instructions</p>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="e.g. No onions, extra sauce…" rows={2}
                  className="w-full border border-border rounded-xl p-3 text-sm resize-none focus:border-brand-500 focus:outline-none bg-bg-input" />
              </div>
            </div>
          )}

          {/* ─── Nutrition tab ─── */}
          {tab === 'nutrition' && (
            <div className="px-5 py-4 space-y-5">

              {/* Macro quick view */}
              {hasNutrition && (
                <div>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Nutrition per serving</p>

                  {/* Big 4 macro cards */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { key: 'calories', label: 'Calories', unit: 'kcal', icon: <Flame size={14} />, color: 'text-orange-500 bg-orange-50' },
                      { key: 'protein',  label: 'Protein',  unit: 'g',    icon: <Beef size={14} />,  color: 'text-red-500 bg-red-50'    },
                      { key: 'carbs',    label: 'Carbs',    unit: 'g',    icon: <Wheat size={14} />, color: 'text-amber-600 bg-amber-50' },
                      { key: 'fat',      label: 'Fat',      unit: 'g',    icon: <Droplets size={14} />, color: 'text-blue-500 bg-blue-50' },
                    ].map(({ key, label, unit, icon, color }) => {
                      const val = key === 'calories' ? (n.calories ?? item.calories) : n[key]
                      if (val == null) return null
                      return (
                        <div key={key} className="bg-bg-section rounded-xl p-2.5 text-center">
                          <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center mx-auto mb-1.5`}>{icon}</div>
                          <p className="text-base font-black text-text-primary leading-none">{val}</p>
                          <p className="text-[10px] text-text-muted mt-0.5">{unit}</p>
                          <p className="text-[10px] font-semibold text-text-secondary mt-0.5">{label}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Full breakdown table */}
                  <div className="bg-bg-section rounded-xl px-4 py-2">
                    <NutritionRow label="Calories"  value={n.calories ?? item.calories} unit=" kcal" highlight />
                    <NutritionRow label="Fat"        value={n.fat}       unit="g" />
                    <NutritionRow label="of which saturates" value={n.saturates} unit="g" />
                    <NutritionRow label="Carbohydrates" value={n.carbs}  unit="g" />
                    <NutritionRow label="of which sugars" value={n.sugars} unit="g" />
                    <NutritionRow label="Protein"    value={n.protein}   unit="g" />
                    <NutritionRow label="Salt"       value={n.salt}      unit="g" />
                    <NutritionRow label="Fibre"      value={n.fibre}     unit="g" />
                  </div>
                </div>
              )}

              {/* Allergens */}
              {hasAllergens && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={15} className="text-red-500" />
                    <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Contains Allergens</p>
                  </div>
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                    <div className="flex flex-wrap gap-2">
                      {item.allergens.map(a => (
                        <span key={a} className="px-3 py-1.5 bg-white border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
                          {a}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-red-600 mt-3">
                      ⚠️ If you have a food allergy, please contact the restaurant directly before ordering.
                    </p>
                  </div>
                </div>
              )}

              {!hasNutrition && !hasAllergens && (
                <div className="text-center py-8 text-text-muted">
                  <Info size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nutrition information not available for this item.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Sticky footer ─── */}
        <div className="px-5 py-4 border-t border-border-light bg-bg-card flex-shrink-0">
          <div className="flex items-center gap-4 mb-3">
            {/* Qty stepper */}
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full border-2 border-brand-400 text-brand-500 font-bold text-xl flex items-center justify-center hover:bg-brand-50 transition-colors">−</button>
              <span className="text-lg font-bold text-text-primary w-6 text-center">{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                className="w-10 h-10 rounded-full bg-brand-500 text-white font-bold text-xl flex items-center justify-center hover:bg-brand-600 transition-colors">+</button>
            </div>
            <div className="flex-1 text-right">
              <span className="text-xs text-text-muted block">Total</span>
              <p className="text-2xl font-black text-brand-600">£{(lineTotal / 100).toFixed(2)}</p>
            </div>
          </div>
          <button onClick={handleAdd} disabled={!isRestaurantOpen || adding}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${isRestaurantOpen && !adding ? 'bg-brand-500 text-white hover:bg-brand-600 active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
            {adding ? 'Adding…' : !isRestaurantOpen ? 'Restaurant is currently closed' : groupId ? `Add to Group Order · £${(lineTotal / 100).toFixed(2)}` : `Add to Order · £${(lineTotal / 100).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
