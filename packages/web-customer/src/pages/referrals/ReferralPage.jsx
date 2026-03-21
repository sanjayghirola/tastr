import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchReferralStats } from '../../store/slices/walletSlice.js'
import MainLayout from '../../layouts/MainLayout.jsx'

function StatCard({ value, label }) {
  return (
    <div className="bg-bg-card rounded-2xl p-4 text-center">
      <p className="text-2xl font-extrabold text-brand-500">{value}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </div>
  )
}

export default function ReferralPage() {
  const dispatch = useDispatch()
  const { referral, isLoading } = useSelector(s => s.wallet)

  useEffect(() => { dispatch(fetchReferralStats()) }, [dispatch])

  const code = referral?.referralCode || '---'
  const link = referral?.referralLink  || window.location.origin + '/signup?ref=' + code
  const stats = referral?.stats || { invited: 0, joined: 0, totalEarned: 0 }

  const copy = () => navigator.clipboard.writeText(code).then(() => alert('Code copied!'))
  const share = () => {
    if (navigator.share) {
      navigator.share({ title: 'Join me on Tastr!', text: `Use my code ${code} to get a discount`, url: link })
    } else {
      navigator.clipboard.writeText(link).then(() => alert('Link copied!'))
    }
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Refer & Earn</h1>

        {/* Code card */}
        <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl p-8 text-white text-center">
          <p className="text-sm opacity-80 mb-2">Your Referral Code</p>
          <div className="text-4xl font-extrabold tracking-widest mb-4 font-mono">{code}</div>
          <div className="flex gap-3">
            <button onClick={copy}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white text-sm font-bold py-2.5 rounded-2xl transition-colors">
              📋 Copy Code
            </button>
            <button onClick={share}
              className="flex-1 bg-white text-brand-600 text-sm font-bold py-2.5 rounded-2xl hover:bg-brand-50 transition-colors">
              🔗 Share Link
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard value={stats.invited} label="Invites Sent" />
          <StatCard value={stats.joined}  label="Friends Joined" />
          <StatCard value={`£${((stats.totalEarned || 0) / 100).toFixed(2)}`} label="Total Earned" />
        </div>

        {/* How it works */}
        <div className="bg-bg-card rounded-2xl p-5">
          <h2 className="font-bold text-text-primary mb-4">How It Works</h2>
          {[
            ['1', '🔗', 'Share your code', 'Send your unique referral code to friends'],
            ['2', '📱', 'Friend signs up', 'They create an account using your code'],
            ['3', '💰', 'Both earn rewards', 'You get £5 when they place their first order'],
          ].map(([step, icon, title, desc]) => (
            <div key={step} className="flex items-start gap-4 py-3 border-b border-border last:border-0">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm flex-shrink-0">
                {step}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{icon} {title}</p>
                <p className="text-xs text-text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Referral link */}
        <div className="bg-bg-card rounded-2xl p-4">
          <p className="text-xs text-text-muted mb-2 font-semibold">Your Referral Link</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-text-primary flex-1 truncate font-mono bg-bg-section rounded-lg px-3 py-2">{link}</p>
            <button onClick={share} className="text-brand-500 text-xs font-bold shrink-0">Copy</button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
