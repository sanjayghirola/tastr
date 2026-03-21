import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { updateNotifPrefs } from '../../store/slices/profileSlice.js'
import { Toggle, Button } from '../../components/global/index.jsx'

const NOTIF_ITEMS = [
  { key: 'orderUpdates', label: 'Order Updates',   desc: 'Status changes, driver assigned, delivered',  icon: '📦' },
  { key: 'promotions',   label: 'Promotions',       desc: 'Exclusive deals, discount codes, new offers', icon: '🏷' },
  { key: 'wallet',       label: 'Wallet',           desc: 'Top-up confirmations, reward credits',        icon: '💰' },
  { key: 'groupOrders',  label: 'Group Orders',     desc: 'Member joined, checkout started',             icon: '👥' },
]

export default function NotifPrefsPage() {
  const dispatch = useDispatch()
  const { user } = useSelector(s => s.auth)
  const { isLoading, successMsg } = useSelector(s => s.profile)

  const [prefs, setPrefs] = useState({
    orderUpdates: user?.notifPrefs?.orderUpdates ?? true,
    promotions:   user?.notifPrefs?.promotions   ?? true,
    wallet:       user?.notifPrefs?.wallet       ?? true,
    groupOrders:  user?.notifPrefs?.groupOrders  ?? true,
  })

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }))

  const handleSave = () => dispatch(updateNotifPrefs(prefs))

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">Choose which notifications you'd like to receive.</p>

      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 animate-fade-in">{successMsg}</div>
      )}

      <div className="space-y-2">
        {NOTIF_ITEMS.map(item => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-bg-card rounded-xl border border-border-light hover:border-brand-200 transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
              </div>
            </div>
            <Toggle checked={prefs[item.key]} onChange={() => toggle(item.key)} />
          </div>
        ))}
      </div>

      <Button variant="primary" size="full" loading={isLoading} onClick={handleSave}>
        Save Preferences
      </Button>
    </div>
  )
}
