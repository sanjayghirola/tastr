import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Button, OtpInput } from '../../components/global/index.jsx'
import { sendOtp, verifyOtp } from '../../store/slices/authSlice.js'
import api from '../../services/api.js'
import { setUser } from '../../store/slices/authSlice.js'

const schema = z.object({ email: z.string().email('Valid email required') })

export default function ChangeEmailPage() {
  const dispatch = useDispatch()
  const { user, isLoading } = useSelector(s => s.auth)
  const [step,    setStep]    = useState(1)
  const [email,   setEmail]   = useState('')
  const [otp,     setOtp]     = useState([])
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState(null)

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const handleStep1 = async (data) => {
    setError(null)
    setEmail(data.email)
    try {
      // Send OTP to new email's associated phone (user's current phone)
      await dispatch(sendOtp({ phone: user.phone, purpose: 'verify' })).unwrap()
      setStep(2)
    } catch (err) { setError(err.message || 'Failed to send OTP') }
  }

  const handleStep2 = async () => {
    setError(null)
    try {
      await dispatch(verifyOtp({ phone: user.phone, otp: otp.join(''), purpose: 'verify' })).unwrap()
      // Update email
      const res = await api.put('/users/me', { email })
      dispatch(setUser(res.data.user))
      setSuccess(true)
    } catch (err) { setError(err.message || 'Verification failed') }
  }

  if (success) return (
    <div className="text-center py-8">
      <div className="text-5xl mb-3">✅</div>
      <h3 className="font-bold text-text-primary">Email updated!</h3>
      <p className="text-sm text-text-muted mt-1">Your email has been changed to {email}</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="bg-brand-50 rounded-xl p-3 text-sm text-text-secondary border border-brand-100">
        Current email: <span className="font-semibold text-text-primary">{user?.email || 'Not set'}</span>
      </div>

      {error && <div className="p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700">{error}</div>}

      {step === 1 ? (
        <form onSubmit={handleSubmit(handleStep1)} className="space-y-4">
          <Input label="New Email Address" name="email" type="email" placeholder="new@example.com" error={errors.email?.message} required {...register('email')} />
          <Button type="submit" variant="primary" size="full" loading={isLoading}>Send Verification Code</Button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-muted text-center">Enter the 6-digit code sent to your phone to confirm the email change.</p>
          <OtpInput length={6} value={otp} onChange={setOtp} autoSubmit={handleStep2} />
          <Button variant="primary" size="full" loading={isLoading} onClick={handleStep2} disabled={otp.filter(Boolean).length < 6}>
            Confirm Change
          </Button>
        </div>
      )}
    </div>
  )
}
