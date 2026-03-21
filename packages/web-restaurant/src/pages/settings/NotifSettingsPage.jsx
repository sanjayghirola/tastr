import { useState, useEffect } from 'react'
import { Toggle, Button } from '../../components/global/index.jsx'
import api from '../../services/api.js'

const NOTIF_SECTIONS = [
  {
    section: 'In-App Notifications',
    items: [
      { key: 'inAppNewOrder',   label: 'New Order Alert',      desc: 'Get alerted instantly when a new order comes in', icon: 'bell' },
      { key: 'inAppComplaint',  label: 'Complaint Received',   desc: 'Notified when a customer files a complaint',      icon: '⚠️' },
    ],
  },
  {
    section: 'Email Notifications',
    items: [
      { key: 'emailNewOrder',    label: 'New Order Email',     desc: 'Receive an email for each new order',            icon: '📧' },
      { key: 'emailDailyReport', label: 'Daily Summary',       desc: 'End-of-day report with sales and order stats',   icon: '📊' },
    ],
  },
]

export default function NotifSettingsPage() {
  const [prefs,   setPrefs]   = useState({ inAppNewOrder: true, inAppComplaint: true, emailNewOrder: false, emailDailyReport: true })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState(null)

  const toggle = key => setPrefs(p => ({ ...p, [key]: !p[key] }))

  const handleSave = async () => {
    setLoading(true); setError(null); setSuccess(false)
    try {
      await api.put('/restaurants/me/notification-prefs', prefs)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Notification Settings</h1>
        <p className="text-sm text-text-muted mt-0.5">Control how and when Tastr notifies you</p>
      </div>

      {error   && <div className="mb-4 p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 animate-fade-in">Preferences saved!</div>}

      <div className="space-y-6">
        {NOTIF_SECTIONS.map(section => (
          <div key={section.section}>
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2 px-1">{section.section}</p>
            <div className="space-y-2">
              {section.items.map(item => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-4 bg-bg-card rounded-xl border border-border-light hover:border-brand-200 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5 flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                      <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <Toggle checked={prefs[item.key]} onChange={() => toggle(item.key)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button variant="primary" size="full" loading={loading} onClick={handleSave} className="mt-6">
        Save Preferences
      </Button>
    </div>
  )
}
