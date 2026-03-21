import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Toggle, Button, Badge } from '../../components/global/index.jsx'
import api from '../../services/api.js'

// ─── Sortable Category Row ────────────────────────────────────────────────────
function SortableCategoryRow({ cat, isActive, onSelect, onEdit, onDelete, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat._id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(cat._id)}
      className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer border transition-all
        ${isActive ? 'bg-brand-50 border-brand-400' : 'bg-bg-card border-border hover:border-brand-200'}`}
    >
      {/* Drag handle */}
      <span {...attributes} {...listeners} className="text-text-muted cursor-grab active:cursor-grabbing px-0.5 text-lg select-none" onClick={e => e.stopPropagation()}>⠿</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{cat.name}</p>
        <p className="text-xs text-text-muted">{cat.itemCount || 0} items</p>
      </div>

      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <Toggle checked={cat.isEnabled} onChange={v => onToggle(cat._id, v)} size="sm" />
        <button onClick={() => onEdit(cat)} className="w-7 h-7 rounded-lg hover:bg-bg-section flex items-center justify-center text-text-muted hover:text-brand-500 transition-colors text-sm">✏️</button>
        <button onClick={() => onDelete(cat._id)} className="w-7 h-7 rounded-lg hover:bg-error-50 flex items-center justify-center text-text-muted hover:text-error-500 transition-colors text-sm">🗑</button>
      </div>
    </div>
  )
}

// ─── Menu Item Row ────────────────────────────────────────────────────────────
function MenuItemRow({ item, onEdit, onDelete, onToggle, isSelected, onSelect }) {
  return (
    <div
      onClick={() => onSelect?.(item)}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer
        ${isSelected ? 'border-brand-400 bg-brand-50' : 'bg-bg-card border-border hover:border-brand-200'}`}
    >
      {/* Photo thumbnail */}
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-brand-50 flex-shrink-0 border border-border-light">
        {item.photoUrl ? (
          <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🍽</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{item.name}</p>
        <p className="text-xs text-brand-600 font-bold">£{(item.price / 100).toFixed(2)}</p>
        {(item.dietary || []).length > 0 && (
          <div className="flex gap-1 mt-0.5">
            {item.dietary.slice(0, 3).map(d => <Badge key={d} variant="neutral" size="xs">{d}</Badge>)}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <Toggle checked={item.isAvailable} onChange={v => onToggle(item._id, v)} size="sm" />
        <button onClick={() => onEdit(item)} className="w-7 h-7 rounded-lg hover:bg-bg-section flex items-center justify-center text-sm hover:text-brand-500 transition-colors">✏️</button>
        <button onClick={() => onDelete(item._id)} className="w-7 h-7 rounded-lg hover:bg-error-50 flex items-center justify-center text-sm hover:text-error-500 transition-colors">🗑</button>
      </div>
    </div>
  )
}

// ─── Main MenuPage ─────────────────────────────────────────────────────────────
export default function MenuPage() {
  const navigate    = useNavigate()
  const [categories,  setCategories]  = useState([])
  const [items,       setItems]       = useState([])
  const [activeCat,   setActiveCat]   = useState(null)
  const [selectedItems, setSelected]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [editingCat,  setEditingCat]  = useState(null)
  const [newCatName,  setNewCatName]  = useState('')
  const [showNewCat,  setShowNewCat]  = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const loadCategories = async () => {
    try {
      const res = await api.get('/menu/categories')
      setCategories(res.data.categories)
      if (!activeCat && res.data.categories.length > 0) setActiveCat(res.data.categories[0]._id)
    } catch {}
  }

  const loadItems = async (catId) => {
    if (!catId) return
    try {
      const res = await api.get('/restaurants/me/menu')
      const catItems = res.data.menu?.find(c => c._id === catId)?.items || []
      setItems(catItems)
    } catch {}
  }

  useEffect(() => { loadCategories().finally(() => setLoading(false)) }, [])
  useEffect(() => { if (activeCat) loadItems(activeCat) }, [activeCat])

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = categories.findIndex(c => c._id === active.id)
    const newIdx = categories.findIndex(c => c._id === over.id)
    const reordered = arrayMove(categories, oldIdx, newIdx).map((c, i) => ({ ...c, sortOrder: i }))
    setCategories(reordered)
    await api.patch('/menu/categories/reorder', { order: reordered.map(c => ({ id: c._id, sortOrder: c.sortOrder })) })
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    await api.post('/menu/categories', { name: newCatName.trim() })
    setNewCatName('')
    setShowNewCat(false)
    loadCategories()
  }

  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete this category and all its items?')) return
    await api.delete(`/menu/categories/${id}`)
    if (activeCat === id) setActiveCat(categories.find(c => c._id !== id)?._id || null)
    loadCategories()
  }

  const handleToggleCategory = async (id, val) => {
    await api.put(`/menu/categories/${id}`, { isEnabled: val })
    setCategories(cats => cats.map(c => c._id === id ? { ...c, isEnabled: val } : c))
  }

  const handleToggleItem = async (id, val) => {
    await api.patch(`/menu/items/${id}/availability`, { isAvailable: val })
    setItems(its => its.map(i => i._id === id ? { ...i, isAvailable: val } : i))
  }

  const handleDeleteItem = async (id) => {
    if (!confirm('Delete this item?')) return
    await api.delete(`/menu/items/${id}`)
    setItems(its => its.filter(i => i._id !== id))
    loadCategories()
  }

  const handleBulkToggle = async (val) => {
    const ids = selectedItems.map(i => i._id)
    await api.patch('/menu/items/bulk-availability', { ids, isAvailable: val })
    setItems(its => its.map(i => ids.includes(i._id) ? { ...i, isAvailable: val } : i))
    setSelected([])
  }

  const toggleSelectItem = (item) => {
    setSelected(prev => prev.some(i => i._id === item._id) ? prev.filter(i => i._id !== item._id) : [...prev, item])
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner spinner-lg" /></div>

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Left — Categories */}
      <div className="w-56 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Categories</h2>
          <button onClick={() => setShowNewCat(true)} className="w-7 h-7 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold hover:bg-brand-600 transition-colors text-lg leading-none">+</button>
        </div>

        {showNewCat && (
          <div className="mb-3 p-2 bg-brand-50 rounded-xl border border-brand-200">
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
              placeholder="Category name"
              autoFocus
              className="w-full text-sm px-2 py-1.5 border border-border rounded-lg focus:border-brand-500 focus:outline-none"
            />
            <div className="flex gap-1.5 mt-2">
              <button onClick={handleCreateCategory} className="flex-1 text-xs py-1 rounded-lg bg-brand-500 text-white font-semibold">Add</button>
              <button onClick={() => { setShowNewCat(false); setNewCatName('') }} className="flex-1 text-xs py-1 rounded-lg border border-border text-text-muted">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-1.5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map(c => c._id)} strategy={verticalListSortingStrategy}>
              {categories.map(cat => (
                <SortableCategoryRow
                  key={cat._id}
                  cat={cat}
                  isActive={activeCat === cat._id}
                  onSelect={setActiveCat}
                  onEdit={setEditingCat}
                  onDelete={handleDeleteCategory}
                  onToggle={handleToggleCategory}
                />
              ))}
            </SortableContext>
          </DndContext>

          {categories.length === 0 && (
            <p className="text-xs text-text-muted text-center py-6">No categories yet. Create one above.</p>
          )}
        </div>
      </div>

      {/* Right — Items */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              {categories.find(c => c._id === activeCat)?.name || 'Items'}
            </h2>
            <p className="text-xs text-text-muted">{items.length} items</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedItems.length > 0 && (
              <>
                <button onClick={() => handleBulkToggle(true)} className="text-xs px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700 font-semibold hover:bg-green-200 transition-colors">Enable {selectedItems.length}</button>
                <button onClick={() => handleBulkToggle(false)} className="text-xs px-2.5 py-1.5 rounded-lg bg-error-100 text-error-700 font-semibold hover:bg-error-200 transition-colors">Disable {selectedItems.length}</button>
              </>
            )}
            <Button variant="primary" size="sm" onClick={() => navigate(`/menu/items/new?categoryId=${activeCat}`)}>+ Add Item</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {!activeCat ? (
            <p className="text-sm text-text-muted text-center py-10">Select a category to manage its items</p>
          ) : items.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-text-muted text-sm mb-3">No items in this category</p>
              <Button variant="primary" size="sm" onClick={() => navigate(`/menu/items/new?categoryId=${activeCat}`)}>+ Add First Item</Button>
            </div>
          ) : (
            items.map(item => (
              <MenuItemRow
                key={item._id}
                item={item}
                isSelected={selectedItems.some(i => i._id === item._id)}
                onSelect={toggleSelectItem}
                onEdit={item => navigate(`/menu/items/${item._id}/edit`)}
                onDelete={handleDeleteItem}
                onToggle={handleToggleItem}
              />
            ))
          )}
        </div>
      </div>

      {/* Edit category modal */}
      {editingCat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setEditingCat(null)}>
          <div className="bg-bg-card rounded-2xl p-5 w-full max-w-sm shadow-modal animate-scale-in">
            <h3 className="font-bold text-text-primary mb-3">Edit Category</h3>
            <input
              type="text"
              defaultValue={editingCat.name}
              id="editCatInput"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" size="md" onClick={() => setEditingCat(null)} className="flex-1">Cancel</Button>
              <Button variant="primary" size="md" className="flex-1" onClick={async () => {
                const name = document.getElementById('editCatInput').value.trim()
                if (!name) return
                await api.put(`/menu/categories/${editingCat._id}`, { name })
                setEditingCat(null)
                loadCategories()
              }}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
