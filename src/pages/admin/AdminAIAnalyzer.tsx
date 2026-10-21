import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

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
  formatRelative,
} from '../../components/admin/AdminUi'
import { useToast } from '../../components/admin/ToastProvider'
import { getAllReports } from '../../services/adminApi'
import {
  REPORT_CATEGORIES,
  type ReportCategory,
  type ReportSummary,
} from '../../types/adminPanel'

const CATEGORY_DEPARTMENT: Record<string, string> = {
  'Public spaces': 'Parks and Public Spaces',
  'Roads & pavements': 'Roads and Transport',
  'Street lighting': 'Public Lighting',
  'Water & drainage': 'Water and Sanitation',
}

const PRIORITY_WEIGHT: Record<string, number> = {
  Low: 1,
  Medium: 2,
  High: 4,
  Critical: 7,
}

function areaName(report: ReportSummary): string {
  const location = report.location?.trim()

  if (!location) {
    return 'Location not provided'
  }

  return location.length > 32 ? `${location.slice(0, 29)}…` : location
}

function AdminAIAnalyzer() {
  const { showToast } = useToast()
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getAllReports()
      setReports(result.data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the analysis.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const analysis = useMemo(() => {
    const openReports = reports.filter((report) => report.status !== 'Resolved')
    const urgentReports = openReports.filter(
      (report) => report.priority === 'Critical' || report.priority === 'High',
    )
    const overdueReports = openReports.filter((report) => report.isOverdue)
    const resolved = reports.filter((report) => report.status === 'Resolved').length
    const resolutionRate = reports.length > 0
      ? Math.round((resolved / reports.length) * 100)
      : 0

    const categoryStats = REPORT_CATEGORIES.map((category) => {
      const categoryReports = openReports.filter((report) => report.category === category)
      const weight = categoryReports.reduce(
        (sum, report) => sum + (PRIORITY_WEIGHT[report.priority] ?? 1),
        0,
      )

      return {
        category: category as ReportCategory,
        count: categoryReports.length,
        weight,
        overdue: categoryReports.filter((report) => report.isOverdue).length,
      }
    }).sort((a, b) => b.weight - a.weight || b.count - a.count)

    const areaMap = new Map<string, { count: number; urgent: number; overdue: number }>()

    openReports.forEach((report) => {
      const key = areaName(report)
      const current = areaMap.get(key) ?? { count: 0, urgent: 0, overdue: 0 }
      current.count += 1

      if (report.priority === 'Critical' || report.priority === 'High') {
        current.urgent += 1
      }

      if (report.isOverdue) {
        current.overdue += 1
      }

      areaMap.set(key, current)
    })

    const areas = [...areaMap.entries()]
      .map(([name, values]) => ({ name, ...values }))
      .sort((a, b) => b.overdue - a.overdue || b.urgent - a.urgent || b.count - a.count)
      .slice(0, 5)

    const recommendations = openReports
      .map((report) => {
        const ageDays = Math.max(0, Math.floor((Date.now() - new Date(report.createdAt).getTime()) / 86_400_000))
        const score = (PRIORITY_WEIGHT[report.priority] ?? 1) +
          (report.isOverdue ? 8 : 0) +
          Math.min(ageDays, 10) * 0.35
        const reasons = []

        if (report.isOverdue) {
          reasons.push('SLA breached')
        }

        if (report.priority === 'Critical' || report.priority === 'High') {
          reasons.push(`${report.priority.toLowerCase()} priority`)
        }

        if (!report.department) {
          reasons.push('unassigned department')
        }

        if (!report.assignedTo) {
          reasons.push('no owner')
        }

        if (reasons.length === 0) {
          reasons.push('routine follow-up')
        }

        return {
          report,
          score,
          reason: reasons.join(' · '),
          suggestedTeam: report.department?.name ?? CATEGORY_DEPARTMENT[report.category] ?? 'Operations',
          ageDays,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)

    const topCategory = categoryStats[0]
    const topArea = areas[0]

    return {
      openReports,
      urgentReports,
      overdueReports,
      resolutionRate,
      categoryStats,
      areas,
      recommendations,
      topCategory,
      topArea,
      brief: openReports.length === 0
        ? 'No open reports. The current queue is clear and no deployment is required.'
        : `${openReports.length} open report${openReports.length === 1 ? '' : 's'} need attention, including ${urgentReports.length} high-priority case${urgentReports.length === 1 ? '' : 's'} and ${overdueReports.length} overdue. ${topCategory?.count ? `${topCategory.category} is the busiest category with ${topCategory.count} open case${topCategory.count === 1 ? '' : 's'}.` : ''} ${topArea && topArea.name !== 'Location not provided' ? `The strongest area signal is ${topArea.name} with ${topArea.count} open case${topArea.count === 1 ? '' : 's'}.` : ''}`,
    }
  }, [reports])

  return (
    <div className="admin-page">
      <PageHeading
        eyebrow="Decision support"
        title="Smart analyser"
        description="Rules-based operational analysis of live report data, designed to help prioritize deployment."
        actions={(
          <>
            <button
              type="button"
              className="admin-button ghost"
              onClick={() => {
                void load()
                showToast('Analysis refreshed from live report data.', 'info')
              }}
              disabled={loading}
            >
              <i className={`bi bi-arrow-clockwise${loading ? ' spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
            <Link to="/admin/reports" className="admin-button primary">
              <i className="bi bi-list-check" aria-hidden="true" />
              Open queue
            </Link>
          </>
        )}
      />

      {error && <ErrorNotice message={error} onRetry={() => void load()} />}

      {loading && reports.length === 0 ? (
        <>
          <SkeletonCards count={4} />
          <div className="admin-analysis-layout">
            <SkeletonPanel rows={8} />
            <SkeletonPanel rows={8} />
          </div>
        </>
      ) : reports.length === 0 ? (
        <section className="admin-panel">
          <EmptyState
            icon="bi-stars"
            title="No report data to analyse"
            text="The analyser needs submitted reports before it can build an operational outlook."
          />
        </section>
      ) : (
        <>
          <div className="admin-stat-grid">
            <StatCard
              label="Open queue"
              value={analysis.openReports.length}
              hint={`${reports.length} reports in total`}
              icon="bi-inboxes"
              tone="orange"
              to="/admin/reports?status=Received"
            />
            <StatCard
              label="High priority"
              value={analysis.urgentReports.length}
              hint="Critical or high urgency"
              icon="bi-exclamation-diamond"
              tone="red"
              to="/admin/reports?priority=High"
            />
            <StatCard
              label="Overdue"
              value={analysis.overdueReports.length}
              hint="SLA deadline has passed"
              icon="bi-clock-history"
              tone="gold"
              to="/admin/reports?overdue=true"
            />
            <StatCard
              label="Resolution rate"
              value={`${analysis.resolutionRate}%`}
              hint="Resolved across all reports"
              icon="bi-graph-up-arrow"
              tone="blue"
            />
          </div>

          <section className="admin-panel admin-analyst-brief">
            <span className="admin-brief-icon">
              <i className="bi bi-lightbulb" aria-hidden="true" />
            </span>
            <div>
              <span className="admin-eyebrow">Operational brief</span>
              <h2>Focus the next response cycle</h2>
              <p>{analysis.brief}</p>
            </div>
            <div className="admin-brief-meta">
              <span>Top category</span>
              <b>{analysis.topCategory?.category ?? 'None'}</b>
              <small>{analysis.topCategory?.count ?? 0} open</small>
            </div>
          </section>

          <div className="admin-analysis-layout">
            <section className="admin-panel">
              <PanelHeading
                title="Open workload by category"
                description="Weighted by priority and overdue risk"
              />
              <div className="admin-analysis-bars">
                {analysis.categoryStats.map((item) => {
                  const maxWeight = Math.max(1, ...analysis.categoryStats.map((entry) => entry.weight))

                  return (
                    <div key={item.category} className="admin-analysis-bar-row">
                      <div>
                        <span>{item.category}</span>
                        <small>{item.count} open · {item.overdue} overdue</small>
                      </div>
                      <div className="admin-bar-track">
                        <i style={{ width: `${(item.weight / maxWeight) * 100}%` }} />
                      </div>
                      <b>{item.weight}</b>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="admin-panel">
              <PanelHeading title="Area hotspots" description="Locations with the strongest open signal" />
              {analysis.areas.length === 0 ? (
                <EmptyState
                  icon="bi-geo-alt"
                  title="No area signal"
                  text="Location data will build hotspots as reports are submitted."
                />
              ) : (
                <div className="admin-hotspot-list">
                  {analysis.areas.map((area, index) => (
                    <div key={area.name}>
                      <span className="admin-hotspot-rank">{index + 1}</span>
                      <div>
                        <b>{area.name}</b>
                        <small>{area.count} open · {area.urgent} urgent · {area.overdue} overdue</small>
                      </div>
                      {area.overdue > 0 && <span className="admin-hotspot-flag">SLA risk</span>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="admin-panel">
            <PanelHeading
              title="Recommended deployment"
              description="Ranked by priority, SLA risk, ownership gaps, and report age"
              action={<span className="admin-panel-chip"><i className="bi bi-activity" aria-hidden="true" /> Live data</span>}
            />
            {analysis.recommendations.length === 0 ? (
              <EmptyState
                icon="bi-check2-circle"
                title="No deployment needed"
                text="There are no open reports requiring action."
              />
            ) : (
              <div className="admin-recommendation-list">
                {analysis.recommendations.map((item, index) => (
                  <article key={item.report.id} className="admin-recommendation">
                    <span className="admin-recommendation-rank">{String(index + 1).padStart(2, '0')}</span>
                    <div className="admin-recommendation-main">
                      <div>
                        <Link to={`/admin/reports/${item.report.reference}`}>{item.report.title}</Link>
                        <small>{item.report.reference} · {item.report.category} · {formatRelative(item.report.createdAt)}</small>
                      </div>
                      <div className="admin-recommendation-tags">
                        <PriorityBadge priority={item.report.priority} />
                        <StatusBadge status={item.report.status} />
                      </div>
                    </div>
                    <div className="admin-recommendation-team">
                      <span>Suggested team</span>
                      <b>{item.suggestedTeam}</b>
                    </div>
                    <div className="admin-recommendation-reason">
                      <span>{item.reason}</span>
                      <small>{item.ageDays === 0 ? 'Submitted today' : `${item.ageDays} day${item.ageDays === 1 ? '' : 's'} open`}</small>
                    </div>
                    <Link to={`/admin/reports/${item.report.reference}`} className="admin-row-action" aria-label={`Open ${item.report.reference}`}>
                      <i className="bi bi-arrow-up-right" aria-hidden="true" />
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default AdminAIAnalyzer
