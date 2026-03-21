import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { loginAdmin, clearError } from '../../store/slices/authSlice.js'
import { Input, PasswordInput, Button } from '../../components/global/index.jsx'

const schema = z.object({
  email:    z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
})

export default function AdminLoginPage() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const { isAuthenticated, isLoading, error } = useSelector(s => s.auth)

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated])

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    dispatch(clearError())
    const res = await dispatch(loginAdmin(data))
    if (loginAdmin.fulfilled.match(res)) navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-4 shadow-btn">
            <span className="text-white text-3xl font-extrabold">T</span>
          </div>
          <h1 className="text-2xl font-extrabold text-brand-500 tracking-tight">Tastr Admin</h1>
          <p className="text-sm text-text-muted mt-1">Super Admin Portal</p>
        </div>

        <div className="bg-bg-card rounded-2xl shadow-modal p-8">
          <h2 className="text-xl font-bold text-text-primary mb-1">Sign in</h2>
          <p className="text-sm text-text-muted mb-6">Admin credentials required</p>

          {error && (
            <div className="mb-4 p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700 animate-fade-in">
              {error.message || 'Invalid credentials'}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              name="email"
              type="email"
              placeholder="admin@tastr.app"
              error={errors.email?.message}
              required
              {...register('email')}
            />
            <PasswordInput
              label="Password"
              name="password"
              placeholder="Enter password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" variant="primary" size="full" loading={isLoading}>
              Sign In
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          © {new Date().getFullYear()} Tastr Platform. All rights reserved.
        </p>
      </div>
    </div>
  )
}
