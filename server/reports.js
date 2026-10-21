import { MAX_EVIDENCE_BYTES, STAFF_ROLES } from './constants.js'
import { query } from './db.js'
import {
  HttpError,
  optionalText,
} from './http.js'

export const REPORT_COLUMNS = `
  r.id::text AS id,
  r.reference,
  r.title,
  r.category,
  r.description,
  r.location,
  r.latitude,
  r.longitude,
  r.status,
  r.priority,
  r.created_at,
  r.updated_at,
  r.user_id::text AS user_id,
  reporter.name AS reporter_name,
  reporter.email AS reporter_email,
  r.department_id::text AS department_id,
  department.name AS department_name,
  r.assigned_to::text AS assigned_to,
  assignee.name AS assignee_name,
  r.evidence_name,
  r.evidence_data IS NOT NULL AS has_evidence_data,
  r.sla_deadline,
  r.is_overdue
`

export const REPORT_FROM = `
  FROM reports r
  LEFT JOIN users reporter ON reporter.id = r.user_id
  LEFT JOIN departments department ON department.id = r.department_id
  LEFT JOIN users assignee ON assignee.id = r.assigned_to
`

export const REPORT_SELECT = `SELECT ${REPORT_COLUMNS} ${REPORT_FROM}`

export function normalizeReportKey(value) {
  const key = String(value ?? '').trim()

  if (/^\d+$/.test(key)) {
    return key
  }

  if (/^RH-\d{6}$/i.test(key)) {
    return key.toUpperCase()
  }

  throw new HttpError(400, 'Invalid report identifier.')
}

function identity(id, name, email) {
  if (!id) {
    return null
  }

  return {
    id,
    name: name ?? null,
    ...(email === undefined ? {} : { email: email ?? null }),
  }
}

export function mapReportSummary(row) {
  return {
    id: row.id,
    reference: row.reference,
    title: row.title,
    category: row.category,
    status: row.status,
    priority: row.priority,
    location: row.location,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    reporter: identity(row.user_id, row.reporter_name, row.reporter_email),
    department: identity(row.department_id, row.department_name),
    assignedTo: identity(row.assigned_to, row.assignee_name),
    slaDeadline: row.sla_deadline,
    isOverdue: row.is_overdue,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapReportDetail(row, {
  evidence,
  comments,
  audit,
}) {
  return {
    ...mapReportSummary(row),
    description: row.description,
    evidenceName: row.evidence_name,
    evidence,
    comments,
    audit,
  }
}

export async function findReport(key, {
  client = null,
  forUpdate = false,
} = {}) {
  const normalizedKey = normalizeReportKey(key)
  const isNumericId = /^\d+$/.test(normalizedKey)
  const predicate = isNumericId ? 'r.id = $1' : 'r.reference = $1'
  const lock = forUpdate ? ' FOR UPDATE OF r' : ''
  const executor = client ?? { query }
  const result = await executor.query(
    `${REPORT_SELECT} WHERE ${predicate} LIMIT 1${lock}`,
    [normalizedKey],
  )

  return result.rows[0] ?? null
}

export async function getReportEvidence(reportId, reportRow = null) {
  const result = await query(
    `SELECT
       id::text AS id,
       report_id::text AS report_id,
       file_name,
       original_name,
       mime_type,
       size_bytes,
       uploaded_at
     FROM report_evidence
     WHERE report_id = $1
     ORDER BY id ASC`,
    [reportId],
  )

  const items = result.rows.map((row) => ({
    id: row.id,
    reportId: row.report_id,
    fileName: row.file_name,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    uploadedAt: row.uploaded_at,
    downloadUrl: `/api/admin/evidence/${row.id}/download`,
  }))

  if (items.length === 0 && reportRow?.has_evidence_data) {
    items.push({
      id: null,
      reportId,
      fileName: reportRow.evidence_name ?? 'evidence',
      originalName: reportRow.evidence_name ?? 'evidence',
      mimeType: null,
      sizeBytes: null,
      uploadedAt: reportRow.updated_at,
      downloadUrl: `/api/admin/reports/${reportId}/evidence/download`,
    })
  }

  return items
}

export async function getReportComments(reportId) {
  const result = await query(
    `SELECT
       comment.id::text AS id,
       comment.report_id::text AS report_id,
       comment.user_id::text AS user_id,
       author.name AS author_name,
       author.email AS author_email,
       comment.body,
       comment.created_at
     FROM report_comments comment
     LEFT JOIN users author ON author.id = comment.user_id
     WHERE comment.report_id = $1
     ORDER BY comment.created_at ASC, comment.id ASC`,
    [reportId],
  )

  return result.rows.map((row) => ({
    id: row.id,
    reportId: row.report_id,
    body: row.body,
    author: identity(row.user_id, row.author_name, row.author_email),
    createdAt: row.created_at,
  }))
}

export async function getReportAudit(reportId) {
  const result = await query(
    `SELECT
       log.id::text AS id,
       log.actor_id::text AS actor_id,
       actor.name AS actor_name,
       log.action,
       log.entity_type,
       log.entity_id::text AS entity_id,
       log.details,
       log.created_at
     FROM audit_log log
     LEFT JOIN users actor ON actor.id = log.actor_id
     WHERE log.entity_type = 'report' AND log.entity_id = $1
     ORDER BY log.created_at DESC, log.id DESC`,
    [reportId],
  )

  return result.rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actor: identity(row.actor_id, row.actor_name),
    details: row.details,
    createdAt: row.created_at,
  }))
}

