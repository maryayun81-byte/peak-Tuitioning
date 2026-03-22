'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

const NAV_ITEMS = [
  { label: 'My Hub', href: '/student', icon: <LayoutDashboard size={18} /> },
  { label: 'Assignments', href: '/student/assignments', icon: <FileText size={18} /> },
  { label: 'Quizzes', href: '/student/quizzes', icon: <BrainCircuit size={18} /> },
  { label: 'Schedule', href: '/student/schedule', icon: <Calendar size={18} /> },
  { label: 'Study Timer', href: '/student/study', icon: <Clock size={18} /> },
  { label: 'My Progress', href: '/student/performance', icon: <Trophy size={18} /> },
  { label: 'Library', href: '/student/resources', icon: <Library size={18} /> },
  { label: 'Awards', href: '/student/awards', icon: <Star size={18} /> },
  { label: 'Documents', href: '/student/documents', icon: <Award size={18} /> },
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
  const { profile, student, isLoading } = useAuthStore()
  const { signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !profile) router.push('/auth/login?role=student')
    if (!isLoading && profile?.role && profile.role !== 'student') {
      router.push(`/${profile.role}`)
    }

    // Redirect to onboarding if not completed
    if (!isLoading && student && !student.onboarded && typeof window !== 'undefined' && window.location.pathname !== '/student/onboarding') {
      router.push('/student/onboarding')
    }
  }, [profile, student, isLoading, router])


  // Only block the UI if we are truly loading the first time (no persisted profile)
  if (isLoading && !profile) {
    return <SplashScreen done={false} role="student" />
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar
        items={NAV_ITEMS}
        bottomItems={[
          { label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: () => signOut() },
        ]}
        logo={LogoComponent}
        role="student"
      />

      <main className="min-h-screen transition-all duration-300 pb-20 md:pb-0">
        {/* Modern Header for Students (XP & Levels) */}
        <header
          className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-[var(--card-border)] md:ml-[260px]"
          style={{ background: 'rgba(var(--card-rgb), 0.8)', backdropFilter: 'blur(12px)' }}
        >
           {(() => {
              const level = Math.floor((student?.xp || 0) / 1000) + 1
              const titles = ['Novice Explorer', 'Brave Adventurer', 'Hero Explorer', 'Master Guardian', 'Legend of Peak']
              const title = titles[Math.min(Math.floor((level - 1) / 5), titles.length - 1)]
              return (
                <>
                  <div className="flex-1 min-w-0 mr-2">
                     <h2 className="text-xs md:text-sm font-bold opacity-60 truncate">Level {level} • {title}</h2>
                  </div>
                  
                  <div className="flex items-center gap-4 md:gap-6">
                     <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                        <Zap size={14} className="text-amber-500 fill-amber-500" />
                        <span className="text-xs font-black text-amber-500">{student?.xp?.toLocaleString() || 0} XP</span>
                     </div>
                     <div className="w-px h-6 bg-[var(--card-border)]" />
                     <button className="relative p-2 rounded-xl hover:bg-[var(--input)] transition-colors">
                        <Bell size={20} className="text-[var(--text-muted)]" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--bg)]" />
                     </button>
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


        {/* Content */}
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
