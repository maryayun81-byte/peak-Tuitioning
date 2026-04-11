'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

/**
 * QueryProvider
 * Global React Query configuration tuned for 200+ concurrent users.
 *
 * Strategy: Stale-While-Revalidate (SWR pattern)
 * - Cached data shown immediately on navigation (zero spinner flash)
 * - Background revalidation after staleTime elapses  
 * - refetchOnMount: 'always' — when a page mounts and data is STALE, 
 *   background-refetch silently (user already sees cached data)
 * - Retry with exponential backoff for network resilience
 * - 8s timeout enforced at the network level via safeFetch
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5 minutes: data shown from cache, background refetch runs after this
            staleTime: 5 * 60 * 1000,
            // 30 minutes in RAM after last subscriber unmounts (long sessions cached)
            gcTime: 30 * 60 * 1000,
            // Retry twice with exponential backoff (500ms, 1000ms) for flaky networks
            retry: 2,
            retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 6000),
            // Background refetch on mount if data is stale — user still sees cached data
            refetchOnMount: true,
            // Don't refetch on tab focus — reduces unnecessary server load
            refetchOnWindowFocus: false,
            // Don't stampede the server when 200 users reconnect simultaneously
            refetchOnReconnect: false,
            // Throw on error so React error boundaries can catch it
            throwOnError: false,
          },
          mutations: {
            // Retry once on mutation failure
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
