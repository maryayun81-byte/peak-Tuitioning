'use client'

import { useEffect } from 'react'
import { dispatchLiveSessionReminders } from '@/app/actions/live-sessions'

export function SessionHeartbeat() {
  useEffect(() => {
    // Initial check on mount
    dispatchLiveSessionReminders()

    // Setup interval to check every minute
    const interval = setInterval(() => {
      console.log('[SessionHeartbeat] Dispatching reminders...')
      dispatchLiveSessionReminders()
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  return null // This is a headless background component
}
