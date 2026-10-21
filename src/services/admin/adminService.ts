import type {
  AIAnalysisSummary,
} from '../../types/admin/ai'

import type {
  Report,
  ReportPriority,
  ReportStatus,
} from '../../types/report'

import {
  normalizeReportPriority,
  normalizeReportStatus,
} from '../../utils/admin/formatters'

import {
  buildAnalysisSummary,
} from './aiAnalyzerService'

import {
  getAdminReports,
} from './reportAdminService'

import {
  getAdminUsers,
} from './userAdminService'

export type AdminReportStatistics = {
  totalReports: number
  statusCounts: Record<ReportStatus, number>
  priorityCounts: Record<ReportPriority, number>
  mappedReports: number
  resolutionRate: number
}

export type AdminCategorySummary = {
  name: string
  count: number
}

export type AdminLocationSummary = {
  name: string
  count: number
}

export type AdminDashboardOverview = {
  statistics: AdminReportStatistics
  registeredUsers: number
  recentReports: Report[]
  analysis: AIAnalysisSummary
}

export type AdminAnalyticsOverview = {
  statistics: AdminReportStatistics
  categories: AdminCategorySummary[]
  locations: AdminLocationSummary[]
  recentReports: Report[]
}

function isValidCoordinate(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value)
  )
}

function getPercentage(
  value: number,
  total: number,
): number {
  if (total <= 0 || value <= 0) {
    return 0
  }

  return Math.round(
    (value / total) * 100,
  )
}

function getSummaryCounts(
  reports: readonly Report[],
  getKey: (report: Report) => string,
  fallback: string,
): Map<string, number> {
  const counts =
    new Map<string, number>()

  reports.forEach((report) => {
    const name =
      getKey(report).trim() || fallback

    counts.set(
      name,
      (counts.get(name) ?? 0) + 1,
    )
  })

  return counts
}

function toSortedSummaries(
  counts: ReadonlyMap<string, number>,
  limit: number,
): AdminCategorySummary[] {
  return Array.from(counts.entries())
    .map(([name, count]) => ({
      name,
      count,
    }))
    .sort((first, second) =>
      second.count - first.count,
    )
    .slice(0, limit)
}

export function calculateAdminReportStatistics(
  reports: readonly Report[],
): AdminReportStatistics {
  const statusCounts:
    Record<ReportStatus, number> = {
      'Under Review': 0,
      'In Progress': 0,
      Resolved: 0,
    }

  const priorityCounts:
    Record<ReportPriority, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    }

  let mappedReports = 0

  reports.forEach((report) => {
    statusCounts[
      normalizeReportStatus(report.status)
    ] += 1

    priorityCounts[
      normalizeReportPriority(
        report.priority,
      )
    ] += 1

    if (
      isValidCoordinate(report.latitude) &&
      isValidCoordinate(report.longitude)
    ) {
      mappedReports += 1
    }
  })

  return {
    totalReports: reports.length,
    statusCounts,
    priorityCounts,
    mappedReports,
    resolutionRate: getPercentage(
      statusCounts.Resolved,
      reports.length,
    ),
  }
}

export function summarizeReportCategories(
  reports: readonly Report[],
  limit = 5,
): AdminCategorySummary[] {
  return toSortedSummaries(
    getSummaryCounts(
      reports,
      (report) => report.category,
      'Uncategorized',
    ),
    limit,
  )
}

export function summarizeReportLocations(
  reports: readonly Report[],
  limit = 5,
): AdminLocationSummary[] {
  return toSortedSummaries(
    getSummaryCounts(
      reports,
      (report) => report.location,
      'Unknown location',
    ),
    limit,
  )
}

export function getRecentReports(
  reports: readonly Report[],
  limit = 5,
): Report[] {
  return [...reports]
    .sort((first, second) => {
      const firstDate =
        new Date(first.createdAt).getTime()

      const secondDate =
        new Date(second.createdAt).getTime()

      const firstTime = Number.isNaN(
        firstDate,
      )
        ? 0
        : firstDate

      const secondTime = Number.isNaN(
        secondDate,
      )
        ? 0
        : secondDate

      return secondTime - firstTime
    })
    .slice(0, limit)
}

export async function getAdminDashboard():
  Promise<AdminDashboardOverview> {
  const [reports, users] =
    await Promise.all([
      getAdminReports(),
      getAdminUsers(),
    ])

  return {
    statistics:
      calculateAdminReportStatistics(reports),
    registeredUsers: users.length,
    recentReports: getRecentReports(
      reports,
      5,
    ),
    analysis: buildAnalysisSummary(
      reports,
      new Date().toISOString(),
    ),
  }
}

export async function getAdminAnalytics():
  Promise<AdminAnalyticsOverview> {
  const reports = await getAdminReports()

  return {
    statistics:
      calculateAdminReportStatistics(reports),
    categories: summarizeReportCategories(
      reports,
      5,
    ),
    locations: summarizeReportLocations(
      reports,
      5,
    ),
    recentReports: getRecentReports(
      reports,
      6,
    ),
  }
}
