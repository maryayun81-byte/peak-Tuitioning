'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, FileText, BrainCircuit,
  Trophy, Calendar, Library, GraduationCap,
  Award, Settings, LogOut, Bell, Zap, Star, Clock
} from 'lucide-react'
import { Sidebar, BottomNav } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { GraduationCap as Logo } from 'lucide-react'
import { SplashScreen } from '@/components/SplashScreen'
import { Avatar } from '@/components/ui/Avatar'
import { InstallPWAButton } from '@/components/InstallPWAButton'
import { useNotificationStore } from '@/stores/notificationStore'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { LevelUpManager } from '@/components/student/gamification/LevelUpManager'
import { QuickInfoModal } from '@/components/notifications/QuickInfoModal'
import { calculateLevel } from '@/lib/gamification'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { PageErrorBoundary } from '@/components/ui/PageErrorBoundary'
import toast from 'react-hot-toast'
import Link from 'next/link'

const NAV_ITEMS = [
  { label: 'My Hub', href: '/student', icon: <LayoutDashboard size={18} /> },
  { label: 'Trivia', href: '/student/trivia', icon: <Trophy size={18} /> },
  { label: 'Assignments', href: '/student/assignments', icon: <FileText size={18} /> },
  { label: 'Quizzes', href: '/student/quizzes', icon: <BrainCircuit size={18} /> },
  { label: 'Schedule', href: '/student/schedule', icon: <Calendar size={18} /> },
  { label: 'Study Timer', href: '/student/study', icon: <Clock size={18} /> },
  { label: 'My Progress', href: '/student/performance', icon: <Trophy size={18} /> },
  { label: 'Library', href: '/student/resources', icon: <Library size={18} /> },
  { label: 'Awards', href: '/student/awards', icon: <Star size={18} /> },
  { label: 'Transcripts', href: '/student/transcripts', icon: <Award size={18} /> },
  { label: 'Settings', href: '/student/settings', icon: <Settings size={18} /> },
]

const MOBILE_BOTTOM = NAV_ITEMS.slice(0, 4)
const MOBILE_MORE = [
  ...NAV_ITEMS.slice(4),
  { label: 'Sign Out', href: '#', icon: <LogOut size={18} /> },
]

