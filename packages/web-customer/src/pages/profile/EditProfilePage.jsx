import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updateProfile } from '../../store/slices/profileSlice.js'
import { setUser } from '../../store/slices/authSlice.js'
import { Input, Button } from '../../components/global/index.jsx'
import ImageCrop from '../../components/common/ImageCrop.jsx'
import { DIETARY_TAGS } from '@tastr/shared'
import api from '../../services/api.js'

const schema = z.object({
  name:  z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
})

export default function EditProfilePage() {
  const navigate   = useNavigate()
  const dispatch   = useDispatch()
  const { user }   = useSelector(s => s.auth)
  const { isLoading, error } = useSelector(s => s.profile)

  const [photoFile,   setPhotoFile]   = useState(null)
  const [previewSrc,  setPreviewSrc]  = useState(null)
  const [cropSrc,     setCropSrc]     = useState(null)
  const [showCrop,    setShowCrop]    = useState(false)
  const [dietary,     setDietary]     = useState(user?.dietaryPreferences || [])
  const [successMsg,  setSuccessMsg]  = useState('')
  const fileRef = useRef()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name || '', email: user?.email || '', phone: user?.phone || '' },
  })

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCropSrc(URL.createObjectURL(file))
    setShowCrop(true)
  }

  const handleCropDone = (blob) => {
    const croppedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    setPhotoFile(croppedFile)
    setPreviewSrc(URL.createObjectURL(blob))
    setShowCrop(false)
  }

  const toggleDietary = tag => setDietary(d => d.includes(tag) ? d.filter(t => t !== tag) : [...d, tag])

  const onSubmit = async (data) => {
    const formData = new FormData()
    formData.append('name', data.name)
    if (data.email) formData.append('email', data.email)
    if (data.phone) formData.append('phone', data.phone)
    dietary.forEach(t => formData.append('dietaryPreferences[]', t))
    if (photoFile) formData.append('profilePhoto', photoFile)

    const res = await dispatch(updateProfile(formData))
    if (updateProfile.fulfilled.match(res)) {
      dispatch(setUser(res.payload.user))
      setSuccessMsg('Profile updated!')
      setTimeout(() => navigate('/profile'), 1200)
    }
  }

  return (
    <div className="max-w-xl mx-auto pb-24 px-4 pt-6">
      {showCrop && (
        <ImageCrop
          src={cropSrc}
          onCrop={handleCropDone}
          onCancel={() => setShowCrop(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 hover:bg-brand-100 transition-colors">
          ‹
        </button>
        <h1 className="text-xl font-bold text-text-primary">Edit Profile</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div
          onClick={() => fileRef.current?.click()}
          className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-brand-200 cursor-pointer group"
        >
          <img
            src={previewSrc || user?.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=C18B3C&color=fff&size=200`}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xl">📷</span>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        <p className="text-xs text-text-muted mt-2">Tap photo to change</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700">{error.message}</div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 animate-fade-in">{successMsg}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Full Name" name="name" placeholder="Your name" error={errors.name?.message} required {...register('name')} />
        <Input label="Email" name="email" type="email" placeholder="email@example.com" error={errors.email?.message} {...register('email')} />
        <Input label="Phone" name="phone" type="tel" placeholder="+44 7911 123456" error={errors.phone?.message} {...register('phone')} />

        {/* Dietary preferences */}
        <div>
          <p className="text-sm font-semibold text-text-primary mb-2">Dietary Preferences</p>
          <div className="flex flex-wrap gap-2">
            {DIETARY_TAGS.map(tag => (
              <button key={tag} type="button" onClick={() => toggleDietary(tag)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                  ${dietary.includes(tag) ? 'bg-brand-500 border-brand-500 text-white' : 'bg-bg-card border-border text-text-secondary hover:border-brand-400'}`}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" variant="primary" size="full" loading={isLoading}>Save Changes</Button>
      </form>
    </div>
  )
}
