import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api.js'
import { Button } from '../../components/global/index.jsx'

const STATUS_COLORS = {
  active:  'bg-green-100 text-green-700',
  used:    'bg-gray-100 text-gray-500',
  expired: 'bg-red-100 text-red-600',
  voided:  'bg-orange-100 text-orange-600',
}

// ─── GiftCardsPage ────────────────────────────────────────────────────────────
export default function AdminGiftCardsPage() {
  const navigate = useNavigate()
  const [data, setData]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus]   = useState('')
  const [page, setPage]       = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 30 }
      if (status) params.status = status
      const res = await api.get('/admin/gift-cards', { params })
      setData(res.data.giftCards)
      setTotal(res.data.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, status])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gift Cards</h1>
          <p className="text-text-muted text-sm mt-1">{total} total cards</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/gift-cards/batch')}>+ Batch Create</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'active', 'used', 'expired', 'voided'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors capitalize
              ${status === s ? 'bg-brand-500 text-white' : 'bg-bg-section text-text-muted hover:text-text-primary'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-bg-card rounded-2xl overflow-hidden border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-section">
            <tr>
              {['Code', 'Value', 'Balance', 'Purchased By', 'Redeemed By', 'Status', 'Expires'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-text-muted">Loading…</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-text-muted">No gift cards found</td></tr>
            ) : data.map(c => (
              <tr key={c._id} className="border-t border-border hover:bg-bg-section/50">
                <td className="px-4 py-3 font-mono font-semibold text-text-primary">{c.code}</td>
                <td className="px-4 py-3 text-text-primary">£{(c.value / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-text-primary">£{(c.balance / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-text-muted">{c.purchasedBy?.name || '—'}</td>
                <td className="px-4 py-3 text-text-muted">{c.redeemedBy?.name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${STATUS_COLORS[c.status] || ''}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3 text-text-muted text-xs">{new Date(c.expiresAt).toLocaleDateString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-text-muted">Showing {data.length} of {total}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-3 py-1 rounded-lg text-xs font-semibold border border-border disabled:opacity-40">Prev</button>
            <button onClick={() => setPage(p => p+1)} disabled={data.length < 30}
              className="px-3 py-1 rounded-lg text-xs font-semibold border border-border disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CreateBatchPage ──────────────────────────────────────────────────────────
export function CreateBatchPage() {
  const navigate = useNavigate()
  const [value, setValue]     = useState(5000)
  const [qty, setQty]         = useState(10)
  const [months, setMonths]   = useState(12)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)

  const VALUES = [1000, 2500, 5000, 10000, 20000, 50000]

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await api.post('/admin/gift-cards/batch', { value, quantity: qty, expiryMonths: months })
      setResult(res.data)
    } finally { setLoading(false) }
  }

  const downloadCSV = () => {
    const csv = 'Code\n' + result.codes.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `gift-cards-${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="p-6">
      <button onClick={() => navigate('/gift-cards')} className="text-brand-500 text-sm font-semibold mb-6 flex items-center gap-1">← Back</button>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Batch Create Gift Cards</h1>

      {!result ? (
        <div className="bg-bg-card rounded-2xl p-6 space-y-5 border border-border">
          <div>
            <label className="text-sm font-semibold text-text-primary mb-2 block">Card Value</label>
            <div className="grid grid-cols-3 gap-2">
              {VALUES.map(v => (
                <button key={v} onClick={() => setValue(v)}
                  className={`py-2 rounded-xl border-2 text-sm font-bold transition-all
                    ${value === v ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-border text-text-primary'}`}>
                  £{(v/100).toFixed(0)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-text-primary mb-2 block">Quantity (max 500)</label>
            <input type="number" min="1" max="500" value={qty} onChange={e => setQty(Number(e.target.value))}
              className="tastr-input w-full py-3 px-4 text-sm border border-border rounded-[10px] focus:border-brand-500 focus:outline-none" />
          </div>

          <div>
            <label className="text-sm font-semibold text-text-primary mb-2 block">Expiry (months)</label>
            <input type="number" min="1" max="60" value={months} onChange={e => setMonths(Number(e.target.value))}
              className="tastr-input w-full py-3 px-4 text-sm border border-border rounded-[10px] focus:border-brand-500 focus:outline-none" />
          </div>

          <div className="bg-brand-50 rounded-xl p-3 text-sm text-brand-700">
            Creating <strong>{qty}</strong> gift cards worth <strong>£{(value/100).toFixed(0)}</strong> each.
            Total value: <strong>£{((value * qty) / 100).toFixed(2)}</strong>
          </div>

          <Button variant="primary" size="full" loading={loading} onClick={handleGenerate}>Generate Batch</Button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><polyline points="20 6 9 17 4 12"/></svg></div>
          <h2 className="font-bold text-green-800 mb-1">{result.count} Gift Cards Created!</h2>
          <p className="text-sm text-green-700 mb-4">All codes are ready to distribute.</p>
          <div className="space-y-2">
            <Button variant="primary" size="full" onClick={downloadCSV}>⬇️ Download CSV</Button>
            <Button variant="outline" size="full" onClick={() => { setResult(null); setQty(10) }}>Create Another Batch</Button>
          </div>
        </div>
      )}
    </div>
  )
}
