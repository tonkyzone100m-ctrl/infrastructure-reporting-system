import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import L from 'leaflet'
import {
  MapContainer,
  TileLayer,
  useMap,
} from 'react-leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

import {
  EmptyState,
  ErrorNotice,
  PageHeading,
  PanelHeading,
  PriorityBadge,
  SkeletonPanel,
  StatusBadge,
  formatRelative,
} from '../../components/admin/AdminUi'
import {
  getAllReports,
  getDepartments,
} from '../../services/adminApi'
import {
  REPORT_CATEGORIES,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  type DepartmentRecord,
  type ReportSummary,
} from '../../types/adminPanel'

const DEFAULT_CENTER: [number, number] = [-1.9441, 30.0619]

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function markerClass(report: ReportSummary): string {
  if (report.isOverdue) {
    return 'overdue'
  }

  if (report.priority === 'Critical' || report.priority === 'High') {
    return 'urgent'
  }

  if (report.status === 'Resolved') {
    return 'resolved'
  }

  return 'open'
}

function popupHtml(report: ReportSummary): string {
  return `
    <div class="admin-map-popup">
      <span class="admin-map-popup-ref">${escapeHtml(report.reference)}</span>
      <b>${escapeHtml(report.title)}</b>
      <small>${escapeHtml(report.category)} · ${escapeHtml(report.status)}</small>
      <div class="admin-map-popup-actions">
        <span>${escapeHtml(report.department?.name ?? 'Unassigned')}</span>
        <a href="/admin/reports/${encodeURIComponent(report.reference)}">Open report</a>
      </div>
    </div>
  `
}

function ClusterLayer({
  reports,
  selectedReference,
  onSelect,
}: {
  reports: ReportSummary[]
  selectedReference: string
  onSelect: (reference: string) => void
}) {
  const map = useMap()

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 46,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster) => L.divIcon({
        html: `<span>${cluster.getChildCount()}</span>`,
        className: 'admin-map-cluster',
        iconSize: L.point(36, 36),
      }),
    })
    const markers = new Map<string, L.Marker>()

    reports.forEach((report) => {
      if (report.latitude === null || report.longitude === null) {
        return
      }

      const marker = L.marker([report.latitude, report.longitude], {
        icon: L.divIcon({
          html: '<span></span>',
          className: `admin-map-marker ${markerClass(report)}`,
          iconSize: L.point(22, 22),
          iconAnchor: L.point(11, 11),
          popupAnchor: L.point(0, -10),
        }),
        title: `${report.reference} · ${report.title}`,
      })

      marker.bindPopup(popupHtml(report), {
        className: 'admin-map-popup-wrap',
        closeButton: true,
        maxWidth: 280,
      })
      marker.on('click', () => onSelect(report.reference))
      clusterGroup.addLayer(marker)
      markers.set(report.reference, marker)
    })

    map.addLayer(clusterGroup)
    map.invalidateSize()

    const bounds = L.latLngBounds(
      reports
        .filter((report) => report.latitude !== null && report.longitude !== null)
        .map((report) => [report.latitude as number, report.longitude as number]),
    )

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 13 })
    }

    if (selectedReference) {
      const marker = markers.get(selectedReference)

      if (marker) {
        window.setTimeout(() => {
          map.setView(marker.getLatLng(), 15, { animate: true })
          marker.openPopup()
        }, 120)
      }
    }

    return () => {
      map.removeLayer(clusterGroup)
    }
  }, [map, onSelect, reports, selectedReference])

  return null
}

