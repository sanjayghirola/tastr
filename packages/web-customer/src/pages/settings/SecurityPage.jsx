import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { changePassword, clearProfileError, clearProfileSuccess } from '../../store/slices/profileSlice.js'
import { PasswordInput, Button } from '../../components/global/index.jsx'
import { useEffect } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword:     z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export default function SecurityPage() {
  const dispatch = useDispatch()
  const { isLoading, error, successMsg } = useSelector(s => s.profile)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    return () => {
      dispatch(clearProfileError())
      dispatch(clearProfileSuccess())
    }
  }, [dispatch])

  const onSubmit = async (data) => {
    const res = await dispatch(changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    }))
    if (changePassword.fulfilled.match(res)) reset()
  }

  return (
    <div className="space-y-5 max-w-md">
      <p className="text-sm text-text-muted leading-relaxed">
        Create a strong password with at least 8 characters, including a mix of letters and numbers.
      </p>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error?.message || 'Something went wrong'}</p>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2.5 p-3.5 bg-green-50 border border-green-200 rounded-xl animate-fade-in">
          <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <PasswordInput
          label="Current Password"
          name="currentPassword"
          placeholder="Enter your current password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <PasswordInput
          label="New Password"
          name="newPassword"
          placeholder="At least 8 characters"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordInput
          label="Confirm New Password"
          name="confirmPassword"
          placeholder="Repeat your new password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {/* Password strength tips */}
        <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl">
          <p className="text-xs font-semibold text-text-secondary mb-1.5">Password tips:</p>
          <ul className="text-xs text-text-muted space-y-1">
            <li>• Use at least 8 characters</li>
            <li>• Mix uppercase and lowercase letters</li>
            <li>• Include numbers or symbols for better security</li>
          </ul>
        </div>

        <Button type="submit" variant="primary" size="full" loading={isLoading}>
          Update Password
        </Button>
      </form>
    </div>
  )
}
