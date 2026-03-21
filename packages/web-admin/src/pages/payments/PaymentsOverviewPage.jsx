import { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Mock data until real analytics endpoint (Phase 8)
const generateMonthlyData = () => {
  const months = ['Aug','Sep','Oct','Nov','Dec','Jan']
  return months.map((m, i) => ({
    month:         m,
    revenue:       Math.round(8000 + Math.random() * 12000),
    orders:        Math.round(150 + Math.random() * 300),
    commissions:   Math.round(2000 + Math.random() * 3000),
    deliveryFees:  Math.round(500 + Math.random() * 1000),
  }))
}

const BREAKDOWN_CARDS = [
  { label: 'Item Markup Revenue',    icon: '↑', color: 'bg-brand-50 border-brand-200', textColor: 'text-brand-600', value: 4820, trend: '+12.4%', up: true },
  { label: 'Service Fee Revenue',    icon: '#', color: 'bg-green-50 border-green-200', textColor: 'text-green-600',  value: 2140, trend: '+5.7%', up: true },
  { label: 'Commission Revenue',     icon: '₤', color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-600', value: 12840, trend: '+8.2%', up: true },
  { label: 'Delivery Margin',        icon: '→', color: 'bg-blue-50 border-blue-200',  textColor: 'text-blue-600',  value: 3260,  trend: '+3.1%', up: true },
  { label: 'Subscription Revenue',   icon: '★', color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700', value: 5670, trend: '+22.3%', up: true },
  { label: 'Wallet/Reward Cost',     icon: '−', color: 'bg-red-50 border-red-200',    textColor: 'text-red-600',    value: -1230, trend: '-9.4%', up: false },
]

function MetricCard({ label, icon, color, textColor, value, trend, up }) {
  const absVal = Math.abs(value)
  const sign   = value < 0 ? '-' : ''
  return (
    <div className={`p-4 rounded-2xl border ${color} flex items-start justify-between`}>
      <div>
        <p className="text-xs text-text-muted font-medium">{label}</p>
        <p className={`text-xl font-black mt-1 ${textColor}`}>{sign}£{(absVal / 100).toFixed(2)}</p>
        <span className={`text-xs font-semibold ${up ? 'text-green-600' : 'text-error-500'}`}>{up ? '↑' : '↓'} {trend}</span>
      </div>
      <span className="text-lg font-bold w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">{icon}</span>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-card border border-border rounded-xl px-3 py-2.5 shadow-elevated text-xs">
      <p className="font-bold text-text-primary mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.dataKey.includes('order') ? p.value : `£${(p.value / 100).toFixed(0)}`}
        </p>
      ))}
    </div>
  )
}

export default function PaymentsOverviewPage() {
  const [data] = useState(generateMonthlyData)

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-text-primary">Payments Overview</h1>
        <p className="text-sm text-text-muted mt-0.5">Revenue and financial performance — last 6 months</p>
      </div>

      {/* Revenue vs Orders chart */}
      <div className="bg-bg-card rounded-2xl p-5 border border-border mb-5">
        <p className="text-sm font-bold text-text-primary mb-4">Revenue vs Orders</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8D9C0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9B8B6E' }} />
            <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: '#9B8B6E' }} tickFormatter={v => `£${(v/100).toFixed(0)}`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9B8B6E' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="left"  type="monotone" dataKey="revenue"    name="Revenue"    stroke="#C18B3C" strokeWidth={2.5} dot={{ r: 4, fill: '#C18B3C' }} activeDot={{ r: 6 }} />
            <Line yAxisId="right" type="monotone" dataKey="orders"     name="Orders"     stroke="#6B7280" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Commissions breakdown chart */}
      <div className="bg-bg-card rounded-2xl p-5 border border-border mb-5">
        <p className="text-sm font-bold text-text-primary mb-4">Commissions & Delivery Margins</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8D9C0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9B8B6E' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9B8B6E' }} tickFormatter={v => `£${(v/100).toFixed(0)}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="commissions"  name="Commissions"    fill="#C18B3C" radius={[4,4,0,0]} />
            <Bar dataKey="deliveryFees" name="Delivery Fees"  fill="#E8D9C0" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {BREAKDOWN_CARDS.map(c => <MetricCard key={c.label} {...c} />)}
      </div>

      <p className="text-xs text-text-muted text-center mt-4">
        💡 Live analytics connect in Phase 8 — showing sample data
      </p>
    </div>
  )
}
