import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import AuthLayout from '../../layouts/AuthLayout.jsx'
import { Button } from '../../components/global/index.jsx'
import { DIETARY_TAGS } from '@tastr/shared'
import api from '../../services/api.js'
import { setUser } from '../../store/slices/authSlice.js'

export default function ProfileSetupPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user }  = useSelector(s => s.auth)

  const [photo,   setPhoto]   = useState(null)
  const [preview, setPreview] = useState(null)
  const [dietary, setDietary] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const fileRef = useRef()

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const toggleDietary = (tag) => {
    setDietary(d => d.includes(tag) ? d.filter(t => t !== tag) : [...d, tag])
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      if (photo) formData.append('profilePhoto', photo)
      if (dietary.length) dietary.forEach(t => formData.append('dietaryPreferences[]', t))

      const res = await api.put('/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      dispatch(setUser(res.data.user))
      navigate('/home')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout showLogo={false}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Set up your profile</h2>
        <p className="text-sm text-text-muted mt-1">Personalise your Tastr experience</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700 animate-fade-in">
          {error}
        </div>
      )}

      {/* Avatar upload */}
      <div className="flex flex-col items-center mb-6">
        <div
          onClick={() => fileRef.current?.click()}
          className="w-24 h-24 rounded-full bg-brand-100 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-brand-200 hover:border-brand-500 transition-colors relative"
        >
          {preview
            ? <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
            : <span className="text-3xl text-brand-300">📷</span>
          }
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium opacity-0 hover:opacity-100 transition-opacity">Change</span>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        <p className="text-xs text-text-muted mt-2">Tap to add photo (optional)</p>
      </div>

      {/* Dietary preferences */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-text-primary mb-3">Dietary preferences</p>
        <div className="flex flex-wrap gap-2">
          {DIETARY_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleDietary(tag)}
              className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-150
                ${dietary.includes(tag)
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'bg-bg-card border-border text-text-secondary hover:border-brand-500 hover:text-brand-500'
                }`}
            >
              {tag}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-2">Select all that apply. This helps us recommend suitable restaurants.</p>
      </div>

      <div className="space-y-3">
        <Button variant="primary" size="full" loading={loading} onClick={handleSave}>
          Save & Continue
        </Button>
        <Button variant="ghost" size="full" onClick={() => navigate('/home')}>
          Skip for now
        </Button>
      </div>
    </AuthLayout>
  )
}
