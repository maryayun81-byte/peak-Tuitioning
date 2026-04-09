'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * NavigationProgress
 * A slim top-of-screen progress bar that fires on every route change.
 * Eliminates the "dead" feeling between page navigations.
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevPathname = useRef(pathname)

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  useEffect(() => {
    if (pathname === prevPathname.current) return
    prevPathname.current = pathname

    clear()
    setWidth(0)
    setVisible(true)

    // Rapid ramp to 30% instantly, then slow crawl
    let w = 0
    timerRef.current = setTimeout(() => {
      setWidth(30)
      intervalRef.current = setInterval(() => {
        setWidth(prev => {
          if (prev >= 85) { clear(); return prev } // Stall at 85% until route completes
          return prev + Math.random() * 8
        })
      }, 400)
    }, 50)

    // Route settled — complete the bar
    const completeTimer = setTimeout(() => {
      clear()
      setWidth(100)
      setTimeout(() => setVisible(false), 300)
    }, 600)

    return () => {
      clear()
      clearTimeout(completeTimer)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-0.5 pointer-events-none"
      style={{ background: 'transparent' }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: 'linear-gradient(90deg, var(--primary), #818CF8, #38BDF8)',
          transition: 'width 0.3s ease',
          boxShadow: '0 0 8px var(--primary)',
        }}
      />
    </div>
  )
}
