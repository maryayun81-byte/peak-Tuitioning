import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useCallback } from 'react'
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
  /** Timeout in ms. Default: 15000 */
  timeoutMs?: number
  /** Allow showing stale cached data while refetching. Default: true */
  staleWhileRevalidate?: boolean
}

// Simple in-memory hot cache for legacy support (will be cleared on navigation)
const hotCache = new Map<string, { data: any; timestamp: number }>()

/**
 * usePageData — Universal data-fetching hook for all portal pages.
 * Now powered by TanStack Query for maximum reactivity.
 */
export function usePageData<T>({
  cacheKey,
  fetcher,
  isEmpty: isEmptyFn,
  deps = [],
  enabled = true,
  timeoutMs = 15000, // 15s cold-start ceiling
  staleWhileRevalidate = true,
}: UsePageDataOptions<T>): UsePageDataResult<T> {
  const queryKey = [...cacheKey, ...deps]
  const { isInitialRevalidationComplete } = useAuthStore()
  
  // We wait for auth revalidation to finish before starting any user-data queries
  const isEnabled = enabled && isInitialRevalidationComplete

  const {
    data: queryData,
    error: queryError,
    status: rkStatus,
    isLoading: rkLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await safeFetch(fetcher, { timeoutMs })
      if (result.error) throw new Error(result.error)
      if (result.timedOut) throw new Error('Timeout')
      return result.data
    },
    enabled: isEnabled,
    staleTime: staleWhileRevalidate ? 1000 * 60 * 5 : 0, // 5 mins if SWR allowed
    gcTime: 1000 * 60 * 30, // 30 mins
    refetchOnMount: 'always', // Critical: Always check for fresh data on navigation
  })

  // Normalize status for backward compatibility
  let status: PageDataStatus = 'loading'
  if (rkStatus === 'error') {
    status = queryError?.message === 'Timeout' ? 'timeout' : 'error'
  } else if (rkStatus === 'success') {
    // Determine empty state
    let empty = false
    if (queryData === null || queryData === undefined) {
      empty = true
    } else if (Array.isArray(queryData) && queryData.length === 0) {
      empty = true
    } else if (isEmptyFn && isEmptyFn(queryData as T)) {
      empty = true
    }
    status = empty ? 'empty' : 'success'
  }

  // Handle Auth-wait transition: If auth is done but query is still disabled, 
  // it might be because teacher.id is missing (e.g. freshly onboarded). 
  // Show error instead of hanging loading spinner.
  const authStuck = isInitialRevalidationComplete && !enabled && rkStatus === 'pending'
  const finalStatus = authStuck ? 'error' : status
  const finalLoading = rkLoading || (authStuck ? false : !isEnabled)

  return {
    data: queryData as T | null,
    status: finalStatus,
    error: queryError?.message || null,
    isLoading: finalLoading,
    isError: finalStatus === 'error' || finalStatus === 'timeout',
    isEmpty: finalStatus === 'empty',
    refetch,
  }
}

/**
 * clearPageDataCache — Invalidate specific or all cached entries.
 * Call after mutations so the next render refetches fresh data.
 */
export function clearPageDataCache(cacheKey?: string[]) {
  // We clear the legacy map if used, but primarily this is for navigation cleanup
  hotCache.clear()
}

