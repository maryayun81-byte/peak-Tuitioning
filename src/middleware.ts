import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null;
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (e) {
    console.error('Middleware Supabase fetch failed:', e)
  }

  const path = request.nextUrl.pathname

  // Protected routes
  const protectedRoutes = ['/admin', '/teacher', '/student', '/parent']
  const isProtected = protectedRoutes.some(r => path.startsWith(r))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Role-based protection
  if (user) {
    // 1. Try to get role from metadata (FAST - no DB hit)
    let role = user.app_metadata?.role || user.user_metadata?.role

    // 2. Fallback to DB only if metadata is missing (diagnostic logging added)
    if (!role) {
      try {
        console.log(`[Middleware] Metadata role missing for ${user.id}, hitting DB...`)
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        role = data?.role
        console.log(`[Middleware] DB Role found: ${role}`)
      } catch (e) {
        console.error('Middleware profile fetch failed:', e)
      }
    } else {
      console.log(`[Middleware] Using metadata role: ${role}`)
    }

    if (role) {
      if (path.startsWith('/admin') && role !== 'admin') {
        return NextResponse.redirect(new URL(`/auth/login?role=admin&error=role_mismatch&from=${role}`, request.url))
      }
      if (path.startsWith('/teacher') && role !== 'teacher') {
        return NextResponse.redirect(new URL(`/auth/login?role=teacher&error=role_mismatch&from=${role}`, request.url))
      }
      if (path.startsWith('/student') && role !== 'student') {
        return NextResponse.redirect(new URL(`/auth/login?role=student&error=role_mismatch&from=${role}`, request.url))
      }
      if (path.startsWith('/parent') && role !== 'parent') {
        return NextResponse.redirect(new URL(`/auth/login?role=parent&error=role_mismatch&from=${role}`, request.url))
      }

      // Redirect logged-in users away from auth pages
      if (path.startsWith('/auth')) {
        return NextResponse.redirect(new URL(`/${role}`, request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icon.*|test-connection|.*\\.(?:svg|png|jpg|jpeg|gif|webp|map|mjs|json)$).*)',
  ],
}
