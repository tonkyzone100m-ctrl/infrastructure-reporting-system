import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { loginAdmin } from '../../services/adminApi'
import { getCurrentUser, signOut } from '../../services/auth'
import { isStaffRole } from '../../types/adminPanel'

function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = getCurrentUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (currentUser && isStaffRole(currentUser.role)) {
    return <Navigate to="/admin" replace />
  }

  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const user = await loginAdmin(email.trim(), password)

      if (!isStaffRole(user.role)) {
        signOut()
        setError('This account does not have access to the administration portal.')
        return
      }

      navigate(from.startsWith('/admin') ? from : '/admin', { replace: true })
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Sign in failed. Check your email and password.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-login-shell">
      <section className="admin-login-story">
        <Link to="/" className="admin-brand light">
          <span className="admin-brand-mark">R</span>
          <span className="admin-brand-copy">
            <b>ReportHub</b>
            <small>City operations</small>
          </span>
        </Link>

        <div>
          <span className="admin-eyebrow light">Administration portal</span>
          <h1>Keep the city moving.</h1>
          <p>
            Triage reports, coordinate departments, and track every response
            from first signal to resolution.
          </p>
          <div className="admin-login-points">
            <span><i className="bi bi-inboxes" aria-hidden="true" /> One operational queue</span>
            <span><i className="bi bi-geo-alt" aria-hidden="true" /> Live issue mapping</span>
            <span><i className="bi bi-shield-check" aria-hidden="true" /> Full audit trail</span>
          </div>
        </div>

        <small className="admin-login-footnote">
          Authorized staff access only. All actions are recorded.
        </small>
      </section>

      <section className="admin-login-side">
        <div className="admin-login-card">
          <div className="admin-login-card-head">
            <span className="admin-login-icon">
              <i className="bi bi-shield-lock" aria-hidden="true" />
            </span>
            <h2>Sign in</h2>
            <p>Use your ReportHub staff credentials to continue.</p>
          </div>

          <form onSubmit={(event) => void handleSubmit(event)}>
            <label className="admin-field">
              <span>Email address</span>
              <div className="admin-input-wrap">
                <i className="bi bi-envelope" aria-hidden="true" />
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@reporthub.city"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                />
              </div>
            </label>

            <label className="admin-field">
              <span>Password</span>
              <div className="admin-input-wrap">
                <i className="bi bi-lock" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="admin-input-action"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
                </button>
              </div>
            </label>

            {error && (
              <div className="admin-login-error" role="alert">
                <i className="bi bi-exclamation-circle" aria-hidden="true" />
                {error}
              </div>
            )}

            <button type="submit" className="admin-button primary wide" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="admin-spinner small" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in to administration
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <div className="admin-login-links">
            <Link to="/">Back to public portal</Link>
            <span>Need help? Contact your system administrator.</span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AdminLogin
