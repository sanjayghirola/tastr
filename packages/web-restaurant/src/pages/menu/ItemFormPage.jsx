import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Button } from '../../components/global/index.jsx'
import ImageCrop from '../../components/common/ImageCrop.jsx'
import ToppingBuilder from '../../components/menu/ToppingBuilder.jsx'
import api from '../../services/api.js'

const DIETARY_OPTIONS = ['Vegan','Vegetarian','Gluten-Free','Halal','Nut-Free','Dairy-Free']

const ALLERGEN_LIST = [
  'Celery','Cereals','Crustaceans','Eggs','Fish','Lupin',
  'Milk','Molluscs','Mustard','Nuts','Peanuts','Sesame','Soya','Sulphites',
]

const NUTRITION_FIELDS = [
  { key: 'calories',  label: 'Calories',   unit: 'kcal', colSpan: 2 },
  { key: 'fat',       label: 'Fat',         unit: 'g' },
  { key: 'saturates', label: 'Saturates',   unit: 'g' },
  { key: 'carbs',     label: 'Carbs',       unit: 'g' },
  { key: 'sugars',    label: 'Sugars',      unit: 'g' },
  { key: 'protein',   label: 'Protein',     unit: 'g' },
  { key: 'salt',      label: 'Salt',        unit: 'g' },
  { key: 'fibre',     label: 'Fibre',       unit: 'g' },
]

const schema = z.object({
  name:        z.string().min(1, 'Name required'),
  description: z.string().optional(),
  price:       z.string().min(1, 'Price required'),
})

