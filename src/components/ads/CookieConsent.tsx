'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CONSENT_KEY, getConsent, setConsent } from '@/lib/ads'

// Minimal, honest consent banner. Required for Meta/Google ads approval.
// Accept → tracking on. Decline → site works fully, no trackers.
export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Re-check at fire time: consent may have been set in another tab
    // during the delay, and must never re-nag after a stored choice.
    if (getConsent() !== null) return
    const t = setTimeout(() => {
      if (getConsent() === null) setVisible(true)
    }, 1200)
    const onStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY && e.newValue !== null) setVisible(false)
    }
    window.addEventListener('storage', onStorage)
    return () => {
      clearTimeout(t)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  if (!visible) return null

  const choose = (v: 'granted' | 'denied') => {
    setConsent(v)
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[400] rounded-2xl border bg-white p-5 shadow-2xl"
      style={{ borderColor: '#E2E8F0' }}
    >
      <p className="text-sm font-bold text-slate-900 mb-1">We use cookies for ads measurement</p>
      <p className="text-xs text-slate-500 leading-relaxed mb-3">
        We measure Facebook and Google ads so we know parents found us. Accept for measurement cookies,
        or decline and the site works exactly the same. See our{' '}
        <Link href="/privacy" className="underline">Privacy</Link> and{' '}
        <Link href="/cookies" className="underline">Cookie</Link> policies.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => choose('denied')}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 min-h-[44px]"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => choose('granted')}
          className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white min-h-[44px]"
        >
          Accept
        </button>
      </div>
    </div>
  )
}

// Footer link helper so users can change consent later.
export function resetAdsConsent() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(CONSENT_KEY)
    } catch { /* storage blocked */ }
    try {
      // Clear host-only cookie…
      document.cookie = `${CONSENT_KEY}=; Max-Age=0; Path=/; SameSite=Lax`
      // …and any apex-domain variant set by writeCookie (best-effort:
      // invalid Domain attributes are silently ignored by the browser).
      const host = window.location.hostname.toLowerCase().split(':')[0]
      const parts = host.split('.')
      if (parts.length >= 3 && host !== 'localhost') {
        const last = parts[parts.length - 1]
        const apex = last.length === 2 ? parts.slice(-3).join('.') : parts.slice(-2).join('.')
        document.cookie = `${CONSENT_KEY}=; Max-Age=0; Path=/; Domain=.${apex}; SameSite=Lax`
      }
    } catch { /* cookies blocked */ }
    window.location.reload()
  }
}
