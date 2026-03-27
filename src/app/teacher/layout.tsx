'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, ClipboardList, Calendar, 
  Library, GraduationCap, Award, Settings, LogOut,
  PlusCircle, FileText, Bell, Users, Layers, BrainCircuit, HelpCircle
} from 'lucide-react'
import { Sidebar, BottomNav } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { GraduationCap as Logo } from 'lucide-react'
import { SplashScreen } from '@/components/SplashScreen'
import { Avatar } from '@/components/ui/Avatar'
import Link from 'next/link'

import { useNotificationStore } from '@/stores/notificationStore'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/teacher', icon: <LayoutDashboard size={18} /> },
  { label: 'Attendance', href: '/teacher/attendance', icon: <ClipboardList size={18} /> },
  { label: 'Assignments', href: '/teacher/assignments', icon: <FileText size={18} /> },
  { label: 'Worksheets', href: '/teacher/worksheets/new', icon: <Layers size={18} /> },
  { label: 'Practice Bank', href: '/teacher/practice-questions', icon: <HelpCircle size={18} /> },
  { label: 'Quizzes', href: '/teacher/quizzes', icon: <Award size={18} /> },
  { label: 'Marking', href: '/teacher/marking', icon: <PlusCircle size={18} /> },
  { label: 'Exam Marks', href: '/teacher/exam-marks', icon: <Award size={18} /> },
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
  const { profile, teacher, isLoading, setProfile } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  useRealtimeNotifications()
  const { signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !profile) router.push('/auth/login?role=teacher')
    if (!isLoading && profile?.role && profile.role !== 'teacher') {
      router.push(`/${profile.role}`)
    }
    // If the teacher DB record says onboarded=true, trust that over the stale Zustand cache
    // and patch the profile in-store so future checks are consistent.
    if (!isLoading && profile && teacher && teacher.onboarded && !profile.has_onboarded) {
      console.log('[TeacherLayout] Teacher.onboarded=true but profile.has_onboarded=false — patching store')
      setProfile({ ...profile, has_onboarded: true })
      return
    }
    // Only redirect to onboarding if BOTH profile and teacher agree the teacher hasn't onboarded
    const teacherHasOnboarded = teacher?.onboarded === true || profile?.has_onboarded === true
    if (!isLoading && profile && profile.role === 'teacher' && !teacherHasOnboarded && pathname !== '/teacher/onboarding') {
       console.log('[TeacherLayout] Redirecting to onboarding...')
       router.push('/teacher/onboarding')
    }
  }, [profile, teacher, isLoading, router, pathname, setProfile])


  // Only block the UI if we are truly loading the first time (no persisted profile)
  if (isLoading && !profile) {
    return <SplashScreen done={false} role="teacher" />
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <SplashScreen storageKey="splash-teacher" role="teacher" />
      <Sidebar
        items={NAV_ITEMS.filter(item => item.label !== 'Attendance' || teacher?.is_class_teacher)}
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
            {children}
          </motion.div>
        </div>
      </main>

      <BottomNav 
        items={NAV_ITEMS.filter(item => item.label !== 'Attendance' || teacher?.is_class_teacher).slice(0, 4)} 
        moreItems={[
          ...NAV_ITEMS.filter(item => item.label !== 'Attendance' || teacher?.is_class_teacher).slice(4),
          { label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: signOut }
        ]} 
      />
    </div>
  )
}
