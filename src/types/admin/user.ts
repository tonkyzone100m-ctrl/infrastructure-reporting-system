import type { AdminUser } from './admin'

export type {
  AdminNavItem,
  AdminRole,
  AdminUser,
} from './admin'

export type AdminUserRole =
  | 'citizen'
  | 'admin'

export type AdminUserList =
  AdminUser[]

export type AdminUserWithRole =
  Omit<AdminUser, 'role'> & {
    role: AdminUserRole
  }
