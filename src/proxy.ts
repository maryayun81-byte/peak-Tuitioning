import { NextResponse, type NextRequest } from 'next/server'

/**
 * Authentication is handled by the browser session and Supabase RLS.
 *
 * Do not call supabase.auth.getUser() or refreshSession() here. A proxy runs
 * for every matched navigation and Next.js request, so network-backed Auth API
 * validation here can create concurrent refreshes and exhaust Supabase's Auth
 * rate limit before users can log in.
 */
export default function proxy(_request: NextRequest) {
  return NextResponse.next()
}
