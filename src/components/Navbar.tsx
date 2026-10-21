import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getCurrentUser, signOut } from '../services/auth'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const user = getCurrentUser()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link px-lg-3 ${isActive ? 'active fw-semibold' : ''}`

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top">
      <div className="container">
        <NavLink
          to="/"
          className="navbar-brand fw-bold text-primary"
          end
        >
          <span className="d-inline-flex align-items-center gap-2">
            <img className="brand-logo" src="/reporthub-logo.png" alt="" />
            ReportHub
          </span>
        </NavLink>

        <button
          className="navbar-toggler"
          type="button"
          aria-controls="reportHubNavbar"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div
          className={`navbar-collapse ${menuOpen ? 'show' : ''}`}
          id="reportHubNavbar"
        >
          <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-1">
            <li className="nav-item">
              <NavLink
                to="/"
                end
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                Home
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/report"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                Report an Issue
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/track"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                Track Report
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/about"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                About
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/contact"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                Contact
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/my-reports"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                My Reports
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink
                to="/profile"
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </NavLink>
            </li>

            {!user && (
              <li className="nav-item">
                <NavLink
                  to="/admin/login"
                  className="nav-link px-lg-3 small text-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  Admin
                </NavLink>
              </li>
            )}

            <li className="nav-item ms-lg-2 mt-2 mt-lg-0">
              {user ? (
                <button
                  type="button"
                  className="btn btn-outline-secondary px-3"
                  onClick={() => {
                    signOut()
                    setMenuOpen(false)
                    window.location.assign('/')
                  }}
                >
                  Sign Out
                </button>
              ) : (
                <NavLink
                  to="/login"
                  className="btn btn-primary px-3"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign In
                </NavLink>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default Navbar