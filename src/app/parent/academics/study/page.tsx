'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BookOpen, Clock, Target, 
  TrendingUp, Award, ChevronRight,
  Search, Users, Calendar
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { WeeklyReport } from '@/components/student/study/WeeklyReport'
import { SkeletonDashboard } from '@/components/ui/Skeleton'

export default function ParentStudyTracker() {
  const supabase = getSupabaseBrowserClient()
  const { profile, parent } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [stats, setStats] = useState({
    totalMinutes: 0,
    consistency: 0,
    streak: 0
  })

  useEffect(() => {
    if (profile?.id && parent?.id) loadStudents()
  }, [profile?.id, parent?.id])

  const loadStudents = async () => {
    if (!parent?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('students')
      .select('*, class:classes(name)')
      .eq('parent_id', parent.id)
    
    setStudents(data ?? [])
    if (data && data.length > 0) {
      setSelectedStudent(data[0])
      loadStudentStats(data[0].id)
    }
    setLoading(false)
  }

  const loadStudentStats = async (studentId: string) => {
    const { data: sess } = await supabase
      .from('study_sessions')
      .select('duration_minutes, status, date')
      .eq('student_id', studentId)
      .eq('status', 'completed')

    const totalMin = sess?.reduce((acc, s) => acc + s.duration_minutes, 0) || 0
    const uniqueDays = new Set(sess?.map(s => s.date)).size
    
    setStats({
      totalMinutes: totalMin,
      consistency: uniqueDays,
      streak: 0 // Logic for streak would go here
    })
  }

  const handleStudentChange = (student: any) => {
    setSelectedStudent(student)
    loadStudentStats(student.id)
  }

  if (loading) return <SkeletonDashboard />

  if (students.length === 0) {
    return (
      <div className="p-12 text-center space-y-4">
        <Users size={48} className="mx-auto text-muted opacity-20" />
        <h2 className="text-xl font-black">No Students Found</h2>
        <p className="text-sm text-muted">Link your child's account to track their study progress.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Study Tracker</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Monitor independent study habits and focus performance</p>
         </div>
         
         {/* Child Selector */}
         <div className="flex bg-[var(--input)] p-1 rounded-2xl border border-[var(--card-border)] overflow-x-auto max-w-full">
            {students.map(s => (
               <button 
                 key={s.id} 
                 onClick={() => handleStudentChange(s)}
                 className={`px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all whitespace-nowrap ${selectedStudent?.id === s.id ? 'bg-primary text-white shadow-lg' : 'text-muted hover:bg-white/5'}`}
               >
                  {s.full_name.split(' ')[0]}
               </button>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <StatCard 
            title="Total Focus Time" 
            value={`${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`} 
            icon={<Clock size={20} className="text-primary" />} 
          />
         <StatCard 
            title="Active Days" 
            value={stats.consistency} 
            icon={<Calendar size={20} className="text-emerald-500" />} 
          />
         <StatCard 
            title="Current Level" 
            value="Explorer" 
            icon={<Award size={20} className="text-amber-500" />} 
          />
      </div>

      <div className="space-y-6">
         <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest opacity-40">Growth Insights</h3>
            <Badge variant="success">Season 2026</Badge>
         </div>
         
         {/* Weekly Report Integrated */}
         <div className="relative">
            <WeeklyReport 
               studentId={selectedStudent?.id} 
               weekStartDate={(() => {
                 const d = new Date()
                 d.setDate(d.getDate() - d.getDay())
                 return d.toISOString().split('T')[0]
               })()} 
            />
         </div>
      </div>

      {/* Recent Sessions List for Parent */}
      <div className="space-y-4">
         <h3 className="text-xs font-black uppercase tracking-widest opacity-40">Recent Activity</h3>
         <div className="grid grid-cols-1 gap-3">
            <Card className="p-4 border-none shadow-md bg-indigo-500/5 border-dashed border-2 border-indigo-500/20 text-center py-10">
               <TrendingUp className="mx-auto text-indigo-500 opacity-20 mb-4" size={32} />
               <p className="text-xs font-medium text-muted italic">"Consistency in self-study is the predictable path to mastery."</p>
            </Card>
         </div>
      </div>
    </div>
  )
}
