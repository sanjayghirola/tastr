import { useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Home, Search, ShoppingCart, Package, Wallet, User, Bell, MapPin, ChevronDown } from 'lucide-react'
import { selectCartCount } from '../store/slices/cartSlice.js'

const MOBILE_NAV = [
  { path: '/home',    Icon: Home,         label: 'Home'    },
  { path: '/search',  Icon: Search,       label: 'Search'  },
  { path: '/cart',    Icon: ShoppingCart,  label: 'Cart'    },
  { path: '/orders',  Icon: Package,      label: 'Orders'  },
  { path: '/profile', Icon: User,         label: 'Profile' },
]

export default function MainLayout({ children, hideHeader = false, hideFooter = false }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const cartCount = useSelector(selectCartCount)
  const { user, isAuthenticated } = useSelector(s => s.auth)

  const isActive = (p) => location.pathname === p || (p !== '/home' && location.pathname.startsWith(p))

  return (
    <div className="min-h-screen bg-bg-page flex flex-col">

      {/* ═══ STICKY TOP HEADER (like Swiggy/Zomato) ═══ */}
      {!hideHeader && (
        <header className="sticky top-0 z-50 bg-bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 lg:px-8">

            {/* Left: Logo + Location */}
            <div className="flex items-center gap-5">
              <button onClick={() => navigate('/home')} className="flex items-center gap-2 flex-shrink-0">
                <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2h3a2 2 0 012 2v3"/><path d="M21 2h-3a2 2 0 00-2 2v3"/><circle cx="12" cy="14" r="4"/><path d="M12 14v-3"/></svg>
                </div>
                <span className="text-xl font-black text-brand-500 tracking-tight hidden sm:block">Tastr</span>
              </button>

              <button className="hidden md:flex items-center gap-1.5 text-sm hover:text-brand-500 transition-colors">
                <MapPin size={14} className="text-brand-500" />
                <div className="text-left">
                  <p className="text-[10px] text-text-muted leading-none">Delivering to</p>
                  <p className="font-semibold text-text-primary flex items-center gap-0.5">Current Location <ChevronDown size={12} /></p>
                </div>
              </button>
            </div>

            {/* Center: Search bar */}
            <div className="hidden md:block flex-1 max-w-xl mx-6">
              <button onClick={() => navigate('/search')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full bg-bg-section border border-border text-text-muted text-sm hover:border-brand-300 transition-colors">
                <Search size={16} /><span>Search restaurants and dishes...</span>
              </button>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <button onClick={() => navigate('/notifications')}
                    className="w-9 h-9 rounded-full bg-bg-section flex items-center justify-center relative hover:bg-brand-50 transition-colors">
                    <Bell size={18} className="text-text-secondary" />
                  </button>

                  <button onClick={() => navigate('/wallet')}
                    className="hidden lg:flex w-9 h-9 rounded-full bg-bg-section items-center justify-center hover:bg-brand-50 transition-colors">
                    <Wallet size={16} className="text-text-secondary" />
                  </button>

                  <button onClick={() => navigate('/cart')}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors">
                    <ShoppingCart size={16} /><span>Cart</span>
                    {cartCount > 0 && (
                      <span className="ml-0.5 min-w-[18px] h-[18px] bg-white text-brand-500 text-xs font-bold rounded-full flex items-center justify-center px-1">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </button>

                  <button onClick={() => navigate('/profile')}
                    className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-sm font-bold hover:bg-brand-200 transition-colors overflow-hidden">
                    {user?.profilePhoto
                      ? <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" />
                      : (user?.name?.[0] || 'U').toUpperCase()}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate('/auth/login')}
                    className="px-4 py-2 rounded-full text-sm font-semibold text-brand-600 hover:bg-brand-50 transition-colors">
                    Log in
                  </button>
                  <button onClick={() => navigate('/auth/register')}
                    className="px-4 py-2 rounded-full bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors">
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ═══ MAIN CONTENT (full width, no sidebar) ═══ */}
      <main className="flex-1 pb-20 lg:pb-0">
        {children}
      </main>

      {/* ═══ FOOTER (desktop) ═══ */}
      {!hideFooter && (
        <footer className="hidden lg:block bg-bg-card border-t border-border mt-auto">
          <div className="max-w-7xl mx-auto px-8 py-10">
            <div className="grid grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="14" r="4"/><path d="M12 14v-3"/></svg>
                  </div>
                  <span className="text-lg font-black text-brand-500">Tastr</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">Discover the best food &amp; drinks from local restaurants, delivered right to your door.</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide mb-3">Explore</h4>
                <div className="space-y-2">
                  {[['Home','/home'],['Search','/search'],['My Orders','/orders'],['Group Orders','/groups/my'],['Gift Cards','/gift-cards'],['Subscriptions','/subscriptions']].map(([l,p])=>(
                    <button key={p} onClick={()=>navigate(p)} className="block text-sm text-text-secondary hover:text-brand-500 transition-colors">{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide mb-3">Account</h4>
                <div className="space-y-2">
                  {[['Profile','/profile'],['Wallet','/wallet'],['Addresses','/profile/addresses'],['Referrals','/referrals'],['Settings','/settings']].map(([l,p])=>(
                    <button key={p} onClick={()=>navigate(p)} className="block text-sm text-text-secondary hover:text-brand-500 transition-colors">{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide mb-3">Legal</h4>
                <div className="space-y-2">
                  {[['Privacy Policy','/privacy'],['Terms of Service','/terms'],['Help & Support','/help'],['Student Discounts','/student-verify']].map(([l,p])=>(
                    <button key={p} onClick={()=>navigate(p)} className="block text-sm text-text-secondary hover:text-brand-500 transition-colors">{l}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-border pt-6 flex items-center justify-between">
              <p className="text-xs text-text-muted">© {new Date().getFullYear()} Tastr Ltd. All rights reserved.</p>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span>Partner with us</span><span>·</span><span>Ride with us</span>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-bg-card border-t border-border z-50 safe-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {MOBILE_NAV.map(({ path, Icon, label }) => {
            const active = isActive(path)
            return (
              <button key={path} onClick={() => navigate(path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all flex-1 relative ${active ? 'text-brand-500' : 'text-text-muted hover:text-text-secondary'}`}>
                <span className="relative">
                  <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                  {path === '/cart' && cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">{cartCount > 9 ? '9+' : cartCount}</span>
                  )}
                </span>
                <span className={`text-[10px] font-medium leading-none ${active ? 'text-brand-500' : 'text-text-muted'}`}>{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
