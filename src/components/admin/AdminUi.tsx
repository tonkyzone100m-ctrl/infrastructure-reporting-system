import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import type { PaginationMeta } from '../../types/adminPanel'

type PageHeadingProps = {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
  backTo?: string
  backLabel?: string
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
  backTo,
  backLabel,
}: PageHeadingProps) {
  return (
    <div className="admin-page-heading">
      <div>
        {backTo && (
          <Link to={backTo} className="admin-back-link">
            <i className="bi bi-arrow-left" aria-hidden="true" />
            {backLabel ?? 'Back'}
          </Link>
        )}
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="admin-heading-actions">{actions}</div>}
    </div>
  )
}

type StatCardProps = {
  label: string
  value: number | string
  hint: string
  icon: string
  tone?: 'green' | 'orange' | 'gold' | 'red' | 'blue'
  to?: string
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'green',
  to,
}: StatCardProps) {
  const content = (
    <>
      <div className="admin-stat-top">
        <span className={`admin-stat-icon ${tone}`}>
          <i className={`bi ${icon}`} aria-hidden="true" />
        </span>
        {to && <i className="bi bi-arrow-up-right admin-stat-link" aria-hidden="true" />}
      </div>
      <strong>{value}</strong>
      <span className="admin-stat-label">{label}</span>
      <small>{hint}</small>
    </>
  )

  if (to) {
    return (
      <Link to={to} className="admin-stat-card admin-stat-card-link">
        {content}
      </Link>
    )
  }

  return <div className="admin-stat-card">{content}</div>
}

export function PanelHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="admin-panel-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const className = status === 'Resolved'
    ? 'resolved'
    : status === 'In progress'
      ? 'progress'
      : 'received'

  return (
    <span className={`admin-badge status-${className}`}>
      <i aria-hidden="true" />
      {status}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`admin-priority priority-${priority.toLowerCase()}`}>
      {priority}
    </span>
  )
}

export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="admin-error" role="alert">
      <i className="bi bi-exclamation-triangle" aria-hidden="true" />
      <div>
        <b>Something went wrong</b>
        <span>{message}</span>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon = 'bi-inbox',
  title,
  text,
  action,
}: {
  icon?: string
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="admin-empty">
      <span>
        <i className={`bi ${icon}`} aria-hidden="true" />
      </span>
      <b>{title}</b>
      <p>{text}</p>
      {action}
    </div>
  )
}

export function LoadingBlock({ label = 'Loading data' }: { label?: string }) {
  return (
    <div className="admin-loading" role="status" aria-live="polite">
      <span className="admin-spinner" aria-hidden="true" />
      {label}
    </div>
  )
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="admin-stat-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="admin-stat-card admin-skeleton">
          <span className="skeleton-line short" />
          <span className="skeleton-line value" />
          <span className="skeleton-line" />
          <span className="skeleton-line medium" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonPanel({ rows = 5 }: { rows?: number }) {
  return (
    <div className="admin-panel admin-skeleton-panel" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="skeleton-line" />
      ))}
    </div>
  )
}

export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta
  onPageChange: (page: number) => void
}) {
  if (meta.total === 0) {
    return null
  }

  const from = (meta.page - 1) * meta.pageSize + 1
  const to = Math.min(meta.page * meta.pageSize, meta.total)

  return (
    <div className="admin-pagination">
      <span>Showing {from}–{to} of {meta.total}</span>
      <div>
        <button
          type="button"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          aria-label="Previous page"
        >
          <i className="bi bi-chevron-left" aria-hidden="true" />
        </button>
        <span>Page {meta.page} of {Math.max(meta.totalPages, 1)}</span>
        <button
          type="button"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
          aria-label="Next page"
        >
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  tone?: 'danger' | 'primary'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) {
    return null
  }

  return (
    <div className="admin-modal-overlay" role="presentation" onMouseDown={onCancel}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className={`admin-modal-icon ${tone}`}>
          <i className={`bi ${tone === 'danger' ? 'bi-exclamation-triangle' : 'bi-question-circle'}`} aria-hidden="true" />
        </span>
        <h2 id="admin-confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="admin-modal-actions">
          <button type="button" className="admin-button ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`admin-button ${tone}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatRelative(value: string): string {
  const date = new Date(value)
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]

  for (const [unit, valueInSeconds] of ranges) {
    if (Math.abs(seconds) >= valueInSeconds) {
      return formatter.format(Math.round(seconds / valueInSeconds), unit)
    }
  }

  return formatter.format(seconds, 'second')
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
