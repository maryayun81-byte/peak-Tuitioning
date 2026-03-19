'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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
import Link from 'next/link'

export default function TeacherDashboard() {
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    activeStudents: 0,
    classesToday: 0,
    pendingMarks: 0,
    attendanceRate: 0,
  })
  const [schedule, setSchedule] = useState<any[]>([])
  const [pendingAssignments, setPendingAssignments] = useState<any[]>([])

  useEffect(() => {
    if (profile && teacher) {
      loadDashboard()
    } else {
      // If we've been loading for more than 5 seconds and still don't have a profile,
      // something might be wrong with the store or auth state.
      const timer = setTimeout(() => {
        if (loading) setLoading(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [profile, teacher])

  const loadDashboard = async () => {
    if (!teacher || !profile) return
    setLoading(true)
    try {
      // Fetch stats for the specific teacher
      const [sRes, tRes, aRes, subRes] = await Promise.all([
        supabase.from('students').select('count', { count: 'exact' }),
        supabase.from('timetables').select('*, class:classes(name), subject:subjects(name)').eq('teacher_id', teacher.id),
        supabase.from('assignments').select('*, class:classes(name)').eq('teacher_id', teacher.id).limit(3),
        supabase.from('submissions').select('id', { count: 'exact' }).eq('status', 'submitted')
      ])

      setStats({
        activeStudents: sRes.count ?? 0,
        classesToday: tRes.data?.length ?? 0,
        pendingMarks: subRes.count ?? 0,
        attendanceRate: 94.2, // Still mocked as we don't have a direct query for this yet
      })
      setSchedule(tRes.data ?? [])
      setPendingAssignments(aRes.data ?? [])
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />

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
           <Button variant="secondary" size="sm" className="hidden md:flex"><Calendar size={14} className="mr-2" /> View Schedule</Button>
           <Link href="/teacher/assignments/new"><Button size="sm"><PlusCircle size={14} className="mr-2" /> New Assignment</Button></Link>
        </div>
      </div>

      {/* Event Banners */}
      <div className="space-y-3">
        <ExamEventBanner />
        <TuitionEventBanner />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard title="Active Students" value={stats.activeStudents} icon={<Users size={20} />} />
         <StatCard title="Classes Today" value={stats.classesToday} icon={<Clock size={20} />} />
         <StatCard title="Pending Review" value={stats.pendingMarks} icon={<AlertCircle size={20} />} change="5 Urgent" changeType="down" />
         <StatCard title="Attendance" value={`${stats.attendanceRate}%`} icon={<LayoutDashboard size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Upcoming Schedule */}
         <div className="lg:col-span-2 space-y-4">
            <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
               <Calendar size={18} className="text-primary" /> Today&apos;s Schedule
            </h2>
            <Card className="p-1">
               <div className="space-y-1">
                  {schedule.length > 0 ? schedule.map((item, i) => (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-[var(--input)] transition-colors"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold" style={{ background: 'var(--bg)', border: '1px solid var(--card-border)' }}>
                             <span className="text-xs" style={{ color: 'var(--primary)' }}>{item.start_time.split(':')[0]}</span>
                             <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.start_time.split(':')[1]}</span>
                          </div>
                          <div>
                             <h4 className="font-bold text-sm" style={{ color: 'var(--text)' }}>{item.subject?.name}</h4>
                             <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.class?.name} • Room {item.room_number || 'TBA'}</p>
                          </div>
                       </div>
                       <Button size="sm" variant="ghost">Mark Attendance <ArrowRight size={14} className="ml-1" /></Button>
                    </motion.div>
                  )) : (
                    <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No classes scheduled for today. Enjoy your break!</div>
                  )}
               </div>
            </Card>

            {/* Recent Materials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Card className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                     <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Active Assignments</h3>
                  </div>
                  <div className="space-y-3">
                     {pendingAssignments.length > 0 ? pendingAssignments.map(a => (
                       <div key={a.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg)' }}>
                          <div className="text-xs font-medium truncate pr-2" style={{ color: 'var(--text)' }}>{a.title}</div>
                          <Badge variant="muted">{a.class?.name}</Badge>
                       </div>
                     )) : <div className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No active assignments.</div>}
                  </div>
                  <Button variant="secondary" size="sm" className="mt-auto">View All</Button>
               </Card>

               <Card className="p-5 flex flex-col gap-4">
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                     <Button variant="ghost" size="sm" className="h-16 flex flex-col gap-1 border border-[var(--card-border)]">
                        <FileText size={16} /> <span className="text-[10px]">Add Material</span>
                     </Button>
                     <Button variant="ghost" size="sm" className="h-16 flex flex-col gap-1 border border-[var(--card-border)]">
                        <Users size={16} /> <span className="text-[10px]">Mark Absence</span>
                     </Button>
                     <Button variant="ghost" size="sm" className="h-16 flex flex-col gap-1 border border-[var(--card-border)]">
                        <MessageSquare size={16} /> <span className="text-[10px]">Notify Class</span>
                     </Button>
                     <Button variant="ghost" size="sm" className="h-16 flex flex-col gap-1 border border-[var(--card-border)]">
                        <ClipboardCheck size={16} /> <span className="text-[10px]">Schemes</span>
                     </Button>
                  </div>
               </Card>
            </div>
         </div>

         {/* Side Column */}
         <div className="space-y-6">
            <Card className="p-5" style={{ background: 'linear-gradient(135deg, var(--primary), #3B82F6)', color: 'white' }}>
               <h3 className="font-bold mb-2 flex items-center gap-2"><CheckCircle2 size={18} /> Performance Tip</h3>
               <p className="text-xs opacity-90 leading-relaxed mb-4">You have 12 assignments pending feedback. Students perform 30% better when feedback is given within 48 hours.</p>
               <Button size="sm" className="w-full bg-white text-primary border-none hover:bg-white/90">Go to Marking</Button>
            </Card>

            <Card className="p-5">
               <h3 className="font-bold mb-4 text-sm" style={{ color: 'var(--text)' }}>Today&apos;s Notifications</h3>
               <div className="space-y-4">
                  {[
                    { title: 'New Submission', time: '10m ago', desc: 'Alice Johnson submitted Math Homework.' },
                    { title: 'System Maintenance', time: '1h ago', desc: 'Portal will be offline tonight at 12 AM.' },
                  ].map((n, i) => (
                    <div key={i} className="flex gap-3">
                       <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-primary" />
                       <div className="flex-1">
                          <div className="flex justify-between items-center mb-0.5">
                             <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{n.title}</span>
                             <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{n.time}</span>
                          </div>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{n.desc}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </Card>
         </div>
      </div>
    </div>
  )
}
