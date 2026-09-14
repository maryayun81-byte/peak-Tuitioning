// Ads + analytics glue: Meta Pixel + Google (gTag/Ads) behind explicit consent.
// Purpose-built for paid acquisition: Lead / CompleteRegistration / Purchase only.
// No page-view spam, no trackers before consent (Kenya DPA + Meta/Google policy).

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || ''
export const GA_ID = process.env.NEXT_PUBLIC_GA4_ID || process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || ''
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || ''

export const CONSENT_KEY = 'peak-ads-consent-v1'
export type ConsentValue = 'granted' | 'denied'

// Resilient consent storage. localStorage alone was not enough: browsers
// with "block cookies" settings throw on localStorage access, so Accept
// never persisted and the banner reappeared on every refresh. We now try
// localStorage first, fall back to a real cookie, and keep an in-memory
// copy so the banner never nags twice within a session.

let memoryConsent: ConsentValue | null = null

function readCookie(): ConsentValue | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_KEY}=([^;]*)`))
    const v = m ? decodeURIComponent(m[1]) : null
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

// QC FIX (banner reappearing after Accept): consent accepted on one host
// (e.g. the apex landing page) was invisible on another (e.g. the www
// portal) because both localStorage and the cookie are host-bound. The
// cookie is now ALSO written at the apex domain so one Accept covers all
// subdomains. Heuristic eTLD handling: 2-letter TLDs (co.ke, co.uk…)
// imply a 3-label apex, otherwise 2 labels. Public-suffix / IP /
// localhost hosts fall back to host-only (verified by read-back).
function apexDomain(hostname: string): string | null {
  try {
    if (!hostname) return null
    const host = hostname.toLowerCase().split(':')[0]
    if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host) || !host.includes('.')) return null
    const parts = host.split('.')
    const last = parts[parts.length - 1]
    const apex = last.length === 2 && parts.length >= 3
      ? parts.slice(-3).join('.')
      : parts.slice(-2).join('.')
    if (apex === host) return null
    return `.${apex}`
  } catch {
    return null
  }
}

function cookieString(v: ConsentValue, domain: string | null): string {
  const year = 60 * 60 * 24 * 365
  return `${CONSENT_KEY}=${encodeURIComponent(v)}; Max-Age=${year}; Path=/${domain ? `; Domain=${domain}` : ''}; SameSite=Lax`
}

function writeCookie(v: ConsentValue): boolean {
  try {
    // 1) Try apex-domain cookie so consent spans subdomains.
    const apex = typeof window !== 'undefined' ? apexDomain(window.location.hostname) : null
    if (apex) {
      try {
        document.cookie = cookieString(v, apex)
      } catch { /* invalid Domain — fall through to host-only */ }
      if (readCookie() === v) return true
    }
    // 2) Host-only cookie (localhost, IPs, previews, or apex rejected above).
    try {
      document.cookie = cookieString(v, null)
    } catch {
      return false
    }
    return readCookie() === v
  } catch {
    return false
  }
}

export function getConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return memoryConsent
  try {
    const v = window.localStorage.getItem(CONSENT_KEY)
    if (v === 'granted' || v === 'denied') {
      memoryConsent = v
      return v
    }
  } catch {
    /* storage blocked — fall through to cookie */
  }
  const c = typeof document !== 'undefined' ? readCookie() : null
  if (c) memoryConsent = c
  return c ?? memoryConsent
}

export function setConsent(v: ConsentValue): boolean {
  if (typeof window === 'undefined') return false
  memoryConsent = v
  let stored = false
  try {
    window.localStorage.setItem(CONSENT_KEY, v)
    stored = window.localStorage.getItem(CONSENT_KEY) === v
  } catch {
    /* storage blocked — cookie fallback below still persists */
  }
  if (typeof document !== 'undefined') stored = writeCookie(v) || stored
  // Google Consent Mode v2
  ;(window as any).gtag?.('consent', 'update', {
    ad_storage: v === 'granted' ? 'granted' : 'denied',
    ad_user_data: v === 'granted' ? 'granted' : 'denied',
    ad_personalization: v === 'granted' ? 'granted' : 'denied',
    analytics_storage: v === 'granted' ? 'granted' : 'denied',
  })
  if (v === 'granted') {
    // Fire the queued page view once consent is given
    trackPageView()
  }
  return stored
}

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: any
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
  }
}

function canTrack(): boolean {
  return getConsent() === 'granted'
}

export function trackPageView() {
  if (!canTrack()) return
  try {
    window.fbq?.('track', 'PageView')
    if (GA_ID) window.gtag?.('event', 'page_view', { page_location: window.location.href })
  } catch { /* never break UX for tracking */ }
}

export function trackLead(source: string) {
  if (!canTrack()) return
  try {
    window.fbq?.('track', 'Lead', { content_name: source })
    if (GA_ID) window.gtag?.('event', 'generate_lead', { method: source })
  } catch { /* noop */ }
}

export function trackCompleteRegistration(method = 'site') {
  if (!canTrack()) return
  try {
    window.fbq?.('track', 'CompleteRegistration', { content_name: method })
    if (GA_ID) window.gtag?.('event', 'sign_up', { method })
  } catch { /* noop */ }
}

export function trackPurchase(value: number, currency = 'KES') {
  if (!canTrack()) return
  try {
    window.fbq?.('track', 'Purchase', { value, currency })
    if (GOOGLE_ADS_ID || GA_ID) window.gtag?.('event', 'purchase', { value, currency })
  } catch { /* noop */ }
}
