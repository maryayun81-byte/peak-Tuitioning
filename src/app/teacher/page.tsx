'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  Users, Clock, ClipboardCheck, BookOpen, 
  Calendar, ArrowRight, MessageSquare, 
  PlusCircle, FileText, LayoutDashboard,
  CheckCircle2, AlertCircle, Award, TrendingUp
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, StatCard, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, getEventWeeks, getLocalISODate } from '@/lib/utils'
import { ExamEventBanner } from '@/components/dashboard/ExamEventBanner'
import { TuitionEventBanner } from '@/components/dashboard/TuitionEventBanner'
import { TimetableWidget } from '@/components/dashboard/TimetableWidget'
import Link from 'next/link'
import { ClassPulse, ClassInterventionPanel } from '@/components/teacher/ClassHub'

import { usePageData } from '@/hooks/usePageData'
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton'

export default function TeacherDashboard() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()

  const [missingDates, setMissingDates] = useState<string[]>([])
  const [showReminder, setShowReminder] = useState(false)
  const [checkedGaps, setCheckedGaps] = useState(false)

  // Stats Data Stream
  const { data: stats, status: statsStatus } = usePageData({
    cacheKey: ['teacher-stats', teacher?.id || 'anon'],
    fetcher: async () => {
       if (!teacher?.id) return { data: null, error: 'No teacher ID' }
       const { data: assignments } = await supabase.from('teacher_assignments').select('class_id, is_class_teacher, class:classes(name), tuition_center:tuition_centers(name)').eq('teacher_id', teacher.id)
       const classIds = Array.from(new Set(assignments?.map(a => a.class_id).filter(Boolean) || []))
       
       const [subRes, classCountRes, stdCountRes] = await Promise.all([
          supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
          supabase.from('timetables').select('id', { count: 'exact', head: true }).eq('teacher_id', teacher.id).ilike('day', new Date().toLocaleDateString('en-US', { weekday: 'long' })),
          classIds.length > 0 ? supabase.from('students').select('id', { count: 'exact', head: true }).in('class_id', classIds) : Promise.resolve({ count: 0 })
       ])

       const { data: studentCounts } = classIds.length > 0 ? await supabase.from('students').select('class_id').in('class_id', classIds) : { data: [] }
       const countMap = (studentCounts || []).reduce((acc: any, s) => { acc[s.class_id] = (acc[s.class_id] || 0) + 1; return acc }, {})
       const breakdown = (assignments || []).map(a => ({ name: (a.class as any)?.name || 'Unknown', center: (a.tuition_center as any)?.name || 'N/A', count: countMap[a.class_id] || 0, isPrimary: a.is_class_teacher }))

       return { data: { activeStudents: (stdCountRes as any).count ?? 0, classesToday: (classCountRes as any).count ?? 0, pendingMarks: (subRes as any).count ?? 0, attendanceRate: 0, breakdown }, error: null }
    },
    enabled: !!teacher?.id,
  })

  // Assignments Data Stream
  const { data: pendingAssignments } = usePageData<any[]>({
    cacheKey: ['teacher-recent-assignments', teacher?.id || 'anon'],
    fetcher: async () => supabase.from('assignments').select('*, class:classes(name)').eq('teacher_id', teacher!.id).order('created_at', { ascending: false }).limit(3),
    enabled: !!teacher?.id,
  })

  // Attendance Gap Detection
  useEffect(() => {
    if (teacher?.id && !checkedGaps) {
      checkAttendanceGaps()
    }
  }, [teacher?.id, checkedGaps])

  const checkAttendanceGaps = async () => {
    if (!teacher?.id) return
    const hour = new Date().getHours()
    
    try {
      // 1. Get primary class
      const { data: primary } = await supabase
        .from('teacher_assignments')
        .select('class_id, tuition_center_id')
        .eq('teacher_id', teacher.id)
        .eq('is_class_teacher', true)
        .maybeSingle()
      
      if (!primary) {
        setCheckedGaps(true)
        return
      }

      // 2. Get active tuition event
      const { data: event } = await supabase
        .from('tuition_events')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()
      
      if (!event) {
        setCheckedGaps(true)
        return
      }

      // 3. Get current week's active days
      const weeks = getEventWeeks(event.start_date, event.end_date, event.active_days || [])
      const today = getLocalISODate()
      const currentWeek = weeks.find(w => {
        const wStart = getLocalISODate(w.startDate)
        const wEnd = getLocalISODate(w.endDate)
        return today >= wStart && today <= wEnd
      })
      
      if (!currentWeek) {
        setCheckedGaps(true)
        return
      }

      // 4. Filter dates that should have been marked
      // Should mark if date < today OR (date == today AND hour >= 9)
      const daysToCheck = currentWeek.activeDates.filter(d => d < today || (d === today && hour >= 9))
      
      if (daysToCheck.length === 0) {
        setCheckedGaps(true)
        return
      }

      // 5. Check which ones are already in DB (check for ANY record for this class on these dates)
      const { data: marked } = await supabase
        .from('attendance')
        .select('date')
        .eq('class_id', primary.class_id)
        .in('date', daysToCheck)
      
      // Use a Set for distinct marked dates
      const markedDates = new Set(marked?.map(m => m.date) || [])
      const missing = daysToCheck.filter(d => !markedDates.has(d))
      
      if (missing.length > 0) {
        setMissingDates(missing)
        setShowReminder(true)
      }
    } catch (e) {
      console.error('Gap check failed:', e)
    } finally {
      setCheckedGaps(true)
    }
  }

  // Notifications Data Stream
  const { data: notifications } = usePageData<any[]>({
    cacheKey: ['teacher-notifications', profile?.id || 'anon'],
    fetcher: async () => supabase.from('notifications').select('*').eq('user_id', profile!.id).order('created_at', { ascending: false }).limit(3),
    enabled: !!profile?.id,
  })

  if (!teacher || (statsStatus === 'loading' && !stats)) {
     return (
       <div className="p-6 space-y-6">
          <ShimmerSkeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <ShimmerSkeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ShimmerSkeleton className="lg:col-span-2 h-96" />
            <ShimmerSkeleton className="h-96" />
          </div>
       </div>
     )
  }

  const statsDisplay = stats ?? { activeStudents: 0, classesToday: 0, pendingMarks: 0, attendanceRate: 0, breakdown: [] }
  const recentAssignments = pendingAssignments ?? []
  const recentNotifications = notifications ?? []
  const primaryClass = stats?.breakdown.find((b: any) => b.isPrimary)


  return (
    <div className="p-6 space-y-8 pb-12 bg-gradient-to-b from-transparent to-[var(--bg)] min-h-screen">
      <Modal 
        isOpen={showReminder} 
        onClose={() => setShowReminder(false)} 
        title="Attendance Reminder 📝"
        size="md"
      >
        <div className="space-y-6 py-4">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-500/20">
              <ClipboardCheck size={28} />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-amber-700">Registers Pending!</h4>
              <p className="text-sm text-amber-700/80 leading-relaxed">
                Attendance hasn&apos;t been marked for your primary class on the following days:
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {missingDates.map(date => (
              <div 
                key={date}
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--input)] border border-[var(--card-border)]"
              >
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-primary" />
                  <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                    {formatDate(date, 'long')}
                  </span>
                </div>
                <Badge variant={date === getLocalISODate() ? 'danger' : 'muted'} className="text-[10px] uppercase">
                  {date === getLocalISODate() ? 'Today' : 'Past Due'}
                </Badge>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Button 
              className="w-full py-6 text-lg" 
              onClick={() => {
                setShowReminder(false)
                router.push('/teacher/attendance')
              }}
            >
              Mark Attendance Now
            </Button>
            <button 
              onClick={() => setShowReminder(false)}
              className="w-full py-3 text-xs font-bold opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--text)' }}
            >
              I&apos;ll do it later
            </button>
          </div>
        </div>
      </Modal>

      {/* Command Center */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(34,197,94,0.16),transparent_28%),radial-gradient(circle_at_92%_15%,rgba(56,189,248,0.12),transparent_22%)]" />
        
        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-8 p-6 sm:p-8 lg:p-10">
          <div className="space-y-4 min-w-0">
             <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/15 shadow-xl">
                   <Users size={24} className="text-white" />
                </div>
                <Badge variant="secondary" className="bg-white/10 text-white border-white/15 backdrop-blur-md uppercase tracking-widest text-[9px] font-black">
                   Academic Session 2026
                </Badge>
             </div>
             <h1 className="max-w-2xl text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.05]">
                Welcome back, {profile?.full_name ? profile.full_name.split(' ')[0] : 'Teacher'} <motion.span initial={{ rotate: 0 }} animate={{ rotate: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 2 }}>👋</motion.span>
             </h1>
             {primaryClass && (
               <div className="flex items-center gap-2 text-white/90 font-bold bg-white/10 w-fit max-w-full px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-sm">
                 <LayoutDashboard size={14} />
                 <span className="text-[11px] uppercase tracking-wider truncate">Class Teacher: {primaryClass.name}</span>
               </div>
             )}
             <p className="text-white/70 font-medium max-w-xl leading-7 text-sm sm:text-base">
                Your classes, tasks, timetable, and live teaching tools are grouped into one calm workspace.
             </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full xl:w-auto xl:min-w-[560px]">
             {[
               { icon: <PlusCircle size={20} />, label: 'Assignment', href: '/teacher/assignments/new', className: 'bg-white/10 text-white hover:bg-white/20' },
               { icon: <ClipboardCheck size={20} />, label: 'Quiz', href: '/teacher/quizzes/new', className: 'bg-white/10 text-white hover:bg-white/20' },
               { icon: <MessageSquare size={20} />, label: 'Notice', href: '/teacher/notifications', className: 'bg-white/10 text-white hover:bg-white/20' },
               { icon: <TrendingUp size={20} />, label: 'Insights', href: '/teacher/students', className: 'bg-amber-300 text-black hover:bg-white' }
             ].map((btn, i) => (
               <Link key={i} href={btn.href}>
                 <button className={`min-h-24 w-full rounded-2xl border border-white/15 backdrop-blur-md transition-all flex flex-col items-center justify-center gap-2 px-3 py-4 shadow-lg ${btn.className}`}>
                    <div>{btn.icon}</div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">{btn.label}</span>
                 </button>
               </Link>
             ))}
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Pulse & Intervention (5 cols) */}
        <div className="lg:col-span-5 space-y-8">
           <ClassPulse teacherId={teacher.id} />
           <ClassInterventionPanel teacherId={teacher.id} />
        </div>

        {/* Right Column: Timetable & Tasks (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
           <TimetableWidget role="teacher" />
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 border-2 border-primary/5 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                       <FileText size={14} className="text-primary" /> Active Assignments
                    </h3>
                    <Link href="/teacher/assignments">
                       <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase">All <ArrowRight size={12} /></Button>
                    </Link>
                 </div>
                 <div className="space-y-3">
                    {recentAssignments.length > 0 ? recentAssignments.map((a: any) => (
                      <Link key={a.id} href={`/teacher/assignments/${a.id}/progress`}>
                         <div className="p-3 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] hover:border-primary/30 transition-all">
                            <div className="flex justify-between items-center">
                               <span className="text-xs font-black truncate max-w-[150px] uppercase tracking-tighter" style={{ color: 'var(--text)' }}>{a.title}</span>
                               <Badge variant="info" className="text-[8px] uppercase">{a.class?.name}</Badge>
                            </div>
                         </div>
                      </Link>
                    )) : <div className="text-xs italic opacity-40">No active missions.</div>}
                 </div>
              </Card>

              <Card className="p-6 border-2 border-amber-500/10 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                       <AlertCircle size={14} className="text-amber-500" /> System Alerts
                    </h3>
                 </div>
                 <div className="space-y-4">
                    {recentNotifications.length === 0 ? (
                      <div className="py-4 text-center text-xs opacity-40 italic">Quiet day at Peak HQ...</div>
                    ) : (
                      recentNotifications.map((n: any, i: number) => (
                        <div key={i} className="flex gap-3 p-2 rounded-xl hover:bg-white/5 transition-all">
                           <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-amber-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                           <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black truncate" style={{ color: 'var(--text)' }}>{n.title}</p>
                              <p className="text-[9px] mt-0.5 opacity-60 line-clamp-1">{n.body}</p>
                           </div>
                        </div>
                      ))
                    )}
                 </div>
              </Card>
           </div>
        </div>
      </div>
    </div>
  )
}
