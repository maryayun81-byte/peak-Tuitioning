'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  Users, Clock, ClipboardCheck, BookOpen, 
  Calendar, ArrowRight, MessageSquare, 
  PlusCircle, FileText, LayoutDashboard,
  CheckCircle2, AlertCircle
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, StatCard, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import { ExamEventBanner } from '@/components/dashboard/ExamEventBanner'
import { TuitionEventBanner } from '@/components/dashboard/TuitionEventBanner'
import { TimetableWidget } from '@/components/dashboard/TimetableWidget'
import Link from 'next/link'

export default function TeacherDashboard() {
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()

  // ── React Query: fetches once, caches for 5 minutes ──────────────────
  const fetchDashboard = useMemo(() => async () => {
    if (!teacher?.id || !profile?.id) return null
    const todayStr = new Date().toISOString().split('T')[0]

    const [mRes, evRes] = await Promise.all([
      supabase.from('teacher_assignments')
        .select('class_id, tuition_center_id, class:classes(name), tuition_center:tuition_centers(name)')
        .eq('teacher_id', teacher.id),
      supabase.from('tuition_events')
        .select('id, start_date, end_date')
        .gte('end_date', todayStr)
        .order('start_date', { ascending: true })
        .limit(5),
    ])

    const rawAssignments: any[] = mRes.data || []
    const classIds = Array.from(new Set(rawAssignments.map((m: any) => m.class_id).filter(Boolean)))
    const uniqueAssignments = rawAssignments.filter((a: any, idx: number, self: any[]) =>
      idx === self.findIndex((t: any) => t.class_id === a.class_id && t.tuition_center_id === a.tuition_center_id)
    )
    const events = evRes.data || []
    const currentEvent = events.find((e: any) => todayStr >= e.start_date && todayStr <= e.end_date) || events[0]

    const [subRes, nRes, tRes, sRes, aRes, attRes, breakdownRes] = await Promise.all([
      supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
      supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('timetables').select('id', { count: 'exact', head: true }).eq('teacher_id', teacher.id).ilike('day', todayStr),
      classIds.length > 0
        ? supabase.from('students').select('id', { count: 'exact', head: true }).in('class_id', classIds)
        : Promise.resolve({ count: 0, data: null, error: null }),
      supabase.from('assignments').select('*, class:classes(name)').eq('teacher_id', teacher.id).order('created_at', { ascending: false }).limit(3),
      currentEvent?.id
        ? supabase.from('attendance').select('status').eq('teacher_id', teacher.id).eq('tuition_event_id', currentEvent.id).limit(500)
        : Promise.resolve({ data: [] }),
      Promise.all(uniqueAssignments.map(async (a: any) => {
        const { count } = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('class_id', a.class_id)
        const cName = Array.isArray(a.class) ? a.class[0]?.name : a.class?.name
        const ctName = Array.isArray(a.tuition_center) ? a.tuition_center[0]?.name : a.tuition_center?.name
        return { name: cName || 'Unknown', center: ctName || 'N/A', count: count || 0 }
      }))
    ])

    const attendance = (attRes as any).data || []
    const total = attendance.length
    const present = attendance.filter((a: any) => a.status === 'present' || a.status === 'late').length

    return {
      stats: {
        activeStudents: (sRes as any).count ?? 0,
        classesToday: (tRes as any).count ?? 0,
        pendingMarks: (subRes as any).count ?? 0,
        attendanceRate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
        breakdown: breakdownRes as any[],
      },
      pendingAssignments: (aRes as any).data ?? [],
      notifications: (nRes as any).data ?? [],
    }
  }, [teacher?.id, profile?.id])

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-dashboard', teacher?.id],
    queryFn: fetchDashboard,
    enabled: !!teacher?.id && !!profile?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const stats = data?.stats ?? { activeStudents: 0, classesToday: 0, pendingMarks: 0, attendanceRate: 0, breakdown: [] }
  const pendingAssignments = data?.pendingAssignments ?? []
  const notifications = data?.notifications ?? []

  // Show skeleton only on true first load (no cached data)
  if (isLoading && !data) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
              Welcome, {profile?.full_name.split(' ')[0]} <motion.span initial={{ rotate: 0 }} animate={{ rotate: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 2 }}>👋</motion.span>
           </h1>
           <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Here&apos;s what&apos;s happening with your classes today.</p>
        </div>
        <div className="flex gap-2">
           <Link href="/teacher/assignments/new"><Button size="sm"><PlusCircle size={14} className="mr-2" /> New Assignment</Button></Link>
        </div>
      </div>

      {/* Event Banners */}
      <div className="space-y-3">
        <ExamEventBanner />
        <TuitionEventBanner />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard 
            title="Active Students" 
            value={stats.activeStudents} 
            icon={<Users size={20} />} 
            subValue={
              <div className="space-y-1 mt-1">
                 {stats.breakdown.map((b, idx) => (
                   <div key={idx} className="flex items-center justify-between text-[9px] border-b border-white/5 pb-0.5 last:border-0 last:pb-0">
                      <span className="truncate opacity-75 font-medium">{b.name} ({b.center})</span>
                      <span className="font-black text-primary">{b.count}</span>
                   </div>
                 ))}
              </div>
            }
         />
         <StatCard title="Classes Today" value={stats.classesToday} icon={<Clock size={20} />} />
         <StatCard title="Pending Review" value={stats.pendingMarks} icon={<AlertCircle size={20} />} change="Urgent" changeType="down" />
         {teacher?.is_class_teacher && (
            <StatCard title="Attendance" value={`${stats.attendanceRate}%`} icon={<LayoutDashboard size={20} />} />
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-4">
            {/* My Timetable replaces Today's Schedule */}
            <TimetableWidget role="teacher" />

            {/* Recent Materials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
               <Card className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                     <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Active Assignments</h3>
                  </div>
                  <div className="space-y-3">
                     {pendingAssignments.length > 0 ? pendingAssignments.map((a: any) => (
                       <Link key={a.id} href={`/teacher/assignments/${a.id}/progress`}>
                          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--primary)] hover:text-white transition-all cursor-pointer" style={{ background: 'var(--bg)' }}>
                             <div className="text-xs font-medium truncate pr-2 uppercase tracking-tighter">{a.title}</div>
                             <Badge variant="muted" className="shrink-0">{a.class?.name}</Badge>
                          </div>
                       </Link>
                     )) : <div className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No active assignments.</div>}
                  </div>
                  <Link href="/teacher/assignments" className="mt-auto">
                    <Button variant="secondary" size="sm" className="w-full">View All</Button>
                  </Link>
               </Card>

               <Card className="p-5 flex flex-col gap-4">
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                     <Link href="/teacher/assignments/new" passHref className="block w-full">
                        <Button variant="ghost" size="sm" className="w-full h-16 flex flex-col gap-1 border border-[var(--card-border)]">
                           <FileText size={16} /> <span className="text-[10px]">Add Assignment</span>
                        </Button>
                     </Link>
                     <Link href="/teacher/attendance" passHref className="block w-full">
                        <Button variant="ghost" size="sm" className="w-full h-16 flex flex-col gap-1 border border-[var(--card-border)]">
                           <Users size={16} /> <span className="text-[10px]">Attendance</span>
                        </Button>
                     </Link>
                     <Link href="/teacher/quizzes/new" passHref className="block w-full">
                        <Button variant="ghost" size="sm" className="w-full h-16 flex flex-col gap-1 border border-[var(--card-border)]">
                           <ClipboardCheck size={16} /> <span className="text-[10px]">Create Quiz</span>
                        </Button>
                     </Link>
                     <Link href="/teacher/schemes" passHref className="block w-full">
                        <Button variant="ghost" size="sm" className="w-full h-16 flex flex-col gap-1 border border-[var(--card-border)]">
                           <LayoutDashboard size={16} /> <span className="text-[10px]">Schemes</span>
                        </Button>
                     </Link>
                  </div>
               </Card>
            </div>
         </div>

         {/* Side Column */}
         <div className="space-y-6">
            <Card className="p-5" style={{ background: 'linear-gradient(135deg, var(--primary), #3B82F6)', color: 'white' }}>
               <h3 className="font-bold mb-2 flex items-center gap-2"><CheckCircle2 size={18} /> Performance Tip</h3>
               <p className="text-xs opacity-90 leading-relaxed mb-4">You have {stats.pendingMarks} assignments pending feedback. Students perform better with timely feedback!</p>
               <Link href="/teacher/marking"><Button size="sm" className="w-full bg-white text-primary border-none hover:bg-white/90">Go to Marking</Button></Link>
            </Card>

            <Card className="p-5">
               <h3 className="font-bold mb-4 text-sm" style={{ color: 'var(--text)' }}>Notifications</h3>
               <div className="space-y-4">
                  {notifications.length === 0 ? (
                    <div className="py-4 text-center text-xs opacity-40">No new notifications.</div>
                  ) : (
                    notifications.map((n: any, i: number) => (
                      <div key={i} className="flex gap-3">
                         <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-primary shrink-0" />
                         <div className="flex-1">
                            <div className="flex justify-between items-center mb-0.5">
                               <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{n.title}</span>
                               <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatDate(n.created_at, 'short')}</span>
                            </div>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{n.body}</p>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </Card>
         </div>
      </div>
    </div>
  )
}
