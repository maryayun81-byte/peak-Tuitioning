import type { NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

/**
 * Authentication and onboarding enforcement live here (server-side, defense in
 * depth). The proxy only runs on the role portals and auth pages — public
 * marketing pages never trigger an auth API round trip.
 *
 * The client-side layout guards are UX polish (splash screens, nav filtering);
 * the authoritative gate for "can this student see a dashboard" is this proxy
 * plus the database flags.
 */
export default function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // Only protect the portals + auth pages. Everything else (landing, blogs,
  // _next static, images, /api) stays untouched and skips the proxy entirely.
  matcher: ['/student/:path*', '/teacher/:path*', '/admin/:path*', '/parent/:path*', '/finance/:path*', '/auth/:path*'],
}
