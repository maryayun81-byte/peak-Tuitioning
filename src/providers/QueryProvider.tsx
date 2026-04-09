'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

/**
 * QueryProvider
 * Global React Query configuration tuned for 200+ concurrent users.
 *
 * Strategy: Stale-While-Revalidate (SWR pattern)
 * - Data shown immediately from cache on re-navigation (zero spinner flash)
 * - Background revalidation after staleTime elapses
 * - Aggressive gcTime keeps data in RAM across multiple pages
 * - Retry with exponential backoff for network resilience
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5 minutes: data is considered "fresh" — no background refetch within this window
            staleTime: 5 * 60 * 1000,
            // 15 minutes in RAM after last subscriber unmounts (pages stay cached through long sessions)
            gcTime: 15 * 60 * 1000,
            // Retry twice with exponential backoff (500ms, 1000ms) for network blips
            retry: 2,
            retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 5000),
            // Do NOT refetch just because user switches tabs or windows — reduces server load
            refetchOnWindowFocus: false,
            // Do NOT re-fetch on mount if data is fresh — this is what eliminates spinners on navigation
            refetchOnMount: false,
            // Do NOT auto-refetch on reconnect — prevents stampede when 200 users reconnect simultaneously
            refetchOnReconnect: false,
          },
          mutations: {
            // Show errors after 1 retry
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
