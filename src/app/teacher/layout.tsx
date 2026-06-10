'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, ClipboardList, Calendar, 
  Library, GraduationCap, Award, Settings, LogOut,
  PlusCircle, FileText, Zap, Bell, Users, Layers, BrainCircuit, HelpCircle, Trophy, MessageCircle
} from 'lucide-react'
import { Sidebar, BottomNav } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { GraduationCap as Logo } from 'lucide-react'
import { SplashScreen } from '@/components/SplashScreen'
import { Avatar } from '@/components/ui/Avatar'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { TermsEnforcementModal } from '@/components/teacher/TermsEnforcementModal'
import { PageErrorBoundary } from '@/components/ui/PageErrorBoundary'
import { TeacherAIAssistant } from '@/components/teacher/TeacherAIAssistant'
import { SessionHeartbeat } from '@/components/shared/SessionHeartbeat'
import { useMessageUnreadCount } from '@/hooks/useMessageUnreadCount'

import { useNotificationStore } from '@/stores/notificationStore'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/teacher', icon: <LayoutDashboard size={18} /> },
  { label: 'Attendance', href: '/teacher/attendance', icon: <ClipboardList size={18} /> },
  { label: 'Live Studio', href: '/teacher/live', icon: <Zap size={18} className="text-emerald-500" /> },
  { label: 'Messages', href: '/teacher/messages', icon: <MessageCircle size={18} /> },
  { label: 'Trivia', href: '/teacher/trivia', icon: <Trophy size={18} /> },
  { label: 'Assignments', href: '/teacher/assignments', icon: <FileText size={18} /> },
  { label: 'Worksheets', href: '/teacher/worksheets/new', icon: <Layers size={18} /> },
  { label: 'Practice Bank', href: '/teacher/practice-questions', icon: <HelpCircle size={18} /> },
  { label: 'Quizzes', href: '/teacher/quizzes', icon: <Award size={18} /> },
  { label: 'Marking', href: '/teacher/marking', icon: <PlusCircle size={18} /> },
  { label: 'Exam Marks', href: '/teacher/exam-marks', icon: <Award size={18} /> },
  { label: 'Transcripts', href: '/teacher/transcripts', icon: <FileText size={18} /> },
  { label: 'Schedule', href: '/teacher/schedule', icon: <Calendar size={18} /> },
  { label: 'Study Monitor', href: '/teacher/study-monitor', icon: <BrainCircuit size={18} /> },
  { label: 'Students', href: '/teacher/students', icon: <Users size={18} /> },
  { label: 'Resources', href: '/teacher/resources', icon: <Library size={18} /> },
  { label: 'Schemes', href: '/teacher/schemes', icon: <BookOpen size={18} /> },
  { label: 'Settings', href: '/teacher/settings', icon: <Settings size={18} /> },
]

