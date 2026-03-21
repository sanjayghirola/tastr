import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Button } from '../../components/global/index.jsx'
import ImageCrop from '../../components/common/ImageCrop.jsx'
import api from '../../services/api.js'

const CUISINES = ['Italian','Chinese','Indian','Japanese','Mexican','Thai','British','American','Mediterranean','French','Greek','Turkish','Korean','Vietnamese','Middle Eastern','Caribbean','African','Spanish']

const schema = z.object({
  name:        z.string().min(2, 'Name required'),
  description: z.string().optional(),
  phone:       z.string().optional(),
  email:       z.string().email('Valid email required').optional().or(z.literal('')),
})

export default function ProfileSettingsPage() {
  const [restaurant, setRestaurant]   = useState(null)
  const [cuisines,   setCuisines]     = useState([])
  const [logoFile,   setLogoFile]     = useState(null)
  const [logoPreview,setLogoPreview]  = useState(null)
  const [cropSrc,    setCropSrc]      = useState(null)
  const [showCrop,   setShowCrop]     = useState(false)
  const [loading,    setLoading]      = useState(false)
  const [fetchLoad,  setFetchLoad]    = useState(true)
  const [success,    setSuccess]      = useState(false)
  const [error,      setError]        = useState(null)
  const fileRef = useRef()

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  useEffect(() => {
    api.get('/restaurants/me')
      .then(res => {
        const r = res.data.restaurant
        setRestaurant(r)
        setCuisines(r.cuisines || [])
        reset({ name: r.name, description: r.description || '', phone: r.phone || '', email: r.email || '' })
      })
      .catch(() => setError('Failed to load restaurant profile'))
      .finally(() => setFetchLoad(false))
  }, [])

  const toggleCuisine = c => setCuisines(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])

  const handleLogoSelect = e => {
    const file = e.target.files[0]
    if (!file) return
    setCropSrc(URL.createObjectURL(file))
    setShowCrop(true)
  }

  const handleCropDone = blob => {
    setLogoFile(new File([blob], 'logo.jpg', { type: 'image/jpeg' }))
    setLogoPreview(URL.createObjectURL(blob))
    setShowCrop(false)
  }

  const onSubmit = async (data) => {
    setLoading(true); setError(null); setSuccess(false)
    try {
      const formData = new FormData()
      formData.append('name', data.name)
      if (data.description) formData.append('description', data.description)
      if (data.phone)       formData.append('phone', data.phone)
      if (data.email)       formData.append('email', data.email)
      cuisines.forEach(c => formData.append('cuisines[]', c))
      if (logoFile) formData.append('logo', logoFile)
      await api.put('/restaurants/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoad) return <div className="flex justify-center py-20"><span className="spinner spinner-lg" /></div>

  return (
    <div className="max-w-2xl">
      {showCrop && <ImageCrop src={cropSrc} onCrop={handleCropDone} onCancel={() => setShowCrop(false)} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Restaurant Profile</h1>
        <p className="text-sm text-text-muted mt-0.5">Update your restaurant's public information</p>
      </div>

      {error   && <div className="mb-4 p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 animate-fade-in">Profile saved successfully!</div>}

      {/* Logo */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-bg-section rounded-2xl border border-border">
        <div
          onClick={() => fileRef.current?.click()}
          className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-brand-200 cursor-pointer bg-brand-50 flex-shrink-0 group relative"
        >
          <img
            src={logoPreview || restaurant?.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(restaurant?.name || 'R')}&background=C18B3C&color=fff&size=200`}
            alt="Logo"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xl">📷</span>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
        <div>
          <p className="text-sm font-semibold text-text-primary">Restaurant Logo</p>
          <p className="text-xs text-text-muted mt-0.5">Click to upload. Recommended 400×400px.</p>
          <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-brand-500 font-medium mt-1.5 hover:text-brand-600 transition-colors">
            Change Logo
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Restaurant Name" name="name" placeholder="e.g. Olive Garden Bistro" required error={errors.name?.message} {...register('name')} />

        <div className="input-group">
          <label className="text-sm font-semibold text-text-primary">Description</label>
          <textarea {...register('description')} rows={3} placeholder="Describe your restaurant..." maxLength={500}
            className="tastr-input w-full py-3 px-4 text-sm bg-bg-input border border-border rounded-xl resize-none focus:border-brand-500 focus:outline-none mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Phone" name="phone" type="tel" placeholder="+44..." error={errors.phone?.message} {...register('phone')} />
          <Input label="Email" name="email" type="email" placeholder="contact@restaurant.com" error={errors.email?.message} {...register('email')} />
        </div>

        {/* Cuisine tags */}
        <div>
          <p className="text-sm font-semibold text-text-primary mb-2">Cuisine Types</p>
          <div className="flex flex-wrap gap-2">
            {CUISINES.map(c => (
              <button key={c} type="button" onClick={() => toggleCuisine(c)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                  ${cuisines.includes(c) ? 'bg-brand-500 border-brand-500 text-white' : 'bg-bg-card border-border text-text-secondary hover:border-brand-400'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" variant="primary" size="full" loading={loading}>Save Profile</Button>
      </form>
    </div>
  )
}
