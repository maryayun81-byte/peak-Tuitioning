'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'

export function AuthHandler() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const { loadUserData } = useAuth()
  const { setLoading, reset } = useAuthStore()

  useEffect(() => {
    // 1. Initial State Check (Single session check)
    // We rely on the event listener for INITIAL_SESSION, but we also do one manual check
    // to kick off loading for pre-existing persistent sessions.
    
    let isInitialized = false

    const handleInitialSession = async (session: any) => {
      if (isInitialized) return
      isInitialized = true
      
      if (session?.user) {
        const existingProfile = useAuthStore.getState().profile
        const role = session.user.app_metadata?.role || session.user.user_metadata?.role
        // Silent refresh if profile exists, otherwise full load
        await loadUserData(session.user.id, !!existingProfile, role)
      } else {
        setLoading(false)
      }
    }

    // 2. Auth State Change Listener (SINGLETON)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Global Auth] Event: ${event}`, !!session)
      
      switch (event) {
        case 'INITIAL_SESSION':
          await handleInitialSession(session)
          break
        case 'SIGNED_IN':
          if (session?.user) {
            const role = session.user.app_metadata?.role || session.user.user_metadata?.role
            await loadUserData(session.user.id, false, role)
          }
          break
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          if (session?.user) {
            const role = session.user.app_metadata?.role || session.user.user_metadata?.role
            await loadUserData(session.user.id, true, role)
          }
          break
        case 'SIGNED_OUT':
          reset()
          router.push('/auth/login')
          setLoading(false)
          break
      }
    })

    // Fallback: Safety timeout to prevent infinite loading hangs
    const safetyTimeout = setTimeout(() => {
      if (!isInitialized) {
        console.warn('[AuthHandler] Safety timeout reached. Forcing loading to false.')
        setLoading(false)
        isInitialized = true
      }
    }, 3000)

    // Fallback: If INITIAL_SESSION doesn't fire (e.g. library behavior change), 
    // manually check session after a short tick
    setTimeout(async () => {
      if (!isInitialized) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          await handleInitialSession(session)
        } catch (err) {
          console.error('[AuthHandler] Manual session check failed:', err)
          setLoading(false)
          isInitialized = true
        }
      }
    }, 200)

    return () => {
      subscription.unsubscribe()
      clearTimeout(safetyTimeout)
    }
  }, [supabase, loadUserData, reset, router, setLoading])

  return null
}
