import { useEffect, useState } from 'react'
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { ToastProvider } from '../components/admin/ToastProvider'
import { getCurrentUser, signOut } from '../services/auth'
import {
  canViewAudit,
  isAdminRole,
  isStaffRole,
  roleLabel,
} from '../types/adminPanel'

type NavItem = {
  label: string
  to: string
  icon: string
  end?: boolean
  visible: boolean
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  if (!isStaffRole(user.role)) {
    return <Navigate to="/my-reports" replace />
  }

  const navigation: NavItem[] = [
    { label: 'Overview', to: '/admin', icon: 'bi-grid-1x2', end: true, visible: true },
    { label: 'Reports', to: '/admin/reports', icon: 'bi-file-earmark-text', visible: true },
    { label: 'Map', to: '/admin/map', icon: 'bi-map', visible: true },
    {
      label: 'Departments',
      to: '/admin/departments',
      icon: 'bi-buildings',
      visible: isAdminRole(user.role),
    },
    {
      label: 'Users',
      to: '/admin/users',
      icon: 'bi-people',
      visible: isAdminRole(user.role),
    },
    {
      label: 'Audit log',
      to: '/admin/audit-log',
      icon: 'bi-journal-text',
      visible: canViewAudit(user.role),
    },
    {
      label: 'Smart analyser',
      to: '/admin/ai-analyzer',
      icon: 'bi-stars',
      visible: true,
    },
  ]

  function handleSignOut() {
    signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin-app">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <Link to="/admin" className="admin-brand" aria-label="ReportHub administration overview">
            <span className="admin-brand-mark">R</span>
            <span className="admin-brand-copy">
              <b>ReportHub</b>
              <small>Administration</small>
            </span>
          </Link>

          <nav className="admin-desktop-nav" aria-label="Administration navigation">
            {navigation.filter((item) => item.visible).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
              >
                <i className={`bi ${item.icon}`} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="admin-topbar-account">
            <div className="admin-account-copy">
              <b>{user.name}</b>
              <small>{user.role_full ?? roleLabel(user.role)}</small>
            </div>
            <span className="admin-avatar" aria-hidden="true">{initials(user.name)}</span>
            <button type="button" className="admin-signout-button" onClick={handleSignOut}>
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
              <span>Sign out</span>
            </button>
            <button
              type="button"
              className="admin-menu-button"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
            >
              <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'}`} aria-hidden="true" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="admin-mobile-nav" aria-label="Administration navigation">
            {navigation.filter((item) => item.visible).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `admin-mobile-link${isActive ? ' active' : ''}`}
              >
                <i className={`bi ${item.icon}`} aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
            <button type="button" className="admin-mobile-link signout" onClick={handleSignOut}>
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
              Sign out
            </button>
          </nav>
        )}
      </header>

      <main className="admin-main" role="main">
        <div className="admin-container">
          <ToastProvider>
            <Outlet />
          </ToastProvider>
        </div>
      </main>
    </div>
  )
}

export default AdminLayout
