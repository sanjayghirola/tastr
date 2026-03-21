import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { apiUpdateExtras } from '../../store/slices/cartSlice.js'
import MainLayout from '../../layouts/MainLayout.jsx'

export default function GiftOrderPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const dispatch  = useDispatch()
  const { addressId } = location.state || {}

  const [form, setForm] = useState({ name: '', phone: '', line1: '', city: '', postcode: '', message: '' })
  const [errors, setErrors] = useState({})

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

  const validate = () => {
    const errs = {}
    if (!form.name.trim())     errs.name     = 'Required'
    if (!form.phone.trim())    errs.phone    = 'Required'
    if (!form.line1.trim())    errs.line1    = 'Required'
    if (!form.city.trim())     errs.city     = 'Required'
    if (!form.postcode.trim()) errs.postcode = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleConfirm = async () => {
    if (!validate()) return
    await dispatch(apiUpdateExtras({
      isGift: true,
      giftRecipient: {
        name: form.name, phone: form.phone, message: form.message,
        address: { line1: form.line1, city: form.city, postcode: form.postcode },
      },
    }))
    navigate('/checkout/payment', { state: { addressId, deliveryMethod: 'gift' } })
  }

  const Field = ({ label, k, placeholder, required, type = 'text' }) => (
    <div>
      <label className="text-xs font-semibold text-text-secondary block mb-1">{label}{required && <span className="text-error-500 ml-0.5">*</span>}</label>
      <input type={type} value={form[k]} onChange={e => update(k, e.target.value)} placeholder={placeholder}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors
          ${errors[k] ? 'border-error-400 focus:border-error-500' : 'border-border focus:border-brand-500'}`} />
      {errors[k] && <p className="text-xs text-error-500 mt-0.5">{errors[k]}</p>}
    </div>
  )

  return (
    <MainLayout>
      <div className="px-4 pt-10 pb-32">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-bg-section flex items-center justify-center">‹</button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Gift Details</h1>
            <p className="text-xs text-text-muted">Who are we delivering to?</p>
          </div>
        </div>

        <div className="space-y-4">
          <Field label="Recipient Name"    k="name"     placeholder="Full name"        required />
          <Field label="Recipient Phone"   k="phone"    placeholder="+44 7700 900000"  required type="tel" />

          <p className="text-sm font-bold text-text-primary pt-2">Delivery Address</p>
          <Field label="Address Line 1"    k="line1"    placeholder="123 High Street"  required />
          <Field label="City / Town"       k="city"     placeholder="London"           required />
          <Field label="Postcode"          k="postcode" placeholder="SW1A 1AA"          required />

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">Personal message (optional)</label>
            <textarea value={form.message} onChange={e => update('message', e.target.value)}
              placeholder="Write a personal message for the recipient…" rows={3}
              maxLength={200}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm resize-none focus:border-brand-500 focus:outline-none" />
            <p className="text-xs text-text-muted text-right mt-0.5">{form.message.length}/200</p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30">
        <button onClick={handleConfirm} className="w-full py-4 rounded-2xl bg-brand-500 text-white font-bold text-base shadow-brand hover:bg-brand-600 transition-colors">
          Continue to Payment →
        </button>
      </div>
    </MainLayout>
  )
}
