'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, CreditCard, 
  LineChart, ClipboardList, Bell, 
  Settings, LogOut, ChevronDown, 
  GraduationCap as Logo, ShieldCheck, BookOpen,
  Sparkles, FileText
} from 'lucide-react'
import { Sidebar, BottomNav } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { SplashScreen } from '@/components/SplashScreen'
import { InstallPWAButton } from '@/components/InstallPWAButton'
import Link from 'next/link'

const NAV_ITEMS = [
  { label: 'Overview', href: '/parent', icon: <LayoutDashboard size={18} /> },
  { label: 'My Students', href: '/parent/students', icon: <Users size={18} /> },
  { label: 'Academics', href: '/parent/academics', icon: <LineChart size={18} /> },
  { label: 'Study Tracker', href: '/parent/academics/study', icon: <BookOpen size={18} /> },
  { label: 'Transcripts', href: '/parent/academics/transcripts', icon: <FileText size={18} /> },
  { label: 'Attendance', href: '/parent/attendance', icon: <ClipboardList size={18} /> },
  { label: 'Billing', href: '/parent/billing', icon: <CreditCard size={18} /> },
  { label: 'Notifications', href: '/parent/notifications', icon: <Bell size={18} /> },
  { label: 'Settings', href: '/parent/settings', icon: <Settings size={18} /> },
]

const MOBILE_BOTTOM = NAV_ITEMS.slice(0, 5)
const MOBILE_MORE = [
  ...NAV_ITEMS.slice(5),
  { label: 'Sign Out', href: '#', icon: <LogOut size={18} /> },
]

