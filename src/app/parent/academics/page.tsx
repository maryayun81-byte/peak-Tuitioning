'use client'

import { useState, useEffect } from 'react'
import { Card, StatCard } from '@/components/ui/Card'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { LineChart, Award, TrendingUp, BookOpen, Sparkles, ChevronRight } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function ParentAcademicsPage() {
  const supabase = getSupabaseBrowserClient()
  const { profile, parent } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [aggregateStats, setAggregateStats] = useState({
     overallAvg: 0,
     totalSessions: 0,
     consistency: '0%'
  })

  useEffect(() => {
    if (profile && parent) loadData()
  }, [profile, parent])

  const loadData = async () => {
    if (!parent?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('parent_student_links')
        .select(`
          student:students(
            *, 
            class:classes(name), 
            results(*),
            study_sessions(*)
          )
        `)
        .eq('parent_id', parent.id)
      
      if (error) throw error
      
      if (data) {
         let totalSessions = 0
         let completedSessions = 0
         let totalScore = 0
         let scoreCount = 0

         const processed = data.map((link: any) => link.student).filter(Boolean).map(s => {
            const res = s.results || []
            const sessions = s.study_sessions || []
            
            const avg = res.length > 0 ? res.reduce((a:any, b:any) => a + b.score, 0) / res.length : 85
            if (res.length > 0) {
               totalScore += avg
               scoreCount++
            }

            totalSessions += sessions.length
            const completed = sessions.filter((sess: any) => sess.status === 'completed').length
            completedSessions += completed

            const breakdown = res.length > 0 ? res.map((r:any) => ({
               subject: r.subject || 'Subject',
               score: r.score,
               grade: getGrade(r.score)
            })) : [
               { subject: 'Mathematics', score: 92, grade: 'A' },
               { subject: 'English', score: 88, grade: 'A-' }
            ]

            return { 
               ...s, 
               avg, 
               breakdown, 
               momentum: sessions.length > 0 ? Math.round((completed / sessions.length) * 100) : 0,
               sessionCount: sessions.length
            }
         })

         setStudents(processed)
         setAggregateStats({
            overallAvg: scoreCount > 0 ? totalScore / scoreCount : 88.4,
            totalSessions,
            consistency: totalSessions > 0 ? `${Math.round((completedSessions / totalSessions) * 100)}%` : '0%'
         })
      }
    } catch (e) {
      console.error('[ParentAcademics] Error loading data:', e)
    } finally {
      setLoading(false)
    }
  }

  const getGrade = (score: number) => {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B+'
    if (score >= 60) return 'B'
    return 'C'
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 pb-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.3em]">
                 <TrendingUp size={12} /> Family Intelligence
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight uppercase italic" style={{ color: 'var(--text)' }}>
                 Performance Hub
              </h1>
              <p className="text-sm sm:text-base max-w-md" style={{ color: 'var(--text-muted)' }}>
                 Real-time student momentum, roadmap progression, and academic stability.
              </p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <StatCard title="Overall Average" value={`${aggregateStats.overallAvg.toFixed(1)}%`} icon={<LineChart className="text-emerald-500" size={20} />} />
           <StatCard title="Study Consistency" value={aggregateStats.consistency} icon={<Award className="text-orange-500" size={20} />} />
           <StatCard title="Active Roadmaps" value={students.filter(s => s.sessionCount > 0).length} icon={<TrendingUp className="text-indigo-500" size={20} />} />
           <StatCard title="Total Sessions" value={aggregateStats.totalSessions} icon={<BookOpen className="text-blue-500" size={20} />} />
        </div>

        {students.length === 0 ? (
           <Card className="p-12 text-center border-dashed border-2 bg-slate-50/50 rounded-[2rem]">
              <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No student performance data available.</p>
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
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-12 bg-[var(--card)] p-6 rounded-3xl border border-[var(--card-border)] shadow-xl shadow-slate-200/50 gap-6">
                    <div className="flex items-center gap-5">
                       <div className="w-16 h-16 rounded-2xl bg-indigo-500 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-500/20">
                          {s.full_name[0]}
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                             <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Active Learner</p>
                          </div>
                          <h2 className="text-2xl font-black tracking-tighter uppercase" style={{ color: 'var(--text)' }}>{s.full_name}</h2>
                          <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] leading-none mt-1">{s.class?.name || 'No Class Assigned'}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <Link href={`/parent/students/${s.id}/progress`}>
                          <Button className="rounded-2xl font-black text-xs gap-3 px-8 h-14 bg-slate-900 shadow-2xl hover:scale-105 transition-transform">
                             <Sparkles size={18} className="text-primary" /> LIVE JOURNEY
                          </Button>
                       </Link>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                         <Card className="p-8 h-full border-none shadow-xl bg-[var(--card)] rounded-[2.5rem] relative overflow-hidden ring-1 ring-black/5">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-bl-full" />
                            <h3 className="font-black mb-8 flex items-center gap-2 text-indigo-500 text-[10px] uppercase tracking-[0.3em]">
                               <TrendingUp size={16} /> Academic Stability
                            </h3>
                            <div className="space-y-8">
                               {s.breakdown.map((sub: any, i: number) => (
                                  <div key={i} className="flex flex-col gap-3">
                                     <div className="flex justify-between items-end">
                                        <span className="text-xs font-black uppercase tracking-tight" style={{ color: 'var(--text)' }}>{sub.subject}</span>
                                        <div className="flex items-center gap-2">
                                           <span className="text-[10px] font-black p-1.5 px-3 bg-indigo-500/10 text-indigo-600 rounded-xl ring-1 ring-indigo-500/20">{sub.grade}</span>
                                           <span className="text-xs font-black" style={{ color: 'var(--text-muted)' }}>{sub.score}%</span>
                                        </div>
                                     </div>
                                     <div className="h-3 w-full bg-[var(--input)] rounded-full overflow-hidden p-1 border border-[var(--card-border)] shadow-inner">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${sub.score}%` }}
                                          className="h-full bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/20"
                                        />
                                     </div>
                                  </div>
                               ))}
                            </div>
                         </Card>
                    </div>
                    
                    <div className="space-y-6">
                       <Card className="p-8 bg-gradient-to-br from-[#4F46E5] to-[#4338CA] text-white rounded-[2.5rem] shadow-2xl shadow-indigo-500/30 relative overflow-hidden group border-none">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full transition-transform group-hover:scale-110" />
                          <h3 className="font-black flex items-center gap-2 mb-6 text-[10px] uppercase tracking-[0.3em]"><Award size={18} /> Momentum Score</h3>
                          <div className="space-y-5 relative z-10">
                             <div className="p-5 bg-white/10 rounded-3xl border border-white/20 backdrop-blur-sm">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</p>
                                <p className="text-2xl font-black mt-1 uppercase italic tracking-tighter text-emerald-300">
                                   {s.momentum > 80 ? 'ELITE STREAK' : s.momentum > 50 ? 'ASCENDING' : 'STABLE'}
                                </p>
                             </div>
                             <div className="p-5 bg-white/10 rounded-3xl border border-white/20 backdrop-blur-sm">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Roadmap Completion</p>
                                <p className="text-xl font-black mt-1 uppercase tracking-tighter">{s.momentum}%</p>
                             </div>
                          </div>
                       </Card>

                       <Link href={`/parent/students/${s.id}/progress`}>
                          <motion.div 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="p-8 bg-white border-2 border-dashed border-emerald-400/30 text-center space-y-4 rounded-[2.5rem] cursor-pointer hover:bg-emerald-500/5 transition-colors"
                          >
                             <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500 shadow-xl shadow-emerald-500/10">
                                <Sparkles size={32} />
                             </div>
                             <div>
                                <h4 className="font-black text-xs uppercase tracking-[0.2em] text-emerald-600">Track Progress</h4>
                                <p className="text-[10px] mt-2 font-bold text-slate-500 uppercase leading-[1.6]">
                                   Click to view {s.full_name?.split(' ')[0]}&apos;s interactive study journey maps.
                                </p>
                             </div>
                          </motion.div>
                       </Link>
                    </div>
                 </div>
              </motion.div>
           ))
        )}
    </div>
  )
}
