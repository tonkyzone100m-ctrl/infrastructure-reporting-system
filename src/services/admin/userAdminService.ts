import {
  getUsersFromApi,
  type AdminUserRecord as ApiAdminUserRecord,
} from '../apiClient'

import type { AdminUserRole } from '../../types/admin/user'

export type AdminUserSummary = {
  id: number
  name: string
  email: string
  role: AdminUserRole
  createdAt: string
  reportCount: number
}

export function toAdminUserSummary(
  user: ApiAdminUserRecord,
): AdminUserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    reportCount: user.reportCount,
  }
}

export async function getAdminUsers():
  Promise<AdminUserSummary[]> {
  const users = await getUsersFromApi()

  return users.map(toAdminUserSummary)
}

export function searchAdminUsers(
  users: readonly AdminUserSummary[],
  query: string,
): AdminUserSummary[] {
  const normalizedQuery =
    query.trim().toLowerCase()

  if (!normalizedQuery) {
    return [...users]
  }

  return users.filter((user) =>
    `${user.name} ${user.email} ${user.role}`
      .toLowerCase()
      .includes(normalizedQuery),
  )
}
