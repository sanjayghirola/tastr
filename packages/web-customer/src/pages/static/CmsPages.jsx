import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api.js'
import { Spinner } from '../../components/global/index.jsx'

function CmsPage({ slug, title }) {
  const navigate   = useNavigate()
  const [page,     setPage]     = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    api.get(`/users/cms/${slug}`)
      .then(res => setPage(res.data.page))
      .catch(() => setPage({ title, content: '<p>Content could not be loaded. Please try again later.</p>' }))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 hover:bg-brand-100 transition-colors">‹</button>
        <h1 className="text-xl font-bold text-text-primary">{page?.title || title}</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div
          className="prose prose-sm max-w-none text-text-secondary bg-bg-card rounded-2xl p-6 border border-border-light leading-relaxed"
          dangerouslySetInnerHTML={{ __html: page?.content }}
        />
      )}

      {page?.updatedAt && (
        <p className="text-xs text-text-muted text-center mt-4">
          Last updated: {new Date(page.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}

export function PrivacyPolicyPage() {
  return <CmsPage slug="privacy-policy" title="Privacy Policy" />
}

export function TermsPage() {
  return <CmsPage slug="terms" title="Terms & Conditions" />
}
