'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Trophy, TrendingUp, Calendar, 
  Award, BrainCircuit, Zap,
  CheckCircle2, Clock, Target,
  Download, ArrowRight, Star, Plus
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line,
  AreaChart, Area
} from 'recharts'

export default function StudentPerformance() {
  const supabase = getSupabaseBrowserClient()
  const { student, profile } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [subjectStats, setSubjectStats] = useState<any[]>([])
  const [quizTimeline, setQuizTimeline] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any>({ percentage: 0, total: 0, present: 0 })
  const [rank, setRank] = useState(0)
  const [totalStudents, setTotalStudents] = useState(0)
  const [percentile, setPercentile] = useState(0)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [accuracy, setAccuracy] = useState(0)
  const [recentSuccesses, setRecentSuccesses] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])

  useEffect(() => {
    if (student) loadData()
  }, [student])

  const loadData = async () => {
    setLoading(true)
    // In a real app, these would be complex aggregation queries
    // Here we simulate data based on logical structures
    
    const [subRes, attRes, rankRes, certRes] = await Promise.all([
      supabase.from('submissions').select('*, assignment:assignments(*, subject:subjects(name))').eq('student_id', student?.id),
      supabase.from('attendance').select('*').eq('student_id', student?.id),
      supabase.from('students').select('id, full_name, xp').eq('curriculum_id', student?.curriculum_id).order('xp', { ascending: false }),
      supabase.from('certificates').select('*').eq('student_id', student?.id)
    ])

    const submissions = subRes.data || []
    const rankList = rankRes.data || []
    const myRank = rankList.findIndex(s => s.id === student?.id) + 1
    
    setRank(myRank)
    setTotalStudents(rankList.length)
    setLeaderboard(rankList.slice(0, 5))
    
    if (rankList.length > 0 && myRank > 0) {
      setPercentile(Math.round(((rankList.length - myRank) / rankList.length) * 100))
    }

    // Calculate aggregated stats
    const totalMarks = submissions.reduce((acc, s) => acc + (s.marks || 0), 0)
    const totalMax = submissions.reduce((acc, s) => acc + (s.max_marks || 100), 0)
    setAccuracy(totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0)

    // Subject performance logic
    const statsBySubject: Record<string, { total: number, max: number }> = {}
    submissions.forEach(s => {
      const subjName = s.assignment?.subject?.name || 'General'
      if (!statsBySubject[subjName]) statsBySubject[subjName] = { total: 0, max: 0 }
      statsBySubject[subjName].total += (s.marks || 0)
      statsBySubject[subjName].max += (s.max_marks || 100)
    })
    
    const realSubjectStats = Object.entries(statsBySubject).map(([name, data]) => ({
      name,
      score: Math.round((data.total / data.max) * 100),
      full: 100
    }))
    setSubjectStats(realSubjectStats)

    // Success log
    const recent = submissions
      .filter(s => s.status === 'returned')
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 3)
      .map(s => {
        const pct = s.max_marks > 0 ? (s.marks / s.max_marks) : 0
        return {
          title: s.assignment?.title || 'Assignment',
          score: `${Math.round(pct * 100)}%`,
          date: s.updated_at ? formatDate(s.updated_at) : 'Recent',
          delta: pct >= 0.8 ? 'Excellent' : 'Good'
        }
      })
    setRecentSuccesses(recent)

    // Timeline (simplified from submissions)
    const timeline = submissions
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(s => ({
        date: new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        accuracy: Math.round(((s.marks || 0) / (s.max_marks || 100)) * 100)
      }))
    setQuizTimeline(timeline.length > 0 ? timeline : [{ date: 'Start', accuracy: 0 }])

    setAttendance({
       total: attRes.data?.length || 0,
       present: attRes.data?.filter(a => a.status === 'present').length || 0,
       percentage: attRes.data?.length ? Math.round((attRes.data.filter(a => a.status === 'present').length / attRes.data.length) * 100) : 100
    })

    // --- Badge Logic ---
    const newBadges = []
    
    // 1. Level-based badges
    const level = Math.floor((student?.xp || 0) / 1000) + 1
    if (level >= 10) newBadges.push({ label: 'Elite Hero', icon: '💎', color: 'bg-indigo-100' })
    else if (level >= 5) newBadges.push({ label: 'Rising Star', icon: '⭐', color: 'bg-amber-100' })
    else newBadges.push({ label: 'New Recruit', icon: '🌱', color: 'bg-emerald-100' })

    // 2. Streak badges
    const streak = student?.streak_count || 0
    if (streak >= 7) newBadges.push({ label: 'Fire Keeper', icon: '🔥', color: 'bg-orange-100' })
    else if (streak >= 3) newBadges.push({ label: 'Steady Pace', icon: '👣', color: 'bg-blue-100' })

    // 3. Subject Mastery Badges
    realSubjectStats.forEach(s => {
      if (s.score >= 90) newBadges.push({ label: `${s.name} Master`, icon: '👑', color: 'bg-purple-100' })
    })

    // 4. Actual Certificates from DB
    if (certRes.data) {
      certRes.data.forEach(c => {
        newBadges.push({ label: 'Attendance Cert.', icon: '📜', color: 'bg-slate-100' })
      })
    }

    setBadges(newBadges)
    setLoading(false)
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Performance Intel</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Track your growth and unlock new achievements!</p>
         </div>
         <Button variant="secondary" size="sm"><Download size={16} className="mr-2" /> Download Report</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard title="Global Rank" value={`#${rank}`} icon={<Star size={20} className="text-amber-500" />} />
         <StatCard title="Avg. Accuracy" value={`${accuracy}%`} icon={<Target size={20} className="text-primary" />} />
         <StatCard title="Attendance" value={`${attendance.percentage}%`} icon={<CheckCircle2 size={20} className="text-emerald-500" />} />
         <StatCard title="Total XP" value={student?.xp?.toLocaleString() || '0'} icon={<Zap size={20} className="text-amber-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Mastery by Subject */}
         <Card className="p-6 space-y-6">
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted">Mastery by Subject</h3>
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectStats}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                     <YAxis hide domain={[0, 100]} />
                     <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', background: 'var(--card)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: 'var(--primary)', fontStyle: 'bold' }}
                     />
                     <Bar dataKey="score" fill="var(--primary)" radius={[8, 8, 0, 0]} barSize={40} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </Card>

         {/* Growth Timeline */}
         <Card className="p-6 space-y-6">
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted">Accuracy Growth</h3>
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={quizTimeline}>
                     <defs>
                        <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                     <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                     <YAxis hide domain={[0, 100]} />
                     <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', background: 'var(--card)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                     />
                     <Area type="monotone" dataKey="accuracy" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorAcc)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Success Log (Attendance/Recent) */}
         <div className="lg:col-span-2 space-y-6">
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted">Recent Successes</h3>
            <div className="space-y-4">
               {recentSuccesses.length > 0 ? recentSuccesses.map((s, i) => (
                 <div key={i} className="flex items-center justify-between p-5 rounded-3xl bg-[var(--card)] border border-[var(--card-border)] hover:bg-[var(--input)] transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <TrendingUp size={24} />
                       </div>
                       <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{s.title}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.date}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="font-black text-lg text-primary">{s.score}</p>
                       <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">{s.delta}</p>
                    </div>
                 </div>
               )) : (
                 <div className="text-center p-12 bg-[var(--card)] border border-dashed rounded-3xl">
                    <p className="text-sm text-muted">Complete goals to see your success log grow!</p>
                 </div>
               )}
            </div>
         </div>

         {/* Badges/Achievements Cabinet */}
          <div className="space-y-6">
             <h3 className="font-bold text-sm uppercase tracking-widest text-muted">Trophy Cabinet</h3>
             <div className="grid grid-cols-2 gap-4">
                {badges.length > 0 ? badges.map((b, i) => (
                  <Card key={i} className="p-4 text-center space-y-2 group hover:scale-105 transition-all">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-2xl ${b.color} shadow-lg shadow-black/5`}>
                        {b.icon}
                     </div>
                     <p className="text-[10px] font-bold" style={{ color: 'var(--text)' }}>{b.label}</p>
                  </Card>
                )) : (
                  <Card className="p-8 col-span-2 text-center border-dashed border-2 flex flex-col items-center justify-center space-y-2">
                     <Trophy size={24} className="text-muted opacity-20" />
                     <p className="text-[10px] font-bold text-muted uppercase">Empty Cabinet</p>
                  </Card>
                )}
                <Card className="p-4 flex flex-col items-center justify-center border-dashed border-2 group hover:bg-[var(--input)] cursor-pointer">
                   <Plus size={20} className="text-muted opacity-40 group-hover:scale-110 transition-all" />
                   <p className="text-[8px] font-bold uppercase mt-2 text-muted">View Badges</p>
                </Card>
             </div>
          </div>
      </div>

       {/* Competitive Insights: Leaderboard & Your Rank */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
          {/* Top PERFORMERS */}
          <Card className="p-6 space-y-6 lg:col-span-2">
             <div className="flex items-center justify-between">
                <div>
                   <h3 className="font-bold text-sm uppercase tracking-widest text-muted">Curriculum Leaders</h3>
                   <p className="text-[10px] text-muted">Top performers across all classes in your curriculum</p>
                </div>
                <Badge variant="muted"><Trophy size={12} className="mr-1 text-amber-500" /> Season 1</Badge>
             </div>

             <div className="space-y-3">
                {leaderboard.map((s, i) => (
                  <div key={s.id} className={`flex items-center justify-between p-4 rounded-3xl transition-all ${s.id === student?.id ? 'bg-primary/5 border border-primary/20 scale-[1.02]' : 'bg-[var(--input)]'}`}>
                     <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-100 text-slate-500' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-white/10 text-muted'}`}>
                           {i + 1}
                        </div>
                        <div>
                           <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{s.full_name} {s.id === student?.id && "(You)"}</p>
                           <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.xp.toLocaleString()} XP Total</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        {i === 0 && <Star size={16} className="text-amber-500 fill-amber-500" />}
                        {i === 1 && <Star size={16} className="text-slate-400 fill-slate-400" />}
                        {i === 2 && <Star size={16} className="text-orange-400 fill-orange-400" />}
                        <div className="font-black text-xs text-primary">#{i + 1}</div>
                     </div>
                  </div>
                ))}
             </div>
          </Card>

          {/* YOUR POSITION */}
          <Card className="p-6 flex flex-col justify-between space-y-8 bg-gradient-to-br from-primary to-indigo-600 border-none text-white overflow-hidden relative">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
             
             <div className="space-y-2 relative z-10">
                <h3 className="font-bold text-xs uppercase tracking-widest opacity-80">Your Standings</h3>
                <div className="flex items-baseline gap-2">
                   <span className="text-5xl font-black">#{rank}</span>
                   <span className="text-sm opacity-60">/ {totalStudents}</span>
                </div>
                <p className="text-xs font-medium bg-white/20 inline-block px-3 py-1 rounded-full backdrop-blur-md">
                   Top {100 - percentile}% of the curriculum
                </p>
             </div>

             <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-end">
                   <div className="space-y-1">
                      <p className="text-[10px] opacity-70 uppercase font-black">Performance Streak</p>
                      <p className="font-black text-lg flex items-center gap-2">
                         <TrendingUp size={20} /> Climbing <Star size={14} className="fill-white" />
                      </p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] opacity-70 uppercase font-black">Current XP</p>
                      <p className="font-black text-lg">{student?.xp?.toLocaleString()}</p>
                   </div>
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between text-[10px] font-black uppercase opacity-70">
                      <span>Relative Progress</span>
                      <span>To First Place</span>
                   </div>
                   <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${Math.min(100, ((student?.xp || 0) / (leaderboard[0]?.xp || 1)) * 100)}%` }}
                        className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                   </div>
                </div>
             </div>
          </Card>
       </div>
    </div>
  )
}
