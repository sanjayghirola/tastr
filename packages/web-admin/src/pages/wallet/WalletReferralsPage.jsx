import { useEffect, useState } from 'react'
import { Wallet, Users, Gift, ArrowUpRight, ArrowDownLeft, Search } from 'lucide-react'
import api from '../../services/api.js'

const fmt = p => `£${((p || 0) / 100).toFixed(2)}`
const TABS = ['Wallet Transactions', 'Referral Programme', 'Reward Ledger']

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}><Icon size={16} className="text-white" /></div>
        <p className="text-xs text-text-muted font-medium">{label}</p>
      </div>
      <p className="text-2xl font-extrabold text-text-primary">{value}</p>
    </div>
  )
}

const TX_TYPE_STYLE = {
  topup:  { color: 'text-green-600 bg-green-50',   sign: '+', label: 'Top-up' },
  reward: { color: 'text-blue-600 bg-blue-50',     sign: '+', label: 'Reward' },
  debit:  { color: 'text-red-600 bg-red-50',       sign: '-', label: 'Spent' },
  refund: { color: 'text-purple-600 bg-purple-50', sign: '+', label: 'Refund' },
}

export default function WalletReferralsPage() {
  const [tab, setTab]               = useState(0)
  const [transactions, setTx]       = useState([])
  const [referrals, setReferrals]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [q, setQ]                   = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/admin/wallet/transactions?limit=50').then(r => setTx(r.data.transactions || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    api.get('/admin/referrals?limit=50').then(r => setReferrals(r.data.referrals || [])).catch(() => {})
  }, [])

  const totalTopUps  = transactions.filter(t => t.type === 'topup').reduce((s, t) => s + (t.amount || 0), 0)
  const totalRewards = transactions.filter(t => t.type === 'reward').reduce((s, t) => s + (t.amount || 0), 0)
  const totalSpent   = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0)
  const filteredTx   = transactions.filter(t => !q || t.userId?.name?.toLowerCase().includes(q.toLowerCase()) || t.userId?.email?.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Wallet & Referrals</h1>
        <p className="text-text-muted text-sm mt-1">Platform wallet transactions, referral tracking, and reward ledger</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Top-ups"  value={fmt(totalTopUps)}  icon={ArrowDownLeft} color="bg-green-500" />
        <StatCard label="Rewards Issued" value={fmt(totalRewards)} icon={Gift}          color="bg-blue-500" />
        <StatCard label="Total Spent"    value={fmt(totalSpent)}   icon={ArrowUpRight}  color="bg-brand-500" />
        <StatCard label="Referrals Made" value={referrals.length}  icon={Users}         color="bg-purple-500" />
      </div>

      <div className="flex gap-1 bg-bg-section border border-border rounded-2xl p-1">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === i ? 'bg-bg-card shadow-sm text-brand-600' : 'text-text-muted hover:text-text-primary'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-bg-card border border-border rounded-xl px-3 py-2">
            <Search size={14} className="text-text-muted" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search user…"
              className="bg-transparent text-sm focus:outline-none flex-1 placeholder:text-text-muted" />
          </div>
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-section">
                <tr>{['User','Type','Amount','Balance After','Description','Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-16 text-text-muted">Loading…</td></tr>
                ) : filteredTx.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-16 text-text-muted">
                    <Wallet size={28} className="mx-auto mb-2 opacity-30" />
                    <p>No transactions yet</p>
                  </td></tr>
                ) : filteredTx.map((t, i) => {
                  const s = TX_TYPE_STYLE[t.type] || { color: 'text-text-muted bg-bg-section', sign: '', label: t.type }
                  return (
                    <tr key={t._id || i} className="border-t border-border hover:bg-bg-section/40 transition-colors">
                      <td className="px-4 py-3"><p className="font-semibold text-text-primary">{t.userId?.name || '—'}</p><p className="text-xs text-text-muted">{t.userId?.email || '—'}</p></td>
                      <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-lg ${s.color}`}>{s.label}</span></td>
                      <td className="px-4 py-3 font-bold"><span className={t.type === 'debit' ? 'text-red-600' : 'text-green-600'}>{s.sign}{fmt(t.amount)}</span></td>
                      <td className="px-4 py-3 text-text-muted">{t.balanceAfter != null ? fmt(t.balanceAfter) : '—'}</td>
                      <td className="px-4 py-3 text-text-muted text-xs max-w-48 truncate">{t.description || '—'}</td>
                      <td className="px-4 py-3 text-text-muted text-xs">{t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB') : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-1">Referral Reward</p>
              <p className="text-2xl font-extrabold text-brand-600">£5.00</p>
              <p className="text-xs text-text-muted mt-1">Per successful referral (both parties)</p>
            </div>
            <div className="bg-bg-card border border-border rounded-2xl p-5">
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Total Referrals</p>
              <p className="text-2xl font-extrabold text-text-primary">{referrals.length}</p>
            </div>
            <div className="bg-bg-card border border-border rounded-2xl p-5">
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Total Paid Out</p>
              <p className="text-2xl font-extrabold text-text-primary">{fmt(referrals.filter(r => r.rewardPaid).length * 500)}</p>
            </div>
          </div>
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-section">
                <tr>{['Referrer','Referred','Code Used','Reward','Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {referrals.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-14 text-text-muted">
                    <Users size={28} className="mx-auto mb-2 opacity-30" /><p>No referrals yet</p>
                  </td></tr>
                ) : referrals.map((r, i) => (
                  <tr key={r._id || i} className="border-t border-border hover:bg-bg-section/40 transition-colors">
                    <td className="px-4 py-3"><p className="font-semibold text-text-primary">{r.referrerId?.name || '—'}</p><p className="text-xs text-text-muted">{r.referrerId?.email || '—'}</p></td>
                    <td className="px-4 py-3"><p className="font-semibold text-text-primary">{r.referredId?.name || '—'}</p></td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-600">{r.code || '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-lg ${r.rewardPaid ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>{r.rewardPaid ? '✓ Paid' : 'Pending'}</span></td>
                    <td className="px-4 py-3 text-text-muted text-xs">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Reward Sources</p>
            {[
              { label: 'Referral Rewards',      amount: referrals.filter(r => r.rewardPaid).length * 500, color: 'bg-blue-500' },
              { label: 'Promotional Credits',   amount: 0, color: 'bg-purple-500' },
              { label: 'Compensation Credits',  amount: 0, color: 'bg-amber-500' },
              { label: 'Cashback',              amount: 0, color: 'bg-green-500' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-2.5"><div className={`w-2.5 h-2.5 rounded-full ${item.color}`} /><span className="text-sm text-text-primary">{item.label}</span></div>
                <span className="font-bold text-text-primary">{fmt(item.amount)}</span>
              </div>
            ))}
          </div>
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Programme Settings</p>
            {[['Referral Reward','£5.00 each'],['Min Top-up','£5.00'],['Max Wallet Balance','Unlimited'],['Reward Expiry','None']].map(([l, v]) => (
              <div key={l} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="text-sm text-text-muted">{l}</span>
                <span className="text-sm font-semibold text-text-primary">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
