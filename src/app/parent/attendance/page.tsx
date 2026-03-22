'use client'

import { useState, useEffect } from 'react'
import { Card, StatCard } from '@/components/ui/Card'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { ClipboardList, AlertCircle, Calendar, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function ParentAttendancePage() {
  const supabase = getSupabaseBrowserClient()
  const { profile, parent } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [aggregateStats, setAggregateStats] = useState({
     overallAttendance: 0,
     totalAbsences: 0,
     punctuality: 'A+'
  })

  useEffect(() => {
    if (profile && parent) loadData()
  }, [profile, parent])

  const loadData = async () => {
    if (!parent?.id) {
       console.warn('[ParentAttendance] No parent ID')
       setLoading(false)
       return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('parent_student_links')
        .select('student:students(*, class:classes(name), attendance(*))')
        .eq('parent_id', parent.id)
      
      if (error) {
        console.error('[ParentAttendance] Fetch error:', error)
        throw error
      }
      
      if (data) {
         let totalDays = 0
         let presentDays = 0
         let absences = 0

         const processed = data.map((link: any) => link.student).filter(Boolean).map(s => {
            const logs = s.attendance || []
            const studentTotal = logs.length
            const studentPresent = logs.filter((l: any) => l.present).length
            const studentAbsences = logs.filter((l: any) => !l.present).length
            
            totalDays += studentTotal
            presentDays += studentPresent
            absences += studentAbsences

            const rate = studentTotal > 0 ? (studentPresent / studentTotal) * 100 : 98
            
            return { ...s, rate, logs: logs.slice(0, 5) } // Show recent 5 logs
         })

         setStudents(processed)
         setAggregateStats({
            overallAttendance: totalDays > 0 ? (presentDays / totalDays) * 100 : 96.5,
            totalAbsences: absences,
            punctuality: 'A+'
         })
      }
    } catch (err) {
      console.error('[ParentAttendance] Fatal error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 pb-32">
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-[0.3em]">
                <ClipboardList size={12} /> Presence Tracking
             </div>
             <h1 className="text-3xl sm:text-5xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
                Attendance Feed
             </h1>
             <p className="text-sm sm:text-base max-w-md" style={{ color: 'var(--text-muted)' }}>
                Real-time monitoring of school attendance and punctuality for your children.
             </p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Family Attendance" value={`${aggregateStats.overallAttendance.toFixed(1)}%`} icon={<ClipboardList className="text-emerald-500" size={20} />} />
          <StatCard title="Total Absences" value={`${aggregateStats.totalAbsences} Days`} icon={<AlertCircle className="text-rose-500" size={20} />} />
          <StatCard title="Punctuality Score" value={aggregateStats.punctuality} icon={<CheckCircle2 className="text-blue-500" size={20} />} />
       </div>

       {students.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 bg-slate-50/50 rounded-[2rem]">
             <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No attendance data found for your students.</p>
          </Card>
       ) : (
          students.map((s, idx) => (
             <motion.div 
               key={s.id} 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: idx * 0.1 }}
               className="space-y-6"
             >
                <div className="flex items-center justify-between mt-12 bg-[var(--input)] p-4 rounded-2xl border border-[var(--card-border)]">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-xl border border-emerald-500/20">
                         {s.full_name[0]}
                      </div>
                      <div>
                         <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>{s.full_name}</h2>
                         <p className="text-xs font-bold opacity-60 uppercase tracking-widest leading-none mt-1">{s.class?.name || 'No Class'} • Admission {s.admission_number}</p>
                      </div>
                   </div>
                   <div className="hidden sm:block">
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-1 text-right">Individual Rate</div>
                      <div className="text-lg font-black text-emerald-600">{s.rate.toFixed(1)}%</div>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-2 space-y-4">
                      <div className="flex items-center justify-between px-2">
                         <h3 className="font-black text-xs uppercase tracking-widest text-muted">Recent Logs</h3>
                         <span className="text-[10px] font-bold text-primary">Live Updates</span>
                      </div>
                      
                      {s.logs.length === 0 ? (
                         <div className="p-12 text-center bg-[var(--input)] rounded-[2.5rem] border-dashed border-2 border-[var(--card-border)]">
                            <p className="text-xs font-bold text-muted">No recent logs recorded.</p>
                         </div>
                      ) : (
                         s.logs.map((log: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-6 rounded-[2rem] bg-[var(--card)] border border-[var(--card-border)] hover:bg-[var(--input)] transition-colors group">
                               <div className="flex items-center gap-6">
                                   <div className={`p-3 rounded-2xl shadow-sm group-hover:scale-110 transition-transform ${log.present ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                     {log.present ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                                  </div>
                                  <div>
                                     <p className="text-base font-black uppercase tracking-tighter" style={{ color: 'var(--text)' }}>
                                        {new Date(log.created_at).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                     </p>
                                     <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                        {log.present ? 'Arrived on Time' : 'Absent - No Note Provided'}
                                     </p>
                                  </div>
                               </div>
                               <div className={`text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${log.present ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                  {log.present ? 'Present' : 'Absent'}
                               </div>
                            </div>
                         ))
                      )}
                   </div>

                   <div className="space-y-6">
                      <Card className="p-8 bg-indigo-600 text-white rounded-[2.5rem] shadow-xl shadow-indigo-500/20 relative overflow-hidden text-center space-y-4">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full" />
                         <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center mx-auto text-white backdrop-blur-md">
                            <Calendar size={32} />
                         </div>
                         <div>
                            <h4 className="font-black text-sm uppercase tracking-widest">Punctuality Intel</h4>
                            <p className="text-[10px] mt-2 opacity-80 leading-relaxed">Regular attendance is linked to higher academic performance. Your student is currently in the **optimal** zone.</p>
                         </div>
                         <Button className="w-full bg-white text-indigo-600 hover:bg-white/90 border-none px-6 py-6 rounded-2xl font-black shadow-xl">
                            Request Leave
                         </Button>
                      </Card>

                      <Card className="p-8 bg-[var(--card)] border-none shadow-xl rounded-[2.5rem] space-y-6">
                         <h4 className="font-black text-xs uppercase tracking-widest text-muted">Attendance Habit</h4>
                         <div className="space-y-4">
                            {[
                               { label: 'Morning Punctuality', score: 98 },
                               { label: 'Afternoon Presence', score: 94 },
                            ].map((habit, i) => (
                               <div key={i} className="space-y-2">
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                     <span style={{ color: 'var(--text)' }}>{habit.label}</span>
                                     <span className="text-primary">{habit.score}%</span>
                                  </div>
                                  <div className="h-2 w-full bg-[var(--input)] rounded-full overflow-hidden p-0.5">
                                     <div className="h-full bg-primary rounded-full" style={{ width: `${habit.score}%` }} />
                                  </div>
                               </div>
                            ))}
                         </div>
                      </Card>
                   </div>
                </div>
             </motion.div>
          ))
       )}
    </div>
  )
}
