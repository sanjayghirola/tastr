import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { registerUser, clearError } from '../../store/slices/authSlice.js'
import AuthLayout from '../../layouts/AuthLayout.jsx'
import { Input, PasswordInput, Button } from '../../components/global/index.jsx'

const schema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone:    z.string().min(10, 'Enter a valid phone number').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  terms:    z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
}).refine(d => d.email || d.phone, {
  message: 'Email or phone number is required',
  path: ['email'],
})

export default function SignUpPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoading, error } = useSelector(s => s.auth)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    dispatch(clearError())
    const payload = {
      name:     data.name,
      password: data.password,
      ...(data.email && { email: data.email }),
      ...(data.phone && { phone: data.phone }),
    }
    const result = await dispatch(registerUser(payload))
    if (registerUser.fulfilled.match(result)) {
      // If phone provided, go to OTP verify; otherwise straight to profile setup
      if (data.phone) {
        navigate('/auth/otp-verify', { state: { phone: data.phone, purpose: 'verify', next: '/auth/profile-setup' } })
      } else {
        navigate('/auth/profile-setup')
      }
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-text-primary mb-1">Create account</h2>
      <p className="text-sm text-text-muted mb-6">Join Tastr and start ordering</p>

      {error && (
        <div className="mb-4 p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700 animate-fade-in">
          {error.message || 'Registration failed. Please try again.'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Full Name" name="name" placeholder="John Smith" error={errors.name?.message} required {...register('name')} />
        <Input label="Email" name="email" type="email" placeholder="john@example.com" error={errors.email?.message} {...register('email')} />
        <Input label="Phone Number" name="phone" type="tel" placeholder="+44 7911 123456" error={errors.phone?.message} {...register('phone')} />
        <PasswordInput label="Password" name="password" placeholder="At least 8 characters" error={errors.password?.message} {...register('password')} />

        {/* T&C checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" {...register('terms')} className="tastr-checkbox mt-0.5 flex-shrink-0" />
          <span className="text-sm text-text-secondary leading-relaxed">
            I agree to the{' '}
            <Link to="/terms" className="text-brand-500 font-medium hover:underline">Terms & Conditions</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-brand-500 font-medium hover:underline">Privacy Policy</Link>
          </span>
        </label>
        {errors.terms && <p className="text-xs text-error-600 -mt-2">{errors.terms.message}</p>}

        <Button type="submit" variant="primary" size="full" loading={isLoading}>
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-brand-500 font-semibold hover:text-brand-600 transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