function PreviewCard({ name, price, photoSrc, dietary }) {
  return (
    <div className="sticky top-4">
      <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Preview</p>
      <div className="bg-bg-card rounded-xl border border-brand-200 overflow-hidden shadow-card">
        <div className="h-28 bg-brand-50 flex items-center justify-center overflow-hidden">
          {photoSrc ? <img src={photoSrc} alt="" className="w-full h-full object-cover" /> : <span className="text-5xl">🍽</span>}
        </div>
        <div className="p-3">
          <p className="font-semibold text-text-primary text-sm">{name || 'Item name'}</p>
          {dietary.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {dietary.map(d => <span key={d} className="text-xs bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-md font-medium">{d.split('-')[0]}</span>)}
            </div>
          )}
          <p className="text-brand-600 font-bold text-sm mt-1.5">{price ? `£${parseFloat(price||0).toFixed(2)}` : '£0.00'}</p>
        </div>
      </div>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-bg-section">
        <p className="text-sm font-bold text-text-primary">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function ItemFormPage() {
  const navigate        = useNavigate()
  const { id }          = useParams()
  const [params]        = useSearchParams()
  const isEdit          = !!id
  const defaultCatId    = params.get('categoryId')

  const [categories,    setCategories]  = useState([])
  const [selectedCat,   setSelectedCat] = useState(defaultCatId || '')
  const [dietary,       setDietary]     = useState([])
  const [allergens,     setAllergens]   = useState([])
  const [toppingGroups, setToppings]    = useState([])
  const [photoFile,     setPhotoFile]   = useState(null)
  const [photoPreview,  setPhotoPreview]= useState(null)
  const [cropSrc,       setCropSrc]     = useState(null)
  const [showCrop,      setShowCrop]    = useState(false)
  const [loading,       setLoading]     = useState(false)
  const [fetchLoad,     setFetchLoad]   = useState(isEdit)
  const [error,         setError]       = useState(null)
  const [nutrition,     setNutrition]   = useState(
    Object.fromEntries(NUTRITION_FIELDS.map(f => [f.key, '']))
  )
  const fileRef = useRef()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', price: '' },
  })

  useEffect(() => {
    api.get('/menu/categories').then(r => setCategories(r.data.categories)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    api.get(`/menu/items/${id}`)
      .then(r => {
        const item = r.data.item
        setValue('name', item.name)
        setValue('description', item.description || '')
        setValue('price', (item.price / 100).toFixed(2))
        setSelectedCat(item.categoryId?.toString())
        setDietary(item.dietary || [])
        setAllergens(item.allergens || [])
        setToppings(item.toppingGroups || [])
        if (item.photoUrl) setPhotoPreview(item.photoUrl)
        const n = item.nutrition || {}
        setNutrition(prev => ({
          ...prev,
          ...Object.fromEntries(Object.entries(n).map(([k,v]) => [k, v?.toString() || ''])),
          calories: n.calories?.toString() || item.calories?.toString() || '',
        }))
      })
      .catch(() => setError('Failed to load item'))
      .finally(() => setFetchLoad(false))
  }, [id])

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCropSrc(URL.createObjectURL(file))
    setShowCrop(true)
  }

  const handleCropDone = (blob) => {
    setPhotoFile(new File([blob], 'item.jpg', { type: 'image/jpeg' }))
    setPhotoPreview(URL.createObjectURL(blob))
    setShowCrop(false)
  }

  const toggleDietary  = d => setDietary(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])
  const toggleAllergen = a => setAllergens(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a])

  const onSubmit = async (data) => {
    if (!selectedCat) { setError('Please select a category'); return }
    setLoading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('name',       data.name)
      fd.append('price',      Math.round(parseFloat(data.price) * 100))
      fd.append('categoryId', selectedCat)
      if (data.description) fd.append('description', data.description)

      // Nutrition
      for (const f of NUTRITION_FIELDS) {
        if (nutrition[f.key] !== '') {
          fd.append(`nutrition_${f.key}`, nutrition[f.key])
          if (f.key === 'calories') fd.append('calories', nutrition[f.key])
        }
      }

      fd.append('allergens', JSON.stringify(allergens))
      dietary.forEach(d => fd.append('dietary[]', d))
      fd.append('toppingGroups', JSON.stringify(toppingGroups.map(g => ({
        ...g, _id: g._id?.startsWith('new_') ? undefined : g._id,
      }))))
      if (photoFile) fd.append('photo', photoFile)

      if (isEdit) {
        await api.put(`/menu/items/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        await api.post('/menu/items', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      navigate('/menu')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save item')
    } finally { setLoading(false) }
  }

  if (fetchLoad) return <div className="flex justify-center py-20"><div className="spinner spinner-lg" /></div>

  return (
    <div>
      {showCrop && <ImageCrop src={cropSrc} onCrop={handleCropDone} onCancel={() => setShowCrop(false)} />}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/menu')} className="w-9 h-9 rounded-full bg-bg-section flex items-center justify-center text-text-secondary hover:bg-brand-50 transition-colors text-lg font-bold">‹</button>
        <h1 className="text-2xl font-bold text-text-primary">{isEdit ? 'Edit Item' : 'New Menu Item'}</h1>
      </div>

      {error && <div className="mb-4 p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700">{error}</div>}

      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Photo */}
            <SectionCard title="Item Photo">
              <div onClick={() => fileRef.current?.click()}
                className="flex items-center gap-4 p-4 border-2 border-dashed border-brand-200 rounded-2xl cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-brand-50 flex-shrink-0 border border-brand-200">
                  {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">📷</div>}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Upload or drag &amp; drop</p>
                  <p className="text-xs text-text-muted mt-0.5">JPEG or PNG, max 5MB. Cropped square.</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
            </SectionCard>

            {/* Basic Info */}
            <SectionCard title="Basic Info">
              <div className="mb-4">
                <p className="text-sm font-semibold text-text-primary mb-2">Category <span className="text-error-500">*</span></p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <button key={c._id} type="button" onClick={() => setSelectedCat(c._id)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all
                        ${selectedCat === c._id ? 'bg-brand-500 border-brand-500 text-white' : 'bg-bg-card border-border text-text-secondary hover:border-brand-400'}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <Input label="Item Name" name="name" placeholder="e.g. Margherita Pizza" required error={errors.name?.message} {...register('name')} />
                <div>
                  <label className="text-sm font-semibold text-text-primary block mb-1.5">Description</label>
                  <textarea {...register('description')} rows={3} placeholder="Describe the item, ingredients…" maxLength={500}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm resize-none focus:border-brand-500 focus:outline-none bg-bg-card text-text-primary" />
                </div>
                <Input label="Price (£)" name="price" type="number" step="0.01" min="0.01" placeholder="0.00" required error={errors.price?.message} {...register('price')} />
              </div>
            </SectionCard>

            {/* Nutrition Info */}
            <SectionCard title="Nutrition Info (per serving)">
              <p className="text-xs text-text-muted mb-4">All fields optional. Calories appear on the menu card; full breakdown shown on item detail.</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {NUTRITION_FIELDS.map(f => (
                  <div key={f.key} className={f.colSpan === 2 ? 'col-span-2' : ''}>
                    <label className="text-xs font-semibold text-text-muted block mb-1">
                      {f.label} <span className="text-text-muted font-normal">({f.unit})</span>
                    </label>
                    <div className="relative">
                      <input type="number" min="0" step="0.1"
                        value={nutrition[f.key]}
                        onChange={e => setNutrition(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder="—"
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm pr-12 focus:border-brand-500 focus:outline-none bg-bg-card text-text-primary" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-medium">{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Allergens */}
              <div>
                <p className="text-sm font-semibold text-text-primary mb-1">Allergens</p>
                <p className="text-xs text-text-muted mb-3">Select all 14 major allergens that apply</p>
                <div className="flex flex-wrap gap-2">
                  {ALLERGEN_LIST.map(a => (
                    <button key={a} type="button" onClick={() => toggleAllergen(a)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all
                        ${allergens.includes(a) ? 'bg-red-500 border-red-500 text-white' : 'bg-bg-card border-border text-text-secondary hover:border-red-300'}`}>
                      {a}
                    </button>
                  ))}
                </div>
                {allergens.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-xs font-bold text-red-700 mb-0.5">⚠️ Contains:</p>
                    <p className="text-xs text-red-600">{allergens.join(', ')}</p>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Dietary Tags */}
            <SectionCard title="Dietary Tags">
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map(d => (
                  <button key={d} type="button" onClick={() => toggleDietary(d)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                      ${dietary.includes(d) ? 'bg-brand-500 border-brand-500 text-white' : 'bg-bg-card border-border text-text-secondary hover:border-brand-400'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* Toppings */}
            <SectionCard title="Customisation Groups">
              <ToppingBuilder groups={toppingGroups} onChange={setToppings} />
            </SectionCard>

            <div className="flex gap-3 pt-1 pb-8">
              <Button type="button" variant="secondary" size="md" onClick={() => navigate('/menu')} className="flex-1">Cancel</Button>
              <Button type="submit" variant="primary" size="md" loading={loading} className="flex-1">{isEdit ? 'Save Changes' : 'Create Item'}</Button>
            </div>
          </form>
        </div>

        <div className="w-48 flex-shrink-0 hidden lg:block">
          <PreviewCard name={watch('name')} price={watch('price')} photoSrc={photoPreview} dietary={dietary} />
        </div>
      </div>
    </div>
  )
}
