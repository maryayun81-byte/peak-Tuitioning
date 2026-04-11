'use client'

import { useState, useEffect } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  wasOffline: boolean // true if we were offline and just reconnected
}

/**
 * useNetworkStatus
 * Detects network connection changes and returns current status.
 * Used to show a "Poor connection" banner without blocking the UI.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setWasOffline(true)
      // Auto-clear the "reconnected" state after 4s
      setTimeout(() => setWasOffline(false), 4000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, wasOffline }
}
