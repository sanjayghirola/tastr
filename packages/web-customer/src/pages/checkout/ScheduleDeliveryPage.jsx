import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import MainLayout from '../../layouts/MainLayout.jsx'

const TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','17:00','17:30','18:00','18:30',
  '19:00','19:30','20:00','20:30','21:00','21:30',
]

function getDays(count = 7) {
  const days = []
  const today = new Date()
  for (let i = 1; i <= count; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d)
  }
  return days
}

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function ScheduleDeliveryPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { addressId } = location.state || {}
  const days      = getDays(7)
  const [selDay,  setSelDay]  = useState(null)
  const [selTime, setSelTime] = useState(null)

  const handleConfirm = () => {
    if (!selDay || !selTime) return
    const [h, m] = selTime.split(':').map(Number)
    const scheduledAt = new Date(selDay)
    scheduledAt.setHours(h, m, 0, 0)
    navigate('/checkout/payment', {
      state: { addressId, deliveryMethod: 'scheduled', scheduledAt: scheduledAt.toISOString() },
    })
  }

  return (
    <MainLayout>
      <div className="px-4 pt-10 pb-32">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-bg-section flex items-center justify-center">‹</button>
          <h1 className="text-xl font-bold text-text-primary">Schedule Delivery</h1>
        </div>

        {/* Date grid */}
        <div className="mb-6">
          <p className="text-sm font-bold text-text-primary mb-3">Select Date</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {days.map((d, i) => {
              const key = d.toDateString()
              const sel = selDay?.toDateString() === key
              return (
                <button key={i} onClick={() => setSelDay(d)}
                  className={`flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-2xl border transition-all min-w-[62px]
                    ${sel ? 'bg-brand-500 border-brand-500 text-white' : 'bg-bg-card border-border text-text-secondary hover:border-brand-400'}`}>
                  <span className={`text-xs font-medium ${sel ? 'text-white/80' : 'text-text-muted'}`}>{DAY_LABELS[d.getDay()]}</span>
                  <span className="text-lg font-black mt-0.5">{d.getDate()}</span>
                  <span className={`text-xs ${sel ? 'text-white/80' : 'text-text-muted'}`}>{MONTH_LABELS[d.getMonth()]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Time slots */}
        <div className="mb-6">
          <p className="text-sm font-bold text-text-primary mb-3">Select Time Slot</p>
          <div className="grid grid-cols-4 gap-2">
            {TIME_SLOTS.map(t => (
              <button key={t} onClick={() => setSelTime(t)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all
                  ${selTime === t ? 'bg-brand-500 border-brand-500 text-white' : 'bg-bg-card border-border text-text-secondary hover:border-brand-400'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {selDay && selTime && (
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-4">
            <p className="text-sm font-semibold text-brand-700">📅 Scheduled for:</p>
            <p className="text-base font-bold text-brand-600 mt-1">
              {DAY_LABELS[selDay.getDay()]}, {selDay.getDate()} {MONTH_LABELS[selDay.getMonth()]} at {selTime}
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30">
        <button
          onClick={handleConfirm}
          disabled={!selDay || !selTime}
          className="w-full py-4 rounded-2xl bg-brand-500 text-white font-bold text-base shadow-brand hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          Confirm Schedule →
        </button>
      </div>
    </MainLayout>
  )
}
