import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { resilientFetch } from '../resilientFetch'

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const publicRoutes = ['/', '/auth', '/kcse-and-cbc-tutoring-kenya', '/tuition-center-nairobi', '/about']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route) || request.nextUrl.pathname === route)

  // If the user is logged in and trying to access the login page, redirect them to their dashboard
  if (user && request.nextUrl.pathname === '/auth') {
    const url = request.nextUrl.clone()
    url.pathname = '/student' // Default fallback, but they should be routed by role after logging in.
    return NextResponse.redirect(url)
  }

  // If the user is not logged in and trying to access a protected route, redirect to login
  if (!user && !isPublicRoute && !request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.includes('.')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