const LogoComponent = (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-500/10">
      <Logo size={20} className="text-white" />
    </div>
    <div>
      <div className="text-sm font-black tracking-tight" style={{ color: 'var(--text)' }}>Peak Performance</div>
      <div className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-muted)' }}>Foundational Elite</div>
    </div>
  </div>
)

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseBrowserClient()
  const { profile, parent, selectedStudent, setSelectedStudent, isLoading } = useAuthStore()
  const { signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  
  const [linkedStudents, setLinkedStudents] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (isLoading) return

    if (!profile) {
      router.push('/auth/login?role=parent')
      return
    }

    // Only redirect if they are in the wrong role-based portal
    if (profile.role && profile.role !== 'parent') {
      router.push(`/${profile.role}`)
    }
    // DO NOT push to '/parent' if they are already in a subpage like '/parent/attendance'
  }, [profile, isLoading, router])

  useEffect(() => {
    if (profile?.id) {
       loadUnreadCount()
       
       const channel = supabase
         .channel('parent-notifications')
         .on('postgres_changes', { 
           event: '*', 
           schema: 'public', 
           table: 'notifications',
           filter: `user_id=eq.${profile.id}`
         }, () => {
           loadUnreadCount()
         })
         .subscribe()
       
       return () => {
         supabase.removeChannel(channel)
       }
    }
  }, [profile])

  useEffect(() => {
    if (parent?.id) {
       loadLinkedStudents()
    }
  }, [parent])

  const loadUnreadCount = async () => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile?.id)
      .eq('read', false)
    
    setUnreadCount(count || 0)
  }

  const loadLinkedStudents = async () => {
    if (!parent?.id) return
    const { data, error } = await supabase
      .from('parent_student_links')
      .select('student:students(*, class:classes(name))')
      .eq('parent_id', parent.id)
    
    if (error) return
    
    const students = data?.map((link: any) => link.student).filter(Boolean) ?? []
    setLinkedStudents(students)
    
    // Set initial selected student if none exists
    if (students.length > 0 && !selectedStudent) {
      setSelectedStudent(students[0])
    }
  }

  if (isLoading && !profile) {
    return <SplashScreen done={false} role="parent" />
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans selection:bg-emerald-500/30">
      <SplashScreen storageKey="splash-parent" role="parent" />
      
      {/* Premium Sidebar */}
      <Sidebar
        items={NAV_ITEMS}
        bottomItems={[
          { label: 'Settings', href: '/parent/settings', icon: <Settings size={18} /> },
          { label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: () => signOut() },
        ]}
        logo={LogoComponent}
        role="parent"
      />

      <main className="min-h-screen transition-all duration-300 pb-28 md:pb-0">
        {/* Dynamic Premium Header */}
        <header
          className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-[var(--card-border)] md:ml-[260px] bg-[var(--bg)]/80 backdrop-blur-2xl"
        >
           {/* Elite Student Switcher */}
           <div className="relative group">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-4 px-4 py-2 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-xl shadow-black/5 hover:border-emerald-500/30 transition-all group/btn"
              >
                 <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 border-2 border-white flex items-center justify-center text-xs font-black text-emerald-700 shadow-inner overflow-hidden">
                    {selectedStudent?.avatar_url ? (
                      <img src={selectedStudent.avatar_url} className="w-full h-full object-cover" alt="S" />
                    ) : (
                      selectedStudent?.full_name?.split(' ').map((n: string) => n[0]).join('') || '...'
                    )}
                 </div>
                 <div className="text-left hidden sm:block">
                    <div className="flex items-center gap-1.5">
                       <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Perspective</span>
                       <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="text-sm font-black truncate max-w-[140px] uppercase tracking-tight mt-1" style={{ color: 'var(--text)' }}>
                       {selectedStudent?.full_name || 'Family Hub'}
                    </div>
                 </div>
                 <ChevronDown size={14} className="text-muted transition-transform group-hover/btn:translate-y-0.5" />
              </motion.button>
              
              <AnimatePresence>
                {linkedStudents.length > 1 && (
                   <div className="absolute top-full left-0 mt-3 w-64 bg-white/95 backdrop-blur-xl border border-[var(--card-border)] rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all p-3 z-50 ring-1 ring-black/5">
                      <div className="px-4 py-3 mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manage Your Family</p>
                      </div>
                      {linkedStudents.map(child => (
                         <button
                           key={child.id}
                           onClick={() => setSelectedStudent(child)}
                           className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] hover:bg-emerald-50/50 transition-all text-left ${selectedStudent?.id === child.id ? 'bg-emerald-50 ring-1 ring-emerald-500/20' : ''}`}
                         >
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                               {child.full_name?.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div>
                               <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{child.full_name}</div>
                               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{child.class?.name || 'Class N/A'}</div>
                            </div>
                         </button>
                      ))}
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <Link href="/parent/link" className="flex items-center gap-4 p-4 rounded-[1.5rem] hover:bg-slate-50 transition-all">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                            <Users size={18} />
                          </div>
                          <span className="text-xs font-black text-slate-600 uppercase tracking-tight">Link New Student</span>
                        </Link>
                      </div>
                   </div>
                )}
              </AnimatePresence>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 border border-emerald-500/20 shadow-inner">
                 <ShieldCheck size={14} className="animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Premium Partner</span>
              </div>
              
              <InstallPWAButton variant="minimal" />

              <Link 
                href="/parent/notifications" 
                className="relative p-3 rounded-2xl bg-[var(--input)] hover:bg-indigo-50 transition-all group"
              >
                 <Bell size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                 {unreadCount > 0 && (
                   <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-rose-500 text-white text-[9px] font-black rounded-full border-2 border-white shadow-lg ring-4 ring-rose-500/20">
                      {unreadCount > 9 ? '9+' : unreadCount}
                   </span>
                 )}
              </Link>

              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-lg shadow-indigo-500/20"
              >
                <div className="w-full h-full rounded-[0.9rem] bg-white flex items-center justify-center">
                  <span className="font-black text-sm bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                    {profile?.full_name[0]}
                  </span>
                </div>
              </motion.div>
           </div>
        </header>

        <div className="md:ml-[260px] relative">
           {/* Decorative Top Gradient */}
           <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none" />
           
           <div className="max-w-7xl mx-auto">
              {children}
           </div>
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
