'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy, TrendingUp,
  Award, Zap,
  CheckCircle2, Target,
  Download, Star, Plus,
  Crown, Users, BookOpen, Building2
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { usePageData } from '@/hooks/usePageData'
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton'
import { PageStates } from '@/components/ui/PageStates'

// ── Medal colours ─────────────────────────────────────────────
const MEDALS = [
  { bg: 'bg-amber-400', text: 'text-white', label: '🥇' },
  { bg: 'bg-slate-400', text: 'text-white', label: '🥈' },
  { bg: 'bg-amber-700', text: 'text-white', label: '🥉' },
]

interface LbEntry {
  id: string
  full_name: string
  xp: number
  avatar_url?: string
  class_name?: string
}

function LeaderboardPodium({
  title, icon, entries, studentId, myRank, myEntry, isLoading
}: {
  title: string
  icon: React.ReactNode
  entries: LbEntry[]
  studentId?: string
  myRank: number | null
  myEntry: LbEntry | null
  isLoading: boolean
}) {
  const inTop = entries.some(e => e.id === studentId)

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-black text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {title}
          </h3>
        </div>
        {myRank != null && (
          <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-primary/10 text-primary uppercase tracking-wider">
            Your rank #{myRank}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <ShimmerSkeleton key={i} className="h-14 rounded-2xl" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No rankings found yet</p>
          <p className="text-[10px] opacity-60 max-w-[200px] mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Leaderboards initialize after the latest class results are synced. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Top 3 */}
          {entries.map((s, i) => {
            const isMe = s.id === studentId
            const medal = MEDALS[i]
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                  isMe ? 'ring-2 ring-primary/40 bg-primary/5' : 'bg-[var(--input)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${medal?.bg ?? 'bg-[var(--card)]'} ${medal?.text ?? ''}`}>
                    {medal ? medal.label : `#${i + 1}`}
                  </div>
                  <div>
                    <p className="font-black text-sm leading-tight" style={{ color: isMe ? 'var(--primary)' : 'var(--text)' }}>
                      {s.full_name}{isMe && ' ⭐'}
                    </p>
                    {s.class_name && (
                      <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{s.class_name}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-sm text-amber-500">{(s.xp ?? 0).toLocaleString()}</div>
                  <div className="text-[9px] uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>XP</div>
                </div>
              </motion.div>
            )
          })}

          {/* Student's own entry if NOT in top 3 */}
          {!inTop && myEntry && myRank != null && (
            <>
              {/* Dotted separator */}
              <div className="flex items-center gap-2 py-1 px-1">
                <div className="flex-1 border-t border-dashed" style={{ borderColor: 'var(--card-border)' }} />
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  #{myRank} · Your Position
                </span>
                <div className="flex-1 border-t border-dashed" style={{ borderColor: 'var(--card-border)' }} />
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between p-3 rounded-2xl ring-2 ring-primary/30 bg-primary/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 bg-primary/10 text-primary">
                    #{myRank}
                  </div>
                  <div>
                    <p className="font-black text-sm leading-tight text-primary">{myEntry.full_name} ⭐</p>
                    {myEntry.class_name && (
                      <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{myEntry.class_name}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-sm text-amber-500">{(myEntry.xp ?? 0).toLocaleString()}</div>
                  <div className="text-[9px] uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>XP</div>
                </div>
              </motion.div>
            </>
          )}
        </div>
      )}
    </Card>
  )
}

export default function StudentPerformance() {
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()

  // ── Core metrics: rank + XP ──────────────────────────────────
  const { data: metrics, status: mStatus, refetch: mRefetch } = usePageData({
    cacheKey: ['performance-metrics-v2', student?.id || 'anon'],
    fetcher: async () => {
      // Global rank via RPC (with fallback)
      let rank: number | string = '?'
      try {
        const { data: rankData } = await supabase.rpc('get_student_rank', { input_student_id: student?.id })
        if (rankData != null) rank = rankData
      } catch {
        // Fallback: count students with more XP
        const { count } = await supabase
          .from('students').select('*', { count: 'exact', head: true })
          .gt('xp', student?.xp || 0)
        rank = (count ?? 0) + 1
      }

      return { data: { rank, xp: student?.xp || 0 }, error: null }
    },
    enabled: !!student?.id,
  })

  // ── Performance data: quiz + assignment accuracy ─────────────
  const { data: perf, status: pStatus } = usePageData({
    cacheKey: ['performance-intel-v2', student?.id || 'anon'],
    fetcher: async () => {
      const [subRes, quizRes] = await Promise.all([
        supabase.from('submissions')
          .select('*, assignment:assignments(title, subject:subjects(name))')
          .eq('student_id', student?.id),
        supabase.from('quiz_attempts')
          .select('*, quiz:quizzes(title, subject:subjects(name))')
          .eq('student_id', student?.id),
      ])

      const submissions = subRes.data || []
      const quizzes = quizRes.data || []

      // Subject breakdown
      const bySubject: Record<string, { total: number; max: number }> = {}
      submissions.forEach(s => {
        const name = s.assignment?.subject?.name || 'General'
        if (!bySubject[name]) bySubject[name] = { total: 0, max: 0 }
        bySubject[name].total += (s.marks || 0)
        bySubject[name].max += (s.max_marks || 100)
      })
      quizzes.forEach(q => {
        const name = q.quiz?.subject?.name || 'General'
        if (!bySubject[name]) bySubject[name] = { total: 0, max: 0 }
        bySubject[name].total += (q.score || 0)
        bySubject[name].max += (q.total_marks || 100)
      })
      const subjectStats = Object.entries(bySubject)
        .map(([name, d]) => ({ name, score: d.max > 0 ? Math.round((d.total / d.max) * 100) : 0 }))

      // Accuracy timeline
      const timeline = [
        ...submissions.map(s => ({
          date: formatDate(s.created_at, 'short'),
          accuracy: Math.round(((s.marks || 0) / (s.max_marks || 100)) * 100),
        })),
        ...quizzes.map(q => ({
          date: formatDate(q.completed_at || q.created_at, 'short'),
          accuracy: Math.round(q.percentage || 0),
        })),
      ].slice(-12)

      const totalMarks = submissions.reduce((a, s) => a + (s.marks || 0), 0) +
        quizzes.reduce((a, q) => a + (q.score || 0), 0)
      const totalMax = submissions.reduce((a, s) => a + (s.max_marks || 100), 0) +
        quizzes.reduce((a, q) => a + (q.total_marks || 100), 0)
      const accuracy = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0

      return {
        data: { accuracy, subjectStats, timeline, submissions, quizzes },
        error: subRes.error || quizRes.error,
      }
    },
    enabled: !!student?.id,
  })

  // ── Teacher-awarded badges ────────────────────────────────────
  const { data: earnedBadges } = usePageData({
    cacheKey: ['earned-badges', student?.id || ''],
    fetcher: async () => {
      const { data } = await supabase
        .from('study_badges')
        .select('*, teacher:teachers(full_name), subject:subjects(name)')
        .eq('student_id', student?.id)
        .not('awarded_by_teacher_id', 'is', null)
        .order('achieved_at', { ascending: false })
      return { data: data || [], error: null }
    },
    enabled: !!student?.id,
  })

  // ── Class leaderboard (top 3) ────────────────────────────────
  const { data: classLb, status: classLbStatus } = usePageData({
    cacheKey: ['lb-class', student?.class_id || ''],
    fetcher: async () => {
      if (!student?.class_id) return { data: [], error: null }
      // Try RPC first (faster, uses SECURITY DEFINER to bypass RLS)
      try {
        const { data, error } = await supabase.rpc('get_class_leaderboard', {
          p_class_id: student.class_id, p_limit: 3
        })
        if (!error && data) return { data, error: null }
        if (error) console.warn('[ClassLB] RPC Error:', error.message)
      } catch (e) {
        console.warn('[ClassLB] RPC Catch:', e)
      }
      // Fallback: direct query
      const { data, error } = await supabase
        .from('students').select('id, full_name, xp')
        .eq('class_id', student.class_id).order('xp', { ascending: false }).limit(3)
      return { data: (data || []).map(s => ({ ...s, avatar_url: null, class_name: null })), error }
    },
    enabled: !!student?.class_id,
  })

  // ── My class rank ────────────────────────────────────────────
  const { data: myClassRank } = usePageData({
    cacheKey: ['my-class-rank', student?.id || ''],
    fetcher: async () => {
      if (!student?.class_id) return { data: null, error: null }
      try {
        const { data, error } = await supabase.rpc('get_my_class_rank', {
          p_student_id: student.id, p_class_id: student.class_id
        })
        if (!error && data != null) return { data, error: null }
        if (error) console.warn('[ClassRank] RPC Error:', error.message)
      } catch (e) {
        console.warn('[ClassRank] RPC Catch:', e)
      }
      const { count } = await supabase.from('students')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', student.class_id).gt('xp', student?.xp || 0)
      return { data: (count ?? 0) + 1, error: null }
    },
    enabled: !!student?.id && !!student?.class_id,
  })

  // ── Curriculum leaderboard (top 3) ──────────────────────────
  const curriculumId = (student as any)?.curriculum_id
  const { data: currLb, status: currLbStatus } = usePageData({
    cacheKey: ['lb-curriculum', curriculumId || ''],
    fetcher: async () => {
      if (!curriculumId) return { data: [], error: null }
      try {
        const { data, error } = await supabase.rpc('get_curriculum_leaderboard', {
          p_curriculum_id: curriculumId, p_limit: 3
        })
        if (!error && data) return { data, error: null }
        if (error) console.warn('[CurrLB] RPC Error:', error.message)
      } catch (e) {
        console.warn('[CurrLB] RPC Catch:', e)
      }
      const { data, error } = await supabase
        .from('students').select('id, full_name, xp')
        .eq('curriculum_id', curriculumId).order('xp', { ascending: false }).limit(3)
      return { data: (data || []).map(s => ({ ...s, avatar_url: null, class_name: null })), error }
    },
    enabled: !!curriculumId,
  })

  // ── My curriculum rank ───────────────────────────────────────
  const { data: myCurrRank } = usePageData({
    cacheKey: ['my-curr-rank', student?.id || ''],
    fetcher: async () => {
      if (!curriculumId) return { data: null, error: null }
      try {
        const { data, error } = await supabase.rpc('get_my_curriculum_rank', {
          p_student_id: student?.id, p_curriculum_id: curriculumId
        })
        if (!error && data != null) return { data, error: null }
        if (error) console.warn('[CurrRank] RPC Error:', error.message)
      } catch (e) {
        console.warn('[CurrRank] RPC Catch:', e)
      }
      const { count } = await supabase.from('students')
        .select('*', { count: 'exact', head: true })
        .eq('curriculum_id', curriculumId).gt('xp', student?.xp || 0)
      return { data: (count ?? 0) + 1, error: null }
    },
    enabled: !!student?.id && !!curriculumId,
  })

  // ── Tuition center leaderboard (top 3) ──────────────────────
  const centerId = (student as any)?.tuition_center_id
  const { data: centerLb, status: centerLbStatus } = usePageData({
    cacheKey: ['lb-center', centerId || ''],
    fetcher: async () => {
      if (!centerId) return { data: [], error: null }
      try {
        const { data, error } = await supabase.rpc('get_center_leaderboard', {
          p_center_id: centerId, p_limit: 3
        })
        if (!error && data) return { data, error: null }
        if (error) console.warn('[CenterLB] RPC Error:', error.message)
      } catch (e) {
        console.warn('[CenterLB] RPC Catch:', e)
      }
      const { data, error } = await supabase
        .from('students').select('id, full_name, xp')
        .eq('tuition_center_id', centerId).order('xp', { ascending: false }).limit(3)
      return { data: (data || []).map(s => ({ ...s, avatar_url: null, class_name: null })), error }
    },
    enabled: !!centerId,
  })

  // ── My center rank ───────────────────────────────────────────
  const { data: myCenterRank } = usePageData({
    cacheKey: ['my-center-rank', student?.id || ''],
    fetcher: async () => {
      if (!centerId) return { data: null, error: null }
      try {
        const { data, error } = await supabase.rpc('get_my_center_rank', {
          p_student_id: student?.id, p_center_id: centerId
        })
        if (!error && data != null) return { data, error: null }
        if (error) console.warn('[CenterRank] RPC Error:', error.message)
      } catch (e) {
        console.warn('[CenterRank] RPC Catch:', e)
      }
      const { count } = await supabase.from('students')
        .select('*', { count: 'exact', head: true })
        .eq('tuition_center_id', centerId).gt('xp', student?.xp || 0)
      return { data: (count ?? 0) + 1, error: null }
    },
    enabled: !!student?.id && !!centerId,
  })


  // ── Student's own entry (for when outside top 3) ─────────────
  const myStudentEntry: LbEntry | null = student
    ? { id: student.id, full_name: (student as any).full_name || 'You', xp: student.xp || 0 }
    : null

  // ── Loading / Error states ───────────────────────────────────
  if (mStatus === 'loading') {
    return (
      <div className="p-6 space-y-8">
        <div className="flex justify-between items-center">
          <ShimmerSkeleton className="w-64 h-10" />
          <ShimmerSkeleton className="w-32 h-10" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <ShimmerSkeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <ShimmerSkeleton key={i} className="h-64" />)}
        </div>
      </div>
    )
  }

  if (mStatus === 'error' || mStatus === 'timeout') {
    return <PageStates status={mStatus} onRetry={mRefetch} />
  }

  const { rank, xp } = metrics!
  const intel = perf ?? { accuracy: 0, subjectStats: [], timeline: [], submissions: [], quizzes: [] }

  return (
    <div className="p-6 space-y-8 pb-32">

      {/* === HEADER === */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>My Progress</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your rankings, accuracy, and academic growth</p>
        </div>
        <Button variant="secondary" size="sm"><Download size={16} className="mr-2" /> Export Report</Button>
      </div>

      {/* === STAT CARDS === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Global Rank" value={`#${rank}`} icon={<Star size={20} className="text-amber-500" />} />
        <StatCard title="Avg. Accuracy" value={`${intel.accuracy}%`} icon={<Target size={20} className="text-primary" />} />
        <StatCard title="Total XP" value={xp.toLocaleString()} icon={<Zap size={20} className="text-amber-500" />} />
      </div>

      {/* === RANKING PODIUMS === */}
      <div>
        <h2 className="text-base font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Trophy size={18} className="text-amber-500" /> Your Rankings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LeaderboardPodium
            title="In Your Class"
            icon={<Users size={16} className="text-primary" />}
            entries={classLb || []}
            studentId={student?.id}
            myRank={myClassRank ?? null}
            myEntry={myStudentEntry}
            isLoading={classLbStatus === 'loading'}
          />
          <LeaderboardPodium
            title="In Your Curriculum"
            icon={<BookOpen size={16} className="text-emerald-500" />}
            entries={currLb || []}
            studentId={student?.id}
            myRank={myCurrRank ?? null}
            myEntry={myStudentEntry}
            isLoading={currLbStatus === 'loading'}
          />
          <LeaderboardPodium
            title="At Your Centre"
            icon={<Building2 size={16} className="text-violet-500" />}
            entries={centerLb || []}
            studentId={student?.id}
            myRank={myCenterRank ?? null}
            myEntry={myStudentEntry}
            isLoading={centerLbStatus === 'loading'}
          />
        </div>

      </div>

      {/* === PERFORMANCE CHARTS === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subject Mastery */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Mastery by Subject</h3>
          {intel.subjectStats.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Complete assignments or quizzes to see your mastery breakdown.
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intel.subjectStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', background: 'var(--card)' }} />
                  <Bar dataKey="score" fill="var(--primary)" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Accuracy Timeline */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Accuracy Growth</h3>
          {intel.timeline.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Submit more work to track your accuracy over time.
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={intel.timeline}>
                  <defs>
                    <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', background: 'var(--card)' }} />
                  <Area type="monotone" dataKey="accuracy" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorAcc)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* === RECENT SUCCESSES === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Recent Successes</h3>
          {intel.submissions.length === 0 && intel.quizzes.length === 0 ? (
            <div className="text-center p-12 bg-[var(--card)] border border-dashed rounded-3xl">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Complete goals to see your success log grow!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                ...intel.submissions.slice(0, 2).map(s => ({
                  label: s.assignment?.title || 'Assignment',
                  date: formatDate(s.created_at),
                  pct: Math.round(((s.marks || 0) / (s.max_marks || 100)) * 100),
                  type: 'assignment',
                })),
                ...intel.quizzes.slice(0, 2).map(q => ({
                  label: q.quiz?.title || 'Quiz',
                  date: formatDate(q.completed_at || q.created_at),
                  pct: Math.round(q.percentage || 0),
                  type: 'quiz',
                })),
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-5 rounded-3xl bg-[var(--card)] border border-[var(--card-border)] hover:bg-[var(--input)] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{item.label}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.date} · {item.type === 'quiz' ? 'Quiz' : 'Assignment'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg text-primary">{item.pct}%</p>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Verified</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trophy Cabinet */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Trophy Cabinet</h3>

          {/* Teacher-awarded badges */}
          {earnedBadges && earnedBadges.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Awarded by Teachers</p>
              {earnedBadges.slice(0, 4).map((b: any, i: number) => {
                const ICONS: Record<string, string> = {
                  consistent_student: '📝', high_achiever: '🎯', most_improved: '📈',
                  star_of_the_week: '⭐', class_champion: '🏆', effort_award: '💪',
                  creativity_award: '🎨', teamwork_star: '🤝',
                }
                return (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-2xl border" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                    <span className="text-2xl shrink-0">{ICONS[b.badge_type] || '🏅'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-xs capitalize" style={{ color: 'var(--text)' }}>
                        {b.badge_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>
                        {b.awarded_reason || 'Awarded by your teacher'}
                        {b.teacher?.full_name && ` · ${b.teacher.full_name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Zap size={10} className="text-amber-500 fill-amber-500" />
                      <span className="text-[9px] font-black text-amber-500">
                        +{(b.metadata as any)?.xp_reward || 50}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Auto-earned milestone badges */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Novice Explorer', icon: '🐣', show: true },
              { label: 'Steady Pace', icon: '👣', show: (student?.streak_count || 0) >= 3 },
              { label: 'Brave Adventurer', icon: '🌱', show: xp >= 1000 },
              { label: 'Fire Keeper', icon: '🔥', show: (student?.streak_count || 0) >= 7 },
              { label: 'Quiz Champion', icon: '⚡', show: intel.quizzes.length >= 5 },
              { label: 'Committed', icon: '💪', show: intel.submissions.length >= 5 },
            ].filter(b => b.show).map((b, i) => (
              <Card key={i} className="p-4 text-center space-y-2 hover:scale-105 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 flex items-center justify-center mx-auto text-2xl">
                  {b.icon}
                </div>
                <p className="text-[10px] font-bold" style={{ color: 'var(--text)' }}>{b.label}</p>
              </Card>
            ))}
            <Card className="p-4 flex flex-col items-center justify-center border-dashed border-2 group hover:bg-[var(--input)] cursor-pointer">
              <Plus size={20} className="opacity-40 group-hover:scale-110 transition-all" style={{ color: 'var(--text-muted)' }} />
              <p className="text-[8px] font-bold uppercase mt-2" style={{ color: 'var(--text-muted)' }}>Unlock More</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
