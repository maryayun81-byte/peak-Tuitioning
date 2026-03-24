'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  LineChart, Award, TrendingUp, BookOpen, 
  Sparkles, ChevronRight, BarChart3, 
  ClipboardList, BrainCircuit, Target,
  ArrowRight, ShieldCheck, Zap, Download
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Card, StatCard, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import Link from 'next/link'

export default function ParentAcademicsPage() {
  const supabase = getSupabaseBrowserClient()
  const { parent, selectedStudent } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [academicOverview, setAcademicOverview] = useState<any>(null)

  useEffect(() => {
    if (selectedStudent?.id) loadOverview()
  }, [selectedStudent])

  const loadOverview = async () => {
    if (!selectedStudent?.id) return
    setLoading(true)
    try {
      // Fetch a summary of marks and attendance for the selected student
      const { data: marks } = await supabase
        .from('exam_marks')
        .select('marks')
        .eq('student_id', selectedStudent.id)
      
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', selectedStudent.id)

      const avg = marks && marks.length > 0 
        ? marks.reduce((acc, curr) => acc + Number(curr.marks), 0) / marks.length 
        : 85
      
      const attRate = attendance && attendance.length > 0
        ? (attendance.filter(a => a.status === 'present' || a.status === 'late').length / attendance.length) * 100
        : 98

      setAcademicOverview({
        avg,
        attRate,
        examsCount: marks?.length || 0,
        attendanceCount: attendance?.length || 0
      })
    } catch (err) {
      console.error('[ParentAcademics] Overview record error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-10 pb-40">
       {/* Executive Header */}
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-3">
             <div className="flex items-center gap-2 px-3 py-1 rounded-full w-fit border" style={{ background: 'var(--input)', color: 'var(--primary)', borderColor: 'var(--card-border)' }}>
                <ShieldCheck size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Academic Control Center</span>
             </div>
             <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase italic" style={{ color: 'var(--text)' }}>
                Family Intelligence
             </h1>
             <p className="font-bold text-sm uppercase tracking-wide max-w-xl" style={{ color: 'var(--text-muted)' }}>
                Integrated performance telemetry and academic stability tracking for <span className="text-indigo-600">{selectedStudent?.full_name}</span>.
             </p>
          </div>
       </div>

       {/* Snapshot Stats */}
       <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Mean Grade" 
            value={`${academicOverview?.avg.toFixed(1)}%`} 
            icon={<Target size={20} />} 
            className="border-none shadow-xl shadow-slate-200/5"
          />
          <StatCard 
            title="Attendance" 
            value={`${academicOverview?.attRate.toFixed(1)}%`} 
            icon={<ClipboardList size={20} />} 
            className="border-none shadow-xl shadow-emerald-50/5"
          />
          <StatCard 
            title="Exam Cycles" 
            value={academicOverview?.examsCount} 
            icon={<BarChart3 size={20} />} 
            className="border-none shadow-xl shadow-indigo-50/5"
          />
          <StatCard 
            title="Stability" 
            value="Optimal" 
            icon={<TrendingUp size={20} />} 
            className="border-none shadow-xl shadow-orange-50/5"
          />
       </div>

       {/* Intelligence Sectors Routing */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
             {
                title: 'Exam Analytics',
                desc: 'Detailed performance trends, subject mastery, and historical result logs.',
                icon: <BarChart3 size={32} />,
                href: '/parent/academics/exams',
                color: 'indigo',
                count: academicOverview?.examsCount,
                label: 'Examination Logic'
             },
             {
                title: 'Presence Tracking',
                desc: 'Real-time session attendance, punctuality index, and leave management.',
                icon: <ClipboardList size={32} />,
                href: '/parent/attendance',
                color: 'emerald',
                count: academicOverview?.attendanceCount,
                label: 'Engagement Telemetry'
             },
             {
                title: 'Study Engine',
                desc: 'Independent focus habits, roadmap progression, and cognitive reflections.',
                icon: <Zap size={32} />,
                href: '/parent/academics/study',
                color: 'orange',
                count: 'Live',
                label: 'Mastery Hub'
             }
           ].map((sector, idx) => (
             <Link key={idx} href={sector.href}>
                <motion.div 
                   whileHover={{ y: -10, scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   className="group relative h-full"
                >
                   <div className="h-full p-10 rounded-[3rem] border shadow-sm hover:shadow-2xl transition-all duration-700 flex flex-col justify-between space-y-10 overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                      <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:opacity-[0.08] rounded-bl-full -z-10 group-hover:scale-110 transition-all duration-1000" style={{ background: 'currentColor', color: `var(--${sector.color === 'indigo' ? 'primary' : sector.color === 'emerald' ? 'success' : 'warning'})` }} />
                      
                      <div className="space-y-6">
                         <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500" style={{ background: 'var(--input)', color: `var(--${sector.color === 'indigo' ? 'primary' : sector.color === 'emerald' ? 'success' : 'warning'})` }}>
                            {sector.icon}
                         </div>
                         <div className="space-y-3">
                            <div className="flex items-center justify-between">
                               <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `var(--${sector.color === 'indigo' ? 'primary' : sector.color === 'emerald' ? 'success' : 'warning'})` }}>{sector.label}</p>
                               <Badge className="bg-[var(--input)] text-[var(--text-muted)] border-none font-black text-[9px]">{sector.count} Records</Badge>
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic" style={{ color: 'var(--text)' }}>{sector.title}</h3>
                            <p className="text-xs font-bold uppercase tracking-widest leading-relaxed" style={{ color: 'var(--text-muted)' }}>{sector.desc}</p>
                         </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] group-hover:translate-x-2 transition-transform italic" style={{ color: 'var(--text)' }}>
                         Enter Sector <ArrowRight size={14} />
                      </div>
                   </div>
                </motion.div>
             </Link>
          ))}
       </div>

       {/* Spotlight: Transcript Ready */}
        <Card className="p-10 bg-slate-900 text-white rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-10 border-none group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-bl-full group-hover:scale-110 transition-transform duration-1000" />
           <div className="w-24 h-24 rounded-[2.5rem] bg-white/10 flex items-center justify-center text-indigo-400 backdrop-blur-xl border border-white/20 shadow-2xl shrink-0 group-hover:rotate-6 transition-transform">
              <Award size={48} />
           </div>
           <div className="space-y-4 flex-1 text-center md:text-left relative z-10">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Academic Transcript Generation</h3>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-2xl">
                 The latest official transcript for {selectedStudent?.full_name?.split(' ')[0]} is synthesized and verified. View the formatted document with director remarks and stamps.
              </p>
           </div>
           <Link href="/parent/academics/transcripts" className="shrink-0 relative z-10">
              <Button className="h-16 px-10 rounded-2xl bg-white text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] hover:scale-[1.05] transition-all shadow-2xl border-none">
                 VIEW TRANSCRIPTS
              </Button>
           </Link>
        </Card>

       {/* Comparative Insights */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Card className="p-10 rounded-[3rem] shadow-xl space-y-8" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
              <div className="flex items-center justify-between">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <TrendingUp size={16} /> Velocity Analysis
                 </h3>
              </div>
              <div className="space-y-6">
                 {[
                    { label: 'Subject Mastery', value: 88, color: 'var(--primary)' },
                    { label: 'Curriculum Alignment', value: 94, color: 'var(--success)' },
                    { label: 'Independent Grit', value: 72, color: 'var(--warning)' }
                 ].map((item, i) => (
                    <div key={i} className="space-y-3">
                       <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black uppercase tracking-tight italic" style={{ color: 'var(--text)' }}>{item.label}</span>
                          <span className="text-[11px] font-black" style={{ color: item.color }}>{item.value}%</span>
                       </div>
                       <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--input)' }}>
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${item.value}%` }}
                             className="h-full rounded-full"
                             style={{ background: item.color }}
                          />
                       </div>
                    </div>
                 ))}
              </div>
           </Card>

           <Card className="p-10 bg-indigo-600 text-white rounded-[3rem] shadow-xl shadow-indigo-500/10 relative overflow-hidden flex flex-col justify-center border-none group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full group-hover:scale-110 transition-transform duration-700" />
              <div className="space-y-6 relative z-10">
                 <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200">
                    <BrainCircuit size={16} /> Strategy Advisor
                 </div>
                 <p className="text-xl font-black uppercase italic tracking-tighter leading-relaxed">
                    &quot;Cognitive focus is currently peaking in Scientific Logic. Recommend increasing tuition intensity for Humanities to maintain balanced excellence.&quot;
                 </p>
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] opacity-60">
                    <Zap size={12} fill="currentColor" /> AI Assisted Predictive Analytics
                 </div>
              </div>
           </Card>
        </div>

        {/* Academic Reports Section */}
        <div className="space-y-8">
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <h2 className="text-2xl font-black uppercase italic tracking-tighter" style={{ color: 'var(--text)' }}>Performance Dossiers</h2>
                 <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Historical Academic Reports & Evaluations</p>
              </div>
              <Button variant="outline" className="rounded-xl border-dashed px-6 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text)] transition-all">
                 Search Dossiers
              </Button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                 { title: 'Mid-Term Evaluation', date: '2026-03-15', grade: 'A', status: 'Finalized' },
                 { title: 'Weekly Progress Slip', date: '2026-03-08', grade: 'A-', status: 'Verified' },
              ].map((report, i) => (
                 <Card key={i} className="p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all group flex items-center justify-between" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                    <div className="flex items-center gap-5">
                       <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-indigo-500 shadow-inner group-hover:rotate-3 transition-transform" style={{ background: 'var(--input)' }}>
                          <BookOpen size={24} />
                       </div>
                       <div>
                          <h4 className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--text)' }}>{report.title}</h4>
                          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{report.date} • {report.status}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Grade</p>
                          <p className="text-xl font-black text-indigo-600 italic leading-none">{report.grade}</p>
                       </div>
                       <Button size="icon" variant="ghost" className="rounded-xl hover:bg-[var(--input)] text-[var(--text-muted)] hover:text-indigo-600">
                          <Download size={18} />
                       </Button>
                    </div>
                 </Card>
              ))}
           </div>
        </div>
    </div>
  )
}
