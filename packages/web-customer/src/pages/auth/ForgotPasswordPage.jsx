import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { sendOtp, verifyOtp, resetPassword, clearError } from '../../store/slices/authSlice.js'
import AuthLayout from '../../layouts/AuthLayout.jsx'
import { Input, PasswordInput, OtpInput, Button } from '../../components/global/index.jsx'

// ─── Step schemas ─────────────────────────────────────────────────────────────
const step1Schema = z.object({ phone: z.string().min(10, 'Valid phone required') })
const step3Schema = z.object({
  newPassword:    z.string().min(8, 'At least 8 characters'),
  confirmPassword:z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export default function ForgotPasswordPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoading, error } = useSelector(s => s.auth)

  const [step,  setStep]  = useState(1) // 1=phone, 2=otp, 3=new password
  const [phone, setPhone] = useState('')
  const [otp,   setOtp]   = useState([])

  // Step 1 form
  const step1Form = useForm({ resolver: zodResolver(step1Schema) })
  // Step 3 form
  const step3Form = useForm({ resolver: zodResolver(step3Schema) })

  // Step 1 — submit phone
  const handleStep1 = async (data) => {
    dispatch(clearError())
    setPhone(data.phone)
    const result = await dispatch(sendOtp({ phone: data.phone, purpose: 'reset' }))
    if (sendOtp.fulfilled.match(result)) setStep(2)
  }

  // Step 2 — verify OTP
  const handleStep2 = async () => {
    dispatch(clearError())
    const code = otp.join('')
    const result = await dispatch(verifyOtp({ phone, otp: code, purpose: 'reset' }))
    if (verifyOtp.fulfilled.match(result)) setStep(3)
  }

  // Step 3 — new password
  const handleStep3 = async (data) => {
    dispatch(clearError())
    // Re-send OTP to verify during reset
    const result = await dispatch(resetPassword({ phone, otp: otp.join(''), newPassword: data.newPassword }))
    if (resetPassword.fulfilled.match(result)) {
      navigate('/auth/login', { state: { message: 'Password reset successfully. Please sign in.' } })
    }
  }

  const stepLabels = ['Phone', 'Verify', 'New Password']

  return (
    <AuthLayout>
      {/* Back */}
      <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/auth/login')}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-6">
        ← Back
      </button>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-1.5 ${i < step - 1 ? 'text-brand-500' : i === step - 1 ? 'text-brand-500 font-semibold' : 'text-text-muted'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${i < step - 1 ? 'bg-brand-500 text-white' : i === step - 1 ? 'border-2 border-brand-500 text-brand-500' : 'border-2 border-border text-text-muted'}`}>
                {i < step - 1 ? '✓' : i + 1}
              </div>
              <span className="text-xs hidden sm:block">{label}</span>
            </div>
            {i < stepLabels.length - 1 && (
              <div className={`flex-1 h-0.5 ${i < step - 1 ? 'bg-brand-500' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700 animate-fade-in">
          {error.message}
        </div>
      )}

      {/* ── Step 1: Phone ── */}
      {step === 1 && (
        <form onSubmit={step1Form.handleSubmit(handleStep1)} className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-text-primary">Forgot password?</h2>
            <p className="text-sm text-text-muted mt-1">Enter your phone number to receive a reset code</p>
          </div>
          <Input
            label="Phone Number"
            name="phone"
            type="tel"
            placeholder="+44 7911 123456"
            error={step1Form.formState.errors.phone?.message}
            {...step1Form.register('phone')}
          />
          <Button type="submit" variant="primary" size="full" loading={isLoading}>
            Send Reset Code
          </Button>
        </form>
      )}

      {/* ── Step 2: OTP ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-text-primary">Enter code</h2>
            <p className="text-sm text-text-muted mt-1">
              6-digit code sent to <span className="font-semibold text-text-primary">{phone}</span>
            </p>
          </div>
          <OtpInput
            length={6}
            value={otp}
            onChange={setOtp}
            autoSubmit={handleStep2}
          />
          <Button
            variant="primary"
            size="full"
            loading={isLoading}
            onClick={handleStep2}
            disabled={otp.filter(Boolean).length < 6}
          >
            Verify Code
          </Button>
        </div>
      )}

      {/* ── Step 3: New Password ── */}
      {step === 3 && (
        <form onSubmit={step3Form.handleSubmit(handleStep3)} className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-text-primary">New password</h2>
            <p className="text-sm text-text-muted mt-1">Choose a strong password</p>
          </div>
          <PasswordInput
            label="New Password"
            name="newPassword"
            placeholder="At least 8 characters"
            error={step3Form.formState.errors.newPassword?.message}
            {...step3Form.register('newPassword')}
          />
          <PasswordInput
            label="Confirm Password"
            name="confirmPassword"
            placeholder="Repeat password"
            error={step3Form.formState.errors.confirmPassword?.message}
            {...step3Form.register('confirmPassword')}
          />
          <Button type="submit" variant="primary" size="full" loading={isLoading}>
            Reset Password
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
