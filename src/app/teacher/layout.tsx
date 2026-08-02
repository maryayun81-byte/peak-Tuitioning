'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, ClipboardList, Calendar, 
  Library, GraduationCap, Award, Settings, LogOut,
  PlusCircle, FileText, Zap, Bell, Users, Layers, BrainCircuit, HelpCircle, Trophy, MessageCircle
} from 'lucide-react'
import { Sidebar, BottomNav, MobileSidebarToggle } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useAuth } from '@/hooks/useAuth'
import { GraduationCap as Logo } from 'lucide-react'
import { SplashScreen } from '@/components/SplashScreen'
import { Avatar } from '@/components/ui/Avatar'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { TermsEnforcementModal } from '@/components/teacher/TermsEnforcementModal'
import { PageErrorBoundary } from '@/components/ui/PageErrorBoundary'
import { TeacherAIAssistant } from '@/components/teacher/TeacherAIAssistant'
import { NewTeachingSubjectsManager } from '@/components/teacher/subjects/NewTeachingSubjectsManager'
import { SessionHeartbeat } from '@/components/shared/SessionHeartbeat'
import { useMessageUnreadCount } from '@/hooks/useMessageUnreadCount'
import { PushNotificationSetup } from '@/components/PushNotificationSetup'

import { useNotificationStore } from '@/stores/notificationStore'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { hasSkippedTeacherOnboarding } from '@/lib/onboarding'
import toast from 'react-hot-toast'

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
  { label: 'Exam Desk', href: '/teacher/exam-desk', icon: <FileText size={18} /> },
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
  const { profile, teacher, isLoading, isInitialRevalidationComplete, setProfile, setTeacher } = useAuthStore()
  const { collapsed } = useSidebarStore()
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
  const onboardingGateCheckRef = useRef(false)
  const reminderShownForPathRef = useRef('')
  const teacherHasOnboarded = teacher?.onboarded === true || profile?.has_onboarded === true
  if (teacherHasOnboarded) wasEverConfirmedOnboarded.current = true

  // A teacher who clicked "Skip setup" still has has_onboarded === false, but we
  // must NOT force them back into onboarding. Instead we show repeated reminder
  // toasts + a "Complete Onboarding" nav item until they finish.
  const skippedOnboarding = hasSkippedTeacherOnboarding(profile)

  const [pendingTerm, setPendingTerm] = useState<any>(null)
  // Only check terms once per session — after fresh DB data has loaded.
  // We do NOT lock the ref until the check actually completes so that transient
  // failures (e.g. network, stale persisted teacher.id) can be retried.
  const termsCheckedRef = useRef(false)

  useEffect(() => {
    // Wait for the full revalidation cycle to complete so we use the freshly
    // fetched teacher row (with the correct DB id) rather than the stale
    // localStorage snapshot that Zustand rehydrates on first render.
    if (isInitialRevalidationComplete && profile?.id && !termsCheckedRef.current) {
      termsCheckedRef.current = true
      resolveTeacherIdentity().then(async (teacherIds) => {
        if (teacherIds.length === 0) {
          console.log('[Teacher Layout] No teacher identity available, will retry')
          termsCheckedRef.current = false // allow retry once a teacher links up
          return
        }
        await checkTerms(teacherIds)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialRevalidationComplete, profile?.id, teacher?.id])

  // Resolve the teacher identity for the terms check. Fall back to claiming an
  // admin-invited teacher row by email (user_id is NULL until claimed) so that
  // teachers who never completed the link step still see their terms modal.
  const resolveTeacherIdentity = async (): Promise<string[]> => {
    if (teacher?.id) {
      return (teacher as any)?.linked_teacher_ids ?? [teacher.id]
    }
    if (!profile?.id || !profile?.email) return []

    const supabase = getSupabaseBrowserClient()
    const { data: inviteRow } = await supabase
      .from('teachers')
      .select('id, user_id, email')
      .eq('email', profile.email)
      .is('user_id', null)
      .maybeSingle()

    if (!inviteRow) return []

    const { data: updatedRow, error: updateErr } = await supabase
      .from('teachers')
      .update({ user_id: profile.id })
      .eq('id', inviteRow.id)
      .select()
      .single()

    if (updateErr || !updatedRow) return []

    console.log('[Teacher Layout] Claimed invited teacher record by email:', updatedRow.id)
    setTeacher({ ...updatedRow, linked_teacher_ids: [updatedRow.id] } as any)
    return [updatedRow.id]
  }

  const checkTerms = async (teacherIds: string[]) => {
    const supabase = getSupabaseBrowserClient()
    try {
      console.log('[Teacher Layout] Checking terms for teacher IDs:', teacherIds)

      const { data, error } = await supabase
        .from('document_assignments')
        .select('*, document:documents(title, content, version)')
        .in('teacher_id', teacherIds)
        .eq('status', 'pending')
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('[Teacher Layout] Terms check failed:', error)
        termsCheckedRef.current = false // allow retry on error
        return
      }

      console.log('[Teacher Layout] Terms check result:', data ? 'Found pending term' : 'No pending terms')
      if (data) setPendingTerm(data)
    } catch (err) {
      console.error('[Teacher Layout] Terms check error:', err)
      // Reset the ref so that a future re-render can retry the check
      termsCheckedRef.current = false
    }
  }

  const rescueAlreadyOnboardedTeacher = async () => {
    if (!profile?.id) return false
    const supabase = getSupabaseBrowserClient()
    const { data: teacherRows } = await supabase
      .from('teachers')
      .select('*, teacher_assignments(id, is_class_teacher)')
      .eq('user_id', profile.id)

    if (!teacherRows || teacherRows.length === 0) return false

    const teacherIds = teacherRows.map((row: any) => row.id)
    const hasMapping = teacherRows.some((row: any) => (row.teacher_assignments || []).length > 0)
    let hasActivity = false

    if (!hasMapping && teacherIds.length > 0) {
      const [assignmentRes, timetableRes, resourceRes, quizRes, schemeRes] = await Promise.all([
        supabase.from('assignments').select('id').in('teacher_id', teacherIds).limit(1),
        supabase.from('timetables').select('id').in('teacher_id', teacherIds).limit(1),
        supabase.from('resources').select('id').in('teacher_id', teacherIds).limit(1),
        supabase.from('quizzes').select('id').in('teacher_id', teacherIds).limit(1),
        supabase.from('schemes_of_work').select('id').in('teacher_id', teacherIds).limit(1),
      ])
      hasActivity = Boolean(
        assignmentRes.data?.length ||
        timetableRes.data?.length ||
        resourceRes.data?.length ||
        quizRes.data?.length ||
        schemeRes.data?.length
      )
    }

    const isAlreadyOnboarded = teacherRows.some((row: any) => row.onboarded === true) || hasMapping || hasActivity
    if (!isAlreadyOnboarded) return false

    const bestTeacher = [...teacherRows].sort((a: any, b: any) => {
      const aScore = (a.onboarded ? 100 : 0) + ((a.teacher_assignments || []).length * 10)
      const bScore = (b.onboarded ? 100 : 0) + ((b.teacher_assignments || []).length * 10)
      return bScore - aScore
    })[0]
    const isClassTeacher = teacherRows.some((row: any) => (row.teacher_assignments || []).some((item: any) => item.is_class_teacher))

    wasEverConfirmedOnboarded.current = true
    setProfile({ ...profile, has_onboarded: true })
    setTeacher({
      ...bestTeacher,
      onboarded: true,
      is_class_teacher: isClassTeacher,
      linked_teacher_ids: teacherIds,
    } as any)
    supabase.from('profiles').update({ has_onboarded: true }).eq('id', profile.id).then(() => {})
    supabase.from('teachers').update({ onboarded: true }).in('id', teacherIds).then(() => {})
    return true
  }

  useEffect(() => {
    if (!isLoading && !profile) router.push('/auth/login?role=teacher')
    if (!isLoading && profile?.role && profile.role !== 'teacher') {
      router.push(`/${profile.role}`)
    }
    // CRITICAL: Use wasEverConfirmedOnboarded.current — NOT teacherHasOnboarded — as the gate.
    // This ref is sticky: once set to true in any render, it stays true for the session.
    // ALSO: double-check profile.has_onboarded !== true as a belt-and-suspenders guard
    // so a teacher who has already onboarded is NEVER redirected even if the ref resets
    // (e.g. first render where teacher row hasn't loaded yet).
    if (
      isInitialRevalidationComplete &&
      profile &&
      profile.role === 'teacher' &&
      profile.has_onboarded !== true &&
      !wasEverConfirmedOnboarded.current &&
      pathname !== '/teacher/onboarding'
    ) {
      // The teacher deliberately skipped onboarding — let them in and rely on
      // the reminder toasts + nav item instead of hard-redirecting.
      if (skippedOnboarding) return
      if (onboardingGateCheckRef.current) return
      onboardingGateCheckRef.current = true
      rescueAlreadyOnboardedTeacher().then((rescued) => {
        if (!rescued) router.push('/teacher/onboarding')
      }).finally(() => {
        onboardingGateCheckRef.current = false
      })
    }
  }, [profile, teacher, isLoading, router, pathname, isInitialRevalidationComplete, skippedOnboarding])

  // Repeated "complete onboarding" reminder for teachers who skipped setup.
  // Fires once per navigation so it nags until they finish without spamming.
  useEffect(() => {
    if (!profile || profile.role !== 'teacher') return
    if (profile.has_onboarded === true || wasEverConfirmedOnboarded.current) return
    if (pathname === '/teacher/onboarding') return
    if (!skippedOnboarding) return
    if (reminderShownForPathRef.current === pathname) return
    reminderShownForPathRef.current = pathname
    toast((t) => (
      <span className="flex items-center gap-3">
        <span className="text-sm font-medium">
          You skipped onboarding — please complete it to unlock your full portal.
        </span>
        <button
          onClick={() => { toast.dismiss(t.id); router.push('/teacher/onboarding') }}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-white"
        >
          Complete onboarding
        </button>
      </span>
    ), { id: 'teacher-onboarding-reminder', icon: '⚠️', duration: 8000 })
  }, [pathname, profile, skippedOnboarding, router])


  // Only block the UI if we are truly loading the first time (no persisted profile)
  if (isLoading && !profile) {
    return <SplashScreen done={false} role="teacher" />
  }

  // ── Full-screen bypass for the marking grader page ──────────────────────────
  // The marking/[id] page needs to occupy the full viewport (no sidebar/header).
  // We detect the route here and render children directly, while still running
  // all auth & onboarding guards above.
  const isMarkingPage = /^\/teacher\/marking\/.+/.test(pathname)

  if (isMarkingPage) {
    return (
      <div style={{ background: 'var(--bg)' }} className="min-h-screen">
        <PageErrorBoundary>
          {children}
        </PageErrorBoundary>
        <SessionHeartbeat />
      </div>
    )
  }

  return (
    <>
      {pendingTerm && <TermsEnforcementModal assignment={pendingTerm} onSuccess={() => setPendingTerm(null)} />}
      <div className={`min-h-screen transition-all ${pendingTerm ? 'blur-md pointer-events-none' : ''}`} style={{ background: 'var(--bg)' }}>
        <SplashScreen storageKey="splash-teacher" role="teacher" />
      <Sidebar
        items={wasEverConfirmedOnboarded.current ? NAV_ITEMS.filter(item => item.label !== 'Attendance' || teacher?.is_class_teacher).map(item => item.href === '/teacher/messages' ? { ...item, badge: messageUnreadCount } : item) : [
          ...(skippedOnboarding ? [{ label: 'Complete Onboarding', href: '/teacher/onboarding', icon: <GraduationCap size={18} className="text-amber-400" /> }] : []),
          ...NAV_ITEMS.filter(i => i.label === 'Settings')
        ]}
        bottomItems={[
          { label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: () => signOut() },
        ]}
        logo={LogoComponent}
        role="teacher"
      />

      <main className="min-h-screen transition-all duration-300 pb-20 md:pb-0" style={{ marginLeft: 0 }}>
        {/* Modern Header for Teachers */}
        <header
          className={`sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-[var(--card-border)] ${collapsed ? 'md:ml-[80px]' : 'md:ml-[280px]'}`}
          style={{ background: 'rgba(var(--card-rgb), 0.8)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0 mr-2 md:hidden">
            <MobileSidebarToggle />
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
        <div className={collapsed ? 'md:ml-[80px]' : 'md:ml-[280px]'}>
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
          : [
              ...(skippedOnboarding ? [{ label: 'Onboarding', href: '/teacher/onboarding', icon: <GraduationCap size={18} /> }] : []),
              ...NAV_ITEMS.filter(i => i.label === 'Settings')
            ]
        } 
        moreItems={wasEverConfirmedOnboarded.current 
          ? [
              ...NAV_ITEMS.filter(item => item.label !== 'Attendance' || teacher?.is_class_teacher).map(item => item.href === '/teacher/messages' ? { ...item, badge: messageUnreadCount } : item).slice(4),
              { label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: signOut }
            ]
          : [{ label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: signOut }]
        } 
      />
      <PushNotificationSetup />
      <TeacherAIAssistant />
      <SessionHeartbeat />
      <NewTeachingSubjectsManager />
      </div>
    </>
  )
}
