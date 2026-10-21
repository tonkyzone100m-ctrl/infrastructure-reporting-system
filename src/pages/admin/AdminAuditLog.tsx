import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  EmptyState,
  ErrorNotice,
  PageHeading,
  Pagination,
  PanelHeading,
  SkeletonPanel,
  formatDateTime,
} from '../../components/admin/AdminUi'
import { getAuditLog } from '../../services/adminApi'
import type { AuditRecord, PaginationMeta } from '../../types/adminPanel'

const EMPTY_META: PaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
}

const ACTION_SUGGESTIONS = [
  'user_created',
  'user.role_changed',
  'user.department_id_changed',
  'user.name_changed',
  'user.password_changed',
  'department.created',
  'department.renamed',
  'report.status_changed',
  'report.priority_changed',
  'report.department_id_changed',
  'report.assigned_to_changed',
  'report.sla_deadline_changed',
  'report.comment_added',
]

function humanizeAction(action: string): string {
  return action
    .replaceAll('_', ' ')
    .replaceAll('.', ' · ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function entityLink(entry: AuditRecord): string | null {
  if (!entry.entityId) {
    return null
  }

  if (entry.entityType === 'report') {
    return `/admin/reports/${entry.entityId}`
  }

  if (entry.entityType === 'department') {
    return '/admin/departments'
  }

  if (entry.entityType === 'user') {
    return '/admin/users'
  }

  return null
}

function AdminAuditLog() {
  const [actor, setActor] = useState('')
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [entries, setEntries] = useState<AuditRecord[]>([])
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getAuditLog({
        actor: actor.trim(),
        action: action.trim(),
        entityType,
        from,
        to,
        page: String(page),
        pageSize: '20',
      })

      setEntries(result.data)
      setMeta(result.meta)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the audit log.')
    } finally {
      setLoading(false)
    }
  }, [actor, action, entityType, from, to, page])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), actor || action ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [load, actor, action])

  const activeFilterCount = [actor.trim(), action.trim(), entityType, from, to].filter(Boolean).length

  function clearFilters() {
    setActor('')
    setAction('')
    setEntityType('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  return (
    <div className="admin-page">
      <PageHeading
        eyebrow="Governance"
        title="Audit log"
        description="An immutable record of administrative changes and access events."
        actions={(
          <button type="button" className="admin-button primary" onClick={() => void load()} disabled={loading}>
            <i className={`bi bi-arrow-clockwise${loading ? ' spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        )}
      />

      {error && <ErrorNotice message={error} onRetry={() => void load()} />}

      <section className="admin-panel admin-filter-panel">
        <div className="admin-filter-grid admin-audit-filters">
          <label className="admin-filter-field">
            <span>Actor</span>
            <input
              type="search"
              placeholder="Name or email"
              value={actor}
              onChange={(event) => {
                setActor(event.target.value)
                setPage(1)
              }}
            />
          </label>

          <label className="admin-filter-field">
            <span>Action</span>
            <input
              type="text"
              list="audit-actions"
              placeholder="Any action"
              value={action}
              onChange={(event) => {
                setAction(event.target.value)
                setPage(1)
              }}
            />
            <datalist id="audit-actions">
              {ACTION_SUGGESTIONS.map((item) => <option key={item} value={item} />)}
            </datalist>
          </label>

          <label className="admin-filter-field">
            <span>Entity</span>
            <select
              value={entityType}
              onChange={(event) => {
                setEntityType(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All entities</option>
              <option value="report">Report</option>
              <option value="user">User</option>
              <option value="department">Department</option>
            </select>
          </label>

          <label className="admin-filter-field">
            <span>From</span>
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value)
                setPage(1)
              }}
            />
          </label>

          <label className="admin-filter-field">
            <span>To</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setTo(event.target.value)
                setPage(1)
              }}
            />
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
          title="Activity history"
          description={`${meta.total} recorded event${meta.total === 1 ? '' : 's'}`}
          action={(
            <span className="admin-panel-chip">
              <i className="bi bi-shield-lock" aria-hidden="true" />
              Newest first
            </span>
          )}
        />

        {loading && entries.length === 0 ? (
          <SkeletonPanel rows={9} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon="bi-journal-text"
            title="No audit entries match"
            text="Try a different actor, action, entity, or date range."
            action={activeFilterCount > 0 ? (
              <button type="button" className="admin-button ghost" onClick={clearFilters}>Clear filters</button>
            ) : undefined}
          />
        ) : (
          <>
            <div className={`admin-table-wrap${loading ? ' is-loading' : ''}`}>
              <table className="admin-table admin-audit-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const link = entityLink(entry)

                    return (
                      <tr key={entry.id}>
                        <td>
                          <span className="admin-audit-time">{formatDateTime(entry.createdAt)}</span>
                        </td>
                        <td>
                          <b>{entry.actor?.name ?? 'System'}</b>
                          <small>{entry.actor ? 'Administrator' : 'Automated event'}</small>
                        </td>
                        <td>
                          <span className="admin-audit-action">{humanizeAction(entry.action)}</span>
                          <small>{entry.action}</small>
                        </td>
                        <td>
                          {link ? (
                            <Link to={link} className="admin-table-link">
                              {entry.entityType}{entry.entityId ? ` #${entry.entityId}` : ''}
                            </Link>
                          ) : (
                            <span>{entry.entityType}{entry.entityId ? ` #${entry.entityId}` : ''}</span>
                          )}
                        </td>
                        <td>
                          {Object.keys(entry.details).length === 0 ? (
                            <span className="admin-muted">No extra details</span>
                          ) : (
                            <details className="admin-audit-details">
                              <summary>View details</summary>
                              <pre>{JSON.stringify(entry.details, null, 2)}</pre>
                            </details>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Pagination meta={meta} onPageChange={setPage} />
          </>
        )}
      </section>
    </div>
  )
}

export default AdminAuditLog
