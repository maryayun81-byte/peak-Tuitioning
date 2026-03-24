'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, Clock, Target, Zap, 
  BarChart3, PieChart, TrendingUp, 
  ChevronRight, Calendar, Info,
  CheckCircle2, Star, X, Trophy, Award
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import { WeeklyReport } from '@/components/student/study/WeeklyReport'
import { StudyPath } from '@/components/student/study/StudyPath'

interface StudyDashboardProps {
  planId: string | null
  onPlanUpdate?: () => void
}

export const StudyDashboard = ({ planId, onPlanUpdate }: StudyDashboardProps) => {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const { student, profile } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<any[]>([])
  const [showReport, setShowReport] = useState(false)
  const [stats, setStats] = useState({
    totalMinutes: 0,
    completedCount: 0,
    plannedCount: 0,
    streak: 0,
    goalRate: 0
  })
  const [badges, setBadges] = useState<any[]>([])
  const [currentPlan, setCurrentPlan] = useState<any>(null)

  useEffect(() => {
    if (student && planId) loadDashboard()
  }, [student, planId])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      // 1. Fetch Plan Details
      const { data: planData } = await supabase
        .from('study_plans')
        .select('*')
        .eq('id', planId)
        .single()
      
      setCurrentPlan(planData)

      // 2. Fetch Sessions
      const { data: sess } = await supabase
        .from('study_sessions')
        .select('*, goals:study_goals(*), subject:subjects(name)')
        .eq('student_id', student?.id)
        .eq('plan_id', planId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      setSessions(sess || [])
      
      const completed = sess?.filter(s => s.status === 'completed') || []
      const totalMin = completed.reduce((acc, s) => acc + s.duration_minutes, 0)
      
      setStats({
        totalMinutes: totalMin,
        completedCount: completed.length,
        plannedCount: sess?.length || 0,
        streak: 5, // Mock streak
        goalRate: sess?.length ? Math.round((completed.length / sess.length) * 100) : 0
      })

      // 3. Fetch Badges
      const { data: badgeData } = await supabase
        .from('study_badges')
        .select('*')
        .eq('student_id', student?.id)
        .order('created_at', { ascending: false })
      
      setBadges(badgeData || [])
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />

  const todayStr = new Date().toISOString().split('T')[0]
  const todaySessions = sessions.filter(s => s.date === todayStr)

  return (
    <div className="space-y-8 pb-32">
      {/* Analytics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
         <Card className="p-6 bg-gradient-to-br from-primary/10 to-transparent border-none shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <div className="space-y-2 sm:space-y-4">
               <div className="flex items-center justify-between">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Clock size={20} /></div>
                  <Badge variant="primary" className="text-[10px]">WEEKLY</Badge>
               </div>
               <div>
                  <h3 className="text-xl sm:text-3xl font-black">{Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m</h3>
                  <p className="text-[8px] sm:text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Focus Time</p>
               </div>
            </div>
         </Card>

         <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-transparent border-none shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <div className="space-y-2 sm:space-y-4">
               <div className="flex items-center justify-between">
                  <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500"><Zap size={20} /></div>
                  <Badge variant="warning" className="text-[10px]">CURRENT</Badge>
               </div>
               <div>
                  <h3 className="text-xl sm:text-3xl font-black">{stats.streak} Days</h3>
                  <p className="text-[8px] sm:text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Streak</p>
               </div>
            </div>
         </Card>

         <Card className="p-6 bg-gradient-to-br from-indigo-500/10 to-transparent border-none shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <div className="space-y-2 sm:space-y-4">
               <div className="flex items-center justify-between">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500"><Target size={20} /></div>
                  <Badge variant="info" className="text-[10px]">SUCCESS</Badge>
               </div>
               <div>
                  <h3 className="text-xl sm:text-3xl font-black">{stats.goalRate}%</h3>
                  <p className="text-[8px] sm:text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Goal Rate</p>
               </div>
            </div>
         </Card>

         <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border-none shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <div className="space-y-2 sm:space-y-4">
               <div className="flex items-center justify-between">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><CheckCircle2 size={20} /></div>
                  <Badge variant="success" className="text-[10px]">ACTIVE</Badge>
               </div>
               <div>
                  <h3 className="text-xl sm:text-3xl font-black">{stats.completedCount}/{stats.plannedCount}</h3>
                  <p className="text-[8px] sm:text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Finished</p>
               </div>
            </div>
         </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Focus Journey - Candy Crush Style */}
         <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-black flex items-center gap-2 uppercase tracking-tighter">
                  <Star size={20} className="text-amber-500 fill-amber-500" /> Your Study Journey
               </h2>
               <Button variant="secondary" size="sm" onClick={() => router.push('/student/study/planner')} className="rounded-xl font-bold">
                  Edit Roadmap
               </Button>
            </div>
            
            <Card className="bg-[var(--card)] border-none shadow-2xl relative min-h-[500px]">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--primary),transparent)] opacity-5" />
                <StudyPath 
                  sessions={sessions} 
                  planName={currentPlan?.name}
                  planRange={currentPlan ? `${new Date(currentPlan.start_date).toLocaleDateString()} - ${new Date(currentPlan.end_date).toLocaleDateString()}` : undefined}
                />
            </Card>

            {/* Daily Roadmap Details */}
            <div className="space-y-6 pt-12">
               <h2 className="text-xl font-bold flex items-center gap-2">
                  <Calendar size={20} className="text-primary" /> Today's Details
               </h2>

               <div className="space-y-4">
                  {todaySessions.map(s => (
                     <Card key={s.id} className="p-5 flex items-center justify-between group hover:shadow-2xl transition-all border-none bg-[var(--card)]">
                        <div className="flex items-center gap-5">
                           <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black ${s.status === 'completed' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                              <span className="text-xs">{s.start_time.split(':')[0]}</span>
                              <span className="text-[10px] opacity-40">{s.start_time.split(':')[1]}</span>
                           </div>
                           <div>
                              <h4 className="font-bold text-lg">{s.subject?.name || 'Self-Study'}</h4>
                              <p className="text-xs opacity-50 flex items-center gap-2">
                                 {s.status === 'completed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                 {s.duration_minutes} Minutes
                              </p>
                           </div>
                        </div>

                        <div className="flex items-center gap-3">
                           {s.status !== 'completed' ? (
                             <Button size="sm" className="rounded-xl px-5 flex items-center gap-2 shadow-lg shadow-primary/20" onClick={() => router.push(`/student/study/focus/${s.id}`)}>
                                <Play size={14} fill="currentColor" /> Start
                             </Button>
                           ) : (
                             <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success">
                                <CheckCircle2 size={24} />
                             </div>
                           )}
                        </div>
                     </Card>
                  ))}

                  {todaySessions.length === 0 && (
                     <div className="py-20 text-center border-2 border-dashed rounded-3xl opacity-30 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-[var(--input)] rounded-full flex items-center justify-center">
                           <Info size={32} />
                        </div>
                        <p className="font-bold">No sessions planned for today.</p>
                        <Button variant="secondary" onClick={() => router.push('/student/study/planner')}>
                           Plan Your Day
                        </Button>
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Right Sidebar - Trends & Gamification */}
         <div className="space-y-6">
            <Card className="p-6 border-none shadow-xl space-y-6">
               <h3 className="font-black text-xs uppercase tracking-widest opacity-40">Performance Insights</h3>
               
               <div className="space-y-4">
                  <div className="space-y-2">
                     <div className="flex items-center justify-between text-xs font-bold">
                        <span>Subject Focus</span>
                        <span className="text-primary">Trends</span>
                     </div>
                     <div className="h-2 rounded-full bg-[var(--input)] overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '70%' }} className="h-full bg-primary" />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <div className="flex items-center justify-between text-xs font-bold">
                        <span>Focus Consistency</span>
                        <span className="text-amber-500">Improving</span>
                     </div>
                     <div className="h-2 rounded-full bg-[var(--input)] overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} className="h-full bg-amber-500" />
                     </div>
                  </div>
               </div>

               <div className="pt-6 border-t border-[var(--card-border)]">
                  <h4 className="text-xs font-black uppercase tracking-widest opacity-40 mb-4">Achievements</h4>
                  <div className="flex flex-wrap gap-3">
                     {badges.map((b, i) => (
                        <div key={b.id} className="group relative">
                           <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/20 group-hover:scale-110 transition-transform cursor-help">
                              <Trophy size={24} />
                           </div>
                           <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-black text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
                              <p className="font-bold">Weekly Mastery</p>
                              <p className="opacity-60">{new Date(b.achieved_at).toLocaleDateString()}</p>
                           </div>
                        </div>
                     ))}
                     {badges.length === 0 && (
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-500/5 border border-slate-500/10 w-full">
                           <div className="w-12 h-12 bg-slate-500/10 rounded-xl flex items-center justify-center text-slate-400">
                              <Award size={24} />
                           </div>
                           <div>
                              <div className="text-xs font-bold opacity-40">No Badges Yet</div>
                              <div className="text-[10px] opacity-30">Finish a plan to earn!</div>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </Card>

            <Card className="p-6 border-none shadow-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative overflow-hidden">
               <div className="relative z-10 space-y-4">
               <h3 className="font-black text-sm uppercase tracking-widest opacity-60">Mission Report</h3>
               <p className="text-xs opacity-80 leading-relaxed">Your definitive performance summary for this study operation.</p>
               <Button variant="secondary" className="w-full bg-white/10 hover:bg-white/20 border-white/10 text-white font-bold h-10 text-xs" onClick={() => setShowReport(true)}>
                  View Report
               </Button>
               </div>
               <div className="absolute -bottom-4 -right-4 opacity-10">
                  <BarChart3 size={120} />
               </div>
            </Card>
         </div>
      </div>

      {/* Weekly Report Modal */}
      <AnimatePresence>
         {showReport && (
            <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 sm:p-10">
               <motion.div 
                 initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                 animate={{ scale: 1, opacity: 1, y: 0 }} 
                 exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                 className="max-w-6xl w-full max-h-[90vh] relative flex flex-col"
               >
                  <button 
                    onClick={() => setShowReport(false)}
                    className="absolute -top-5 -right-5 w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center shadow-2xl z-[160] hover:scale-110 active:scale-95 transition-all border border-slate-100"
                  >
                    <X size={24} strokeWidth={3} />
                  </button>

                  <div className="flex-1 overflow-y-auto rounded-[3.5rem] custom-scrollbar shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] bg-[var(--card)]">
                     <WeeklyReport 
                       studentId={student?.id || ''} 
                       planId={currentPlan?.id || ''} 
                     />
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  )
}
