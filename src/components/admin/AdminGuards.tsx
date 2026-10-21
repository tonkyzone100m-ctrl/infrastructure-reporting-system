import { Navigate, Outlet } from 'react-router-dom'

import { getCurrentUser } from '../../services/auth'
import { canViewAudit, isAdminRole, isStaffRole } from '../../types/adminPanel'

export function RequireAdmin() {
  const user = getCurrentUser()

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  if (!isStaffRole(user.role)) {
    return <Navigate to="/my-reports" replace />
  }

  if (!isAdminRole(user.role)) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}

export function RequireAuditAccess() {
  const user = getCurrentUser()

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  if (!isStaffRole(user.role)) {
    return <Navigate to="/my-reports" replace />
  }

  if (!canViewAudit(user.role)) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
