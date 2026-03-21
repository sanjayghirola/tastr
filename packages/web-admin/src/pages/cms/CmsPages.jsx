import { useEffect, useState } from 'react'
import { FileText, Bell, Navigation, Save, RefreshCw, History, Eye } from 'lucide-react'
import api from '../../services/api.js'

const CMS_TABS = ['Privacy Policy', 'Terms of Service', 'Notif Templates', 'Navigation Config']
const CMS_ICONS = [FileText, FileText, Bell, Navigation]

// ─── Rich Text Editor (simple contentEditable-based for bundled env) ──────────
function RichEditor({ value, onChange }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-bg-section flex-wrap">
        {[
          ['B', 'bold', 'font-bold'], ['I', 'italic', 'italic'], ['U', 'underline', 'underline'],
        ].map(([lbl, cmd, cls]) => (
          <button key={cmd} onMouseDown={e => { e.preventDefault(); document.execCommand(cmd, false) }}
            className={`w-7 h-7 rounded text-xs ${cls} hover:bg-bg-card border border-border text-text-primary transition-colors`}>
            {lbl}
          </button>
        ))}
        <div className="w-px h-5 bg-border mx-1" />
        {[['H2', 'h2'], ['H3', 'h3'], ['P', 'p']].map(([lbl, tag]) => (
          <button key={tag} onMouseDown={e => {
            e.preventDefault()
            document.execCommand('formatBlock', false, tag)
          }} className="px-2 h-7 rounded text-xs hover:bg-bg-card border border-border text-text-primary transition-colors">
            {lbl}
          </button>
        ))}
        <div className="w-px h-5 bg-border mx-1" />
        <button onMouseDown={e => { e.preventDefault(); document.execCommand('insertUnorderedList', false) }}
          className="px-2 h-7 rounded text-xs hover:bg-bg-card border border-border text-text-primary">• List</button>
      </div>
      {/* Editable area */}
      <div
        contentEditable
        suppressContentEditableWarning
        onInput={e => onChange(e.currentTarget.innerHTML)}
        dangerouslySetInnerHTML={{ __html: value }}
        className="min-h-64 max-h-[500px] overflow-y-auto p-4 text-sm text-text-primary focus:outline-none prose prose-sm max-w-none"
        style={{ lineHeight: 1.6 }}
      />
    </div>
  )
}

