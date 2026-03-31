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
        // Silent refresh if profile exists, otherwise full load
        await loadUserData(session.user.id, !!existingProfile)
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
            await loadUserData(session.user.id, false)
          }
          break
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          if (session?.user) {
            await loadUserData(session.user.id, true)
          }
          break
        case 'SIGNED_OUT':
          reset()
          router.push('/auth/login')
          setLoading(false)
          break
      }
    })

    // Fallback: If INITIAL_SESSION doesn't fire (e.g. library behavior change), 
    // manually check session after a short tick
    setTimeout(async () => {
      if (!isInitialized) {
        const { data: { session } } = await supabase.auth.getSession()
        await handleInitialSession(session)
      }
    }, 500)

    return () => subscription.unsubscribe()
  }, [supabase, loadUserData, reset, router, setLoading])

  return null
}
