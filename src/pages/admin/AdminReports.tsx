import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  EmptyState,
  ErrorNotice,
  PageHeading,
  Pagination,
  PanelHeading,
  PriorityBadge,
  SkeletonPanel,
  StatusBadge,
  formatDateTime,
  formatRelative,
} from '../../components/admin/AdminUi'
import { getDepartments, getReports } from '../../services/adminApi'
import {
  REPORT_CATEGORIES,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  type DepartmentRecord,
  type PaginationMeta,
  type ReportSummary,
} from '../../types/adminPanel'

const EMPTY_META: PaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
}

function escapeCsv(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function AdminReports() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [priority, setPriority] = useState(searchParams.get('priority') ?? '')
  const [category, setCategory] = useState(searchParams.get('category') ?? '')
  const [departmentId, setDepartmentId] = useState(searchParams.get('departmentId') ?? '')
  const [overdue, setOverdue] = useState(searchParams.get('overdue') ?? '')
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') ?? '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') ?? '')
  const [page, setPage] = useState(1)
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META)
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getReports({
        search: search.trim(),
        status,
        priority,
        category,
        departmentId,
        overdue,
        dateFrom,
        dateTo,
        page: String(page),
        pageSize: '15',
        sortBy: 'created_at',
        sortDir: 'desc',
      })

      setReports(result.data)
      setMeta(result.meta)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load reports.')
    } finally {
      setLoading(false)
    }
  }, [search, status, priority, category, departmentId, overdue, dateFrom, dateTo, page])

  useEffect(() => {
    const delay = search ? 300 : 0
    const timer = window.setTimeout(() => {
      void load()
    }, delay)

    return () => window.clearTimeout(timer)
  }, [load, search])

  const activeFilterCount = [
    search.trim(),
    status,
    priority,
    category,
    departmentId,
    overdue,
    dateFrom,
    dateTo,
  ].filter(Boolean).length

  const pageLabel = useMemo(() => {
    if (meta.total === 0) {
      return 'No reports match these filters'
    }

    return `${meta.total} report${meta.total === 1 ? '' : 's'} found`
  }, [meta.total])

  function clearFilters() {
    setSearch('')
    setStatus('')
    setPriority('')
    setCategory('')
    setDepartmentId('')
    setOverdue('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  function exportCsv() {
    const header = [
      'Reference',
      'Title',
      'Category',
      'Status',
      'Priority',
      'Department',
      'Reporter',
      'Location',
      'SLA deadline',
      'Created at',
    ]
    const rows = reports.map((report) => [
      report.reference,
      report.title,
      report.category,
      report.status,
      report.priority,
      report.department?.name ?? '',
      report.reporter?.name ?? '',
      report.location ?? '',
      report.slaDeadline ?? '',
      report.createdAt,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `reporthub-reports-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-page">
      <PageHeading
        eyebrow="Case management"
        title="Reports"
        description="Search, filter, and triage every citizen report across the city."
        actions={(
          <>
            <button
              type="button"
              className="admin-button ghost"
              onClick={exportCsv}
              disabled={reports.length === 0}
            >
              <i className="bi bi-download" aria-hidden="true" />
              Export page
            </button>
            <button
              type="button"
              className="admin-button primary"
              onClick={() => void load()}
              disabled={loading}
            >
              <i className={`bi bi-arrow-clockwise${loading ? ' spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
          </>
        )}
      />

      <section className="admin-panel admin-filter-panel">
        <div className="admin-search-field">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search reference or title…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            aria-label="Search reports"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
              <i className="bi bi-x-circle" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="admin-filter-grid">
          <label className="admin-filter-field">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All statuses</option>
              {REPORT_STATUSES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label className="admin-filter-field">
            <span>Priority</span>
            <select
              value={priority}
              onChange={(event) => {
                setPriority(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All priorities</option>
              {REPORT_PRIORITIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label className="admin-filter-field">
            <span>Category</span>
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All categories</option>
              {REPORT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label className="admin-filter-field">
            <span>Department</span>
            <select
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </label>

          <label className="admin-filter-field">
            <span>SLA</span>
            <select
              value={overdue}
              onChange={(event) => {
                setOverdue(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All deadlines</option>
              <option value="true">Overdue only</option>
              <option value="false">Within SLA</option>
            </select>
          </label>

          <label className="admin-filter-field">
            <span>From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value)
                setPage(1)
              }}
            />
          </label>

          <label className="admin-filter-field">
            <span>To</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => {
                setDateTo(event.target.value)
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

      {error && <ErrorNotice message={error} onRetry={() => void load()} />}

      <section className="admin-panel admin-table-panel">
        <PanelHeading
          title="All reports"
          description={pageLabel}
          action={(
            <span className="admin-panel-chip">
              <i className="bi bi-funnel" aria-hidden="true" />
              {activeFilterCount > 0 ? `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}` : 'No filters'}
            </span>
          )}
        />

        {loading && reports.length === 0 ? (
          <SkeletonPanel rows={8} />
        ) : reports.length === 0 ? (
          <EmptyState
            icon="bi-search"
            title="No reports match"
            text="Try adjusting the search or clearing one of the active filters."
            action={activeFilterCount > 0 ? (
              <button type="button" className="admin-button ghost" onClick={clearFilters}>
                Clear filters
              </button>
            ) : undefined}
          />
        ) : (
          <>
            <div className={`admin-table-wrap${loading ? ' is-loading' : ''}`}>
              <table className="admin-table admin-reports-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Report</th>
                    <th>Reporter</th>
                    <th>Department</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>SLA</th>
                    <th>Submitted</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td><span className="admin-reference">{report.reference}</span></td>
                      <td>
                        <Link to={`/admin/reports/${report.reference}`} className="admin-report-link">
                          {report.title}
                        </Link>
                        <small>{report.category}{report.location ? ` · ${report.location}` : ''}</small>
                      </td>
                      <td>
                        {report.reporter?.name ?? 'Unknown'}
                        <small>{report.reporter?.email ?? 'No email'}</small>
                      </td>
                      <td>
                        {report.department?.name ?? <span className="admin-muted">Unassigned</span>}
                        <small>{report.assignedTo?.name ? `Assigned to ${report.assignedTo.name}` : 'No assignee'}</small>
                      </td>
                      <td><PriorityBadge priority={report.priority} /></td>
                      <td><StatusBadge status={report.status} /></td>
                      <td>
                        {report.slaDeadline ? (
                          <span className={report.isOverdue ? 'admin-sla overdue' : 'admin-sla'}>
                            {formatRelative(report.slaDeadline)}
                          </span>
                        ) : <span className="admin-muted">Not set</span>}
                        {report.slaDeadline && <small>{formatDateTime(report.slaDeadline)}</small>}
                      </td>
                      <td>
                        <span title={formatDateTime(report.createdAt)}>{formatRelative(report.createdAt)}</span>
                      </td>
                      <td>
                        <Link
                          to={`/admin/reports/${report.reference}`}
                          className="admin-row-action"
                          aria-label={`Open ${report.reference}`}
                        >
                          <i className="bi bi-arrow-up-right" aria-hidden="true" />
                        </Link>
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
    </div>
  )
}

export default AdminReports
