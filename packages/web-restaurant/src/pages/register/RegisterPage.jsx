import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, Plus, Edit2, Star, ChevronDown } from 'lucide-react'
import { Input, PasswordInput, Button, Toggle, Select } from '../../components/global/index.jsx'
import api from '../../services/api.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const CUISINES = ['Italian','Chinese','Indian','Japanese','Mexican','Thai','British','American','Mediterranean','French','Greek','Turkish','Korean','Vietnamese','Middle Eastern','Caribbean','African','Spanish']
const DAYS_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const DAY_KEYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const ROLES     = ['Owner','Manager','Chef','Front of House','Driver']
const ADDR_DOCS = ['Utility Bill','Bank Statement','Council Tax','Tenancy Agreement','Mortgage Statement']

// ─── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Restaurant info' },
  { label: 'Owner info' },
  { label: 'Team' },
  { label: 'Complete' },
]

// ─── Step progress bar (matching Tastr design language) ──────────────────────
function StepBar({ current }) {
  return (
    <div className="flex items-start gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done   = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${done   ? 'bg-brand-500 text-white'
                : active ? 'bg-brand-500 text-white ring-4 ring-brand-500/20'
                :          'bg-brand-100 text-brand-400 border-2 border-brand-200'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-semibold text-center leading-tight whitespace-nowrap
                ${active || done ? 'text-brand-500' : 'text-text-muted'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${i < current ? 'bg-brand-500' : 'bg-brand-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Section heading (inside card) ───────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <div className="mb-5 pt-2">
      <h3 className="text-base font-bold text-brand-500">{children}</h3>
      <div className="h-px bg-border mt-2" />
    </div>
  )
}

// ─── File upload box ──────────────────────────────────────────────────────────
function FileUpload({ label = 'Upload document', hint = 'PNG, JPG up to 5MB', file, onChange, onClear, accept = 'image/*,.pdf' }) {
  const ref = useRef()
  return (
    <div className={`border-2 border-dashed rounded-2xl overflow-hidden transition-colors ${file ? 'border-brand-300 bg-brand-50' : 'border-border bg-bg-section hover:border-brand-300'}`}>
      {file ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
            <Upload size={14} className="text-brand-500" />
          </div>
          <span className="text-sm text-text-primary font-medium flex-1 truncate">{file.name}</span>
          <button type="button" onClick={onClear}
            className="w-6 h-6 rounded-full bg-error-100 text-error-600 flex items-center justify-center hover:bg-error-200 transition-colors flex-shrink-0">
            <X size={12} />
          </button>
        </div>
      ) : (
        <div onClick={() => ref.current?.click()} className="flex flex-col items-center py-5 cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center mb-2">
            <Upload size={18} className="text-brand-500" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-semibold text-text-primary">{label}</p>
          <p className="text-xs text-text-muted mt-0.5">{hint}</p>
          <button type="button" className="mt-3 px-5 py-1.5 bg-brand-500 text-white text-xs font-bold rounded-full hover:bg-brand-600 transition-colors">
            Upload
          </button>
        </div>
      )}
      <input ref={ref} type="file" accept={accept} className="sr-only"
        onChange={e => e.target.files?.[0] && onChange(e.target.files[0])} />
    </div>
  )
}

// ─── Star rating ──────────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1 mt-1">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button" onClick={() => onChange(i)}>
          <Star size={26} className={`transition-colors ${i <= value ? 'fill-brand-500 text-brand-500' : 'text-border'}`} />
        </button>
      ))}
    </div>
  )
}

