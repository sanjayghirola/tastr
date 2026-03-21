import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Clock, CheckCircle2, XCircle, FileText, AlertCircle } from 'lucide-react'
import api from '../../services/api.js'
import { setRestaurantStatus } from '../../store/slices/authSlice.js'

const POLL_MS = 15000

const DOC_UI = {
  not_uploaded: { Icon: FileText,     bg: 'bg-gray-100',   ic: 'text-gray-400',   label: 'Not uploaded',  badge: 'bg-gray-100 text-gray-500'   },
  pending:      { Icon: Clock,        bg: 'bg-amber-100',  ic: 'text-amber-500',  label: 'Under review',  badge: 'bg-amber-100 text-amber-700'  },
  approved:     { Icon: CheckCircle2, bg: 'bg-green-100',  ic: 'text-green-500',  label: 'Approved',      badge: 'bg-green-100 text-green-700'  },
  rejected:     { Icon: XCircle,      bg: 'bg-red-100',    ic: 'text-red-500',    label: 'Rejected',      badge: 'bg-red-100 text-red-700'      },
}

function DocRow({ doc }) {
  const ui = DOC_UI[doc.status] || DOC_UI.not_uploaded
  const { Icon } = ui
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${
      doc.status === 'rejected' ? 'border-red-200 bg-red-50' :
      doc.status === 'approved' ? 'border-green-100 bg-green-50/40' : 'border-border bg-bg-section'
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ui.bg}`}>
        <Icon size={15} className={ui.ic} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{doc.label}</p>
        {doc.status === 'rejected' && doc.rejectionReason && (
          <p className="text-xs text-red-600 mt-0.5">{doc.rejectionReason}</p>
        )}
      </div>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${ui.badge}`}>
        {ui.label}
      </span>
    </div>
  )
}

export default function PendingApprovalPage() {
  const navigate  = useNavigate()
  const dispatch  = useDispatch()
  const [restaurant, setRestaurant] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const pollRef = useRef()

  const fetchStatus = async () => {
    try {
      const res = await api.get('/restaurants/status')
      const r   = res.data.restaurant
      setRestaurant(r)

      if (r?.status === 'ACTIVE') {
        clearInterval(pollRef.current)
        // Update Redux so ProtectedRoute lets them through BEFORE navigating
        dispatch(setRestaurantStatus('ACTIVE'))
        setTimeout(() => navigate('/dashboard'), 1500)
      }
    } catch {
      // Silently ignore poll errors
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    pollRef.current = setInterval(fetchStatus, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-[#EDE0CC] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#C18B3C] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const status      = restaurant?.status
  const allDocs     = restaurant?.documentSlots || restaurant?.documents || []

  // Only show docs that have been uploaded (pending/approved/rejected) — skip not_uploaded optional ones
  // Always show required docs regardless of upload status
  const displayDocs = allDocs.filter(d => d.required || d.status !== 'not_uploaded')

  // Progress counts only among required docs
  const requiredDocs    = allDocs.filter(d => d.required !== false)
  const approvedRequired = requiredDocs.filter(d => d.status === 'approved').length
  const rejectedDocs    = allDocs.filter(d => d.status === 'rejected')
  const progress        = requiredDocs.length ? Math.round((approvedRequired / requiredDocs.length) * 100) : 0

  // ─── Approved — brief success then redirect ───────────────────────────────
  if (status === 'ACTIVE') return (
    <div className="min-h-screen bg-[#EDE0CC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-10 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You're approved! 🎉</h2>
        <p className="text-sm text-gray-500 mb-6">Redirecting to your dashboard…</p>
        <div className="w-8 h-8 border-2 border-[#C18B3C] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )

  // ─── Docs Required — rejected documents need reupload ────────────────────
  if (status === 'DOCS_REQUIRED' || rejectedDocs.length > 0) return (
    <div className="min-h-screen bg-[#EDE0CC] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-red-500 px-8 py-6 text-white text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-bold">Documents Require Attention</h2>
          <p className="text-white/80 text-sm mt-1">Some documents need to be re-uploaded</p>
        </div>

        <div className="p-7 space-y-4">
          <p className="text-sm text-gray-600">
            Our team reviewed your application. Please re-upload the rejected documents using the secure link sent to your email.
          </p>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-gray-600">Required Documents</p>
              <span className="text-xs text-[#C18B3C] font-bold">{approvedRequired}/{requiredDocs.length} approved</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="h-1.5 bg-[#C18B3C] rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* All uploaded + required docs */}
          <div className="space-y-2">
            {displayDocs.map((doc, i) => <DocRow key={doc.key || i} doc={doc} />)}
          </div>

          {rejectedDocs.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-xs font-bold text-amber-700 mb-1">📧 Check your email</p>
              <p className="text-xs text-amber-600">We've sent a secure re-upload link to your registered email address.</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C18B3C] animate-pulse" />
            <span>Auto-checking every 15 seconds</span>
          </div>

          <button onClick={() => { navigate('/auth/login') }}
            className="w-full py-3 border border-gray-200 text-gray-500 font-semibold rounded-2xl text-sm hover:bg-gray-50 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )

  // ─── Under Review (default pending state) ────────────────────────────────
  return (
    <div className="min-h-screen bg-[#EDE0CC] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Icon + heading */}
        <div className="px-8 py-10 text-center">
          <div className="w-24 h-24 mx-auto mb-5 flex items-center justify-center">
            <div className="relative">
              <FileText size={56} className="text-[#C18B3C]" strokeWidth={1.5} />
              <div className="absolute -bottom-2 -left-2 w-8 h-8 rounded-full bg-[#C18B3C]/20 flex items-center justify-center">
                <Clock size={16} className="text-[#C18B3C]" />
              </div>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your account is under review.</h2>
          <p className="text-sm text-gray-500">You'll be notified once approved.</p>
        </div>

        {/* Document verification */}
        {displayDocs.length > 0 && (
          <div className="border-t border-gray-100 px-7 pb-7 space-y-4">
            <div className="pt-5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-bold text-gray-700">Document Verification</p>
                <span className="text-xs text-[#C18B3C] font-bold">{approvedRequired}/{requiredDocs.length} approved</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 bg-[#C18B3C] rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              {displayDocs.map((doc, i) => <DocRow key={doc.key || i} doc={doc} />)}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C18B3C] animate-pulse" />
              <span>Auto-checking every 15 seconds</span>
            </div>
          </div>
        )}

        <div className="px-7 pb-7">
          <button onClick={() => navigate('/auth/login')}
            className="w-full py-3 border border-gray-200 text-gray-500 font-semibold rounded-2xl text-sm hover:bg-gray-50 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
