import { Router } from 'express'

import { createAuditEntry } from '../audit.js'
import { MAX_COMMENT_LENGTH, STAFF_ROLES } from '../constants.js'
import { withTransaction } from '../db.js'
import {
  HttpError,
  parseOptionalId,
  requireText,
} from '../http.js'
import { requireRoles } from '../middleware/auth.js'
import { getReportComments } from '../reports.js'

const router = Router({ mergeParams: true })

router.use(requireRoles(...STAFF_ROLES))

function reportIdFrom(request) {
  const reportId = parseOptionalId(request.params.reportId, 'reportId')

  if (reportId === null) {
    throw new HttpError(400, 'A report identifier is required.')
  }

  return reportId
}

router.get('/', async (request, response) => {
  const reportId = reportIdFrom(request)
  const comments = await getReportComments(reportId)

  response.json({
    data: comments,
  })
})

router.post('/', async (request, response) => {
  const reportId = reportIdFrom(request)
  const body = requireText(request.body?.body, 'Comment', MAX_COMMENT_LENGTH)

  const comment = await withTransaction(async (client) => {
    const report = await client.query(
      'SELECT id FROM reports WHERE id = $1 LIMIT 1',
      [reportId],
    )

    if (report.rows.length === 0) {
      throw new HttpError(404, 'Report not found.')
    }

    const result = await client.query(
      `INSERT INTO report_comments (report_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id::text, report_id::text, user_id::text, body, created_at`,
      [reportId, request.user.id, body],
    )

    await createAuditEntry(client, {
      actorId: request.user.id,
      action: 'report.comment_added',
      entityType: 'report',
      entityId: reportId,
      details: {
        comment_id: result.rows[0].id,
      },
    })

    return result.rows[0]
  })

  response.status(201).json({
    data: {
      id: comment.id,
      reportId: comment.report_id,
      body: comment.body,
      author: {
        id: request.user.id,
        name: request.user.name,
        email: request.user.email,
      },
      createdAt: comment.created_at,
    },
  })
})

export default router
