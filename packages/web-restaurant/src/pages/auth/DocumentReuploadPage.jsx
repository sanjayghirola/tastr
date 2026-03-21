import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Upload, CheckCircle2, X, FileText, AlertCircle } from 'lucide-react'
import api from '../../services/api.js'

export default function DocumentReuploadPage() {
  const [params] = useSearchParams()
  const navigate  = useNavigate()
  const token     = params.get('token')
  const restaurantId = params.get('restaurantId')

  const [rejected, setRejected]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [uploads, setUploads]     = useState({}) // { docKey: { file, preview, status, error } }
  const [submitting, setSubmitting] = useState({})
  const [done, setDone]           = useState([])
  const fileRefs = useRef({})

  useEffect(() => {
    if (!token || !restaurantId) { navigate('/'); return }
    // Fetch restaurant doc status using token (no auth needed)
    api.get(`/restaurants/reupload-status?token=${token}&restaurantId=${restaurantId}`)
      .then(r => setRejected(r.data.rejectedDocs || []))
      .catch(() => setRejected([]))
      .finally(() => setLoading(false))
  }, [])

  const handleFile = (docKey, e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploads(u => ({ ...u, [docKey]: { file: f, preview: URL.createObjectURL(f), status: 'ready', error: null } }))
  }

  const handleUpload = async (doc) => {
    const up = uploads[doc.key]
    if (!up?.file) return
    setSubmitting(s => ({ ...s, [doc.key]: true }))
    try {
      const fd = new FormData()
      fd.append('document', up.file)
      fd.append('docKey', doc.key)
      fd.append('token', token)
      fd.append('restaurantId', restaurantId)
      await api.post('/restaurants/documents/reupload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setDone(d => [...d, doc.key])
      setUploads(u => ({ ...u, [doc.key]: { ...u[doc.key], status: 'done' } }))
    } catch (e) {
      setUploads(u => ({ ...u, [doc.key]: { ...u[doc.key], error: e.response?.data?.message || 'Upload failed' } }))
    } finally {
      setSubmitting(s => ({ ...s, [doc.key]: false }))
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-[#C18B3C]/20 to-[#EDE0CC]/30 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const allDone = rejected.length > 0 && rejected.every(d => done.includes(d.key))

  if (allDone) return (
    <div className="min-h-screen bg-gradient-to-b from-[#C18B3C]/20 to-[#EDE0CC]/30 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-10 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Documents Submitted!</h2>
        <p className="text-sm text-gray-500 mb-6">Our team will review your documents and notify you once approved. This usually takes 1–2 business days.</p>
        <div className="py-3 px-5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-700">
          You can close this page. We'll email you when your account is approved.
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#C18B3C]/20 to-[#EDE0CC]/30 px-4 py-10">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-5">
          <div className="bg-[#C18B3C] px-7 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Upload size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Document Re-upload</h1>
                <p className="text-white/80 text-xs">Please re-submit the rejected documents below</p>
              </div>
            </div>
          </div>
          <div className="px-7 py-5">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-700">
              <p className="font-bold mb-1">⚠️ Please note:</p>
              <p>Only re-upload the rejected documents. Your previously approved documents don't need to be re-submitted. This link is valid for this session only.</p>
            </div>
          </div>
        </div>

        {/* Document upload cards */}
        <div className="space-y-4">
          {rejected.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-8 text-center">
              <AlertCircle size={28} className="mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500 text-sm">No rejected documents found for this link.</p>
            </div>
          ) : rejected.map(doc => {
            const up = uploads[doc.key]
            const isDone = done.includes(doc.key)
            const isSubmitting = submitting[doc.key]

            return (
              <div key={doc.key} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isDone ? 'border-2 border-green-300' : ''}`}>
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{doc.label}</p>
                    {doc.rejectionReason && <p className="text-xs text-red-500 mt-0.5">Rejected: {doc.rejectionReason}</p>}
                  </div>
                  {isDone ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={12} /> Uploaded
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">Rejected</span>
                  )}
                </div>

                <div className="p-5">
                  {isDone ? (
                    <div className="flex items-center gap-3 text-green-600 text-sm">
                      <CheckCircle2 size={18} />
                      <p>Document submitted for review</p>
                    </div>
                  ) : (
                    <>
                      {/* Upload zone */}
                      {!up?.file ? (
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl h-32 cursor-pointer hover:border-[#C18B3C] hover:bg-amber-50/30 transition-all">
                          <Upload size={24} className="text-gray-300 mb-2" />
                          <p className="text-sm font-semibold text-gray-600">Tap to upload document</p>
                          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, PDF — max 20MB</p>
                          <input type="file" accept="image/*,.pdf" className="sr-only"
                            ref={el => fileRefs.current[doc.key] = el}
                            onChange={e => handleFile(doc.key, e)} />
                        </label>
                      ) : (
                        <div className="space-y-3">
                          {/* Preview */}
                          <div className="relative">
                            {up.preview && !up.file.name.toLowerCase().endsWith('.pdf') ? (
                              <img src={up.preview} alt="preview" className="w-full max-h-40 object-cover rounded-xl border border-gray-200" />
                            ) : (
                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <FileText size={20} className="text-gray-400" />
                                <p className="text-sm text-gray-600">{up.file.name}</p>
                              </div>
                            )}
                            <button onClick={() => setUploads(u => { const n = {...u}; delete n[doc.key]; return n })}
                              className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center">
                              <X size={13} />
                            </button>
                          </div>
                          {up.error && <p className="text-xs text-red-500">{up.error}</p>}
                          <button onClick={() => handleUpload(doc)} disabled={isSubmitting}
                            className="w-full py-3 bg-[#C18B3C] text-white font-bold rounded-2xl text-sm hover:bg-[#a67832] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSubmitting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading…</> : '↑ Submit Document'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress */}
        {rejected.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mt-5">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>{done.length} of {rejected.length} documents uploaded</span>
              <span>{Math.round((done.length/rejected.length)*100)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="h-2 bg-[#C18B3C] rounded-full transition-all" style={{ width: `${(done.length/rejected.length)*100}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
