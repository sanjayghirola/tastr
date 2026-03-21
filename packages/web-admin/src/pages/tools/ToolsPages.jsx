import { useEffect, useState } from 'react'
import {
  Search, Filter, Download, AlertTriangle, Info,
  AlertCircle, Terminal, X, ChevronLeft, ChevronRight,
  Shield, Clock, User, FileText
} from 'lucide-react'
import api from '../../services/api.js'

const TOOLS_TABS = ['System Logs', 'Audit Log']

// ─── Simulated system logs ─────────────────────────────────────────────────────
function generateLogs() {
  const levels = ['error', 'warn', 'info', 'info', 'info']
  const messages = [
    ['error', 'Stripe webhook timeout on event payment_intent.succeeded', 'WebhookHandler', 'TypeError: Cannot read property \'data\' of undefined\n  at WebhookHandler.process (webhook.js:42)\n  at Layer.handle (express/router/layer.js:95)'],
    ['warn',  'Redis connection retry attempt 3/5', 'RedisClient', null],
    ['info',  'Order TAS-44821 delivered successfully', 'OrdersController', null],
    ['info',  'New restaurant registration: Spice Garden (ID: 64fa...)', 'AuthController', null],
    ['error', 'Cloudinary upload failed: Invalid image format', 'CloudinaryUploader', 'Error: Invalid image format\n  at CloudinaryStorage.upload (cloudinary.js:88)'],
    ['info',  'Socket.io: 84 drivers connected', 'SocketServer', null],
    ['warn',  'Rate limit exceeded: IP 185.12.34.56 on /api/auth/login', 'RateLimiter', null],
    ['info',  'Gift card batch GC-2024-001 issued (50 cards)', 'GiftCardsController', null],
    ['error', 'Database query timeout: orders.find() exceeded 5000ms', 'MongoDB', 'MongoServerError: operation exceeded time limit\n  at connection.js:1023'],
    ['info',  'Subscription renewal processed: user 64a2... (Tastr+)', 'SubscriptionsJob', null],
    ['warn',  'Failed login attempt: admin@tastr.app (wrong password)', 'AuthController', null],
    ['info',  'Driver dispatch: TAS-44910 assigned to driver D-0042', 'DispatchEngine', null],
  ]
  return messages.map(([level, message, service, stack], i) => ({
    _id: `log-${i}`,
    level,
    message,
    service,
    stack,
    timestamp: new Date(Date.now() - i * 4 * 60 * 1000).toISOString(),
  }))
}

