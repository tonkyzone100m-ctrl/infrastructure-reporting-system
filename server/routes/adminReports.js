import { Router } from 'express'

import { auditFieldChanges } from '../audit.js'
import {
  REPORT_CATEGORIES,
  REPORT_MANAGE_ROLES,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  STAFF_ROLES,
} from '../constants.js'
import {
  query,
  withTransaction,
} from '../db.js'
import {
  HttpError,
  mapPagination,
  optionalText,
  parseBoolean,
  parseOptionalId,
  parsePagination,
  parseSort,
} from '../http.js'
import { requireRoles } from '../middleware/auth.js'
import {
  REPORT_COLUMNS,
  REPORT_FROM,
  assertDepartmentExists,
  assertStaffAssignee,
  findReport,
  getReportDetail,
  mapReportSummary,
} from '../reports.js'

const router = Router()

const REPORT_SORTS = {
  created_at: 'r.created_at',
  updated_at: 'r.updated_at',
  sla_deadline: 'r.sla_deadline',
  priority: 'r.priority',
  status: 'r.status',
  reference: 'r.reference',
  title: 'r.title',
}

function readUpdateField(body, snakeCaseName, camelCaseName) {
  if (Object.hasOwn(body, snakeCaseName)) {
    return {
      present: true,
      value: body[snakeCaseName],
    }
  }

  if (Object.hasOwn(body, camelCaseName)) {
    return {
      present: true,
      value: body[camelCaseName],
    }
  }

  return {
    present: false,
    value: undefined,
  }
}

function nullableId(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  return parseOptionalId(value, fieldName)
}

function nullableDate(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const date = new Date(String(value))

  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${fieldName} must be a valid date.`)
  }

  return date.toISOString()
}

router.use(requireRoles(...STAFF_ROLES))

router.get('/', async (request, response) => {
  const { page, pageSize, limit, offset } = parsePagination(request.query)
  const conditions = []
  const parameters = []

  if (request.query.status !== undefined) {
    const status = String(request.query.status)

    if (!REPORT_STATUSES.includes(status)) {
      throw new HttpError(400, 'Unsupported report status.')
    }

    parameters.push(status)
    conditions.push(`r.status = $${parameters.length}`)
  }

  if (request.query.priority !== undefined) {
    const priority = String(request.query.priority)

    if (!REPORT_PRIORITIES.includes(priority)) {
      throw new HttpError(400, 'Unsupported report priority.')
    }

    parameters.push(priority)
    conditions.push(`r.priority = $${parameters.length}`)
  }

  if (request.query.category !== undefined) {
    const category = String(request.query.category)

    if (!REPORT_CATEGORIES.includes(category)) {
      throw new HttpError(400, 'Unsupported report category.')
    }

    parameters.push(category)
    conditions.push(`r.category = $${parameters.length}`)
  }

  const departmentId = parseOptionalId(
    request.query.departmentId ?? request.query.department_id,
    'departmentId',
  )

  if (departmentId !== null) {
    parameters.push(departmentId)
    conditions.push(`r.department_id = $${parameters.length}`)
  }

  const assignedTo = parseOptionalId(
    request.query.assignedTo ?? request.query.assigned_to,
    'assignedTo',
  )

  if (assignedTo !== null) {
    parameters.push(assignedTo)
    conditions.push(`r.assigned_to = $${parameters.length}`)
  }

  const overdue = parseBoolean(request.query.overdue, 'overdue')

  if (overdue !== null) {
    parameters.push(overdue)
    conditions.push(`r.is_overdue = $${parameters.length}`)
  }

  const search = optionalText(request.query.search, 120)

  if (search !== null) {
    parameters.push(`%${search}%`)
    conditions.push(
      `(r.reference ILIKE $${parameters.length} OR r.title ILIKE $${parameters.length})`,
    )
  }

  const sort = parseSort(request.query, REPORT_SORTS, {
    field: 'created_at',
    direction: 'desc',
  })
  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : ''
  const countParameters = [...parameters]

  parameters.push(limit)
  const limitPlaceholder = parameters.length
  parameters.push(offset)
  const offsetPlaceholder = parameters.length

  const result = await query(
    `SELECT ${REPORT_COLUMNS}, COUNT(*) OVER() AS total_count
     ${REPORT_FROM}
     ${whereClause}
     ORDER BY ${sort.expression} ${sort.direction}
     LIMIT $${limitPlaceholder} OFFSET $${offsetPlaceholder}`,
    parameters,
  )

  let total = result.rows.length > 0
    ? Number(result.rows[0].total_count)
    : 0

  if (result.rows.length === 0 && page > 1) {
    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       ${REPORT_FROM}
       ${whereClause}`,
      countParameters,
    )
    total = countResult.rows[0].total
  }

  response.json({
    data: result.rows.map(mapReportSummary),
    meta: mapPagination(page, pageSize, total),
  })
})

