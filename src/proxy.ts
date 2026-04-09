import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 1. Root redirect
  if (request.nextUrl.pathname === '/') {
    if (user) {
      const role = user.app_metadata?.role || user.user_metadata?.role || 'student'
      return NextResponse.redirect(new URL(`/${role}`, request.url))
    }
    return NextResponse.next()
  }

  // 2. Protect Portal Routes
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isPortalPage = ['/admin', '/teacher', '/student', '/parent'].some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isPortalPage && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user) {
    const role = user.app_metadata?.role || user.user_metadata?.role || 'student'
    
    // Security Breach Fix: Redirect if user tries to access a portal that doesn't match their role
    if (request.nextUrl.pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(`/${role}`, request.url))
    }
    if (request.nextUrl.pathname.startsWith('/teacher') && role !== 'teacher') {
      return NextResponse.redirect(new URL(`/${role}`, request.url))
    }
    if (request.nextUrl.pathname.startsWith('/student') && role !== 'student') {
      return NextResponse.redirect(new URL(`/${role}`, request.url))
    }

    // Onboarding Enforcement for Students
    if (role === 'student' && !request.nextUrl.pathname.startsWith('/student/onboarding')) {
      const isOnboarded = user.user_metadata?.onboarded === true
      if (!isOnboarded) {
        return NextResponse.redirect(new URL('/student/onboarding', request.url))
      }
    }
    
    // Redirect if trying to access auth pages while logged in
    if (isAuthPage) {
      return NextResponse.redirect(new URL(`/${role}`, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public items like logo.png)
     * - api/auth (auth api routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth|public|logo.png|manifest.json|sw.js).*)',
  ],
}
