import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Upload, Star, X, Plus, Edit2, CheckCircle2,
  Building2, User, Users, ClipboardCheck, ChevronDown
} from 'lucide-react'
import api from '../../services/api.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const CUISINES = ['Italian','Chinese','Indian','Japanese','Mexican','Thai','British','American','Mediterranean','French','Greek','Turkish','Korean','Vietnamese','Middle Eastern','Caribbean','African','Spanish']
const DAYS_FULL  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const DAY_KEYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const ROLES      = ['Owner','Manager','Chef','Front of House','Driver']
const ADDR_DOCS  = ['Utility Bill','Bank Statement','Council Tax','Tenancy Agreement','Mortgage Statement']

const STEPS = [
  { label: 'Restaurant Info', icon: Building2,      desc: 'Basic info, address, banking & documents' },
  { label: 'Owner Details',   icon: User,           desc: 'Contact details & ID proof' },
  { label: 'Team',            icon: Users,          desc: 'Roles & staff members' },
  { label: 'Review',          icon: ClipboardCheck, desc: 'Confirm and create restaurant' },
]

const inputCls = 'w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section placeholder:text-text-muted transition-colors'
const labelCls = 'text-sm font-semibold text-text-primary mb-1.5 block'

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Field({ label, required, hint, children, error }) {
  return (
    <div>
      <label className={labelCls}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-text-muted font-normal ml-1.5 text-xs">({hint})</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="col-span-2 pt-4 pb-1 border-t border-border first:border-t-0 first:pt-0">
      <h3 className="text-sm font-bold text-brand-600 uppercase tracking-widest">{children}</h3>
    </div>
  )
}