function AdminMap() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedReference = searchParams.get('report') ?? ''
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [category, setCategory] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [overdue, setOverdue] = useState('')
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getAllReports({
        search: search.trim(),
        status,
        priority,
        category,
        departmentId,
        overdue,
      })

      setReports(result.data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load map reports.')
    } finally {
      setLoading(false)
    }
  }, [search, status, priority, category, departmentId, overdue])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [load, search])

  const mappedReports = useMemo(
    () => reports.filter((report) => report.latitude !== null && report.longitude !== null),
    [reports],
  )

  const activeFilterCount = [search.trim(), status, priority, category, departmentId, overdue]
    .filter(Boolean).length

  function clearFilters() {
    setSearch('')
    setStatus('')
    setPriority('')
    setCategory('')
    setDepartmentId('')
    setOverdue('')
  }

  const selectReport = useCallback((reference: string) => {
    const next = new URLSearchParams(searchParams)

    if (reference) {
      next.set('report', reference)
    } else {
      next.delete('report')
    }

    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  return (
    <div className="admin-page">
      <PageHeading
        eyebrow="Geospatial view"
        title="Issue map"
        description="Locate reports across the city, spot clusters, and jump straight into a case."
        actions={(
          <button type="button" className="admin-button primary" onClick={() => void load()} disabled={loading}>
            <i className={`bi bi-arrow-clockwise${loading ? ' spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        )}
      />

      {error && <ErrorNotice message={error} onRetry={() => void load()} />}

      <div className="admin-map-summary">
        <span><b>{reports.length}</b> reports in view</span>
        <span><b>{mappedReports.length}</b> mapped</span>
        <span><b>{reports.filter((report) => report.isOverdue).length}</b> overdue</span>
        <span><b>{reports.filter((report) => !report.department).length}</b> unassigned</span>
      </div>

      <div className="admin-map-layout">
        <section className="admin-panel admin-map-panel">
          {loading && reports.length === 0 ? (
            <div className="admin-map-loading"><SkeletonPanel rows={10} /></div>
          ) : (
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={11}
              scrollWheelZoom
              className="admin-map-canvas"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ClusterLayer
                reports={mappedReports}
                selectedReference={selectedReference}
                onSelect={selectReport}
              />
            </MapContainer>
          )}

          {!loading && mappedReports.length === 0 && (
            <div className="admin-map-empty-overlay">
              <EmptyState
                icon="bi-geo-alt"
                title="No mapped reports"
                text="Reports without valid coordinates cannot be placed on the map. Clear filters or wait for new location data."
              />
            </div>
          )}
        </section>

        <aside className="admin-map-sidebar">
          <section className="admin-panel admin-map-filter-panel">
            <PanelHeading
              title="Filters"
              action={activeFilterCount > 0 ? (
                <button type="button" className="admin-text-link" onClick={clearFilters}>
                  Clear
                </button>
              ) : undefined}
            />
            <div className="admin-search-field">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search reports…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search mapped reports"
              />
            </div>
            <div className="admin-map-filter-grid">
              <label className="admin-filter-field">
                <span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">All</option>
                  {REPORT_STATUSES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="admin-filter-field">
                <span>Priority</span>
                <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                  <option value="">All</option>
                  {REPORT_PRIORITIES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="admin-filter-field">
                <span>Category</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="">All</option>
                  {REPORT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="admin-filter-field">
                <span>Department</span>
                <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                  <option value="">All</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </label>
              <label className="admin-filter-field">
                <span>SLA</span>
                <select value={overdue} onChange={(event) => setOverdue(event.target.value)}>
                  <option value="">All</option>
                  <option value="true">Overdue</option>
                  <option value="false">Within SLA</option>
                </select>
              </label>
            </div>
          </section>

          <section className="admin-panel admin-map-list-panel">
            <PanelHeading
              title="Reports in view"
              description={`${mappedReports.length} with coordinates`}
            />
            {loading && reports.length === 0 ? (
              <SkeletonPanel rows={4} />
            ) : reports.length === 0 ? (
              <EmptyState
                icon="bi-search"
                title="Nothing matches"
                text="No reports match the current filters."
              />
            ) : (
              <div className="admin-map-list">
                {reports.map((report) => {
                  const mapped = report.latitude !== null && report.longitude !== null
                  const active = report.reference === selectedReference

                  return (
                    <div key={report.id} className={`admin-map-list-item${active ? ' active' : ''}`}>
                      <button
                        type="button"
                        className="admin-map-list-main"
                        onClick={() => mapped && selectReport(report.reference)}
                        disabled={!mapped}
                        title={mapped ? 'Show on map' : 'No coordinates available'}
                      >
                        <span className={`admin-map-list-dot ${markerClass(report)}`} aria-hidden="true" />
                        <span className="admin-map-list-copy">
                          <b>{report.title}</b>
                          <small>{report.reference} · {report.department?.name ?? 'Unassigned'}</small>
                        </span>
                      </button>
                      <div className="admin-map-list-meta">
                        <StatusBadge status={report.status} />
                        <PriorityBadge priority={report.priority} />
                        {mapped ? (
                          <span className="admin-map-list-time">{formatRelative(report.createdAt)}</span>
                        ) : (
                          <span className="admin-map-no-coords">No map pin</span>
                        )}
                        <Link to={`/admin/reports/${report.reference}`} aria-label={`Open ${report.reference}`}>
                          <i className="bi bi-arrow-up-right" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

export default AdminMap
