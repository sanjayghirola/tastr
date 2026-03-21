import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAddresses, deleteAddress, setDefaultAddress } from '../../store/slices/profileSlice.js'
import { AddressCard, Button, Spinner, EmptyState } from '../../components/global/index.jsx'

export default function AddressesPage() {
  const navigate   = useNavigate()
  const dispatch   = useDispatch()
  const { addresses, isLoading } = useSelector(s => s.profile)

  useEffect(() => { dispatch(fetchAddresses()) }, [])

  return (
    <div className="max-w-xl mx-auto pb-24 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 hover:bg-brand-100 transition-colors">‹</button>
          <h1 className="text-xl font-bold text-text-primary">My Addresses</h1>
        </div>
        <Button variant="primary" size="sm" onClick={() => navigate('/profile/addresses/add')}>+ Add New</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : addresses.length === 0 ? (
        <EmptyState
          icon="📍"
          title="No addresses saved"
          description="Add your home or work address for faster checkout"
          action={{ label: 'Add Address', onClick: () => navigate('/profile/addresses/add') }}
        />
      ) : (
        <div className="space-y-3">
          {addresses.map(addr => (
            <AddressCard
              key={addr._id}
              label={addr.label}
              address={[addr.line1, addr.line2, addr.city, addr.postcode].filter(Boolean).join(', ')}
              landmark={addr.landmark}
              selected={addr.isDefault}
              onSelect={() => dispatch(setDefaultAddress(addr._id))}
              onEdit={() => navigate(`/profile/addresses/edit/${addr._id}`)}
              onDelete={() => dispatch(deleteAddress(addr._id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
