import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserPlus, Pencil, Trash2, ShieldCheck, Plus, X, Check, ChevronDown, Users
} from 'lucide-react'
import api from '../../services/api.js'

// ─── Permission Matrix ────────────────────────────────────────────────────────
const PERMS = [
  { key: 'VIEW_ORDERS',     label: 'View Orders' },
  { key: 'MANAGE_ORDERS',   label: 'Manage Orders' },
  { key: 'MANAGE_MENU',     label: 'Manage Menu' },
  { key: 'VIEW_REPORTS',    label: 'View Reports' },
  { key: 'MANAGE_STAFF',    label: 'Manage Staff' },
  { key: 'MANAGE_MARKETING',label: 'Marketing' },
  { key: 'MANAGE_SETTINGS', label: 'Settings' },
  { key: 'VIEW_FINANCE',    label: 'Finance' },
]

// ─── Role Modal ───────────────────────────────────────────────────────────────
function RoleModal({ role, onSave, onClose }) {
  const [name, setName] = useState(role?.name || '')
  const [perms, setPerms] = useState(new Set(role?.permissions || []))
  const [saving, setSaving] = useState(false)

  const toggle = p => setPerms(s => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n })

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const payload = { name, permissions: [...perms] }
      const res = role
        ? await api.put(`/restaurants/staff/roles/${role._id}`, payload)
        : await api.post('/restaurants/staff/roles', payload)
      onSave(res.data.role)
    } catch (e) { alert(e.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">{role ? 'Edit Role' : 'Create Role'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
        </div>
        <div className="mb-4">
          <label className="text-sm font-semibold text-text-primary mb-1.5 block">Role Name <span className="text-red-500">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kitchen Manager"
            className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section" />
        </div>
        <div className="mb-5">
          <p className="text-sm font-semibold text-text-primary mb-3">Permissions</p>
          <div className="space-y-2">
            {PERMS.map(p => (
              <label key={p.key} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-bg-section transition-colors">
                <div onClick={() => toggle(p.key)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer
                    ${perms.has(p.key) ? 'bg-brand-500 border-brand-500' : 'border-border bg-bg-card'}`}>
                  {perms.has(p.key) && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-sm text-text-primary">{p.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving}
            className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Role'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Staff Page ────────────────────────────────────────────────────────────────
export function StaffPage() {
  const navigate = useNavigate()
  const [staff, setStaff] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editRole, setEditRole] = useState(null)  // {staffId, currentRole}
  const [roleModal, setRoleModal] = useState(false)

  const load = async () => {
    try {
      const [sRes, rRes] = await Promise.all([
        api.get('/restaurants/staff'),
        api.get('/restaurants/staff/roles'),
      ])
      setStaff(sRes.data.staff || [])
      setRoles(rRes.data.roles || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleRemove = async (staffId, name) => {
    if (!confirm(`Remove ${name} from staff?`)) return
    await api.delete(`/restaurants/staff/${staffId}`)
    setStaff(s => s.filter(m => m._id !== staffId))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Staff</h1>
          <p className="text-text-muted text-sm mt-0.5">{staff.length} member{staff.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setRoleModal(true)}
            className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-bg-section transition-colors">
            <ShieldCheck size={15} /> Manage Roles
          </button>
          <button onClick={() => navigate('/staff/invite')}
            className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
            <UserPlus size={15} /> Invite Staff
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-bg-section flex items-center justify-center mx-auto mb-4">
            <Users size={24} className="text-text-muted" />
          </div>
          <h3 className="font-bold text-text-primary mb-1">No staff yet</h3>
          <p className="text-text-muted text-sm mb-4">Invite team members to help manage your restaurant.</p>
          <button onClick={() => navigate('/staff/invite')}
            className="bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
            Invite First Staff Member
          </button>
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-section">
              <tr>
                {['Name', 'Role', 'Last Active', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map(m => (
                <tr key={m._id} className="border-t border-border hover:bg-bg-section/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600 flex-shrink-0">
                        {m.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">{m.name}</p>
                        <p className="text-xs text-text-muted">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-600">
                      {m.role?.replace('_', ' ') || 'Staff'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleDateString('en-GB') : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${m.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {m.status || 'PENDING'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleRemove(m._id, m.name)}
                        className="p-1.5 text-text-muted hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {roleModal && (
        <RolesModal roles={roles} onClose={() => setRoleModal(false)} onRefresh={load} />
      )}
    </div>
  )
}

// ─── Roles Modal (inline) ─────────────────────────────────────────────────────
function RolesModal({ roles, onClose, onRefresh }) {
  const [list, setList] = useState(roles)
  const [editingRole, setEditingRole] = useState(null)
  const [creating, setCreating] = useState(false)

  const handleDelete = async (role) => {
    if (role.isSystem || !confirm(`Delete role "${role.name}"?`)) return
    await api.delete(`/restaurants/staff/roles/${role._id}`)
    setList(l => l.filter(r => r._id !== role._id))
    onRefresh()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">Roles</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
        </div>
        <div className="space-y-2 mb-4">
          {list.map(role => (
            <div key={role._id} className="flex items-center justify-between p-3 border border-border rounded-xl hover:bg-bg-section transition-colors">
              <div>
                <p className="text-sm font-semibold text-text-primary">{role.name}</p>
                <p className="text-xs text-text-muted">{role.permissions?.length || 0} permissions</p>
              </div>
              <div className="flex gap-2">
                {!role.isSystem && (
                  <>
                    <button onClick={() => setEditingRole(role)} className="p-1.5 text-text-muted hover:text-brand-500 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(role)} className="p-1.5 text-text-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </>
                )}
                {role.isSystem && <span className="text-xs text-text-muted px-2 py-1 bg-bg-section rounded-lg">System</span>}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setCreating(true)}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-brand-400 text-brand-500 py-3 rounded-xl text-sm font-semibold hover:bg-brand-50 transition-colors">
          <Plus size={16} /> Create New Role
        </button>
      </div>
      {(editingRole || creating) && (
        <RoleModal
          role={editingRole}
          onSave={savedRole => {
            setList(l => editingRole ? l.map(r => r._id === savedRole._id ? savedRole : r) : [...l, savedRole])
            setEditingRole(null); setCreating(false); onRefresh()
          }}
          onClose={() => { setEditingRole(null); setCreating(false) }}
        />
      )}
    </div>
  )
}

// ─── Invite Staff Page ────────────────────────────────────────────────────────
export function InviteStaffPage() {
  const navigate = useNavigate()
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState({ email: '', roleId: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/restaurants/staff/roles').then(r => setRoles(r.data.roles || [])).catch(() => {})
  }, [])

  const handleInvite = async () => {
    if (!form.email) return
    setLoading(true); setError('')
    try {
      await api.post('/restaurants/staff', { email: form.email, roleId: form.roleId })
      setSuccess(true)
    } catch (e) { setError(e.response?.data?.message || 'Failed to invite') }
    finally { setLoading(false) }
  }

  if (success) return (
    <div className="max-w-md mx-auto text-center pt-16">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <Check size={28} className="text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">Invitation Sent</h2>
      <p className="text-text-muted text-sm mb-8">{form.email} will receive an invite to join your team.</p>
      <div className="flex gap-3 justify-center">
        <button onClick={() => navigate('/staff')} className="px-5 py-2.5 bg-brand-500 text-white font-bold rounded-xl text-sm hover:bg-brand-600 transition-colors">Back to Staff</button>
        <button onClick={() => { setSuccess(false); setForm({ email: '', roleId: '' }) }}
          className="px-5 py-2.5 border border-border text-text-primary font-bold rounded-xl text-sm hover:bg-bg-section transition-colors">Invite Another</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-md">
      <button onClick={() => navigate('/staff')} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm mb-6 transition-colors">
        ← Back to Staff
      </button>
      <h1 className="text-2xl font-bold text-text-primary mb-1">Invite Staff Member</h1>
      <p className="text-text-muted text-sm mb-6">They'll receive an email to set up their account.</p>

      <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-sm font-semibold text-text-primary mb-1.5 block">Email Address <span className="text-red-500">*</span></label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="staff@example.com"
            className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section" />
        </div>
        <div>
          <label className="text-sm font-semibold text-text-primary mb-1.5 block">Role</label>
          <select value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}
            className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none bg-bg-section appearance-none">
            <option value="">Select a role…</option>
            {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
        </div>
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
        <button onClick={handleInvite} disabled={!form.email || loading}
          className="w-full bg-brand-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-brand-600 transition-colors disabled:opacity-50">
          {loading ? 'Sending…' : 'Send Invitation'}
        </button>
      </div>
    </div>
  )
}

export default StaffPage
