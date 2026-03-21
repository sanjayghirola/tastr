import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, CheckCircle2, XCircle, Clock, AlertCircle, FileText,
  ExternalLink, Eye, RotateCcw, Download, Plus, Trash2, Edit2,
  ToggleLeft, ToggleRight, Map, Phone, Mail, Calendar
} from 'lucide-react'
import { Badge } from '../../components/global/index.jsx'
import api from '../../services/api.js'

const fmt = p => `£${((p||0)/100).toFixed(2)}`
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'

const TABS = ['Overview','Docs & Verification','Menu & Nutrition','Delivery & Rest..','Marketing & Prom..','Finance & Payouts','Logs & History']
const STATUS_COLORS = {
  PENDING:'bg-amber-100 text-amber-700', ACTIVE:'bg-green-100 text-green-700',
  REJECTED:'bg-red-100 text-red-700', SUSPENDED:'bg-gray-100 text-gray-700',
  DOCS_REQUIRED:'bg-orange-100 text-orange-700',
}

const DOC_STATUS_UI = {
  not_uploaded:{ label:'Not Uploaded', color:'bg-gray-100 text-gray-500' },
  pending:     { label:'Pending',      color:'bg-amber-100 text-amber-700' },
  approved:    { label:'Approved',     color:'bg-green-100 text-green-700' },
  rejected:    { label:'Rejected',     color:'bg-red-100 text-red-700' },
}

