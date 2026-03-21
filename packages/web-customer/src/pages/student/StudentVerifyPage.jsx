import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, GraduationCap, Mail, Upload, CheckCircle2, X, ImageIcon } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout.jsx'
import api from '../../services/api.js'

const STEPS = ['Institution', 'Student ID', 'Confirm']
const UNIVERSITIES = [
  'University of Cambridge','University of Oxford','Imperial College London',
  'University College London','King\'s College London','University of Edinburgh',
  'University of Manchester','University of Bristol','University of Warwick',
  'University of Exeter','University of Birmingham','University of Leeds',
  'University of Sheffield','University of Nottingham','Durham University',
]

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${i < current ? 'bg-brand-500 text-white' : i === current ? 'bg-brand-500 text-white ring-4 ring-brand-500/20' : 'bg-bg-section border-2 border-border text-text-muted'}`}>
              {i < current ? <CheckCircle2 size={16} /> : i + 1}
            </div>
            <span className={`text-xs font-medium ${i === current ? 'text-brand-500' : 'text-text-muted'}`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`w-10 h-0.5 mb-4 ${i < current ? 'bg-brand-500' : 'bg-border'}`} />}
        </div>
      ))}
    </div>
  )
}

export default function StudentVerifyPage() {
  const navigate  = useNavigate()
  const fileRef   = useRef(null)
  const [step, setStep]         = useState(0)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [suggestions, setSugs]  = useState([])

  // OTP state
  const [otpSent, setOtpSent]       = useState(false)
  const [otpCode, setOtpCode]       = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError]     = useState('')
  const [cooldown, setCooldown]     = useState(0)

  const [form, setForm] = useState({
    institution: '', studentEmail: '', studentIdExpiry: '', file: null, preview: null
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleInstSearch = (val) => {
    set('institution', val)
    setSugs(val.length > 1 ? UNIVERSITIES.filter(u => u.toLowerCase().includes(val.toLowerCase())).slice(0, 5) : [])
  }

  // Send OTP to student email
  const sendOtp = async () => {
    const emailRe = /^[^\s@]+@([^\s@]+\.(ac\.uk|edu|ac\.[a-z]{2}|edu\.[a-z]{2}))$/i
    if (!emailRe.test(form.studentEmail)) { setOtpError('Please use a valid student email (.ac.uk or .edu)'); return }
    setOtpLoading(true); setOtpError('')
    try {
      await api.post('/student-verification/send-otp', { studentEmail: form.studentEmail })
      setOtpSent(true)
      setCooldown(60)
    } catch (e) {
      setOtpError(e.response?.data?.message || 'Failed to send OTP')
    } finally { setOtpLoading(false) }
  }

  // Verify OTP
  const verifyOtp = async () => {
    if (otpCode.length !== 6) { setOtpError('Enter the 6-digit code'); return }
    setOtpLoading(true); setOtpError('')
    try {
      await api.post('/student-verification/verify-otp', { studentEmail: form.studentEmail, otp: otpCode })
      setEmailVerified(true)
      setOtpError('')
    } catch (e) {
      setOtpError(e.response?.data?.message || 'Invalid OTP')
    } finally { setOtpLoading(false) }
  }

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (f) {
      set('file', f)
      set('preview', URL.createObjectURL(f))
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) { set('file', f); set('preview', URL.createObjectURL(f)) }
  }

  const validateStep = () => {
    if (step === 0) {
      if (!form.institution.trim()) { setError('Please enter your institution'); return false }
      const emailRe = /^[^\s@]+@([^\s@]+\.(ac\.uk|edu|ac\.[a-z]{2}|edu\.[a-z]{2}))$/i
      if (!emailRe.test(form.studentEmail)) { setError('Please use a valid student email (.ac.uk or .edu)'); return false }
      if (!emailVerified) { setError('Please verify your student email with the OTP code'); return false }
    }
    if (step === 1) {
      if (!form.studentIdExpiry) { setError('Please enter the expiry date of your student ID'); return false }
      const expiry = new Date(form.studentIdExpiry)
      if (expiry < new Date()) { setError('Student ID expiry date must be in the future'); return false }
    }
    setError('')
    return true
  }

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('institution', form.institution)
      fd.append('studentEmail', form.studentEmail)
      fd.append('emailVerified', 'true')
      fd.append('studentIdExpiry', form.studentIdExpiry)
      if (form.file) fd.append('document', form.file)
      await api.post('/student-verification/submit', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSubmitted(true)
    } catch (e) {
      setError(e.response?.data?.message || 'Submission failed. Please try again.')
    } finally { setLoading(false) }
  }

  if (submitted) return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-5 py-10 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-2">Application Submitted!</h1>
        <p className="text-text-muted text-sm mb-2">Your student verification is under review.</p>
        <p className="text-text-muted text-sm mb-8">We typically respond within <strong>1–2 working days</strong>.</p>
        <button onClick={() => navigate('/student-status')}
          className="w-full py-3.5 bg-brand-500 text-white font-bold rounded-2xl text-sm hover:bg-brand-600 transition-colors">
          Check Status
        </button>
        <button onClick={() => navigate('/profile')}
          className="w-full py-3.5 border border-border text-text-primary font-semibold rounded-2xl text-sm mt-3 hover:bg-bg-section transition-colors">
          Back to Profile
        </button>
      </div>
    </MainLayout>
  )

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-5 py-6">
        <button onClick={() => step > 0 ? setStep(s => s-1) : navigate('/profile')}
          className="flex items-center gap-1.5 text-text-muted mb-6 text-sm">
          <ChevronLeft size={18} /> Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-brand-100 flex items-center justify-center">
            <GraduationCap size={20} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Student Verification</h1>
            <p className="text-xs text-text-muted">Unlock exclusive student discounts</p>
          </div>
        </div>

        <StepIndicator current={step} />

        {/* Step 0 — Institution & Email Verification */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-text-primary block mb-2">University / Institution</label>
              <div className="relative">
                <input
                  value={form.institution}
                  onChange={e => handleInstSearch(e.target.value)}
                  placeholder="e.g. University of Manchester"
                  className="w-full border border-border rounded-2xl px-4 py-3.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-card"
                />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border rounded-2xl overflow-hidden shadow-lg z-10">
                    {suggestions.map(s => (
                      <button key={s} onClick={() => { set('institution', s); setSugs([]) }}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-bg-section transition-colors border-b border-border last:border-0">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-text-primary block mb-2">Student Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={form.studentEmail}
                  onChange={e => { set('studentEmail', e.target.value); setEmailVerified(false); setOtpSent(false); setOtpCode('') }}
                  placeholder="you@university.ac.uk"
                  disabled={emailVerified}
                  className="w-full border border-border rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-card disabled:opacity-60"
                />
                {emailVerified && (
                  <CheckCircle2 size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                )}
              </div>
              <p className="text-xs text-text-muted mt-1.5">Must be a .ac.uk or .edu email address</p>
            </div>

            {/* OTP Verification Section */}
            {!emailVerified && (
              <div className="bg-bg-section border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-brand-500" />
                  <p className="text-sm font-semibold text-text-primary">Email Verification</p>
                </div>

                {!otpSent ? (
                  <>
                    <p className="text-xs text-text-muted">We'll send a 6-digit verification code to your student email to confirm it belongs to you.</p>
                    <button
                      onClick={sendOtp}
                      disabled={otpLoading || !form.studentEmail}
                      className="w-full py-3 rounded-2xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {otpLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</> : '📧 Send Verification Code'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-text-muted">A 6-digit code has been sent to <strong>{form.studentEmail}</strong>. Check your inbox (and spam folder).</p>
                    <div>
                      <label className="text-xs font-semibold text-text-primary block mb-1.5">Enter OTP Code</label>
                      <input
                        type="text"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full border border-border rounded-2xl px-4 py-3.5 text-center text-2xl font-bold tracking-[0.5em] focus:border-brand-500 focus:outline-none bg-bg-card"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={verifyOtp}
                        disabled={otpLoading || otpCode.length !== 6}
                        className="flex-1 py-3 rounded-2xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {otpLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying…</> : '✓ Verify Code'}
                      </button>
                      <button
                        onClick={sendOtp}
                        disabled={otpLoading || cooldown > 0}
                        className="px-4 py-3 rounded-2xl border border-border text-text-muted text-sm font-medium hover:bg-bg-section transition-colors disabled:opacity-40"
                      >
                        {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend'}
                      </button>
                    </div>
                  </>
                )}

                {otpError && <p className="text-xs text-red-500">{otpError}</p>}
              </div>
            )}

            {emailVerified && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                <CheckCircle2 size={18} className="text-green-500" />
                <p className="text-sm font-semibold text-green-700">Email verified successfully!</p>
              </div>
            )}
          </div>
        )}

        {/* Step 1 — Document & Expiry */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-text-primary block mb-2">Student ID Expiry Date</label>
              <input
                type="date"
                value={form.studentIdExpiry}
                onChange={e => set('studentIdExpiry', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-border rounded-2xl px-4 py-3.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-card"
              />
              <p className="text-xs text-text-muted mt-1.5">Enter the expiry or valid-until date shown on your student ID card</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-text-primary block mb-1">Student ID Document</label>
              <p className="text-xs text-text-muted mb-3">Upload a photo of your student ID card or enrollment letter</p>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/20 transition-all"
              >
                {form.preview ? (
                  <div className="relative">
                    <img src={form.preview} alt="Preview" className="w-full max-h-48 object-contain rounded-xl" />
                    <button
                      onClick={e => { e.stopPropagation(); set('file', null); set('preview', null) }}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-bg-section flex items-center justify-center mx-auto mb-3">
                      <Upload size={24} className="text-text-muted" />
                    </div>
                    <p className="text-sm font-semibold text-text-primary">Drag & drop or tap to upload</p>
                    <p className="text-xs text-text-muted mt-1">JPG, PNG, PDF — max 10MB</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" className="sr-only" onChange={handleFile} />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-xs text-blue-700 font-semibold mb-1">Accepted documents:</p>
              <ul className="text-xs text-blue-600 space-y-0.5">
                <li>• Student ID card (front)</li>
                <li>• Enrollment letter or confirmation</li>
                <li>• University email screenshot with name visible</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2 — Confirm */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-text-primary mb-3">Review Your Details</h3>
              {[
                ['Institution', form.institution],
                ['Student Email', form.studentEmail],
                ['Email Verified', emailVerified ? '✅ Verified' : '❌ Not verified'],
                ['ID Expiry Date', form.studentIdExpiry || 'Not specified'],
                ['Document', form.file ? `📎 ${form.file.name}` : 'No document uploaded'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-start py-2.5 border-b border-border last:border-0">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</span>
                  <span className="text-sm text-text-primary text-right max-w-[60%] break-words">{val || '—'}</span>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-700">
              By submitting you confirm this information is accurate. False submissions may result in account suspension.
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500 mt-4 text-center">{error}</p>}

        <div className="mt-6 space-y-3">
          {step < 2 ? (
            <button
              onClick={() => { if (validateStep()) setStep(s => s + 1) }}
              className="w-full py-3.5 bg-brand-500 text-white font-bold rounded-2xl text-sm hover:bg-brand-600 transition-colors">
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 bg-brand-500 text-white font-bold rounded-2xl text-sm hover:bg-brand-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</> : '🎓 Submit Application'}
            </button>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
