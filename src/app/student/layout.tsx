'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, FileText, BrainCircuit,
  Trophy, Calendar, Library, GraduationCap, Target, Users, Mic, Swords, FolderHeart,
  Award, Settings, LogOut, Bell, Zap, Star, Clock, Receipt, MessageCircle
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
import { SessionHeartbeat } from '@/components/shared/SessionHeartbeat'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useMessageUnreadCount } from '@/hooks/useMessageUnreadCount'

const NAV_ITEMS = [
  { label: 'My Hub', shortLabel: 'Home', group: 'Overview', href: '/student', icon: <LayoutDashboard size={18} /> },
  { label: 'Assignments', shortLabel: 'Tasks', group: 'Learning', href: '/student/assignments', icon: <FileText size={18} /> },
  { label: 'Schedule', group: 'Learning', href: '/student/schedule', icon: <Calendar size={18} /> },
  { label: 'Quizzes', group: 'Learning', href: '/student/quizzes', icon: <BrainCircuit size={18} /> },
  { label: 'Live Campus', shortLabel: 'Live', group: 'Learning', href: '/student/live', icon: <Zap size={18} className="text-emerald-500" /> },
  { label: 'Exam Prep', group: 'Learning', href: '/student/exam-prep', icon: <Target size={18} className="text-indigo-500" /> },
  { label: 'Creator Hub', shortLabel: 'Create', group: 'Learning', href: '/student/flashcards', icon: <BookOpen size={18} className="text-sky-500" /> },
  { label: 'Daily Brain Gym', shortLabel: 'Brain Gym', group: 'Learning', href: '/student/brain-gym', icon: <BrainCircuit size={18} className="text-orange-500" /> },
  { label: 'Study Timer', shortLabel: 'Timer', group: 'Learning', href: '/student/study', icon: <Clock size={18} /> },
  { label: 'Messages', shortLabel: 'Chat', group: 'Community', href: '/student/messages', icon: <MessageCircle size={18} /> },
  { label: 'Study Pods', shortLabel: 'Pods', group: 'Community', href: '/student/pods', icon: <Users size={18} className="text-violet-500" /> },
  { label: 'Classroom Duels', shortLabel: 'Duels', group: 'Community', href: '/student/duels', icon: <Swords size={18} className="text-indigo-500" /> },
  { label: 'Trivia', group: 'Community', href: '/student/trivia', icon: <Trophy size={18} /> },
  { label: 'Voice Notes', shortLabel: 'Voice', group: 'Create', href: '/student/voice-notes', icon: <Mic size={18} className="text-rose-500" /> },
  { label: 'Library', group: 'Create', href: '/student/resources', icon: <Library size={18} /> },
  { label: 'My Portfolio', shortLabel: 'Portfolio', group: 'Create', href: '/student/portfolio', icon: <FolderHeart size={18} className="text-pink-500" /> },
  { label: 'My Progress', shortLabel: 'Progress', group: 'Results', href: '/student/performance', icon: <Trophy size={18} /> },
  { label: 'Awards', group: 'Results', href: '/student/awards', icon: <Star size={18} /> },
  { label: 'Transcripts', group: 'Results', href: '/student/transcripts', icon: <Award size={18} /> },
  { label: 'Billing', group: 'Account', href: '/student/billing', icon: <Receipt size={18} /> },
  { label: 'Settings', group: 'Account', href: '/student/settings', icon: <Settings size={18} /> },
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
  const { count: messageUnreadCount } = useMessageUnreadCount()
  const [navCounts, setNavCounts] = useState({ assignments: 0, quizzes: 0, resources: 0 })
  useRealtimeNotifications()

  const { signOut } = useAuth()
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const pathname = usePathname()
  const isCreatorHub = pathname.startsWith('/student/flashcards')

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
  const wasEverConfirmedOnboarded = useRef(false)
  const studentHasOnboarded = student?.onboarded === true || profile?.has_onboarded === true
  if (studentHasOnboarded) wasEverConfirmedOnboarded.current = true

  useEffect(() => {
    if (!isLoading && !profile) router.push('/auth/login?role=student')
    if (!isLoading && profile?.role && profile.role !== 'student') {
      router.push(`/${profile.role}`)
    }

    if (
      isInitialRevalidationComplete &&
      profile &&
      profile.role === 'student' &&
      profile.has_onboarded !== true &&
      !wasEverConfirmedOnboarded.current &&
      pathname !== '/student/onboarding'
    ) {
      router.push('/student/onboarding')
    }
  }, [profile, student, isLoading, router, pathname, isInitialRevalidationComplete])

  useEffect(() => {
    if (!student?.id) return

    // Setup realtime subscription for XP updates
    const channel = supabase.channel(`student_xp_${student.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'students',
          filter: `id=eq.${student.id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new.xp === 'number') {
            const oldLevel = calculateLevel(student.xp || 0).level
            const newLevelInfo = calculateLevel(payload.new.xp)
            
            // Only update store if XP actually changed to avoid infinite loops
            if (payload.new.xp !== student.xp) {
              setStudent({ ...student, xp: payload.new.xp })
            }

            if (newLevelInfo.level > oldLevel) {
              toast.success(`Level Up! You are now Level ${newLevelInfo.level} 🌟`, {
                icon: '🎉',
                style: {
                  borderRadius: '16px',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  border: '1px solid var(--card-border)',
                },
              })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [student?.id, student?.xp, setStudent, supabase])

  useEffect(() => {
    const actorUserId = profile?.id || (student as any)?.user_id
    if (!actorUserId) {
      setNavCounts({ assignments: 0, quizzes: 0, resources: 0 })
      return
    }

    let cancelled = false
    const loadNavCounts = async () => {
      const [assignments, quizzes, resources] = await Promise.all([
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', actorUserId).eq('type', 'assignment').eq('read', false),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', actorUserId).eq('type', 'quiz').eq('read', false),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', actorUserId).eq('type', 'resource').eq('read', false),
      ])

      if (!cancelled) {
        setNavCounts({
          assignments: assignments.count || 0,
          quizzes: quizzes.count || 0,
          resources: resources.count || 0,
        })
      }
    }

    loadNavCounts()
    return () => {
      cancelled = true
    }
  }, [profile?.id, (student as any)?.user_id, unreadCount, supabase])

  // Only block the UI if we are truly loading the first time (no persisted profile)
  if (isLoading && !profile) {
    return <SplashScreen done={false} role="student" />
  }

  const p = profile || stickyProfile.current
  const s = student || stickyStudent.current

  const { level, currentMilestone, nextMilestone, progressPercent } = calculateLevel(s?.xp || 0)
  const progressPercentage = progressPercent
  const withNavBadge = (item: typeof NAV_ITEMS[number]) => {
    if (item.href === '/student/messages') return { ...item, badge: messageUnreadCount }
    if (item.href === '/student/assignments') return { ...item, badge: navCounts.assignments }
    if (item.href === '/student/quizzes') return { ...item, badge: navCounts.quizzes }
    if (item.href === '/student/resources') return { ...item, badge: navCounts.resources }
    return item
  }

  return (
    <>
      <div className="min-h-screen transition-all" style={{ background: 'var(--bg)' }}>
        <SplashScreen storageKey="splash-student" role="student" />
        <Sidebar
          items={wasEverConfirmedOnboarded.current ? NAV_ITEMS.map(withNavBadge) : NAV_ITEMS.filter(i => i.label === 'Settings')}
          bottomItems={[
            { label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: () => signOut() },
          ]}
          logo={LogoComponent}
          role="student"
        >
          {wasEverConfirmedOnboarded.current && s && (
            <div className="mt-6 mb-2 px-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-black">
                <span style={{ color: 'var(--text-muted)' }}>Level {level}</span>
                <span style={{ color: 'var(--text)' }}>{s.xp || 0} XP</span>
              </div>
              <div className="h-2 w-full bg-[var(--input)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-400 to-rose-500" 
                  style={{ width: `${progressPercentage}%` }} 
                />
              </div>
              <p className="text-[10px] font-bold text-center" style={{ color: 'var(--text-muted)' }}>
                {nextMilestone - currentMilestone} XP to Level {level + 1}
              </p>
            </div>
          )}
        </Sidebar>

        <main className={`min-h-screen transition-all duration-300 ${isCreatorHub ? 'pb-0' : 'pb-20 md:pb-0'}`} style={{ marginLeft: 0 }}>
          {/* Modern Header for Students — hidden on creator hub for full-screen */}
          {!isCreatorHub && (
          <header
            className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-[var(--card-border)] md:ml-[260px]"
            style={{ background: 'rgba(var(--card-rgb), 0.8)', backdropFilter: 'blur(12px)' }}
          >
            <div className="flex-1 min-w-0 mr-2 md:hidden">
              {LogoComponent}
            </div>
            
            <div className="flex-1 hidden md:block" />

            <div className="flex items-center gap-4 md:gap-6">
              <Link href="/student/messages" aria-label={`Messages${messageUnreadCount ? `, ${messageUnreadCount} unread` : ''}`} className="relative p-2 rounded-xl hover:bg-[var(--input)] transition-colors group">
                  <MessageCircle size={20} className="text-[var(--text-muted)] group-hover:text-primary transition-colors" />
                  {messageUnreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center bg-sky-500 text-white text-[9px] font-black rounded-full border-2 border-[var(--bg)]">
                      {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                    </span>
                  )}
              </Link>
              <Link href="/student/notifications" className="relative p-2 rounded-xl hover:bg-[var(--input)] transition-colors group">
                  <Bell size={20} className="text-[var(--text-muted)] group-hover:text-primary transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-[var(--bg)] shadow-sm animate-in zoom-in">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
              </Link>
              <div className="w-px h-6 bg-[var(--card-border)]" />
              <Link href="/student/settings">
                <Avatar 
                    url={p?.avatar_url} 
                    name={p?.full_name} 
                    size="sm" 
                    className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  />
              </Link>
            </div>
          </header>
          )}

          <div className="md:ml-[260px]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <PageErrorBoundary>
                {children}
              </PageErrorBoundary>
            </motion.div>
          </div>
        </main>

        <BottomNav 
          items={wasEverConfirmedOnboarded.current 
            ? [
                withNavBadge(NAV_ITEMS[0]),
                withNavBadge(NAV_ITEMS[1]),
                NAV_ITEMS[2],
                withNavBadge(NAV_ITEMS.find(item => item.href === '/student/messages')!),
              ]
            : NAV_ITEMS.filter(i => i.label === 'Settings')
          } 
          moreItems={wasEverConfirmedOnboarded.current 
            ? [
                ...NAV_ITEMS.filter(item => !['/student', '/student/assignments', '/student/schedule', '/student/messages'].includes(item.href)).map(withNavBadge),
                { label: 'Sign Out', group: 'Account', href: '#', icon: <LogOut size={18} />, onClick: signOut }
              ]
            : [{ label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: signOut }]
          } 
        />
        <QuickInfoModal />
        <SessionHeartbeat />
        <LevelUpManager />
      </div>
    </>
  )
}
