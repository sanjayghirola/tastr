import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Avatar, Badge } from '../../components/global/index.jsx'
import MainLayout from '../../layouts/MainLayout.jsx'
import { logoutUser as logout } from '../../store/slices/authSlice.js'
import { ChevronRight, LogOut } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Account',
    links: [
      { label: 'Edit Profile',         icon: '✏️', path: '/profile/edit' },
      { label: 'My Addresses',         icon: '📍', path: '/profile/addresses' },
      { label: 'Payment Methods',      icon: '💳', path: '/payment-methods' },
      { label: 'Account Settings',     icon: '⚙️', path: '/settings/email' },
      { label: 'Change Password',      icon: '🔒', path: '/settings/security' },
    ]
  },
  {
    title: 'Orders & Wallet',
    links: [
      { label: 'My Orders',          icon: '📦', path: '/orders' },
      { label: 'Group Orders',       icon: '👥', path: '/groups/my' },
      { label: 'Wallet',             icon: '💰', path: '/wallet' },
      { label: 'Gift Cards',         icon: '🎁', path: '/gift-cards' },
      { label: 'Subscriptions',      icon: '👑', path: '/subscriptions' },
      { label: 'Refer a Friend',     icon: '🎉', path: '/referrals' },
    ]
  },
  {
    title: 'More',
    links: [
      { label: 'Student Discount',   icon: '🎓', path: '/student-verify' },
      { label: 'Help & Support',     icon: '💬', path: '/help' },
      { label: 'Privacy Policy',     icon: '🔒', path: '/privacy' },
      { label: 'Terms & Conditions', icon: '📄', path: '/terms' },
    ]
  },
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user } = useSelector(s => s.auth)

  return (
    <MainLayout>
      <div className="px-4 lg:px-8 pt-6 pb-8">
        {/* Desktop two-col layout */}
        <div className="lg:flex lg:gap-8 lg:items-start max-w-4xl">

          {/* Left: Profile card */}
          <div className="lg:w-72 lg:flex-shrink-0 mb-6 lg:mb-0">
            <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl px-6 pt-8 pb-6 text-white">
              <div className="flex flex-col items-center text-center">
                <Avatar src={user?.profilePhoto} name={user?.name} size="xl" className="border-3 border-white/30 mb-4" />
                <div className="flex items-center gap-2 flex-wrap justify-center mb-1">
                  <h2 className="text-xl font-bold">{user?.name || 'User'}</h2>
                  {user?.isStudentVerified && <Badge variant="warning" size="sm">🎓 Student</Badge>}
                </div>
                <p className="text-white/80 text-sm">{user?.email || user?.phone}</p>
                {user?.phone && user?.email && <p className="text-white/60 text-xs mt-0.5">{user.phone}</p>}
                <button onClick={() => navigate('/profile/edit')}
                  className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-semibold transition-colors">
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-bg-card border border-border rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-brand-500">{user?.orderCount || 0}</p>
                <p className="text-xs text-text-muted font-medium mt-0.5">Orders</p>
              </div>
              <div className="bg-bg-card border border-border rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-brand-500">£{((user?.totalSpend || 0) / 100).toFixed(0)}</p>
                <p className="text-xs text-text-muted font-medium mt-0.5">Total spent</p>
              </div>
            </div>
          </div>

          {/* Right: Links */}
          <div className="flex-1 space-y-4">
            {SECTIONS.map(section => (
              <div key={section.title} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-bg-section">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{section.title}</p>
                </div>
                <div className="divide-y divide-border-light">
                  {section.links.map(link => (
                    <button key={link.path} onClick={() => navigate(link.path)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-brand-50 transition-colors text-left">
                      <span className="text-xl w-7 text-center">{link.icon}</span>
                      <span className="flex-1 text-sm font-medium text-text-primary">{link.label}</span>
                      <ChevronRight size={14} className="text-text-muted" />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Sign out */}
            <button onClick={() => dispatch(logout())}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors">
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
