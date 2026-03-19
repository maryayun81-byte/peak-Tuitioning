'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, ClipboardList, Calendar, 
  Library, GraduationCap, Award, Settings, LogOut,
  PlusCircle, FileText, Bell, Users, Layers
} from 'lucide-react'
import { Sidebar, BottomNav } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { GraduationCap as Logo } from 'lucide-react'
import { SplashScreen } from '@/components/SplashScreen'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/teacher', icon: <LayoutDashboard size={18} /> },
  { label: 'Attendance', href: '/teacher/attendance', icon: <ClipboardList size={18} /> },
  { label: 'Assignments', href: '/teacher/assignments', icon: <FileText size={18} /> },
  { label: 'Worksheets', href: '/teacher/worksheets/new', icon: <Layers size={18} /> },
  { label: 'Quizzes', href: '/teacher/quizzes', icon: <Award size={18} /> },
  { label: 'Marking', href: '/teacher/marking', icon: <PlusCircle size={18} /> },
  { label: 'Exam Marks', href: '/teacher/exam-marks', icon: <Award size={18} /> },
  { label: 'Schedule', href: '/teacher/schedule', icon: <Calendar size={18} /> },
  { label: 'Students', href: '/teacher/students', icon: <Users size={18} /> },
  { label: 'Resources', href: '/teacher/resources', icon: <Library size={18} /> },
  { label: 'Schemes', href: '/teacher/schemes', icon: <BookOpen size={18} /> },
  { label: 'Settings', href: '/teacher/settings', icon: <Settings size={18} /> },
]

const MOBILE_BOTTOM = NAV_ITEMS.slice(0, 4)
const MOBILE_MORE = [
  ...NAV_ITEMS.slice(4),
  { label: 'Sign Out', href: '#', icon: <LogOut size={18} /> },
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
        items={NAV_ITEMS}
        bottomItems={[
          { label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: () => signOut() },
        ]}
        logo={LogoComponent}
        role="teacher"
      />

      <main className="min-h-screen transition-all duration-300 pb-20 md:pb-0" style={{ marginLeft: 0 }}>
        {/* Mobile Header */}
        <div
          className="sticky top-0 z-30 flex md:hidden items-center justify-between px-4 py-3"
          style={{
            background: 'rgba(11,15,26,0.9)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--card-border)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0EA5E9, #22D3EE)' }}>
              <Logo size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Teacher</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:ml-[260px]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        </div>
      </main>

      <BottomNav 
        items={MOBILE_BOTTOM} 
        moreItems={MOBILE_MORE.map(item => 
          item.label === 'Sign Out' ? { ...item, onClick: signOut } : item
        )} 
      />
    </div>
  )
}