export async function getReportDetail(key) {
  const row = await findReport(key)

  if (!row) {
    return null
  }

  const [evidence, comments, audit] = await Promise.all([
    getReportEvidence(row.id, row),
    getReportComments(row.id),
    getReportAudit(row.id),
  ])

  return mapReportDetail(row, {
    evidence,
    comments,
    audit,
  })
}

export async function assertDepartmentExists(client, departmentId) {
  if (departmentId === null || departmentId === undefined) {
    return
  }

  const result = await client.query(
    'SELECT id FROM departments WHERE id = $1',
    [departmentId],
  )

  if (result.rows.length === 0) {
    throw new HttpError(422, 'The selected department does not exist.')
  }
}

export async function assertStaffAssignee(client, userId) {
  if (userId === null || userId === undefined) {
    return
  }

  const result = await client.query(
    'SELECT id, role FROM users WHERE id = $1',
    [userId],
  )

  if (result.rows.length === 0 || !STAFF_ROLES.includes(result.rows[0].role)) {
    throw new HttpError(422, 'The selected assignee is not a staff member.')
  }
}

export function parseEvidencePayload(body) {
  const rawData = body?.evidenceData ?? body?.evidence_data
  const suppliedName = optionalText(
    body?.evidenceName ?? body?.evidence_name,
    255,
  )
  const suppliedMimeType = optionalText(
    body?.evidenceMimeType ?? body?.evidence_mime_type,
    120,
  )

  if (rawData === undefined || rawData === null || rawData === '') {
    return {
      name: suppliedName,
      mimeType: suppliedMimeType ?? 'application/octet-stream',
      buffer: null,
    }
  }

  if (typeof rawData !== 'string') {
    throw new HttpError(400, 'Evidence data must be a base64 string.')
  }

  let mimeType = suppliedMimeType
  let base64Value = rawData
  const dataUrl = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(rawData)

  if (dataUrl) {
    if (dataUrl[2] !== ';base64') {
      throw new HttpError(400, 'Evidence data must use base64 encoding.')
    }

    mimeType ??= dataUrl[1] ?? undefined
    base64Value = dataUrl[3]
  }

  const buffer = Buffer.from(base64Value, 'base64')

  if (buffer.length === 0) {
    throw new HttpError(400, 'Evidence data is empty.')
  }

  if (buffer.length > MAX_EVIDENCE_BYTES) {
    throw new HttpError(413, 'Evidence must be 10 MB or smaller.')
  }

  return {
    name: suppliedName ?? 'evidence',
    mimeType: mimeType ?? 'application/octet-stream',
    buffer,
  }
}
