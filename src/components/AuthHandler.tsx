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
    // 1. Initial Session Check — only on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // If profile is already in store (persisted), skip the loading state
        const existingProfile = useAuthStore.getState().profile
        if (!existingProfile) {
          loadUserData(session.user.id)
        } else {
          // Silently refresh in the background without showing a loader
          loadUserData(session.user.id, true)
        }
      } else {
        setLoading(false)
      }
    })

    // 2. Auth State Change Listener (SINGLETON)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Global Auth] Event: ${event}`, !!session)
      
      switch (event) {
        case 'SIGNED_IN':
          // Only full re-load for explicit sign-in
          if (session?.user) {
            await loadUserData(session.user.id, false)
          }
          break
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          // These are routine events — never block the UI, update silently
          if (session?.user) {
            await loadUserData(session.user.id, true)
          }
          break
        case 'INITIAL_SESSION':
          // INITIAL_SESSION fires on every page load — only block if we have no profile
          if (session?.user) {
            const hasProfile = !!useAuthStore.getState().profile
            await loadUserData(session.user.id, hasProfile) // silent if we have a profile
          } else {
            setLoading(false)
          }
          break
        case 'SIGNED_OUT':
          reset()
          router.push('/auth/login')
          setLoading(false)
          break
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, loadUserData, reset, router, setLoading])

  return null
}
