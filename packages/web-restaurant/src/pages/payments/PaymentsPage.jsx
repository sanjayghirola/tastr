import { useEffect, useState } from 'react'
import {
  Download, CreditCard, TrendingUp, Banknote, Clock, CheckCircle2,
  Wallet, PieChart, ArrowUpRight, ArrowDownRight, Calendar, Eye, Receipt,
} from 'lucide-react'
import api from '../../services/api.js'

const fmt = p => `£${(Math.abs(p || 0) / 100).toFixed(2)}`

function MetricCard({ label, value, icon: Icon, color, trend, trendUp }) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs text-text-muted font-medium">{label}</p>
      <p className="text-2xl font-extrabold text-text-primary mt-1">{value}</p>
    </div>
  )
}

function WalletBalanceCard({ balance, pendingPayout, deliveryMode }) {
  return (
    <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8" />
      <div className="flex items-center gap-2 mb-4">
        <Wallet size={20} />
        <span className="text-sm font-semibold text-white/80">Restaurant Wallet</span>
        <span className="ml-auto px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
          {deliveryMode === 'own' ? 'Self Delivery' : 'Tastr Delivery'}
        </span>
      </div>
      <p className="text-xs text-white/60 mb-1">Available Balance</p>
      <p className="text-3xl font-black mb-4">{fmt(balance)}</p>
      <div className="flex items-center justify-between pt-3 border-t border-white/20">
        <div>
          <p className="text-xs text-white/60">Next Payout</p>
          <p className="text-sm font-bold">{fmt(pendingPayout)}</p>
        </div>
        <div>
          <p className="text-xs text-white/60">Payout Day</p>
          <p className="text-sm font-bold">Every Monday</p>
        </div>
        <div>
          <p className="text-xs text-white/60">Commission</p>
          <p className="text-sm font-bold">{deliveryMode === 'own' ? '10%' : '15–20%'}</p>
        </div>
      </div>
    </div>
  )
}

