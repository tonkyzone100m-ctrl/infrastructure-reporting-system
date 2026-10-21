import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { getCurrentUser } from '../services/auth'
import {
  isStaffRole,
  type UserRole,
} from '../types/adminPanel'

type RequireAuthProps = {
  role?: 'citizen' | UserRole
  staff?: boolean
}

function RequireAuth({ role, staff = false }: RequireAuthProps) {
  const location = useLocation()
  const user = getCurrentUser()
  const adminRoute = staff || role === 'admin' || role === 'super_admin'

  if (!user) {
    return (
      <Navigate
        to={adminRoute ? '/admin/login' : '/login'}
        state={{ from: location.pathname }}
        replace
      />
    )
  }

  if (staff && !isStaffRole(user.role)) {
    return <Navigate to="/my-reports" replace />
  }

  if (role && user.role !== role) {
    return <Navigate to={isStaffRole(user.role) ? '/admin' : '/my-reports'} replace />
  }

  return <Outlet />
}

export default RequireAuth
