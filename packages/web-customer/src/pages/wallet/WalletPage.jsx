import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchWallet, fetchTransactions } from '../../store/slices/walletSlice.js'
import MainLayout from '../../layouts/MainLayout.jsx'
import api from '../../services/api.js'

function fmt(p) { return `£${((p || 0) / 100).toFixed(2)}` }

function TxIcon({ type }) {
  if (type === 'CREDIT' || type === 'TOP_UP' || type === 'REFERRAL') {
    return <span className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">↑</span>
  }
  return <span className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-500 font-bold text-sm">↓</span>
}

function TransactionItem({ tx }) {
  const isCredit = tx.amount > 0
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <TxIcon type={tx.type} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{tx.description}</p>
        <p className="text-xs text-text-muted">{new Date(tx.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</p>
      </div>
      <span className={`text-sm font-bold ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
        {isCredit ? '+' : ''}{fmt(tx.amount)}
      </span>
    </div>
  )
}

export default function WalletPage() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const { balance, transactions, isLoading } = useSelector(s => s.wallet)
  const [giftCode, setGiftCode]     = useState('')
  const [redeemMsg, setRedeemMsg]   = useState(null)
  const [redeemErr, setRedeemErr]   = useState(null)
  const [redeeming, setRedeeming]   = useState(false)
  const [txFilter, setTxFilter]     = useState('all')

  useEffect(() => {
    dispatch(fetchWallet())
    dispatch(fetchTransactions({ limit: 30 }))
  }, [dispatch])

  const handleRedeem = async () => {
    if (!giftCode.trim()) return
    setRedeeming(true); setRedeemMsg(null); setRedeemErr(null)
    try {
      const res = await api.post('/gift-cards/redeem', { code: giftCode.trim() })
      setRedeemMsg(`Gift card redeemed! ${fmt(res.data.amount || 0)} added to your wallet.`)
      setGiftCode('')
      dispatch(fetchWallet())
      dispatch(fetchTransactions({ limit: 30 }))
    } catch (err) {
      setRedeemErr(err.response?.data?.message || 'Invalid or expired gift card code.')
    } finally { setRedeeming(false) }
  }

  const filteredTx = transactions.filter(tx => {
    if (txFilter === 'all') return true
    if (txFilter === 'credits') return tx.amount > 0
    if (txFilter === 'debits') return tx.amount < 0
    return true
  })

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Balance card */}
        <div className="relative overflow-hidden rounded-3xl p-8 text-center shadow-btn"
          style={{ background: 'linear-gradient(135deg, #D4A44C 0%, #C18B3C 50%, #A8742E 100%)' }}>
          <div className="relative z-10 text-white">
            <p className="text-sm opacity-80 mb-1">Available Balance</p>
            <p className="text-5xl font-extrabold tracking-tight">{fmt(balance)}</p>
            <p className="text-xs opacity-70 mt-2 mb-4">Your rewards can be used on your next order</p>
            <button
              onClick={() => navigate('/wallet/topup')}
              className="bg-white text-brand-500 font-bold px-8 py-2.5 rounded-2xl text-sm hover:bg-brand-50 transition-colors"
            >
              Use rewards
            </button>
          </div>
        </div>

        {/* Transaction history */}
        <div className="bg-bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-text-primary">All Notifications</h2>
            <select value={txFilter} onChange={e => setTxFilter(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1 text-text-secondary bg-white focus:outline-none focus:border-brand-400">
              <option value="all">All Notifications</option>
              <option value="credits">Credits Only</option>
              <option value="debits">Debits Only</option>
            </select>
          </div>
          {isLoading ? (
            <div className="text-center py-8 text-text-muted text-sm">Loading…</div>
          ) : filteredTx.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">No transactions yet</div>
          ) : (
            filteredTx.slice(0, 10).map((tx, i) => <TransactionItem key={i} tx={tx} />)
          )}
          {filteredTx.length > 10 && (
            <button className="w-full text-center text-xs text-brand-500 font-semibold mt-3 hover:text-brand-600">
              View all transactions
            </button>
          )}

          <p className="text-xs text-text-muted text-center mt-4">
            Rewards are auto-applied at checkout. Terms apply.
          </p>
        </div>

        {/* Redeem gift card */}
        <div className="bg-bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-brand-500">🎁</span>
            <h3 className="font-bold text-brand-500">Redeem gift card</h3>
          </div>
          <p className="text-xs text-text-muted mb-3">Enter your gift card code below to add balance to your wallet.</p>

          {redeemMsg && <div className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">{redeemMsg}</div>}
          {redeemErr && <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{redeemErr}</div>}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter gift card code"
              value={giftCode}
              onChange={e => { setGiftCode(e.target.value); setRedeemErr(null); setRedeemMsg(null) }}
              className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white"
            />
            <button onClick={handleRedeem} disabled={redeeming || !giftCode.trim()}
              className="px-6 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 disabled:opacity-50 transition-colors">
              {redeeming ? '...' : 'Redeem'}
            </button>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Gift Cards', icon: '🎁', path: '/gift-cards' },
            { label: 'Subscription', icon: '⭐', path: '/subscriptions' },
            { label: 'Refer & Earn', icon: '🤝', path: '/referrals' },
          ].map(({ label, icon, path }) => (
            <button key={path} onClick={() => navigate(path)}
              className="bg-bg-card rounded-2xl p-4 flex flex-col items-center gap-2 border border-border hover:shadow-card transition-shadow">
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-semibold text-text-primary text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
