import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { loginUser, clearError } from '../../store/slices/authSlice.js'
import AuthLayout from '../../layouts/AuthLayout.jsx'
import { Input, PasswordInput, Button } from '../../components/global/index.jsx'

const schema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  password:   z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const { isLoading, error } = useSelector(s => s.auth)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    dispatch(clearError())
    const result = await dispatch(loginUser(data))
    if (loginUser.fulfilled.match(result)) {
      navigate('/home')
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`
  }

  const handleFacebookLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/facebook`
  }

  return (
    <AuthLayout>
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Welcome back</h2>
        <p className="text-sm text-text-muted mb-6">Sign in to your Tastr account</p>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700 animate-fade-in">
            {error.message || 'Something went wrong. Please try again.'}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email or Phone"
            name="identifier"
            type="text"
            placeholder="Enter email or phone number"
            error={errors.identifier?.message}
            {...register('identifier')}
          />

          <PasswordInput
            label="Password"
            name="password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Forgot password */}
          <div className="flex justify-end">
            <Link to="/auth/forgot-password" className="text-sm text-brand-500 hover:text-brand-600 font-medium transition-colors">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="full"
            loading={isLoading}
          >
            Sign In
          </Button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-border-light" />
          <span className="text-xs text-text-muted font-medium">or continue with</span>
          <div className="flex-1 h-px bg-border-light" />
        </div>

        {/* Social buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-2 py-3 px-4 border border-border rounded-xl text-sm font-medium text-text-primary hover:bg-brand-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>

          <button
            type="button"
            onClick={handleFacebookLogin}
            className="flex items-center justify-center gap-2 py-3 px-4 border border-border rounded-xl text-sm font-medium text-text-primary hover:bg-brand-50 transition-colors"
          >
            <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </button>
        </div>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-text-muted">
          Don't have an account?{' '}
          <Link to="/auth/register" className="text-brand-500 font-semibold hover:text-brand-600 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
