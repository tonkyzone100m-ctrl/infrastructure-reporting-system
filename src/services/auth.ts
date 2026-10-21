import {
  USER_ROLES,
  isStaffRole,
  type CurrentUser,
  type UserRole,
} from '../types/adminPanel'

const USER_KEY = 'reporthub_user'
export const TOKEN_KEY = 'reporthub_token'

export type AuthUser = CurrentUser

export type SaveableUser = Omit<Pick<CurrentUser, 'id' | 'name' | 'email' | 'role'>, 'id'> &
  { id: string | number } &
  Partial<Pick<CurrentUser, 'role_full' | 'department_id' | 'created_at'>>

function isUserRole(value: unknown): value is UserRole {
  return USER_ROLES.includes(value as UserRole)
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getCurrentUser(): CurrentUser | null {
  const value = localStorage.getItem(USER_KEY)

  if (!value) {
    return null
  }

  try {
    const user = JSON.parse(value) as Partial<CurrentUser>

    if (
      typeof user.id !== 'string' ||
      typeof user.name !== 'string' ||
      typeof user.email !== 'string' ||
      !isUserRole(user.role)
    ) {
      return null
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      role_full: typeof user.role_full === 'string' ? user.role_full : null,
      department_id: typeof user.department_id === 'string' ? user.department_id : null,
      created_at: typeof user.created_at === 'string' ? user.created_at : undefined,
    }
  } catch {
    return null
  }
}

export function saveSession(user: SaveableUser, token: string): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  localStorage.setItem(TOKEN_KEY, token)
}

export function saveCurrentUser(user: SaveableUser, token?: string): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))

  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

export function signOut(): void {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

export function isCurrentUserStaff(): boolean {
  return isStaffRole(getCurrentUser()?.role)
}
