import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Bell, Package, Wallet, Tag, AlertCircle, Info, CheckCircle, Gift, Star } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout.jsx'
import api from '../../services/api.js'

function getTypeIcon(type) {
  const map = {
    order:       { Icon: Package,      bg: 'bg-brand-100',  color: 'text-brand-600'  },
    wallet:      { Icon: Wallet,       bg: 'bg-green-100',  color: 'text-green-600'  },
    promo:       { Icon: Tag,          bg: 'bg-purple-100', color: 'text-purple-600' },
    referral:    { Icon: Gift,         bg: 'bg-amber-100',  color: 'text-amber-600'  },
    review:      { Icon: Star,         bg: 'bg-yellow-100', color: 'text-yellow-600' },
    alert:       { Icon: AlertCircle,  bg: 'bg-red-100',    color: 'text-red-600'    },
    info:        { Icon: Info,         bg: 'bg-blue-100',   color: 'text-blue-600'   },
    success:     { Icon: CheckCircle,  bg: 'bg-green-100',  color: 'text-green-600'  },
  }
  return map[type] || map.info
}

function getNavPath(notification) {
  const t = notification.type
  const meta = notification.meta || {}
  if (t === 'order' && meta.orderId) return `/tracking/${meta.orderId}`
  if (t === 'wallet') return '/wallet'
  if (t === 'promo') return '/home'
  if (t === 'referral') return '/referrals'
  if (t === 'review' && meta.orderId) return `/orders/${meta.orderId}`
  return null
}

function groupByDate(notifications) {
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)

  const groups = { Today: [], Yesterday: [], Older: [] }
  for (const n of notifications) {
    const d = new Date(n.createdAt); d.setHours(0,0,0,0)
    if (d.getTime() === today.getTime()) groups.Today.push(n)
    else if (d.getTime() === yesterday.getTime()) groups.Yesterday.push(n)
    else groups.Older.push(n)
  }
  return groups
}

function NotificationItem({ notification, onTap }) {
  const { Icon, bg, color } = getTypeIcon(notification.type)
  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <button
      onClick={() => onTap(notification)}
      className={`w-full flex items-start gap-3 px-5 py-4 border-b border-border last:border-0 text-left hover:bg-bg-section/50 transition-colors ${!notification.isRead ? 'bg-brand-50/30' : ''}`}
    >
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon size={18} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold text-text-primary leading-snug ${!notification.isRead ? 'font-bold' : ''}`}>{notification.title}</p>
        <p className="text-xs text-text-muted mt-0.5 leading-relaxed line-clamp-2">{notification.body}</p>
        <p className="text-xs text-text-muted mt-1.5">{timeAgo(notification.createdAt)}</p>
      </div>
      {!notification.isRead && (
        <div className="w-2.5 h-2.5 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
      )}
    </button>
  )
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/users/notifications?limit=50')
      .then(r => setNotifications(r.data.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const markAllRead = async () => {
    try {
      await api.post('/users/notifications/mark-all-read')
      setNotifications(ns => ns.map(n => ({ ...n, isRead: true })))
    } catch {}
  }

  const handleTap = async (notification) => {
    if (!notification.isRead) {
      try {
        await api.patch(`/users/notifications/${notification._id}/read`)
        setNotifications(ns => ns.map(n => n._id === notification._id ? { ...n, isRead: true } : n))
      } catch {}
    }
    const path = getNavPath(notification)
    if (path) navigate(path)
  }

  const groups = groupByDate(notifications)

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto pb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-10 pb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-bg-section flex items-center justify-center">
              <ChevronLeft size={20} className="text-text-primary" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Notifications</h1>
              {unreadCount > 0 && <p className="text-xs text-brand-500 font-semibold">{unreadCount} unread</p>}
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-brand-500 font-bold hover:text-brand-600 transition-colors">
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 px-5">
            <div className="w-16 h-16 rounded-full bg-bg-section flex items-center justify-center mx-auto mb-4">
              <Bell size={28} className="text-text-muted" />
            </div>
            <p className="font-semibold text-text-primary">All caught up!</p>
            <p className="text-sm text-text-muted mt-1">No notifications yet</p>
          </div>
        ) : (
          <div className="px-5 space-y-4">
            {Object.entries(groups).map(([label, items]) => {
              if (!items.length) return null
              return (
                <div key={label}>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">{label}</p>
                  <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
                    {items.map(n => (
                      <NotificationItem key={n._id} notification={n} onTap={handleTap} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
