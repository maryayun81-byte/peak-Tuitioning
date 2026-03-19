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
    
    const [subRes, attRes, rankData, certRes] = await Promise.all([
      supabase.from('submissions').select('*, assignment:assignments(*, subject:subjects(name))').eq('student_id', student?.id),
      supabase.from('attendance').select('*').eq('student_id', student?.id),
      supabase.from('students').select('id, xp').eq('curriculum_id', student?.curriculum_id).order('xp', { ascending: false }),
      supabase.from('certificates').select('*').eq('student_id', student?.id)
    ])

    const submissions = subRes.data || []
    const myRank = rankData.data ? rankData.data.findIndex(s => s.id === student?.id) + 1 : 0
    setRank(myRank)

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
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 3)
      .map(s => ({
        title: s.assignment?.title || 'Assignment',
        score: `${Math.round((s.marks / s.max_marks) * 100)}%`,
        date: formatDate(s.updated_at),
        delta: s.marks / s.max_marks >= 0.8 ? 'Excellent' : 'Good'
      }))
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
    </div>
  )
}