const inputCls = 'w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-bg-section focus:border-brand-500 focus:outline-none placeholder:text-text-muted'

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ restaurant, onStatusChange }) {
  const [loading, setLoading] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const handleAccept = async () => {
    setLoading(true)
    try { await api.patch(`/admin/restaurants/${restaurant._id}/status`, { status: 'ACTIVE' }); onStatusChange('ACTIVE') }
    catch {} finally { setLoading(false) }
  }
  const handleReject = async () => {
    if (!rejectReason.trim()) return
    setLoading(true)
    try { await api.patch(`/admin/restaurants/${restaurant._id}/status`, { status: 'REJECTED', reason: rejectReason }); onStatusChange('REJECTED') }
    catch {} finally { setLoading(false); setRejectModal(false) }
  }

  const owner = restaurant.ownerId || {}
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const hours = restaurant.openingHours || []
  const getHours = (day) => hours.find(h => h.day === day)

  return (
    <div className="space-y-6">
      {/* Cover photo */}
      {restaurant.coverPhotos?.[0] && (
        <img src={restaurant.coverPhotos[0].url} alt="" className="w-full h-48 object-cover rounded-2xl" />
      )}

      {/* Name + status */}
      <div className="bg-bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start gap-4">
          {restaurant.logoUrl && <img src={restaurant.logoUrl} alt="logo" className="w-14 h-14 rounded-2xl object-cover border border-border" />}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-text-primary">{restaurant.name}</h2>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[restaurant.status] || 'bg-gray-100 text-gray-600'}`}>{restaurant.status}</span>
            </div>
            {restaurant.description && <p className="text-sm text-text-muted mt-1">{restaurant.description}</p>}
            {restaurant.cuisines?.length > 0 && (
              <p className="text-xs text-text-muted mt-1">Cuisine type: <span className="font-semibold text-text-primary">{restaurant.cuisines.join(', ')}</span></p>
            )}
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div className="bg-bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-4">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Legal Business Name', restaurant.legalBusinessName],
            ['Company Reg Number', restaurant.companyRegNumber],
            ['VAT Number', restaurant.vatNumber],
            ['FHRS Number', restaurant.fhrsNumber],
            ['Food Hygiene Rating', restaurant.foodHygieneRating ? `${restaurant.foodHygieneRating}/5` : '—'],
            ['Verticals', restaurant.verticals?.join(', ')],
          ].map(([label, val]) => (
            <div key={label} className="bg-bg-section rounded-xl p-3">
              <p className="text-xs text-text-muted mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-text-primary">{val || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Address */}
      <div className="bg-bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-4">Address</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[['Full Postcode', restaurant.address?.postcode], ['Street Address', restaurant.address?.line1], ['City', restaurant.address?.city]].map(([l,v]) => (
            <div key={l}><label className="text-xs text-text-muted">{l}</label>
            <input value={v||''} readOnly className={inputCls + ' mt-1'} /></div>
          ))}
        </div>
        <div>
          <label className="text-xs text-text-muted">Google Maps pin (lat/lng)</label>
          <input value={restaurant.address?.lat ? `${restaurant.address.lat}, ${restaurant.address.lng}` : ''} readOnly className={inputCls + ' mt-1'} />
        </div>
        {restaurant.address?.lat && (
          <div className="mt-3 h-40 bg-bg-section rounded-xl flex items-center justify-center border border-border">
            <a href={`https://maps.google.com/?q=${restaurant.address.lat},${restaurant.address.lng}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-brand-500 font-semibold">
              <Map size={16} /> View on Google Maps <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      {/* Contact details */}
      <div className="bg-bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-4">Contact Details</h3>
        <div className="grid grid-cols-2 gap-3">
          {[['Owner Name', owner.name], ['Date of Birth', owner.dateOfBirth ? fmtDate(owner.dateOfBirth) : '—'], ['Owner Phone', owner.phone || restaurant.phone], ['Owner Email', owner.email || restaurant.email]].map(([l,v]) => (
            <div key={l}><label className="text-xs text-text-muted">{l}</label>
            <input value={v||''} readOnly className={inputCls + ' mt-1'} /></div>
          ))}
        </div>
      </div>

      {/* Opening hours */}
      <div className="bg-bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-4">Opening Hours</h3>
        <div className="space-y-2">
          {DAYS.map(day => {
            const h = getHours(day)
            return (
              <div key={day} className="flex items-center gap-4">
                <span className="w-12 text-sm font-semibold text-text-primary">{day}</span>
                <div className={`w-10 h-5 rounded-full relative cursor-default ${h?.isOpen ? 'bg-green-500' : 'bg-border'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${h?.isOpen ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${h?.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{h?.isOpen ? 'Open' : 'Closed'}</span>
                {h?.isOpen && <><input value={h.open||''} readOnly className="border border-border rounded-lg px-2 py-1 text-xs w-20 bg-bg-section" /><span className="text-xs text-text-muted">To</span><input value={h.close||''} readOnly className="border border-border rounded-lg px-2 py-1 text-xs w-20 bg-bg-section" /></>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      {restaurant.status !== 'ACTIVE' && (
        <div className="flex gap-4">
          <button onClick={handleAccept} disabled={loading}
            className="flex-1 py-3.5 bg-green-500 text-white font-bold rounded-2xl text-sm hover:bg-green-600 transition-colors disabled:opacity-50">
            {loading ? 'Processing…' : '✓ Accept Restaurant'}
          </button>
          <button onClick={() => setRejectModal(true)} disabled={loading}
            className="flex-1 py-3.5 bg-red-500 text-white font-bold rounded-2xl text-sm hover:bg-red-600 transition-colors disabled:opacity-50">
            ✗ Reject Restaurant
          </button>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-bg-card rounded-3xl border border-border w-full max-w-md p-7 shadow-2xl">
            <h3 className="text-lg font-bold text-text-primary mb-4">Reject Restaurant</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4}
              placeholder="Provide a reason for rejection (shown to the restaurant owner)…"
              className={inputCls + ' resize-none mb-5'} />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(false)} className="flex-1 py-3 border border-border rounded-2xl text-sm font-semibold hover:bg-bg-section transition-colors">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || loading}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl text-sm hover:bg-red-600 transition-colors disabled:opacity-50">
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Docs & Verification Tab ──────────────────────────────────────────────────
function DocsTab({ restaurant, onReload }) {
  const [reviewState, setReviewState] = useState({}) // {docKey: {loading, rejectReason, showReject}}
  const [reuploadModal, setReuploadModal] = useState(false)
  const [reuploadLink, setReuploadLink] = useState('')
  const [sendingReupload, setSendingReupload] = useState(false)

  const docSlots = restaurant.documentSlots || []
  const rejectedKeys = docSlots.filter(d => d.status === 'rejected').map(d => d.key)
  const allRequiredApproved = docSlots.filter(d => d.required).every(d => d.status === 'approved')

  const setState = (key, patch) => setReviewState(s => ({ ...s, [key]: { ...(s[key]||{}), ...patch } }))

  const handleReview = async (docKey, action, rejectionReason) => {
    setState(docKey, { loading: true })
    try {
      await api.patch(`/admin/restaurants/${restaurant._id}/documents/${docKey}`, { action, rejectionReason })
      onReload()
    } catch (e) { alert(e.response?.data?.message || 'Failed') }
    finally { setState(docKey, { loading: false, showReject: false }) }
  }

  const handleRequestReupload = async () => {
    setSendingReupload(true)
    try {
      const res = await api.post(`/admin/restaurants/${restaurant._id}/request-reupload`, { docKeys: rejectedKeys })
      setReuploadLink(res.data.reuploadLink)
      setReuploadModal(true)
    } catch (e) { alert('Failed to generate reupload link') }
    finally { setSendingReupload(false) }
  }

  const pendingCount = docSlots.filter(d => d.status === 'pending').length
  const approvedCount = docSlots.filter(d => d.status === 'approved').length
  const progress = Math.round((approvedCount / docSlots.filter(d => d.required).length) * 100)

  return (
    <div className="space-y-5">
      {/* Header summary */}
      <div className="bg-bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-text-primary">{restaurant.name} — Document Verification</h3>
            <p className="text-xs text-text-muted mt-0.5">{approvedCount} approved · {pendingCount} pending · {rejectedKeys.length} rejected</p>
          </div>
          {rejectedKeys.length > 0 && (
            <button onClick={handleRequestReupload} disabled={sendingReupload}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors disabled:opacity-50">
              <RotateCcw size={13} /> {sendingReupload ? 'Generating…' : 'Request Reupload'}
            </button>
          )}
        </div>
        <div className="w-full bg-bg-section rounded-full h-2">
          <div className="h-2 bg-brand-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-text-muted mt-1">{progress}% of required documents approved</p>
      </div>

      {/* Document cards */}
      <div className="space-y-4">
        {docSlots.map(doc => {
          const st = DOC_STATUS_UI[doc.status] || DOC_STATUS_UI.not_uploaded
          const rs = reviewState[doc.key] || {}
          const isPDF = doc.url?.toLowerCase().includes('.pdf') || doc.url?.startsWith('data:application/pdf')

          return (
            <div key={doc.key} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-border">
                <div>
                  <p className="font-bold text-text-primary text-sm">{doc.label}</p>
                  {doc.required && <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg">Required</span>}
                  {!doc.required && doc.notes && <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg">{doc.notes}</span>}
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
              </div>

              {doc.url ? (
                <div className="p-5 space-y-4">
                  {/* Preview */}
                  <div className="flex gap-5">
                    <div className="flex-1">
                      {!isPDF ? (
                        <img src={doc.url} alt={doc.label} className="w-full max-h-48 object-cover rounded-xl border border-border" />
                      ) : (
                        <div className="w-full h-32 bg-bg-section rounded-xl border border-border flex items-center justify-center">
                          <FileText size={32} className="text-text-muted" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      {[['File name', doc.filename||'document'], ['File Size', doc.fileSizeBytes ? `${(doc.fileSizeBytes/1024/1024).toFixed(1)} MB` : '—'], ['Uploaded On', fmtDate(doc.uploadedAt)]].map(([l,v]) => (
                        <div key={l}><p className="text-xs text-text-muted">{l}</p><p className="text-sm font-semibold text-text-primary">{v}</p></div>
                      ))}
                      {doc.status === 'rejected' && doc.rejectionReason && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl">
                          <p className="text-xs font-bold text-red-600">Rejection reason:</p>
                          <p className="text-xs text-red-700 mt-0.5">{doc.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {doc.status !== 'approved' && (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold text-text-muted hover:bg-bg-section transition-colors flex items-center justify-center gap-2">
                          <Eye size={13} /> View
                        </a>
                        <button onClick={() => handleReview(doc.key, 'approve')} disabled={rs.loading}
                          className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                          <CheckCircle2 size={13} /> Approve
                        </button>
                        <button onClick={() => setState(doc.key, { showReject: !rs.showReject })}
                          className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                      {rs.showReject && (
                        <div className="space-y-2">
                          <textarea value={rs.rejectReason||''} onChange={e => setState(doc.key, { rejectReason: e.target.value })} rows={2}
                            placeholder="Enter rejection reason…" className={inputCls + ' resize-none'} />
                          <button onClick={() => handleReview(doc.key, 'reject', rs.rejectReason)} disabled={!rs.rejectReason?.trim() || rs.loading}
                            className="w-full py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50">
                            Confirm Rejection
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {doc.status === 'approved' && (
                    <div className="flex items-center gap-2 text-green-600 text-xs font-semibold">
                      <CheckCircle2 size={14} /> Approved {fmtDate(doc.reviewedAt)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 text-center text-sm text-text-muted">
                  <FileText size={24} className="mx-auto mb-2 opacity-30" />
                  Not uploaded yet
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Reupload Link Modal */}
      {reuploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-bg-card rounded-3xl border border-border w-full max-w-md p-7 shadow-2xl">
            <h3 className="text-lg font-bold text-text-primary mb-2">Reupload Link Generated</h3>
            <p className="text-sm text-text-muted mb-4">Share this link with the restaurant to reupload their rejected documents:</p>
            <div className="bg-bg-section border border-border rounded-xl p-3 mb-4">
              <p className="text-xs text-text-muted break-all font-mono">{reuploadLink}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { navigator.clipboard.writeText(reuploadLink); }}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
                Copy Link
              </button>
              <button onClick={() => setReuploadModal(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Menu & Nutrition Tab ─────────────────────────────────────────────────────
function MenuTab({ restaurant }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/menu?restaurantId=${restaurant._id}`)
      .then(r => setItems(r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [restaurant._id])

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-border">
        <h3 className="font-bold text-text-primary">Menu & Nutrition</h3>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-bg-section text-xs text-text-muted"><span>🔍</span> Search</div>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-bg-section border-b border-border">
          <tr>{['', 'Image','Item Name','Category','Vertical','Price','Availability','Nutrition Status','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>)}</tr>
        </thead>
        <tbody>
          {loading ? <tr><td colSpan={9} className="text-center py-12 text-text-muted">Loading…</td></tr>
          : items.length === 0 ? <tr><td colSpan={9} className="text-center py-12 text-text-muted">No menu items yet</td></tr>
          : items.map((item, i) => (
            <tr key={item._id} className="border-b border-border hover:bg-bg-section/50">
              <td className="px-4 py-3 text-xs text-text-muted">{i+1}</td>
              <td className="px-4 py-3"><div className="w-10 h-10 rounded-lg overflow-hidden bg-bg-section">{item.photoUrl ? <img src={item.photoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-text-muted text-lg">🍽</div>}</div></td>
              <td className="px-4 py-3"><p className="font-semibold text-text-primary text-xs">{item.name}</p><p className="text-xs text-text-muted line-clamp-1">{item.description}</p></td>
              <td className="px-4 py-3"><span className="text-xs px-2 py-1 bg-brand-100 text-brand-700 rounded-lg font-semibold">{item.categoryId?.name || '—'}</span></td>
              <td className="px-4 py-3"><span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg font-semibold">{item.vertical || 'Food'}</span></td>
              <td className="px-4 py-3 font-bold text-text-primary text-sm">{fmt(item.pricePence)}</td>
              <td className="px-4 py-3"><div className={`w-10 h-5 rounded-full relative ${item.isAvailable ? 'bg-green-500' : 'bg-border'}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${item.isAvailable ? 'translate-x-5' : 'translate-x-0.5'}`}/></div></td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-lg font-bold ${item.nutritionCompleted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{item.nutritionCompleted ? 'Completed' : 'Pending'}</span></td>
              <td className="px-4 py-3"><div className="flex gap-1"><button className="p-1.5 text-text-muted hover:text-brand-500 transition-colors"><Edit2 size={13}/></button><button className="p-1.5 text-text-muted hover:text-red-500 transition-colors"><Trash2 size={13}/></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Delivery Tab ─────────────────────────────────────────────────────────────
function DeliveryTab({ restaurant, onReload }) {
  const [deliveryMode, setDeliveryMode] = useState(restaurant.deliveryMode || 'tastr')
  const [maxKm, setMaxKm] = useState(restaurant.deliveryRadiusKm || 6)
  const [coverageMode, setCoverageMode] = useState(restaurant.deliveryCoverageMode || 'distance_blocked')
  const [saving, setSaving] = useState(false)
  const [postcodeRules, setPostcodeRules] = useState(restaurant.postcodeRules || [])
  const [ownDrivers, setOwnDrivers] = useState([])

  useEffect(() => {
    api.get(`/restaurants/staff?restaurantId=${restaurant._id}`)
      .then(r => setOwnDrivers(r.data.staff || []))
      .catch(() => {})
  }, [restaurant._id])

  const saveDelivery = async () => {
    setSaving(true)
    try {
      await api.patch(`/admin/restaurants/${restaurant._id}/status`, {})
      // In full impl: PATCH /api/admin/restaurants/:id/delivery-config
      alert('Saved (wire to delivery config endpoint)')
    } catch {} finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      {/* Delivery mode */}
      <div className="bg-bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-bold text-text-primary mb-1">Delivery Mode Configuration</h3>
        <p className="text-sm text-text-muted mb-5">Choose how deliveries will be handled for this restaurant.</p>
        {[{val:'tastr',label:"Tastr drivers",sub:"We provide delivery drivers for you"},{val:'own',label:"Own drivers",sub:"You manage your own delivery team"}].map(opt => (
          <label key={opt.val} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer mb-3 transition-all ${deliveryMode===opt.val?'border-brand-500 bg-brand-50':'border-border hover:border-brand-300'}`}>
            <input type="radio" name="dmode" value={opt.val} checked={deliveryMode===opt.val} onChange={() => setDeliveryMode(opt.val)} className="accent-brand-500" />
            <div><p className="font-bold text-text-primary text-sm">{opt.label}</p><p className="text-xs text-text-muted">{opt.sub}</p></div>
          </label>
        ))}
      </div>

      {/* Delivery area */}
      <div className="bg-bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-bold text-text-primary mb-1">Delivery Area Settings</h3>
        <p className="text-sm text-text-muted mb-5">Configure coverage area, distance limits, and postcode restrictions.</p>
        <div className="space-y-4">
          <div><label className="text-sm font-semibold text-text-primary mb-1.5 block">Maximum Delivery Distance (KM)</label>
            <input type="number" value={maxKm} onChange={e => setMaxKm(e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-semibold text-text-primary mb-1.5 block">Delivery Coverage Mode</label>
            <select value={coverageMode} onChange={e => setCoverageMode(e.target.value)} className={inputCls}>
              <option value="distance">Distance only</option>
              <option value="distance_blocked">Distance + blocked postcodes</option>
              <option value="postcode_only">Postcode list only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Postcode rules */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-border">
          <h3 className="font-bold text-text-primary">Postcode Rules</h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-bg-section border border-border rounded-xl text-xs font-bold hover:bg-border transition-colors">+ Add postcode rule</button>
            <button onClick={saveDelivery} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-colors disabled:opacity-50">Save changes</button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-bg-section border-b border-border">
            <tr>{['','Rule Type','Postcode Pattern','Notes','Date','Actions'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>)}</tr>
          </thead>
          <tbody>
            {postcodeRules.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-text-muted text-sm">No postcode rules configured</td></tr>
            : postcodeRules.map((r,i) => (
              <tr key={i} className="border-b border-border hover:bg-bg-section/50">
                <td className="px-4 py-3"><input type="checkbox" /></td>
                <td className="px-4 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${r.type==='block'?'bg-red-100 text-red-600':'bg-green-100 text-green-600'}`}>{r.type==='block'?'Block':'Allow'}</span></td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-text-primary">{r.pattern}</td>
                <td className="px-4 py-3 text-xs text-text-muted">{r.notes||'—'}</td>
                <td className="px-4 py-3 text-xs text-text-muted">{fmtDate(r.createdAt)}</td>
                <td className="px-4 py-3"><div className="flex gap-1"><button className="p-1.5 text-text-muted hover:text-brand-500"><Edit2 size={13}/></button><button className="p-1.5 text-text-muted hover:text-red-500"><Trash2 size={13}/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Own drivers */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-border">
          <h3 className="font-bold text-text-primary">Restaurant's Own Driver Accounts</h3>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-colors">+ Add driver</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-bg-section border-b border-border">
            <tr>{['','Username','Name','Status','Phone number','Last Login','Delivered Orders','Actions'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>)}</tr>
          </thead>
          <tbody>
            {ownDrivers.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-text-muted text-sm">No own drivers linked</td></tr>
            : ownDrivers.map(d => (
              <tr key={d._id} className="border-b border-border hover:bg-bg-section/50">
                <td className="px-4 py-3"><input type="checkbox" /></td>
                <td className="px-4 py-3"><p className="text-xs font-mono text-text-primary">{d.username||d.userId?.email}</p><p className="text-xs text-text-muted">{d.userId?.email}</p></td>
                <td className="px-4 py-3 font-semibold text-text-primary text-xs">{d.userId?.name||'—'}</td>
                <td className="px-4 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${d.status==='active'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{d.status}</span></td>
                <td className="px-4 py-3 text-xs text-text-muted">{d.userId?.phone||'—'}</td>
                <td className="px-4 py-3 text-xs text-text-muted">—</td>
                <td className="px-4 py-3 text-xs font-bold text-text-primary">{d.totalDeliveries||0}</td>
                <td className="px-4 py-3"><div className="flex gap-1"><button className="p-1.5 text-text-muted hover:text-brand-500"><Edit2 size={13}/></button><button className="p-1.5 text-text-muted hover:text-gray-600"><Clock size={13}/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Marketing Tab ────────────────────────────────────────────────────────────
function MarketingTab({ restaurant }) {
  const MOCK = [
    { type:'Homepage Featured Listing', desc:'Featured restaurant placement on Tastr homepage with priority visibility in search results', start:'01 Apr 2023', end:'30 Apr 2023', impressions:'45.2K', ctr:'+5.2% CTR', status:'Active', clicks:'2.3K', conv:'+3.2% Conv.', amount:'£500.00', roi:'ROI: +320%' },
  ]
  const stats = [{label:'CTR (Click-through Rate)',val:'5.5%',change:'+12% From last month'},{label:'Active Promotions',val:'4',change:'2 Ending soon'},{label:'Pending Approval',val:'1',change:'Requires attention'},{label:'Marketing Spend',val:'£1850',change:'+2 This month'}]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-text-muted mb-1">{s.label}</p>
            <p className="text-2xl font-extrabold text-text-primary">{s.val}</p>
            <p className="text-xs text-text-muted mt-1">{s.change}</p>
          </div>
        ))}
      </div>
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h3 className="font-bold text-text-primary">Restaurants</h3></div>
        <table className="w-full text-sm">
          <thead className="bg-brand-500">
            <tr>{['','Promo Type','Start Date - End Date','Impressions','Status','Clicks','Amount Paid','Actions'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-white">{h}</th>)}</tr>
          </thead>
          <tbody>
            {[...MOCK,...MOCK,...MOCK,...MOCK].map((p,i) => (
              <tr key={i} className="border-b border-border hover:bg-bg-section/50">
                <td className="px-4 py-3"><input type="checkbox" /></td>
                <td className="px-4 py-3"><p className="font-bold text-xs text-text-primary">{p.type}</p><p className="text-xs text-text-muted max-w-48 line-clamp-3">{p.desc}</p></td>
                <td className="px-4 py-3 text-xs text-text-muted"><p>From: {p.start}</p><p>To: {p.end}</p></td>
                <td className="px-4 py-3"><p className="font-bold text-xs text-text-primary">{p.impressions}</p><p className="text-xs text-green-600">{p.ctr}</p></td>
                <td className="px-4 py-3"><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">{p.status}</span></td>
                <td className="px-4 py-3"><p className="font-bold text-xs text-text-primary">{p.clicks}</p><p className="text-xs text-green-600">{p.conv}</p></td>
                <td className="px-4 py-3"><p className="font-bold text-xs text-text-primary">{p.amount}</p><p className="text-xs text-green-600">{p.roi}</p></td>
                <td className="px-4 py-3"><div className="flex gap-1"><button className="p-1.5 text-text-muted hover:text-brand-500"><Edit2 size={13}/></button><button className="p-1.5 text-text-muted hover:text-gray-600"><Clock size={13}/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Finance Tab ──────────────────────────────────────────────────────────────
function FinanceTab({ restaurant }) {
  const MOCK = { id:'PAY-2023-0032', from:'01 Apr 2023', to:'30 Apr 2023', amount:'£32,450.00', method:'Bank Transfer', status:'Paid' }
  const stats = [{label:'Total Sales',val:'£45,280',change:'+15% From last month'},{label:'Commission (15%)',val:'£6,792',change:'+3.4% From last month'},{label:'Delivery Margins',val:'£2,264',change:'+3.4% From last month'},{label:'Marketing Spend',val:'£850',change:'+2 This month'}]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-text-muted mb-1">{s.label}</p>
            <p className="text-2xl font-extrabold text-text-primary">{s.val}</p>
            <p className="text-xs text-text-muted mt-1">{s.change}</p>
          </div>
        ))}
      </div>
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-border">
          <h3 className="font-bold text-text-primary">Payout History</h3>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-bg-section border border-border rounded-xl text-xs font-semibold"><Download size={13}/> Export</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-brand-500">
            <tr>{['','Payout ID','Period','Amount','Status','Actions'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-white">{h}</th>)}</tr>
          </thead>
          <tbody>
            {Array.from({length:10}).map((_,i) => (
              <tr key={i} className="border-b border-border hover:bg-bg-section/50">
                <td className="px-4 py-3"><input type="checkbox" /></td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-text-primary">{MOCK.id}</td>
                <td className="px-4 py-3 text-xs text-text-muted"><p>From: {MOCK.from}</p><p>To: {MOCK.to}</p></td>
                <td className="px-4 py-3"><p className="font-bold text-xs text-text-primary">{MOCK.amount}</p><p className="text-xs text-text-muted">{MOCK.method}</p></td>
                <td className="px-4 py-3"><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Paid</span></td>
                <td className="px-4 py-3"><div className="flex gap-1"><button className="p-1.5 text-text-muted hover:text-brand-500"><Edit2 size={13}/></button><button className="p-1.5 text-text-muted hover:text-gray-600"><Clock size={13}/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <p className="text-xs text-text-muted">1 2 3 … 9 10</p>
          <div className="flex gap-2"><button className="px-3 py-1.5 text-xs border border-border rounded-lg font-semibold hover:bg-bg-section">← Previous</button><button className="px-3 py-1.5 text-xs border border-border rounded-lg font-semibold hover:bg-bg-section">Next →</button></div>
        </div>
      </div>
    </div>
  )
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────
function LogsTab({ restaurant }) {
  const MOCK_LOGS = [
    { title:'Restaurant Created', user:'David Wilson', note:'New restaurant account created during onboarding process.' },
    { title:'Menu Updated', user:'Michael Chen', note:'Added 5 new items to the menu. Updated prices on 3 existing items.' },
    { title:'Restaurant Approved', user:'Sarah Johnson', note:"Restaurant status changed from 'Pending' to 'Active'. All documents verified." },
    { title:'Document Rejected', user:'Lisa Brown', note:'Bank details proof rejected due to unreadable document.' },
    { title:'Delivery Settings Updated', user:'Sarah Johnson', note:"Changed delivery mode to 'Tastr Drivers' and updated maximum distance." },
  ]
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-6">
      <h3 className="text-xl font-bold text-text-primary mb-6">Activity Timeline (Old → New)</h3>
      <div className="space-y-4">
        {MOCK_LOGS.map((log, i) => (
          <div key={i} className="border border-border rounded-2xl p-5">
            <h4 className="font-bold text-text-primary mb-2">{log.title}</h4>
            <p className="text-sm text-text-muted mb-1">{log.user}</p>
            <p className="text-sm text-text-muted mb-2">Created on: 05 march 2025, 9:45 pm</p>
            <p className="text-sm text-text-primary">{log.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RestaurantDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/restaurants/${id}/detail`)
      setRestaurant(res.data.restaurant)
    } catch { navigate('/restaurants') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!restaurant) return null

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/restaurants')} className="flex items-center gap-1.5 text-text-muted text-sm hover:text-text-primary transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        <h1 className="text-2xl font-bold text-text-primary">Restaurant details</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-border">
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-all whitespace-nowrap
              ${activeTab === i ? 'border-brand-500 text-brand-600 bg-brand-50' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 0 && <OverviewTab restaurant={restaurant} onStatusChange={() => load()} />}
        {activeTab === 1 && <DocsTab restaurant={restaurant} onReload={load} />}
        {activeTab === 2 && <MenuTab restaurant={restaurant} />}
        {activeTab === 3 && <DeliveryTab restaurant={restaurant} onReload={load} />}
        {activeTab === 4 && <MarketingTab restaurant={restaurant} />}
        {activeTab === 5 && <FinanceTab restaurant={restaurant} />}
        {activeTab === 6 && <LogsTab restaurant={restaurant} />}
      </div>
    </div>
  )
}
