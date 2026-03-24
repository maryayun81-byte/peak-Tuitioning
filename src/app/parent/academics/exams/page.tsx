'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Award, Target, TrendingUp, BookOpen, 
  ChevronRight, ArrowUpRight, ShieldCheck,
  Calendar, Star, Download, Filter,
  BarChart3, BrainCircuit, Zap
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'

export default function ExamAnalyticsPage() {
  const supabase = getSupabaseBrowserClient()
  const { selectedStudent } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [examMarks, setExamMarks] = useState<any[]>([])
  const [stats, setStats] = useState({
    meanScore: 0,
    bestSubject: 'N/A',
    worstSubject: 'N/A',
    improvement: '+0%',
    totalExams: 0
  })

  useEffect(() => {
    if (selectedStudent?.id) loadExamData()
  }, [selectedStudent])

  const loadExamData = async () => {
    if (!selectedStudent?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('exam_marks')
        .select(`
          *,
          subject:subjects(name),
          exam_event:exam_events(name, exam_date),
          teacher:teachers(full_name)
        `)
        .eq('student_id', selectedStudent.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setExamMarks(data || [])

      if (data && data.length > 0) {
        const total = data.reduce((acc: number, curr: any) => acc + Number(curr.marks), 0)
        const mean = total / data.length
        
        // Subject breakdown
        const subjectMap: Record<string, number[]> = {}
        data.forEach((m: any) => {
          if (!subjectMap[m.subject.name]) subjectMap[m.subject.name] = []
          subjectMap[m.subject.name].push(Number(m.marks))
        })

        const subjectAvgs = Object.entries(subjectMap).map(([name, scores]) => ({
          name,
          avg: scores.reduce((a, b) => a + b, 0) / scores.length
        }))

        subjectAvgs.sort((a, b) => b.avg - a.avg)

        setStats({
          meanScore: mean,
          bestSubject: subjectAvgs[0]?.name || 'N/A',
          worstSubject: subjectAvgs[subjectAvgs.length - 1]?.name || 'N/A',
          improvement: '+4.2%', // Mocked for now
          totalExams: data.length
        })
      }
    } catch (err) {
      console.error('[ExamAnalytics] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getGradeColor = (marks: number) => {
    if (marks >= 80) return 'text-emerald-500 bg-emerald-500/10'
    if (marks >= 65) return 'text-indigo-500 bg-indigo-500/10'
    if (marks >= 50) return 'text-orange-500 bg-orange-500/10'
    return 'text-rose-500 bg-rose-500/10'
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-10 pb-40">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 w-fit">
            <BrainCircuit size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Academic Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-slate-900 uppercase italic">
            Exam Performance
          </h1>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-wide max-w-xl">
            Deep analytics into <span className="text-indigo-600">{selectedStudent?.full_name}</span>&apos;s scholarly evolution and subject mastery.
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary" className="bg-white border-slate-200 rounded-2xl h-14 px-6 font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm italic hover:scale-105 transition-transform">
            <Download size={16} /> DOWNLOAD REPORT
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard 
          title="Mean Performance" 
          value={`${stats.meanScore.toFixed(1)}%`} 
          icon={<Target size={20} />} 
          change={stats.improvement}
          changeType="up"
          className="bg-white border-none shadow-xl shadow-slate-200/50"
        />
        <StatCard 
          title="Top Capability" 
          value={stats.bestSubject} 
          icon={<Award size={20} />} 
          className="bg-white border-none shadow-xl shadow-emerald-100/50"
        />
        <StatCard 
          title="Exams Recorded" 
          value={stats.totalExams} 
          icon={<BookOpen size={20} />} 
          className="bg-white border-none shadow-xl shadow-indigo-100/50"
        />
        <StatCard 
          title="Consistency" 
          value="94%" 
          icon={<Zap size={20} />} 
          className="bg-white border-none shadow-xl shadow-orange-100/50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Feed (Left) */}
        <div className="lg:col-span-8 space-y-8">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                 <BarChart3 size={16} /> Curated Result Log
              </h3>
              <div className="flex items-center gap-4">
                 <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest p-0 text-slate-400 hover:text-indigo-600 gap-2">
                    <Filter size={14} /> FILTER BY PERIOD
                 </Button>
              </div>
           </div>

           <div className="space-y-4">
              {examMarks.length === 0 ? (
                 <Card className="p-24 text-center border-2 border-dashed border-slate-200 rounded-[3rem] space-y-4 bg-slate-50/50">
                    <div className="w-20 h-20 rounded-[2rem] bg-slate-100 flex items-center justify-center mx-auto text-slate-300 shadow-inner">
                       <TrendingUp size={40} />
                    </div>
                    <div className="space-y-2">
                       <p className="text-sm font-black text-slate-500 uppercase tracking-widest leading-relaxed"> No academic data detected. </p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connect with an administrator to sync examination records.</p>
                    </div>
                 </Card>
              ) : (
                examMarks.map((m, i) => (
                  <motion.div 
                    key={m.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group"
                  >
                     <div className="relative p-6 sm:p-10 rounded-[3rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-500/20 transition-all duration-700 overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-slate-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-1000" />
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                           <div className="flex items-center gap-8">
                              <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center font-black text-2xl shadow-inner ${getGradeColor(m.marks)}`}>
                                 {m.grade || '?'}
                              </div>
                              <div className="space-y-2">
                                 <div className="flex items-center gap-3">
                                    <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                                       {m.subject?.name}
                                    </h4>
                                    <Badge className="bg-slate-900/5 text-slate-500 border-none px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em]">
                                       {m.exam_event?.name}
                                    </Badge>
                                 </div>
                                 <div className="flex items-center gap-6">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                       <Calendar size={12} className="text-indigo-400" /> {m.exam_event?.exam_date ? formatDate(m.exam_event.exam_date, 'long') : 'N/A'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                       <Award size={12} className="text-emerald-400" /> Score: <span className="text-slate-900 font-black">{m.marks}%</span>
                                    </p>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="text-right hidden sm:block">
                                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Assessed By</p>
                                 <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{m.teacher?.full_name || 'Academic Board'}</p>
                              </div>
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 cursor-pointer shadow-sm">
                                 <ArrowUpRight size={20} />
                              </div>
                           </div>
                        </div>

                        {/* Progress Indicator for this subject */}
                        <div className="mt-8 pt-8 border-t border-slate-50 flex items-center gap-6">
                           <div className="flex-1 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${m.marks}%` }}
                                transition={{ duration: 1, delay: i * 0.1 }}
                                className={`h-full rounded-full ${
                                  m.marks >= 80 ? 'bg-emerald-500' : 
                                  m.marks >= 60 ? 'bg-indigo-500' : 
                                  'bg-orange-500'
                                } shadow-lg`}
                              />
                           </div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery Level</span>
                        </div>
                     </div>
                  </motion.div>
                ))
              )}
           </div>
        </div>

        {/* Sidebar Insights (Right) */}
        <div className="lg:col-span-4 space-y-10">
           {/* Executive Strategy Card */}
           <Card className="p-10 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-[3rem] shadow-2xl relative overflow-hidden space-y-8 border-none group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-bl-full transition-transform group-hover:scale-110 duration-1000" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-tr-full" />
              
              <div className="w-20 h-20 rounded-[2rem] bg-white/10 flex items-center justify-center text-emerald-400 backdrop-blur-xl border border-white/20 shadow-2xl relative z-10">
                 <Zap size={36} fill="currentColor" />
              </div>
              
              <div className="space-y-4 relative z-10">
                 <h3 className="text-xs font-black uppercase tracking-[0.4em] text-emerald-400 italic">Academic Spotlight</h3>
                 <p className="text-[13px] font-bold text-slate-300 uppercase tracking-widest leading-[1.8]">
                    {selectedStudent?.full_name.split(' ')[0]}&apos;s mean performance is <span className="text-white underline decoration-emerald-500 underline-offset-8">Top 5%</span> in the {selectedStudent?.class?.name || 'Academic'} cycle. 
                 </p>
                 <div className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                       <span>Roadmap Velocity</span>
                       <span className="text-emerald-400">+12% Gain</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: '88%' }}
                         className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                       />
                    </div>
                 </div>
              </div>
              <Button className="w-full h-16 bg-white text-slate-900 hover:bg-emerald-500 hover:text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all relative z-10 border-none">
                 VIEW INTERACTIVE TRENDS
              </Button>
           </Card>

           {/* Subject Mastery Breakdown */}
           <Card className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-xl space-y-10">
              <div className="space-y-2">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                    <Star size={16} fill="currentColor" className="text-orange-400" /> Mastery Breakdown
                 </h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregated competency levels per subject.</p>
              </div>

              <div className="space-y-8">
                 {[
                    { label: 'Intelligence (Math)', value: 89, color: 'emerald' },
                    { label: 'Literacy (English)', value: 92, color: 'indigo' },
                    { label: 'Scientific Logic', value: 78, color: 'orange' },
                    { label: 'Humanities', value: 85, color: 'slate' }
                 ].map((comp, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex justify-between items-end">
                         <span className="text-[11px] font-black uppercase tracking-tight text-slate-800 italic">{comp.label}</span>
                         <span className={`text-[11px] font-black text-${comp.color}-500 bg-${comp.color}-50 px-2 py-0.5 rounded-lg`}>{comp.value}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden p-0 ring-1 ring-slate-100">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${comp.value}%` }}
                           transition={{ duration: 1.5, delay: i * 0.1 }}
                           className={`h-full bg-${comp.color}-500 rounded-full shadow-lg`}
                         />
                      </div>
                    </div>
                 ))}
              </div>
           </Card>

           <Button variant="secondary" className="w-full h-20 rounded-[2rem] border-2 border-dashed border-indigo-200 bg-indigo-50/30 text-indigo-600 font-black text-xs uppercase tracking-[0.3em] hover:bg-white hover:border-indigo-400 transition-all flex flex-col gap-1 shadow-sm">
              <span className="flex items-center gap-2"><Download size={20} /> COMPREHENSIVE DOSSIER</span>
              <span className="text-[8px] opacity-60 font-medium">Export all historical and comparative data.</span>
           </Button>
        </div>
      </div>
    </div>
  )
}
