import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { sendOtp, verifyOtp, clearError, clearOtpState } from '../../store/slices/authSlice.js'
import AuthLayout from '../../layouts/AuthLayout.jsx'
import { OtpInput, Button } from '../../components/global/index.jsx'

const OTP_RESEND_SECS = 60

export default function OtpVerifyPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const dispatch  = useDispatch()
  const { isLoading, error } = useSelector(s => s.auth)

  // State passed from previous page: { phone, purpose, next }
  const { phone, purpose = 'verify', next = '/home' } = location.state || {}

  const [otp,       setOtp]       = useState([])
  const [countdown, setCountdown] = useState(OTP_RESEND_SECS)
  const [canResend, setCanResend] = useState(false)

  // Redirect if no phone context
  useEffect(() => {
    if (!phone) navigate('/auth/login')
  }, [phone])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Auto-send OTP on mount (only for 'verify' and 'login' purposes)
  useEffect(() => {
    if (phone && purpose !== 'reset') {
      dispatch(sendOtp({ phone, purpose }))
    }
  }, [])

  const handleVerify = async (code) => {
    dispatch(clearError())
    const otpString = Array.isArray(code) ? code.join('') : code
    const result = await dispatch(verifyOtp({ phone, otp: otpString, purpose }))
    if (verifyOtp.fulfilled.match(result)) {
      dispatch(clearOtpState())
      navigate(next, { state: { phone, verified: true } })
    }
  }

  const handleResend = async () => {
    if (!canResend) return
    setCanResend(false)
    setCountdown(OTP_RESEND_SECS)
    setOtp([])
    await dispatch(sendOtp({ phone, purpose }))
  }

  const maskedPhone = phone ? `${phone.slice(0, 4)}****${phone.slice(-3)}` : ''

  return (
    <AuthLayout>
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-6">
        ← Back
      </button>

      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📱</span>
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Verify your number</h2>
        <p className="text-sm text-text-muted">
          We sent a 6-digit code to <span className="font-semibold text-text-primary">{maskedPhone}</span>
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700 text-center animate-fade-in">
          {error.message || 'Incorrect code. Please try again.'}
        </div>
      )}

      <OtpInput
        length={6}
        value={otp}
        onChange={setOtp}
        error={error?.code === 'OTP_INVALID' ? 'Incorrect code' : undefined}
        autoSubmit={handleVerify}
      />

      <Button
        variant="primary"
        size="full"
        loading={isLoading}
        className="mt-6"
        onClick={() => handleVerify(otp)}
        disabled={otp.filter(Boolean).length < 6}
      >
        Verify Code
      </Button>

      {/* Resend */}
      <div className="mt-5 text-center">
        {canResend ? (
          <button onClick={handleResend} className="text-sm font-semibold text-brand-500 hover:text-brand-600 transition-colors">
            Resend code
          </button>
        ) : (
          <p className="text-sm text-text-muted">
            Resend code in{' '}
            <span className="font-semibold text-text-primary">{countdown}s</span>
          </p>
        )}
      </div>
    </AuthLayout>
  )
}
