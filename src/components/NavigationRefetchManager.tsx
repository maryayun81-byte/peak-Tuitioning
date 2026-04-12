'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { clearPageDataCache } from '@/hooks/usePageData'

/**
 * NavigationRefetchManager
 * 
 * THE ULTIMATE "ANTI-STALE" GUARDIAN.
 * 
 * Watches for route changes. The moment a user lands on a new page:
 * 1. It clears the legacy hotCache (for backward compatibility).
 * 2. It invalidates ALL TanStack Query entries.
 * 
 * Result: Every navigation triggers an immediate background refetch, 
 * guaranteeing that manual "Refreshes" are never needed.
 */
export function NavigationRefetchManager() {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const lastPathname = useRef(pathname)

  useEffect(() => {
    // Only trigger if the pathname actually changed (ignores query param tweaks)
    if (pathname !== lastPathname.current) {
      console.log(`[NavigationRefetch] Route changed to ${pathname}. Invalidating all queries...`)
      
      // 1. Invalidate TanStack Query (Future of the app)
      queryClient.invalidateQueries()
      
      // 2. Clear legacy hotCache (Current state of the app)
      clearPageDataCache()
      
      lastPathname.current = pathname
    }
  }, [pathname, queryClient])

  return null
}
