import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing } = useSelector(s => s.auth)
  const location = useLocation()

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }
  return children
}

export function GuestRoute({ children }) {
  const { isAuthenticated, isInitializing } = useSelector(s => s.auth)

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />
  }
  return children
}
