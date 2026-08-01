import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { resilientFetch } from '../resilientFetch'
import { isStudentFullyOnboarded } from '../onboarding'

const ROLE_PREFIXES: { prefix: string; role: string }[] = [
  { prefix: '/student', role: 'student' },
  { prefix: '/teacher', role: 'teacher' },
  { prefix: '/admin', role: 'admin' },
  { prefix: '/parent', role: 'parent' },
  { prefix: '/finance', role: 'finance' },
]

function roleForPathname(pathname: string): string | null {
  const match = ROLE_PREFIXES.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  return match?.role ?? null
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
      global: {
        fetch: resilientFetch,
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const { pathname } = request.nextUrl
  const pathRole = roleForPathname(pathname)

  // Fast path: no Supabase session cookies at all → definitely not logged in.
  // Skip the auth-server round trip (rate-limit friendly) and just gate.
  const hasSessionCookies = request.cookies.getAll().some(cookie => cookie.name.startsWith('sb-'))

  if (!hasSessionCookies) {
    if (pathRole) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.search = `?role=${pathRole}`
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Logged-in user visiting the auth pages — send them to their dashboard.
  // NOTE: only redirect on /auth and /auth/login. Flows like
  // /auth/reset-password rely on an active (recovery) session and must not be
  // bounced to the dashboard or the password-reset flow breaks.
  if (user && (pathname === '/auth' || pathname === '/auth/login')) {
    const role = user.app_metadata?.role || user.user_metadata?.role
    const url = request.nextUrl.clone()
    url.pathname = `/${role === 'teacher' || role === 'admin' || role === 'parent' || role === 'finance' ? role : 'student'}`
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Unauthenticated user hitting a protected role route — send them to login.
  if (!user && pathRole) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.search = `?role=${pathRole}`
    return NextResponse.redirect(url)
  }

  // ── SECURITY: Server-side onboarding enforcement (defense in depth) ─────────
  // Client-side layout guards are UX, not security. A student whose DB flags
  // say "not onboarded" must NEVER render a dashboard route, regardless of what
  // a stale localStorage store claims. This runs on every matching request.
  //
  // Teachers are intentionally not enforced here: legacy teachers may have
  // teaching activity (assignments, class mappings) with no flags set, and the
  // client-side rescueAlreadyOnboardedTeacher() heuristic reconciles them.
  if (user && pathRole === 'student' && pathname !== '/student/onboarding') {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, has_onboarded')
        .eq('id', user.id)
        .single()

      // Only enforce for the role that matches the route being requested.
      if (profile?.role === 'student') {
        const { data: student } = await supabase
          .from('students')
          .select('onboarded')
          .eq('user_id', user.id)
          .single()

        if (!isStudentFullyOnboarded(student, profile)) {
          const url = request.nextUrl.clone()
          url.pathname = '/student/onboarding'
          url.search = ''
          return NextResponse.redirect(url)
        }
      }
    } catch (error) {
      // Fail open on transient DB errors to avoid locking everyone out during
      // an outage — the client gate + the next request will re-check.
      console.error('[Proxy] Student onboarding check failed:', error)
    }
  }

  return supabaseResponse
}