// ─── CMS Page Editor ──────────────────────────────────────────────────────────
function CmsEditor({ slug, title }) {
  const [content, setContent] = useState('')
  const [pageTitle, setPageTitle] = useState(title)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get('/admin/cms')
      .then(r => {
        const page = (r.data.pages || []).find(p => p.slug === slug)
        if (page) { setContent(page.content); setPageTitle(page.title) }
        else setContent(`<h2>${title}</h2><p>Start editing this page…</p>`)
      })
      .catch(() => setContent(`<h2>${title}</h2><p>Start editing…</p>`))
      .finally(() => setLoading(false))
  }, [slug])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/admin/cms/${slug}`, { title: pageTitle, content })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { alert(e.response?.data?.message || 'Save failed') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <input value={pageTitle} onChange={e => setPageTitle(e.target.value)}
          className="text-lg font-bold bg-transparent border-b-2 border-transparent focus:border-brand-500 outline-none text-text-primary pb-0.5 transition-colors" />
        <div className="flex gap-2">
          <button onClick={() => setPreview(!preview)}
            className="flex items-center gap-2 border border-border px-4 py-2 rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">
            <Eye size={15} /> {preview ? 'Edit' : 'Preview'}
          </button>
          <button onClick={handleSave} disabled={saving}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-600'}`}>
            <Save size={15} /> {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {preview ? (
        <div className="bg-bg-card border border-border rounded-2xl p-6 prose prose-sm max-w-none text-text-primary"
          dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <RichEditor value={content} onChange={setContent} />
      )}

      {/* Version history placeholder */}
      <div className="bg-bg-section border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <History size={15} />
          <span>Version history — last saved {saved ? 'just now' : 'not yet'}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Notification Templates ───────────────────────────────────────────────────
function NotifTemplatesPanel() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null) // trigger being saved
  const [saved, setSaved] = useState(null)

  useEffect(() => {
    api.get('/admin/notif-templates')
      .then(r => setTemplates(r.data.templates || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const updateTemplate = (trigger, field, value) => {
    setTemplates(ts => ts.map(t => t.trigger === trigger ? { ...t, [field]: value } : t))
  }

  const saveTemplate = async (t) => {
    setSaving(t.trigger)
    try {
      await api.put(`/admin/notif-templates/${t.trigger}`, { title: t.title, body: t.body })
      setSaved(t.trigger)
      setTimeout(() => setSaved(null), 2000)
    } catch {}
    finally { setSaving(null) }
  }

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  const inp = "w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section"

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">Edit push notification templates. Use <code className="bg-bg-section px-1.5 py-0.5 rounded font-mono text-xs">{'{{'}{'}}'}</code> variables like <code className="bg-bg-section px-1.5 py-0.5 rounded font-mono text-xs">{'{{orderId}}'}</code>.</p>
      {templates.map(t => (
        <div key={t.trigger} className="bg-bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-text-primary capitalize">{t.trigger.replace(/_/g, ' ')}</p>
              <code className="text-xs text-brand-500 font-mono">{t.trigger}</code>
            </div>
            <button onClick={() => saveTemplate(t)} disabled={saving === t.trigger}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${saved === t.trigger ? 'bg-green-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-600'} disabled:opacity-50`}>
              <Save size={14} /> {saving === t.trigger ? 'Saving…' : saved === t.trigger ? 'Saved!' : 'Save'}
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Title</label>
              <input value={t.title} onChange={e => updateTemplate(t.trigger, 'title', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Body</label>
              <textarea rows={2} value={t.body} onChange={e => updateTemplate(t.trigger, 'body', e.target.value)}
                className={inp + ' resize-none'} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Navigation Config ────────────────────────────────────────────────────────
function NavConfigPanel() {
  const [navConfig, setNavConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/admin/nav-config')
      .then(r => setNavConfig(r.data.navConfig))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleItem = (portal, key) => {
    setNavConfig(nc => ({
      ...nc,
      [portal]: nc[portal].map(item => item.key === key ? { ...item, enabled: !item.enabled } : item),
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/admin/nav-config', navConfig)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {}
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-600'}`}>
          <Save size={15} /> {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Config'}
        </button>
      </div>

      {navConfig && Object.entries(navConfig).map(([portal, items]) => (
        <div key={portal} className="bg-bg-card border border-border rounded-2xl p-5">
          <h3 className="font-bold text-text-primary mb-4 capitalize">{portal} App Navigation</h3>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 border border-border rounded-xl hover:bg-bg-section transition-colors">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                  <code className="text-xs text-text-muted font-mono">{item.key}</code>
                </div>
                <button onClick={() => toggleItem(portal, item.key)}>
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${item.enabled ? 'bg-brand-500' : 'bg-border'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${item.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── CMS Page ─────────────────────────────────────────────────────────────────
export function CmsPage() {
  const [tab, setTab] = useState(0)
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Content & CMS</h1>
        <p className="text-text-muted text-sm mt-0.5">Manage page content, notification templates, and app navigation</p>
      </div>
      <div className="flex gap-1 bg-bg-section border border-border rounded-2xl p-1 flex-wrap">
        {CMS_TABS.map((t, i) => {
          const Icon = CMS_ICONS[i]
          return (
            <button key={i} onClick={() => setTab(i)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === i ? 'bg-bg-card shadow-sm text-brand-600' : 'text-text-muted hover:text-text-primary'}`}>
              <Icon size={14} />{t}
            </button>
          )
        })}
      </div>
      {tab === 0 && <CmsEditor slug="privacy-policy" title="Privacy Policy" />}
      {tab === 1 && <CmsEditor slug="terms-of-service" title="Terms of Service" />}
      {tab === 2 && <NotifTemplatesPanel />}
      {tab === 3 && <NavConfigPanel />}
    </div>
  )
}

export default CmsPage
