'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, UserCheck, GraduationCap, BookOpen,
  Calendar, CalendarDays, ClipboardList, BarChart3, Bell,
  Settings, LogOut, CreditCard, FileText, BookMarked,
  TrendingUp, Library, Layers, Award, School
} from 'lucide-react'
import { Sidebar, BottomNav } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'
import { GraduationCap as Logo } from 'lucide-react'
import { SplashScreen } from '@/components/SplashScreen'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={18} /> },
  { label: 'Students', href: '/admin/students', icon: <GraduationCap size={18} /> },
  { label: 'Teachers', href: '/admin/teachers', icon: <UserCheck size={18} /> },
  { label: 'Parents', href: '/admin/parents', icon: <Users size={18} /> },
  { label: 'Curriculums', href: '/admin/curriculums', icon: <BookOpen size={18} /> },
  { label: 'Classes', href: '/admin/classes', icon: <School size={18} /> },
  { label: 'Subjects', href: '/admin/subjects', icon: <BookMarked size={18} /> },
  { label: 'Timetables', href: '/admin/timetables', icon: <Calendar size={18} /> },
  { label: 'Tuition Events', href: '/admin/tuition-events', icon: <CalendarDays size={18} /> },
  { label: 'Exam Events', href: '/admin/exam-events', icon: <ClipboardList size={18} /> },
  { label: 'Attendance', href: '/admin/attendance', icon: <ClipboardList size={18} /> },
  { label: 'Payments', href: '/admin/payments', icon: <CreditCard size={18} /> },
  { label: 'Transcripts', href: '/admin/transcripts', icon: <FileText size={18} /> },
  { label: 'Performance', href: '/admin/performance', icon: <TrendingUp size={18} /> },
  { label: 'Schemes of Work', href: '/admin/schemes', icon: <Library size={18} /> },
  { label: 'Notifications', href: '/admin/notifications', icon: <Bell size={18} /> },
  { label: 'Settings', href: '/admin/settings', icon: <Settings size={18} /> },
]

const MOBILE_BOTTOM = NAV_ITEMS.slice(0, 4)
const MOBILE_MORE = [
  ...NAV_ITEMS.slice(4),
  { label: 'Sign Out', href: '#', icon: <LogOut size={18} /> },
]

const LogoComponent = (
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
      <Logo size={18} className="text-white" />
    </div>
    <div>
      <div className="text-xs font-black" style={{ color: 'var(--text)' }}>Peak Performance</div>
      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Admin Portal</div>
    </div>
  </div>
)

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuthStore()
  const { signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log(`[AdminLayout] Auth State: isLoading=${isLoading}, role=${profile?.role}`)
    if (!isLoading && !profile) {
      console.log('[AdminLayout] No session, redirecting to login...')
      router.push('/auth/login?role=admin')
    }
    if (!isLoading && profile?.role && profile.role !== 'admin') {
      console.log(`[AdminLayout] Wrong role (${profile.role}), redirecting...`)
      router.push(`/${profile.role}`)
    }
  }, [profile, isLoading, router])


  // Only block the UI if we are truly loading the first time (no persisted profile)
  if (isLoading && !profile) {
    return <SplashScreen done={false} role="admin" />
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <SplashScreen storageKey="splash-admin" role="admin" />
      {/* Desktop Sidebar */}
      <Sidebar
        items={NAV_ITEMS}
        bottomItems={[
          { label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: () => signOut() },
        ]}
        logo={LogoComponent}
        role="admin"
      />

      {/* Main content */}
      <main
        className="min-h-screen transition-all duration-300 pb-20 md:pb-0"
        style={{ marginLeft: 0 }}
      >
        {/* Top bar (mobile) */}
        <div
          className="sticky top-0 z-30 flex md:hidden items-center justify-between px-4 py-3"
          style={{
            background: 'rgba(11,15,26,0.9)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--card-border)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
              <Logo size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Admin</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:ml-[260px]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav 
        items={MOBILE_BOTTOM} 
        moreItems={MOBILE_MORE.map(item => 
          item.label === 'Sign Out' ? { ...item, onClick: signOut } : item
        )} 
      />
    </div>
  )
}
