import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, ShoppingBag, Edit2, Trash2, ToggleLeft, ToggleRight, Package, ChevronLeft, Upload, X } from 'lucide-react'
import { Badge } from '../../components/global/index.jsx'
import api from '../../services/api.js'

const fmt = p => `£${((p || 0) / 100).toFixed(2)}`
const CATEGORIES = ['equipment','clothing','accessories','safety','other']
const CAT_LABELS = { equipment:'Equipment', clothing:'Clothing', accessories:'Accessories', safety:'Safety', other:'Other' }
const CAT_COLORS = { equipment:'bg-blue-100 text-blue-700', clothing:'bg-purple-100 text-purple-700', accessories:'bg-amber-100 text-amber-700', safety:'bg-red-100 text-red-700', other:'bg-gray-100 text-gray-700' }

// ─── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product, onToggle, onEdit, onDelete }) {
  return (
    <div className={`bg-bg-card border border-border rounded-2xl overflow-hidden transition-all ${!product.isActive ? 'opacity-60' : ''}`}>
      <div className="relative">
        {product.photoUrl ? (
          <img src={product.photoUrl} alt={product.name} className="w-full h-44 object-cover" />
        ) : (
          <div className="w-full h-44 bg-bg-section flex items-center justify-center">
            <Package size={36} className="text-text-muted opacity-40" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${CAT_COLORS[product.category] || CAT_COLORS.other}`}>
            {CAT_LABELS[product.category] || product.category}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <Badge variant={product.isActive ? 'success' : 'neutral'}>{product.isActive ? 'Active' : 'Inactive'}</Badge>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-text-primary text-sm mb-1 truncate">{product.name}</h3>
        <p className="text-xs text-text-muted line-clamp-2 mb-3 min-h-[2.5rem]">{product.description || '—'}</p>
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-extrabold text-text-primary">{fmt(product.price)}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-xl ${product.stock > 10 ? 'bg-green-50 text-green-700' : product.stock > 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onToggle(product)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-bg-section transition-colors text-text-muted">
            {product.isActive ? <ToggleRight size={14} className="text-green-500" /> : <ToggleLeft size={14} />}
            {product.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={() => onEdit(product)}
            className="p-2 rounded-xl border border-border hover:bg-bg-section transition-colors text-text-muted hover:text-brand-500">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(product)}
            className="p-2 rounded-xl border border-border hover:bg-bg-section transition-colors text-text-muted hover:text-red-500">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Product Form Page ─────────────────────────────────────────────────────────
export function ProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)

  const [form, setForm] = useState({
    name: '', description: '', price: '', stock: '', category: 'equipment', isActive: true
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!isEdit) return
    api.get(`/driver-store/products/${id}`)
      .then(r => {
        const p = r.data.product
        setForm({ name: p.name, description: p.description || '', price: (p.price / 100).toFixed(2), stock: p.stock, category: p.category, isActive: p.isActive })
        if (p.photoUrl) setPreview(p.photoUrl)
      })
      .catch(() => navigate('/driver-store'))
      .finally(() => setFetching(false))
  }, [id])

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setPreview(URL.createObjectURL(f)) }
  }

  const handleSubmit = async () => {
    if (!form.name || !form.price || !form.stock) { setError('Name, price and stock are required'); return }
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (file) fd.append('photo', file)
      if (isEdit) await api.put(`/driver-store/admin/products/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      else await api.post('/driver-store/admin/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      navigate('/driver-store')
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save product')
    } finally { setLoading(false) }
  }

  const inputCls = 'w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section placeholder:text-text-muted transition-colors'

  if (fetching) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-6">
      <button onClick={() => navigate('/driver-store')} className="flex items-center gap-1.5 text-text-muted mb-6 text-sm hover:text-text-primary transition-colors">
        <ChevronLeft size={16} /> Back to Store
      </button>
      <h1 className="text-2xl font-bold text-text-primary mb-6">{isEdit ? 'Edit Product' : 'Add Product'}</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Left */}
        <div className="space-y-5">
          <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-4">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Product Details</p>
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">Product Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Thermal Delivery Bag" className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
                placeholder="Product description…" className={inputCls + ' resize-none'} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-text-primary mb-1.5 block">Price (£) <span className="text-red-500">*</span></label>
                <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="9.99" className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-semibold text-text-primary mb-1.5 block">Stock <span className="text-red-500">*</span></label>
                <input type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="50" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-text-primary mb-1.5 block">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-text-primary">Active</p>
                <p className="text-xs text-text-muted">Visible to drivers</p>
              </div>
              <button onClick={() => set('isActive', !form.isActive)}
                className={`w-11 h-6 rounded-full transition-colors relative ${form.isActive ? 'bg-brand-500' : 'bg-border'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-3.5 bg-brand-500 text-white font-bold rounded-2xl text-sm hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</> : `${isEdit ? 'Save Changes' : 'Create Product'}`}
          </button>
        </div>

        {/* Right — Photo */}
        <div className="bg-bg-card border border-border rounded-2xl p-6">
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Product Photo</p>
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full h-64 object-cover rounded-2xl mb-3" />
              <button onClick={() => { setFile(null); setPreview(null) }}
                className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl h-64 cursor-pointer hover:border-brand-400 hover:bg-brand-50/20 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-bg-section flex items-center justify-center mb-3">
                <Upload size={22} className="text-text-muted" />
              </div>
              <p className="text-sm font-semibold text-text-primary">Upload product photo</p>
              <p className="text-xs text-text-muted mt-1">JPG, PNG, WebP — max 10MB</p>
              <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
            </label>
          )}
          {!preview && (
            <div className="mt-4 space-y-2 text-xs text-text-muted">
              <p className="font-semibold text-text-primary text-sm">Photo tips:</p>
              <p>• Use a clean white or light background</p>
              <p>• Show the full product clearly</p>
              <p>• Minimum 600×600px for best quality</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Store Page ───────────────────────────────────────────────────────────
export default function DriverStorePage() {
  const navigate  = useNavigate()
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [catFilter, setCatFilter] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/driver-store/admin/products')
      .then(r => setProducts(r.data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (product) => {
    try {
      await api.patch(`/driver-store/admin/products/${product._id}/toggle`)
      load()
    } catch {}
  }

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/driver-store/admin/products/${product._id}`)
      load()
    } catch { alert('Failed to delete') }
  }

  const filtered = catFilter ? products.filter(p => p.category === catFilter) : products
  const activeCount = products.filter(p => p.isActive).length
  const outOfStock  = products.filter(p => p.stock === 0).length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Driver Store</h1>
          <p className="text-sm text-text-muted mt-0.5">{products.length} products · {activeCount} active · {outOfStock} out of stock</p>
        </div>
        <button onClick={() => navigate('/driver-store/new')}
          className="flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors shadow-sm">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: products.length, color: 'bg-brand-500' },
          { label: 'Active',         value: activeCount,     color: 'bg-green-500' },
          { label: 'Out of Stock',   value: outOfStock,      color: 'bg-red-500'   },
          { label: 'Total Sold',     value: products.reduce((s, p) => s + (p.soldCount || 0), 0), color: 'bg-blue-500' },
        ].map(s => (
          <div key={s.label} className="bg-bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-text-muted mb-1">{s.label}</p>
            <p className="text-2xl font-extrabold text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {['', ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors capitalize
              ${catFilter === c ? 'bg-brand-500 text-white' : 'bg-bg-card border border-border text-text-muted hover:text-text-primary'}`}>
            {c ? CAT_LABELS[c] : 'All'}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl p-16 text-center">
          <ShoppingBag size={36} className="mx-auto mb-3 text-text-muted opacity-40" />
          <p className="font-semibold text-text-primary mb-1">No products yet</p>
          <p className="text-sm text-text-muted mb-5">Add products for drivers to purchase</p>
          <button onClick={() => navigate('/driver-store/new')}
            className="px-5 py-2.5 bg-brand-500 text-white font-bold rounded-xl text-sm hover:bg-brand-600 transition-colors">
            Add First Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {filtered.map(p => (
            <ProductCard key={p._id} product={p}
              onToggle={handleToggle}
              onEdit={() => navigate(`/driver-store/${p._id}/edit`)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
