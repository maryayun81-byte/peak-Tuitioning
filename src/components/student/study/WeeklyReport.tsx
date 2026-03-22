'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, PieChart, TrendingUp, 
  CheckCircle2, MessageSquare, Star,
  Clock, Calendar, Download, Share2
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface WeeklyReportProps {
  studentId: string
  weekStartDate: string // YYYY-MM-DD
}

export const WeeklyReport = ({ studentId, weekStartDate }: WeeklyReportProps) => {
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    loadReport()
  }, [studentId, weekStartDate])

  const loadReport = async () => {
    setLoading(true)
    try {
      const endOfWeek = new Date(weekStartDate)
      endOfWeek.setDate(endOfWeek.getDate() + 7)

      const { data: sess } = await supabase
        .from('study_sessions')
        .select('*, goals:study_goals(*), reflections:study_reflections(*), subject:subjects(name)')
        .eq('student_id', studentId)
        .gte('date', weekStartDate)
        .lt('date', endOfWeek.toISOString().split('T')[0])

      // Aggregates
      const completed = sess?.filter(s => s.status === 'completed') || []
      const totalMin = completed.reduce((acc, s) => acc + s.duration_minutes, 0)
      const goalRate = sess?.length ? (completed.length / sess.length) * 100 : 0
      
      // Group by subject for distribution
      const subjectMap: Record<string, number> = {}
      sess?.forEach(s => {
        const name = s.subject?.name || 'Other'
        subjectMap[name] = (subjectMap[name] || 0) + s.duration_minutes
      })

      setData({
        sessions: sess || [],
        totalMinutes: totalMin,
        goalRate: Math.round(goalRate),
        subjectDistribution: Object.entries(subjectMap).map(([name, value]) => ({ name, value })),
        reflections: sess?.flatMap(s => s.reflections || []) || []
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) return <div className="animate-pulse space-y-4 pt-12"><div className="h-64 bg-primary/5 rounded-3xl" /></div>

  return (
    <Card className="p-8 sm:p-12 border-none shadow-2xl space-y-12 bg-[var(--card)] overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
         <BarChart3 size={240} className="text-primary" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
         <div>
            <Badge variant="primary" className="mb-2">WEEKLY PERFORMANCE REPORT</Badge>
            <h2 className="text-3xl font-black">Growth Summary</h2>
            <p className="text-sm opacity-60">Week of {new Date(weekStartDate).toLocaleDateString()}</p>
         </div>
         <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="rounded-xl"><Download size={16} className="mr-2" /> PDF</Button>
            <Button variant="secondary" size="sm" className="rounded-xl"><Share2 size={16} className="mr-2" /> Share</Button>
         </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
         <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 text-center space-y-1">
            <div className="text-4xl font-black text-primary">{Math.floor(data.totalMinutes / 60)}h {data.totalMinutes % 60}m</div>
            <div className="text-[10px] uppercase font-black opacity-40 tracking-widest">Total Focus Time</div>
         </div>
         <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 text-center space-y-1">
            <div className="text-4xl font-black text-emerald-500">{data.goalRate}%</div>
            <div className="text-[10px] uppercase font-black opacity-40 tracking-widest">Goal Completion</div>
         </div>
         <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 text-center space-y-1">
            <div className="text-4xl font-black text-amber-500">Strong</div>
            <div className="text-[10px] uppercase font-black opacity-40 tracking-widest">Focus Level</div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
         {/* Subject Distribution */}
         <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
               <PieChart size={14} /> Subject Distribution
            </h3>
            <div className="space-y-4">
               {data.subjectDistribution.map((item: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                     <div className="flex items-center justify-between text-xs font-bold">
                        <span>{item.name}</span>
                        <span className="opacity-40">{Math.round((item.value / data.totalMinutes) * 100 || 0)}%</span>
                     </div>
                     <div className="h-2 rounded-full bg-[var(--input)] overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${(item.value / data.totalMinutes) * 100}%` }} 
                          className="h-full bg-primary" 
                        />
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Growth Insights */}
         <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
               <TrendingUp size={14} /> Reflection Nuggets
            </h3>
            <div className="space-y-4">
               {data.reflections.slice(0, 3).map((ref: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] relative">
                     <MessageSquare className="absolute top-4 right-4 opacity-5" size={24} />
                     <p className="text-xs italic leading-relaxed opacity-80">“{ref.learned_summary}”</p>
                  </div>
               ))}
               {data.reflections.length === 0 && (
                  <div className="py-8 text-center text-xs opacity-30 italic">No reflections recorded this week.</div>
               )}
            </div>
         </div>
      </div>

      {/* Teacher/Coach Feedback - Placeholder */}
      <Card className="p-8 border-none shadow-xl bg-gradient-to-br from-indigo-500/10 to-transparent relative overflow-hidden flex flex-col sm:flex-row items-center gap-8">
         <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
            <Star size={32} className="fill-indigo-500" />
         </div>
         <div className="space-y-2 flex-1">
            <h4 className="text-xs font-black uppercase tracking-widest opacity-40">Mentor Insights</h4>
            <p className="text-sm font-medium italic opacity-60">"Your consistency in Science is outstanding. Keep up this momentum especially with the upcoming mocks."</p>
            <div className="pt-2 flex items-center gap-2">
               <div className="w-6 h-6 rounded-full bg-indigo-500" />
               <span className="text-[10px] font-bold">Coach Sarah • 2 days ago</span>
            </div>
         </div>
      </Card>
    </Card>
  )
}
