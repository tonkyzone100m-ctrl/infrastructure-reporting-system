import { Router } from 'express'

import { auditFieldChanges } from '../audit.js'
import {
  ADMIN_ROLES,
  ROLE_VALUES,
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
} from '../http.js'
import { requireRoles } from '../middleware/auth.js'
import { assertDepartmentExists } from '../reports.js'

const router = Router()

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    role_full: row.role_full,
    department: row.department_id
      ? {
          id: row.department_id,
          name: row.department_name ?? null,
        }
      : null,
    reportCount: Number(row.report_count ?? 0),
    createdAt: row.created_at,
  }
}

function userIdFrom(request) {
  const userId = parseOptionalId(request.params.id, 'userId')

  if (userId === null) {
    throw new HttpError(400, 'A user identifier is required.')
  }

  return userId
}

async function selectUser(userId) {
  const result = await query(
    `SELECT
       users.id::text AS id,
       users.name,
       users.email,
       users.role,
       users.role_full,
       users.department_id::text AS department_id,
       department.name AS department_name,
       users.created_at,
       COUNT(report.id)::int AS report_count
     FROM users
     LEFT JOIN departments department ON department.id = users.department_id
     LEFT JOIN reports report ON report.user_id = users.id
     WHERE users.id = $1
     GROUP BY users.id, department.name
     LIMIT 1`,
    [userId],
  )

  return result.rows[0] ?? null
}

router.get('/', requireRoles(...STAFF_ROLES), async (request, response) => {
  const { page, pageSize, limit, offset } = parsePagination(request.query)
  const conditions = []
  const parameters = []

  if (request.query.role !== undefined) {
    const role = String(request.query.role)

    if (!ROLE_VALUES.includes(role)) {
      throw new HttpError(400, 'Unsupported user role.')
    }

    parameters.push(role)
    conditions.push(`users.role = $${parameters.length}`)
  }

  const departmentId = parseOptionalId(
    request.query.departmentId ?? request.query.department_id,
    'departmentId',
  )

  if (departmentId !== null) {
    parameters.push(departmentId)
    conditions.push(`users.department_id = $${parameters.length}`)
  }

  const unassigned = parseBoolean(request.query.unassigned, 'unassigned')

  if (unassigned === true) {
    conditions.push('users.department_id IS NULL')
  }

  const search = optionalText(request.query.search, 120)

  if (search !== null) {
    parameters.push(`%${search}%`)
    conditions.push(
      `(users.name ILIKE $${parameters.length} OR users.email ILIKE $${parameters.length})`,
    )
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : ''
  const countParameters = [...parameters]

  parameters.push(limit)
  const limitPlaceholder = parameters.length
  parameters.push(offset)
  const offsetPlaceholder = parameters.length

  const result = await query(
    `SELECT
       users.id::text AS id,
       users.name,
       users.email,
       users.role,
       users.role_full,
       users.department_id::text AS department_id,
       department.name AS department_name,
       users.created_at,
       COUNT(report.id)::int AS report_count,
       COUNT(*) OVER() AS total_count
     FROM users
     LEFT JOIN departments department ON department.id = users.department_id
     LEFT JOIN reports report ON report.user_id = users.id
     ${whereClause}
     GROUP BY users.id, department.name
     ORDER BY users.created_at DESC, users.id DESC
     LIMIT $${limitPlaceholder} OFFSET $${offsetPlaceholder}`,
    parameters,
  )

  let total = result.rows.length > 0
    ? Number(result.rows[0].total_count)
    : 0

  if (result.rows.length === 0 && page > 1) {
    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM users
       LEFT JOIN departments department ON department.id = users.department_id
       ${whereClause}`,
      countParameters,
    )
    total = countResult.rows[0].total
  }

  response.json({
    data: result.rows.map(mapUser),
    meta: mapPagination(page, pageSize, total),
  })
})

router.patch('/:id', requireRoles(...ADMIN_ROLES), async (request, response) => {
  const userId = userIdFrom(request)
  const body = request.body ?? {}
  const hasRole = Object.hasOwn(body, 'role')
  const hasDepartment = Object.hasOwn(body, 'department_id') ||
    Object.hasOwn(body, 'departmentId')

  if (!hasRole && !hasDepartment) {
    throw new HttpError(400, 'No supported user fields were provided.')
  }

  if (hasRole && !ROLE_VALUES.includes(body.role)) {
    throw new HttpError(400, 'Unsupported user role.')
  }

  let nextDepartmentId

  if (hasDepartment) {
    const rawDepartmentId = Object.hasOwn(body, 'department_id')
      ? body.department_id
      : body.departmentId

    nextDepartmentId = rawDepartmentId === null ||
      rawDepartmentId === undefined ||
      rawDepartmentId === ''
      ? null
      : parseOptionalId(rawDepartmentId, 'departmentId')
  }

  await withTransaction(async (client) => {
    const current = await client.query(
      `SELECT id::text, role, department_id::text AS department_id
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    )

    if (current.rows.length === 0) {
      throw new HttpError(404, 'User not found.')
    }

    const user = current.rows[0]
    const assignments = []
    const parameters = []
    const changes = {}

    if (hasRole && body.role !== user.role) {
      parameters.push(body.role)
      assignments.push(`role = $${parameters.length}`)
      parameters.push(body.role)
      assignments.push(`role_full = $${parameters.length}`)
      changes.role = {
        oldValue: user.role,
        newValue: body.role,
      }
    }

    if (hasDepartment) {
      await assertDepartmentExists(client, nextDepartmentId)
    }

    if (hasDepartment && nextDepartmentId !== user.department_id) {
      parameters.push(nextDepartmentId)
      assignments.push(`department_id = $${parameters.length}`)
      changes.department_id = {
        oldValue: user.department_id,
        newValue: nextDepartmentId,
      }
    }

    if (assignments.length > 0) {
      parameters.push(userId)

      await client.query(
        `UPDATE users
         SET ${assignments.join(', ')}
         WHERE id = $${parameters.length}`,
        parameters,
      )

      await auditFieldChanges(client, {
        actorId: request.user.id,
        entityType: 'user',
        entityId: userId,
        changes,
      })
    }
  })

  const user = await selectUser(userId)

  response.json({
    data: mapUser(user),
  })
})

export default router
