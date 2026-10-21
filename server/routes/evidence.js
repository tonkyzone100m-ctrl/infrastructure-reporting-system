import { Router } from 'express'

import { STAFF_ROLES } from '../constants.js'
import { query } from '../db.js'
import {
  HttpError,
  parseOptionalId,
} from '../http.js'
import { requireRoles } from '../middleware/auth.js'
import {
  findReport,
  getReportEvidence,
} from '../reports.js'

const router = Router()

router.use(requireRoles(...STAFF_ROLES))

function requiredId(value, fieldName) {
  const id = parseOptionalId(value, fieldName)

  if (id === null) {
    throw new HttpError(400, `${fieldName} is required.`)
  }

  return id
}

function sendEvidence(response, fileName, mimeType, buffer) {
  const safeName = String(fileName || 'evidence')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_')
    .slice(0, 200) || 'evidence'

  response.setHeader('Content-Type', mimeType || 'application/octet-stream')
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(fileName || 'evidence')}`,
  )
  response.setHeader('Content-Length', buffer.length)
  response.send(buffer)
}

router.get('/reports/:reportId/evidence', async (request, response) => {
  const reportId = requiredId(request.params.reportId, 'reportId')
  const report = await findReport(reportId)

  if (!report) {
    throw new HttpError(404, 'Report not found.')
  }

  const evidence = await getReportEvidence(reportId, report)

  response.json({
    data: evidence,
  })
})

router.get('/reports/:reportId/evidence/download', async (request, response) => {
  const reportId = requiredId(request.params.reportId, 'reportId')
  const result = await query(
    `SELECT evidence_name, evidence_data
     FROM reports
     WHERE id = $1
     LIMIT 1`,
    [reportId],
  )

  const report = result.rows[0]

  if (!report) {
    throw new HttpError(404, 'Report not found.')
  }

  if (!report.evidence_data) {
    throw new HttpError(404, 'No evidence file is attached to this report.')
  }

  sendEvidence(
    response,
    report.evidence_name || 'evidence',
    'application/octet-stream',
    report.evidence_data,
  )
})

router.get('/evidence/:evidenceId/download', async (request, response) => {
  const evidenceId = requiredId(request.params.evidenceId, 'evidenceId')
  const result = await query(
    `SELECT
       evidence.original_name,
       evidence.mime_type,
       report.evidence_name,
       report.evidence_data
     FROM report_evidence evidence
     JOIN reports report ON report.id = evidence.report_id
     WHERE evidence.id = $1
     LIMIT 1`,
    [evidenceId],
  )

  const evidence = result.rows[0]

  if (!evidence) {
    throw new HttpError(404, 'Evidence not found.')
  }

  if (!evidence.evidence_data) {
    throw new HttpError(404, 'The evidence file is no longer available.')
  }

  sendEvidence(
    response,
    evidence.original_name || evidence.evidence_name || 'evidence',
    evidence.mime_type,
    evidence.evidence_data,
  )
})

export default router
