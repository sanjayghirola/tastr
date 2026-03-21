import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchPendingDrivers, updateDriverStatus } from '../../store/slices/adminSlice.js'
import { DataTable, Badge, Button, Pagination, Modal } from '../../components/global/index.jsx'
import { ENTITY_STATUS } from '@tastr/shared'

// ─── Document Viewer ──────────────────────────────────────────────────────────
function DocumentViewer({ docs }) {
  const [active, setActive] = useState(0)
  if (!docs.length) return <p className="text-sm text-text-muted">No documents uploaded</p>

  return (
    <div>
      {/* Tab selector */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {docs.map((doc, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
              ${active === i ? 'bg-brand-500 text-white' : 'bg-bg-section text-text-secondary hover:bg-brand-50'}`}
          >
            {doc.label}
          </button>
        ))}
      </div>

      {/* Document display */}
      <div className="rounded-xl overflow-hidden border border-border bg-bg-section" style={{ minHeight: 240 }}>
        {docs[active]?.url ? (
          docs[active].url.endsWith('.pdf') ? (
            <iframe src={docs[active].url} className="w-full h-64" title={docs[active].label} />
          ) : (
            <img
              src={docs[active].url}
              alt={docs[active].label}
              className="w-full max-h-64 object-contain"
            />
          )
        ) : (
          <div className="flex items-center justify-center h-40 text-text-muted text-sm">
            No document uploaded
          </div>
        )}
      </div>

      {docs[active]?.url && (
        <a href={docs[active].url} target="_blank" rel="noopener noreferrer"
          className="mt-2 text-xs text-brand-500 hover:underline block text-right">
          Open in new tab ↗
        </a>
      )}
    </div>
  )
}

// ─── Driver Approval Modal ────────────────────────────────────────────────────
function DriverApprovalModal({ driver, onClose, onAction }) {
  const [reason,  setReason]  = useState('')
  const [action,  setAction]  = useState(null)
  const [loading, setLoading] = useState(false)

  const user = driver.userId || {}
  const docs = [
    { label: "Driver's Licence", url: driver.licenceDocUrl },
    { label: 'Vehicle Insurance', url: driver.vehicleInsuranceDocUrl },
    { label: 'Food Insurance',    url: driver.foodInsuranceDocUrl },
    { label: 'Right to Work',     url: driver.rightToWorkDocUrl },
    { label: 'Address Proof',     url: driver.addressProofUrl },
  ].filter(d => d.url)

  const handleSubmit = async () => {
    setLoading(true)
    await onAction(driver._id, action, reason)
    setLoading(false)
    onClose()
  }

  const ACTION_BUTTONS = [
    { key: ENTITY_STATUS.ACTIVE,   label: '✓ Approve',         color: 'green'  },
    { key: 'REQUEST_DOCS',         label: '📋 Request More Docs', color: 'amber' },
    { key: ENTITY_STATUS.REJECTED, label: '✕ Reject',          color: 'red'    },
  ]

  const COLOR_MAP = {
    green: { active: 'bg-green-500 border-green-500 text-white', idle: 'border-green-300 text-green-600 hover:bg-green-50' },
    amber: { active: 'bg-amber-500 border-amber-500 text-white', idle: 'border-amber-300 text-amber-600 hover:bg-amber-50' },
    red:   { active: 'bg-error-500 border-error-500 text-white', idle: 'border-error-300 text-error-600 hover:bg-error-50' },
  }

  return (
    <Modal title="Driver Application" onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* Driver info */}
        <div className="flex items-center gap-4 p-4 bg-bg-section rounded-xl">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-xl font-bold text-brand-600 flex-shrink-0">
            {user.name?.[0] || 'D'}
          </div>
          <div>
            <p className="font-bold text-text-primary">{user.name || '—'}</p>
            <p className="text-sm text-text-muted">{user.email || '—'} · {user.phone || '—'}</p>
            <p className="text-xs text-text-muted mt-0.5">Vehicle: {driver.vehicleType} {driver.vehiclePlate ? `· ${driver.vehiclePlate}` : ''}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="label-micro">NI Number</p><p className="font-medium text-text-primary">{driver.nationalInsuranceNumber || '—'}</p></div>
          <div><p className="label-micro">Applied</p><p className="font-medium text-text-primary">{new Date(driver.createdAt).toLocaleDateString()}</p></div>
        </div>

        {/* Documents */}
        <div>
          <p className="label-micro mb-2">Documents</p>
          <DocumentViewer docs={docs} />
        </div>

        {/* Actions */}
        <div>
          <div className="flex gap-2 mb-3">
            {ACTION_BUTTONS.map(btn => (
              <button
                key={btn.key}
                type="button"
                onClick={() => setAction(btn.key)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${action === btn.key ? COLOR_MAP[btn.color].active : COLOR_MAP[btn.color].idle}`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {(action === ENTITY_STATUS.REJECTED || action === 'REQUEST_DOCS') && (
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={action === 'REQUEST_DOCS' ? 'Specify which documents are needed...' : 'Reason for rejection (required)'}
              rows={3}
              className="w-full border border-border rounded-xl p-3 text-sm resize-none focus:border-brand-500 focus:outline-none"
            />
          )}
        </div>

        <Button
          variant="primary"
          size="full"
          loading={loading}
          disabled={!action || ([ENTITY_STATUS.REJECTED, 'REQUEST_DOCS'].includes(action) && !reason.trim())}
          onClick={handleSubmit}
        >
          {action === ENTITY_STATUS.ACTIVE ? 'Approve Driver' : action === 'REQUEST_DOCS' ? 'Request Documents' : action === ENTITY_STATUS.REJECTED ? 'Reject Application' : 'Select an action'}
        </Button>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PendingDriversPage() {
  const dispatch = useDispatch()
  const { pendingDrivers, driverPagination, isLoading } = useSelector(s => s.admin)
  const [page,     setPage]     = useState(1)
  const [selected, setSelected] = useState(null)

  useEffect(() => { dispatch(fetchPendingDrivers({ page })) }, [page])

  const handleAction = async (id, status, reason) => {
    await dispatch(updateDriverStatus({ id, status, reason }))
  }

  const columns = [
    { key: 'name',      header: 'Driver',        render: d => <span className="font-semibold text-text-primary">{d.userId?.name || '—'}</span> },
    { key: 'email',     header: 'Email',         render: d => d.userId?.email || '—' },
    { key: 'vehicle',   header: 'Vehicle',       render: d => d.vehicleType || '—' },
    { key: 'ni',        header: 'NI Submitted',  render: d => d.nationalInsuranceNumber ? <Badge variant="success">Yes</Badge> : <Badge variant="error">No</Badge> },
    { key: 'docs',      header: 'Docs',          render: d => {
      const count = [d.licenceDocUrl, d.insuranceDocUrl, d.addressProofUrl].filter(Boolean).length
      return <Badge variant={count === 3 ? 'success' : 'warning'}>{count}/3 uploaded</Badge>
    }},
    { key: 'status',    header: 'Status',        render: () => <Badge variant="warning">Pending</Badge> },
    { key: 'applied',   header: 'Applied',       render: d => new Date(d.createdAt).toLocaleDateString() },
    { key: 'actions',   header: '',              render: d => <Button variant="secondary" size="xs" onClick={() => setSelected(d)}>Review</Button> },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Pending Driver Applications</h1>
        <p className="text-sm text-text-muted mt-0.5">{driverPagination?.total ?? 0} pending</p>
      </div>

      <DataTable
        columns={columns}
        data={pendingDrivers}
        loading={isLoading}
        emptyTitle="No pending driver applications"
        emptyDescription="All driver applications have been reviewed"
      />

      {driverPagination && driverPagination.totalPages > 1 && (
        <div className="mt-4">
          <Pagination currentPage={page} totalPages={driverPagination.totalPages} onPageChange={setPage} />
        </div>
      )}

      {selected && (
        <DriverApprovalModal
          driver={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
    </div>
  )
}
