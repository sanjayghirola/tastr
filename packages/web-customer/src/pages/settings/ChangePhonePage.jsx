import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Button, OtpInput } from '../../components/global/index.jsx'
import { sendOtp, verifyOtp, setUser } from '../../store/slices/authSlice.js'
import api from '../../services/api.js'

const schema = z.object({ phone: z.string().min(10, 'Valid phone required') })

export default function ChangePhonePage() {
  const dispatch = useDispatch()
  const { user, isLoading } = useSelector(s => s.auth)
  const [step,    setStep]    = useState(1)
  const [phone,   setPhone]   = useState('')
  const [otp,     setOtp]     = useState([])
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState(null)

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const handleStep1 = async (data) => {
    setError(null)
    setPhone(data.phone)
    try {
      await dispatch(sendOtp({ phone: data.phone, purpose: 'verify' })).unwrap()
      setStep(2)
    } catch (err) { setError(err.message || 'Failed to send OTP') }
  }

  const handleStep2 = async () => {
    setError(null)
    try {
      await dispatch(verifyOtp({ phone, otp: otp.join(''), purpose: 'verify' })).unwrap()
      const res = await api.put('/users/me', { phone })
      dispatch(setUser(res.data.user))
      setSuccess(true)
    } catch (err) { setError(err.message || 'Verification failed') }
  }

  if (success) return (
    <div className="text-center py-8">
      <div className="text-5xl mb-3">✅</div>
      <h3 className="font-bold text-text-primary">Phone updated!</h3>
      <p className="text-sm text-text-muted mt-1">Your phone has been changed to {phone}</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="bg-brand-50 rounded-xl p-3 text-sm text-text-secondary border border-brand-100">
        Current phone: <span className="font-semibold text-text-primary">{user?.phone || 'Not set'}</span>
      </div>
      {error && <div className="p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700">{error}</div>}
      {step === 1 ? (
        <form onSubmit={handleSubmit(handleStep1)} className="space-y-4">
          <Input label="New Phone Number" name="phone" type="tel" placeholder="+44 7911 123456" error={errors.phone?.message} required {...register('phone')} />
          <Button type="submit" variant="primary" size="full" loading={isLoading}>Send Verification Code</Button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-muted text-center">Enter the 6-digit code sent to <span className="font-semibold">{phone}</span></p>
          <OtpInput length={6} value={otp} onChange={setOtp} autoSubmit={handleStep2} />
          <Button variant="primary" size="full" loading={isLoading} onClick={handleStep2} disabled={otp.filter(Boolean).length < 6}>
            Confirm Change
          </Button>
        </div>
      )}
    </div>
  )
}
