import { Router } from 'express'

import { createAuditEntry } from '../audit.js'
import { ADMIN_ROLES, STAFF_ROLES } from '../constants.js'
import {
  query,
  withTransaction,
} from '../db.js'
import {
  HttpError,
  parseOptionalId,
  requireText,
} from '../http.js'
import { requireRoles } from '../middleware/auth.js'

const router = Router()

function departmentIdFrom(request) {
  const departmentId = parseOptionalId(request.params.id, 'departmentId')

  if (departmentId === null) {
    throw new HttpError(400, 'A department identifier is required.')
  }

  return departmentId
}

function mapDepartment(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    userCount: Number(row.user_count ?? 0),
    reportCount: Number(row.report_count ?? 0),
    openReportCount: Number(row.open_report_count ?? 0),
    resolvedReportCount: Number(row.resolved_report_count ?? 0),
  }
}

async function selectDepartment(departmentId) {
  const result = await query(
    `SELECT
       department.id::text AS id,
       department.name,
       department.created_at,
       COUNT(DISTINCT member.id)::int AS user_count,
       COUNT(DISTINCT report.id)::int AS report_count,
       COUNT(DISTINCT report.id) FILTER (WHERE report.status <> 'Resolved')::int AS open_report_count,
       COUNT(DISTINCT report.id) FILTER (WHERE report.status = 'Resolved')::int AS resolved_report_count
     FROM departments department
     LEFT JOIN users member ON member.department_id = department.id
     LEFT JOIN reports report ON report.department_id = department.id
     WHERE department.id = $1
     GROUP BY department.id, department.name, department.created_at
     LIMIT 1`,
    [departmentId],
  )

  return result.rows[0] ?? null
}

router.get('/', requireRoles(...STAFF_ROLES), async (_request, response) => {
  const result = await query(
    `SELECT
       department.id::text AS id,
       department.name,
       department.created_at,
       COUNT(DISTINCT member.id)::int AS user_count,
       COUNT(DISTINCT report.id)::int AS report_count,
       COUNT(DISTINCT report.id) FILTER (WHERE report.status <> 'Resolved')::int AS open_report_count,
       COUNT(DISTINCT report.id) FILTER (WHERE report.status = 'Resolved')::int AS resolved_report_count
     FROM departments department
     LEFT JOIN users member ON member.department_id = department.id
     LEFT JOIN reports report ON report.department_id = department.id
     GROUP BY department.id, department.name, department.created_at
     ORDER BY department.name ASC`,
  )

  response.json({
    data: result.rows.map(mapDepartment),
  })
})

router.post('/', requireRoles(...ADMIN_ROLES), async (request, response) => {
  const name = requireText(request.body?.name, 'Department name', 120)

  let departmentId

  try {
    departmentId = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO departments (name)
         VALUES ($1)
         RETURNING id::text`,
        [name],
      )

      await createAuditEntry(client, {
        actorId: request.user.id,
        action: 'department.created',
        entityType: 'department',
        entityId: result.rows[0].id,
        details: {
          name,
        },
      })

      return result.rows[0].id
    })
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(409, 'A department with that name already exists.')
    }

    throw error
  }

  const department = await selectDepartment(departmentId)

  response.status(201).json({
    data: mapDepartment(department),
  })
})

router.patch('/:id', requireRoles(...ADMIN_ROLES), async (request, response) => {
  const departmentId = departmentIdFrom(request)
  const name = requireText(request.body?.name, 'Department name', 120)

  try {
    await withTransaction(async (client) => {
      const current = await client.query(
        `SELECT id::text, name, created_at
         FROM departments
         WHERE id = $1
         FOR UPDATE`,
        [departmentId],
      )

      if (current.rows.length === 0) {
        throw new HttpError(404, 'Department not found.')
      }

      if (current.rows[0].name === name) {
        return
      }

      await client.query(
        `UPDATE departments
         SET name = $1
         WHERE id = $2`,
        [name, departmentId],
      )

      await createAuditEntry(client, {
        actorId: request.user.id,
        action: 'department.renamed',
        entityType: 'department',
        entityId: departmentId,
        details: {
          old: current.rows[0].name,
          new: name,
        },
      })
    })
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(409, 'A department with that name already exists.')
    }

    throw error
  }

  const department = await selectDepartment(departmentId)

  response.json({
    data: mapDepartment(department),
  })
})

export default router
