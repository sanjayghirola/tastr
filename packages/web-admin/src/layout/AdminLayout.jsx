import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logoutAdmin } from '../store/slices/authSlice.js'
import {
  LayoutDashboard, UtensilsCrossed, Bike, ClipboardList, Users, Truck,
  Megaphone, Wallet, Gift, Tag, MessageSquareWarning, DollarSign,
  FileText, GraduationCap, LayoutGrid, Crown, ShoppingBag,
  Settings, KeyRound, Wrench, Bell, ChevronDown, LogOut,
  Menu, X, Search, ChevronRight, Sliders,
} from 'lucide-react'

const NAV_ITEMS = [
  { section: 'MAIN MENU' },
  { key: '/dashboard',     label: 'Dashboard',                  Icon: LayoutDashboard },
  {
    key: '/restaurants', label: 'Restaurant management', Icon: UtensilsCrossed,
    children: [
      { key: '/restaurants/new-requests', label: 'New Requests' },
      { key: '/restaurants/list',         label: 'Restaurant List' },
      { key: '/restaurants/sales-report', label: 'Sales Report' },
    ],
  },
  { key: '/drivers',       label: 'Driver management',          Icon: Bike },
  { key: '/orders',        label: 'Order management',           Icon: ClipboardList },
  { key: '/customers',     label: 'Customer management',        Icon: Users },
  { key: '/delivery',      label: 'Delivery and pricing',       Icon: Truck },
  { key: '/pricing',       label: 'Pricing & Commission',       Icon: Sliders },
  { key: '/marketing',     label: 'Marketing & promotions',     Icon: Megaphone },
  { key: '/wallet',        label: 'Wallet, Referrals & Rewards',Icon: Wallet },
  { key: '/gift-cards',    label: 'Gift Cards',                 Icon: Gift },
  { key: '/promos',        label: 'Discounts & Promo Codes',    Icon: Tag },
  { key: '/complaints',    label: 'Refunds & Complaints',       Icon: MessageSquareWarning },
  { key: '/finance',       label: 'Finance & Payouts',          Icon: DollarSign },
  { key: '/cms',           label: 'Content & CMS',              Icon: FileText },
  { key: '/student-verification', label: 'Student Verification',Icon: GraduationCap },
  { key: '/catalog',       label: 'Catalog & Verticals',        Icon: LayoutGrid },
  { key: '/subscriptions', label: 'Subscriptions',              Icon: Crown },
  { key: '/driver-store',  label: 'Driver Store',               Icon: ShoppingBag },
  { section: 'SETTINGS' },
  {
    key: '/settings',    label: 'Account settings',             Icon: Settings,
    children: [
      { key: '/settings/profile',  label: 'Profile' },
      { key: '/settings/password', label: 'Password' },
    ],
  },
  { key: '/admin-users', label: 'Admin Users & Roles',          Icon: KeyRound },
  { key: '/tools',       label: 'Tools & Logs',                 Icon: Wrench },
]

function NavItem({ item, active, onNavigate, collapsed }) {
  const [open, setOpen] = useState(active?.startsWith(item.key) || false)

  if (item.section) {
    if (collapsed) return <div className="mx-3 my-2 h-px bg-border" />
    return (
      <p className="px-5 pt-4 pb-1 text-[10px] font-bold tracking-widest uppercase text-text-muted">
        {item.section}
      </p>
    )
  }

  const { Icon } = item
  const isActive       = active === item.key
  const isParentActive = item.children && active?.startsWith(item.key)
  const highlighted    = isActive || isParentActive

  if (collapsed) {
    return (
      <button
        onClick={() => onNavigate(item.key)}
        title={item.label}
        className={`w-full flex items-center justify-center py-3 transition-colors
          ${highlighted ? 'text-brand-500' : 'text-text-muted hover:text-brand-500'}`}
      >
        <Icon size={18} />
      </button>
    )
  }

  return (
    <div>
      <button
        onClick={() => item.children ? setOpen(o => !o) : onNavigate(item.key)}
        className={`w-full flex items-center justify-between px-3 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-150 text-left
          ${highlighted ? 'bg-brand-100 text-brand-600 font-semibold' : 'text-text-secondary hover:bg-brand-50 hover:text-brand-500'}
        `}
        style={{ width: 'calc(100% - 16px)' }}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Icon size={16} className="flex-shrink-0" />
          <span className="truncate">{item.label}</span>
        </span>
        {item.children && (
          <ChevronDown size={13} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {item.children && open && (
        <div className="ml-2 mt-0.5">
          {item.children.map(sub => (
            <button
              key={sub.key}
              onClick={() => onNavigate(sub.key)}
              className={`w-full text-left pl-9 pr-4 py-2 text-sm rounded-lg mx-1 transition-all duration-150
                ${active === sub.key ? 'text-brand-500 font-semibold bg-brand-50' : 'text-text-muted hover:text-brand-500 hover:bg-brand-50'}
              `}
              style={{ width: 'calc(100% - 8px)' }}
            >
              <span className="flex items-center gap-2">
                <ChevronRight size={11} />
                {sub.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminLayout({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const dispatch  = useDispatch()
  const { admin } = useSelector(s => s.auth)
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await dispatch(logoutAdmin())
    navigate('/auth/login')
  }

  const sidebarW = collapsed ? 'w-[64px]' : 'w-[228px]'
  const mainML   = collapsed ? 'ml-[64px]' : 'ml-[228px]'

  return (
    <div className="admin-shell flex min-h-screen bg-bg-page">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-screen bg-bg-card border-r border-border shadow-sidebar flex flex-col overflow-y-auto z-40 transition-all duration-300 ${sidebarW}`}>
        {/* Logo */}
        <div className={`h-16 border-b border-border flex items-center flex-shrink-0 ${collapsed ? 'justify-center px-2' : 'px-5 justify-between'}`}>
          {!collapsed && (
            <span className="text-xl font-extrabold text-brand-500 tracking-tight">Tastr Admin</span>
          )}
          <button
            onClick={() => setCollapsed(o => !o)}
            className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-bg-section"
          >
            {collapsed ? <Menu size={18} /> : <X size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.map((item, i) => (
            <NavItem
              key={item.key || `section-${i}`}
              item={item}
              active={location.pathname}
              onNavigate={path => navigate(path)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="px-4 py-4 border-t border-border flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-600 flex-shrink-0">
                {admin?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-primary truncate">{admin?.name || 'Admin'}</p>
                <p className="text-[10px] text-text-muted truncate capitalize">{admin?.role?.replace('_', ' ').toLowerCase()}</p>
              </div>
              <button onClick={handleLogout} className="text-text-muted hover:text-red-500 transition-colors p-1" title="Logout">
                <LogOut size={15} />
              </button>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="py-4 border-t border-border flex justify-center flex-shrink-0">
            <button onClick={handleLogout} className="text-text-muted hover:text-red-500 transition-colors" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${mainML}`}>
        {/* Topbar */}
        <header className="h-16 bg-bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2 bg-bg-section border border-border rounded-xl px-3 py-2 w-64">
            <Search size={15} className="text-text-muted flex-shrink-0" />
            <input type="text" placeholder="Search…" className="bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none flex-1 min-w-0" />
          </div>
          <div className="flex items-center gap-3">
            <button className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-50 transition-colors text-text-muted">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full border-2 border-bg-card" />
            </button>
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-600 cursor-pointer">
              {admin?.name?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
