'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, PieChart, TrendingUp, 
  CheckCircle2, MessageSquare, Star,
  Clock, Calendar, Download, Share2, Sparkles, Target, Zap
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface WeeklyReportProps {
  studentId: string
  planId: string
}

export const WeeklyReport = ({ studentId, planId }: WeeklyReportProps) => {
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (studentId && planId) {
       loadReport()
    } else {
       setLoading(false)
    }
  }, [studentId, planId])

  const loadReport = async () => {
    setLoading(true)
    try {
      // Fetch plan details to get the name
      const { data: plan } = await supabase.from('study_plans').select('name, start_date').eq('id', planId).single()

      // Fetch all sessions for this specific plan
      const { data: sess } = await supabase
        .from('study_sessions')
        .select('*, goals:study_goals(*), reflections:study_reflections(*), subject:subjects(name)')
        .eq('student_id', studentId)
        .eq('plan_id', planId)

      // Aggregates
      const completed = sess?.filter(s => s.status === 'completed') || []
      const totalMin = completed.reduce((acc, s) => acc + s.duration_minutes, 0)
      const goalRate = sess?.length ? (completed.length / sess.length) * 100 : 0
      
      // Group by subject for distribution
      const subjectMap: Record<string, number> = {}
      completed.forEach(s => {
        const name = s.subject?.name || 'Self-Study'
        subjectMap[name] = (subjectMap[name] || 0) + s.duration_minutes
      })

      // Sort subjects by duration descending
      const dist = Object.entries(subjectMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      setData({
        planName: plan?.name || 'Study Mission',
        startDate: plan?.start_date,
        sessions: sess || [],
        totalMinutes: totalMin,
        goalRate: Math.round(goalRate),
        focusLevel: goalRate >= 100 ? 'Elite' : goalRate >= 75 ? 'Strong' : goalRate >= 50 ? 'Steady' : 'Developing',
        subjectDistribution: dist,
        reflections: completed.flatMap(s => s.reflections || []).filter(r => r.learned_summary)
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
     <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-[#0a0a0a] min-h-[500px]">
        <div className="w-16 h-16 rounded-full border-t-4 border-amber-500 border-r-4 border-r-amber-500/30 animate-spin" />
        <p className="text-amber-500/60 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Compiling Intelligence...</p>
     </div>
  )

  if (!data) return (
     <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-[#0a0a0a] min-h-[500px]">
        <Target size={48} className="text-slate-800" />
        <p className="text-slate-500 font-black text-xs uppercase tracking-widest text-center max-w-xs">Mission Data Unavailable.<br/>Return to base.</p>
     </div>
  )

  return (
    <div className="p-6 sm:p-12 border border-white/5 shadow-2xl space-y-12 bg-[#050505] text-white relative overflow-hidden h-full rounded-[3.5rem]">
      {/* Immersive Background Effects */}
      <div className="absolute top-0 right-0 p-8 opacity-5 mix-blend-screen pointer-events-none">
         <BarChart3 size={320} className="text-amber-500" />
      </div>
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Elite Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10 pb-8 border-b border-white/5">
         <div className="space-y-4">
            <motion.div 
               initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
               className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-[0.3em]"
            >
               <Sparkles size={12} fill="currentColor" /> Authorized Intelligence
            </motion.div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase italic bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
               Mission Report
            </h2>
            <p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">Target Operation: <span className="text-white/80">{data.planName}</span></p>
         </div>
         <div className="flex gap-3">
            <Button className="h-12 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest shadow-xl backdrop-blur-md">
               <Download size={14} className="mr-2" /> Export Dossier
            </Button>
         </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-8 rounded-[2rem] bg-gradient-to-br from-amber-500/10 to-amber-900/10 border border-amber-500/20 text-center space-y-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="text-4xl sm:text-5xl font-black text-amber-500 tracking-tighter">
               {Math.floor(data.totalMinutes / 60)}<span className="text-2xl opacity-50 ml-1 mr-2">h</span>{data.totalMinutes % 60}<span className="text-2xl opacity-50 ml-1">m</span>
            </div>
            <div className="text-[10px] sm:text-xs uppercase font-black text-amber-500/60 tracking-[0.3em]">Total Focus Time</div>
         </motion.div>
         
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-8 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 border border-emerald-500/20 text-center space-y-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tighter">{data.goalRate}<span className="text-2xl opacity-50 ml-1">%</span></div>
            <div className="text-[10px] sm:text-xs uppercase font-black text-emerald-400/60 tracking-[0.3em]">Goal Completion</div>
         </motion.div>
         
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-500/10 to-blue-900/10 border border-blue-500/20 text-center space-y-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="text-4xl sm:text-5xl font-black text-blue-400 tracking-tighter uppercase italic">{data.focusLevel}</div>
            <div className="text-[10px] sm:text-xs uppercase font-black text-blue-400/60 tracking-[0.3em]">Focus Quality</div>
         </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
         {/* Advanced Subject Distribution */}
         <Card className="p-8 bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] shadow-2xl shadow-black">
            <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-3 mb-8">
               <PieChart size={16} className="text-amber-500" /> Strategic Distribution
            </h3>
            <div className="space-y-6">
               {data.subjectDistribution.map((item: any, idx: number) => {
                  const percentage = data.totalMinutes > 0 ? (item.value / data.totalMinutes) * 100 : 0;
                  return (
                     <div key={idx} className="space-y-3">
                        <div className="flex items-center justify-between">
                           <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">{item.name}</span>
                           <span className="text-xs font-black text-amber-500 font-mono bg-amber-500/10 px-2 py-1 rounded-md">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-white/5 overflow-hidden ring-1 ring-inset ring-white/10">
                           <motion.div 
                             initial={{ width: 0 }} 
                             animate={{ width: `${percentage}%` }}
                             transition={{ duration: 1, delay: 0.5 + (idx * 0.1), ease: "easeOut" }}
                             className="h-full bg-gradient-to-r from-amber-600 to-amber-400 relative overflow-hidden" 
                           >
                              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] -translate-x-full animate-[shimmer_2s_infinite]" />
                           </motion.div>
                        </div>
                     </div>
                  )
               })}
               {data.subjectDistribution.length === 0 && (
                  <div className="py-10 text-center opacity-30">
                     <PieChart size={48} className="mx-auto mb-4" />
                     <p className="text-xs font-black uppercase tracking-[0.2em]">No Data Acquired</p>
                  </div>
               )}
            </div>
         </Card>

         {/* Golden Reflection Nuggets */}
         <Card className="p-8 bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/10 rounded-[2.5rem] shadow-2xl shadow-black flex flex-col">
            <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-amber-500/60 flex items-center gap-3 mb-8">
               <TrendingUp size={16} /> Operational Insights
            </h3>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
               {data.reflections.map((ref: any, idx: number) => (
                  <motion.div 
                     initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + (idx * 0.1) }}
                     key={idx} 
                     className="p-5 sm:p-6 rounded-2xl bg-black/40 border border-white/5 relative group hover:bg-black/60 transition-colors"
                  >
                     <MessageSquare className="absolute top-6 right-6 text-amber-500/10 group-hover:text-amber-500/20 transition-colors" size={32} />
                     <p className="text-xs sm:text-sm italic leading-relaxed text-white/80 font-medium pr-8">“{ref.learned_summary}”</p>
                     <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                        {ref.challenges_faced && (
                           <span className="text-[9px] font-bold uppercase tracking-widest text-rose-400 bg-rose-400/10 px-3 py-1.5 rounded-lg border border-rose-400/20">
                              Challenge Addressed
                           </span>
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20">
                           Intel Secured
                        </span>
                     </div>
                  </motion.div>
               ))}
               {data.reflections.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 pb-10">
                     <MessageSquare size={48} className="mb-4" />
                     <p className="text-xs font-black uppercase tracking-[0.2em] text-center">Awaiting Field Intel<br/><span className="text-[10px] font-normal tracking-wide">Complete missions with reflections.</span></p>
                  </div>
               )}
            </div>
         </Card>
      </div>

      {/* Elite Feedback Section */}
      <div className="relative z-10 pt-4">
         <Card className="p-8 sm:p-10 border border-amber-500/20 shadow-2xl bg-gradient-to-br from-amber-600/10 to-amber-900/20 rounded-[2.5rem] relative overflow-hidden flex flex-col sm:flex-row items-center gap-8 group hover:border-amber-500/40 transition-colors">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl group-hover:bg-amber-500/30 transition-colors" />
            <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/20 shrink-0 relative z-10 border border-white/20">
               <Star size={36} className="fill-white text-white drop-shadow-md" />
            </div>
            <div className="space-y-3 flex-1 text-center sm:text-left relative z-10">
               <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/80">Command Evaluation</h4>
               {data.goalRate >= 100 ? (
                 <p className="text-sm sm:text-base font-medium italic text-white/90 leading-relaxed shadow-sm block">"Mission objectives exceeded. Your dedication to the plan is exemplary. Maintain this elite standard."</p>
               ) : data.goalRate >= 50 ? (
                 <p className="text-sm sm:text-base font-medium italic text-white/90 leading-relaxed shadow-sm block">"Solid operational progress. Focus on completing the remaining targets to achieve total mastery."</p>
               ) : (
                 <p className="text-sm sm:text-base font-medium italic text-white/90 leading-relaxed shadow-sm block">"The foundation is set. Re-engage with the roadmap and escalate your execution level."</p>
               )}
               <div className="pt-3 flex items-center justify-center sm:justify-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-md">
                     <Zap size={14} className="text-amber-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">System Assessment • Automated</span>
               </div>
            </div>
         </Card>
      </div>
      
      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
