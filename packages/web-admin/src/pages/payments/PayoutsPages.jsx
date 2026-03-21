import { useState, useEffect } from 'react'
import { Badge, Button, DataTable } from '../../components/global/index.jsx'

// ─── Payout Management ────────────────────────────────────────────────────────
const MOCK_PAYOUTS = [
  { _id: '1', name: "Mario's Pizza",   type: 'restaurant', amount: 4280, period: 'Dec 2024', status: 'pending',    stripeAccountId: 'acct_xxx' },
  { _id: '2', name: 'James Driver',    type: 'driver',     amount: 1240, period: 'Dec 2024', status: 'paid',       stripeAccountId: 'acct_yyy', paidAt: '2024-12-28' },
  { _id: '3', name: 'Sushi Palace',    type: 'restaurant', amount: 6850, period: 'Dec 2024', status: 'pending',    stripeAccountId: 'acct_zzz' },
  { _id: '4', name: 'Burger Barn',     type: 'restaurant', amount: 2960, period: 'Nov 2024', status: 'processing', stripeAccountId: 'acct_aaa' },
  { _id: '5', name: 'Priya Delivery',  type: 'driver',     amount: 890,  period: 'Dec 2024', status: 'pending',    stripeAccountId: 'acct_bbb' },
]

const STATUS_V = { pending: 'warning', paid: 'success', processing: 'neutral', failed: 'error' }

export function PayoutManagementPage() {
  const [payouts,    setPayouts]    = useState(MOCK_PAYOUTS)
  const [processing, setProcessing] = useState(null)
  const [filter,     setFilter]     = useState('all')

  const triggerPayout = async (id) => {
    setProcessing(id)
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500))
    setPayouts(prev => prev.map(p => p._id === id ? { ...p, status: 'processing' } : p))
    setProcessing(null)
  }

  const filtered = filter === 'all' ? payouts : payouts.filter(p => p.status === filter)

  const columns = [
    { key: 'name',   header: 'Recipient', render: p => (
      <div>
        <p className="font-semibold text-text-primary text-sm">{p.name}</p>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${p.type === 'restaurant' ? 'bg-brand-50 text-brand-600' : 'bg-blue-50 text-blue-600'}`}>
          {p.type}
        </span>
      </div>
    )},
    { key: 'amount', header: 'Amount',  render: p => <span className="font-bold text-text-primary">£{(p.amount / 100).toFixed(2)}</span> },
    { key: 'period', header: 'Period',  render: p => p.period },
    { key: 'status', header: 'Status',  render: p => <Badge variant={STATUS_V[p.status]}>{p.status}</Badge> },
    { key: 'paidAt', header: 'Paid At', render: p => p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—' },
    { key: 'action', header: '',        render: p => p.status === 'pending' ? (
      <Button variant="primary" size="xs" loading={processing === p._id} onClick={() => triggerPayout(p._id)}>
        Trigger Payout
      </Button>
    ) : null },
  ]

  const totalPending = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Payout Management</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {payouts.filter(p => p.status === 'pending').length} pending · Total £{(totalPending / 100).toFixed(2)}
          </p>
        </div>
        <Button variant="primary" size="sm">Export CSV</Button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        {['all','pending','processing','paid','failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize transition-all
              ${filter === f ? 'bg-brand-500 border-brand-500 text-white' : 'border-border text-text-secondary hover:border-brand-400'}`}>
            {f}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} emptyTitle="No payouts found" />
    </div>
  )
}

// ─── Failed Payments ──────────────────────────────────────────────────────────
const MOCK_FAILED = [
  { _id: '1', orderId: 'TAS-XK9F2', customer: 'Alice Johnson', amount: 2450, reason: 'insufficient_funds',  failedAt: '2025-01-05T14:22:00Z', retried: false },
  { _id: '2', orderId: 'TAS-MN8P1', customer: 'Bob Williams',  amount: 1890, reason: 'card_declined',       failedAt: '2025-01-04T09:10:00Z', retried: true },
  { _id: '3', orderId: 'TAS-QR5T7', customer: 'Carol Davies',  amount: 3120, reason: 'expired_card',        failedAt: '2025-01-03T19:45:00Z', retried: false },
  { _id: '4', orderId: 'TAS-LV2K4', customer: 'Dan Patel',     amount: 985,  reason: 'do_not_honor',        failedAt: '2025-01-02T11:30:00Z', retried: false },
]

const REASON_LABELS = {
  insufficient_funds: 'Insufficient funds',
  card_declined:      'Card declined',
  expired_card:       'Expired card',
  do_not_honor:       'Do not honour',
  network_error:      'Network error',
}

export function FailedPaymentsList() {
  const [payments, setPayments] = useState(MOCK_FAILED)
  const [acting,   setActing]   = useState(null)

  const retry = async (id) => {
    setActing(id + '_retry')
    await new Promise(r => setTimeout(r, 1200))
    setPayments(prev => prev.map(p => p._id === id ? { ...p, retried: true } : p))
    setActing(null)
  }

  const notify = async (id) => {
    setActing(id + '_notify')
    await new Promise(r => setTimeout(r, 800))
    setActing(null)
    alert('Notification sent to customer')
  }

  const columns = [
    { key: 'order',   header: 'Order',     render: p => <span className="font-mono text-sm font-bold text-brand-600">{p.orderId}</span> },
    { key: 'cust',    header: 'Customer',  render: p => p.customer },
    { key: 'amount',  header: 'Amount',    render: p => `£${(p.amount / 100).toFixed(2)}` },
    { key: 'reason',  header: 'Reason',    render: p => (
      <span className="text-xs bg-error-50 text-error-700 px-2 py-0.5 rounded-full font-medium">
        {REASON_LABELS[p.reason] || p.reason}
      </span>
    )},
    { key: 'date',    header: 'Failed At', render: p => new Date(p.failedAt).toLocaleString() },
    { key: 'actions', header: '',          render: p => (
      <div className="flex gap-1.5">
        <Button variant="secondary" size="xs" loading={acting === p._id + '_retry'} disabled={p.retried} onClick={() => retry(p._id)}>
          {p.retried ? 'Retried' : 'Retry'}
        </Button>
        <Button variant="ghost" size="xs" loading={acting === p._id + '_notify'} onClick={() => notify(p._id)}>
          Notify
        </Button>
      </div>
    )},
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Failed Payments</h1>
          <p className="text-sm text-text-muted mt-0.5">{payments.length} failed payment intents</p>
        </div>
      </div>
      <DataTable columns={columns} data={payments} emptyTitle="No failed payments" />
    </div>
  )
}
