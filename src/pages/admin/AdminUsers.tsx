import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  ConfirmDialog,
  EmptyState,
  ErrorNotice,
  PageHeading,
  Pagination,
  PanelHeading,
  SkeletonPanel,
  formatDate,
  initials,
} from '../../components/admin/AdminUi'
import { useToast } from '../../components/admin/ToastProvider'
import {
  createUser,
  getDepartments,
  getUsers,
  updateUser,
  type CreateUserInput,
  type UpdateUserInput,
} from '../../services/adminApi'
import {
  USER_ROLES,
  roleLabel,
  type DepartmentRecord,
  type PaginationMeta,
  type UserRecord,
  type UserRole,
} from '../../types/adminPanel'

const EMPTY_META: PaginationMeta = {
  page: 1,
  pageSize: 15,
  total: 0,
  totalPages: 0,
}

type UserDialog = {
  mode: 'create' | 'edit'
  user?: UserRecord
}

type UserForm = {
  name: string
  email: string
  role: UserRole
  departmentId: string
  password: string
}

const EMPTY_FORM: UserForm = {
  name: '',
  email: '',
  role: 'field_staff',
  departmentId: '',
  password: '',
}

function AdminUsers() {
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState(searchParams.get('role') ?? '')
  const [departmentId, setDepartmentId] = useState(searchParams.get('departmentId') ?? '')
  const [unassigned, setUnassigned] = useState(searchParams.get('unassigned') === 'true')
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META)
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<UserDialog | null>(null)
  const [form, setForm] = useState<UserForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    input: UpdateUserInput
    nextRole: UserRole
  } | null>(null)

  useEffect(() => {
    getDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getUsers({
        search: search.trim(),
        role,
        departmentId: unassigned ? '' : departmentId,
        unassigned: unassigned ? 'true' : '',
        page: String(page),
        pageSize: '15',
      })

      setUsers(result.data)
      setMeta(result.meta)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load users.')
    } finally {
      setLoading(false)
    }
  }, [search, role, departmentId, unassigned, page])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [load, search])

  const activeFilterCount = [search.trim(), role, departmentId, unassigned ? 'true' : '']
    .filter(Boolean).length

  function clearFilters() {
    setSearch('')
    setRole('')
    setDepartmentId('')
    setUnassigned(false)
    setPage(1)
  }

  function openCreate() {
    setDialog({ mode: 'create' })
    setForm(EMPTY_FORM)
    setFormError('')
  }

  function openEdit(user: UserRecord) {
    setDialog({ mode: 'edit', user })
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.department?.id ?? '',
      password: '',
    })
    setFormError('')
  }

  function closeDialog() {
    if (saving) {
      return
    }

    setDialog(null)
    setPendingRoleChange(null)
  }

  async function saveUser(input: CreateUserInput | UpdateUserInput) {
    if (!dialog) {
      return
    }

    setSaving(true)
    setFormError('')

    try {
      if (dialog.mode === 'create') {
        const created = await createUser(input as CreateUserInput)
        showToast(`${created.name} added to the team.`, 'success')
      } else if (dialog.user) {
        await updateUser(dialog.user.id, input)
        showToast(`${form.name.trim() || dialog.user.name} updated.`, 'success')
      }

      setPendingRoleChange(null)
      setDialog(null)
      await load()
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'The user could not be saved.'
      setPendingRoleChange(null)
      setFormError(message)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!dialog) {
      return
    }

    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()

    if (!name) {
      setFormError('A full name is required.')
      return
    }

    if (dialog.mode === 'create' && !email) {
      setFormError('An email address is required.')
      return
    }

    if (dialog.mode === 'create' && form.password.length < 8) {
      setFormError('The initial password must be at least 8 characters.')
      return
    }

    if (dialog.mode === 'edit' && form.password && form.password.length < 8) {
      setFormError('A new password must be at least 8 characters.')
      return
    }

    if (dialog.mode === 'create') {
      await saveUser({
        name,
        email,
        password: form.password,
        role: form.role,
        department_id: form.departmentId || null,
      })
      return
    }

    const roleChanged = dialog.user && form.role !== dialog.user.role
    const input: UpdateUserInput = {
      name,
      role: form.role,
      department_id: form.departmentId || null,
      ...(form.password ? { password: form.password } : {}),
    }

    if (roleChanged) {
      setPendingRoleChange({
        input,
        nextRole: form.role,
      })
      return
    }

    await saveUser(input)
  }

  return (
    <div className="admin-page">
      <PageHeading
        eyebrow="Access control"
        title="Users"
        description="Manage staff accounts, roles, and department assignments."
        actions={(
          <>
            <button type="button" className="admin-button ghost" onClick={() => void load()} disabled={loading}>
              <i className={`bi bi-arrow-clockwise${loading ? ' spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
            <button type="button" className="admin-button primary" onClick={openCreate}>
              <i className="bi bi-person-plus" aria-hidden="true" />
              New user
            </button>
          </>
        )}
      />

      {error && <ErrorNotice message={error} onRetry={() => void load()} />}

      <section className="admin-panel admin-filter-panel">
        <div className="admin-search-field">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            aria-label="Search users"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
              <i className="bi bi-x-circle" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="admin-filter-grid admin-filter-grid-three">
          <label className="admin-filter-field">
            <span>Role</span>
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All roles</option>
              {USER_ROLES.map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}
            </select>
          </label>

          <label className="admin-filter-field">
            <span>Department</span>
            <select
              value={unassigned ? '__unassigned' : departmentId}
              onChange={(event) => {
                const value = event.target.value
                setUnassigned(value === '__unassigned')
                setDepartmentId(value === '__unassigned' ? '' : value)
                setPage(1)
              }}
            >
              <option value="">All departments</option>
              <option value="__unassigned">Unassigned</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="admin-filter-clear"
            onClick={clearFilters}
            disabled={activeFilterCount === 0}
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
            Clear{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>
      </section>

      <section className="admin-panel admin-table-panel">
        <PanelHeading
          title="All users"
          description={`${meta.total} account${meta.total === 1 ? '' : 's'} found`}
          action={(
            <span className="admin-panel-chip">
              <i className="bi bi-shield-check" aria-hidden="true" />
              {activeFilterCount > 0 ? `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}` : 'All accounts'}
            </span>
          )}
        />

        {loading && users.length === 0 ? (
          <SkeletonPanel rows={8} />
        ) : users.length === 0 ? (
          <EmptyState
            icon="bi-people"
            title="No users match"
            text="Try adjusting the search or clearing the active filters."
            action={activeFilterCount > 0 ? (
              <button type="button" className="admin-button ghost" onClick={clearFilters}>Clear filters</button>
            ) : undefined}
          />
        ) : (
          <>
            <div className={`admin-table-wrap${loading ? ' is-loading' : ''}`}>
              <table className="admin-table admin-users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Reports</th>
                    <th>Joined</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="admin-user-cell">
                          <span className="admin-avatar table" aria-hidden="true">{initials(user.name)}</span>
                          <div>
                            <b>{user.name}</b>
                            <small>{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-role-badge role-${user.role}`}>
                          {roleLabel(user.role_full ?? user.role)}
                        </span>
                      </td>
                      <td>
                        {user.department?.name ?? <span className="admin-muted">Unassigned</span>}
                      </td>
                      <td>
                        {user.reportCount} submitted
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <button type="button" className="admin-inline-action" onClick={() => openEdit(user)}>
                          <i className="bi bi-pencil-square" aria-hidden="true" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination meta={meta} onPageChange={setPage} />
          </>
        )}
      </section>

      {dialog && (
        <div className="admin-modal-overlay" role="presentation" onMouseDown={closeDialog}>
          <form
            className="admin-modal admin-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => void handleSubmit(event)}
          >
            <span className="admin-modal-icon primary">
              <i className={`bi ${dialog.mode === 'create' ? 'bi-person-plus' : 'bi-person-gear'}`} aria-hidden="true" />
            </span>
            <h2 id="user-dialog-title">
              {dialog.mode === 'create' ? 'New user' : `Edit ${dialog.user?.name}`}
            </h2>
            <p>
              {dialog.mode === 'create'
                ? 'Create a staff account and assign its role and department.'
                : 'Update account details, access level, or reset the password.'}
            </p>

            <div className="admin-form-grid">
              <label className="admin-field">
                <span>Full name</span>
                <div className="admin-input-wrap">
                  <i className="bi bi-person" aria-hidden="true" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    maxLength={120}
                    required
                    autoFocus
                  />
                </div>
              </label>

              <label className="admin-field">
                <span>Email address</span>
                <div className="admin-input-wrap">
                  <i className="bi bi-envelope" aria-hidden="true" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    maxLength={160}
                    disabled={dialog.mode === 'edit'}
                    required
                  />
                </div>
              </label>

              <label className="admin-field">
                <span>Role</span>
                <select
                  className="admin-form-select"
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}
                >
                  {USER_ROLES.map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}
                </select>
              </label>

              <label className="admin-field">
                <span>Department</span>
                <select
                  className="admin-form-select"
                  value={form.departmentId}
                  onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="admin-field">
              <span>{dialog.mode === 'create' ? 'Initial password' : 'New password (optional)'}</span>
              <div className="admin-input-wrap">
                <i className="bi bi-lock" aria-hidden="true" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  minLength={form.password ? 8 : undefined}
                  maxLength={72}
                  placeholder={dialog.mode === 'edit' ? 'Leave blank to keep the current password' : 'At least 8 characters'}
                  required={dialog.mode === 'create'}
                  autoComplete="new-password"
                />
              </div>
            </label>

            {formError && (
              <div className="admin-login-error" role="alert">
                <i className="bi bi-exclamation-circle" aria-hidden="true" />
                {formError}
              </div>
            )}

            <div className="admin-modal-actions">
              <button type="button" className="admin-button ghost" onClick={closeDialog} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="admin-button primary" disabled={saving}>
                {saving ? <span className="admin-spinner small" aria-hidden="true" /> : <i className="bi bi-check2" aria-hidden="true" />}
                {dialog.mode === 'create' ? 'Create user' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingRoleChange)}
        title="Change this user's role?"
        message={dialog?.user && pendingRoleChange
          ? `${dialog.user.name}'s access will change from ${roleLabel(dialog.user.role)} to ${roleLabel(pendingRoleChange.nextRole)}. This affects what they can see and do in ReportHub.`
          : ''}
        confirmLabel="Change role"
        busy={saving}
        onConfirm={() => {
          if (pendingRoleChange) {
            void saveUser(pendingRoleChange.input)
          }
        }}
        onCancel={() => setPendingRoleChange(null)}
      />
    </div>
  )
}

export default AdminUsers
