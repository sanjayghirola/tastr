import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { loginRestaurant, clearError } from '../../store/slices/authSlice.js'
import { Input, PasswordInput, Button } from '../../components/global/index.jsx'

const schema = z.object({
  email:    z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
})

export default function RestaurantLoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoading, error } = useSelector(s => s.auth)
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    dispatch(clearError())
    const res = await dispatch(loginRestaurant(data))
    if (loginRestaurant.fulfilled.match(res)) {
      // Route based on approval status fetched during login
      const status = res.payload.restaurantStatus
      if (status === 'ACTIVE') navigate('/dashboard')
      else navigate('/auth/pending')
    }
  }

  return (
    <div className="min-h-screen bg-bg-app flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-4 shadow-btn">
            <span className="text-white text-3xl">🍽</span>
          </div>
          <h1 className="text-2xl font-extrabold text-brand-500 tracking-tight">Tastr Partner</h1>
          <p className="text-sm text-text-muted mt-1">Restaurant Portal</p>
        </div>

        <div className="bg-bg-card rounded-2xl shadow-modal p-8">
          <h2 className="text-xl font-bold text-text-primary mb-1">Sign in</h2>
          <p className="text-sm text-text-muted mb-6">Access your restaurant dashboard</p>

          {error && (
            <div className="mb-4 p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700 animate-fade-in">
              {error.message || 'Invalid credentials'}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Email" name="email" type="email" placeholder="restaurant@email.com" error={errors.email?.message} required {...register('email')} />
            <PasswordInput label="Password" name="password" placeholder="Enter password" error={errors.password?.message} {...register('password')} />
            <Button type="submit" variant="primary" size="full" loading={isLoading}>Sign In</Button>
          </form>

          <p className="mt-5 text-center text-sm text-text-muted">
            New restaurant?{' '}
            <button onClick={() => navigate('/auth/register')} className="text-brand-500 font-semibold hover:text-brand-600 transition-colors">
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
