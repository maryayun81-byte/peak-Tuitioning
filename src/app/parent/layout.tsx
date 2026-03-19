'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, CreditCard, 
  LineChart, ClipboardList, Bell, 
  Settings, LogOut, ChevronDown, 
  GraduationCap as Logo, ShieldCheck
} from 'lucide-react'
import { Sidebar, BottomNav } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { SplashScreen } from '@/components/SplashScreen'

const NAV_ITEMS = [
  { label: 'Overview', href: '/parent', icon: <LayoutDashboard size={18} /> },
  { label: 'My Students', href: '/parent/students', icon: <Users size={18} /> },
  { label: 'Billing', href: '/parent/billing', icon: <CreditCard size={18} /> },
  { label: 'Academics', href: '/parent/academics', icon: <LineChart size={18} /> },
  { label: 'Attendance', href: '/parent/attendance', icon: <ClipboardList size={18} /> },
  { label: 'Settings', href: '/parent/settings', icon: <Settings size={18} /> },
]

const MOBILE_BOTTOM = NAV_ITEMS.slice(0, 4)
const MOBILE_MORE = [
  ...NAV_ITEMS.slice(4),
  { label: 'Sign Out', href: '#', icon: <LogOut size={18} /> },
]

const LogoComponent = (
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-600 shadow-lg shadow-emerald-500/20">
      <Logo size={18} className="text-white" />
    </div>
    <div>
      <div className="text-xs font-black" style={{ color: 'var(--text)' }}>Peak Performance</div>
      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Parent Portal</div>
    </div>
  </div>
)

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseBrowserClient()
  const { profile, isLoading } = useAuthStore()
  const { signOut } = useAuth()
  const router = useRouter()
  
  const [linkedStudents, setLinkedStudents] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState<any>(null)

  useEffect(() => {
    if (!isLoading && !profile) router.push('/auth/login?role=parent')
    if (!isLoading && profile?.role !== 'parent') router.push(`/${profile?.role}`)
  }, [profile, isLoading, router])

  useEffect(() => {
    if (profile?.id) loadLinkedStudents()
  }, [profile])

  const loadLinkedStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('*, class:classes(name)')
      .eq('parent_id', profile?.id)
    
    setLinkedStudents(data ?? [])
    if (data && data.length > 0) setSelectedChild(data[0])
  }


  // Only block the UI if we are truly loading the first time (no persisted profile)
  if (isLoading && !profile) {
    return <SplashScreen done={false} role="parent" />
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SplashScreen storageKey="splash-parent" role="parent" />
      <Sidebar
        items={NAV_ITEMS}
        bottomItems={[
          { label: 'Sign Out', href: '#', icon: <LogOut size={18} />, onClick: () => signOut() },
        ]}
        logo={LogoComponent}
        role="parent"
      />

      <main className="min-h-screen transition-all duration-300 pb-20 md:pb-0">
        <header
          className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-[var(--card-border)] md:ml-[260px]"
          style={{ background: 'rgba(var(--card-rgb), 0.8)', backdropFilter: 'blur(12px)' }}
        >
           {/* Child Switcher */}
           <div className="relative group">
              <button className="flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] hover:bg-emerald-50 transition-all">
                 <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-black text-emerald-600">
                    {selectedChild?.full_name?.split(' ').map((n: string) => n[0]).join('') || '...'}
                 </div>
                 <div className="text-left">
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider leading-none">Viewing Student</div>
                    <div className="text-xs font-black truncate max-w-[120px]" style={{ color: 'var(--text)' }}>
                       {selectedChild?.full_name || 'Link a Student'}
                    </div>
                 </div>
                 <ChevronDown size={14} className="text-muted" />
              </button>
              
              {linkedStudents.length > 1 && (
                 <div className="absolute top-full left-0 mt-2 w-56 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all p-2 z-50">
                    {linkedStudents.map(child => (
                       <button
                         key={child.id}
                         onClick={() => setSelectedChild(child)}
                         className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--input)] transition-all ${selectedChild?.id === child.id ? 'bg-emerald-50' : ''}`}
                       >
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">
                             {child.full_name?.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <span className="text-xs font-bold text-[var(--text)]">{child.full_name}</span>
                       </button>
                    ))}
                 </div>
              )}
           </div>
           
           <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                 <ShieldCheck size={14} />
                 <span className="text-[10px] font-black uppercase tracking-wider">Verified Parent</span>
              </div>
              <button className="relative p-2 rounded-xl hover:bg-[var(--input)] transition-colors">
                 <Bell size={20} className="text-[var(--text-muted)]" />
                 <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--bg)]" />
              </button>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center font-black text-[10px] text-emerald-600">
                 {profile?.full_name[0]}
              </div>
           </div>
        </header>

        <div className="md:ml-[260px]">
          {children}
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
