import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  EmptyState,
  ErrorNotice,
  PageHeading,
  PanelHeading,
  PriorityBadge,
  SkeletonPanel,
  StatusBadge,
  formatDateTime,
  initials,
} from '../../components/admin/AdminUi'
import { useToast } from '../../components/admin/ToastProvider'
import {
  addComment,
  fetchEvidenceBlob,
  getDepartments,
  getReport,
  getUsers,
  updateReport,
  type ReportUpdate,
} from '../../services/adminApi'
import { getCurrentUser } from '../../services/auth'
import {
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  canManageReports,
  isStaffRole,
  roleLabel,
  type DepartmentRecord,
  type EvidenceRecord,
  type ReportDetail,
  type UserRecord,
} from '../../types/adminPanel'

function toDateTimeInput(value: string | null): string {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function toIsoOrNull(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) {
    return 'Unknown size'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function humanizeAction(action: string): string {
  return action
    .replaceAll('_', ' ')
    .replaceAll('.', ' · ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function EvidenceCard({ item }: { item: EvidenceRecord }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const { showToast } = useToast()
  const isImage = Boolean(item.mimeType?.startsWith('image/'))

  useEffect(() => {
    if (!isImage) {
      return
    }

    let objectUrl = ''
    let cancelled = false

    setLoading(true)

    fetchEvidenceBlob(item.downloadUrl)
      .then((blob) => {
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob)
          setPreviewUrl(objectUrl)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [isImage, item.downloadUrl])

  async function handleDownload() {
    setDownloading(true)

    try {
      const blob = await fetchEvidenceBlob(item.downloadUrl)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = item.originalName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      showToast(
        downloadError instanceof Error ? downloadError.message : 'The evidence could not be downloaded.',
        'error',
      )
    } finally {
      setDownloading(false)
    }
  }

  return (
    <article className="admin-evidence-card">
      <div className="admin-evidence-preview">
        {isImage && previewUrl && <img src={previewUrl} alt={item.originalName} />}
        {isImage && loading && <span className="admin-spinner" aria-label="Loading preview" />}
        {isImage && !loading && !previewUrl && (
          <i className={`bi ${failed ? 'bi-image' : 'bi-hourglass'}`} aria-hidden="true" />
        )}
        {!isImage && <i className="bi bi-file-earmark-text" aria-hidden="true" />}
      </div>
      <div className="admin-evidence-copy">
        <b title={item.originalName}>{item.originalName}</b>
        <small>{formatFileSize(item.sizeBytes)} · {formatDateTime(item.uploadedAt)}</small>
      </div>
      <button type="button" onClick={() => void handleDownload()} disabled={downloading}>
        {downloading ? (
          <span className="admin-spinner small" aria-hidden="true" />
        ) : (
          <i className="bi bi-download" aria-hidden="true" />
        )}
        <span>Download</span>
      </button>
    </article>
  )
}

function AdminReportDetails() {
  const { id = '' } = useParams()
  const { showToast } = useToast()
  const user = getCurrentUser()
  const canManage = canManageReports(user?.role)
  const [report, setReport] = useState<ReportDetail | null>(null)
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [staff, setStaff] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [comment, setComment] = useState('')
  const [commenting, setCommenting] = useState(false)

  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [slaDeadline, setSlaDeadline] = useState('')

  const applyForm = useCallback((value: ReportDetail) => {
    setStatus(value.status)
    setPriority(value.priority)
    setDepartmentId(value.department?.id ?? '')
    setAssignedTo(value.assignedTo?.id ?? '')
    setSlaDeadline(toDateTimeInput(value.slaDeadline))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getReport(id)
      setReport(result)
      applyForm(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load this report.')
    } finally {
      setLoading(false)
    }
  }, [id, applyForm])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    Promise.all([
      getDepartments(),
      getUsers({ pageSize: '100' }),
    ])
      .then(([departmentRows, userResult]) => {
        setDepartments(departmentRows)
        setStaff(userResult.data.filter((candidate) => isStaffRole(candidate.role)))
      })
      .catch(() => {
        setDepartments([])
        setStaff([])
      })
  }, [])

  const hasChanges = useMemo(() => {
    if (!report) {
      return false
    }

    return (
      status !== report.status ||
      priority !== report.priority ||
      departmentId !== (report.department?.id ?? '') ||
      assignedTo !== (report.assignedTo?.id ?? '') ||
      slaDeadline !== toDateTimeInput(report.slaDeadline)
    )
  }, [report, status, priority, departmentId, assignedTo, slaDeadline])

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!report) {
      return
    }

    setSaving(true)
    setSaveError('')

    try {
      const changes: ReportUpdate = {
        status,
        priority,
        department_id: departmentId || null,
        assigned_to: assignedTo || null,
        sla_deadline: toIsoOrNull(slaDeadline),
      }
      const updated = await updateReport(report.reference, changes)
      setReport(updated)
      applyForm(updated)
      showToast(`${updated.reference} updated.`, 'success')
    } catch (saveUpdateError) {
      const message = saveUpdateError instanceof Error
        ? saveUpdateError.message
        : 'The report could not be updated.'
      setSaveError(message)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!report || !comment.trim()) {
      return
    }

    setCommenting(true)

    try {
      const created = await addComment(report.id, comment.trim())
      setReport((current) => current
        ? { ...current, comments: [...current.comments, created] }
        : current)
      setComment('')
      showToast('Comment added.', 'success')
    } catch (commentError) {
      showToast(
        commentError instanceof Error ? commentError.message : 'The comment could not be added.',
        'error',
      )
    } finally {
      setCommenting(false)
    }
  }

  if (loading && !report) {
    return (
      <div className="admin-page">
        <PageHeading
          eyebrow="Report case"
          title="Loading report…"
          description="Fetching the latest case information."
          backTo="/admin/reports"
          backLabel="All reports"
        />
        <div className="admin-detail-layout">
          <div><SkeletonPanel rows={8} /><SkeletonPanel rows={5} /></div>
          <div><SkeletonPanel rows={9} /></div>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="admin-page">
        <PageHeading
          eyebrow="Report case"
          title="Report unavailable"
          description="This report could not be loaded."
          backTo="/admin/reports"
          backLabel="All reports"
        />
        <ErrorNotice message={error || 'Report not found.'} onRetry={() => void load()} />
      </div>
    )
  }

  const mapLink = report.latitude !== null && report.longitude !== null
    ? `/admin/map?report=${encodeURIComponent(report.reference)}`
    : ''

  return (
    <div className="admin-page">
      <PageHeading
        eyebrow={`Report ${report.reference}`}
        title={report.title}
        description={`${report.category}${report.location ? ` · ${report.location}` : ''}`}
        backTo="/admin/reports"
        backLabel="All reports"
        actions={(
          <>
            {mapLink && (
              <Link to={mapLink} className="admin-button ghost">
                <i className="bi bi-geo-alt" aria-hidden="true" />
                View on map
              </Link>
            )}
            <button type="button" className="admin-button primary" onClick={() => void load()} disabled={loading}>
              <i className={`bi bi-arrow-clockwise${loading ? ' spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
          </>
        )}
      />

      {error && <ErrorNotice message={error} onRetry={() => void load()} />}

      <div className="admin-detail-header-bar">
        <div className="admin-detail-badges">
          <StatusBadge status={report.status} />
          <PriorityBadge priority={report.priority} />
          {report.isOverdue && (
            <span className="admin-overdue-badge">
              <i className="bi bi-clock-history" aria-hidden="true" />
              Overdue
            </span>
          )}
        </div>
        <span>
          Updated {formatDateTime(report.updatedAt)}
        </span>
      </div>

      <div className="admin-detail-layout">
        <div className="admin-detail-main">
          <section className="admin-panel">
            <PanelHeading title="Report details" description="What the citizen reported" />
            <p className="admin-report-description">{report.description}</p>

            <div className="admin-detail-facts">
              <div>
                <span>Reporter</span>
                <b>{report.reporter?.name ?? 'Unknown'}</b>
                <small>{report.reporter?.email ?? 'No email available'}</small>
              </div>
              <div>
                <span>Location</span>
                <b>{report.location || 'Not provided'}</b>
                <small>
                  {report.latitude !== null && report.longitude !== null
                    ? `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`
                    : 'No coordinates captured'}
                </small>
              </div>
              <div>
                <span>Submitted</span>
                <b>{formatDateTime(report.createdAt)}</b>
                <small>{report.reference}</small>
              </div>
            </div>
          </section>

          <section className="admin-panel">
            <PanelHeading
              title="Evidence"
              description="Files attached by the reporter"
              action={<span className="admin-count-pill">{report.evidence.length}</span>}
            />
            {report.evidence.length === 0 ? (
              <EmptyState
                icon="bi-paperclip"
                title="No evidence attached"
                text="This report was submitted without a photo or document."
              />
            ) : (
              <div className="admin-evidence-grid">
                {report.evidence.map((item) => (
                  <EvidenceCard key={item.id ?? item.downloadUrl} item={item} />
                ))}
              </div>
            )}
          </section>

          <section className="admin-panel">
            <PanelHeading
              title="Comments"
              description="Internal updates visible to staff"
              action={<span className="admin-count-pill">{report.comments.length}</span>}
            />
            {report.comments.length === 0 ? (
              <EmptyState
                icon="bi-chat-left-text"
                title="No comments yet"
                text="Add an internal note to keep the response team aligned."
              />
            ) : (
              <div className="admin-comment-list">
                {report.comments.map((item) => (
                  <article key={item.id} className="admin-comment">
                    <span className="admin-avatar small" aria-hidden="true">
                      {initials(item.author?.name ?? 'Staff')}
                    </span>
                    <div>
                      <div className="admin-comment-head">
                        <b>{item.author?.name ?? 'Staff member'}</b>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                      <p>{item.body}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <form className="admin-comment-form" onSubmit={(event) => void handleComment(event)}>
              <label htmlFor="admin-comment-body">Add a comment</label>
              <textarea
                id="admin-comment-body"
                rows={3}
                maxLength={2000}
                placeholder="Share an update with the response team…"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <div>
                <small>{comment.length}/2000</small>
                <button type="submit" className="admin-button primary small" disabled={commenting || !comment.trim()}>
                  {commenting ? <span className="admin-spinner small" aria-hidden="true" /> : <i className="bi bi-send" aria-hidden="true" />}
                  Add comment
                </button>
              </div>
            </form>
          </section>

          <section className="admin-panel">
            <PanelHeading
              title="Activity"
              description="Report history and administrative changes"
              action={<span className="admin-count-pill">{report.audit.length}</span>}
            />
            {report.audit.length === 0 ? (
              <EmptyState
                icon="bi-clock"
                title="No activity recorded"
                text="Changes to this report will appear here."
              />
            ) : (
              <ol className="admin-timeline">
                {report.audit.map((entry) => (
                  <li key={entry.id}>
                    <span className="admin-timeline-dot">
                      <i className="bi bi-dot" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="admin-timeline-head">
                        <b>{humanizeAction(entry.action)}</b>
                        <span>{formatDateTime(entry.createdAt)}</span>
                      </div>
                      <small>{entry.actor?.name ?? 'System'}</small>
                      {Object.keys(entry.details).length > 0 && (
                        <div className="admin-timeline-details">
                          {Object.entries(entry.details)
                            .filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object')
                            .slice(0, 5)
                            .map(([key, value]) => (
                              <span key={key}>
                                {key.replaceAll('_', ' ')}: <b>{String(value)}</b>
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="admin-detail-side">
          <section className="admin-panel admin-sticky-panel">
            <PanelHeading
              title="Triage"
              description={canManage ? 'Update the case workflow' : 'Read-only for your role'}
            />

            <form className="admin-triage-form" onSubmit={(event) => void handleSave(event)}>
              <label className="admin-filter-field">
                <span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)} disabled={!canManage}>
                  {REPORT_STATUSES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>

              <label className="admin-filter-field">
                <span>Priority</span>
                <select value={priority} onChange={(event) => setPriority(event.target.value)} disabled={!canManage}>
                  {REPORT_PRIORITIES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>

              <label className="admin-filter-field">
                <span>Department</span>
                <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} disabled={!canManage}>
                  <option value="">Unassigned</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </label>

              <label className="admin-filter-field">
                <span>Assigned staff</span>
                <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} disabled={!canManage}>
                  <option value="">Unassigned</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {roleLabel(member.role)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-filter-field">
                <span>SLA deadline</span>
                <input
                  type="datetime-local"
                  value={slaDeadline}
                  onChange={(event) => setSlaDeadline(event.target.value)}
                  disabled={!canManage}
                />
              </label>

              {saveError && <div className="admin-inline-error">{saveError}</div>}

              {canManage ? (
                <div className="admin-triage-actions">
                  <button
                    type="button"
                    className="admin-button ghost"
                    disabled={!hasChanges || saving}
                    onClick={() => applyForm(report)}
                  >
                    Reset
                  </button>
                  <button type="submit" className="admin-button primary" disabled={!hasChanges || saving}>
                    {saving ? <span className="admin-spinner small" aria-hidden="true" /> : <i className="bi bi-check2" aria-hidden="true" />}
                    Save changes
                  </button>
                </div>
              ) : (
                <p className="admin-permission-note">
                  <i className="bi bi-lock" aria-hidden="true" />
                  Your role can view and comment, but not change workflow fields.
                </p>
              )}
            </form>
          </section>

          <section className="admin-panel">
            <PanelHeading title="Assignment" />
            <div className="admin-side-facts">
              <div>
                <span>Department</span>
                <b>{report.department?.name ?? 'Unassigned'}</b>
              </div>
              <div>
                <span>Assigned to</span>
                <b>{report.assignedTo?.name ?? 'Unassigned'}</b>
                {report.assignedTo?.email && <small>{report.assignedTo.email}</small>}
              </div>
              <div>
                <span>SLA deadline</span>
                <b>{formatDateTime(report.slaDeadline)}</b>
              </div>
              <div>
                <span>Last updated</span>
                <b>{formatDateTime(report.updatedAt)}</b>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default AdminReportDetails