const LEVEL_STYLES = {
  error: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700', icon: AlertCircle, dotBg: 'bg-red-500' },
  warn:  { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', icon: AlertTriangle, dotBg: 'bg-amber-500' },
  info:  { bg: 'bg-bg-section border-border', text: 'text-text-primary', badge: 'bg-bg-section text-text-muted', icon: Info, dotBg: 'bg-blue-400' },
}

// ─── System Logs Panel ────────────────────────────────────────────────────────
function SystemLogsPanel() {
  const [logs] = useState(generateLogs)
  const [levelFilter, setLevelFilter] = useState('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = logs.filter(l => {
    if (levelFilter && l.level !== levelFilter) return false
    if (q && !l.message.toLowerCase().includes(q.toLowerCase()) && !l.service?.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  const counts = logs.reduce((acc, l) => { acc[l.level] = (acc[l.level] || 0) + 1; return acc }, {})

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[['error', 'Errors', counts.error || 0], ['warn', 'Warnings', counts.warn || 0], ['info', 'Info', counts.info || 0]].map(([lvl, lbl, count]) => {
          const s = LEVEL_STYLES[lvl]
          return (
            <button key={lvl} onClick={() => setLevelFilter(levelFilter === lvl ? '' : lvl)}
              className={`border-2 rounded-xl p-3 text-center transition-colors cursor-pointer ${levelFilter === lvl ? `${s.bg} border-current` : 'border-border bg-bg-card hover:bg-bg-section'}`}>
              <p className={`text-2xl font-extrabold ${levelFilter === lvl ? s.text : 'text-text-primary'}`}>{count}</p>
              <p className={`text-xs font-semibold mt-0.5 ${levelFilter === lvl ? s.text : 'text-text-muted'}`}>{lbl}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-48 border border-border rounded-xl px-3 py-2 bg-bg-section">
          <Search size={14} className="text-text-muted flex-shrink-0" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search messages…"
            className="bg-transparent text-sm focus:outline-none flex-1 placeholder:text-text-muted" />
        </div>
        <div className="flex gap-1 bg-bg-section border border-border rounded-xl p-1">
          {['', 'error', 'warn', 'info'].map(lvl => (
            <button key={lvl} onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${levelFilter === lvl ? 'bg-brand-500 text-white' : 'text-text-muted hover:text-text-primary'}`}>
              {lvl || 'All'}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 border border-border px-3 py-2 rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">
          <Download size={14} /> Export
        </button>
      </div>

      {/* Log list */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-text-muted text-sm">No logs match filter</div>
          ) : filtered.map(log => {
            const s = LEVEL_STYLES[log.level] || LEVEL_STYLES.info
            const Icon = s.icon
            return (
              <div key={log._id} onClick={() => setSelected(log)}
                className="flex items-start gap-3 px-4 py-3 hover:bg-bg-section/50 transition-colors cursor-pointer">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${s.dotBg}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${s.badge}`}>{log.level}</span>
                    {log.service && <span className="text-xs text-brand-500 font-mono">{log.service}</span>}
                    <span className="text-xs text-text-muted ml-auto flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString('en-GB')}</span>
                  </div>
                  <p className="text-sm text-text-primary truncate">{log.message}</p>
                  {log.stack && <p className="text-xs text-text-muted mt-0.5 truncate font-mono">{log.stack.split('\n')[0]}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Log detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card rounded-2xl max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${LEVEL_STYLES[selected.level]?.badge || ''}`}>{selected.level}</span>
                {selected.service && <span className="text-sm font-mono text-brand-500">{selected.service}</span>}
              </div>
              <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-1">Message</p>
                <p className="text-sm text-text-primary">{selected.message}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-1">Timestamp</p>
                <p className="text-sm text-text-primary font-mono">{new Date(selected.timestamp).toLocaleString('en-GB')}</p>
              </div>
              {selected.stack && (
                <div>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-2">Stack Trace</p>
                  <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
                    {selected.stack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Audit Log Panel ─────────────────────────────────────────────────────────
function AuditLogPanel() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)

  const load = (p = 1) => {
    setLoading(true)
    api.get('/admin/audit-logs', { params: { page: p, limit: 30 } })
      .then(r => { setLogs(r.data.logs || []); setPagination(r.data) })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])

  const filtered = q
    ? logs.filter(l => l.action?.toLowerCase().includes(q.toLowerCase()) || l.adminName?.toLowerCase().includes(q.toLowerCase()) || l.targetType?.toLowerCase().includes(q.toLowerCase()))
    : logs

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-48 border border-border rounded-xl px-3 py-2 bg-bg-section">
          <Search size={14} className="text-text-muted flex-shrink-0" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search action, admin…"
            className="bg-transparent text-sm focus:outline-none flex-1 placeholder:text-text-muted" />
        </div>
        <button className="flex items-center gap-2 border border-border px-3 py-2 rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">
          <Download size={14} /> Export
        </button>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-section">
            <tr>
              {['Admin', 'Action', 'Target', 'IP', 'Timestamp', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-text-muted">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10">
                  <Shield size={28} className="text-text-muted mx-auto mb-2" />
                  <p className="text-text-muted text-sm">No audit logs yet. Logs are created when admins make changes.</p>
                </td>
              </tr>
            ) : filtered.map(log => (
              <tr key={log._id} className="border-t border-border hover:bg-bg-section/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600 flex-shrink-0">
                      {log.adminName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm text-text-primary font-medium">{log.adminName || '—'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-bg-section px-2 py-1 rounded font-mono text-brand-600">{log.action}</code>
                </td>
                <td className="px-4 py-3 text-text-muted">
                  <span className="text-xs">{log.targetType}</span>
                  {log.targetId && <span className="text-xs text-text-muted font-mono ml-1 opacity-50">#{String(log.targetId).slice(-6)}</span>}
                </td>
                <td className="px-4 py-3 text-text-muted font-mono text-xs">{log.ip || '—'}</td>
                <td className="px-4 py-3 text-text-muted text-xs">
                  {new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3">
                  {(log.before || log.after || log.notes) && (
                    <button onClick={() => setSelected(log)}
                      className="text-xs text-brand-500 font-semibold hover:text-brand-600 transition-colors">
                      Details
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pagination?.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-text-muted">Page {page} of {pagination.pages} · {pagination.total} entries</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-border rounded-lg font-semibold disabled:opacity-40 hover:bg-bg-section flex items-center gap-1">
                <ChevronLeft size={13} /> Prev
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}
                className="px-3 py-1.5 text-xs border border-border rounded-lg font-semibold disabled:opacity-40 hover:bg-bg-section flex items-center gap-1">
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card rounded-2xl max-w-lg w-full shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-text-primary">Audit Log Detail</h3>
              <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                ['Admin', selected.adminName],
                ['Action', selected.action],
                ['Target Type', selected.targetType],
                ['Target ID', selected.targetId ? String(selected.targetId) : null],
                ['IP Address', selected.ip],
                ['Timestamp', selected.createdAt ? new Date(selected.createdAt).toLocaleString('en-GB') : null],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wide">{k}</span>
                  <span className="text-sm font-semibold text-text-primary text-right max-w-64 break-all">{v}</span>
                </div>
              ))}
              {selected.after && (
                <div>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-2">After State</p>
                  <pre className="bg-bg-section rounded-xl p-3 text-xs font-mono text-text-primary overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selected.after, null, 2)}
                  </pre>
                </div>
              )}
              {selected.notes && (
                <div>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-text-primary">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tools & Logs Page ────────────────────────────────────────────────────────
export function ToolsPage() {
  const [tab, setTab] = useState(0)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Tools & Logs</h1>
        <p className="text-text-muted text-sm mt-0.5">System logs, error tracking, and admin audit trail</p>
      </div>

      <div className="flex gap-1 bg-bg-section border border-border rounded-2xl p-1">
        {TOOLS_TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === i ? 'bg-bg-card shadow-sm text-brand-600' : 'text-text-muted hover:text-text-primary'}`}>
            {i === 0 ? <Terminal size={14} /> : <Shield size={14} />} {t}
          </button>
        ))}
      </div>

      {tab === 0 && <SystemLogsPanel />}
      {tab === 1 && <AuditLogPanel />}
    </div>
  )
}

export default ToolsPage
