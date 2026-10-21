import { Router } from 'express'

import {
  auditFieldChanges,
  createAuditEntry,
} from '../audit.js'
import { hashPassword } from '../auth.js'
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
  requireText,
} from '../http.js'
import { requireRoles } from '../middleware/auth.js'
import { assertDepartmentExists } from '../reports.js'

const router = Router()

const MAX_NAME_LENGTH = 120
const MAX_EMAIL_LENGTH = 160
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 72

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function validateEmail(email) {
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > MAX_EMAIL_LENGTH
  ) {
    throw new HttpError(400, 'A valid email address is required.')
  }
}

function validatePassword(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(
      400,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    )
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new HttpError(
      400,
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
    )
  }
}

function parseRole(value) {
  if (!ROLE_VALUES.includes(value)) {
    throw new HttpError(400, 'Unsupported user role.')
  }

  return value
}

function parseDepartmentValue(body) {
  if (!Object.hasOwn(body, 'department_id') && !Object.hasOwn(body, 'departmentId')) {
    return undefined
  }

  const rawDepartmentId = Object.hasOwn(body, 'department_id')
    ? body.department_id
    : body.departmentId

  if (
    rawDepartmentId === null ||
    rawDepartmentId === undefined ||
    rawDepartmentId === ''
  ) {
    return null
  }

  return parseOptionalId(rawDepartmentId, 'departmentId')
}

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
    const role = parseRole(String(request.query.role))
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

router.post('/', requireRoles(...ADMIN_ROLES), async (request, response) => {
  const body = request.body ?? {}
  const name = requireText(body.name, 'Name', MAX_NAME_LENGTH)
  const email = normalizeEmail(body.email)
  const password = String(body.password ?? '')
  const role = parseRole(body.role)
  const departmentId = parseDepartmentValue(body) ?? null

  validateEmail(email)
  validatePassword(password)

  const userId = await withTransaction(async (client) => {
    await assertDepartmentExists(client, departmentId)

    const existing = await client.query(
      'SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1',
      [email],
    )

    if (existing.rows.length > 0) {
      throw new HttpError(409, 'An account with that email already exists.')
    }

    const passwordHash = await hashPassword(password)
    let result

    try {
      result = await client.query(
        `INSERT INTO users (name, email, password_hash, role, role_full, department_id)
         VALUES ($1, $2, $3, $4, $4, $5)
         RETURNING id::text`,
        [name, email, passwordHash, role, departmentId],
      )
    } catch (insertError) {
      if (insertError?.code === '23505') {
        throw new HttpError(409, 'An account with that email already exists.')
      }

      throw insertError
    }

    const createdId = result.rows[0].id

    await createAuditEntry(client, {
      actorId: request.user.id,
      action: 'user_created',
      entityType: 'user',
      entityId: createdId,
      details: {
        name,
        email,
        role,
        department_id: departmentId,
      },
    })

    return createdId
  })

  response.status(201).json({
    data: mapUser(await selectUser(userId)),
  })
})

router.patch('/:id', requireRoles(...ADMIN_ROLES), async (request, response) => {
  const userId = userIdFrom(request)
  const body = request.body ?? {}
  const hasName = Object.hasOwn(body, 'name')
  const hasPassword = Object.hasOwn(body, 'password')
  const hasRole = Object.hasOwn(body, 'role')
  const nextDepartmentId = parseDepartmentValue(body)
  const hasDepartment = nextDepartmentId !== undefined

  if (!hasName && !hasPassword && !hasRole && !hasDepartment) {
    throw new HttpError(400, 'No supported user fields were provided.')
  }

  const name = hasName ? requireText(body.name, 'Name', MAX_NAME_LENGTH) : null
  const password = hasPassword ? String(body.password ?? '') : null
  const role = hasRole ? parseRole(body.role) : null

  if (password !== null) {
    validatePassword(password)
  }

  await withTransaction(async (client) => {
    const current = await client.query(
      `SELECT
         id::text,
         name,
         role,
         department_id::text AS department_id
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    )

    if (current.rows.length === 0) {
      throw new HttpError(404, 'User not found.')
    }

    const user = current.rows[0]
    const isSelf = userId === String(request.user.id)
    const currentIsAdmin = ADMIN_ROLES.includes(user.role)
    const nextIsAdmin = role === null || ADMIN_ROLES.includes(role)

    if (isSelf && hasRole && role !== user.role && !nextIsAdmin) {
      throw new HttpError(400, 'You cannot remove your own administrator access.')
    }

    if (currentIsAdmin && hasRole && !nextIsAdmin) {
      const adminCount = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM users
         WHERE role = ANY($1::text[])`,
        [ADMIN_ROLES],
      )

      if (adminCount.rows[0].count <= 1) {
        throw new HttpError(400, 'At least one administrator account must remain.')
      }
    }

    if (hasDepartment) {
      await assertDepartmentExists(client, nextDepartmentId)
    }

    const assignments = []
    const parameters = []
    const changes = {}
    let passwordChanged = false

    if (hasName && name !== user.name) {
      parameters.push(name)
      assignments.push(`name = $${parameters.length}`)
      changes.name = {
        oldValue: user.name,
        newValue: name,
      }
    }

    if (hasRole && role !== user.role) {
      parameters.push(role)
      assignments.push(`role = $${parameters.length}`)
      parameters.push(role)
      assignments.push(`role_full = $${parameters.length}`)
      changes.role = {
        oldValue: user.role,
        newValue: role,
      }
    }

    if (hasDepartment && nextDepartmentId !== user.department_id) {
      parameters.push(nextDepartmentId)
      assignments.push(`department_id = $${parameters.length}`)
      changes.department_id = {
        oldValue: user.department_id,
        newValue: nextDepartmentId,
      }
    }

    if (password !== null) {
      const passwordHash = await hashPassword(password)
      parameters.push(passwordHash)
      assignments.push(`password_hash = $${parameters.length}`)
      passwordChanged = true
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

      if (passwordChanged) {
        await createAuditEntry(client, {
          actorId: request.user.id,
          action: 'user.password_changed',
          entityType: 'user',
          entityId: userId,
          details: {},
        })
      }
    }
  })

  const user = await selectUser(userId)

  response.json({
    data: mapUser(user),
  })
})

export default router
