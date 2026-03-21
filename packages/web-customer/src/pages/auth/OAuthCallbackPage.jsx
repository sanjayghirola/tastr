import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setAccessToken } from '../../services/api.js'
import { setUser } from '../../store/slices/authSlice.js'
import { authApi } from '../../services/api.js'

// Handles redirect from backend after Google/Facebook OAuth
export default function OAuthCallbackPage() {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const dispatch      = useDispatch()

  useEffect(() => {
    const access  = params.get('accessToken')
    const refresh = params.get('refreshToken')
    const err     = params.get('error')

    if (err || !access || !refresh) {
      navigate('/auth/login?error=oauth_failed')
      return
    }

    setAccessToken(access)
    localStorage.setItem('tastr_refresh', refresh)

    authApi.getMe()
      .then(res => {
        dispatch(setUser(res.data.user))
        navigate('/home')
      })
      .catch(() => {
        navigate('/auth/login?error=oauth_failed')
      })
  }, [])

  return (
    <div className="min-h-screen bg-bg-app flex items-center justify-center">
      <div className="text-center">
        <div className="spinner spinner-lg mx-auto mb-4" />
        <p className="text-sm text-text-muted">Completing sign in…</p>
      </div>
    </div>
  )
}
