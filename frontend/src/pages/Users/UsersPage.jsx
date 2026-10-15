import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Search, ShieldCheck, ToggleLeft, ToggleRight, UsersRound } from 'lucide-react'
import { authService } from '../../auth/authService'
import { useAuth } from '../../auth/useAuth'
import { usePermissions } from '../../auth/usePermissions'
import { ROLE_OPTIONS, ROLES } from '../../config/roles'
import { useApp } from '../../context/useApp'
import { Button, Modal, PageHeader } from '../../components/common/UI'
import { apiFor } from '../../api/resourcesApi'

const emptyUser = { name: '', email: '', role: ROLES.SALES_EXECUTIVE, status: 'Active', teamId: '', clientId: '' }

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const { hasPermission } = usePermissions()
  const { notify } = useApp()
  const [users, setUsers] = useState([])
  const [clients, setClients] = useState([])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState(emptyUser)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [userRecords, clientRecords] = await Promise.all([authService.listUsers(), apiFor.clients.list()])
      setUsers(userRecords)
      setClients(clientRecords)
    }
    catch (cause) { notify(cause.message || 'Could not load demo users.', 'error') }
  }, [notify])
  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])
  const visibleUsers = users.filter((person) => `${person.name} ${person.email} ${person.role}`.toLowerCase().includes(query.toLowerCase()))

  function openEditor(person = null) {
    setEditing(person)
    setEditorOpen(true)
    setForm(person ? { ...person } : { ...emptyUser })
    setError('')
  }
  async function save(event) {
    event.preventDefault()
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Enter a valid email address.'); return }
    if (!ROLE_OPTIONS.some((option) => option.value === form.role)) { setError('Select a valid role.'); return }
    if (form.role === ROLES.CLIENT && !form.clientId) { setError('Select a client account for Client role access.'); return }
    if (editing?.id === currentUser.id && form.role !== currentUser.role) { setError('You cannot change your own role.'); return }
    try {
      await authService.saveUser({
        ...form,
        name: form.name.trim(),
        assignedLeadIds: typeof form.assignedLeadIds === 'string' ? form.assignedLeadIds.split(',').map((item) => item.trim()).filter(Boolean) : form.assignedLeadIds,
        assignedProjectIds: typeof form.assignedProjectIds === 'string' ? form.assignedProjectIds.split(',').map((item) => item.trim()).filter(Boolean) : form.assignedProjectIds,
        ...(form.role === ROLES.CLIENT ? {} : { clientId: undefined }),
        ...(form.role === ROLES.SALES_EXECUTIVE && !form.assignedLeadIds ? { assignedLeadIds: [] } : {}),
      })
      setEditorOpen(false)
      notify(editing ? 'Demo user updated.' : 'Demo user created.')
      await load()
    } catch (cause) { setError(cause.message || 'Could not save the demo user.') }
  }
  async function toggleStatus(person) {
    try {
      await authService.removeUser(person.id, currentUser.id)
      notify(`Demo account ${person.status === 'Active' ? 'deactivated' : 'activated'}.`)
      await load()
    } catch (cause) { notify(cause.message, 'error') }
  }

  return <div className="page">
    <PageHeader title="Users & access" description="Manage local demo accounts and their assigned CRM roles."
      actions={hasPermission('users.manage') && <Button onClick={() => openEditor()}><Plus size={16} /> Create demo user</Button>} />
    <div className="prototype-callout"><ShieldCheck size={17} /> Demo users and role changes are stored in this browser only. This is not production user provisioning.</div>
    <section className="panel records-panel">
      <div className="table-toolbar"><div className="table-search"><Search size={16} /><input aria-label="Search users" placeholder="Search name, email, or role…" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th className="no-print">Actions</th></tr></thead>
        <tbody>{visibleUsers.map((person) => <tr key={person.id}><td><strong className="table-primary">{person.name}</strong></td><td>{person.email}</td><td>{ROLE_OPTIONS.find((option) => option.value === person.role)?.label || 'Invalid role'}</td><td><span className={`badge badge-${person.status.toLowerCase()}`}>{person.status}</span></td>
          <td className="no-print">{hasPermission('users.manage') && <div className="row-actions"><button title="Edit user" aria-label={`Edit ${person.name}`} onClick={() => openEditor(person)}><Pencil size={16} /></button><button title={person.status === 'Active' ? 'Deactivate user' : 'Activate user'} aria-label={`${person.status === 'Active' ? 'Deactivate' : 'Activate'} ${person.name}`} className={person.status === 'Active' ? 'danger-action' : ''} onClick={() => toggleStatus(person)}>{person.status === 'Active' ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}</button></div>}</td>
        </tr>)}</tbody></table></div>
      {!visibleUsers.length && <div className="empty-state"><UsersRound size={24} /><strong>No demo users found</strong><span>Change the search term or create a user.</span></div>}
    </section>
    {editorOpen && <Modal title={editing ? 'Edit demo user' : 'Create demo user'} description="These changes affect only mock accounts in this browser." onClose={() => setEditorOpen(false)}>
      <form className="record-form" onSubmit={save}><div className="form-grid">
        <label className="form-field"><span>Name *</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="form-field"><span>Email *</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label className="form-field"><span>Role *</span><select value={form.role} disabled={editing?.id === currentUser.id} onChange={(event) => setForm({ ...form, role: event.target.value })}>{ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        {form.role === ROLES.CLIENT && <label className="form-field"><span>Linked client account *</span><select value={form.clientId || ''} onChange={(event) => setForm({ ...form, clientId: event.target.value })}><option value="">Select client…</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.name} · {client.company}</option>)}</select></label>}
        {!editing && <p className="form-note field-full">New mock accounts use the shared demo password displayed on the sign-in page. Passwords are not saved in this user list.</p>}
        {form.role === ROLES.SALES_EXECUTIVE && <label className="form-field field-full"><span>Assigned lead IDs (comma separated)</span><input value={(form.assignedLeadIds || []).join(', ')} onChange={(event) => setForm({ ...form, assignedLeadIds: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="e.g. LD-1048, LD-1047" /></label>}
        {form.role === ROLES.PROJECT_MANAGER && <label className="form-field field-full"><span>Assigned project IDs (comma separated)</span><input value={(form.assignedProjectIds || []).join(', ')} onChange={(event) => setForm({ ...form, assignedProjectIds: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="e.g. PR-126" /></label>}
        {form.role === ROLES.DEVELOPER && <label className="form-field field-full"><span>Assigned task IDs (comma separated)</span><input value={(form.assignedTaskIds || []).join(', ')} onChange={(event) => setForm({ ...form, assignedTaskIds: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="e.g. TS-512" /></label>}
      </div>{error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEditorOpen(false)}>Cancel</Button><Button type="submit">{editing ? 'Save changes' : 'Create user'}</Button></div>
      </form>
    </Modal>}
  </div>
}
