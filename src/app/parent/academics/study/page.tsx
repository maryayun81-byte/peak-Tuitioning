'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, Clock, Target, 
  TrendingUp, Award, ChevronRight,
  Search, Users, Calendar, Sparkles,
  Brain, Zap, MessageSquare, ArrowRight,
  ShieldCheck, BarChart3, Map
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import Link from 'next/link'


export default function ParentStudyHub() {
  const supabase = getSupabaseBrowserClient()
  const { parent, selectedStudent: storeSelectedStudent } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<any[]>([])
  const [studyPlans, setStudyPlans] = useState<any[]>([])
  const [aggregateStats, setAggregateStats] = useState({
    totalMinutes: 0,
    activeRoadmaps: 0,
    completedGoals: 0,
    reflectionCount: 0
  })

  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0]

  useEffect(() => {
    if (parent?.id) {
       loadInitialData()
    }
  }, [parent?.id])

  useEffect(() => {
    if (selectedStudentId) loadStudentDetails(selectedStudentId)
  }, [selectedStudentId])

  const loadInitialData = async () => {
    if (!parent?.id) return
    setLoading(true)
    try {
      const { data: links, error } = await supabase
        .from('parent_student_links')
        .select('student:students(*, class:classes(name))')
        .eq('parent_id', parent.id)
      
      if (error) throw error

      const studentList = links?.map(l => l.student).filter(Boolean) || []
      setStudents(studentList)
      
      if (studentList.length > 0) {
        // Default to store selected student or first one
        const initialId = storeSelectedStudent?.id || (studentList[0] as any)?.id
        if (initialId) setSelectedStudentId(initialId)
      }
    } catch (err) {
      console.error('[ParentStudyHub] Init error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStudentDetails = async (studentId: string) => {
    try {
      // Fetch sessions with full sub-data
      const { data: sessions, error } = await supabase
        .from('study_sessions')
        .select('*, goals:study_goals(*), reflections:study_reflections(*), subject:subjects(name)')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(10)

      if (error) throw error
      setSessionData(sessions || [])

      // Fetch Study Plans with their linked sessions for real progress stats
      const { data: plans } = await supabase
        .from('study_plans')
        .select('*, subject:subjects(name), sessions:study_sessions(id, status, duration_minutes)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      
      // Compute progress from sessions instead of milestones
      const enrichedPlans = (plans || []).map((plan: any) => {
        const planSessions: any[] = plan.sessions || []
        const completedSessions = planSessions.filter((s: any) => s.status === 'completed').length
        const totalSessions = planSessions.length
        const progress = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0
        return {
          ...plan,
          _completedSessions: completedSessions,
          _totalSessions: totalSessions,
          _progress: progress,
        }
      })
      setStudyPlans(enrichedPlans)

      // Calculate stats
      const totalMin = sessions?.reduce((acc, s) => acc + (s.status === 'completed' ? s.duration_minutes : 0), 0) || 0
      const goals = sessions?.flatMap(s => s.goals || []) || []
      const completedGoals = goals.filter(g => g.is_completed).length
      const reflections = sessions?.flatMap(s => s.reflections || []) || []

      setAggregateStats({
        totalMinutes: totalMin,
        activeRoadmaps: (plans || []).filter((p: any) => p.is_active).length,
        completedGoals,
        reflectionCount: reflections.length
      })
    } catch (err) {
      console.error('[ParentStudyHub] Detail error:', err)
    }
  }

  if (loading) return <SkeletonDashboard />

  if (students.length === 0) {
    return (
      <div className="p-10 min-h-[70vh] flex items-center justify-center">
        <Card className="p-20 text-center border-2 border-dashed border-slate-200 rounded-[3rem] space-y-6 max-w-xl bg-slate-50/50">
           <div className="w-24 h-24 rounded-[2.5rem] bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
              <Users size={48} />
           </div>
           <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 uppercase italic">No Study Engines Found</h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                 You haven&apos;t linked any students to your profile yet. Access PIN is required for secure telemetry sync.
              </p>
           </div>
           <Link href="/parent/link">
              <Button className="h-14 px-10 rounded-2xl bg-slate-900 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">
                 LINK STUDENT PROFILE
              </Button>
           </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-10 pb-40">

       {/* Executive Header */}
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-3">
             <div className="flex items-center gap-2 px-3 py-1 rounded-full w-fit border" style={{ background: 'var(--input)', color: 'var(--warning)', borderColor: 'var(--card-border)' }}>
                <Zap size={14} fill="currentColor" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Study Hub</span>
             </div>
             <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase italic" style={{ color: 'var(--text)' }}>
                Independent Mastery
             </h1>
             <p className="font-bold text-sm uppercase tracking-wide max-w-xl" style={{ color: 'var(--text-muted)' }}>
                Real-time telemetry of focus sessions, cognitive goals, and performance reflections for your family.
             </p>
          </div>

          {/* Premium Student Switcher */}
           <div className="flex bg-[var(--input)] p-1.5 rounded-[2rem] border border-[var(--card-border)] shadow-sm overflow-x-auto no-scrollbar">
              {students.map(s => (
                 <button 
                   key={s.id} 
                   onClick={() => setSelectedStudentId(s.id)}
                   className={`px-8 h-12 rounded-[1.5rem] text-[10px] uppercase font-black tracking-[0.15em] transition-all whitespace-nowrap gap-2 flex items-center ${selectedStudentId === s.id ? 'bg-[var(--card)] text-[var(--text)] shadow-xl ring-1 ring-[var(--card-border)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                 >
                    {selectedStudentId === s.id && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />}
                    {s.full_name.split(' ')[0]}
                 </button>
              ))}
           </div>
       </div>

       {/* Quick Analytics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
           <StatCard 
             title="Total Focus" 
             value={`${Math.floor(aggregateStats.totalMinutes / 60)}h ${aggregateStats.totalMinutes % 60}m`} 
             icon={<Clock size={20} />} 
             className="border-none shadow-xl shadow-slate-200/5"
           />
           <StatCard 
             title="Active Sessions" 
             value={aggregateStats.activeRoadmaps} 
             icon={<Brain size={20} />} 
             className="border-none shadow-xl shadow-indigo-100/5"
           />
           <StatCard 
             title="Goals Met" 
             value={aggregateStats.completedGoals} 
             icon={<Target size={20} />} 
             className="border-none shadow-xl shadow-emerald-100/5"
           />
           <StatCard 
             title="Reflections" 
             value={aggregateStats.reflectionCount} 
             icon={<MessageSquare size={20} />} 
             className="border-none shadow-xl shadow-orange-100/5"
           />
        </div>

        {/* Family Study Overview & Live Journey Entry */}
        <div className="space-y-8">
           <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter" style={{ color: 'var(--text)' }}>Academic Roadmaps</h2>
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                 <Map size={14} /> {studyPlans.length} Active Plans
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studyPlans.length === 0 ? (
                 <Card className="col-span-full py-16 text-center border-dashed border-2 rounded-[3rem]" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">No active roadmaps found for this student.</p>
                 </Card>
              ) : (
                 studyPlans.map((plan: any) => {
                    const completed = plan._completedSessions ?? 0
                    const total = plan._totalSessions ?? 0
                    const progress = plan._progress ?? 0

                    return (
                       <Card key={plan.id} className="p-8 rounded-[3rem] border shadow-sm hover:shadow-2xl transition-all duration-500 group relative overflow-hidden flex flex-col justify-between h-full" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                             <Map size={60} style={{ color: 'var(--primary)' }} />
                          </div>
                          
                          <div className="space-y-6">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg rotate-3 group-hover:rotate-0 transition-transform" style={{ background: 'var(--primary)' }}>
                                   <BookOpen size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                   <h4 className="text-sm font-black uppercase tracking-tight truncate" style={{ color: 'var(--text)' }}>{plan.name || plan.subject?.name || "Study Plan"}</h4>
                                   <p className="text-[10px] font-bold uppercase tracking-widest truncate" style={{ color: 'var(--text-muted)' }}>{plan.subject?.name || 'General Academic'}</p>
                                </div>
                             </div>

                             <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                   <span className="text-[10px] font-black uppercase tracking-widest shadow-inner px-2 py-0.5 rounded-lg" style={{ color: 'var(--primary)', background: 'var(--input)' }}>Session Progress</span>
                                   <span className="text-xs font-black" style={{ color: 'var(--text)' }}>{Math.round(progress)}%</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--input)' }}>
                                   <motion.div 
                                     initial={{ width: 0 }}
                                     animate={{ width: `${progress}%` }}
                                     className="h-full bg-[var(--primary)] rounded-full"
                                   />
                                </div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] italic">
                                   {completed} of {total} sessions completed
                                </p>
                             </div>
                          </div>

                          <Link href={`/parent/students/${selectedStudentId || 'unknown'}/progress`} className="mt-8">
                             <Button className="w-full h-12 rounded-xl bg-[var(--input)] text-[var(--text)] border-none font-black text-[10px] uppercase tracking-widest hover:bg-[var(--primary)] hover:text-white transition-all shadow-md group/btn">
                                ENTER LIVE JOURNEY <ArrowRight size={14} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
                             </Button>
                          </Link>
                       </Card>
                    )
                 })
              )}
           </div>
        </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Active Timeline (Left) */}
          <div className="lg:col-span-8 space-y-8">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                   <Calendar size={16} /> Recent Academic Sprints
                </h3>
             </div>

             <div className="space-y-6">
                {sessionData.length === 0 ? (
                   <Card className="p-20 text-center border-2 border-dashed rounded-[3rem] space-y-4 shadow-inner" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-[var(--text-muted)]" style={{ background: 'var(--card)' }}>
                         <BookOpen size={30} />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest leading-relaxed" style={{ color: 'var(--text-muted)' }}> 
                         No focus sessions detected for this student.
                      </p>
                   </Card>
                ) : (
                  sessionData.map((session, i) => (
                    <motion.div 
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group"
                    >
                       <div className="p-8 sm:p-10 rounded-[3rem] border shadow-sm hover:shadow-2xl transition-all duration-700 space-y-8" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                             <div className="flex items-center gap-6">
                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl rotate-3 group-hover:rotate-0 transition-transform duration-500 bg-gradient-to-br ${
                                   session.status === 'completed' ? 'from-emerald-500 to-teal-600 shadow-emerald-500/20' :
                                   session.status === 'in_progress' ? 'from-orange-500 to-amber-500 shadow-orange-500/20 animate-pulse' :
                                   'from-slate-400 to-slate-500 shadow-slate-400/20'
                                }`}>
                                   {session.status === 'completed' ? <Target size={28} /> : <Clock size={28} />}
                                </div>
                                <div className="space-y-1">
                                   <div className="flex items-center gap-3">
                                      <h4 className="text-xl font-black uppercase tracking-tighter leading-none italic" style={{ color: 'var(--text)' }}>
                                         {session.subject?.name || 'Self Discovery'}
                                      </h4>
                                      <Badge className="bg-[var(--input)] text-[var(--text-muted)] border-none px-3 py-1 text-[8px] font-black uppercase tracking-widest">
                                         {session.duration_minutes} MIN SPRINT
                                      </Badge>
                                   </div>
                                   <p className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                      <Calendar size={12} className="text-indigo-400" /> {new Date(session.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                   </p>
                                </div>
                             </div>
                             <div className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border self-start sm:self-center ${
                                session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                session.status === 'in_progress' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                                'bg-slate-500/10 text-slate-600 border-slate-500/20'
                             }`}>
                                {session.status.replace('_', ' ')}
                             </div>
                          </div>

                           {/* Goals Progress */}
                           {session.goals?.length > 0 && (
                              <div className="space-y-4">
                                 <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                    < Zap size={12} fill="currentColor" className="text-orange-500" /> Strategic Objectives
                                 </div>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {session.goals.map((goal: any) => (
                                       <div key={goal.id} className="p-4 rounded-2xl border flex items-center gap-4 group/goal transition-all" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                                          <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-colors ${goal.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--card-border)]'}`}>
                                             {goal.is_completed && <ChevronRight size={14} className="stroke-[4]" />}
                                          </div>
                                          <p className={`text-[11px] font-bold uppercase tracking-tight leading-snug ${goal.is_completed ? 'text-[var(--text)] line-through opacity-40' : 'text-[var(--text)]'}`}>
                                             {goal.objective}
                                          </p>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}

                           {/* Reflection Preview */}
                           {session.reflections?.length > 0 && (
                             <div className="pt-6 border-t" style={{ borderColor: 'var(--card-border)' }}>
                                 <div className="p-6 rounded-3xl border relative overflow-hidden group/ref" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/ref:opacity-20 transition-opacity">
                                       <MessageSquare size={40} style={{ color: 'var(--primary)' }} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-3 italic">Post-Session Reflection</p>
                                    <p className="text-xs font-bold leading-relaxed italic" style={{ color: 'var(--text)' }}>
                                       &quot;{session.reflections[0].learned_summary || session.reflections[0].completed_summary}&quot;
                                    </p>
                                 </div>
                             </div>
                           )}
                        </div>
                    </motion.div>
                  ))
                )}
             </div>
          </div>

          {/* Tactical Sidebar (Right) */}
          <div className="lg:col-span-4 space-y-10">
             <Card className="p-10 bg-slate-900 text-white rounded-[3rem] shadow-2xl relative overflow-hidden space-y-8 border-none group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-bl-full group-hover:scale-110 transition-transform duration-700" />
                <div className="w-20 h-20 rounded-[2rem] bg-white/10 flex items-center justify-center text-orange-400 backdrop-blur-xl border border-white/20 shadow-2xl group-hover:rotate-6 transition-transform">
                   <TrendingUp size={36} />
                </div>
                <div>
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-orange-400 mb-2">Momentum Engine</h3>
                   <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-[1.8]">
                      {selectedStudent?.full_name.split(' ')[0]}&apos;s current focus stability is <span className="text-white underline decoration-orange-500 underline-offset-8">OPTIMIZED</span>. Weekly goal completion rate has surged by <span className="text-emerald-400">18%</span>.
                   </p>
                </div>
                <div className="pt-4 border-t border-white/10">
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stability Index</span>
                      <span className="text-xs font-black text-emerald-400">88.4 / 100</span>
                   </div>
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '88%' }}
                        className="h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                      />
                   </div>
                </div>
             </Card>

             <Card className="p-10 rounded-[3rem] shadow-xl space-y-10" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                   <Sparkles size={16} fill="currentColor" className="text-indigo-400" /> Mastery Habits
                </h3>
                <div className="space-y-8">
                   {[
                      { label: 'Independent Deep Work', value: 82, color: 'var(--primary)' },
                      { label: 'Strategic Reflection', value: 95, color: 'var(--success)' },
                      { label: 'Objective Realization', value: 74, color: 'var(--warning)' }
                   ].map((habit, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex justify-between items-end">
                           <span className="text-[10px] font-black uppercase tracking-tight italic" style={{ color: 'var(--text)' }}>{habit.label}</span>
                           <span className="text-[11px] font-black" style={{ color: habit.color }}>{habit.value}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden p-0 ring-1 ring-[var(--card-border)]" style={{ background: 'var(--input)' }}>
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${habit.value}%` }}
                             className="h-full rounded-full shadow-lg"
                             style={{ background: habit.color }}
                           />
                        </div>
                      </div>
                   ))}
                </div>
                <Button variant="secondary" className="w-full h-14 bg-[var(--input)] hover:opacity-80 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-none border-none" style={{ color: 'var(--text)' }}>
                   SYNC SESSION CALENDAR
                </Button>
             </Card>

             <Card className="p-10 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-[3rem] shadow-xl shadow-indigo-100 space-y-6 text-center border-none group">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto text-white backdrop-blur-sm border border-white/20 group-hover:scale-110 transition-transform">
                   <ShieldCheck size={36} />
                </div>
                <div className="space-y-2">
                   <h4 className="text-xs font-black uppercase tracking-widest">Growth Dossier</h4>
                   <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-relaxed">
                      Download the comprehensive study evolution report for the current academic season.
                   </p>
                </div>
                <Button className="w-full h-14 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-transform border-none">
                   DOWNLOAD Dossier
                </Button>
             </Card>
          </div>
       </div>
    </div>
  )
}
