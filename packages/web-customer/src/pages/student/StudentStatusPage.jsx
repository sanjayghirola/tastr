import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, GraduationCap, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout.jsx'
import api from '../../services/api.js'

export default function StudentStatusPage() {
  const navigate = useNavigate()
  const [verification, setVerification] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/student-verification/my-status')
      .then(r => setVerification(r.data.verification))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <MainLayout>
      <div className="flex justify-center pt-20">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </MainLayout>
  )

  const STATUS = {
    pending: {
      icon: Clock, iconBg: 'bg-amber-100', iconColor: 'text-amber-500',
      badge: 'bg-amber-100 text-amber-700', badgeLabel: 'Under Review',
      title: 'Verification Under Review',
      message: 'Your application is being reviewed by our team. This typically takes 1–2 working days.',
      action: null,
    },
    approved: {
      icon: CheckCircle2, iconBg: 'bg-green-100', iconColor: 'text-green-500',
      badge: 'bg-green-100 text-green-700', badgeLabel: '✓ Verified',
      title: 'Student Verified!',
      message: 'Your student status has been verified. You now have access to exclusive student discounts and benefits.',
      action: null,
    },
    rejected: {
      icon: XCircle, iconBg: 'bg-red-100', iconColor: 'text-red-500',
      badge: 'bg-red-100 text-red-700', badgeLabel: 'Not Approved',
      title: 'Verification Unsuccessful',
      message: null,
      action: { label: 'Re-apply', path: '/student-verify' },
    },
  }

  if (!verification) return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-5 py-6">
        <button onClick={() => navigate('/profile')} className="flex items-center gap-1.5 text-text-muted mb-6 text-sm">
          <ChevronLeft size={18} /> Back
        </button>
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-bg-section flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={28} className="text-text-muted" />
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-2">No Verification Found</h2>
          <p className="text-text-muted text-sm mb-6">You haven't submitted a student verification yet.</p>
          <button onClick={() => navigate('/student-verify')}
            className="w-full py-3.5 bg-brand-500 text-white font-bold rounded-2xl text-sm hover:bg-brand-600 transition-colors">
            Apply Now
          </button>
        </div>
      </div>
    </MainLayout>
  )

  const s = STATUS[verification.status] || STATUS.pending
  const StatusIcon = s.icon

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-5 py-6">
        <button onClick={() => navigate('/profile')} className="flex items-center gap-1.5 text-text-muted mb-6 text-sm">
          <ChevronLeft size={18} /> Back
        </button>

        <h1 className="text-xl font-bold text-text-primary mb-6">Verification Status</h1>

        {/* Status Card */}
        <div className="bg-bg-card border border-border rounded-3xl p-6 text-center mb-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${s.iconBg}`}>
            <StatusIcon size={36} className={s.iconColor} />
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${s.badge}`}>{s.badgeLabel}</span>
          <h2 className="text-xl font-bold text-text-primary mt-3 mb-2">{s.title}</h2>
          {s.message && <p className="text-text-muted text-sm">{s.message}</p>}
          {verification.status === 'rejected' && verification.rejectionReason && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 text-left">
              <p className="text-xs font-bold text-red-600 mb-1">Reason:</p>
              <p className="text-sm text-red-700">{verification.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-3 mb-6">
          {[
            ['Institution', verification.institution],
            ['Student Email', verification.studentEmail],
            ['Submitted', new Date(verification.submittedAt || verification.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
            verification.reviewedAt ? ['Reviewed', new Date(verification.reviewedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })] : null,
          ].filter(Boolean).map(([label, val]) => (
            <div key={label} className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</span>
              <span className="text-sm text-text-primary font-medium">{val}</span>
            </div>
          ))}
        </div>

        {/* Approved benefits */}
        {verification.status === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6">
            <p className="text-sm font-bold text-green-700 mb-3">🎓 Benefits Unlocked</p>
            <ul className="space-y-2 text-sm text-green-700">
              <li>✓ 10% off all orders with Tastr+</li>
              <li>✓ Free delivery on student meal deals</li>
              <li>✓ Exclusive student restaurant offers</li>
              <li>✓ Student badge on your profile</li>
            </ul>
          </div>
        )}

        {s.action && (
          <button onClick={() => navigate(s.action.path)}
            className="w-full py-3.5 bg-brand-500 text-white font-bold rounded-2xl text-sm hover:bg-brand-600 transition-colors flex items-center justify-center gap-2">
            <RefreshCw size={16} /> {s.action.label}
          </button>
        )}
      </div>
    </MainLayout>
  )
}
