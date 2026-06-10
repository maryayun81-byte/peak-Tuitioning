'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'

export function AuthHandler() {
  const pathname = usePathname()

  if (pathname.startsWith('/auth')) {
    return null
  }

  return <AuthenticatedSessionHandler />
}

function AuthenticatedSessionHandler() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const { loadUserData } = useAuth()
  const { setLoading, reset, setRevalidationComplete } = useAuthStore()

  useEffect(() => {
    let isInitialized = false
    let isDisposed = false
    const deferredLoads = new Set<ReturnType<typeof setTimeout>>()

    // Supabase invokes auth callbacks while holding its session lock. Database
    // queries can request the access token, so they must run after the callback
    // returns or they can deadlock against that same lock.
    const deferUserDataLoad = (session: any, isSilent: boolean) => {
      if (!session?.user) return

      const timer = setTimeout(() => {
        deferredLoads.delete(timer)
        if (isDisposed) return

        const role = session.user.app_metadata?.role || session.user.user_metadata?.role
        void loadUserData(session.user.id, isSilent, role)
      }, 0)

      deferredLoads.add(timer)
    }

    const handleInitialSession = (session: any) => {
      if (isInitialized) return
      isInitialized = true
      
      if (session?.user) {
        const existingProfile = useAuthStore.getState().profile
        deferUserDataLoad(session, !!existingProfile)
      } else {
        setLoading(false)
        setRevalidationComplete(true)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[Global Auth] Event: ${event}`, !!session)
      
      switch (event) {
        case 'INITIAL_SESSION':
          handleInitialSession(session)
          break
        case 'SIGNED_IN':
          if (session?.user) {
            deferUserDataLoad(session, false)
          }
          break
        case 'TOKEN_REFRESHED':
          // A refreshed access token does not change profile data. Reload only
          // when no profile is hydrated (for example after storage was cleared).
          if (session?.user && !useAuthStore.getState().profile) {
            deferUserDataLoad(session, true)
          }
          break
        case 'USER_UPDATED':
          if (session?.user) {
            deferUserDataLoad(session, true)
          }
          break
        case 'SIGNED_OUT':
          reset()
          router.push('/auth/login')
          setLoading(false)
          setRevalidationComplete(true)
          break
      }
    })

    // Fallback: Safety timeout to prevent infinite loading hangs.
    // 8s is generous enough for cold starts but fast enough to not feel broken.
    const safetyTimeout = setTimeout(() => {
      const state = useAuthStore.getState()
      if (!state.isInitialRevalidationComplete) {
        console.warn('[AuthHandler] Safety timeout reached. Forcing resolution.')
        setLoading(false)
        setRevalidationComplete(true)
      }
    }, 8000)

    return () => {
      isDisposed = true
      subscription.unsubscribe()
      clearTimeout(safetyTimeout)
      deferredLoads.forEach(clearTimeout)
      deferredLoads.clear()
    }
  }, [supabase, loadUserData, reset, router, setLoading, setRevalidationComplete])

  return null
}
