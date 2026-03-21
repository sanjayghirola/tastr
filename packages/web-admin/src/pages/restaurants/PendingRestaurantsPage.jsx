import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchPendingRestaurants, updateRestaurantStatus } from '../../store/slices/adminSlice.js'
import { DataTable, Badge, Button, Pagination, Modal } from '../../components/global/index.jsx'
import { ENTITY_STATUS } from '@tastr/shared'

// ─── Restaurant Approval Modal ────────────────────────────────────────────────
function RestaurantApprovalModal({ restaurant, onClose, onAction }) {
  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)
  const [action,  setAction]  = useState(null) // 'approve' | 'reject'

  const handleSubmit = async () => {
    if (!action) return
    setLoading(true)
    await onAction(restaurant._id, action === 'approve' ? ENTITY_STATUS.ACTIVE : ENTITY_STATUS.REJECTED, reason)
    setLoading(false)
    onClose()
  }

  if (!restaurant) return null
  const owner = restaurant.ownerId || {}

  return (
    <Modal title="Restaurant Application" onClose={onClose} size="lg">
      <div className="space-y-5">
        {/* Info grid */}
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Restaurant Name"   value={restaurant.name} />
          <InfoField label="Owner Name"        value={owner.name} />
          <InfoField label="Email"             value={owner.email} />
          <InfoField label="Phone"             value={owner.phone} />
          <InfoField label="Cuisine"           value={restaurant.cuisines?.join(', ')} />
          <InfoField label="City"              value={restaurant.address?.city} />
          <InfoField label="Postcode"          value={restaurant.address?.postcode} />
          <InfoField label="Applied"           value={restaurant.createdAt ? new Date(restaurant.createdAt).toLocaleDateString() : '—'} />
        </div>

        {/* Description */}
        {restaurant.description && (
          <div>
            <p className="label-micro mb-1">Description</p>
            <p className="text-sm text-text-secondary bg-bg-section rounded-lg p-3">{restaurant.description}</p>
          </div>
        )}

        {/* Cover photos */}
        {restaurant.coverPhotos?.length > 0 && (
          <div>
            <p className="label-micro mb-2">Cover Photos</p>
            <div className="flex gap-2 overflow-x-auto">
              {restaurant.coverPhotos.map((p, i) => (
                <img key={i} src={p.url} alt="" className="h-24 w-36 object-cover rounded-xl flex-shrink-0 border border-border" />
              ))}
            </div>
          </div>
        )}

        {/* Bank details (masked) */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-bg-section rounded-xl border border-border">
          <InfoField label="Account (last 4)"  value={restaurant.bankAccountLast4 ? `**** ${restaurant.bankAccountLast4}` : '—'} />
          <InfoField label="Sort Code"         value={restaurant.bankSortCode || '—'} />
        </div>

        {/* Action */}
        <div>
          <div className="flex gap-3 mb-3">
            <button
              type="button"
              onClick={() => setAction('approve')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${action === 'approve' ? 'bg-green-500 border-green-500 text-white' : 'border-green-300 text-green-600 hover:bg-green-50'}`}
            >✓ Approve</button>
            <button
              type="button"
              onClick={() => setAction('reject')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${action === 'reject' ? 'bg-error-500 border-error-500 text-white' : 'border-error-300 text-error-600 hover:bg-error-50'}`}
            >✕ Reject</button>
          </div>

          {action === 'reject' && (
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason for rejection (required)"
              rows={3}
              className="w-full border border-border rounded-xl p-3 text-sm resize-none focus:border-brand-500 focus:outline-none"
            />
          )}
        </div>

        <Button
          variant="primary"
          size="full"
          loading={loading}
          disabled={!action || (action === 'reject' && !reason.trim())}
          onClick={handleSubmit}
        >
          {action === 'approve' ? 'Approve Restaurant' : action === 'reject' ? 'Reject Application' : 'Select an action'}
        </Button>
      </div>
    </Modal>
  )
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="label-micro mb-0.5">{label}</p>
      <p className="text-sm font-medium text-text-primary">{value || '—'}</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PendingRestaurantsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { pendingRestaurants, restaurantPagination, isLoading } = useSelector(s => s.admin)
  const [page,     setPage]     = useState(1)
  const [selected, setSelected] = useState(null)

  useEffect(() => { dispatch(fetchPendingRestaurants({ page })) }, [page])

  const handleAction = async (id, status, reason) => {
    await dispatch(updateRestaurantStatus({ id, status, reason }))
  }

  const columns = [
    { key: 'name',      header: 'Restaurant',    render: (_, r) => <span className="font-semibold text-text-primary">{r.name}</span> },
    { key: 'owner',     header: 'Owner',         render: (_, r) => r.ownerId?.name || '—' },
    { key: 'location',  header: 'Location',      render: (_, r) => r.address?.city || '—' },
    { key: 'email',     header: 'Email',         render: (_, r) => r.ownerId?.email || '—' },
    { key: 'cuisine',   header: 'Cuisine',       render: (_, r) => (r.cuisines || []).slice(0, 2).join(', ') || '—' },
    { key: 'status',    header: 'Status',        render: () => <Badge variant="warning">Pending</Badge> },
    { key: 'applied',   header: 'Applied',       render: (_, r) => new Date(r.createdAt).toLocaleDateString() },
    { key: 'actions',   header: '',              render: (_, r) => (
      <Button variant="secondary" size="xs" onClick={() => navigate(`/restaurants/${r._id}`)}>Review →</Button>
    )},
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">New Requests</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {restaurantPagination?.total ?? 0} pending application{restaurantPagination?.total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={pendingRestaurants}
        loading={isLoading}
        emptyTitle="No pending applications"
        emptyDescription="All restaurant applications have been reviewed"
      />

      {restaurantPagination && restaurantPagination.totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={page}
            totalPages={restaurantPagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {selected && (
        <RestaurantApprovalModal
          restaurant={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
    </div>
  )
}
