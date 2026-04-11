'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useQueryClient } from '@tanstack/react-query'

/**
 * NetworkBanner
 * Shows a non-blocking top banner when:
 * - User goes offline: "No connection — showing cached data"
 * - User reconnects: "You're back online!" (auto-dismisses in 4s)
 *
 * On reconnect, invalidates all React Query caches so fresh data loads.
 */
export function NetworkBanner() {
  const { isOnline, wasOffline } = useNetworkStatus()
  const queryClient = useQueryClient()

  // When reconnecting, invalidate caches so data refreshes
  if (wasOffline && isOnline) {
    queryClient.invalidateQueries()
  }

  const show = !isOnline || wasOffline

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999]"
        >
          <div
            className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold ${
              isOnline
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-500 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline
                ? '✅ Back online — refreshing data…'
                : '⚠️ No internet connection — showing cached data'}
            </div>
            {!isOnline && (
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-[11px] font-black uppercase tracking-widest"
              >
                <RefreshCw size={11} /> Retry
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
