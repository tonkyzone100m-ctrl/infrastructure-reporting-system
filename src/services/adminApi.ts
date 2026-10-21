import { TOKEN_KEY, saveSession, signOut } from './auth'

import type {
  AuditRecord,
  CommentRecord,
  CurrentUser,
  DepartmentRecord,
  OverviewData,
  PaginationMeta,
  ReportDetail,
  ReportFilters,
  ReportSummary,
  UserRecord,
  UserRole,
} from '../types/adminPanel'

const API_BASE_URL = String(
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL
    ?? 'http://localhost:3000/api',
).replace(/\/$/, '')

type ApiEnvelope<T> = {
  data: T
  meta?: PaginationMeta
}

type ApiErrorBody = {
  error?: string
  message?: string
  details?: unknown
}

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const headers = new Headers(options.headers)
  const token = getToken()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiError(
      'The ReportHub API is unavailable. Start the local server and try again.',
      0,
    )
  }

  if (response.status === 204) {
    return { data: undefined as T }
  }

  const contentType = response.headers.get('content-type') ?? ''
  let body: ApiErrorBody & Partial<ApiEnvelope<T>> = {}

  if (contentType.includes('application/json')) {
    body = await response.json() as ApiErrorBody & Partial<ApiEnvelope<T>>
  }

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      signOut()

      if (window.location.pathname.startsWith('/admin')) {
        window.location.assign('/admin/login')
      }
    }

    throw new ApiError(
      body.error ?? body.message ?? 'The API request failed.',
      response.status,
      body.details,
    )
  }

  if (!('data' in body)) {
    throw new ApiError('The API returned an invalid response.', response.status)
  }

  return body as ApiEnvelope<T>
}

function queryString(
  values: Record<string, string | number | undefined | null>,
): string {
  const params = new URLSearchParams()

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value))
    }
  })

  const query = params.toString()
  return query ? `?${query}` : ''
}

export type LoginResponse = {
  token: string
  user: CurrentUser
}

export async function loginAdmin(
  email: string,
  password: string,
): Promise<CurrentUser> {
  const result = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  saveSession(result.data.user, result.data.token)
  return result.data.user
}

export function getOverview(): Promise<OverviewData> {
  return request<OverviewData>('/admin/overview').then((result) => result.data)
}

export async function getReports(
  filters: ReportFilters = {},
): Promise<{ data: ReportSummary[]; meta: PaginationMeta }> {
  const path = `/admin/reports${queryString({
    search: filters.search,
    status: filters.status,
    priority: filters.priority,
    category: filters.category,
    departmentId: filters.departmentId,
    assignedTo: filters.assignedTo,
    overdue: filters.overdue,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    page: filters.page,
    pageSize: filters.pageSize,
  })}`
  const result = await request<ReportSummary[]>(path)

  return {
    data: result.data,
    meta: result.meta ?? {
      page: Number(filters.page ?? 1),
      pageSize: Number(filters.pageSize ?? 20),
      total: result.data.length,
      totalPages: 1,
    },
  }
}

export async function getAllReports(
  filters: ReportFilters = {},
): Promise<{ data: ReportSummary[]; total: number }> {
  const pageSize = 100
  let page = 1
  let totalPages = 1
  const reports: ReportSummary[] = []

  while (page <= totalPages && page <= 20) {
    const result = await getReports({
      ...filters,
      page: String(page),
      pageSize: String(pageSize),
    })

    reports.push(...result.data)
    totalPages = result.meta.totalPages
    page += 1
  }

  return {
    data: reports,
    total: reports.length,
  }
}

export function getReport(idOrReference: string): Promise<ReportDetail> {
  return request<ReportDetail>(
    `/admin/reports/${encodeURIComponent(idOrReference)}`,
  ).then((result) => result.data)
}

export type ReportUpdate = {
  status?: string
  priority?: string
  department_id?: string | null
  assigned_to?: string | null
  sla_deadline?: string | null
}