router.get('/:idOrReference', async (request, response) => {
  const report = await getReportDetail(request.params.idOrReference)

  if (!report) {
    throw new HttpError(404, 'Report not found.')
  }

  response.json({
    data: report,
  })
})

router.patch('/:idOrReference', requireRoles(...REPORT_MANAGE_ROLES), async (request, response) => {
  const body = request.body ?? {}
  const status = readUpdateField(body, 'status', 'status')
  const priority = readUpdateField(body, 'priority', 'priority')
  const departmentId = readUpdateField(body, 'department_id', 'departmentId')
  const assignedTo = readUpdateField(body, 'assigned_to', 'assignedTo')
  const slaDeadline = readUpdateField(body, 'sla_deadline', 'slaDeadline')

  const updates = {}

  if (status.present) {
    if (!REPORT_STATUSES.includes(status.value)) {
      throw new HttpError(400, 'Unsupported report status.')
    }

    updates.status = status.value
  }

  if (priority.present) {
    if (!REPORT_PRIORITIES.includes(priority.value)) {
      throw new HttpError(400, 'Unsupported report priority.')
    }

    updates.priority = priority.value
  }

  if (departmentId.present) {
    updates.department_id = nullableId(departmentId.value, 'department_id')
  }

  if (assignedTo.present) {
    updates.assigned_to = nullableId(assignedTo.value, 'assigned_to')
  }

  if (slaDeadline.present) {
    updates.sla_deadline = nullableDate(slaDeadline.value, 'sla_deadline')
  }

  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, 'No supported report fields were provided.')
  }

  const reportId = await withTransaction(async (client) => {
    const current = await findReport(request.params.idOrReference, {
      client,
      forUpdate: true,
    })

    if (!current) {
      throw new HttpError(404, 'Report not found.')
    }

    if (Object.hasOwn(updates, 'department_id')) {
      await assertDepartmentExists(client, updates.department_id)
    }

    if (Object.hasOwn(updates, 'assigned_to')) {
      await assertStaffAssignee(client, updates.assigned_to)
    }

    const assignments = []
    const parameters = []
    const changes = {}

    const addAssignment = (column, value) => {
      parameters.push(value)
      assignments.push(`${column} = $${parameters.length}`)
    }

    if (updates.status !== undefined && updates.status !== current.status) {
      addAssignment('status', updates.status)
      changes.status = {
        oldValue: current.status,
        newValue: updates.status,
      }
    }

    if (updates.priority !== undefined && updates.priority !== current.priority) {
      addAssignment('priority', updates.priority)
      changes.priority = {
        oldValue: current.priority,
        newValue: updates.priority,
      }
    }

    if (
      Object.hasOwn(updates, 'department_id') &&
      updates.department_id !== current.department_id
    ) {
      addAssignment('department_id', updates.department_id)
      changes.department_id = {
        oldValue: current.department_id,
        newValue: updates.department_id,
      }
    }

    if (
      Object.hasOwn(updates, 'assigned_to') &&
      updates.assigned_to !== current.assigned_to
    ) {
      addAssignment('assigned_to', updates.assigned_to)
      changes.assigned_to = {
        oldValue: current.assigned_to,
        newValue: updates.assigned_to,
      }
    }

    const currentDeadline = current.sla_deadline
      ? new Date(current.sla_deadline).toISOString()
      : null

    if (
      Object.hasOwn(updates, 'sla_deadline') &&
      updates.sla_deadline !== currentDeadline
    ) {
      addAssignment('sla_deadline', updates.sla_deadline)
      changes.sla_deadline = {
        oldValue: currentDeadline,
        newValue: updates.sla_deadline,
      }
    }

    if (assignments.length > 0) {
      const nextStatus = updates.status ?? current.status
      const nextDeadline = Object.hasOwn(updates, 'sla_deadline')
        ? updates.sla_deadline
        : currentDeadline
      const nextOverdue = nextDeadline !== null &&
        nextStatus !== 'Resolved' &&
        new Date(nextDeadline).getTime() < Date.now()

      if (nextOverdue !== current.is_overdue) {
        addAssignment('is_overdue', nextOverdue)
      }

      assignments.push('updated_at = now()')
      parameters.push(current.id)

      await client.query(
        `UPDATE reports
         SET ${assignments.join(', ')}
         WHERE id = $${parameters.length}`,
        parameters,
      )

      await auditFieldChanges(client, {
        actorId: request.user.id,
        entityType: 'report',
        entityId: current.id,
        changes,
      })
    }

    return current.id
  })

  const updatedReport = await getReportDetail(reportId)

  response.json({
    data: updatedReport,
  })
})

export default router