function EarningsBreakdown({ data }) {
  if (!data) return null
  const rows = [
    { label: 'Gross order revenue',   value: data.gross,       color: 'text-text-primary', bold: true },
    { label: 'Platform commission',    value: -data.commission, color: 'text-red-500' },
    ...(data.deliveryMode === 'own' ? [
      { label: 'Delivery fees earned', value: data.deliveryFeeKept, color: 'text-green-600' },
    ] : []),
    { label: 'Net earnings',           value: data.net,         color: 'text-brand-600', bold: true, border: true },
  ]
  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <PieChart size={16} className="text-brand-500" />
        <h3 className="font-bold text-text-primary text-sm">This Month's Earnings Breakdown</h3>
      </div>
      <div className="p-5 space-y-0">
        {rows.map(r => (
          <div key={r.label} className={`flex justify-between items-center py-2.5
            ${r.border ? 'border-t-2 border-border mt-1 pt-3' : 'border-b border-border last:border-0'}`}>
            <span className={`text-sm ${r.bold ? 'font-semibold text-text-primary' : 'text-text-muted'}`}>{r.label}</span>
            <span className={`text-sm font-bold ${r.color}`}>{r.value < 0 ? '-' : ''}{fmt(Math.abs(r.value))}</span>
          </div>
        ))}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-700 flex items-center gap-2">
            <Receipt size={12} />
            Commission rate: <strong>{data.commissionRate}%</strong>
            {data.isOverride && <span className="px-1.5 py-0.5 bg-blue-200 rounded text-xs">Custom rate</span>}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  const [payouts, setPayouts]   = useState([])
  const [summary, setSummary]   = useState(null)
  const [bankInfo, setBankInfo] = useState(null)
  const [wallet, setWallet]     = useState({ balance: 0, pendingPayout: 0 })
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('overview')

  useEffect(() => {
    Promise.all([
      api.get('/restaurants/payments/payouts'),
      api.get('/restaurants/payments/summary'),
      api.get('/restaurants/payments/wallet').catch(() => ({ data: { balance: 0, pendingPayout: 0 } })),
    ]).then(([pRes, sRes, wRes]) => {
      setPayouts(pRes.data.payouts || [])
      setBankInfo({ last4: pRes.data.bankAccountLast4, sortCode: pRes.data.bankSortCode })
      setSummary(sRes.data.thisMonth || null)
      setWallet(wRes.data || { balance: 0, pendingPayout: 0 })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const formatWeek = w => { if (!w) return '—'; const [y, wk] = w.split('-'); return `Week ${wk}, ${y}` }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const deliveryMode = summary?.deliveryMode || 'tastr'
  const breakdown = summary ? {
    gross: summary.gross || 0,
    commission: summary.fee || Math.round((summary.gross || 0) * (deliveryMode === 'own' ? 0.10 : 0.18)),
    deliveryFeeKept: summary.deliveryFeeKept || 0,
    net: summary.net || 0,
    commissionRate: summary.commissionRate || (deliveryMode === 'own' ? 10 : 18),
    isOverride: summary.isOverride || false,
    deliveryMode,
  } : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Payments & Wallet</h1>
          <p className="text-text-muted text-sm mt-0.5">Income dashboard, earnings, and payout history</p>
        </div>
        <button className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto no-scrollbar">
        {[
          { key: 'overview', label: 'Overview', Icon: Eye },
          { key: 'payouts',  label: 'Payout History', Icon: Banknote },
          { key: 'bank',     label: 'Bank Details', Icon: CreditCard },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all -mb-px
              ${tab === t.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
            <t.Icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <WalletBalanceCard balance={wallet.balance} pendingPayout={wallet.pendingPayout} deliveryMode={deliveryMode} />
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Gross Revenue" value={fmt(summary.gross)} icon={TrendingUp} color="bg-brand-500" trend="+8.2%" trendUp />
              <MetricCard label="Commission Deducted" value={fmt(breakdown?.commission)} icon={PieChart} color="bg-red-400" />
              <MetricCard label="Net Earnings" value={fmt(summary.net)} icon={CheckCircle2} color="bg-green-500" trend="+5.1%" trendUp />
              <MetricCard label="Orders This Month" value={summary.orders || 0} icon={Clock} color="bg-blue-500" />
            </div>
          )}
          <EarningsBreakdown data={breakdown} />
        </>
      )}

      {tab === 'payouts' && (
        <div>
          <h2 className="text-lg font-bold text-text-primary mb-4">Payout History</h2>
          {payouts.length === 0 ? (
            <div className="bg-bg-card border border-border rounded-2xl p-12 text-center">
              <Banknote size={28} className="text-text-muted mx-auto mb-3" />
              <p className="font-semibold text-text-primary mb-1">No payouts yet</p>
              <p className="text-text-muted text-sm">Payouts are processed weekly on Mondays for completed orders.</p>
            </div>
          ) : (
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-bg-section">
                  <tr>
                    {['Period','Orders','Gross','Commission','Delivery Fees','Net Payout','Status',''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p, i) => (
                    <tr key={i} className="border-t border-border hover:bg-bg-section/40">
                      <td className="px-4 py-3 font-medium text-text-primary">{formatWeek(p._id)}</td>
                      <td className="px-4 py-3 text-text-muted">{p.ordersCount}</td>
                      <td className="px-4 py-3 text-text-primary font-semibold">{fmt(p.grossRevenue)}</td>
                      <td className="px-4 py-3 text-red-500">-{fmt(p.commissionAmount || p.platformFee)}</td>
                      <td className="px-4 py-3 text-green-600">+{fmt(p.deliveryFeesKept || 0)}</td>
                      <td className="px-4 py-3 font-bold text-green-600">{fmt(p.netPayout)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                          ${p.status === 'paid' ? 'bg-green-100 text-green-700' : p.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {p.status || 'Paid'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 font-semibold">
                          <Download size={13} /> Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'bank' && (
        <div className="space-y-4">
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                  <CreditCard size={18} className="text-brand-600" />
                </div>
                <div>
                  <p className="font-bold text-text-primary">Bank Account</p>
                  <p className="text-sm text-text-muted">
                    {bankInfo?.last4 ? `••••  ••••  ${bankInfo.last4}` : 'Not set up'}
                    {bankInfo?.sortCode && ` · Sort: ${bankInfo.sortCode}`}
                  </p>
                </div>
              </div>
              <button className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">Change</button>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">Weekly settlement schedule</p>
            <p className="text-xs text-blue-600">Payouts are calculated every Sunday at midnight and transferred on Monday. 1–3 business days to appear.</p>
          </div>
        </div>
      )}
    </div>
  )
}
