import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { addAddress, updateAddress } from '../../store/slices/profileSlice.js'
import { Input, Button, Select } from '../../components/global/index.jsx'

const schema = z.object({
  label:    z.enum(['Home', 'Work', 'Other']),
  line1:    z.string().min(3, 'Address line 1 required'),
  line2:    z.string().optional(),
  city:     z.string().min(2, 'City required'),
  postcode: z.string().min(5, 'Postcode required'),
  landmark: z.string().optional(),
})

const LABEL_ICONS = { Home: '🏠', Work: '🏢', Other: '📍' }

export default function AddAddressPage() {
  const navigate    = useNavigate()
  const dispatch    = useDispatch()
  const { id }      = useParams()                    // present for edit mode
  const isEdit      = !!id
  const { addresses, isLoading, error } = useSelector(s => s.profile)
  const existing    = isEdit ? addresses.find(a => a._id === id) : null

  const [mapLat, setMapLat] = useState(51.505)       // default London
  const [mapLng, setMapLng] = useState(-0.09)
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef    = useRef()
  const markerRef = useRef()
  const googleMap = useRef()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: existing ? {
      label:    existing.label || 'Home',
      line1:    existing.line1,
      line2:    existing.line2 || '',
      city:     existing.city,
      postcode: existing.postcode,
      landmark: existing.landmark || '',
    } : { label: 'Home' },
  })

  // Load Google Maps script dynamically
  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
    if (!key || window.google?.maps) { setMapLoaded(true); return }
    const script    = document.createElement('script')
    script.src      = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    script.async    = true
    script.onload   = () => setMapLoaded(true)
    document.head.appendChild(script)
  }, [])

  // Initialise map once loaded
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.google?.maps) return
    const initLat = existing?.lat || mapLat
    const initLng = existing?.lng || mapLng

    googleMap.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: initLat, lng: initLng },
      zoom:   15,
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    markerRef.current = new window.google.maps.Marker({
      position:  { lat: initLat, lng: initLng },
      map:       googleMap.current,
      draggable: true,
      title:     'Drag to adjust location',
    })

    markerRef.current.addListener('dragend', e => {
      setMapLat(e.latLng.lat())
      setMapLng(e.latLng.lng())
    })
  }, [mapLoaded])

  // When user types postcode, re-centre map
  const postcode = watch('postcode')
  const geocodePostcode = async () => {
    if (!postcode || !window.google?.maps) return
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: postcode }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location
        googleMap.current?.setCenter(loc)
        markerRef.current?.setPosition(loc)
        setMapLat(loc.lat())
        setMapLng(loc.lng())
      }
    })
  }

  const onSubmit = async (data) => {
    const payload = { ...data, lat: mapLat, lng: mapLng }
    const result  = isEdit
      ? await dispatch(updateAddress({ id, data: payload }))
      : await dispatch(addAddress(payload))

    if ((isEdit ? updateAddress : addAddress).fulfilled.match(result)) {
      navigate('/profile/addresses')
    }
  }

  const selectedLabel = watch('label') || 'Home'

  return (
    <div className="max-w-xl mx-auto pb-24 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 hover:bg-brand-100 transition-colors">‹</button>
        <h1 className="text-xl font-bold text-text-primary">{isEdit ? 'Edit Address' : 'Add New Address'}</h1>
      </div>

      {/* Label selector */}
      <div className="flex gap-2 mb-5">
        {Object.entries(LABEL_ICONS).map(([lbl, icon]) => (
          <button
            key={lbl}
            type="button"
            onClick={() => setValue('label', lbl)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all
              ${selectedLabel === lbl ? 'bg-brand-500 border-brand-500 text-white' : 'bg-bg-card border-border text-text-secondary hover:border-brand-400'}`}
          >
            <span>{icon}</span> {lbl}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="mb-5 rounded-2xl overflow-hidden border border-border shadow-card" style={{ height: 220 }}>
        {mapLoaded && window.google?.maps ? (
          <div ref={mapRef} className="w-full h-full" />
        ) : (
          <div className="w-full h-full bg-brand-50 flex items-center justify-center text-text-muted text-sm">
            {mapLoaded ? '📍 Map unavailable (no API key)' : 'Loading map…'}
          </div>
        )}
      </div>
      <p className="text-xs text-text-muted text-center mb-5">Drag the pin to adjust the exact location</p>

      {error && (
        <div className="mb-4 p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700">{error.message}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Address Line 1" name="line1" placeholder="123 High Street" required error={errors.line1?.message} {...register('line1')} />
        <Input label="Address Line 2 (optional)" name="line2" placeholder="Flat 4B" {...register('line2')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="City" name="city" placeholder="London" required error={errors.city?.message} {...register('city')} />
          <Input
            label="Postcode"
            name="postcode"
            placeholder="SW1A 1AA"
            required
            error={errors.postcode?.message}
            {...register('postcode')}
            onBlur={geocodePostcode}
          />
        </div>
        <Input label="Landmark (optional)" name="landmark" placeholder="Near the red phone box" {...register('landmark')} />

        <Button type="submit" variant="primary" size="full" loading={isLoading}>
          {isEdit ? 'Save Changes' : 'Save Address'}
        </Button>
      </form>
    </div>
  )
}