// ─── STEP 1 — Restaurant Info ─────────────────────────────────────────────────
function Step1({ data, onNext }) {
  const [form, setForm] = useState({
    name:              data.name              || '',
    legalBusinessName: data.legalBusinessName || '',
    cuisineType:       data.cuisineType       || '',
    hygieneRating:     data.hygieneRating     || 0,
    companyRegNumber:  data.companyRegNumber  || '',
    vatNumber:         data.vatNumber         || '',
    businessPhone:     data.businessPhone     || '',
    businessEmail:     data.businessEmail     || '',
    fhrsNumber:        data.fhrsNumber        || '',
    password:          data.password          || '',
    postcode:          data.postcode          || '',
    streetAddress:     data.streetAddress     || '',
    city:              data.city              || '',
    googleMapsPin:     data.googleMapsPin     || '',
    addressDocType:    data.addressDocType    || '',
    accountHolderName: data.accountHolderName || '',
    bankName:          data.bankName          || '',
    sortCode:          data.sortCode          || '',
    accountNumber:     data.accountNumber     || '',
    deliveryMode:      data.deliveryMode      || 'tastr',
    offersStudentDiscount: data.offersStudentDiscount || false,
    studentDiscountPercent: data.studentDiscountPercent || 10,
    openingHours:      data.openingHours      || DAY_KEYS.map((d,i) => ({ day:d, label:DAYS_FULL[i], isOpen:true, open:'10:00', close:'22:00' })),
  })
  const [files, setFiles] = useState(data.files || {})
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setFile = (k, v) => setFiles(f => ({ ...f, [k]: v }))
  const setHour = (i, field, val) => set('openingHours', form.openingHours.map((h, idx) => idx === i ? {...h, [field]:val} : h))

  const handleNext = () => {
    if (!form.name.trim())            return setError('Restaurant name is required')
    if (!form.businessPhone.trim())   return setError('Business phone is required')
    if (!form.businessEmail.trim())   return setError('Business email is required')
    if (!form.postcode.trim())        return setError('Postcode is required')
    if (!form.streetAddress.trim())   return setError('Street address is required')
    if (!form.accountHolderName.trim()) return setError('Account holder name is required')
    if (!form.sortCode.trim())        return setError('Sort code is required')
    if (!form.accountNumber.trim())   return setError('Account number is required')
    if (!form.password || form.password.length < 8) return setError('Password must be at least 8 characters')
    setError('')
    onNext({ ...form, files })
  }

  const OPTIONAL_DOCS = [
    { key:'publicLiabilityIns', label:'Public Liability / Employer\'s Liability Insurance' },
    { key:'companyRegCert',     label:'Company Registration Certificate' },
    { key:'vatRegCert',         label:'VAT Registration Certificate' },
    { key:'fireSafetyCert',     label:'Fire Safety Certificate' },
    { key:'allergyForm',        label:'Allergy Information Form' },
    { key:'foodHandlerCert',    label:'Food Handler Training Certificate (Level 1)' },
  ]

  return (
    <div className="space-y-6">
      {/* ── Basic Information ── */}
      <SectionHeading>Basic Information</SectionHeading>
      <Input label="Restaurant name" placeholder="Enter restaurant name" value={form.name} onChange={e => set('name', e.target.value)} required />
      <Input label="Legal Business Name" placeholder="Enter legal business name" value={form.legalBusinessName} onChange={e => set('legalBusinessName', e.target.value)} />
      <Select label="Cuisine type" placeholder="Select type" value={form.cuisineType}
        onChange={e => set('cuisineType', e.target.value)}
        options={CUISINES.map(c => ({ value:c, label:c }))} />
      <div>
        <label className="text-sm font-semibold text-text-primary block mb-1">Food Hygiene Rating</label>
        <StarRating value={form.hygieneRating} onChange={v => set('hygieneRating', v)} />
      </div>
      <div>
        <label className="text-sm font-semibold text-text-primary block mb-1.5">Registered Food Business License <span className="text-xs text-text-muted font-normal">(issued by Local Council)</span></label>
        <FileUpload file={files.foodBusinessLicense} onChange={f => setFile('foodBusinessLicense', f)} onClear={() => setFile('foodBusinessLicense', null)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Company Registration Number (if Ltd)" placeholder="Enter company reg number" value={form.companyRegNumber} onChange={e => set('companyRegNumber', e.target.value)} />
        <Input label="VAT number (optional)" placeholder="Enter VAT number" value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} />
        <Input label="Business phone number" placeholder="Enter phone number" type="tel" value={form.businessPhone} onChange={e => set('businessPhone', e.target.value)} required />
        <Input label="Business email address" placeholder="Enter email address" type="email" value={form.businessEmail} onChange={e => set('businessEmail', e.target.value)} required />
      </div>
      <Input label="FHRS Number" placeholder="Enter FHRS number" value={form.fhrsNumber} onChange={e => set('fhrsNumber', e.target.value)}
        hint="Food Hygiene Rating Scheme (FHRS) issued by Food Standards Agency (FSA)" />
      <div>
        <label className="text-sm font-semibold text-text-primary block mb-1.5">Food Hygiene Rating Certificate (FHRS)</label>
        <FileUpload file={files.fhrsDoc} onChange={f => setFile('fhrsDoc', f)} onClear={() => setFile('fhrsDoc', null)} />
      </div>
      <PasswordInput label="Create Password" placeholder="Min. 8 characters" value={form.password} onChange={e => set('password', e.target.value)} required />

      {/* ── Restaurant Address ── */}
      <SectionHeading>Restaurant Address</SectionHeading>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Full postcode" placeholder="Enter postcode" value={form.postcode} onChange={e => set('postcode', e.target.value)} required />
        <Input label="Street address" placeholder="Enter street address" value={form.streetAddress} onChange={e => set('streetAddress', e.target.value)} required />
        <Input label="City" placeholder="Enter city" value={form.city} onChange={e => set('city', e.target.value)} />
        <Input label="Google Maps pin (lat/lng)" placeholder="e.g. 51.5074, -0.1278" value={form.googleMapsPin} onChange={e => set('googleMapsPin', e.target.value)} />
      </div>
      <Select label="Proof of restaurant" placeholder="Select document" value={form.addressDocType}
        onChange={e => set('addressDocType', e.target.value)}
        options={ADDR_DOCS.map(d => ({ value:d, label:d }))} />
      <div>
        <label className="text-sm font-semibold text-text-primary block mb-1.5">Upload document for address proof</label>
        <FileUpload file={files.addressProof} onChange={f => setFile('addressProof', f)} onClear={() => setFile('addressProof', null)} />
      </div>

      {/* ── Banking Details ── */}
      <SectionHeading>Banking Details</SectionHeading>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Account holder name" placeholder="Name as on account" value={form.accountHolderName} onChange={e => set('accountHolderName', e.target.value)} required />
        <Input label="Bank name" placeholder="Enter bank name" value={form.bankName} onChange={e => set('bankName', e.target.value)} />
        <Input label="Sort code" placeholder="00-00-00" value={form.sortCode} onChange={e => set('sortCode', e.target.value)} required />
        <Input label="Account number" placeholder="12345678" value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} required />
      </div>
      <div>
        <label className="text-sm font-semibold text-text-primary block mb-1.5">Upload proof <span className="text-xs text-text-muted font-normal">(bank statement / void cheque)</span></label>
        <FileUpload file={files.bankProof} onChange={f => setFile('bankProof', f)} onClear={() => setFile('bankProof', null)} />
      </div>

      {/* ── Restaurant Settings ── */}
      <SectionHeading>Restaurant Settings</SectionHeading>

      {/* Student Discount */}
      <div className="bg-bg-section border border-border rounded-2xl p-5">
        <label className="flex items-start gap-4 cursor-pointer">
          <input type="checkbox" checked={form.offersStudentDiscount || false}
            onChange={e => set('offersStudentDiscount', e.target.checked)}
            className="mt-1 w-5 h-5 accent-brand-500 rounded" />
          <div>
            <p className="font-bold text-sm text-text-primary">Offer Student Discount</p>
            <p className="text-xs text-text-muted mt-0.5">Verified students will receive a discount when ordering from your restaurant. This helps attract the student demographic.</p>
          </div>
        </label>
        {form.offersStudentDiscount && (
          <div className="mt-4 ml-9">
            <label className="text-sm font-semibold text-text-primary block mb-1">Discount Percentage</label>
            <div className="flex items-center gap-3">
              <input type="range" min="5" max="30" step="5"
                value={form.studentDiscountPercent || 10}
                onChange={e => set('studentDiscountPercent', Number(e.target.value))}
                className="flex-1 accent-brand-500" />
              <span className="text-lg font-extrabold text-brand-500 w-14 text-center">{form.studentDiscountPercent || 10}%</span>
            </div>
            <p className="text-xs text-text-muted mt-1">Verified students will get {form.studentDiscountPercent || 10}% off their order from your restaurant</p>
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-semibold text-text-primary block mb-2">Delivery mode</label>
        <div className="grid grid-cols-2 gap-3">
          {[{val:'tastr',label:'Tastr drivers',sub:'We provide delivery drivers for you'},{val:'own',label:'Own drivers',sub:'You manage your own delivery team'}].map(opt => (
            <label key={opt.val} className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${form.deliveryMode===opt.val ? 'border-brand-500 bg-brand-50' : 'border-border bg-bg-section hover:border-brand-300'}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.deliveryMode===opt.val ? 'border-brand-500' : 'border-border'}`}>
                {form.deliveryMode===opt.val && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
              </div>
              <input type="radio" className="sr-only" value={opt.val} checked={form.deliveryMode===opt.val} onChange={() => set('deliveryMode', opt.val)} />
              <div>
                <p className="font-bold text-sm text-text-primary">{opt.label}</p>
                <p className="text-xs text-text-muted">{opt.sub}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-text-primary block mb-3">Restaurant timings</label>
        <div className="space-y-2.5">
          {form.openingHours.map((h, i) => (
            <div key={h.day} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${h.isOpen ? 'border-brand-200 bg-brand-50/40' : 'border-border bg-bg-section'}`}>
              <span className="w-24 text-sm font-semibold text-text-primary flex-shrink-0">{DAYS_FULL[i]}</span>
              <Toggle checked={h.isOpen} onChange={v => setHour(i, 'isOpen', v)} size="sm" />
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg w-14 text-center flex-shrink-0 ${h.isOpen ? 'bg-brand-100 text-brand-700' : 'bg-bg-section text-text-muted border border-border'}`}>
                {h.isOpen ? 'Open' : 'Closed'}
              </span>
              {h.isOpen && <>
                <input type="time" value={h.open} onChange={e => setHour(i, 'open', e.target.value)}
                  className="border border-border rounded-xl px-3 py-2 text-sm bg-bg-card focus:border-brand-500 focus:outline-none" />
                <span className="text-sm text-text-muted">to</span>
                <input type="time" value={h.close} onChange={e => setHour(i, 'close', e.target.value)}
                  className="border border-border rounded-xl px-3 py-2 text-sm bg-bg-card focus:border-brand-500 focus:outline-none" />
              </>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-text-primary block mb-1.5">Restaurant logo</label>
        <FileUpload label="Upload logo" file={files.logo} onChange={f => setFile('logo', f)} onClear={() => setFile('logo', null)} accept="image/*" />
      </div>

      {/* ── Optional Documents ── */}
      <SectionHeading>Additional Documents <span className="text-xs text-text-muted font-normal normal-case">(optional)</span></SectionHeading>
      <div className="grid grid-cols-2 gap-4">
        {OPTIONAL_DOCS.map(doc => (
          <div key={doc.key}>
            <label className="text-sm font-semibold text-text-primary block mb-1.5">{doc.label}</label>
            <FileUpload file={files[doc.key]} onChange={f => setFile(doc.key, f)} onClear={() => setFile(doc.key, null)} />
          </div>
        ))}
      </div>

      {error && <div className="p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700">{error}</div>}

      <Button type="button" variant="primary" size="full" onClick={handleNext}>Continue →</Button>
    </div>
  )
}

// ─── STEP 2 — Owner Info ──────────────────────────────────────────────────────
function Step2({ data, onNext, onBack }) {
  const [ownerName,  setOwnerName]  = useState(data.ownerName  || '')
  const [dob,        setDob]        = useState(data.dob        || '')
  const [ownerPhone, setOwnerPhone] = useState(data.ownerPhone || '')
  const [ownerEmail, setOwnerEmail] = useState(data.ownerEmail || '')
  const [docType,    setDocType]    = useState(data.ownerAddressDocType || '')
  const [docFile,    setDocFile]    = useState(data.ownerAddressDoc || null)
  const [idFile,     setIdFile]     = useState(data.ownerIdProof || null)
  const [error, setError] = useState('')

  const handleNext = () => {
    if (!ownerName.trim())  return setError('Owner name is required')
    if (!ownerPhone.trim()) return setError('Owner phone is required')
    setError('')
    onNext({ ownerName, dob, ownerPhone, ownerEmail, ownerAddressDocType: docType, ownerAddressDoc: docFile, ownerIdProof: idFile })
  }

  return (
    <div className="space-y-5">
      <SectionHeading>Contact Details</SectionHeading>
      <Input label="Owner name" placeholder="Enter owner name" value={ownerName} onChange={e => setOwnerName(e.target.value)} required />
      <div>
        <label className="text-sm font-semibold text-text-primary block mb-1.5">DOB</label>
        <input type="date" value={dob} onChange={e => setDob(e.target.value)} placeholder="Choose DOB"
          className="w-full border border-border rounded-2xl px-4 py-2.5 text-sm bg-bg-section focus:border-brand-500 focus:outline-none text-text-primary" />
      </div>
      <Input label="Owner phone number" placeholder="Enter owner phone number" type="tel" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} required />
      <Input label="Owner email address" placeholder="Enter owner email address" type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} />

      <SectionHeading>Owner ID Proof</SectionHeading>
      <div>
        <label className="text-sm font-semibold text-text-primary block mb-1.5">
          Owner ID Document <span className="text-xs text-text-muted font-normal">(Passport, driving licence, or national ID)</span>
        </label>
        <FileUpload file={idFile} onChange={setIdFile} onClear={() => setIdFile(null)} label="Upload ID document" hint="PNG, JPG, PDF up to 5MB" accept="image/*,.pdf" />
      </div>

      <SectionHeading>Address Proof</SectionHeading>
      <Select label="Address proof" placeholder="Select document" value={docType}
        onChange={e => setDocType(e.target.value)} options={ADDR_DOCS.map(d => ({ value:d, label:d }))} />
      <div>
        <label className="text-sm font-semibold text-text-primary block mb-1.5">Upload document</label>
        <FileUpload file={docFile} onChange={setDocFile} onClear={() => setDocFile(null)} />
      </div>

      {error && <div className="p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700">{error}</div>}

      <div className="flex gap-3 pt-1">
        <Button variant="secondary" size="full" onClick={onBack}>← Previous</Button>
        <Button variant="primary"   size="full" onClick={handleNext}>Continue →</Button>
      </div>
    </div>
  )
}

// ─── Team Member Modal ────────────────────────────────────────────────────────
function MemberModal({ onClose, onAdd, existing }) {
  const [name,    setName]    = useState(existing?.name  || '')
  const [email,   setEmail]   = useState(existing?.email || '')
  const [role,    setRole]    = useState(existing?.role  || '')
  const [photo,   setPhoto]   = useState(existing?.photo   || null)
  const [preview, setPreview] = useState(existing?.preview || null)
  const [error,   setError]   = useState('')
  const fileRef = useRef()

  const handleAdd = () => {
    if (!name.trim())  return setError('Name is required')
    if (!email.trim()) return setError('Email is required')
    if (!role)         return setError('Please select a role')
    onAdd({ name, email, role, photo, preview })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-bg-card rounded-3xl shadow-modal w-full max-w-sm border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-bold text-text-primary">Team member details</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:bg-bg-section transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <Input label="Name" placeholder="Enter name" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Email-Id" placeholder="Enter id" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <Select label="Role" placeholder="Select role type" value={role} onChange={e => setRole(e.target.value)}
            options={ROLES.map(r => ({ value:r, label:r }))} />
          <div>
            <label className="text-sm font-semibold text-text-primary block mb-1.5">Profile Photo</label>
            <div className={`border-2 border-dashed rounded-2xl overflow-hidden transition-colors ${preview ? 'border-brand-300 bg-brand-50' : 'border-border bg-bg-section'}`}>
              {preview ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <img src={preview} alt="" className="w-10 h-10 rounded-full object-cover border border-border flex-shrink-0" />
                  <span className="text-sm text-text-primary flex-1 truncate">{photo?.name}</span>
                  <button onClick={() => { setPhoto(null); setPreview(null) }} className="w-6 h-6 rounded-full bg-error-100 text-error-600 flex items-center justify-center hover:bg-error-200"><X size={11} /></button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-5 cursor-pointer" onClick={() => fileRef.current?.click()}>
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center mb-2">
                    <Upload size={18} className="text-brand-500" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-semibold text-text-primary">Upload Profile photo</p>
                  <p className="text-xs text-text-muted mt-0.5">PNG, JPG up to 5MB</p>
                  <button type="button" className="mt-3 px-5 py-1.5 bg-brand-500 text-white text-xs font-bold rounded-full hover:bg-brand-600 transition-colors">Upload</button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; if (f) { setPhoto(f); setPreview(URL.createObjectURL(f)) } }} />
            </div>
          </div>
          {error && <p className="text-sm text-error-600">{error}</p>}
          <Button variant="primary" size="full" onClick={handleAdd}>Add</Button>
        </div>
      </div>
    </div>
  )
}

// ─── STEP 3 — Team ────────────────────────────────────────────────────────────
function Step3({ data, onNext, onBack }) {
  const [myRole,   setMyRole]   = useState(data.myRole    || 'owner')
  const [members,  setMembers]  = useState(data.teamMembers || [])
  const [showModal, setShowModal] = useState(false)
  const [editIdx,   setEditIdx]   = useState(null)

  const handleAdd = (member) => {
    if (editIdx !== null) {
      setMembers(m => m.map((x, i) => i === editIdx ? member : x))
      setEditIdx(null)
    } else {
      setMembers(m => [...m, member])
    }
    setShowModal(false)
  }

  return (
    <div className="space-y-5">
      {showModal && (
        <MemberModal
          existing={editIdx !== null ? members[editIdx] : null}
          onClose={() => { setShowModal(false); setEditIdx(null) }}
          onAdd={handleAdd}
        />
      )}

      <SectionHeading>Team Settings</SectionHeading>

      <div>
        <label className="text-sm font-semibold text-text-primary block mb-3">Select your role</label>
        <div className="grid grid-cols-2 gap-3">
          {[{val:'owner',label:'Owner',sub:'Access to more features'},{val:'manager',label:'Manager',sub:'Manage orders & staff'}].map(opt => (
            <button key={opt.val} type="button" onClick={() => setMyRole(opt.val)}
              className={`p-5 rounded-2xl border-2 text-center transition-all ${myRole===opt.val ? 'bg-brand-500 border-brand-500 text-white' : 'border-border bg-bg-section text-text-primary hover:border-brand-300'}`}>
              <p className="font-extrabold text-lg">{opt.label}</p>
              <p className={`text-sm mt-0.5 ${myRole===opt.val ? 'text-white/80' : 'text-text-muted'}`}>{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-text-primary block mb-0.5">Add team members</label>
        <p className="text-xs text-text-muted mb-3">Invite staff members to help manage your restaurant</p>

        <div className="space-y-2 mb-3">
          {members.map((m, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-bg-section border border-border rounded-2xl">
              {m.preview
                ? <img src={m.preview} alt="" className="w-10 h-10 rounded-full object-cover border border-border flex-shrink-0" />
                : <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-600 flex-shrink-0">{m.name[0]?.toUpperCase()}</div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{m.name}</p>
                <p className="text-xs text-text-muted truncate">{m.email}</p>
              </div>
              <span className="text-xs font-semibold text-brand-500 flex-shrink-0">{m.role}</span>
              <button onClick={() => { setEditIdx(i); setShowModal(true) }} className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-brand-500 hover:bg-brand-50 transition-colors">
                <Edit2 size={13} />
              </button>
              <button onClick={() => setMembers(members.filter((_, idx) => idx !== i))} className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-error-500 hover:bg-error-50 transition-colors">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => { setEditIdx(null); setShowModal(true) }}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-2xl text-sm font-semibold text-text-muted hover:border-brand-400 hover:text-brand-500 hover:bg-brand-50/20 transition-all">
          <Plus size={16} /> Add team members
        </button>
      </div>

      <div className="flex gap-3 pt-1">
        <Button variant="secondary" size="full" onClick={onBack}>← Previous</Button>
        <Button variant="primary" size="full" onClick={() => onNext({ myRole, teamMembers: members })}>Continue →</Button>
      </div>
    </div>
  )
}

// ─── STEP 4 — Review & Submit ─────────────────────────────────────────────────
function Step4({ data, onBack, onSubmit, loading, error }) {
  const [agreement, setAgreement] = useState(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreementLoading, setAgreementLoading] = useState(true)
  const [showAgreement, setShowAgreement] = useState(false)

  useEffect(() => {
    api.get('/agreements/restaurant')
      .then(r => setAgreement(r.data.agreement))
      .catch(() => {})
      .finally(() => setAgreementLoading(false))
  }, [])

  const handleSubmitWithAgreement = async () => {
    if (agreement && !agreedToTerms) return
    // Record acceptance
    if (agreement) {
      try { await api.post('/agreements/restaurant/accept') } catch {}
    }
    onSubmit()
  }

  const Row = ({ label, value }) => value ? (
    <div className="flex justify-between py-2 border-b border-border last:border-b-0 gap-4">
      <span className="text-sm text-text-muted flex-shrink-0">{label}</span>
      <span className="text-sm font-semibold text-text-primary text-right capitalize break-words">{value}</span>
    </div>
  ) : null

  return (
    <div className="space-y-5">
      <SectionHeading>Review Your Application</SectionHeading>
      <p className="text-sm text-text-muted -mt-3">Please review all details before submitting. Our team will verify your documents within 1–3 business days.</p>

      {[
        { title: 'Restaurant', rows: [['Name', data.name],['Legal name', data.legalBusinessName],['Cuisine', data.cuisineType],['Phone', data.businessPhone],['Email', data.businessEmail],['Company Reg', data.companyRegNumber],['VAT', data.vatNumber],['FHRS', data.fhrsNumber]] },
        { title: 'Address',    rows: [['Street', data.streetAddress],['City', data.city],['Postcode', data.postcode]] },
        { title: 'Banking',    rows: [['Account Holder', data.accountHolderName],['Bank', data.bankName],['Sort Code', data.sortCode],['Account', data.accountNumber ? `****${data.accountNumber.slice(-4)}` : null]] },
        { title: 'Owner',      rows: [['Name', data.ownerName],['Phone', data.ownerPhone],['Email', data.ownerEmail],['DOB', data.dob]] },
        { title: 'Team',       rows: [['My Role', data.myRole || 'owner'],['Team Members', data.teamMembers?.length ? `${data.teamMembers.length} member(s)` : 'None added']] },
        { title: 'Settings',   rows: [['Delivery Mode', data.deliveryMode || 'tastr'],['Student Discount', data.offersStudentDiscount ? `Yes (${data.studentDiscountPercent || 10}% off)` : 'No']] },
      ].map(section => (
        <div key={section.title} className="bg-bg-section border border-border rounded-2xl px-5 py-1">
          <p className="text-xs font-bold text-brand-500 uppercase tracking-widest py-3 border-b border-border">{section.title}</p>
          {section.rows.map(([label, val]) => <Row key={label} label={label} value={val} />)}
        </div>
      ))}

      {error && <div className="p-3 bg-error-100 border border-error-200 rounded-xl text-sm text-error-700">{error}</div>}

      {/* Agreement Acceptance */}
      {!agreementLoading && agreement && (
        <div className="bg-bg-section border border-border rounded-2xl p-5">
          <p className="text-xs font-bold text-brand-500 uppercase tracking-widest mb-3">Restaurant Partner Agreement</p>
          <div className="bg-bg-card border border-border rounded-xl p-4 max-h-48 overflow-y-auto text-sm text-text-secondary leading-relaxed mb-4">
            {showAgreement ? (
              <div dangerouslySetInnerHTML={{ __html: agreement.content }} />
            ) : (
              <div>
                <p className="font-semibold text-text-primary mb-1">{agreement.title}</p>
                <p className="text-xs text-text-muted">Version {agreement.version}</p>
                <button onClick={() => setShowAgreement(true)} className="text-brand-500 text-xs font-semibold mt-2 underline">Read full agreement →</button>
              </div>
            )}
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-5 h-5 accent-brand-500 rounded flex-shrink-0" />
            <span className="text-sm text-text-primary">
              I have read and agree to the <strong>Tastr Restaurant Partner Agreement</strong> (v{agreement.version}).
              I understand this agreement is binding and will be recorded with a timestamp.
            </span>
          </label>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" size="full" onClick={onBack}>← Previous</Button>
        <Button variant="primary" size="full" loading={loading} onClick={handleSubmitWithAgreement}
          disabled={agreement && !agreedToTerms}>
          Submit Application
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const navigate   = useNavigate()
  const [step,     setStep]     = useState(0)
  const [formData, setFormData] = useState({})
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const next = (data) => { setFormData(p => ({ ...p, ...data })); setStep(s => s + 1); window.scrollTo(0, 0) }
  const back = ()     => { setStep(s => s - 1); window.scrollTo(0, 0) }

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const payload = formData
      const fd = new FormData()
      const textFields = ['name','legalBusinessName','cuisineType','hygieneRating','companyRegNumber','vatNumber','businessPhone','businessEmail','fhrsNumber','password','postcode','streetAddress','city','googleMapsPin','addressDocType','accountHolderName','bankName','sortCode','accountNumber','deliveryMode','offersStudentDiscount','studentDiscountPercent','ownerName','dob','ownerPhone','ownerEmail','ownerAddressDocType','myRole']
      textFields.forEach(k => { if (payload[k] !== undefined && payload[k] !== null && payload[k] !== '') fd.append(k, payload[k]) })

      const fileKeys = ['foodBusinessLicense','fhrsDoc','addressProof','bankProof','logo','publicLiabilityIns','companyRegCert','vatRegCert','fireSafetyCert','allergyForm','foodHandlerCert','ownerAddressDoc','ownerIdProof']
      const files = payload.files || {}
      fileKeys.forEach(k => { if (files[k] instanceof File) fd.append(k, files[k]) })
      if (payload.ownerAddressDoc instanceof File) fd.append('ownerAddressDoc', payload.ownerAddressDoc)

      payload.openingHours?.forEach((h, i) => {
        fd.append(`openingHours[${i}][day]`, h.day)
        fd.append(`openingHours[${i}][isOpen]`, h.isOpen)
        fd.append(`openingHours[${i}][open]`, h.open)
        fd.append(`openingHours[${i}][close]`, h.close)
      })
      fd.append('cuisines', JSON.stringify(payload.cuisineType ? [payload.cuisineType] : []))
      fd.append('teamMembers', JSON.stringify((payload.teamMembers||[]).map(m => ({ name:m.name, email:m.email, role:m.role }))))

      await api.post('/restaurants/register', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      navigate('/auth/pending')
    } catch (e) {
      setError(e.response?.data?.message || 'Registration failed. Please try again.')
      setStep(3)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-bg-app flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">

        {/* Header — matches login page exactly */}
        <div className="text-center mb-8">
          <button onClick={() => navigate('/auth/login')} className="text-sm text-text-muted hover:text-text-primary mb-4 block mx-auto">
            ← Back to login
          </button>
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-4 shadow-btn">
            <span className="text-white text-3xl">🍽</span>
          </div>
          <h1 className="text-2xl font-extrabold text-brand-500 tracking-tight">Tastr Partner</h1>
          <p className="text-sm text-text-muted mt-1">Register your restaurant</p>
        </div>

        {/* Card — matches login card */}
        <div className="bg-bg-card rounded-2xl shadow-modal p-8">
          <StepBar current={step} />

          {step === 0 && <Step1 data={formData} onNext={next} />}
          {step === 1 && <Step2 data={formData} onNext={next} onBack={back} />}
          {step === 2 && <Step3 data={formData} onNext={next} onBack={back} />}
          {step === 3 && <Step4 data={formData} onBack={back} onSubmit={handleSubmit} loading={loading} error={error} />}
        </div>

        <p className="text-center text-xs text-text-muted mt-5">
          Already have an account?{' '}
          <button onClick={() => navigate('/auth/login')} className="text-brand-500 font-semibold hover:text-brand-600">Sign in</button>
        </p>
      </div>
    </div>
  )
}
