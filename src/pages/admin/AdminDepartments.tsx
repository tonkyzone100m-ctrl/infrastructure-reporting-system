import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'

import {
  EmptyState,
  ErrorNotice,
  PageHeading,
  PanelHeading,
  SkeletonPanel,
  formatDate,
} from '../../components/admin/AdminUi'
import { useToast } from '../../components/admin/ToastProvider'
import {
  createDepartment,
  getDepartments,
  renameDepartment,
} from '../../services/adminApi'
import type { DepartmentRecord } from '../../types/adminPanel'

type DialogState = {
  mode: 'create' | 'rename'
  department?: DepartmentRecord
}

function AdminDepartments() {
  const { showToast } = useToast()
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setDepartments(await getDepartments())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load departments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!dialog) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) {
        setDialog(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dialog, saving])

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return departments
    }

    return departments.filter((department) => department.name.toLowerCase().includes(query))
  }, [departments, search])

  const totals = useMemo(() => ({
    users: departments.reduce((sum, department) => sum + department.userCount, 0),
    reports: departments.reduce((sum, department) => sum + department.reportCount, 0),
    open: departments.reduce((sum, department) => sum + department.openReportCount, 0),
  }), [departments])

  function openCreate() {
    setDialog({ mode: 'create' })
    setName('')
    setFormError('')
  }

  function openRename(department: DepartmentRecord) {
    setDialog({ mode: 'rename', department })
    setName(department.name)
    setFormError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!dialog) {
      return
    }

    const trimmedName = name.trim()

    if (!trimmedName) {
      setFormError('A department name is required.')
      return
    }

    setSaving(true)
    setFormError('')

    try {
      if (dialog.mode === 'create') {
        const created = await createDepartment(trimmedName)
        setDepartments((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
        showToast(`${created.name} created.`, 'success')
      } else if (dialog.department) {
        const updated = await renameDepartment(dialog.department.id, trimmedName)
        setDepartments((current) => current
          .map((department) => department.id === updated.id ? updated : department)
          .sort((a, b) => a.name.localeCompare(b.name)))
        showToast('Department renamed.', 'success')
      }

      setDialog(null)
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'The department could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <PageHeading
        eyebrow="Service structure"
        title="Departments"
        description="Maintain the teams responsible for resolving city reports."
        actions={(
          <>
            <button type="button" className="admin-button ghost" onClick={() => void load()} disabled={loading}>
              <i className={`bi bi-arrow-clockwise${loading ? ' spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
            <button type="button" className="admin-button primary" onClick={openCreate}>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              New department
            </button>
          </>
        )}
      />

      {error && <ErrorNotice message={error} onRetry={() => void load()} />}

      <div className="admin-stat-grid three">
        <div className="admin-stat-card">
          <div className="admin-stat-top">
            <span className="admin-stat-icon green"><i className="bi bi-buildings" aria-hidden="true" /></span>
          </div>
          <strong>{departments.length}</strong>
          <span className="admin-stat-label">Departments</span>
          <small>Active service teams</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-top">
            <span className="admin-stat-icon blue"><i className="bi bi-people" aria-hidden="true" /></span>
          </div>
          <strong>{totals.users}</strong>
          <span className="admin-stat-label">Assigned staff</span>
          <small>Across all departments</small>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-top">
            <span className="admin-stat-icon orange"><i className="bi bi-file-earmark-text" aria-hidden="true" /></span>
          </div>
          <strong>{totals.reports}</strong>
          <span className="admin-stat-label">Assigned reports</span>
          <small>{totals.open} still open</small>
        </div>
      </div>

      <section className="admin-panel admin-table-panel">
        <PanelHeading
          title="All departments"
          description={`${departments.length} department${departments.length === 1 ? '' : 's'} configured`}
          action={(
            <div className="admin-compact-search">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                placeholder="Find a department…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search departments"
              />
            </div>
          )}
        />

        {loading && departments.length === 0 ? (
          <SkeletonPanel rows={7} />
        ) : filteredDepartments.length === 0 ? (
          <EmptyState
            icon="bi-buildings"
            title={departments.length === 0 ? 'No departments yet' : 'No departments match'}
            text={departments.length === 0
              ? 'Create the first service department to start assigning reports.'
              : 'Try a different department name.'}
            action={departments.length === 0 ? (
              <button type="button" className="admin-button primary" onClick={openCreate}>
                <i className="bi bi-plus-lg" aria-hidden="true" />
                New department
              </button>
            ) : undefined}
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-department-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Staff</th>
                  <th>Reports</th>
                  <th>Open</th>
                  <th>Resolved</th>
                  <th>Created</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((department) => (
                  <tr key={department.id}>
                    <td>
                      <b>{department.name}</b>
                      <small>Department #{department.id}</small>
                    </td>
                    <td>
                      <Link to={`/admin/users?departmentId=${department.id}`} className="admin-table-link">
                        {department.userCount} staff
                      </Link>
                    </td>
                    <td>
                      <Link to={`/admin/reports?departmentId=${department.id}`} className="admin-table-link">
                        {department.reportCount} reports
                      </Link>
                    </td>
                    <td>{department.openReportCount}</td>
                    <td>{department.resolvedReportCount}</td>
                    <td>{formatDate(department.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-inline-action"
                        onClick={() => openRename(department)}
                      >
                        <i className="bi bi-pencil" aria-hidden="true" />
                        Rename
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dialog && (
        <div className="admin-modal-overlay" role="presentation" onMouseDown={() => !saving && setDialog(null)}>
          <form
            className="admin-modal admin-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="department-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => void handleSubmit(event)}
          >
            <span className="admin-modal-icon primary">
              <i className={`bi ${dialog.mode === 'create' ? 'bi-plus-lg' : 'bi-pencil'}`} aria-hidden="true" />
            </span>
            <h2 id="department-dialog-title">
              {dialog.mode === 'create' ? 'New department' : 'Rename department'}
            </h2>
            <p>
              {dialog.mode === 'create'
                ? 'Create a service team that reports can be assigned to.'
                : 'Update the department name used across the admin panel.'}
            </p>

            <label className="admin-field">
              <span>Department name</span>
              <div className="admin-input-wrap">
                <i className="bi bi-buildings" aria-hidden="true" />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                  placeholder="e.g. Public Lighting"
                  required
                  autoFocus
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
              <button type="button" className="admin-button ghost" onClick={() => setDialog(null)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="admin-button primary" disabled={saving || !name.trim()}>
                {saving ? <span className="admin-spinner small" aria-hidden="true" /> : <i className="bi bi-check2" aria-hidden="true" />}
                {dialog.mode === 'create' ? 'Create department' : 'Save name'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default AdminDepartments
