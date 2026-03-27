'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import type { Profile, Student, Teacher, Parent, Theme } from '@/types/database'

export function useAuth() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { profile, student, teacher, parent, setProfile, setStudent, setTeacher, setParent, setLoading, reset } = useAuthStore()
  const { setTheme } = useThemeStore()

  const loadUserData = useCallback(async (userId: string, isSilent = false) => {
    // CRITICAL: only show a loading state if we have no profile at all (first visit / hard refresh).
    // If the user is already logged in (profile persisted from last visit), we NEVER block the UI.
    const currentProfile = useAuthStore.getState().profile
    const hasProfile = !!currentProfile && currentProfile.id === userId

    if (!hasProfile && !isSilent) {
      setLoading(true)
    }

    console.log(`[useAuth] Loading data for ${userId} (silent=${isSilent}, hasProfile=${hasProfile})...`)
    
    // Safety timeout — only for full loads, not silent refreshes
    const timeout = !hasProfile ? setTimeout(() => {
      console.warn(`[useAuth] loadUserData safety break after 10s for ${userId}`)
      setLoading(false)
    }, 10000) : null

    try {
      // 1. Quick check for metadata role (FAST - no DB hit)
      const { data: { session } } = await supabase.auth.getSession()
      const metadataRole = session?.user?.user_metadata?.role || session?.user?.app_metadata?.role
      
      if (metadataRole && !hasProfile) {
        console.log(`[useAuth] Found metadata role: ${metadataRole}. Setting placeholder profile.`)
        setProfile({ id: userId, role: metadataRole, full_name: 'User' } as Profile)
        // Release splash screen now that we have a role
        setLoading(false)
      }

      console.log('[useAuth] Fetching full profile...')
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      )

      const { data: profileData, error } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as any

      if (error || !profileData) {
        if (error) console.error('[useAuth] Profile fetch error:', error)
        if (!metadataRole && !hasProfile) {
           console.warn('[useAuth] No profile or metadata role found')
           reset()
        }
        return
      }

      const p = profileData as Profile
      setProfile(p)
      console.log(`[useAuth] Full profile loaded: ${p.role}`)
      
      if (!hasProfile) setLoading(false)
      
      if (p.theme) setTheme(p.theme as Theme)

      // Load role specific data in the background (SILENTLY)
      const fetchSubData = async () => {
        try {
          if (p.role === 'student') {
            console.log('[useAuth] Student check triggered for', userId)
            const { data, error: fetchError } = await supabase.from('students').select('*, class:classes(*), curriculum:curriculums(*)').eq('user_id', userId).single()
            
            if (fetchError) {
              console.error('[useAuth] Student fetch error:', fetchError)
              // Only toast if it's not a "not found" error which might happen during onboarding
              if (fetchError.code !== 'PGRST116') {
                toast.error('Data Sync Error: ' + fetchError.message)
              }
            }

            if (data) {
              const studentData = data as Student
              setStudent(studentData)

              // XP & Streak Logic
              const today = new Date().toISOString().split('T')[0]
              const lastXPDate = studentData.last_login_xp_at ? new Date(studentData.last_login_xp_at).toISOString().split('T')[0] : null
              const lastActive = studentData.last_active_at ? new Date(studentData.last_active_at).toISOString().split('T')[0] : null
              
              let newStreak = studentData.streak_count || 0
              let xpBonus = 0
              
              const isNewDay = lastXPDate !== today
              if (isNewDay) xpBonus = 10
              
              console.log(`[useAuth] Gamification Check:`, { today, lastXPDate, lastActive, isNewDay, currentXP: studentData.xp })

              if (lastActive) {
                const todayDate = new Date(today)
                const lastDate = new Date(lastActive)
                const diffTime = todayDate.getTime() - lastDate.getTime()
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
                
                if (diffDays === 1) {
                  newStreak += 1
                } else if (diffDays > 1) {
                  newStreak = 1
                }
              } else {
                newStreak = 1
              }
              
              if (isNewDay || newStreak !== studentData.streak_count) {
                 console.log(`[useAuth] Executing Sync: +${xpBonus} XP, Streak ${newStreak}`)
                 const { data: updatedStudent, error: updateError } = await supabase
                    .from('students')
                    .update({ 
                       xp: (studentData.xp || 0) + xpBonus,
                       last_login_xp_at: today,
                       streak_count: newStreak,
                       last_active_at: today
                    })
                    .eq('id', studentData.id)
                    .select('*, class:classes(*), curriculum:curriculums(*)')
                    .single()
                 
                 if (updateError) {
                   console.error('[useAuth] Sync Error:', updateError)
                   toast.error('Gamification Sync Failed: ' + updateError.message)
                 }

                 if (updatedStudent) {
                    setStudent(updatedStudent as Student)
                    
                    if (isNewDay) {
                      const { error: notifError } = await supabase.from('notifications').insert({
                         user_id: userId,
                         title: 'Daily Login Bonus',
                         body: `You earned +10 XP! Current Streak: ${newStreak} Days`,
                         type: 'info',
                         data: { xp: 10, category: 'login', streak: newStreak }
                      })

                      if (notifError) console.error('[useAuth] Notification failed:', notifError)

                      toast.success(`Daily Login: +10 XP! (${newStreak} Day Streak)`, { 
                        icon: '🔥', 
                        duration: 5000,
                        style: { borderRadius: '1rem', background: 'var(--card)', color: 'var(--text)' } 
                      })
                    }
                 }
              } else {
                 console.log('[useAuth] XP and Streak are already up to date.')
              }
            }
          } else if (p.role === 'parent') {
            console.log('[useAuth] Fetching parent record for', userId)
            
            // Handle potential duplicate profiles by fetching all and merging the 'onboarded' status
            const { data: parentListData, error: parentError } = await supabase
              .from('parents')
              .select('*')
              .eq('user_id', userId)

            if (parentError) {
              console.error('[useAuth] Parent fetch error:', parentError)
              toast.error('Parent Data Sync Error: ' + parentError.message)
            }

            if (parentListData && parentListData.length > 0) {
              // Merge: if ANY duplicate record is marked as onboarded, the parent is onboarded.
              // This prevents a stale/older duplicate from triggering the modal again.
              const anyOnboarded = parentListData.some(r => r.onboarded === true)
              const firstRecord = parentListData[0]
              
              setParent({
                ...firstRecord,
                onboarded: anyOnboarded
              } as Parent)
            } else if (!parentError) {
              console.warn('[useAuth] No parent record found for', userId)
            }
          } else if (p.role === 'teacher') {
            console.log('[useAuth] Fetching teacher record for', userId)
            const { data: teacherData, error: teacherError } = await supabase
              .from('teachers')
              .select('*, teacher_assignments(is_class_teacher)')
              .eq('user_id', userId)
              .single()

            if (teacherError && teacherError.code !== 'PGRST116') {
              console.error('[useAuth] Teacher fetch error:', teacherError)
              toast.error('Teacher Data Sync Error: ' + teacherError.message)
            }

            if (teacherData) {
              const isClassTeacher = teacherData.teacher_assignments?.some((a: any) => a.is_class_teacher) || false
              setTeacher({ ...teacherData, is_class_teacher: isClassTeacher } as Teacher)
            } else if (!teacherError) {
              console.warn('[useAuth] No teacher record found for', userId)
            }
          }
        } catch (roleError) {
          console.error('[useAuth] Background role data fetch failed:', roleError)
        }
      }

      await fetchSubData()
      console.log('[useAuth] User data load complete')
    } catch (err) {
      console.error('[useAuth] Data load error (likely timeout):', err)
      // Safety: always ensure loading is cleared on error if we don't have a profile
      if (!hasProfile) setLoading(false)
    } finally {
      if (timeout) clearTimeout(timeout)
      // FINAL SAFETY: Always clear loading if we reached the end of the data load
      // the hasProfile check prevents us from accidentally hiding specialized loaders 
      // if this was a background refresh, but for hard refreshes it guarantees UI release.
      if (!hasProfile || isSilent === false) {
        setLoading(false)
      }
    }
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
