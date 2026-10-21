import type {
  AIAnalysisSummary,
  AIInsight,
} from '../../types/admin/ai'

import type {
  ReportPriority as AdminReportPriority,
} from '../../types/admin/report'

import type {
  Report,
  ReportPriority,
} from '../../types/report'

import {
  normalizeReportPriority,
  normalizeReportStatus,
} from '../../utils/admin/formatters'

export type ReportGroup = {
  key: string
  reports: Report[]
  count: number
  criticalCount: number
  highCount: number
}

function countLabel(
  count: number,
  singular: string,
): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

function toAdminReportPriority(
  priority: ReportPriority,
): AdminReportPriority {
  switch (normalizeReportPriority(priority)) {
    case 'Critical':
      return 'critical'

    case 'High':
      return 'high'

    case 'Medium':
      return 'medium'

    case 'Low':
      return 'low'

    default:
      return 'medium'
  }
}

function getLocationInsightLevel(
  group: ReportGroup,
): ReportPriority {
  if (group.criticalCount > 0) {
    return 'Critical'
  }

  if (group.highCount > 0) {
    return 'High'
  }

  return 'Medium'
}

function getCategoryInsightLevel(
  group: ReportGroup,
): ReportPriority {
  if (group.criticalCount >= 2) {
    return 'Critical'
  }

  if (group.highCount >= 2) {
    return 'High'
  }

  return 'Medium'
}

function groupReports(
  reports: readonly Report[],
  getKey: (report: Report) => string,
): ReportGroup[] {
  const groups =
    new Map<string, Report[]>()

  reports.forEach((report) => {
    const key = getKey(report).trim()

    if (!key) {
      return
    }

    const existing = groups.get(key)

    if (existing) {
      existing.push(report)
    } else {
      groups.set(key, [report])
    }
  })

  return Array.from(groups.entries())
    .map(([key, groupedReports]) => ({
      key,
      reports: groupedReports,
      count: groupedReports.length,
      criticalCount:
        groupedReports.filter(
          (report) =>
            normalizeReportPriority(
              report.priority,
            ) === 'Critical',
        ).length,
      highCount:
        groupedReports.filter(
          (report) =>
            normalizeReportPriority(
              report.priority,
            ) === 'High',
        ).length,
    }))
    .sort((first, second) =>
      second.count - first.count,
    )
}

export function getPriorityWeight(
  priority: ReportPriority,
): number {
  switch (normalizeReportPriority(priority)) {
    case 'Critical':
      return 4

    case 'High':
      return 3

    case 'Medium':
      return 2

    case 'Low':
      return 1

    default:
      return 0
  }
}

export function groupReportsByCategory(
  reports: readonly Report[],
): ReportGroup[] {
  return groupReports(
    reports,
    (report) => report.category,
  )
}

export function groupReportsByLocation(
  reports: readonly Report[],
): ReportGroup[] {
  return groupReports(
    reports,
    (report) => report.location,
  )
}

