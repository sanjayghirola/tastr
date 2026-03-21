import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { setAdmin } from '../../store/slices/authSlice.js'
import { adminAuthApi } from '../../services/api.js'
import { User, Lock, ChevronRight, Eye, EyeOff, CheckCircle, AlertCircle, Camera } from 'lucide-react'

// ─── Reusable input ───────────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, error, disabled, suffix }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-3 rounded-xl border text-sm bg-bg-input text-text-primary
            transition-colors outline-none
            ${error ? 'border-red-400 focus:border-red-500' : 'border-border focus:border-brand-500'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${isPassword ? 'pr-11' : ''}`}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-muted">{suffix}</span>}
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
    </div>
  )
}

function Alert({ type, msg }) {
  if (!msg) return null
  return (
    <div className={`flex items-start gap-2 p-3.5 rounded-xl text-sm
      ${type === 'success' ? 'bg-green-50 border border-green-200 text-green-700'
        : 'bg-red-50 border border-red-200 text-red-700'}`}>
      {type === 'success' ? <CheckCircle size={15} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />}
      {msg}
    </div>
  )
}

// ─── Profile tab ──────────────────────────────────────────────────────────────
function ProfileTab() {
  const dispatch = useDispatch()
  const { admin } = useSelector(s => s.auth)
  const [name,    setName]    = useState(admin?.name || '')
  const [email,   setEmail]   = useState(admin?.email || '')
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState('')
  const [error,   setError]   = useState('')
  const [errors,  setErrors]  = useState({})

  const validate = () => {
    const e = {}
    if (!name.trim() || name.trim().length < 2) e.name = 'Name must be at least 2 characters'
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Valid email required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true); setSuccess(''); setError('')
    try {
      const res = await adminAuthApi.updateProfile({ name: name.trim(), email: email.trim() })
      dispatch(setAdmin(res.data.user))
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile')
    } finally { setSaving(false) }
  }

  const initials = name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'A'

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-5 p-5 bg-bg-section rounded-2xl border border-border">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {initials}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-bg-card border-2 border-border flex items-center justify-center">
            <Camera size={11} className="text-text-muted" />
          </div>
        </div>
        <div>
          <p className="font-bold text-text-primary text-lg">{admin?.name}</p>
          <p className="text-sm text-text-muted capitalize">{admin?.role?.replace('_', ' ').toLowerCase()}</p>
          <p className="text-xs text-text-muted mt-0.5">
            Member since {admin?.createdAt ? new Date(admin.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}
          </p>
        </div>
      </div>

      <Alert type="success" msg={success} />
      <Alert type="error"   msg={error}   />

      <div className="space-y-4">
        <Field label="Full Name" value={name} onChange={setName} placeholder="Your name" error={errors.name} />
        <Field label="Email Address" type="email" value={email} onChange={setEmail} placeholder="admin@tastr.app" error={errors.email} />
        <Field label="Role" value={admin?.role?.replace('_', ' ')} onChange={() => {}} disabled suffix="Read-only" />
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
        {saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</> : 'Save Changes'}
      </button>
    </div>
  )
}

// ─── Password tab ─────────────────────────────────────────────────────────────
function PasswordTab() {
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState('')
  const [error,    setError]    = useState('')
  const [errors,   setErrors]   = useState({})

  const validate = () => {
    const e = {}
    if (!current)             e.current = 'Current password is required'
    if (next.length < 8)      e.next    = 'New password must be at least 8 characters'
    if (next !== confirm)     e.confirm = 'Passwords do not match'
    if (next === current)     e.next    = 'New password must differ from current'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleChange = async () => {
    if (!validate()) return
    setSaving(true); setSuccess(''); setError('')
    try {
      await adminAuthApi.changePassword({ currentPassword: current, newPassword: next })
      setSuccess('Password changed successfully!')
      setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password')
    } finally { setSaving(false) }
  }

  const strength = (pw) => {
    if (!pw) return 0
    let s = 0
    if (pw.length >= 8)  s++
    if (/[A-Z]/.test(pw)) s++
    if (/[0-9]/.test(pw)) s++
    if (/[^A-Za-z0-9]/.test(pw)) s++
    return s
  }
  const str = strength(next)
  const strLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][str] || ''
  const strColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'][str] || ''

  return (
    <div className="space-y-6">
      {/* Security notice */}
      <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl flex items-start gap-3">
        <Lock size={16} className="text-brand-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-brand-800">Keep your account secure</p>
          <p className="text-xs text-brand-600 mt-0.5">Use a strong, unique password that you don't use anywhere else.</p>
        </div>
      </div>

      <Alert type="success" msg={success} />
      <Alert type="error"   msg={error}   />

      <div className="space-y-4">
        <Field label="Current Password" type="password" value={current} onChange={setCurrent}
          placeholder="Enter current password" error={errors.current} />
        <div className="space-y-1.5">
          <Field label="New Password" type="password" value={next} onChange={setNext}
            placeholder="Min. 8 characters" error={errors.next} />
          {next && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1,2,3,4].map(n => (
                  <div key={n} className={`flex-1 h-1 rounded-full transition-all ${n <= str ? strColor : 'bg-border'}`} />
                ))}
              </div>
              <p className={`text-xs font-medium ${strColor.replace('bg-', 'text-')}`}>{strLabel}</p>
            </div>
          )}
        </div>
        <Field label="Confirm New Password" type="password" value={confirm} onChange={setConfirm}
          placeholder="Repeat new password" error={errors.confirm} />
      </div>

      {/* Requirements */}
      <div className="p-4 bg-bg-section rounded-xl border border-border space-y-1.5">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Requirements</p>
        {[
          ['At least 8 characters', next.length >= 8],
          ['Contains uppercase letter', /[A-Z]/.test(next)],
          ['Contains a number', /[0-9]/.test(next)],
          ['Contains a special character', /[^A-Za-z0-9]/.test(next)],
        ].map(([label, met]) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${met ? 'bg-green-500' : 'bg-border'}`}>
              {met && <span className="text-white text-[9px] font-bold">✓</span>}
            </div>
            <p className={`text-xs ${met ? 'text-green-700 font-medium' : 'text-text-muted'}`}>{label}</p>
          </div>
        ))}
      </div>

      <button onClick={handleChange} disabled={saving}
        className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
        {saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Updating…</> : 'Change Password'}
      </button>
    </div>
  )
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
const TABS = [
  { key: 'profile',  label: 'Profile',  Icon: User,  desc: 'Update your name and email' },
  { key: 'password', label: 'Password', Icon: Lock,  desc: 'Change your password'       },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { tab: tabParam } = useParams()
  const activeTab = TABS.find(t => t.key === tabParam)?.key || 'profile'

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-text-primary">Account Settings</h1>
        <p className="text-sm text-text-muted mt-1">Manage your admin profile and security settings</p>
      </div>

      <div className="lg:flex lg:gap-6 lg:items-start">
        {/* ─ Sidebar ─ */}
        <div className="lg:w-56 lg:flex-shrink-0 mb-6 lg:mb-0">
          {/* Mobile: pill row */}
          <div className="flex gap-2 lg:hidden mb-6">
            {TABS.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => navigate(`/settings/${key}`)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all
                  ${activeTab === key ? 'bg-brand-500 border-brand-500 text-white' : 'border-border text-text-secondary hover:border-brand-300'}`}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>

          {/* Desktop: sidebar */}
          <div className="hidden lg:block bg-bg-card border border-border rounded-2xl overflow-hidden">
            {TABS.map(({ key, label, Icon, desc }) => (
              <button key={key} onClick={() => navigate(`/settings/${key}`)}
                className={`w-full flex items-center gap-3 px-4 py-4 text-left border-b border-border-light last:border-0 transition-colors
                  ${activeTab === key ? 'bg-brand-50 border-l-2 border-l-brand-500' : 'hover:bg-bg-section'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                  ${activeTab === key ? 'bg-brand-100' : 'bg-bg-section'}`}>
                  <Icon size={16} className={activeTab === key ? 'text-brand-600' : 'text-text-muted'} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${activeTab === key ? 'text-brand-700' : 'text-text-primary'}`}>{label}</p>
                  <p className="text-xs text-text-muted mt-0.5">{desc}</p>
                </div>
                {activeTab !== key && <ChevronRight size={14} className="text-text-muted ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* ─ Content panel ─ */}
        <div className="flex-1 bg-bg-card border border-border rounded-2xl p-6">
          <div className="mb-5 pb-4 border-b border-border-light">
            <h2 className="text-lg font-bold text-text-primary">{TABS.find(t => t.key === activeTab)?.label}</h2>
            <p className="text-xs text-text-muted mt-0.5">{TABS.find(t => t.key === activeTab)?.desc}</p>
          </div>
          {activeTab === 'profile'  && <ProfileTab />}
          {activeTab === 'password' && <PasswordTab />}
        </div>
      </div>
    </div>
  )
}
