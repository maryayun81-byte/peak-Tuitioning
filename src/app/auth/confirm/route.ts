import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { resilientFetch } from '@/lib/resilientFetch'

/**
 * Auth confirmation endpoint for email links (recovery, signup, magic link).
 *
 * TWO supported link shapes (both land here):
 *
 * 1. PKCE code flow (default `{{ .ConfirmationURL }}` template):
 *      /auth/confirm?code=<code>&next=/auth/reset-password%3Frole%3Dteacher
 *    Supabase's /verify 302s to the app's `redirectTo` with `?code=`.
 *    NOTE: this shape depends on the Redirect-URL allow-list matching the
 *    full path — Supabase silently falls back to the Site URL (landing page)
 *    when the match fails, so the token-hash template below is preferred.
 *
 * 2. Token-hash flow (RECOMMENDED recovery template — immune to allow-list
 *    path-matching issues because the link points at the app directly):
 *      {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next={{ .RedirectTo }}
 *    See https://supabase.com/docs/guides/auth/passwords#reset-password-email
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const { searchParams } = requestUrl
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as any
  const rawNext = searchParams.get('next')

  // `next` may be a path (PKCE flow) or a same-origin absolute URL (the
  // token-hash template echoes the app's `redirectTo` via {{ .RedirectTo }}).
  // Unwrap same-origin absolute URLs to path+query so the role (?role=...)
  // survives. Anything else falls back to the reset form — never external.
  let safeNext = '/auth/reset-password'
  if (rawNext) {
    try {
      if (/^https?:\/\//i.test(rawNext)) {
        const u = new URL(rawNext)
        if (u.host === requestUrl.host) safeNext = (u.pathname + u.search) || safeNext
      } else if (rawNext.startsWith('/') && !rawNext.startsWith('//')) {
        safeNext = rawNext
      }
    } catch {
      // keep fallback
    }
  }

  console.log('[auth/confirm] hit', {
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    type: type ?? null,
    next: safeNext,
  })

  // No auth params at all — just send them to the destination; the page
  // itself will render the appropriate "invalid link" state.
  if (!code && !token_hash) {
    return NextResponse.redirect(new URL(safeNext, request.url))
  }

  const response = NextResponse.redirect(new URL(safeNext, request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
      global: {
        fetch: resilientFetch,
      },
    }
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.warn('[auth/confirm] exchangeCodeForSession failed:', error.message)
      // Send them to reset-password with an explicit error flag so the
      // page can show "link expired — request a new one" instead of
      // silently dumping them on the landing page.
      const url = new URL(safeNext, request.url)
      url.searchParams.set('error', 'expired')
      const errResponse = NextResponse.redirect(url)
      // Preserve any cookies set during the (failed) exchange attempt.
      response.cookies.getAll().forEach((c) => errResponse.cookies.set(c.name, c.value, c as any))
      return errResponse
    }
    return response
  }

  // Token-hash flow (recommended recovery template).
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (error) {
      console.warn('[auth/confirm] verifyOtp failed:', error.message)
      const url = new URL(safeNext, request.url)
      url.searchParams.set('error', 'expired')
      return NextResponse.redirect(url)
    }
    return response
  }

  return response
}
