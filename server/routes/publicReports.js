import { Router } from 'express'

import { createAuditEntry } from '../audit.js'
import {
  REPORT_CATEGORIES,
  REPORT_DEFAULT_PRIORITY,
  REPORT_DEFAULT_STATUS,
} from '../constants.js'
import {
  query,
  withTransaction,
} from '../db.js'
import {
  HttpError,
  parseCoordinate,
  requireText,
} from '../http.js'
import { requireAuth } from '../middleware/auth.js'
import {
  getReportDetail,
  parseEvidencePayload,
} from '../reports.js'

const router = Router()

function mapPublicReport(row) {
  return {
    id: row.id,
    reference: row.reference,
    title: row.title,
    category: row.category,
    description: row.description,
    location: row.location,
    status: row.status,
    priority: row.priority,
    evidenceName: row.evidence_name,
    commentCount: Number(row.comment_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

router.get('/', async (_request, response) => {
  const result = await query(
    `SELECT
       report.id::text AS id,
       report.reference,
       report.title,
       report.category,
       report.description,
       report.location,
       report.status,
       report.priority,
       report.evidence_name,
       0 AS comment_count,
       report.created_at,
       report.updated_at
     FROM reports report
     ORDER BY report.created_at DESC, report.id DESC`,
  )

  response.json({
    data: result.rows.map(mapPublicReport),
  })
})

router.get('/mine', requireAuth, async (request, response) => {
  const result = await query(
    `SELECT
       report.id::text AS id,
       report.reference,
       report.title,
       report.category,
       report.description,
       report.location,
       report.status,
       report.priority,
       report.evidence_name,
       COUNT(comment.id)::int AS comment_count,
       report.created_at,
       report.updated_at
     FROM reports report
     LEFT JOIN report_comments comment ON comment.report_id = report.id
     WHERE report.user_id = $1
     GROUP BY report.id
     ORDER BY report.created_at DESC, report.id DESC`,
    [request.user.id],
  )

  response.json({
    data: result.rows.map(mapPublicReport),
  })
})

router.post('/', requireAuth, async (request, response) => {
  const title = requireText(request.body?.title, 'Title', 180)
  const category = requireText(request.body?.category, 'Category', 80)
  const description = requireText(request.body?.description, 'Description', 4000)
  const location = requireText(request.body?.location, 'Location', 255)
  const latitude = parseCoordinate(request.body?.latitude, 'latitude', -90, 90)
  const longitude = parseCoordinate(request.body?.longitude, 'longitude', -180, 180)
  const evidence = parseEvidencePayload(request.body)

  if (!REPORT_CATEGORIES.includes(category)) {
    throw new HttpError(400, 'Unsupported report category.')
  }

  const reportId = await withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO reports (
         title,
         category,
         description,
         location,
         latitude,
         longitude,
         user_id,
         status,
         priority,
         evidence_name,
         evidence_data
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id::text, reference`,
      [
        title,
        category,
        description,
        location,
        latitude,
        longitude,
        request.user.id,
        REPORT_DEFAULT_STATUS,
        REPORT_DEFAULT_PRIORITY,
        evidence.name,
        evidence.buffer,
      ],
    )

    const created = result.rows[0]

    if (evidence.buffer) {
      await client.query(
        `INSERT INTO report_evidence (
           report_id,
           file_name,
           original_name,
           mime_type,
           size_bytes
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          created.id,
          evidence.name,
          evidence.name,
          evidence.mimeType,
          evidence.buffer.length,
        ],
      )
    }

    await createAuditEntry(client, {
      actorId: request.user.id,
      action: 'report.created',
      entityType: 'report',
      entityId: created.id,
      details: {
        reference: created.reference,
        title,
        category,
        status: REPORT_DEFAULT_STATUS,
        priority: REPORT_DEFAULT_PRIORITY,
      },
    })

    return created.id
  })

  const report = await getReportDetail(reportId)

  response.status(201).json({
    data: report,
  })
})

export default router
