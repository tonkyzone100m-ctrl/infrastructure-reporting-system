import { Router } from 'express'

import { AUDIT_VIEW_ROLES } from '../constants.js'
import { query } from '../db.js'
import {
  mapPagination,
  optionalText,
  parseDate,
  parseOptionalId,
  parsePagination,
} from '../http.js'
import { requireRoles } from '../middleware/auth.js'

const router = Router()

function mapAuditRow(row) {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actor: row.actor_id
      ? {
          id: row.actor_id,
          name: row.actor_name ?? null,
        }
      : null,
    details: row.details,
    createdAt: row.created_at,
  }
}

router.get('/', requireRoles(...AUDIT_VIEW_ROLES), async (request, response) => {
  const { page, pageSize, limit, offset } = parsePagination(request.query)
  const conditions = []
  const parameters = []

  const action = optionalText(request.query.action, 120)

  if (action !== null) {
    parameters.push(action)
    conditions.push(`log.action = $${parameters.length}`)
  }

  const entityType = optionalText(request.query.entityType ?? request.query.entity_type, 64)

  if (entityType !== null) {
    parameters.push(entityType)
    conditions.push(`log.entity_type = $${parameters.length}`)
  }

  const entityId = parseOptionalId(
    request.query.entityId ?? request.query.entity_id,
    'entityId',
  )

  if (entityId !== null) {
    parameters.push(entityId)
    conditions.push(`log.entity_id = $${parameters.length}`)
  }

  const actorId = parseOptionalId(
    request.query.actorId ?? request.query.actor_id,
    'actorId',
  )

  if (actorId !== null) {
    parameters.push(actorId)
    conditions.push(`log.actor_id = $${parameters.length}`)
  }

  const actor = optionalText(request.query.actor, 120)

  if (actor !== null) {
    parameters.push(`%${actor}%`)
    conditions.push(
      `(actor.name ILIKE $${parameters.length} OR actor.email ILIKE $${parameters.length})`,
    )
  }

  const from = parseDate(request.query.from, 'from')

  if (from !== null) {
    parameters.push(from)
    conditions.push(`log.created_at >= $${parameters.length}`)
  }

  const to = parseDate(request.query.to, 'to')

  if (to !== null) {
    parameters.push(to)
    conditions.push(`log.created_at <= $${parameters.length}`)
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
       log.id::text AS id,
       log.actor_id::text AS actor_id,
       actor.name AS actor_name,
       log.action,
       log.entity_type,
       log.entity_id::text AS entity_id,
       log.details,
       log.created_at,
       COUNT(*) OVER() AS total_count
     FROM audit_log log
     LEFT JOIN users actor ON actor.id = log.actor_id
     ${whereClause}
     ORDER BY log.created_at DESC, log.id DESC
     LIMIT $${limitPlaceholder} OFFSET $${offsetPlaceholder}`,
    parameters,
  )

  let total = result.rows.length > 0
    ? Number(result.rows[0].total_count)
    : 0

  if (result.rows.length === 0 && page > 1) {
    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM audit_log log
       LEFT JOIN users actor ON actor.id = log.actor_id
       ${whereClause}`,
      countParameters,
    )
    total = countResult.rows[0].total
  }

  response.json({
    data: result.rows.map(mapAuditRow),
    meta: mapPagination(page, pageSize, total),
  })
})

export default router
