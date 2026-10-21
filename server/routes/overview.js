import { Router } from 'express'

import {
  REPORT_CATEGORIES,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  SLA_DUE_SOON_HOURS,
  STAFF_ROLES,
} from '../constants.js'
import { query } from '../db.js'
import { requireRoles } from '../middleware/auth.js'
import {
  REPORT_COLUMNS,
  REPORT_FROM,
  mapReportSummary,
} from '../reports.js'

const router = Router()

function withZeroCounts(values, rows, key) {
  const counts = new Map(rows.map((row) => [row[key], Number(row.count)]))

  return values.map((value) => ({
    [key]: value,
    count: counts.get(value) ?? 0,
  }))
}

router.get('/', requireRoles(...STAFF_ROLES), async (_request, response) => {
  const [
    totalsResult,
    statusResult,
    priorityResult,
    categoryResult,
    departmentResult,
    recentResult,
    overdueResult,
    dailyResult,
  ] = await Promise.all([
    query(
      `SELECT
         (SELECT COUNT(*) FROM reports)::int AS total_reports,
         (SELECT COUNT(*) FROM users)::int AS total_users,
         (SELECT COUNT(*) FROM departments)::int AS total_departments,
         (SELECT COUNT(*) FROM reports WHERE status = 'Received')::int AS awaiting_review,
         (SELECT COUNT(*) FROM reports WHERE status = 'In progress')::int AS in_progress,
         (SELECT COUNT(*) FROM reports WHERE is_overdue = true)::int AS overdue_reports,
         (SELECT COUNT(*) FROM reports
          WHERE status <> 'Resolved'
            AND sla_deadline IS NOT NULL
            AND sla_deadline >= now()
            AND sla_deadline <= now() + make_interval(hours => $1))::int AS sla_due_soon,
         (SELECT COUNT(*) FROM reports WHERE status = 'Resolved')::int AS resolved_reports`,
      [SLA_DUE_SOON_HOURS],
    ),
    query(
      `SELECT status, COUNT(*)::int AS count
       FROM reports
       GROUP BY status`,
    ),
    query(
      `SELECT priority, COUNT(*)::int AS count
       FROM reports
       GROUP BY priority`,
    ),
    query(
      `SELECT category, COUNT(*)::int AS count
       FROM reports
       GROUP BY category`,
    ),
    query(
      `SELECT
         department.id::text AS id,
         department.name,
         COUNT(report.id)::int AS count,
         COUNT(report.id) FILTER (WHERE report.status <> 'Resolved')::int AS open_count,
         COUNT(report.id) FILTER (WHERE report.status = 'Resolved')::int AS resolved_count
       FROM departments department
       LEFT JOIN reports report ON report.department_id = department.id
       GROUP BY department.id, department.name
       ORDER BY department.name ASC`,
    ),
    query(
      `SELECT ${REPORT_COLUMNS}
       ${REPORT_FROM}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 5`,
    ),
    query(
      `SELECT ${REPORT_COLUMNS}
       ${REPORT_FROM}
       WHERE r.is_overdue = true
       ORDER BY r.sla_deadline ASC NULLS LAST, r.created_at ASC
       LIMIT 10`,
    ),
    query(
      `WITH days AS (
         SELECT generate_series(
           (current_date - interval '29 days')::date,
           current_date::date,
           interval '1 day'
         )::date AS day
       )
       SELECT
         to_char(days.day, 'YYYY-MM-DD') AS date,
         COUNT(report.id)::int AS count
       FROM days
       LEFT JOIN reports report ON report.created_at::date = days.day
       GROUP BY days.day
       ORDER BY days.day ASC`,
    ),
  ])

  const totals = totalsResult.rows[0]

  response.json({
    data: {
      totals: {
        totalReports: totals.total_reports,
        totalUsers: totals.total_users,
        totalDepartments: totals.total_departments,
        awaitingReview: totals.awaiting_review,
        inProgress: totals.in_progress,
        openReports: totals.total_reports - totals.resolved_reports,
        resolvedReports: totals.resolved_reports,
        overdueReports: totals.overdue_reports,
        slaDueSoon: totals.sla_due_soon,
      },
      byStatus: withZeroCounts(REPORT_STATUSES, statusResult.rows, 'status'),
      byPriority: withZeroCounts(REPORT_PRIORITIES, priorityResult.rows, 'priority'),
      byCategory: withZeroCounts(REPORT_CATEGORIES, categoryResult.rows, 'category'),
      byDepartment: departmentResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        count: Number(row.count),
        openCount: Number(row.open_count),
        resolvedCount: Number(row.resolved_count),
      })),
      recentReports: recentResult.rows.map(mapReportSummary),
      overdueReports: overdueResult.rows.map(mapReportSummary),
      createdPerDay: dailyResult.rows.map((row) => ({
        date: row.date,
        count: Number(row.count),
      })),
    },
  })
})

export default router
