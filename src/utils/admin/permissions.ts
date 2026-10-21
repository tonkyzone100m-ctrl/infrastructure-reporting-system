import type { AuthUser } from '../../services/auth'

import type { AdminUserRole } from '../../types/admin/user'

export type AdminPermission =
  | 'dashboard:view'
  | 'reports:view'
  | 'reports:manage'
  | 'map:view'
  | 'analytics:view'
  | 'ai-analyzer:view'
  | 'departments:view'
  | 'users:view'
  | 'notifications:view'
  | 'settings:manage'

const ADMIN_PERMISSIONS:
  readonly AdminPermission[] = [
    'dashboard:view',
    'reports:view',
    'reports:manage',
    'map:view',
    'analytics:view',
    'ai-analyzer:view',
    'departments:view',
    'users:view',
    'notifications:view',
    'settings:manage',
  ]

const ROLE_PERMISSIONS:
  Record<AdminUserRole, ReadonlySet<AdminPermission>> = {
    admin: new Set(ADMIN_PERMISSIONS),
    citizen: new Set<AdminPermission>(),
  }

/*
 * These helpers only control UI visibility. The server must enforce
 * authorization for every administrative action.
 */
export function isAdminRole(
  role: AdminUserRole | null | undefined,
): role is 'admin' {
  return role === 'admin'
}

export function hasAdminPermission(
  role: AdminUserRole | null | undefined,
  permission: AdminPermission,
): boolean {
  if (!role) {
    return false
  }

  return ROLE_PERMISSIONS[role].has(permission)
}

export function canAccessAdmin(
  user: Pick<AuthUser, 'role'> | null | undefined,
  permission: AdminPermission,
): boolean {
  return hasAdminPermission(
    user?.role,
    permission,
  )
}
