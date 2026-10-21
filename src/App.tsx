import {
  BrowserRouter,
  Link,
  Route,
  Routes,
} from 'react-router-dom'

// ============================================================
// LAYOUTS
// ============================================================

import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'

// ============================================================
// PUBLIC PAGES
// ============================================================

import Home from './pages/Home'
import Report from './pages/Report'
import Track from './pages/Track'
import About from './pages/About'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Register from './pages/Register'
import MyReports from './pages/MyReports'
import Profile from './pages/Profile'

// ============================================================
// ADMIN PAGES
// ============================================================

import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminReports from './pages/admin/AdminReports'
import AdminReportDetails from './pages/admin/AdminReportDetails'
import AdminMap from './pages/admin/AdminMap'
import AdminAIAnalyzer from './pages/admin/AdminAIAnalyzer'
import AdminDepartments from './pages/admin/AdminDepartments'
import AdminUsers from './pages/admin/AdminUsers'
import AdminNotifications from './pages/admin/AdminNotifications'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminSettings from './pages/admin/AdminSettings'
import RequireAuth from './components/RequireAuth'

// ============================================================
// 404 PAGE
// ============================================================

function NotFound() {
  return (
    <main className="container py-5">
      <div className="text-center">

        <div className="display-1 fw-bold text-primary">
          404
        </div>

        <h1 className="fw-bold mt-3">
          Page not found
        </h1>

        <p className="text-secondary mb-4">
          The page you are looking for does not exist or
          may have been moved.
        </p>

        <Link
          to="/"
          className="btn btn-primary"
        >
          <i className="bi bi-house me-2" />
          Back to Home
        </Link>

      </div>
    </main>
  )
}

// ============================================================
// APPLICATION
// ============================================================

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ====================================================
            PUBLIC PORTAL
        ==================================================== */}

        <Route element={<MainLayout />}>

          <Route
            path="/"
            element={<Home />}
          />

          <Route element={<RequireAuth role="citizen" />}>
            <Route path="/report" element={<Report />} />
          </Route>

          <Route
            path="/track"
            element={<Track />}
          />

          <Route
            path="/about"
            element={<About />}
          />

          <Route
            path="/contact"
            element={<Contact />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route element={<RequireAuth role="citizen" />}>
            <Route path="/my-reports" element={<MyReports />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

        </Route>

        {/* ====================================================
            ADMIN LOGIN
        ==================================================== */}

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        {/* ====================================================
            ADMINISTRATION PORTAL
        ==================================================== */}

        <Route element={<RequireAuth role="admin" />}>
          <Route path="/admin" element={<AdminLayout />}>

          {/* Dashboard
              URL: /admin
          */}

          <Route
            index
            element={<AdminDashboard />}
          />

          {/* Reports
              URL: /admin/reports
          */}

          <Route
            path="reports"
            element={<AdminReports />}
          />

          {/* Report Details
              URL: /admin/reports/RH-001245
              URL: /admin/reports/123
          */}

          <Route
            path="reports/:id"
            element={<AdminReportDetails />}
          />

          {/* Map Monitoring
              URL: /admin/map
          */}

          <Route
            path="map"
            element={<AdminMap />}
          />

          {/* AI Analyzer
              URL: /admin/ai-analyzer
          */}

          <Route
            path="ai-analyzer"
            element={<AdminAIAnalyzer />}
          />

          {/* Departments
              URL: /admin/departments
          */}

          <Route
            path="departments"
            element={<AdminDepartments />}
          />

          {/* Users
              URL: /admin/users
          */}

          <Route
            path="users"
            element={<AdminUsers />}
          />

          {/* Notifications
              URL: /admin/notifications
          */}

          <Route
            path="notifications"
            element={<AdminNotifications />}
          />

          {/* Analytics
              URL: /admin/analytics
          */}

          <Route
            path="analytics"
            element={<AdminAnalytics />}
          />

          {/* Settings
              URL: /admin/settings
          */}

          <Route
            path="settings"
            element={<AdminSettings />}
          />

          </Route>
        </Route>

        {/* ====================================================
            GLOBAL 404
        ==================================================== */}

        <Route
          path="*"
          element={<NotFound />}
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App