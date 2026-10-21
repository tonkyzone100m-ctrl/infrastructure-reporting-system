import {
  getReportFromApi,
  getReportsFromApi,
  updateReportFromApi,
} from '../apiClient'

import type {
  Report,
  ReportCategory,
  ReportPriority,
  ReportStatus,
} from '../../types/report'

import {
  normalizeReportPriority,
  normalizeReportStatus,
  type ReportPriorityInput,
  type ReportStatusInput,
} from '../../utils/admin/formatters'

export type AdminReportFilters = {
  search: string
  status: 'All' | ReportStatus
  priority: 'All' | ReportPriority
  category: 'All' | ReportCategory
}

export type AdminReportChanges = {
  status: ReportStatusInput
  priority: ReportPriorityInput
}

export function normalizeAdminReport(
  report: Report,
): Report {
  return {
    ...report,
    status: normalizeReportStatus(report.status),
    priority: normalizeReportPriority(report.priority),
  }
}

export function filterAdminReports(
  reports: readonly Report[],
  filters?: Partial<AdminReportFilters>,
): Report[] {
  const search =
    filters?.search?.trim().toLowerCase() ?? ''

  const status =
    filters?.status ?? 'All'

  const priority =
    filters?.priority ?? 'All'

  const category =
    filters?.category ?? 'All'

  return reports.filter((report) => {
    const matchesSearch =
      !search ||
      [
        report.reference,
        report.category,
        report.location,
        report.description,
      ].some((value) =>
        value.toLowerCase().includes(search),
      )

    const matchesStatus =
      status === 'All' ||
      normalizeReportStatus(report.status) === status

    const matchesPriority =
      priority === 'All' ||
      normalizeReportPriority(report.priority) === priority

    const matchesCategory =
      category === 'All' ||
      report.category === category

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesCategory
    )
  })
}

export async function getAdminReports(
  filters?: Partial<AdminReportFilters>,
): Promise<Report[]> {
  const reports = await getReportsFromApi()

  return filterAdminReports(
    reports.map(normalizeAdminReport),
    filters,
  )
}

export async function getAdminReport(
  reference: string,
): Promise<Report> {
  return normalizeAdminReport(
    await getReportFromApi(reference),
  )
}

export async function updateAdminReport(
  reference: string,
  changes: AdminReportChanges,
): Promise<Report> {
  const updated = await updateReportFromApi(
    reference,
    {
      status: normalizeReportStatus(changes.status),
      priority: normalizeReportPriority(changes.priority),
    },
  )

  return normalizeAdminReport(updated)
}
