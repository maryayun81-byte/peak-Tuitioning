'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import type { Profile, Student, Teacher, Parent, Theme } from '@/types/database'

// Module-level lock to prevent concurrent loads for the same user across multiple hook instances
const loadingMap = new Map<string, Promise<void>>()

export function useAuth() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { profile, student, teacher, parent, setProfile, setStudent, setTeacher, setParent, setLoading, reset } = useAuthStore()
  const { setTheme } = useThemeStore()

  const loadUserData = useCallback(async (userId: string, isSilent = false) => {
    // If a load is already in progress for this user, join it instead of starting a new one
    if (loadingMap.has(userId)) {
      console.log(`[useAuth] Joining existing load for ${userId}`)
      return loadingMap.get(userId)
    }

    const loadPromise = (async () => {
      const currentProfile = useAuthStore.getState().profile
      const hasProfile = !!currentProfile && currentProfile.id === userId

      if (!hasProfile && !isSilent) {
        setLoading(true)
      }

      console.log(`[useAuth] Loading data for ${userId} (silent=${isSilent}, hasProfile=${hasProfile})...`)
      
      const timeout = !hasProfile ? setTimeout(() => {
        setLoading(false)
      }, 10000) : null

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        const metadataRole = session?.user?.user_metadata?.role || session?.user?.app_metadata?.role
        
        if (metadataRole && !hasProfile) {
          setProfile({ id: userId, role: metadataRole, full_name: 'User' } as Profile)
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (profileError || !profileData) {
          if (profileError) console.error('[useAuth] Profile fetch error:', profileError)
          if (!metadataRole && !hasProfile) reset()
          return
        }

        const p = profileData as Profile
        setProfile(p)
        if (p.theme) setTheme(p.theme as Theme)

        // Background data fetch (now awaited before finally block sets loading=false)
        const fetchSubData = async () => {
          try {
            if (p.role === 'student') {
              const { data, error: fetchError } = await supabase.from('students').select('*, class:classes(*), curriculum:curriculums(*)').eq('user_id', userId).single()
              if (data) setStudent(data as Student)
            } else if (p.role === 'parent') {
              const { data: parentListData } = await supabase.from('parents').select('*').eq('user_id', userId)
              if (parentListData && parentListData.length > 0) {
                const anyOnboarded = parentListData.some(r => r.onboarded === true)
                setParent({ ...parentListData[0], onboarded: anyOnboarded } as Parent)
              }
            } else if (p.role === 'teacher') {
              const { data: teacherData } = await supabase.from('teachers').select('*, teacher_assignments(is_class_teacher)').eq('user_id', userId).single()
              if (teacherData) {
                const isClassTeacher = (teacherData as any).teacher_assignments?.some((a: any) => a.is_class_teacher) || false
                setTeacher({ ...teacherData, is_class_teacher: isClassTeacher } as Teacher)
              }
            }
          } catch (roleError) {
            console.error('[useAuth] Background role data fetch failed:', roleError)
          }
        }

        await fetchSubData()
      } catch (err: any) {
        // Silently handle lock/abort errors to keep console clean
        if (err?.name === 'AbortError' || err?.message?.includes('Lock broken')) {
          console.log('[useAuth] Auth lock superseded or aborted.')
        } else {
          console.error('[useAuth] Data load error:', err)
        }
      } finally {
        if (timeout) clearTimeout(timeout)
        setLoading(false)
        loadingMap.delete(userId)
      }
    })()

    loadingMap.set(userId, loadPromise)
    return loadPromise
  }, [supabase, setProfile, setStudent, setTeacher, setParent, setLoading, setTheme, reset])

  const signOut = async () => {
    try {
      // Race Supabase signout against a 2 second timeout to prevent infinite hanging
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 2000))
      ])
    } catch (e) {
      console.warn('Signout error:', e)
    } finally {
      // Clear Zustand stores
      reset()
      
      // Force aggressive cookie destruction to ensure SSR middleware knows we are logged out
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
        localStorage.clear()
        sessionStorage.clear()
      }
      
      // Force a hard reload to destroy Next.js client cache
      window.location.href = '/'
    }
  }

  // Initialization moved to global AuthHandler.tsx
  return { profile, student, teacher, parent, signOut, loadUserData }
}

export function useRequireAuth(role?: string) {
  const { profile, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/auth/login')
      return
    }
    if (!isLoading && role && profile?.role !== role) {
      router.push(`/${profile?.role}`)
    }
  }, [profile, isLoading, role, router])

  return { profile, isLoading }
}
