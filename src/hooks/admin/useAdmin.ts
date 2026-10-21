import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  getAdminAnalytics,
  getAdminDashboard,
  type AdminAnalyticsOverview,
  type AdminDashboardOverview,
} from '../../services/admin/adminService'

export type AdminDataLoader<T> =
  () => Promise<T>

export type UseAdminResult<T> = {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unable to load admin data.'
}

export function useAdmin<T>(
  loader: AdminDataLoader<T>,
): UseAdminResult<T> {
  const [data, setData] =
    useState<T | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const loaderRef =
    useRef<AdminDataLoader<T>>(loader)

  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)

  loaderRef.current = loader

  const refresh = useCallback(async () => {
    const requestId =
      requestIdRef.current + 1

    requestIdRef.current = requestId

    setLoading(true)
    setError(null)

    try {
      const result =
        await loaderRef.current()

      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return
      }

      setData(result)
    } catch (caught: unknown) {
      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return
      }

      setError(getErrorMessage(caught))
    } finally {
      if (
        mountedRef.current &&
        requestId === requestIdRef.current
      ) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void refresh()

    return () => {
      mountedRef.current = false
      requestIdRef.current += 1
    }
  }, [refresh])

  return {
    data,
    loading,
    error,
    refresh,
  }
}

export function useAdminDashboard():
  UseAdminResult<AdminDashboardOverview> {
  return useAdmin(getAdminDashboard)
}

export function useAdminAnalytics():
  UseAdminResult<AdminAnalyticsOverview> {
  return useAdmin(getAdminAnalytics)
}