export function updateReport(
  idOrReference: string,
  changes: ReportUpdate,
): Promise<ReportDetail> {
  return request<ReportDetail>(
    `/admin/reports/${encodeURIComponent(idOrReference)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(changes),
    },
  ).then((result) => result.data)
}

export function getComments(reportId: string): Promise<CommentRecord[]> {
  return request<CommentRecord[]>(`/admin/reports/${reportId}/comments`)
    .then((result) => result.data)
}

export function addComment(
  reportId: string,
  body: string,
): Promise<CommentRecord> {
  return request<CommentRecord>(`/admin/reports/${reportId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  }).then((result) => result.data)
}

export function getDepartments(): Promise<DepartmentRecord[]> {
  return request<DepartmentRecord[]>('/admin/departments')
    .then((result) => result.data)
}

export function createDepartment(name: string): Promise<DepartmentRecord> {
  return request<DepartmentRecord>('/admin/departments', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }).then((result) => result.data)
}

export function renameDepartment(
  id: string,
  name: string,
): Promise<DepartmentRecord> {
  return request<DepartmentRecord>(`/admin/departments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  }).then((result) => result.data)
}

export type UserFilters = {
  search?: string
  role?: string
  departmentId?: string
  unassigned?: string
  page?: string
  pageSize?: string
}

export async function getUsers(
  filters: UserFilters = {},
): Promise<{ data: UserRecord[]; meta: PaginationMeta }> {
  const path = `/admin/users${queryString({
    search: filters.search,
    role: filters.role,
    departmentId: filters.departmentId,
    unassigned: filters.unassigned,
    page: filters.page,
    pageSize: filters.pageSize,
  })}`
  const result = await request<UserRecord[]>(path)

  return {
    data: result.data,
    meta: result.meta ?? {
      page: Number(filters.page ?? 1),
      pageSize: Number(filters.pageSize ?? 20),
      total: result.data.length,
      totalPages: 1,
    },
  }
}

export type CreateUserInput = {
  name: string
  email: string
  password: string
  role: UserRole
  department_id: string | null
}

export function createUser(input: CreateUserInput): Promise<UserRecord> {
  return request<UserRecord>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((result) => result.data)
}

export type UpdateUserInput = {
  name?: string
  role?: UserRole
  department_id?: string | null
  password?: string
}

export function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<UserRecord> {
  return request<UserRecord>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }).then((result) => result.data)
}

export type AuditFilters = {
  action?: string
  entityType?: string
  entityId?: string
  actor?: string
  actorId?: string
  from?: string
  to?: string
  page?: string
  pageSize?: string
}

export async function getAuditLog(
  filters: AuditFilters = {},
): Promise<{ data: AuditRecord[]; meta: PaginationMeta }> {
  const path = `/admin/audit_log${queryString({
    action: filters.action,
    entityType: filters.entityType,
    entityId: filters.entityId,
    actor: filters.actor,
    actorId: filters.actorId,
    from: filters.from,
    to: filters.to,
    page: filters.page,
    pageSize: filters.pageSize,
  })}`
  const result = await request<AuditRecord[]>(path)

  return {
    data: result.data,
    meta: result.meta ?? {
      page: Number(filters.page ?? 1),
      pageSize: Number(filters.pageSize ?? 20),
      total: result.data.length,
      totalPages: 1,
    },
  }
}

function resolveDownloadPath(downloadUrl: string): string {
  if (downloadUrl.startsWith('/api/')) {
    return downloadUrl.slice(4)
  }

  if (downloadUrl.startsWith('api/')) {
    return downloadUrl.slice(3)
  }

  return downloadUrl
}

export async function fetchEvidenceBlob(downloadUrl: string): Promise<Blob> {
  const headers = new Headers()
  const token = getToken()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${resolveDownloadPath(downloadUrl)}`, {
    headers,
  })

  if (!response.ok) {
    throw new ApiError('The evidence file could not be downloaded.', response.status)
  }

  return response.blob()
}

export async function downloadEvidence(
  downloadUrl: string,
  fileName: string,
): Promise<void> {
  const blob = await fetchEvidenceBlob(downloadUrl)
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
