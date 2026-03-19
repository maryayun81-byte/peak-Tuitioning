'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, Trophy, Target, Clock, 
  ArrowRight, Play, CheckCircle2,
  Calendar, Award, MessageSquare,
  Sparkles, Flame, Rocket
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import { ExamEventBanner } from '@/components/dashboard/ExamEventBanner'
import { TuitionEventBanner } from '@/components/dashboard/TuitionEventBanner'
import Link from 'next/link'

export default function StudentDashboard() {
  const supabase = getSupabaseBrowserClient()
  const { profile, student } = useAuthStore()
  const [loading, setLoading] = useState(true)
  
  const [activeQuests, setActiveQuests] = useState<any[]>([])
  const [nextClass, setNextClass] = useState<any>(null)
  const [intel, setIntel] = useState<any[]>([])
  const [stats, setStats] = useState({ tasks: 0, awards: 0, attendance: 98 })
  
  useEffect(() => {
    if (student) loadDashboard()
  }, [student, profile])

  const loadDashboard = async () => {
    if (!student || !profile) return
    setLoading(true)
    try {
      // 1. Fetch student's registered subjects
      const { data: subData } = await supabase
        .from('student_subjects')
        .select('subject_id')
        .eq('student_id', student.id)
      
      const subjectIds = subData?.map(s => s.subject_id) || []

      // 2. Fetch assignments for those subjects & next class
      const [aRes, tRes] = await Promise.all([
        supabase
          .from('assignments')
          .select('*, subject:subjects(name)')
          .in('subject_id', subjectIds)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('timetables')
          .select('*, subject:subjects(name)')
          .eq('class_id', student.class_id)
          .limit(1)
          .single()
      ])

      // 3. Fetch notifications for "Recent Intel"
      const { data: nData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(3)

      // 4. Fetch submission & certificate counts
      const [subsCount, certsCount] = await Promise.all([
        supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('student_id', student.id),
        supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('student_id', student.id)
      ])

      setActiveQuests(aRes.data ?? [])
      setNextClass(tRes.data ?? null)
      setIntel(nData ?? [])
      setStats({
        tasks: subsCount.count || 0,
        awards: certsCount.count || 0,
        attendance: 98 // Mocked for now until attendance system is linked
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-8 pb-12">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="space-y-1">
            <h1 className="text-3xl font-black flex items-center gap-3" style={{ color: 'var(--text)' }}>
               Ready to soar, {profile?.full_name.split(' ')[0]}? <Rocket className="text-primary animate-pulse" />
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
               You have <b>{student?.xp || 0} XP</b>. Level {Math.floor((student?.xp || 0) / 1000) + 1}
            </p>
         </div>
         <div className="flex gap-4">
            <div className="p-4 rounded-3xl bg-[var(--card)] border border-[var(--card-border)] flex items-center gap-4 shadow-xl shadow-amber-500/5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                   <Flame size={20} className="fill-amber-500" />
                </div>
                <div>
                   <div className="text-lg font-black" style={{ color: 'var(--text)' }}>{student?.streak_count || 0} Days</div>
                   <div className="text-[10px] uppercase font-bold text-muted">Fire Streak</div>
                </div>
            </div>
         </div>
      </div>

       {/* Event Banners */}
       <div className="space-y-3">
          <ExamEventBanner />
          <TuitionEventBanner />
       </div>

      {/* Progress Card */}
      <Card className="p-8 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/10 transition-colors" />
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            <div className="space-y-4">
               <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-muted">Level {Math.floor((student?.xp || 0) / 1000) + 1}</span>
                  <span className="text-xs font-black text-primary">{Math.floor(((student?.xp || 0) % 1000) / 10)}% to Level Up</span>
               </div>
               <div className="h-4 bg-[var(--input)] rounded-full overflow-hidden border border-[var(--card-border)]">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${((student?.xp || 0) % 1000) / 10}%` }} transition={{ duration: 1.5, ease: 'easeOut' }} className="h-full bg-primary" style={{ boxShadow: '0 0 12px var(--primary)' }} />
               </div>
               <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <Sparkles size={12} className="text-amber-500" /> {1000 - ((student?.xp || 0) % 1000)} more XP to reach the next horizon!
               </div>
            </div>
            
            <div className="flex items-center justify-around col-span-2 border-l border-[var(--card-border)] pl-8">
               <div className="text-center">
                  <div className="text-2xl font-black text-primary">{stats.awards}</div>
                  <div className="text-[10px] uppercase font-bold text-muted">Awards</div>
               </div>
               <div className="text-center">
                  <div className="text-2xl font-black text-secondary">{stats.tasks}</div>
                  <div className="text-[10px] uppercase font-bold text-muted">Tasks Done</div>
               </div>
               <div className="text-center">
                  <div className="text-2xl font-black text-emerald-500">{stats.attendance}%</div>
                  <div className="text-[10px] uppercase font-bold text-muted">Attendance</div>
               </div>
            </div>
         </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Daily Quests (Assignments/Quizzes) */}
         <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Target size={20} className="text-primary" /> Daily Quests
               </h2>
               <Link href="/student/assignments" className="text-xs font-bold text-primary hover:underline">View All Quests</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {activeQuests.map((q, i) => (
                 <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className="p-5 flex flex-col h-full border-none shadow-xl shadow-slate-900/10 hover:shadow-primary/5 transition-all">
                       <div className="flex justify-between items-start mb-4">
                          <div className={`p-2.5 rounded-2xl ${i % 2 === 0 ? 'bg-indigo-500/10 text-indigo-500' : 'bg-rose-500/10 text-rose-500'}`}>
                             <Award size={20} />
                          </div>
                          <Badge variant="muted" className="text-[9px]">{q.subject?.name}</Badge>
                       </div>
                       <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text)' }}>{q.title}</h3>
                       <p className="text-[10px] mb-6 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{q.description || 'Complete this task to earn XP and master the topic.'}</p>
                       
                       <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500">
                             <Zap size={12} className="fill-amber-500" /> +20 XP Completion
                          </div>
                          <Link href={`/student/assignments/${q.id}`}>
                             <Button size="sm" variant="secondary">Start Quest <ArrowRight size={12} className="ml-1" /></Button>
                          </Link>
                       </div>
                    </Card>
                 </motion.div>
               ))}
               
               {/* Upcoming Class Card */}
               <Card className="p-5 bg-gradient-to-br from-[#4F8CFF] to-[#3B82F6] border-none text-white shadow-xl shadow-blue-500/20 col-span-full md:col-span-1">
                  <div className="flex justify-between items-start mb-6">
                     <div className="p-2.5 rounded-2xl bg-white/20">
                        <Clock size={20} />
                     </div>
                     <Badge className="bg-white/20 text-white border-transparent">Next Class</Badge>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{nextClass?.subject?.name || 'Loading schedule...'}</h3>
                  <p className="text-xs opacity-80 mb-6">Starts in 15 minutes • Room {nextClass?.room_number || 'TBA'}</p>
                  <Button className="w-full bg-white text-blue-600 border-none hover:bg-white/90">Join Live Session</Button>
               </Card>
            </div>
         </div>

         {/* Right Sidebar */}
         <div className="space-y-6">
            {/* Recent Feedback */}
            <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
               <MessageSquare size={20} className="text-secondary" /> Recent Intel
            </h2>
            <div className="space-y-3">
               {intel.map((n, i) => (
                 <Card key={n.id} className="p-4 border-none shadow-md">
                    <div className="flex gap-3">
                       <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: n.type === 'award' ? '#10B981' : n.type === 'info' ? '#3B82F6' : '#F59E0B' }} />
                       <div>
                          <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text)' }}>{n.title}</p>
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{n.body}</p>
                       </div>
                    </div>
                 </Card>
               ))}
               {intel.length === 0 && (
                  <p className="text-[10px] text-center p-4 italic opacity-50">No recent intel found.</p>
               )}
            </div>

            <Card className="p-6 text-center space-y-4">
               <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto border-4 border-white shadow-inner">
                  <Trophy size={32} className="text-amber-500" />
               </div>
               <div>
                  <h4 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Leaderboard Ranking</h4>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Position #4 in Grade 8 Red</p>
               </div>
               <Button variant="ghost" size="sm" className="w-full text-xs">View Full Standings</Button>
            </Card>

            <Link href="/student/transcripts">
              <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg hover:scale-105 transition-all cursor-pointer">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                       <Award size={24} />
                    </div>
                    <div>
                       <h4 className="font-bold text-sm">My Transcripts</h4>
                       <p className="text-[10px] opacity-80">View Academic Reports</p>
                    </div>
                 </div>
              </Card>
            </Link>
         </div>
      </div>
    </div>
  )
}
