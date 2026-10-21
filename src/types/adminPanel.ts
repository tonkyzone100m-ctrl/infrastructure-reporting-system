export const REPORT_STATUSES = [
  'Received',
  'In progress',
  'Resolved',
] as const

export const REPORT_PRIORITIES = [
  'Low',
  'Medium',
  'High',
  'Critical',
] as const

export const REPORT_CATEGORIES = [
  'Public spaces',
  'Roads & pavements',
  'Street lighting',
  'Water & drainage',
] as const

export const USER_ROLES = [
  'citizen',
  'admin',
  'super_admin',
  'department_manager',
  'field_staff',
  'auditor',
] as const

export type ReportStatus = (typeof REPORT_STATUSES)[number]
export type ReportPriority = (typeof REPORT_PRIORITIES)[number]
export type ReportCategory = (typeof REPORT_CATEGORIES)[number]
export type UserRole = (typeof USER_ROLES)[number]

export const STAFF_ROLES: readonly UserRole[] = [
  'admin',
  'super_admin',
  'department_manager',
  'field_staff',
  'auditor',
]

export const ADMIN_ROLES: readonly UserRole[] = [
  'admin',
  'super_admin',
]

export const REPORT_MANAGE_ROLES: readonly UserRole[] = [
  'admin',
  'super_admin',
  'department_manager',
]

export const AUDIT_VIEW_ROLES: readonly UserRole[] = [
  'admin',
  'super_admin',
  'auditor',
]

export type PersonRef = {
  id: string
  name: string | null
  email?: string | null
}

export type DepartmentRef = {
  id: string
  name: string | null
}

export type CurrentUser = {
  id: string
  name: string
  email: string
  role: UserRole
  role_full: string | null
  department_id: string | null
  created_at?: string
}

export type ReportSummary = {
  id: string
  reference: string
  title: string
  category: string
  status: ReportStatus
  priority: ReportPriority
  location: string | null
  latitude: number | null
  longitude: number | null
  reporter: PersonRef | null
  department: DepartmentRef | null
  assignedTo: PersonRef | null
  slaDeadline: string | null
  isOverdue: boolean
  createdAt: string
  updatedAt: string
}

export type EvidenceRecord = {
  id: string | null
  reportId: string
  fileName: string
  originalName: string
  mimeType: string | null
  sizeBytes: number | null
  uploadedAt: string
  downloadUrl: string
}

export type CommentRecord = {
  id: string
  reportId: string
  body: string
  author: PersonRef | null
  createdAt: string
}

export type AuditRecord = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  actor: PersonRef | null
  details: Record<string, unknown>
  createdAt: string
}

export type ReportDetail = ReportSummary & {
  description: string
  evidenceName: string | null
  evidence: EvidenceRecord[]
  comments: CommentRecord[]
  audit: AuditRecord[]
}

export type DepartmentRecord = {
  id: string
  name: string
  createdAt: string
  userCount: number
  reportCount: number
  openReportCount: number
  resolvedReportCount: number
}

export type UserRecord = {
  id: string
  name: string
  email: string
  role: UserRole
  role_full: string | null
  department: DepartmentRef | null
  reportCount: number
  createdAt: string
}

export type OverviewData = {
  totals: {
    totalReports: number
    totalUsers: number
    totalDepartments: number
    awaitingReview: number
    inProgress: number
    openReports: number
    resolvedReports: number
    overdueReports: number
    slaDueSoon: number
  }
  byStatus: Array<{ status: ReportStatus; count: number }>
  byPriority: Array<{ priority: ReportPriority; count: number }>
  byCategory: Array<{ category: ReportCategory; count: number }>
  byDepartment: Array<{
    id: string
    name: string
    count: number
    openCount: number
    resolvedCount: number
  }>
  recentReports: ReportSummary[]
  overdueReports: ReportSummary[]
  createdPerDay: Array<{ date: string; count: number }>
}

export type PaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type ReportFilters = {
  search?: string
  status?: string
  priority?: string
  category?: string
  departmentId?: string
  assignedTo?: string
  overdue?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortDir?: string
  page?: string
  pageSize?: string
}

export function isStaffRole(role: string | null | undefined): role is UserRole {
  return STAFF_ROLES.includes(role as UserRole)
}

export function isAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes(role as UserRole)
}

export function canManageReports(role: string | null | undefined): boolean {
  return REPORT_MANAGE_ROLES.includes(role as UserRole)
}

export function canViewAudit(role: string | null | undefined): boolean {
  return AUDIT_VIEW_ROLES.includes(role as UserRole)
}

export function roleLabel(role: UserRole | string): string {
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
