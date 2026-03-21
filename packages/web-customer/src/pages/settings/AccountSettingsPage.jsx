import { useNavigate, useParams } from 'react-router-dom'
import MainLayout from '../../layouts/MainLayout.jsx'
import { ArrowLeft, Mail, Phone, Bell, Shield, Trash2, ChevronRight } from 'lucide-react'
import ChangeEmailPage   from './ChangeEmailPage.jsx'
import ChangePhonePage   from './ChangePhonePage.jsx'
import NotifPrefsPage    from './NotifPrefsPage.jsx'
import SecurityPage      from './SecurityPage.jsx'
import DeleteAccountPage from './DeleteAccountPage.jsx'

const TABS = [
  { key: 'email',    label: 'Change Email',   Icon: Mail,   desc: 'Update your email address',  color: 'text-blue-500',  bg: 'bg-blue-50' },
  { key: 'phone',    label: 'Change Phone',   Icon: Phone,  desc: 'Update your phone number',   color: 'text-green-500', bg: 'bg-green-50' },
  { key: 'security', label: 'Password',       Icon: Shield, desc: 'Change your password',       color: 'text-brand-500', bg: 'bg-brand-50' },
  { key: 'notifs',   label: 'Notifications',  Icon: Bell,   desc: 'Manage notification prefs',  color: 'text-purple-500',bg: 'bg-purple-50' },
  { key: 'delete',   label: 'Delete Account', Icon: Trash2, desc: 'Permanently remove account', color: 'text-red-500',   bg: 'bg-red-50',   danger: true },
]

// Render functions (not static JSX refs) — ensures fresh component instances per tab
function renderTabContent(key) {
  switch (key) {
    case 'email':    return <ChangeEmailPage />
    case 'phone':    return <ChangePhonePage />
    case 'security': return <SecurityPage />
    case 'notifs':   return <NotifPrefsPage />
    case 'delete':   return <DeleteAccountPage />
    default:         return <ChangeEmailPage />
  }
}

export default function AccountSettingsPage() {
  const navigate  = useNavigate()
  const { tab: tabParam } = useParams()
  const activeTab = TABS.find(t => t.key === tabParam)?.key ?? 'email'
  const activeInfo = TABS.find(t => t.key === activeTab)

  return (
    <MainLayout>
      <div className="px-4 lg:px-8 pt-6 pb-10 max-w-4xl mx-auto">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full bg-bg-section flex items-center justify-center hover:bg-brand-50 transition-colors">
            <ArrowLeft size={18} className="text-text-secondary" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Account Settings</h1>
            <p className="text-xs text-text-muted">Manage your account details and preferences</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">

          {/* ── Left: tab navigation ─────────────────────────────── */}
          <div className="lg:w-60 flex-shrink-0">

            {/* Mobile: horizontal pills */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none lg:hidden pb-1 mb-2">
              {TABS.map(({ key, label, Icon, danger }) => (
                <button key={key} onClick={() => navigate(`/settings/${key}`)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border flex-shrink-0 transition-all
                    ${activeTab === key
                      ? danger ? 'bg-red-500 border-red-500 text-white shadow-sm' : 'bg-brand-500 border-brand-500 text-white shadow-sm'
                      : danger ? 'border-red-100 text-red-500 hover:bg-red-50' : 'bg-bg-card border-border text-text-secondary hover:border-brand-300'}`}>
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>

            {/* Desktop: vertical card sidebar */}
            <div className="hidden lg:block bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border-light bg-bg-section">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Settings</p>
              </div>
              {TABS.map(({ key, label, Icon, desc, danger, color, bg }) => {
                const active = activeTab === key
                return (
                  <button key={key} onClick={() => navigate(`/settings/${key}`)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-border-light last:border-0 transition-colors relative
                      ${active
                        ? danger ? 'bg-red-50' : 'bg-brand-50'
                        : danger ? 'hover:bg-red-50' : 'hover:bg-bg-section'}`}>
                    {/* Active indicator bar */}
                    {active && (
                      <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full ${danger ? 'bg-red-500' : 'bg-brand-500'}`} />
                    )}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? bg : 'bg-bg-section'}`}>
                      <Icon size={15} className={active ? color : 'text-text-muted'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${active ? (danger ? 'text-red-600' : 'text-brand-600') : danger ? 'text-red-500' : 'text-text-primary'}`}>
                        {label}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5 truncate">{desc}</p>
                    </div>
                    <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Right: content panel ─────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="bg-bg-card border border-border rounded-2xl shadow-sm overflow-hidden">

              {/* Content header */}
              <div className={`px-5 py-4 border-b border-border-light flex items-center gap-3 ${activeInfo?.danger ? 'bg-red-50' : 'bg-bg-section'}`}>
                {activeInfo && (
                  <>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeInfo.bg}`}>
                      <activeInfo.Icon size={17} className={activeInfo.color} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-text-primary">{activeInfo.label}</h2>
                      <p className="text-xs text-text-muted">{activeInfo.desc}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Tab content — rendered via function to ensure fresh instances */}
              <div className="p-5">
                {renderTabContent(activeTab)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