const LogoComponent = (
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0EA5E9, #22D3EE)' }}>
      <Logo size={18} className="text-white" />
    </div>
    <div>
      <div className="text-xs font-black" style={{ color: 'var(--text)' }}>Peak Performance</div>
      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Teacher Portal</div>
    </div>
  </div>
)

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { profile, teacher, isLoading, isInitialRevalidationComplete, setProfile } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const { count: messageUnreadCount } = useMessageUnreadCount()
  useRealtimeNotifications()
  const { signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // ─── STICKY ONBOARDING REF ──────────────────────────────────────────────────
  // Once we confirm a teacher is onboarded (from either the teacher or profile row),
  // we lock this ref to true for the entire session. This prevents NavigationRefetch
  // or transient store updates from re-triggering the onboarding redirect mid-session.
  const wasEverConfirmedOnboarded = useRef(false)
  const teacherHasOnboarded = teacher?.onboarded === true || profile?.has_onboarded === true
  if (teacherHasOnboarded) wasEverConfirmedOnboarded.current = true

  const [pendingTerm, setPendingTerm] = useState<any>(null)
  // Only check terms once per session — not on every layout mount
  const termsCheckedRef = useRef(false)

  useEffect(() => {
    if (teacher?.id && !termsCheckedRef.current) {
      termsCheckedRef.current = true
      checkTerms()
    }
  }, [teacher?.id])

  const checkTerms = async () => {
    const supabase = getSupabaseBrowserClient()
    try {
      const { data } = await supabase
        .from('document_assignments')
        .select('*, document:documents(title, content, version)')
        .eq('teacher_id', teacher!.id)
        .eq('status', 'pending')
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) setPendingTerm(data)
    } catch (err) {
      console.warn('[TeacherLayout] checkTerms failed silently:', err)
    }
  }

  useEffect(() => {
    if (!isLoading && !profile) router.push('/auth/login?role=teacher')
    if (!isLoading && profile?.role && profile.role !== 'teacher') {
      router.push(`/${profile.role}`)
    }
    // CRITICAL: Use wasEverConfirmedOnboarded.current — NOT teacherHasOnboarded — as the gate.
    // This ref is sticky: once set to true in any render, it stays true for the session.
    // This prevents NavigationRefetch (query cache invalidation on route change) from
    // transiently clearing teacher data and triggering a false redirect to /teacher/onboarding.
    if (
      isInitialRevalidationComplete &&
      profile &&
      profile.role === 'teacher' &&
      !wasEverConfirmedOnboarded.current &&
      pathname !== '/teacher/onboarding'
    ) {
      router.push('/teacher/onboarding')
    }
  }, [profile, teacher, isLoading, router, pathname, isInitialRevalidationComplete])


  // Only block the UI if we are truly loading the first time (no persisted profile)
  if (isLoading && !profile) {
    return <SplashScreen done={false} role="teacher" />
  }

  return (
    <>
      {pendingTerm && <TermsEnforcementModal assignment={pendingTerm} onSuccess={() => setPendingTerm(null)} />}
      <div className={`min-h-screen transition-all ${pendingTerm ? 'blur-md pointer-events-none' : ''}`} style={{ background: 'var(--bg)' }}>
        <SplashScreen storageKey="splash-teacher" role="teacher" />
      <Sidebar
        items={wasEverConfirmedOnboarded.current ? NAV_ITEMS.filter(item => item.label !== 'Attendance' || teacher?.is_class_teacher).map(item => item.href === '/teacher/messages' ? { ...item, badge: messageUnreadCount } : item) : NAV_ITEMS.filter(i => i.label === 'Settings')}
        bottomItems={[
          { label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: () => signOut() },
        ]}
        logo={LogoComponent}
        role="teacher"
      />

      <main className="min-h-screen transition-all duration-300 pb-20 md:pb-0" style={{ marginLeft: 0 }}>
        {/* Modern Header for Teachers */}
        <header
          className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-[var(--card-border)] md:ml-[260px]"
          style={{ background: 'rgba(var(--card-rgb), 0.8)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex-1 min-w-0 mr-2 md:hidden">
            {LogoComponent}
          </div>
          
          <div className="flex-1 hidden md:block" />

          <div className="flex items-center gap-4 md:gap-6">
             <Link href="/teacher/messages" aria-label={`Messages${messageUnreadCount ? `, ${messageUnreadCount} unread` : ''}`} className="relative p-2 rounded-xl hover:bg-[var(--input)] transition-colors group">
                <MessageCircle size={20} className="text-[var(--text-muted)] group-hover:text-primary transition-colors" />
                {messageUnreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center bg-sky-500 text-white text-[9px] font-black rounded-full border-2 border-[var(--bg)]">
                    {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                  </span>
                )}
             </Link>
             <Link href="/teacher/notifications" className="relative p-2 rounded-xl hover:bg-[var(--input)] transition-colors group">
                <Bell size={20} className="text-[var(--text-muted)] group-hover:text-primary transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-[var(--bg)] shadow-sm animate-in zoom-in">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
             </Link>
             <div className="w-px h-6 bg-[var(--card-border)]" />
             <Avatar 
                url={profile?.avatar_url} 
                name={profile?.full_name} 
                size="sm" 
                className="cursor-pointer"
              />
          </div>
        </header>

        {/* Main Content */}
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
          ? NAV_ITEMS.filter(item => item.label !== 'Attendance' || teacher?.is_class_teacher).map(item => item.href === '/teacher/messages' ? { ...item, badge: messageUnreadCount } : item).slice(0, 4)
          : NAV_ITEMS.filter(i => i.label === 'Settings')
        } 
        moreItems={wasEverConfirmedOnboarded.current 
          ? [
              ...NAV_ITEMS.filter(item => item.label !== 'Attendance' || teacher?.is_class_teacher).map(item => item.href === '/teacher/messages' ? { ...item, badge: messageUnreadCount } : item).slice(4),
              { label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: signOut }
            ]
          : [{ label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: signOut }]
        } 
      />
      <TeacherAIAssistant />
      <SessionHeartbeat />
      </div>
    </>
  )
}
