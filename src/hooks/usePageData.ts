'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { safeFetch } from '../lib/safeFetch'
import { useAuthStore } from '../stores/authStore'

export type PageDataStatus = 'loading' | 'success' | 'empty' | 'error' | 'timeout'

export interface UsePageDataResult<T> {
  data: T | null
  status: PageDataStatus
  error: string | null
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  refetch: () => void
}

interface UsePageDataOptions<T> {
  /** Unique cache key — matches React Query's queryKey pattern */
  cacheKey: string[]
  /** The actual data fetcher — wrapped in safeFetch automatically */
  fetcher: () => Promise<{ data: T | null; error: any }>
  /** Is data considered empty? Defaults to: data is null, undefined, or empty array */
  isEmpty?: (data: T) => boolean
  /** Dependency array — re-fetches when any value changes */
  deps?: any[]
  /** Skip fetching (e.g. waiting on auth data) */
  enabled?: boolean
  /** Timeout in ms. Default: 8000 */
  timeoutMs?: number
  /** Allow showing stale cached data while refetching. Default: true */
  staleWhileRevalidate?: boolean
}

// Simple in-memory hot cache keyed by JSON string of cacheKey
const hotCache = new Map<string, { data: any; timestamp: number }>()
const STALE_MS = 5 * 60 * 1000 // 5 minutes

/**
 * usePageData — Universal data-fetching hook for all portal pages.
 *
 * Guarantees:
 * ✅ Never hangs (8s timeout by default)
 * ✅ Shows cached data instantly on re-navigation
 * ✅ Retries 2x with exponential back-off on network errors
 * ✅ Component-level loading (doesn't block the whole page)
 * ✅ Always resolves into one of: loading | success | empty | error | timeout
 *
 * Standard usage in every portal page:
 *   const { data, status, refetch } = usePageData({
 *     cacheKey: ['assignments', student.id],
 *     fetcher: () => supabase.from('assignments').select('*').eq('student_id', student.id),
 *     enabled: !!student?.id,
 *   })
 *
 *   if (status === 'loading') return <SkeletonList />
 *   if (status === 'error')   return <ErrorState onRetry={refetch} />
 *   if (status === 'empty')   return <EmptyState title="No assignments yet" />
 *   return <AssignmentList items={data} />
 */
export function usePageData<T>({
  cacheKey,
  fetcher,
  isEmpty: isEmptyFn,
  deps = [],
  enabled = true,
  timeoutMs = 8000,
  staleWhileRevalidate = true,
}: UsePageDataOptions<T>): UsePageDataResult<T> {
  const cacheKeyStr = JSON.stringify(cacheKey)

  // Initialise with cached data so navigation feels instant
  const cachedEntry = hotCache.get(cacheKeyStr)
  const initialData = cachedEntry ? cachedEntry.data : null
  const isCacheFresh = cachedEntry ? Date.now() - cachedEntry.timestamp < STALE_MS : false

  const [data, setData] = useState<T | null>(initialData)
  const [status, setStatus] = useState<PageDataStatus>(
    initialData ? 'success' : enabled ? 'loading' : 'loading'
  )
  const [error, setError] = useState<string | null>(null)

  const { isInitialRevalidationComplete } = useAuthStore()
  const abortRef = useRef<AbortController | null>(null)
  const isMounted = useRef(true)

  // Architectural Fix: If auth revalidation is complete and this hook is still
  // disabled (e.g. waiting for teacher.id), we must NOT stay in 'loading'.
  // We transition to 'error' to signal the UI to stop spinning.
  useEffect(() => {
    if (isInitialRevalidationComplete && !enabled && status === 'loading') {
       console.warn(`[usePageData] Auth finished but dependency for ${cacheKeyStr} is missing. Unblocking UI.`)
       setStatus('error')
    }
  }, [isInitialRevalidationComplete, enabled, status, cacheKeyStr])

  const fetch = useCallback(async () => {
    if (!enabled) return

    // Cancel any in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    // If we have fresh cached data, skip the network call entirely
    if (isCacheFresh && staleWhileRevalidate && data) {
      setStatus('success')
      return
    }

    // Show loading only if we have no cached data
    if (!data) setStatus('loading')

    const result = await safeFetch(fetcher, {
      timeoutMs,
      signal: abortRef.current.signal,
    })

    if (!isMounted.current) return

    if (result.timedOut) {
      // If we have stale cached data, keep showing it; just mark status as success
      if (data) {
        setStatus('success')
      } else {
        setStatus('timeout')
        setError(result.error)
      }
      return
    }

    if (result.error) {
      // Keep showing cached data on error
      if (data) {
        setStatus('success')
      } else {
        setStatus('error')
        setError(result.error)
      }
      return
    }

    const newData = result.data

    // Determine empty state
    let empty = false
    if (newData === null || newData === undefined) {
      empty = true
    } else if (Array.isArray(newData) && newData.length === 0) {
      empty = true
    } else if (isEmptyFn && isEmptyFn(newData)) {
      empty = true
    }

    // Update hot cache
    hotCache.set(cacheKeyStr, { data: newData, timestamp: Date.now() })

    setData(newData)
    setStatus(empty ? 'empty' : 'success')
    setError(null)
  }, [cacheKeyStr, enabled, ...deps]) // eslint-disable-line

  useEffect(() => {
    isMounted.current = true
    fetch()
    return () => {
      isMounted.current = false
      abortRef.current?.abort()
    }
  }, [fetch])

  return {
    data,
    status,
    error,
    isLoading: status === 'loading',
    isError: status === 'error' || status === 'timeout',
    isEmpty: status === 'empty',
    refetch: fetch,
  }
}

/**
 * clearPageDataCache — Invalidate specific or all cached entries.
 * Call after mutations so the next render refetches fresh data.
 */
export function clearPageDataCache(cacheKey?: string[]) {
  if (cacheKey) {
    hotCache.delete(JSON.stringify(cacheKey))
  } else {
    hotCache.clear()
  }
}
