import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { deleteAccount } from '../../store/slices/profileSlice.js'
import { logoutUser } from '../../store/slices/authSlice.js'
import { Button, Input } from '../../components/global/index.jsx'

const CONFIRM_PHRASE = 'DELETE MY ACCOUNT'

export default function DeleteAccountPage() {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { isLoading } = useSelector(s => s.profile)

  const [typed,   setTyped]   = useState('')
  const [error,   setError]   = useState(null)
  const canDelete = typed === CONFIRM_PHRASE

  const handleDelete = async () => {
    if (!canDelete) return
    setError(null)
    const res = await dispatch(deleteAccount())
    if (deleteAccount.fulfilled.match(res)) {
      await dispatch(logoutUser())
      navigate('/auth/login', { state: { message: 'Your account has been deleted.' } })
    } else {
      setError('Failed to delete account. Please try again.')
    }
  }

  return (
    <div className="space-y-5">
      {/* Warning banner */}
      <div className="p-4 bg-error-50 border border-error-200 rounded-xl">
        <div className="flex items-start gap-2.5">
          <span className="text-error-500 text-xl">⚠️</span>
          <div>
            <p className="text-sm font-bold text-error-700">This action is permanent</p>
            <p className="text-xs text-error-600 mt-1 leading-relaxed">
              Deleting your account will immediately remove all your personal data, order history, wallet balance, and saved addresses.
              This cannot be undone.
            </p>
          </div>
        </div>
      </div>

      {/* GDPR disclosure */}
      <div className="p-4 bg-bg-section rounded-xl border border-border text-xs text-text-secondary space-y-1.5 leading-relaxed">
        <p className="font-semibold text-text-primary text-sm">What happens when you delete your account:</p>
        <p>• Your personal information (name, email, phone) will be anonymised immediately</p>
        <p>• Order history will be retained anonymously for financial compliance (7 years) per UK law</p>
        <p>• Your wallet balance will be forfeited unless a refund request is submitted first</p>
        <p>• Active subscriptions will be cancelled immediately with no refund</p>
        <p>• You may exercise your right to data export before deletion via <strong>Account Settings → Export Data</strong></p>
      </div>

      {error && <div className="p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700">{error}</div>}

      {/* Typed confirmation */}
      <div>
        <p className="text-sm text-text-secondary mb-2">
          Type <span className="font-mono font-bold text-error-600">{CONFIRM_PHRASE}</span> to confirm:
        </p>
        <input
          type="text"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder={CONFIRM_PHRASE}
          className="w-full px-4 py-3 border-2 border-border rounded-xl text-sm font-mono focus:outline-none focus:border-error-400 transition-colors"
        />
      </div>

      <Button
        variant="danger"
        size="full"
        loading={isLoading}
        disabled={!canDelete}
        onClick={handleDelete}
      >
        Permanently Delete Account
      </Button>
    </div>
  )
}
