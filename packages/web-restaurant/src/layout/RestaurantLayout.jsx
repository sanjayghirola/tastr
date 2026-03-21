import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logoutRestaurant } from '../store/slices/authSlice.js'
import api from '../services/api.js'
import {
  LayoutDashboard, ClipboardList, UtensilsCrossed, BarChart2, Users2,
  Megaphone, Truck, CreditCard, MessageSquareWarning, Settings,
  Clock, Bell, LogOut, Search, Menu, X, ChefHat, History,
} from 'lucide-react'

const NAV_ITEMS = [
  { key: '/dashboard',     label: 'Dashboard',          Icon: LayoutDashboard },
  { key: '/orders',        label: 'Live Orders',        Icon: ClipboardList },
  { key: '/kitchen',       label: 'Kitchen Display',    Icon: ChefHat },
  { key: '/orders/history',label: 'Order History',      Icon: History },
  { key: '/menu',          label: 'Menu',               Icon: UtensilsCrossed },
  { key: '/insights',      label: 'Insights',           Icon: BarChart2 },
  { key: '/staff',         label: 'Staff',              Icon: Users2 },
  { key: '/marketing',     label: 'Marketing',          Icon: Megaphone },
  { key: '/delivery',      label: 'Delivery Settings',  Icon: Truck },
  { key: '/payments',      label: 'Payments',           Icon: CreditCard },
  { key: '/complaints',    label: 'Complaints',         Icon: MessageSquareWarning },
  { section: 'SETTINGS' },
  { key: '/profile',       label: 'Restaurant Profile', Icon: Settings },
  { key: '/hours',         label: 'Opening Hours',      Icon: Clock },
  { key: '/notifications', label: 'Notifications',      Icon: Bell },
]

export default function RestaurantLayout({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const dispatch  = useDispatch()
  const { user }  = useSelector(s => s.auth)
  const [isOnline, setIsOnline]   = useState(false)
  const [onlineLoading, setOnlineLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Fetch current online status on mount
  useEffect(() => {
    api.get('/restaurants/me').then(r => {
      if (r.data?.restaurant?.isOnline !== undefined) setIsOnline(r.data.restaurant.isOnline)
    }).catch(() => {
      api.get('/restaurants/status').then(r => {
        if (r.data?.restaurant?.isOnline !== undefined) setIsOnline(r.data.restaurant.isOnline)
      }).catch(() => {})
    })
  }, [])

  // Toggle online/offline via API
  const handleToggleOnline = useCallback(async () => {
    setOnlineLoading(true)
    try {
      const newStatus = !isOnline
      const res = await api.put('/restaurants/online', { isOnline: newStatus })
      setIsOnline(res.data.isOnline ?? newStatus)
    } catch (err) {
      console.error('Failed to toggle online status:', err)
    } finally {
      setOnlineLoading(false)
    }
  }, [isOnline])

  const handleLogout = async () => {
    await dispatch(logoutRestaurant())
    navigate('/auth/login')
  }

  const sidebarW = collapsed ? 'w-[64px]' : 'w-[220px]'
  const mainML   = collapsed ? 'ml-[64px]' : 'ml-[220px]'

  return (
    <div className="flex min-h-screen bg-bg-page">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-screen bg-bg-card border-r border-border flex flex-col z-40 overflow-y-auto transition-all duration-300 ${sidebarW}`}>
        {/* Logo + collapse */}
        <div className={`h-16 border-b border-border flex items-center flex-shrink-0 ${collapsed ? 'justify-center px-2' : 'px-4 justify-between'}`}>
          {!collapsed && <span className="text-xl font-extrabold text-brand-500 tracking-tight">Tastr</span>}
          <button onClick={() => setCollapsed(o => !o)} className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-bg-section transition-colors">
            {collapsed ? <Menu size={18} /> : <X size={16} />}
          </button>
        </div>

        {/* Online toggle — only when expanded */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-border flex-shrink-0">
            <button
              onClick={handleToggleOnline}
              disabled={onlineLoading}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${isOnline ? 'bg-brand-500 text-white' : 'bg-bg-section border border-border text-text-primary'} ${onlineLoading ? 'opacity-60' : ''}`}
            >
              <div>
                <p className="text-xs font-bold">{isOnline ? "You're Online" : "You're Offline"}</p>
                <p className={`text-[10px] ${isOnline ? 'text-white/80' : 'text-text-muted'}`}>{isOnline ? 'Accepting orders' : 'Not accepting'}</p>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOnline ? 'bg-white animate-pulse' : 'bg-text-muted'}`} />
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.map((item, i) => {
            if (item.section) {
              if (collapsed) return <div key={`s-${i}`} className="mx-3 my-2 h-px bg-border" />
              return <p key={`s-${i}`} className="px-5 pt-4 pb-1 text-[10px] font-bold tracking-widest uppercase text-text-muted">{item.section}</p>
            }
            const { Icon } = item
            const active = location.pathname === item.key || (
              item.key !== '/orders' && location.pathname.startsWith(item.key + '/')
            )

            if (collapsed) return (
              <button key={item.key} onClick={() => navigate(item.key)} title={item.label}
                className={`w-full flex items-center justify-center py-3 transition-colors ${active ? 'text-brand-500' : 'text-text-muted hover:text-brand-500'}`}>
                <Icon size={18} />
              </button>
            )

            return (
              <button key={item.key} onClick={() => navigate(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-150 text-left
                  ${active ? 'bg-brand-100 text-brand-600 font-semibold' : 'text-text-secondary hover:bg-brand-50 hover:text-brand-500'}
                `}
                style={{ width: 'calc(100% - 16px)' }}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        {!collapsed ? (
          <div className="px-4 py-4 border-t border-border flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-600 flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'R'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-primary truncate">{user?.name || 'Restaurant'}</p>
                <p className="text-[10px] text-text-muted truncate">{user?.role}</p>
              </div>
              <button onClick={handleLogout} className="text-text-muted hover:text-red-500 transition-colors p-1" title="Logout">
                <LogOut size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 border-t border-border flex justify-center flex-shrink-0">
            <button onClick={handleLogout} className="text-text-muted hover:text-red-500 transition-colors" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${mainML}`}>
        <header className="h-16 bg-bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2 bg-bg-section border border-border rounded-xl px-3 py-2 w-56">
            <Search size={15} className="text-text-muted flex-shrink-0" />
            <input type="text" placeholder="Search…" className="bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none flex-1 min-w-0" />
          </div>
          <button className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-50 transition-colors text-text-muted">
            <Bell size={18} />
          </button>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
