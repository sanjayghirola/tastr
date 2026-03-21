import { useEffect, useState } from 'react'
import { Download, TrendingUp, ShoppingBag, DollarSign, Search } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../services/api.js'

const fmt = p => `£${((p || 0) / 100).toFixed(2)}`

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.dataKey === 'revenue' ? fmt(p.value) : p.value}</p>
      ))}
    </div>
  )
}

export function SalesReportPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    api.get('/admin/reports/restaurants')
      .then(r => setData(r.data.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = q ? data.filter(r => r.name?.toLowerCase().includes(q.toLowerCase())) : data

  const totals = filtered.reduce((acc, r) => ({
    revenue: acc.revenue + (r.revenue || 0),
    orders: acc.orders + (r.orders || 0),
  }), { revenue: 0, orders: 0 })

  const handleExport = () => {
    const csv = [
      ['Restaurant', 'Orders', 'Revenue', 'Avg Order'].join(','),
      ...filtered.map(r => [r.name, r.orders, fmt(r.revenue), fmt(r.avgOrder)].join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'sales-report.csv'; a.click()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sales Report</h1>
          <p className="text-text-muted text-sm mt-0.5">Revenue and order performance per restaurant</p>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Revenue', value: fmt(totals.revenue), Icon: TrendingUp, color: 'bg-brand-500' },
          { label: 'Total Orders', value: totals.orders.toLocaleString(), Icon: ShoppingBag, color: 'bg-blue-500' },
          { label: 'Avg Order Value', value: totals.orders > 0 ? fmt(totals.revenue / totals.orders) : '—', Icon: DollarSign, color: 'bg-green-500' },
        ].map(s => (
          <div key={s.label} className="bg-bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.Icon size={16} className="text-white" />
              </div>
              <p className="text-xs text-text-muted">{s.label}</p>
            </div>
            <p className="text-2xl font-extrabold text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Top chart */}
      {!loading && data.length > 0 && (
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-text-primary mb-4">Top 10 Restaurants by Revenue</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0e8d8" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `£${(v / 100 / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="revenue" name="Revenue" fill="#C18B3C" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xs border border-border rounded-xl px-3 py-2 bg-bg-section">
          <Search size={14} className="text-text-muted flex-shrink-0" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by name…"
            className="bg-transparent text-sm focus:outline-none flex-1 placeholder:text-text-muted" />
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-section">
            <tr>
              {['#', 'Restaurant', 'Orders', 'Revenue', 'Avg Order'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-text-muted">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-text-muted">No data</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={r._id || i} className="border-t border-border hover:bg-bg-section/40 transition-colors">
                <td className="px-4 py-3 text-text-muted font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-text-primary">{r.name}</td>
                <td className="px-4 py-3 text-text-muted">{r.orders?.toLocaleString()}</td>
                <td className="px-4 py-3 font-bold text-brand-500">{fmt(r.revenue)}</td>
                <td className="px-4 py-3 text-text-muted">{fmt(r.avgOrder)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SalesReportPage