function SelectField({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`${inputCls} appearance-none pr-10 ${!value ? 'text-text-muted' : ''}`}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
    </div>
  )
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1.5 mt-1">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button" onClick={() => onChange(i)} className="focus:outline-none">
          <Star size={24} className={`transition-colors ${i <= value ? 'fill-brand-500 text-brand-500' : 'text-border'}`} />
        </button>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${checked ? 'bg-brand-500' : 'bg-border'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function FileUploadBox({ label, hint, file, onChange, onClear, accept = 'image/*,.pdf' }) {
  const ref = useRef()
  return (
    <div className="border-2 border-dashed border-border rounded-xl overflow-hidden bg-bg-section">
      {file ? (
        <div className="flex items-center gap-3 p-3">
          <div className="flex-1 text-sm text-text-primary font-medium truncate">{file.name}</div>
          <button onClick={onClear} className="w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors flex-shrink-0">
            <X size={11} />
          </button>
        </div>
      ) : (
        <div onClick={() => ref.current?.click()} className="flex flex-col items-center py-4 cursor-pointer hover:bg-brand-50/30 transition-colors">
          <Upload size={18} className="text-brand-500 mb-1.5" strokeWidth={1.5} />
          <p className="text-xs font-semibold text-text-primary">{label || 'Upload document'}</p>
          {hint && <p className="text-xs text-text-muted mt-0.5">{hint}</p>}
          <button type="button" className="mt-2 px-4 py-1 bg-brand-500 text-white text-xs font-bold rounded-full hover:bg-brand-600 transition-colors">Upload</button>
        </div>
      )}
      <input ref={ref} type="file" accept={accept} className="sr-only" onChange={e => e.target.files?.[0] && onChange(e.target.files[0])} />
    </div>
  )
}

// ─── Step Sidebar ─────────────────────────────────────────────────────────────
function StepSidebar({ current }) {
  return (
    <div className="w-64 flex-shrink-0">
      <div className="bg-bg-card border border-border rounded-2xl p-5 sticky top-6">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Setup Steps</p>
        <div className="space-y-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const done   = i < current
            const active = i === current
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${active ? 'bg-brand-50 border border-brand-200' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
                  ${done ? 'bg-brand-500' : active ? 'bg-brand-100' : 'bg-bg-section border border-border'}`}>
                  {done
                    ? <CheckCircle2 size={14} className="text-white" />
                    : <Icon size={14} className={active ? 'text-brand-600' : 'text-text-muted'} />
                  }
                </div>
                <div>
                  <p className={`text-sm font-semibold ${active ? 'text-brand-600' : done ? 'text-text-primary' : 'text-text-muted'}`}>{s.label}</p>
                  <p className="text-xs text-text-muted leading-tight">{s.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── STEP 0: Restaurant Info ──────────────────────────────────────────────────
function Step0({ form, setForm, files, setFiles, errors }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setFile = (k, v) => setFiles(f => ({ ...f, [k]: v }))
  const setHour = (i, field, val) => setForm(f => ({
    ...f,
    openingHours: f.openingHours.map((h, idx) => idx === i ? { ...h, [field]: val } : h)
  }))

  const OPTIONAL_DOCS = [
    { key: 'publicLiabilityIns', label: 'Public Liability / Employer\'s Liability Insurance' },
    { key: 'companyRegCert',     label: 'Company Registration Certificate' },
    { key: 'vatRegCert',         label: 'VAT Registration Certificate' },
    { key: 'fireSafetyCert',     label: 'Fire Safety Certificate' },
    { key: 'allergyForm',        label: 'Allergy Information Form' },
    { key: 'foodHandlerCert',    label: 'Food Handler Training Certificate (Level 1)' },
  ]

  return (
    <div className="space-y-0">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-text-primary">Restaurant Information</h2>
        <p className="text-sm text-text-muted">Basic details, address, banking & documents</p>
      </div>
      <div className="h-px bg-border mb-6" />

      <div className="grid grid-cols-2 gap-5">
        {/* ── Basic Info ── */}
        <SectionTitle>Basic Information</SectionTitle>

        <div className="col-span-2">
          <Field label="Restaurant Name" required error={errors.name}>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Enter restaurant name" className={inputCls} />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Legal Business Name">
            <input value={form.legalBusinessName} onChange={e => set('legalBusinessName', e.target.value)} placeholder="Enter legal business name" className={inputCls} />
          </Field>
        </div>
        <Field label="Cuisine Type">
          <SelectField value={form.cuisineType} onChange={v => set('cuisineType', v)} options={CUISINES} placeholder="Select type" />
        </Field>
        <Field label="Food Hygiene Rating">
          <StarRating value={form.hygieneRating || 0} onChange={v => set('hygieneRating', v)} />
        </Field>
        <div className="col-span-2">
          <Field label="Registered Food Business License (issued by Local Council)">
            <FileUploadBox file={files.foodBusinessLicense} onChange={f => setFile('foodBusinessLicense', f)} onClear={() => setFile('foodBusinessLicense', null)} hint="PNG, JPG up to 5MB" />
          </Field>
        </div>
        <Field label="Company Registration Number (if Ltd)">
          <input value={form.companyRegNumber} onChange={e => set('companyRegNumber', e.target.value)} placeholder="Enter company reg number" className={inputCls} />
        </Field>
        <Field label="VAT Number" hint="optional">
          <input value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} placeholder="Enter VAT number" className={inputCls} />
        </Field>
        <Field label="Business Phone Number" required error={errors.businessPhone}>
          <input value={form.businessPhone} onChange={e => set('businessPhone', e.target.value)} placeholder="Enter phone number" type="tel" className={inputCls} />
        </Field>
        <Field label="Business Email Address" required error={errors.businessEmail}>
          <input value={form.businessEmail} onChange={e => set('businessEmail', e.target.value)} placeholder="Enter email address" type="email" className={inputCls} />
        </Field>
        <Field label="FHRS Number">
          <input value={form.fhrsNumber} onChange={e => set('fhrsNumber', e.target.value)} placeholder="Enter FHRS number" className={inputCls} />
        </Field>
        <div className="col-span-2">
          <Field label="Food Hygiene Rating Certificate (FHRS)" hint="Food Standards Agency">
            <FileUploadBox file={files.fhrsDoc} onChange={f => setFile('fhrsDoc', f)} onClear={() => setFile('fhrsDoc', null)} hint="PNG, JPG up to 5MB" />
          </Field>
        </div>

        {/* ── Login Password ── */}
        <SectionTitle>Login Credentials</SectionTitle>
        <div className="col-span-2">
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 mb-3">
            <strong>Note:</strong> These credentials will be used by the restaurant owner to log in to the dashboard. Share them securely.
          </div>
        </div>
        <div className="col-span-2">
          <Field label="Owner Password" required error={errors.password}>
            <input value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 characters" type="password" className={inputCls} />
          </Field>
        </div>

        {/* ── Restaurant Address ── */}
        <SectionTitle>Restaurant Address</SectionTitle>

        <Field label="Full Postcode" required error={errors.postcode}>
          <input value={form.postcode} onChange={e => set('postcode', e.target.value)} placeholder="Enter postcode" className={inputCls} />
        </Field>
        <Field label="Street Address" required error={errors.streetAddress}>
          <input value={form.streetAddress} onChange={e => set('streetAddress', e.target.value)} placeholder="Enter street address" className={inputCls} />
        </Field>
        <Field label="City">
          <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Enter city" className={inputCls} />
        </Field>
        <Field label="Google Maps Pin (lat/lng)">
          <input value={form.googleMapsPin} onChange={e => set('googleMapsPin', e.target.value)} placeholder="e.g. 51.5074, -0.1278" className={inputCls} />
        </Field>
        <Field label="Proof of Restaurant Address">
          <SelectField value={form.addressDocType} onChange={v => set('addressDocType', v)} options={ADDR_DOCS} placeholder="Select document type" />
        </Field>
        <Field label="Upload Address Document">
          <FileUploadBox file={files.addressProof} onChange={f => setFile('addressProof', f)} onClear={() => setFile('addressProof', null)} hint="PNG, JPG up to 5MB" />
        </Field>

        {/* ── Banking Details ── */}
        <SectionTitle>Banking Details</SectionTitle>

        <Field label="Account Holder Name" required error={errors.accountHolderName}>
          <input value={form.accountHolderName} onChange={e => set('accountHolderName', e.target.value)} placeholder="Name as on account" className={inputCls} />
        </Field>
        <Field label="Bank Name">
          <input value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="Enter bank name" className={inputCls} />
        </Field>
        <Field label="Sort Code" required error={errors.sortCode}>
          <input value={form.sortCode} onChange={e => set('sortCode', e.target.value)} placeholder="00-00-00" className={inputCls} />
        </Field>
        <Field label="Account Number" required error={errors.accountNumber}>
          <input value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="12345678" className={inputCls} />
        </Field>
        <div className="col-span-2">
          <Field label="Upload Proof (bank statement / void cheque)">
            <FileUploadBox file={files.bankProof} onChange={f => setFile('bankProof', f)} onClear={() => setFile('bankProof', null)} hint="PNG, JPG up to 5MB" />
          </Field>
        </div>

        {/* ── Restaurant Settings ── */}
        <SectionTitle>Restaurant Settings</SectionTitle>

        <div className="col-span-2">
          <Field label="Delivery Mode">
            <div className="flex gap-3 mt-1">
              {[{val:'tastr',label:'Tastr Drivers',sub:'We provide delivery for you'},{val:'own',label:'Own Drivers',sub:'You manage your team'}].map(opt => (
                <label key={opt.val} className={`flex-1 flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${form.deliveryMode===opt.val ? 'border-brand-500 bg-brand-50' : 'border-border hover:border-brand-300'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.deliveryMode===opt.val ? 'border-brand-500' : 'border-text-muted'}`}>
                    {form.deliveryMode===opt.val && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                  </div>
                  <input type="radio" className="sr-only" value={opt.val} checked={form.deliveryMode===opt.val} onChange={() => set('deliveryMode', opt.val)} />
                  <div>
                    <p className="font-bold text-sm text-text-primary">{opt.label}</p>
                    <p className="text-xs text-text-muted">{opt.sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </Field>
        </div>

        <div className="col-span-2">
          <Field label="Restaurant Timings">
            <div className="space-y-2.5 mt-1">
              {form.openingHours.map((h, i) => (
                <div key={h.day} className="flex items-center gap-3">
                  <span className="w-24 text-sm font-semibold text-text-primary flex-shrink-0">{DAYS_FULL[i]}</span>
                  <Toggle checked={h.isOpen} onChange={v => setHour(i, 'isOpen', v)} />
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg w-16 text-center flex-shrink-0 ${h.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {h.isOpen ? 'Open' : 'Closed'}
                  </span>
                  {h.isOpen && (
                    <>
                      <input type="time" value={h.open} onChange={e => setHour(i, 'open', e.target.value)}
                        className="border border-border rounded-lg px-2 py-1.5 text-xs bg-bg-section focus:border-brand-500 focus:outline-none" />
                      <span className="text-xs text-text-muted">to</span>
                      <input type="time" value={h.close} onChange={e => setHour(i, 'close', e.target.value)}
                        className="border border-border rounded-lg px-2 py-1.5 text-xs bg-bg-section focus:border-brand-500 focus:outline-none" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </Field>
        </div>

        {/* Logo */}
        <div className="col-span-2">
          <Field label="Restaurant Logo">
            <FileUploadBox file={files.logo} onChange={f => setFile('logo', f)} onClear={() => setFile('logo', null)} label="Upload logo" hint="PNG, JPG up to 5MB" accept="image/*" />
          </Field>
        </div>

        {/* Cover photos */}
        <div className="col-span-2">
          <Field label="Cover Photos" hint="optional, up to 5">
            <CoverPhotoUpload photos={form.coverPhotos} setPhotos={v => set('coverPhotos', v)} />
          </Field>
        </div>

        {/* Description */}
        <div className="col-span-2">
          <Field label="Restaurant Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              placeholder="Tell customers what makes this restaurant special…" className={inputCls + ' resize-none'} />
          </Field>
        </div>

        {/* Optional compliance docs */}
        <SectionTitle>Additional Documents (Optional)</SectionTitle>
        {OPTIONAL_DOCS.map(doc => (
          <div key={doc.key} className="col-span-1">
            <Field label={doc.label} hint="optional">
              <FileUploadBox file={files[doc.key]} onChange={f => setFile(doc.key, f)} onClear={() => setFile(doc.key, null)} hint="PNG, JPG up to 5MB" />
            </Field>
          </div>
        ))}
      </div>
    </div>
  )
}

// Cover photo mini-component
function CoverPhotoUpload({ photos, setPhotos }) {
  const ref = useRef()
  const add = (e) => {
    const newFiles = Array.from(e.target.files || []).slice(0, 5 - photos.length)
    setPhotos([...photos, ...newFiles.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
  }
  return (
    <div className="mt-1">
      <div className="grid grid-cols-5 gap-2 mb-2">
        {photos.map((p, i) => (
          <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-border">
            <img src={p.preview} alt="" className="w-full h-full object-cover" />
            <button onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
              <X size={10} />
            </button>
          </div>
        ))}
        {photos.length < 5 && (
          <div onClick={() => ref.current?.click()}
            className="aspect-video border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/20 transition-colors">
            <Plus size={16} className="text-text-muted" />
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="sr-only" onChange={add} />
      <p className="text-xs text-text-muted">{photos.length}/5 photos</p>
    </div>
  )
}

// ─── STEP 1: Owner Details ────────────────────────────────────────────────────
function Step1({ form, setForm, files, setFiles, errors }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setFile = (k, v) => setFiles(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-0">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-text-primary">Owner Details</h2>
        <p className="text-sm text-text-muted">Contact information and identity proof for the restaurant owner</p>
      </div>
      <div className="h-px bg-border mb-6" />

      <div className="grid grid-cols-2 gap-5">
        <SectionTitle>Contact Details</SectionTitle>

        <Field label="Owner Name" required error={errors.ownerName}>
          <input value={form.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder="Enter owner name" className={inputCls} />
        </Field>
        <Field label="Date of Birth">
          <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} placeholder="Choose DOB" className={inputCls} />
        </Field>
        <Field label="Owner Phone Number" required error={errors.ownerPhone}>
          <input type="tel" value={form.ownerPhone} onChange={e => set('ownerPhone', e.target.value)} placeholder="Enter owner phone number" className={inputCls} />
        </Field>
        <Field label="Owner Email Address">
          <input type="email" value={form.ownerEmail} onChange={e => set('ownerEmail', e.target.value)} placeholder="Enter owner email address" className={inputCls} />
        </Field>

        <SectionTitle>Owner Address Proof</SectionTitle>

        <Field label="Document Type">
          <SelectField value={form.ownerAddressDocType} onChange={v => set('ownerAddressDocType', v)} options={ADDR_DOCS} placeholder="Select document" />
        </Field>
        <div className="col-span-2">
          <Field label="Upload Document">
            <FileUploadBox file={files.ownerAddressDoc} onChange={f => setFile('ownerAddressDoc', f)} onClear={() => setFile('ownerAddressDoc', null)} hint="PNG, JPG up to 5MB" />
          </Field>
        </div>

        <SectionTitle>Owner ID Proof</SectionTitle>
        <div className="col-span-2">
          <Field label="Owner ID Document" hint="Passport, driving licence, or national ID">
            <FileUploadBox file={files.ownerIdProof} onChange={f => setFile('ownerIdProof', f)} onClear={() => setFile('ownerIdProof', null)} hint="PNG, JPG up to 5MB" />
          </Field>
        </div>
      </div>
    </div>
  )
}

// ─── Team Member Modal ────────────────────────────────────────────────────────
function MemberModal({ onClose, onAdd, existing }) {
  const [form, setForm]     = useState({ name: existing?.name||'', email: existing?.email||'', role: existing?.role||'' })
  const [photo, setPhoto]   = useState(existing?.photo||null)
  const [preview, setPreview] = useState(existing?.preview||null)
  const [error, setError]   = useState('')
  const fileRef = useRef()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (f) { setPhoto(f); setPreview(URL.createObjectURL(f)) }
  }

  const handleAdd = () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.email.trim()) { setError('Email is required'); return }
    if (!form.role) { setError('Please select a role'); return }
    onAdd({ ...form, photo, preview })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-bg-card rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold text-text-primary">Team member details</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-section rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Name">
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Enter name" className={inputCls} />
          </Field>
          <Field label="Email-Id">
            <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="Enter id" type="email" className={inputCls} />
          </Field>
          <Field label="Role">
            <SelectField value={form.role} onChange={v => set('role', v)} options={ROLES} placeholder="Select role type" />
          </Field>
          <div className="border-2 border-dashed border-border rounded-xl overflow-hidden bg-bg-section">
            {preview ? (
              <div className="flex items-center gap-3 p-3">
                <img src={preview} alt="" className="w-10 h-10 rounded-full object-cover border border-border flex-shrink-0" />
                <p className="text-sm text-text-primary flex-1 truncate">{photo?.name}</p>
                <button onClick={() => { setPhoto(null); setPreview(null) }} className="w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center"><X size={11} /></button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 cursor-pointer hover:bg-brand-50/30 transition-colors" onClick={() => fileRef.current?.click()}>
                <Upload size={18} className="text-brand-500 mb-1.5" strokeWidth={1.5} />
                <p className="text-xs font-semibold text-text-primary">Upload Profile photo</p>
                <p className="text-xs text-text-muted mt-0.5">PNG, JPG up to 5MB</p>
                <button type="button" className="mt-2 px-4 py-1 bg-brand-500 text-white text-xs font-bold rounded-full hover:bg-brand-600 transition-colors">Upload</button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={handleAdd} className="w-full py-3 bg-brand-500 text-white font-bold rounded-xl text-sm hover:bg-brand-600 transition-colors">
            {existing ? 'Save Changes' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── STEP 2: Team ─────────────────────────────────────────────────────────────
function Step2({ form, setForm }) {
  const [showModal, setShowModal] = useState(false)
  const [editIdx,   setEditIdx]   = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = (member) => {
    if (editIdx !== null) {
      set('teamMembers', form.teamMembers.map((x, i) => i === editIdx ? member : x))
      setEditIdx(null)
    } else {
      set('teamMembers', [...(form.teamMembers||[]), member])
    }
    setShowModal(false)
  }

  return (
    <div>
      {showModal && (
        <MemberModal
          existing={editIdx !== null ? form.teamMembers[editIdx] : null}
          onClose={() => { setShowModal(false); setEditIdx(null) }}
          onAdd={handleAdd}
        />
      )}

      <div className="mb-5">
        <h2 className="text-lg font-bold text-text-primary">Team Settings</h2>
        <p className="text-sm text-text-muted">Set the primary role and invite staff members</p>
      </div>
      <div className="h-px bg-border mb-6" />

      <div className="space-y-6">
        {/* Role selection */}
        <div>
          <p className={labelCls}>Select role for this account</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { val: 'owner',   label: 'Owner',   sub: 'Access to more features' },
              { val: 'manager', label: 'Manager', sub: 'Manage orders & staff'   },
            ].map(opt => (
              <button key={opt.val} onClick={() => set('myRole', opt.val)}
                className={`p-5 rounded-2xl border-2 text-center transition-all ${form.myRole===opt.val ? 'bg-brand-500 border-brand-500 text-white' : 'bg-bg-section border-border text-text-primary hover:border-brand-400'}`}>
                <p className="font-extrabold text-lg">{opt.label}</p>
                <p className={`text-sm mt-0.5 ${form.myRole===opt.val ? 'text-white/80' : 'text-text-muted'}`}>{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Team members */}
        <div>
          <p className={labelCls}>Add team members</p>
          <p className="text-xs text-text-muted mb-3">Invite staff members to help manage the restaurant</p>

          <div className="space-y-2 mb-3">
            {(form.teamMembers||[]).map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-bg-section border border-border rounded-2xl">
                {m.preview ? (
                  <img src={m.preview} alt="" className="w-10 h-10 rounded-full object-cover border border-border flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-600 flex-shrink-0">
                    {m.name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">{m.name}</p>
                  <p className="text-xs text-text-muted truncate">{m.email}</p>
                </div>
                <span className="text-xs font-semibold text-brand-600 flex-shrink-0">{m.role}</span>
                <button onClick={() => { setEditIdx(i); setShowModal(true) }}
                  className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-brand-500 transition-colors rounded-lg hover:bg-brand-50">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => set('teamMembers', form.teamMembers.filter((_, idx) => idx !== i))}
                  className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          <button onClick={() => { setEditIdx(null); setShowModal(true) }}
            className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border rounded-2xl text-sm font-semibold text-text-muted hover:border-brand-400 hover:text-brand-500 transition-colors">
            <Plus size={16} /> Add team member
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── STEP 3: Review ───────────────────────────────────────────────────────────
function Step3({ form, files }) {
  const uploadedDocs = Object.entries(files).filter(([, f]) => f instanceof File)
  const Row = ({ label, value }) => value ? (
    <div className="flex justify-between py-2 border-b border-border last:border-b-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-semibold text-text-primary text-right max-w-[60%] break-words capitalize">{value}</span>
    </div>
  ) : null

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold text-text-primary">Review & Create</h2>
        <p className="text-sm text-text-muted">Confirm all details before creating the restaurant</p>
      </div>
      <div className="h-px bg-border mb-6" />

      <div className="space-y-5">
        <div className="bg-bg-section border border-border rounded-2xl p-5">
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Restaurant</p>
          <Row label="Name"             value={form.name} />
          <Row label="Legal Name"       value={form.legalBusinessName} />
          <Row label="Cuisine"          value={form.cuisineType} />
          <Row label="Phone"            value={form.businessPhone} />
          <Row label="Email"            value={form.businessEmail} />
          <Row label="Hygiene Rating"   value={form.hygieneRating ? `${form.hygieneRating}/5 stars` : null} />
          <Row label="Company Reg"      value={form.companyRegNumber} />
          <Row label="VAT"              value={form.vatNumber} />
          <Row label="FHRS"             value={form.fhrsNumber} />
        </div>
        <div className="bg-bg-section border border-border rounded-2xl p-5">
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Address</p>
          <Row label="Street"   value={form.streetAddress} />
          <Row label="City"     value={form.city} />
          <Row label="Postcode" value={form.postcode} />
        </div>
        <div className="bg-bg-section border border-border rounded-2xl p-5">
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Banking</p>
          <Row label="Account Holder" value={form.accountHolderName} />
          <Row label="Bank"           value={form.bankName} />
          <Row label="Sort Code"      value={form.sortCode} />
          <Row label="Account"        value={form.accountNumber ? `****${form.accountNumber.slice(-4)}` : null} />
        </div>
        <div className="bg-bg-section border border-border rounded-2xl p-5">
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Owner</p>
          <Row label="Name"  value={form.ownerName} />
          <Row label="Phone" value={form.ownerPhone} />
          <Row label="Email" value={form.ownerEmail} />
          <Row label="DOB"   value={form.dob} />
        </div>
        <div className="bg-bg-section border border-border rounded-2xl p-5">
          <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Team</p>
          <Row label="My Role"     value={form.myRole || 'owner'} />
          <Row label="Team members" value={form.teamMembers?.length ? `${form.teamMembers.length} member(s) added` : 'None'} />
        </div>
        {uploadedDocs.length > 0 && (
          <div className="bg-bg-section border border-border rounded-2xl p-5">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Documents Uploaded</p>
            {uploadedDocs.map(([key, f]) => (
              <div key={key} className="flex items-center gap-2 py-1.5">
                <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                <span className="text-sm text-text-primary">{f.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AddRestaurantPage() {
  const navigate = useNavigate()
  const [step,    setStep]    = useState(0)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [errors,  setErrors]  = useState({})
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    // Restaurant info
    name: '', legalBusinessName: '', cuisineType: '', hygieneRating: 0,
    companyRegNumber: '', vatNumber: '', businessPhone: '', businessEmail: '',
    fhrsNumber: '', password: '', description: '',
    postcode: '', streetAddress: '', city: '', googleMapsPin: '', addressDocType: '',
    accountHolderName: '', bankName: '', sortCode: '', accountNumber: '',
    deliveryMode: 'tastr',
    openingHours: DAY_KEYS.map((d, i) => ({ day: d, label: DAYS_FULL[i], isOpen: true, open: '10:00', close: '22:00' })),
    coverPhotos: [],
    // Owner info
    ownerName: '', dob: '', ownerPhone: '', ownerEmail: '', ownerAddressDocType: '',
    // Team
    myRole: 'owner', teamMembers: [],
  })

  const [files, setFiles] = useState({
    foodBusinessLicense: null, fhrsDoc: null, addressProof: null,
    bankProof: null, logo: null, ownerAddressDoc: null, ownerIdProof: null,
    publicLiabilityIns: null, companyRegCert: null, vatRegCert: null,
    fireSafetyCert: null, allergyForm: null, foodHandlerCert: null,
  })

  const validateStep = (s) => {
    const errs = {}
    if (s === 0) {
      if (!form.name.trim())            errs.name            = 'Required'
      if (!form.businessPhone.trim())   errs.businessPhone   = 'Required'
      if (!form.businessEmail.trim())   errs.businessEmail   = 'Required'
      if (!form.postcode.trim())        errs.postcode        = 'Required'
      if (!form.streetAddress.trim())   errs.streetAddress   = 'Required'
      if (!form.accountHolderName.trim()) errs.accountHolderName = 'Required'
      if (!form.sortCode.trim())        errs.sortCode        = 'Required'
      if (!form.accountNumber.trim())   errs.accountNumber   = 'Required'
      if (!form.password || form.password.length < 8) errs.password = 'Min 8 characters'
    }
    if (s === 1) {
      if (!form.ownerName.trim())  errs.ownerName  = 'Required'
      if (!form.ownerPhone.trim()) errs.ownerPhone = 'Required'
    }
    return errs
  }

  const handleNext = () => {
    const errs = validateStep(step)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setStep(s => s + 1)
    window.scrollTo(0, 0)
  }

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const fd = new FormData()

      // Text fields
      const textFields = ['name','legalBusinessName','cuisineType','hygieneRating','companyRegNumber','vatNumber','businessPhone','businessEmail','fhrsNumber','password','description','postcode','streetAddress','city','googleMapsPin','addressDocType','accountHolderName','bankName','sortCode','accountNumber','deliveryMode','ownerName','dob','ownerPhone','ownerEmail','ownerAddressDocType','myRole']
      textFields.forEach(k => { if (form[k] !== undefined && form[k] !== null && form[k] !== '') fd.append(k, form[k]) })

      // File fields
      Object.entries(files).forEach(([k, f]) => { if (f instanceof File) fd.append(k, f) })

      // Cover photos
      form.coverPhotos.forEach(p => { if (p.file instanceof File) fd.append('coverPhotos', p.file) })

      // Opening hours
      form.openingHours.forEach((h, i) => {
        fd.append(`openingHours[${i}][day]`,    h.day)
        fd.append(`openingHours[${i}][isOpen]`, h.isOpen)
        fd.append(`openingHours[${i}][open]`,   h.open)
        fd.append(`openingHours[${i}][close]`,  h.close)
      })

      // Team
      fd.append('teamMembers', JSON.stringify((form.teamMembers||[]).map(m => ({ name:m.name, email:m.email, role:m.role }))))
      fd.append('cuisines', JSON.stringify(form.cuisineType ? [form.cuisineType] : []))

      await api.post('/admin/restaurants', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSuccess(true)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create restaurant. Please try again.')
    } finally { setLoading(false) }
  }

  const resetForm = () => {
    setSuccess(false); setStep(0); setError(''); setErrors({})
    setForm({ name:'', legalBusinessName:'', cuisineType:'', hygieneRating:0, companyRegNumber:'', vatNumber:'', businessPhone:'', businessEmail:'', fhrsNumber:'', password:'', description:'', postcode:'', streetAddress:'', city:'', googleMapsPin:'', addressDocType:'', accountHolderName:'', bankName:'', sortCode:'', accountNumber:'', deliveryMode:'tastr', openingHours:DAY_KEYS.map((d,i)=>({day:d,label:DAYS_FULL[i],isOpen:true,open:'10:00',close:'22:00'})), coverPhotos:[], ownerName:'', dob:'', ownerPhone:'', ownerEmail:'', ownerAddressDocType:'', myRole:'owner', teamMembers:[] })
    setFiles({ foodBusinessLicense:null, fhrsDoc:null, addressProof:null, bankProof:null, logo:null, ownerAddressDoc:null, ownerIdProof:null, publicLiabilityIns:null, companyRegCert:null, vatRegCert:null, fireSafetyCert:null, allergyForm:null, foodHandlerCert:null })
  }

  if (success) return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Restaurant Added!</h2>
        <p className="text-text-muted mb-8">The restaurant has been created and is now active. Admin-created restaurants skip the approval queue.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/restaurants/list')}
            className="px-5 py-2.5 bg-brand-500 text-white font-bold rounded-xl text-sm hover:bg-brand-600 transition-colors">
            View All Restaurants
          </button>
          <button onClick={resetForm}
            className="px-5 py-2.5 border border-border text-text-primary font-bold rounded-xl text-sm hover:bg-bg-section transition-colors">
            Add Another
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step > 0 ? (setStep(s => s - 1), setErrors({})) : navigate('/restaurants/list')}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm font-medium transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="w-px h-4 bg-border" />
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Add Restaurant</h1>
          <p className="text-sm text-text-muted">Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        <StepSidebar current={step} />

        <div className="flex-1 min-w-0">
          <div className="bg-bg-card border border-border rounded-2xl p-7">
            {step === 0 && <Step0 form={form} setForm={setForm} files={files} setFiles={setFiles} errors={errors} />}
            {step === 1 && <Step1 form={form} setForm={setForm} files={files} setFiles={setFiles} errors={errors} />}
            {step === 2 && <Step2 form={form} setForm={setForm} />}
            {step === 3 && <Step3 form={form} files={files} />}

            {error && <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-5 border-t border-border">
              {step > 0 && (
                <button onClick={() => { setStep(s => s - 1); setErrors({}) }}
                  className="px-6 py-2.5 border border-border text-text-primary font-bold rounded-xl text-sm hover:bg-bg-section transition-colors">
                  ← Back
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button onClick={handleNext}
                  className="flex-1 bg-brand-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-brand-600 transition-colors">
                  Continue →
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 bg-brand-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</> : '🚀 Create Restaurant'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
