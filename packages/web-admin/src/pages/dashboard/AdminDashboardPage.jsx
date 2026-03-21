import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, Truck, UtensilsCrossed, ShoppingBag, Users, DollarSign,
  AlertCircle, Clock, ChevronRight, Download, RefreshCw
} from 'lucide-react'
import api from '../../services/api.js'

const fmt = p => `£${(p / 100).toFixed(2)}`
const fmtK = p => { const v = p / 100; return v >= 1000 ? `£${(v/1000).toFixed(1)}k` : `£${v.toFixed(0)}`; }

function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.floor(s/60)} min ago`;
  if (s < 86400) return `${Math.floor(s/3600)} hr ago`; return `${Math.floor(s/86400)}d ago`;
}

function MetricCard({ label, value, sub, icon: Icon, color, trend }) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend && (
          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{trend}</span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
      {sub && <p className="text-xs text-brand-500 font-semibold mt-1">{sub}</p>}
    </div>
  )
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-text-primary mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'revenue' ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [chartData, setChartData] = useState([])
  const [activity, setActivity] = useState([])
  const [opItems, setOpItems] = useState([
    { label: 'Pending restaurant approvals', count: 0, path: '/restaurants/new-requests', color: 'text-amber-600 bg-amber-50' },
    { label: 'Pending driver approvals',     count: 0, path: '/drivers/pending',          color: 'text-blue-600 bg-blue-50' },
    { label: 'Pending student verifications',count: 0, path: '/student-verification',     color: 'text-purple-600 bg-purple-50' },
    { label: 'Pending refund requests',      count: 0, path: '/complaints',               color: 'text-red-600 bg-red-50' },
  ])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/dashboard-stats')
      const m = data.metrics || {}
      setStats({ ...m, ordersByStatus: data.ordersByStatus || {} })

      // Build chart data from monthlyRevenue
      const mr = data.monthlyRevenue || []
      setChartData(mr.map(d => ({
        month: d._id?.slice(5) || d._id,
        revenue: d.revenue || 0,
        orders: d.orders || 0,
      })))

      // Activity feed from audit logs
      setActivity((data.recentActivity || []).map(a => ({
        text: a.adminName ? `${a.adminName}: ${a.text}` : a.text,
        time: timeAgo(a.time),
        type: a.type || 'info',
      })))

      // Update operational counts
      setOpItems(prev => prev.map(item => {
        if (item.path === '/complaints') return { ...item, count: m.pendingComplaints || 0 }
        return item
      }))

      // Also fetch pending counts
      try {
        const [restP, drvP, stuP] = await Promise.all([
          api.get('/admin/restaurants?status=PENDING&limit=1').catch(() => ({ data: { total: 0 } })),
          api.get('/admin/drivers?status=PENDING&limit=1').catch(() => ({ data: { total: 0 } })),
          api.get('/student-verification?status=pending&limit=1').catch(() => ({ data: { total: 0 } })),
        ])
        setOpItems(prev => prev.map(item => {
          if (item.path === '/restaurants/new-requests') return { ...item, count: restP.data?.total || restP.data?.count || 0 }
          if (item.path === '/drivers/pending') return { ...item, count: drvP.data?.total || drvP.data?.count || 0 }
          if (item.path === '/student-verification') return { ...item, count: stuP.data?.total || stuP.data?.count || 0 }
          return item
        }))
      } catch {}
    } catch {
      // Fallback: dashboard still renders with zeros
    }
    setLoading(false)
  }

  useEffect(() => { fetchDashboard() }, [])

  // Computed values from stats
  const m = stats || {}
  const totalRevenue = chartData.reduce((s, d) => s + (d.revenue || 0), 0)
  const totalOrders = m.totalOrders || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back, <span className="text-brand-500">Admin</span>
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="text-sm border border-border rounded-xl px-3 py-2 bg-bg-card focus:outline-none focus:border-brand-500">
            <option>GBP £</option>
            <option>USD $</option>
          </select>
          <button className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* Top metrics */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (<>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Platform Earnings"   value={fmtK(totalRevenue)}                         icon={DollarSign}       color="bg-brand-500" />
        <MetricCard label="Active Drivers"      value={String(m.activeDrivers || 0)}                icon={Truck}            color="bg-blue-500" />
        <MetricCard label="Active Restaurants"  value={String(m.activeRestaurants || 0)}            icon={UtensilsCrossed}  color="bg-green-500" />
        <MetricCard label="Total Orders"        value={totalOrders.toLocaleString()}                icon={ShoppingBag}      color="bg-purple-500" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Today's Orders"      value={String(m.ordersToday || 0)}                 icon={ShoppingBag}      color="bg-amber-500" />
        <MetricCard label="Today's Revenue"     value={fmt(m.revenueToday || 0)}                   icon={TrendingUp}       color="bg-brand-500" />
        <MetricCard label="Active Subscriptions" value={String(m.activeSubscriptions || 0)}        icon={TrendingUp}       color="bg-teal-500" />
        <MetricCard label="Total Customers"     value={(m.totalCustomers || 0).toLocaleString()}   icon={Users}            color="bg-pink-500" />
      </div>

      {/* Revenue vs Orders Chart */}
      <div className="bg-bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-text-primary">Revenue vs Orders — Last 30 Days</h2>
          <button onClick={fetchDashboard} className="text-text-muted hover:text-text-primary transition-colors"><RefreshCw size={15} /></button>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0e8d8" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="revenue" tick={{ fontSize: 10 }} tickFormatter={v => `£${(v/100/1000).toFixed(0)}k`} />
            <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 10 }} />
            <Tooltip content={<ChartTip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="revenue" dataKey="revenue" name="Revenue" stroke="#C18B3C" strokeWidth={2.5} dot={{ r: 4, fill: '#C18B3C' }} activeDot={{ r: 6 }} />
            <Line yAxisId="orders"  dataKey="orders"  name="Orders"  stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: '#3B82F6' }} activeDot={{ r: 6 }} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Order Status & Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Order Status Breakdown */}
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-text-primary mb-4">Order Status Breakdown</h2>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(m.ordersByStatus || {}).length > 0
              ? Object.entries(m.ordersByStatus || {}).map(([status, count]) => (
                <div key={status} className="bg-bg-section rounded-xl p-3">
                  <p className="text-lg font-extrabold text-text-primary">{count}</p>
                  <p className="text-xs text-text-muted mt-0.5">{status}</p>
                </div>
              ))
              : <p className="text-sm text-text-muted col-span-2 py-4 text-center">No order data yet</p>
            }
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-text-primary mb-4">Revenue Summary</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-brand-50 rounded-xl p-3">
              <p className="text-sm font-extrabold text-brand-600">{fmt(totalRevenue)}</p>
              <p className="text-xs text-text-muted mt-0.5">Total Revenue (30d)</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-sm font-extrabold text-blue-600">{fmt(Math.round(totalRevenue * 0.15))}</p>
              <p className="text-xs text-text-muted mt-0.5">Est. Commission (15%)</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-sm font-extrabold text-green-600">{m.ordersToday || 0}</p>
              <p className="text-xs text-text-muted mt-0.5">Orders Today</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-sm font-extrabold text-amber-600">{m.activeSubscriptions || 0}</p>
              <p className="text-xs text-text-muted mt-0.5">Active Tastr+ Subs</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-sm font-extrabold text-purple-600">{m.activeDrivers || 0}</p>
              <p className="text-xs text-text-muted mt-0.5">Drivers Online</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-sm font-extrabold text-red-600">{m.pendingComplaints || 0}</p>
              <p className="text-xs text-text-muted mt-0.5">Open Complaints</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed & Operational Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity Feed */}
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-text-primary mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {activity.length > 0 ? activity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  item.type === 'success' ? 'bg-green-500' :
                  item.type === 'warning' ? 'bg-amber-500' :
                  item.type === 'error'   ? 'bg-red-500' : 'bg-brand-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">{item.text}</p>
                  <p className="text-xs text-text-muted">{item.time}</p>
                </div>
              </div>
            )) : <p className="text-sm text-text-muted py-4 text-center">No recent activity</p>}
          </div>
        </div>

        {/* Operational Widgets */}
        <div className="bg-bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-text-primary mb-4">Action Required</h2>
          <div className="space-y-2">
            {opItems.map((item, i) => (
              <button key={i} onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between p-3.5 border border-border rounded-xl hover:bg-bg-section transition-colors text-left">
                <p className="text-sm font-medium text-text-primary">{item.label}</p>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${item.color}`}>{item.count}</span>
                  <ChevronRight size={15} className="text-text-muted" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      </>)}
    </div>
  )
}
