'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,      // 2 minutes — consider data fresh
            gcTime: 10 * 60 * 1000,         // 10 minutes — keep in memory after unmount  
            retry: 1,
            refetchOnWindowFocus: false,    // Don't refetch on tab switch
            refetchOnMount: false,          // Don't refetch when navigating back to a page
            refetchOnReconnect: false,      // Don't trigger full refresh on reconnect
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
