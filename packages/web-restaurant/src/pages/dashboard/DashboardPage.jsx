import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, ShoppingBag, CheckCircle2, Download, ArrowUpRight } from 'lucide-react'
import api from '../../services/api.js'

const fmt = p => `£${(p / 100).toFixed(2)}`

function StatCard({ label, value, Icon, color, trend }) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend && (
          <span className="flex items-center gap-0.5 text-xs font-bold text-green-600">
            <ArrowUpRight size={13} />{trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-text-primary">{value ?? '—'}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </div>
  )
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-text-primary mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'revenue' ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useSelector(s => s.auth)
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState(7)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/restaurants/my/analytics', { params: { days: period } })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [period])

  const s = data?.summary || {}
  const daily = data?.dailyRevenue || []
  const items = data?.topItems || []
  const hours = data?.busyHours || []
  const hourMap = Object.fromEntries(hours.map(h => [h._id, h.count]))
  const maxH = Math.max(...hours.map(h => h.count), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back, <span className="text-brand-500">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-bg-section rounded-xl p-1 border border-border">
            {[7, 30].map(d => (
              <button key={d} onClick={() => setPeriod(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${period === d ? 'bg-brand-500 text-white' : 'text-text-muted hover:text-text-primary'}`}>
                {d}d
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Orders"    value={s.totalOrders}                              Icon={ShoppingBag}  color="bg-brand-500"  trend="+8%" />
        <StatCard label="Completed"       value={s.completedCount}                           Icon={CheckCircle2} color="bg-green-500"  trend="+12%" />
        <StatCard label="Avg Order Value" value={s.avgOrderValue ? fmt(s.avgOrderValue) : null} Icon={TrendingUp}   color="bg-blue-500"  trend="+3%" />
        <StatCard label="Total Revenue"   value={s.totalRevenue  ? fmt(s.totalRevenue)  : null} Icon={TrendingUp}   color="bg-purple-500" trend="+9%" />
      </div>

      {/* Revenue Chart */}
      <div className="bg-bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-text-primary">Revenue — last {period} days</h2>
        </div>
        {loading ? (
          <div className="h-52 flex items-center justify-center text-text-muted text-sm">Loading…</div>
        ) : daily.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-text-muted text-sm">No order data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0e8d8" vertical={false} />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `£${(v / 100).toFixed(0)}`} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="revenue" name="Revenue" fill="#C18B3C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Items */}
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-text-primary mb-4">Top 5 Items</h2>
          {items.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-6">No order data yet</p>
          ) : items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
              <span className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600 flex-shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{item.name}</p>
                <p className="text-xs text-text-muted">{item.count} orders</p>
              </div>
              <span className="text-sm font-bold text-brand-500">{fmt(item.revenue)}</span>
            </div>
          ))}
        </div>

        {/* Busy Hours Heatmap */}
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-text-primary mb-4">Busy Hours</h2>
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: 24 }, (_, h) => {
              const cnt = hourMap[h] || 0
              const ratio = cnt / maxH
              return (
                <div key={h} title={`${h}:00 — ${cnt} orders`}
                  className={`h-8 rounded cursor-help transition-colors
                    ${ratio > 0.7 ? 'bg-brand-500' : ratio > 0.4 ? 'bg-brand-300' : ratio > 0.1 ? 'bg-brand-100' : 'bg-bg-section border border-border'}`}
                />
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-text-muted">
            <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
          </div>
          <div className="flex items-center gap-3 mt-3">
            {[['bg-bg-section border border-border', 'Low'], ['bg-brand-100', 'Med'], ['bg-brand-500', 'Peak']].map(([cls, lbl]) => (
              <div key={lbl} className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <span className={`w-3 h-3 rounded ${cls}`} />{lbl}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