const LogoComponent = (
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20" style={{ background: 'linear-gradient(135deg, #FF6B6B, #FFB88C)' }}>
      <Logo size={18} className="text-white" />
    </div>
    <div>
      <div className="text-xs font-black" style={{ color: 'var(--text)' }}>Peak Performance</div>
      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Student Portal</div>
    </div>
  </div>
)

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { profile, student, isLoading, isInitialRevalidationComplete, setStudent } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  useRealtimeNotifications()

  const { signOut } = useAuth()
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const pathname = usePathname()

  // Sticky refs — hold the last non-null profile/student so the portal never goes
  // blank during a token refresh re-fetch (~every 1 hr) when the store transiently
  // replaces these values. Auth guards still use the live `profile` / `student`.
  const stickyProfile = useRef(profile)
  const stickyStudent = useRef(student)
  if (profile) stickyProfile.current = profile
  if (student) stickyStudent.current = student

  // Track if the student was ever confirmed as onboarded in this session.
  // Once we see onboarded=true, we never redirect to /student/onboarding
  // — even if a background re-fetch transiently returns a different value.
  const wasEverOnboarded = useRef(false)
  if (student?.onboarded === true) wasEverOnboarded.current = true

  useEffect(() => {
    if (!isLoading && !profile) router.push('/auth/login?role=student')
    if (!isLoading && profile?.role && profile.role !== 'student') {
      router.push(`/${profile.role}`)
    }

    // Redirect to onboarding ONLY when ALL conditions are met:
    // 1. Fresh DB data confirmed (isInitialRevalidationComplete=true)
    // 2. Student row exists in the store
    // 3. onboarded is STRICTLY false (not null, not undefined — only explicit false)
    // 4. Student was NEVER confirmed as onboarded earlier in this session
    // 5. Not already on the onboarding page
    if (
      isInitialRevalidationComplete &&
      student != null &&
      student.onboarded === false &&
      !wasEverOnboarded.current &&
      typeof window !== 'undefined' &&
      pathname !== '/student/onboarding'
    ) {
      console.log('[StudentLayout] Handshake stable. Directing to onboarding...')
      router.push('/student/onboarding')
    }
  }, [profile, student, isLoading, isInitialRevalidationComplete, router, pathname])

  // Daily XP Login logic — Only fires once handshake is stable
  useEffect(() => {
    if (!isInitialRevalidationComplete || !student?.id || student.onboarded === false) return

    const checkDailyXP = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const lastLoginDate = (student as any).last_login_date

        if (lastLoginDate !== today) {
          console.log('[DailyXP] Granting login XP for today:', today)
          
          const newXP = (student.xp || 0) + 10
          
          const { error } = await supabase
            .from('students')
            .update({ 
               xp: newXP, 
               last_login_date: today 
            })
            .eq('id', student.id)

          if (!error) {
            // Refresh local state to show the new XP immediately
            setStudent({ ...student, xp: newXP, last_login_date: today })
            toast.success('🔥 +10 XP for daily login!', {
              id: 'daily-login-xp',
              icon: '⚡',
              duration: 4000
            })
          }
        }
      } catch (e) {
        console.error('[DailyXP] Error awarding XP:', e)
      }
    }

    // Short debounce to ensure store is stable
    const t = setTimeout(checkDailyXP, 1000)
    return () => clearTimeout(t)
  }, [student?.id, isInitialRevalidationComplete])


  // ─── RULE 1: Only show full-screen splash on true first-load (no session yet) ───
  // Once profile is in the store (from localStorage OR fresh fetch), we never go
  // back to a full-screen spinner — that causes all pages to freeze.
  if (isLoading && !profile) {
    return <SplashScreen done={false} role="student" />
  }

  // ─── RULE 2: Portal UI visibility ──────────────────────────────────────────────
  // Use stickyProfile (last non-null value) so the sidebar/header never disappear
  // during a ~1hr token refresh cycle where the store transiently clears profile.
  const showPortalUI = !!(profile || stickyProfile.current)

  // ─── RULE 3: Pending onboarding UI blocker ─────────────────────────────────────
  // Only block portal chrome if we KNOW (via fresh DB data) the student hasn't onboarded.
  // Strict === false prevents null/undefined onboarded values from triggering this.
  const isPendingOnboarding = isInitialRevalidationComplete && student != null && student.onboarded === false

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {showPortalUI && (
         <Sidebar
           items={NAV_ITEMS}
           bottomItems={[
             { label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: () => signOut() },
           ]}
           logo={LogoComponent}
           role="student"
         />
      )}

      <main className={`min-h-screen transition-all duration-300 pb-20 md:pb-0 ${showPortalUI ? 'md:ml-[260px]' : ''}`}>
        {/* Modern Header for Students (XP & Levels) */}
        {showPortalUI && (
          <header
            className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-[var(--card-border)] bg-transparent"
            style={{ background: 'rgba(var(--card-rgb), 0.8)', backdropFilter: 'blur(12px)' }}
          >
             {(() => {
                 const { level, title, isProspect } = calculateLevel(student?.xp || 0)
                 const xp = student?.xp || 0

                return (
                  <>
                    <div className="flex-1 min-w-0 mr-2">
                       <h2 className="text-xs md:text-sm font-bold opacity-60 truncate">
                         {level > 0 ? `Level ${level} • ${title}` : title}
                       </h2>
                    </div>
                  
                  <div className="flex items-center gap-4 md:gap-6">
                     <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                        <Zap size={14} className="text-amber-500 fill-amber-500" />
                        <span className="text-xs font-black text-amber-500">{student?.xp?.toLocaleString() || 0} XP</span>
                     </div>
                     <InstallPWAButton variant="minimal" />
                     <div className="w-px h-6 bg-[var(--card-border)]" />
                     <Link href="/student/notifications" className="relative p-2 rounded-xl hover:bg-[var(--input)] transition-colors group">
                        <Bell size={20} className="text-[var(--text-muted)] group-hover:text-primary transition-colors" />
                        {unreadCount > 0 && (
                          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-[var(--bg)] shadow-sm animate-in zoom-in">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                     </Link>
                      <Avatar 
                        url={profile?.avatar_url} 
                        name={profile?.full_name} 
                        size="sm" 
                        className="cursor-pointer group"
                      />
                  </div>
                </>
              )
           })()}
        </header>
        )}

        <div className={!isPendingOnboarding ? "md:px-2" : ""}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <PageErrorBoundary>
              {children}
            </PageErrorBoundary>
          </motion.div>
        </div>
        <LevelUpManager />
        <QuickInfoModal />
      </main>

      {!isPendingOnboarding && (
        <BottomNav 
          items={MOBILE_BOTTOM} 
          moreItems={MOBILE_MORE.map(item => 
            item.label === 'Sign Out' ? { ...item, onClick: signOut } : item
          )} 
        />
      )}
    </div>
  )
}
