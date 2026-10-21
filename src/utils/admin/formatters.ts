import type {
  ReportPriority,
  ReportStatus,
} from '../../types/report'

import type {
  ReportPriority as AdminReportPriority,
  ReportStatus as AdminReportStatus,
} from '../../types/admin/report'

export type ReportStatusInput =
  | ReportStatus
  | AdminReportStatus
  | 'Received'
  | 'In progress'

export type ReportPriorityInput =
  | ReportPriority
  | AdminReportPriority

export type BadgeTone =
  | 'danger'
  | 'warning'
  | 'primary'
  | 'success'
  | 'secondary'

export type BadgeClass =
  `text-bg-${BadgeTone}`

export const REPORT_STATUS_DISPLAY_VALUES:
  readonly ReportStatus[] = [
    'Under Review',
    'In Progress',
    'Resolved',
  ]

export const REPORT_PRIORITY_DISPLAY_VALUES:
  readonly ReportPriority[] = [
    'Critical',
    'High',
    'Medium',
    'Low',
  ]

export function normalizeReportStatus(
  status: ReportStatusInput,
): ReportStatus {
  switch (status) {
    case 'Under Review':
    case 'Received':
    case 'submitted':
    case 'under-review':
      return 'Under Review'

    case 'In Progress':
    case 'In progress':
    case 'in-progress':
      return 'In Progress'

    case 'Resolved':
    case 'resolved':
      return 'Resolved'

    default:
      return 'Under Review'
  }
}

export function normalizeReportPriority(
  priority: ReportPriorityInput,
): ReportPriority {
  switch (priority) {
    case 'Critical':
    case 'critical':
      return 'Critical'

    case 'High':
    case 'high':
      return 'High'

    case 'Medium':
    case 'medium':
      return 'Medium'

    case 'Low':
    case 'low':
      return 'Low'

    default:
      return 'Medium'
  }
}

export function formatReportDate(
  date?: string | null,
): string {
  if (!date) {
    return 'Date unavailable'
  }

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable'
  }

  return parsedDate.toLocaleDateString(
    undefined,
    {
      dateStyle: 'medium',
    },
  )
}

export function formatReportDateTime(
  date?: string | null,
): string {
  if (!date) {
    return 'Date unavailable'
  }

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable'
  }

  return parsedDate.toLocaleString(
    undefined,
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  )
}

export function getReportStatusTone(
  status: ReportStatusInput,
): BadgeTone {
  switch (normalizeReportStatus(status)) {
    case 'Under Review':
      return 'warning'

    case 'In Progress':
      return 'primary'

    case 'Resolved':
      return 'success'

    default:
      return 'secondary'
  }
}

export function getReportPriorityTone(
  priority: ReportPriorityInput,
): BadgeTone {
  switch (normalizeReportPriority(priority)) {
    case 'Critical':
      return 'danger'

    case 'High':
      return 'warning'

    case 'Medium':
      return 'primary'

    case 'Low':
      return 'secondary'

    default:
      return 'secondary'
  }
}

export function getReportStatusBadgeClass(
  status: ReportStatusInput,
): BadgeClass {
  return `text-bg-${getReportStatusTone(status)}`
}

export function getReportPriorityBadgeClass(
  priority: ReportPriorityInput,
): BadgeClass {
  return `text-bg-${getReportPriorityTone(priority)}`
}
