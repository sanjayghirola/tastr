import { useState, useEffect } from 'react'
import { Button, Toggle } from '../../components/global/index.jsx'
import api from '../../services/api.js'

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const DEFAULT_HOURS = DAYS.map(day => ({
  day,
  isOpen: !['Sat','Sun'].includes(day) ? true : true,
  open:   '09:00',
  close:  '22:00',
}))

// Quick preset fills
const PRESETS = [
  { label: 'All 9am–10pm',    apply: () => DEFAULT_HOURS },
  { label: 'Weekdays only',   apply: () => DAYS.map(d => ({ day: d, isOpen: !['Sat','Sun'].includes(d), open: '09:00', close: '22:00' })) },
  { label: 'Lunch & Dinner',  apply: () => DAYS.map(d => ({ day: d, isOpen: true, open: '11:30', close: '22:30' })) },
]

function TimeInput({ value, onChange }) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-sm border border-border rounded-lg px-2.5 py-2 bg-bg-card focus:border-brand-500 focus:outline-none cursor-pointer"
    />
  )
}

export default function HoursSettingsPage() {
  const [hours,   setHours]   = useState(DEFAULT_HOURS)
  const [loading, setLoading] = useState(false)
  const [fetching,setFetching]= useState(true)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    api.get('/restaurants/me')
      .then(res => {
        const h = res.data.restaurant?.openingHours
        if (h && h.length > 0) setHours(h)
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [])

  const update = (i, field, value) =>
    setHours(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: value } : h))

  const applyPreset = (preset) => setHours(preset.apply())

  const handleSave = async () => {
    setLoading(true); setError(null); setSuccess(false)
    try {
      await api.put('/restaurants/me/hours', { hours })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save hours')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="flex justify-center py-20"><span className="spinner spinner-lg" /></div>

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Opening Hours</h1>
          <p className="text-sm text-text-muted mt-0.5">Set when your restaurant is available to accept orders</p>
        </div>
      </div>

      {/* Presets */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p)}
            className="px-3 py-1.5 text-xs font-medium border border-brand-300 text-brand-500 rounded-full hover:bg-brand-50 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {error   && <div className="mb-4 p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 animate-fade-in">Hours saved!</div>}

      {/* Hours grid */}
      <div className="space-y-2 mb-6">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-3 mb-1">
          <div className="w-10 text-xs font-bold text-text-muted uppercase tracking-wider">Day</div>
          <div className="w-14 text-xs font-bold text-text-muted uppercase tracking-wider text-center">Open</div>
          <div className="flex-1" />
        </div>

        {hours.map((h, i) => (
          <div
            key={h.day}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-150
              ${h.isOpen ? 'bg-bg-card border-brand-200 shadow-card' : 'bg-bg-section border-border opacity-60'}`}
          >
            {/* Day label */}
            <div className="w-10 text-sm font-bold text-text-primary">{h.day}</div>

            {/* Toggle */}
            <Toggle checked={h.isOpen} onChange={v => update(i, 'isOpen', v)} size="sm" />

            {h.isOpen ? (
              <>
                <TimeInput value={h.open}  onChange={v => update(i, 'open',  v)} />
                <span className="text-text-muted text-sm font-medium">to</span>
                <TimeInput value={h.close} onChange={v => update(i, 'close', v)} />

                {/* Duration display */}
                <span className="ml-auto text-xs text-text-muted bg-brand-50 px-2 py-1 rounded-lg border border-brand-100">
                  {(() => {
                    const [oh, om] = h.open.split(':').map(Number)
                    const [ch, cm] = h.close.split(':').map(Number)
                    const mins = (ch * 60 + cm) - (oh * 60 + om)
                    if (mins <= 0) return '—'
                    const hrs = Math.floor(mins / 60)
                    const rem = mins % 60
                    return rem ? `${hrs}h ${rem}m` : `${hrs}h`
                  })()}
                </span>
              </>
            ) : (
              <span className="text-sm text-text-muted ml-2">Closed all day</span>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-4 bg-brand-50 rounded-xl border border-brand-200 mb-5">
        <p className="text-xs font-semibold text-brand-700 mb-1">Open {hours.filter(h => h.isOpen).length} days a week</p>
        <p className="text-xs text-brand-600">
          {hours.filter(h => h.isOpen).map(h => h.day).join(', ')}
        </p>
      </div>

      <Button variant="primary" size="full" loading={loading} onClick={handleSave}>
        Save Opening Hours
      </Button>
    </div>
  )
}
