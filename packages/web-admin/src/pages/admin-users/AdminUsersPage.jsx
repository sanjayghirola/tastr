import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Shield, UserPlus, Check, X, Eye, EyeOff } from 'lucide-react'
import { Badge } from '../../components/global/index.jsx'
import api from '../../services/api.js'

const ADMIN_TABS = ['Sub-Admins', 'Roles & Permissions']

// ─── Permission Matrix ────────────────────────────────────────────────────────
const PERMISSION_SECTIONS = [
  {
    label: 'Restaurants',
    perms: ['VIEW_RESTAURANTS', 'MANAGE_RESTAURANTS'],
  },
  {
    label: 'Orders',
    perms: ['VIEW_ORDERS', 'MANAGE_ORDERS'],
  },
  {
    label: 'Customers',
    perms: ['VIEW_CUSTOMERS', 'MANAGE_CUSTOMERS'],
  },
  {
    label: 'Drivers',
    perms: ['VIEW_DRIVERS', 'MANAGE_DRIVERS'],
  },
  {
    label: 'Finance',
    perms: ['VIEW_FINANCE', 'MANAGE_FINANCE'],
  },
  {
    label: 'Marketing / Promos',
    perms: ['MANAGE_PROMOS'],
  },
  {
    label: 'CMS & Content',
    perms: ['MANAGE_CMS'],
  },
  {
    label: 'Logs & Audit',
    perms: ['VIEW_LOGS'],
  },
  {
    label: 'Admin Users',
    perms: ['MANAGE_ADMINS'],
  },
]

