import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  EmptyState,
  ErrorNotice,
  PageHeading,
  PanelHeading,
  PriorityBadge,
  SkeletonCards,
  SkeletonPanel,
  StatCard,
  StatusBadge,
  formatDateTime,
  formatRelative,
} from '../../components/admin/AdminUi'
import { getOverview } from '../../services/adminApi'
import { getCurrentUser } from '../../services/auth'
import { isAdminRole, type OverviewData, type ReportSummary } from '../../types/adminPanel'

const STATUS_COLORS: Record<string, string> = {
  Received: '#e5b85e',
  'In progress': '#e07b5b',
  Resolved: '#4f9b73',
}

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#8ea69a',
  Medium: '#e5b85e',
  High: '#e07b5b',
  Critical: '#b94d3c',
}

function shortDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function ReportLink({ report }: { report: ReportSummary }) {
  return (
    <Link to={`/admin/reports/${report.reference}`} className="admin-report-link">
      {report.title}
    </Link>
  )
}

function AdminDashboard() {
  const canManageStructure = isAdminRole(getCurrentUser()?.role)
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setData(await getOverview())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the overview.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const createdLast30Days = useMemo(
    () => data?.createdPerDay.reduce((sum, item) => sum + item.count, 0) ?? 0,
    [data],
  )

  const statusTotal = useMemo(
    () => data?.byStatus.reduce((sum, item) => sum + item.count, 0) ?? 0,
    [data],
  )

  const resolutionRate = data && data.totals.totalReports > 0
    ? Math.round((data.totals.resolvedReports / data.totals.totalReports) * 100)
    : 0

  const maxDepartmentCount = Math.max(
    1,
    ...(data?.byDepartment.map((item) => item.count) ?? [1]),
  )

  const maxPriorityCount = Math.max(
    1,
    ...(data?.byPriority.map((item) => item.count) ?? [1]),
  )

  return (
    <div className="admin-page">
      <PageHeading
        eyebrow="Operations overview"
        title="Overview"
        description="Live operational picture of infrastructure reports, response workload, and SLA risk."
        actions={(
          <>
            <button
              type="button"
              className="admin-button ghost"
              onClick={() => void load()}
              disabled={loading}
            >
              <i className={`bi bi-arrow-clockwise${loading ? ' spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
            <Link to="/admin/reports" className="admin-button primary">
              <i className="bi bi-file-earmark-text" aria-hidden="true" />
              View reports
            </Link>
          </>
        )}
      />

      {error && <ErrorNotice message={error} onRetry={() => void load()} />}

      {loading && !data ? (
        <>
          <SkeletonCards count={5} />
          <div className="admin-overview-grid">
            <SkeletonPanel rows={7} />
            <SkeletonPanel rows={7} />
          </div>
        </>
      ) : data ? (
        <>
          <div className="admin-stat-grid five">
            <StatCard
              label="Total reports"
              value={data.totals.totalReports}
              hint={`${data.totals.openReports} currently open`}
              icon="bi-file-earmark-text"
              tone="green"
              to="/admin/reports"
            />
            <StatCard
              label="Awaiting review"
              value={data.totals.awaitingReview}
              hint="Received reports to triage"
              icon="bi-inbox"
              tone="gold"
              to="/admin/reports?status=Received"
            />
            <StatCard
              label="In progress"
              value={data.totals.inProgress}
              hint="Being handled by teams"
              icon="bi-tools"
              tone="orange"
              to="/admin/reports?status=In%20progress"
            />
            <StatCard
              label="Resolved"
              value={data.totals.resolvedReports}
              hint={`${resolutionRate}% resolution rate`}
              icon="bi-check2-circle"
              tone="blue"
              to="/admin/reports?status=Resolved"
            />
            <StatCard
              label="Overdue"
              value={data.totals.overdueReports}
              hint={`${data.totals.slaDueSoon} due in the next 24h`}
              icon="bi-clock-history"
              tone="red"
              to="/admin/reports?overdue=true"
            />
          </div>

          <div className="admin-overview-grid">
            <section className="admin-panel admin-span-2">
              <PanelHeading
                title="Reports created"
                description={`${createdLast30Days} report${createdLast30Days === 1 ? '' : 's'} in the last 30 days`}
                action={(
                  <span className="admin-panel-chip">
                    <i className="bi bi-calendar3" aria-hidden="true" />
                    30 days
                  </span>
                )}
              />
              <div className="admin-chart-area">
                <ResponsiveContainer width="100%" height={255}>
                  <AreaChart data={data.createdPerDay} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reportTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e07b5b" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="#e07b5b" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e7ece6" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fill: '#899690', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={4}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#899690', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value)} reports`, 'Created']}
                      labelFormatter={(value) => shortDate(String(value))}
                      contentStyle={{
                        border: '1px solid #e3e8e1',
                        borderRadius: 8,
                        boxShadow: '0 10px 28px rgba(18,60,58,.12)',
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#d97455"
                      strokeWidth={2.4}
                      fill="url(#reportTrend)"
                      activeDot={{ r: 5, fill: '#123c3a', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="admin-panel">
              <PanelHeading title="Status mix" description="All reports by current status" />
              <div className="admin-donut-layout">
                <div className="admin-donut">
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie
                        data={data.byStatus.filter((item) => item.count > 0)}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={58}
                        outerRadius={82}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {data.byStatus.filter((item) => item.count > 0).map((item) => (
                          <Cell key={item.status} fill={STATUS_COLORS[item.status]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${Number(value)} reports`, String(name)]}
                        contentStyle={{
                          border: '1px solid #e3e8e1',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="admin-donut-center">
                    <strong>{statusTotal}</strong>
                    <span>reports</span>
                  </div>
                </div>
                <div className="admin-legend">
                  {data.byStatus.map((item) => (
                    <div key={item.status}>
                      <i style={{ background: STATUS_COLORS[item.status] }} aria-hidden="true" />
                      <span>{item.status}</span>
                      <b>{item.count}</b>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="admin-overview-grid">
            <section className="admin-panel">
              <PanelHeading
                title="Department workload"
                description="Assigned reports by department"
                action={canManageStructure ? <Link to="/admin/departments" className="admin-text-link">Open departments</Link> : undefined}
              />
              <div className="admin-department-bars">
                {data.byDepartment.map((department) => (
                  <div key={department.id} className="admin-department-row">
                    <div>
                      <span>{department.name}</span>
                      <small>{department.openCount} open · {department.resolvedCount} resolved</small>
                    </div>
                    <div className="admin-bar-track">
                      <i style={{ width: `${(department.count / maxDepartmentCount) * 100}%` }} />
                    </div>
                    <b>{department.count}</b>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-panel">
              <PanelHeading title="Priority breakdown" description="Reports by urgency" />
              <div className="admin-priority-bars">
                {data.byPriority.map((item) => (
                  <div key={item.priority}>
                    <div>
                      <PriorityBadge priority={item.priority} />
                      <b>{item.count}</b>
                    </div>
                    <div className="admin-bar-track">
                      <i
                        style={{
                          width: `${(item.count / maxPriorityCount) * 100}%`,
                          background: PRIORITY_COLORS[item.priority],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="admin-overview-grid wide-left">
            <section className="admin-panel">
              <PanelHeading
                title="Recent reports"
                description="The latest five reports submitted"
                action={<Link to="/admin/reports" className="admin-text-link">All reports</Link>}
              />
              {data.recentReports.length === 0 ? (
                <EmptyState
                  icon="bi-file-earmark-plus"
                  title="No reports yet"
                  text="New citizen reports will appear here as soon as they are submitted."
                />
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Report</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentReports.map((report) => (
                        <tr key={report.id}>
                          <td><span className="admin-reference">{report.reference}</span></td>
                          <td>
                            <ReportLink report={report} />
                            <small>{report.category}</small>
                          </td>
                          <td>{report.department?.name ?? <span className="admin-muted">Unassigned</span>}</td>
                          <td><StatusBadge status={report.status} /></td>
                          <td><span title={formatDateTime(report.createdAt)}>{formatRelative(report.createdAt)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="admin-panel">
              <PanelHeading
                title="Overdue reports"
                description="Past their SLA deadline"
                action={(
                  <span className={`admin-count-pill${data.overdueReports.length > 0 ? ' danger' : ''}`}>
                    {data.overdueReports.length}
                  </span>
                )}
              />
              {data.overdueReports.length === 0 ? (
                <EmptyState
                  icon="bi-check2-circle"
                  title="Nothing overdue"
                  text="Every open report is still within its SLA deadline."
                />
              ) : (
                <div className="admin-overdue-list">
                  {data.overdueReports.map((report) => (
                    <Link key={report.id} to={`/admin/reports/${report.reference}`}>
                      <span className="admin-overdue-icon">
                        <i className="bi bi-clock-history" aria-hidden="true" />
                      </span>
                      <div>
                        <b>{report.title}</b>
                        <small>{report.reference} · {report.department?.name ?? 'Unassigned'}</small>
                      </div>
                      <span className="admin-overdue-time">
                        {report.slaDeadline ? formatRelative(report.slaDeadline) : 'Overdue'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default AdminDashboard
