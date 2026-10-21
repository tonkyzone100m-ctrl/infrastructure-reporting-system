import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'

import Home from './pages/Home'
import Report from './pages/Report'
import Track from './pages/Track'
import About from './pages/About'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Register from './pages/Register'
import MyReports from './pages/MyReports'
import Profile from './pages/Profile'

import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminReports from './pages/admin/AdminReports'
import AdminReportDetails from './pages/admin/AdminReportDetails'
import AdminMap from './pages/admin/AdminMap'
import AdminAIAnalyzer from './pages/admin/AdminAIAnalyzer'
import AdminDepartments from './pages/admin/AdminDepartments'
import AdminUsers from './pages/admin/AdminUsers'
import AdminAuditLog from './pages/admin/AdminAuditLog'
import RequireAuth from './components/RequireAuth'

function NotFound() {
  return (
    <main className="container py-5">
      <div className="text-center">
        <div className="display-1 fw-bold text-primary">404</div>
        <h1 className="fw-bold mt-3">Page not found</h1>
        <p className="text-secondary mb-4">
          The page you are looking for does not exist or may have been moved.
        </p>
        <Link to="/" className="btn btn-primary">
          <i className="bi bi-house me-2" aria-hidden="true" />
          Back to Home
        </Link>
      </div>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />

          <Route element={<RequireAuth role="citizen" />}>
            <Route path="/report" element={<Report />} />
          </Route>

          <Route path="/track" element={<Track />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<RequireAuth role="citizen" />}>
            <Route path="/my-reports" element={<MyReports />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />

        <Route element={<RequireAuth staff />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="reports/:id" element={<AdminReportDetails />} />
            <Route path="map" element={<AdminMap />} />
            <Route path="ai-analyzer" element={<AdminAIAnalyzer />} />
            <Route path="departments" element={<AdminDepartments />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="audit-log" element={<AdminAuditLog />} />

            <Route path="notifications" element={<Navigate to="/admin" replace />} />
            <Route path="analytics" element={<Navigate to="/admin" replace />} />
            <Route path="settings" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