export function generateInsights(
  reports: readonly Report[],
): AIInsight[] {
  const normalizedReports: Report[] =
    reports.map((report) => ({
      ...report,
      status: normalizeReportStatus(
        report.status,
      ),
      priority: normalizeReportPriority(
        report.priority,
      ),
    }))

  const criticalReports =
    normalizedReports.filter(
      (report) =>
        report.priority === 'Critical',
    )

  const inProgressReports =
    normalizedReports.filter(
      (report) =>
        report.status === 'In Progress',
    )

  const unresolvedReports =
    normalizedReports.filter(
      (report) =>
        report.status !== 'Resolved',
    )

  const categoryGroups =
    groupReportsByCategory(normalizedReports)

  const locationGroups =
    groupReportsByLocation(normalizedReports)

  const generated: AIInsight[] = []

  if (criticalReports.length > 0) {
    generated.push({
      id: 'critical-reports',
      area: 'Multiple locations',
      issueCount: criticalReports.length,
      priority: 'critical',
      reason: [
        'Several reports are currently marked as Critical. These cases should receive administrative attention before lower-priority cases.',
        `${countLabel(
          criticalReports.length,
          'critical report',
        )} detected.`,
        'Critical priority is already assigned in the report data.',
        'Recommendation is advisory and requires human review.',
      ].join(' '),
      recommendedAction:
        'Review critical reports before lower-priority cases.',
      confidence: Math.min(
        98,
        80 + criticalReports.length * 3,
      ),
    })
  }

  locationGroups
    .filter((group) => group.count >= 2)
    .slice(0, 3)
    .forEach((group, index) => {
      const level =
        getLocationInsightLevel(group)

      generated.push({
        id: `location-${index}`,
        area: group.key,
        issueCount: group.count,
        priority:
          toAdminReportPriority(level),
        reason: [
          `${group.count} reports are associated with the same location. This may indicate a recurring or concentrated infrastructure issue.`,
          `${countLabel(
            group.count,
            'related report',
          )} detected.`,
          group.criticalCount > 0
            ? `${countLabel(
                group.criticalCount,
                'critical report',
              )} in this area.`
            : 'No critical reports detected in this group.',
          group.highCount > 0
            ? `${countLabel(
                group.highCount,
                'high-priority report',
              )} detected.`
            : 'No high-priority reports detected in this group.',
        ].join(' '),
        recommendedAction:
          'Review the related reports and confirm whether they describe the same underlying issue.',
        confidence: Math.min(
          95,
          65 + group.count * 7,
        ),
      })
    })

  categoryGroups
    .filter((group) => group.count >= 3)
    .slice(0, 3)
    .forEach((group, index) => {
      const level =
        getCategoryInsightLevel(group)

      generated.push({
        id: `category-${index}`,
        area: group.key,
        issueCount: group.count,
        priority:
          toAdminReportPriority(level),
        reason: [
          `${group.count} reports belong to the ${group.key} category, indicating a recurring issue that may deserve administrative review.`,
          `${countLabel(
            group.count,
            'report',
          )} in this category.`,
          `${countLabel(
            group.criticalCount,
            'critical report',
          )}.`,
          `${countLabel(
            group.highCount,
            'high-priority report',
          )}.`,
        ].join(' '),
        recommendedAction:
          'Review the recurring category and consider a coordinated response.',
        confidence: Math.min(
          92,
          60 + group.count * 5,
        ),
      })
    })

  if (
    unresolvedReports.length > 0 &&
    inProgressReports.length > 0
  ) {
    generated.push({
      id: 'unresolved-workload',
      area: 'System-wide',
      issueCount: unresolvedReports.length,
      priority: 'medium',
      reason: [
        'A number of reports remain unresolved while other reports are already in progress. Administrators may want to review workload distribution and aging cases.',
        `${countLabel(
          unresolvedReports.length,
          'unresolved report',
        )}.`,
        `${countLabel(
          inProgressReports.length,
          'report',
        )} currently in progress.`,
        'AI does not assign workload or departments automatically.',
      ].join(' '),
      recommendedAction:
        'Review workload distribution and aging cases.',
      confidence: 78,
    })
  }

  return generated
}

export function calculateOverallConfidence(
  insights: readonly AIInsight[],
): number {
  if (insights.length === 0) {
    return 0
  }

  const total = insights.reduce(
    (sum, insight) =>
      sum + insight.confidence,
    0,
  )

  return Math.round(
    total / insights.length,
  )
}

export function buildAnalysisSummary(
  reports: readonly Report[],
  generatedAt: string,
): AIAnalysisSummary {
  const insights = generateInsights(reports)

  const locationGroups =
    groupReportsByLocation(reports)

  const highPriorityReports =
    reports.filter(
      (report) =>
        normalizeReportPriority(
          report.priority,
        ) === 'High',
    ).length

  return {
    analyzedReports: reports.length,
    criticalAreas:
      locationGroups.filter(
        (group) => group.criticalCount > 0,
      ).length,
    highPriorityReports,
    generatedAt,
    insights,
  }
}