// ─── Role Permission Grid Modal ───────────────────────────────────────────────
function RoleModal({ role, onSave, onClose }) {
  const [name, setName] = useState(role?.name || '')
  const [perms, setPerms] = useState(new Set(role?.permissions || []))
  const [saving, setSaving] = useState(false)

  const toggle = (p) => setPerms(s => {
    const n = new Set(s)
    n.has(p) ? n.delete(p) : n.add(p)
    return n
  })

  const selectAll = (section) => {
    setPerms(s => {
      const n = new Set(s)
      section.perms.forEach(p => n.add(p))
      return n
    })
  }

  const clearAll = (section) => {
    setPerms(s => {
      const n = new Set(s)
      section.perms.forEach(p => n.delete(p))
      return n
    })
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const payload = { name, permissions: [...perms] }
      if (role?._id) await api.put(`/admin/roles/${role._id}`, payload)
      else await api.post('/admin/roles', payload)
      onSave()
    } catch (e) { alert(e.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-bg-card rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-bg-card z-10">
          <h2 className="text-lg font-bold text-text-primary">{role ? 'Edit Role' : 'Create Admin Role'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg-section flex items-center justify-center text-text-muted hover:text-text-primary">
            <X size={15} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-sm font-semibold text-text-primary mb-1.5 block">Role Name <span className="text-red-500">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Support Agent"
              className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section" />
          </div>

          <div>
            <p className="text-sm font-semibold text-text-primary mb-3">Permission Matrix</p>
            <div className="space-y-3">
              {PERMISSION_SECTIONS.map(section => {
                const allChecked = section.perms.every(p => perms.has(p))
                return (
                  <div key={section.label} className="border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-bg-section">
                      <p className="text-xs font-bold text-text-primary uppercase tracking-wide">{section.label}</p>
                      <button onClick={() => allChecked ? clearAll(section) : selectAll(section)}
                        className="text-xs text-brand-500 font-semibold hover:text-brand-600 transition-colors">
                        {allChecked ? 'Clear all' : 'Select all'}
                      </button>
                    </div>
                    <div className="px-4 py-2 flex flex-wrap gap-2">
                      {section.perms.map(p => (
                        <label key={p} className="flex items-center gap-2 cursor-pointer py-1">
                          <div onClick={() => toggle(p)}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors
                              ${perms.has(p) ? 'bg-brand-500 border-brand-500' : 'border-border bg-white'}`}>
                            {perms.has(p) && <Check size={10} className="text-white" strokeWidth={3} />}
                          </div>
                          <span className="text-xs text-text-primary font-mono">{p.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="text-xs text-text-muted">{perms.size} permission{perms.size !== 1 ? 's' : ''} selected</p>
        </div>

        <div className="flex gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving}
            className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : role ? 'Save Role' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Sub-Admin Modal ────────────────────────────────────────────────────
function CreateAdminModal({ roles, onSave, onClose }) {
  const [f, setF] = useState({ name: '', email: '', password: '', permissions: [] })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      await api.post('/admin/sub-admins', f)
      onSave()
    } catch (e) { setError(e.response?.data?.message || 'Failed to create admin') }
    finally { setSaving(false) }
  }

  const inp = "w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-bg-card rounded-2xl max-w-sm w-full shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">Create Sub-Admin</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg-section flex items-center justify-center text-text-muted"><X size={15} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Full Name</label>
            <input value={f.name} onChange={e => set('name', e.target.value)} className={inp} placeholder="Jane Doe" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Email</label>
            <input type="email" value={f.email} onChange={e => set('email', e.target.value)} className={inp} placeholder="jane@tastr.app" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Temporary Password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={f.password} onChange={e => set('password', e.target.value)}
                className={inp + ' pr-10'} placeholder="Min. 8 characters" />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section">Cancel</button>
          <button onClick={handleSave} disabled={!f.name || !f.email || f.password.length < 8 || saving}
            className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Admin'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-Admins Panel ─────────────────────────────────────────────────────────
function SubAdminsPanel({ roles, onRefresh }) {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = () => {
    api.get('/admin/sub-admins')
      .then(r => setAdmins(r.data.admins || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{admins.length} sub-admin{admins.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
          <UserPlus size={15} /> Add Sub-Admin
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : admins.length === 0 ? (
        <div className="bg-bg-section border border-dashed border-border rounded-2xl p-10 text-center">
          <Shield size={28} className="text-text-muted mx-auto mb-3" />
          <p className="font-semibold text-text-primary mb-1">No sub-admins yet</p>
          <p className="text-text-muted text-sm">Create accounts for your support or operations team.</p>
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-section">
              <tr>
                {['Admin', 'Permissions', 'Last Login', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map(a => (
                <tr key={a._id} className="border-t border-border hover:bg-bg-section/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600 flex-shrink-0">
                        {a.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">{a.name}</p>
                        <p className="text-xs text-text-muted">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    <span className="text-xs bg-bg-section px-2 py-1 rounded-lg">{a.permissions?.length || 0} permissions</span>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleDateString('en-GB') : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={a.status === 'ACTIVE' ? 'success' : 'neutral'}>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          const newStatus = a.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                          await api.patch(`/admin/sub-admins/${a._id}`, { status: newStatus })
                          load()
                        }}
                        className="p-1.5 text-text-muted hover:text-amber-500 transition-colors" title="Toggle status">
                        <Shield size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateAdminModal roles={roles} onSave={() => { load(); setShowCreate(false) }} onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}

// ─── Roles Panel ──────────────────────────────────────────────────────────────
function RolesPanel() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | roleObj

  const load = () => {
    api.get('/admin/roles')
      .then(r => setRoles(r.data.roles || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{roles.length} role{roles.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
          <Plus size={15} /> Create Role
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : roles.length === 0 ? (
        <div className="bg-bg-section border border-dashed border-border rounded-2xl p-10 text-center">
          <Shield size={28} className="text-text-muted mx-auto mb-3" />
          <p className="font-semibold text-text-primary">No roles defined yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map(r => (
            <div key={r._id} className="bg-bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-text-primary">{r.name}</h3>
                  <p className="text-xs text-text-muted">{r.permissions?.length || 0} permissions</p>
                </div>
                <button onClick={() => setModal(r)}
                  className="flex items-center gap-2 border border-border px-3 py-2 rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">
                  <Pencil size={13} /> Edit
                </button>
              </div>
              {r.permissions?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {r.permissions.slice(0, 8).map(p => (
                    <span key={p} className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 text-xs font-mono">
                      {p.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {r.permissions.length > 8 && (
                    <span className="px-2 py-0.5 rounded-full bg-bg-section text-text-muted text-xs">
                      +{r.permissions.length - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <RoleModal role={modal === 'create' ? null : modal}
          onSave={() => { load(); setModal(null) }}
          onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ─── Admin Users Page ─────────────────────────────────────────────────────────
export function AdminUsersPage() {
  const [tab, setTab] = useState(0)
  const [roles, setRoles] = useState([])

  useEffect(() => {
    api.get('/admin/roles').then(r => setRoles(r.data.roles || [])).catch(() => {})
  }, [])

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Admin Users & Roles</h1>
        <p className="text-text-muted text-sm mt-0.5">Manage sub-admins and their permission roles</p>
      </div>

      <div className="flex gap-1 bg-bg-section border border-border rounded-2xl p-1">
        {ADMIN_TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === i ? 'bg-bg-card shadow-sm text-brand-600' : 'text-text-muted hover:text-text-primary'}`}>
            {i === 0 ? <UserPlus size={14} /> : <Shield size={14} />} {t}
          </button>
        ))}
      </div>

      {tab === 0 && <SubAdminsPanel roles={roles} onRefresh={() => {}} />}
      {tab === 1 && <RolesPanel />}
    </div>
  )
}

export default AdminUsersPage
