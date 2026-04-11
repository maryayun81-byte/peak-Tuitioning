'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  Users, Clock, ClipboardCheck, BookOpen, 
  Calendar, ArrowRight, MessageSquare, 
  PlusCircle, FileText, LayoutDashboard,
  CheckCircle2, AlertCircle, Award
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

import { usePageData } from '@/hooks/usePageData'
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton'

export default function TeacherDashboard() {
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()

  // Stats Data Stream
  const { data: stats, status: statsStatus } = usePageData({
    cacheKey: ['teacher-stats', teacher?.id || 'anon'],
    fetcher: async () => {
       if (!teacher?.id) return { data: null, error: 'No teacher ID' }
       const { data: assignments } = await supabase.from('teacher_assignments').select('class_id, class:classes(name), tuition_center:tuition_centers(name)').eq('teacher_id', teacher.id)
       const classIds = Array.from(new Set(assignments?.map(a => a.class_id).filter(Boolean) || []))
       
       const [subRes, classCountRes, stdCountRes] = await Promise.all([
          supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
          supabase.from('timetables').select('id', { count: 'exact', head: true }).eq('teacher_id', teacher.id).ilike('day', new Date().toLocaleDateString('en-US', { weekday: 'long' })),
          classIds.length > 0 ? supabase.from('students').select('id', { count: 'exact', head: true }).in('class_id', classIds) : Promise.resolve({ count: 0 })
       ])

       const { data: studentCounts } = classIds.length > 0 ? await supabase.from('students').select('class_id').in('class_id', classIds) : { data: [] }
       const countMap = (studentCounts || []).reduce((acc: any, s) => { acc[s.class_id] = (acc[s.class_id] || 0) + 1; return acc }, {})
       const breakdown = (assignments || []).map(a => ({ name: (a.class as any)?.name || 'Unknown', center: (a.tuition_center as any)?.name || 'N/A', count: countMap[a.class_id] || 0 }))

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
            value={statsDisplay.activeStudents} 
            icon={<Users size={20} />} 
            subValue={
              <div className="space-y-1 mt-1">
                 {statsDisplay.breakdown.map((b, idx) => (
                   <div key={idx} className="flex items-center justify-between text-[9px] border-b border-white/5 pb-0.5 last:border-0 last:pb-0">
                      <span className="truncate opacity-75 font-medium">{b.name} ({b.center})</span>
                      <span className="font-black text-primary">{b.count}</span>
                   </div>
                 ))}
              </div>
            }
         />
         <StatCard title="Classes Today" value={statsDisplay.classesToday} icon={<Clock size={20} />} />
         <StatCard title="Pending Review" value={statsDisplay.pendingMarks} icon={<AlertCircle size={20} />} change="Urgent" changeType="down" />
         {teacher?.is_class_teacher && (
            <StatCard title="Attendance" value={`${statsDisplay.attendanceRate}%`} icon={<LayoutDashboard size={20} />} />
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
                     {recentAssignments.length > 0 ? recentAssignments.map((a: any) => (
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
                     <Link href="/teacher/students" passHref className="block w-full">
                        <Button variant="ghost" size="sm" className="w-full h-16 flex flex-col gap-1 border border-[var(--card-border)] bg-amber-400/5 hover:bg-amber-400/10 transition-colors">
                           <Award size={16} className="text-amber-500" /> <span className="text-[10px] font-bold">Award Badges</span>
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
               <p className="text-xs opacity-90 leading-relaxed mb-4">You have {statsDisplay.pendingMarks} assignments pending feedback. Students perform better with timely feedback!</p>
               <Link href="/teacher/marking"><Button size="sm" className="w-full bg-white text-primary border-none hover:bg-white/90">Go to Marking</Button></Link>
            </Card>

            <Card className="p-5">
               <h3 className="font-bold mb-4 text-sm" style={{ color: 'var(--text)' }}>Notifications</h3>
               <div className="space-y-4">
                  {recentNotifications.length === 0 ? (
                    <div className="py-4 text-center text-xs opacity-40">No new notifications.</div>
                  ) : (
                    recentNotifications.map((n: any, i: number) => (
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
