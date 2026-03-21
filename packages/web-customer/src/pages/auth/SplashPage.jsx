import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

export default function SplashPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isInitializing } = useSelector(s => s.auth)

  useEffect(() => {
    // Wait for session restore to finish, then go to home
    if (isInitializing) return

    const timer = setTimeout(() => {
      navigate('/home', { replace: true })
    }, 1200)

    return () => clearTimeout(timer)
  }, [isInitializing, navigate])

  return (
    <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center">
      {/* Animated brand mark */}
      <div className="animate-scale-in text-center">
        <div className="w-24 h-24 rounded-3xl bg-brand-500 flex items-center justify-center mx-auto mb-6 shadow-btn">
          <span className="text-white text-4xl">🍔</span>
        </div>
        <h1 className="text-5xl font-extrabold text-brand-500 tracking-tight">Tastr</h1>
        <p className="text-text-muted mt-2 text-base">Good food, delivered fast</p>
      </div>

      {/* Loading dots */}
      <div className="flex gap-2 mt-12">
        {[0, 0.2, 0.4].map((delay, i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-brand-400 animate-pulse-brand"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
    </div>
  )
}
