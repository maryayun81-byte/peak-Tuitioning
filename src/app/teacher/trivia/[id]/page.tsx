'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, ChevronLeft, Users, BarChart3,
  Crown, Clock, CheckCircle2, XCircle, AlertCircle,
  Zap, Lock, TrendingUp, Medal, Timer, Target
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

interface Session {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'published' | 'closed'
  class_ids: string[]
  duration_minutes: number | null
  subject?: { name: string } | null
}
interface Question {
  id: string; position: number; text: string
  options: { id: string; text: string }[]
  correct_option_id: string; marks: number; time_seconds: number
}
interface Group {
  id: string; name: string; class_id: string; created_by: string
  avatar_url: string | null
  members: { student_id: string; student: { full_name: string } | null }[]
  class?: { name: string } | null
  submission?: Submission | null
}
interface Submission {
  id: string; group_id: string; score: number; correct_count: number
  wrong_count: number; time_taken_seconds: number | null; auto_submitted: boolean
  group_avatar?: string | null
  max_streak?: number
  answers: Record<string, string | null>
  question_timings: Record<string, { time_taken_s: number; timed_out: boolean }>
  total_questions: number
}

function fmtDuration(s: number | null) {
  if (!s) return '—'
  const m = Math.floor(s / 60), sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

export default function TeacherTriviaDetailPage() {
  const supabase = getSupabaseBrowserClient()
  const { teacher } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'groups' | 'analytics' | 'leaderboard'>('leaderboard')

  useEffect(() => { if (sessionId) loadAll() }, [sessionId])

  const loadAll = async () => {
    setLoading(true)
    const [sRes, qRes, gRes] = await Promise.all([
      supabase.from('trivia_sessions').select('*, subject:subjects(name)').eq('id', sessionId).single(),
      supabase.from('trivia_questions').select('*').eq('session_id', sessionId).order('position'),
      supabase.from('trivia_groups')
        .select(`*, class:classes(name), members:trivia_group_members(student_id, student:students(full_name))`)
        .eq('session_id', sessionId),
    ])
    if (sRes.error || !sRes.data) { toast.error('Trivia not found'); router.push('/teacher/trivia'); return }
    setSession(sRes.data)
    setQuestions(qRes.data ?? [])

    // Attach submissions
    const groupIds = (gRes.data ?? []).map((g: any) => g.id)
    const { data: subs } = groupIds.length > 0
      ? await supabase.from('trivia_submissions').select('*').in('group_id', groupIds)
      : { data: [] }

    const enriched = (gRes.data ?? []).map((g: any) => ({
      ...g,
      submission: (subs ?? []).find((s: any) => s.group_id === g.id) 
        ? { ...(subs ?? []).find((s: any) => s.group_id === g.id), group_avatar: g.avatar_url } 
        : null,
    }))
    setGroups(enriched)
    setLoading(false)
  }

  const updateStatus = async (status: 'published' | 'closed') => {
    const { error } = await supabase.from('trivia_sessions').update({ status }).eq('id', sessionId)
    if (error) { toast.error('Failed'); return }
    setSession(prev => prev ? { ...prev, status } : prev)
    toast.success(status === 'published' ? '🚀 Trivia is now live!' : 'Trivia closed.')
  }

  // ── Derived analytics ─────────────────────────────────────────
  const submissions = groups.map(g => g.submission).filter(Boolean) as Submission[]

  const leaderboard = useMemo(() => {
    return [...groups]
      .filter(g => g.submission)
      .sort((a, b) => {
        const sa = a.submission!, sb = b.submission!
        if (sb.score !== sa.score) return sb.score - sa.score
        return (sa.time_taken_seconds ?? 99999) - (sb.time_taken_seconds ?? 99999)
      })
  }, [groups])

  const questionStats = useMemo(() => {
    return questions.map(q => {
      const timings = submissions.flatMap(s => {
        const t = s.question_timings?.[q.id]
        return t ? [t] : []
      })
      const answers = submissions.map(s => s.answers?.[q.id])
      const correct = answers.filter(a => a === q.correct_option_id).length
      const timedOut = timings.filter(t => t.timed_out).length
      const avgTime = timings.length > 0
        ? Math.round(timings.reduce((a, t) => a + t.time_taken_s, 0) / timings.length)
        : null
      return { ...q, correct, wrong: answers.length - correct, timedOut, avgTime, total: submissions.length }
    })
  }, [questions, submissions])

  const classComparison = useMemo(() => {
    const map: Record<string, { name: string; scores: number[]; times: number[] }> = {}
    groups.forEach(g => {
      if (!g.class) return
      if (!map[g.class_id]) map[g.class_id] = { name: g.class.name, scores: [], times: [] }
      if (g.submission) {
        map[g.class_id].scores.push(g.submission.score)
        if (g.submission.time_taken_seconds) map[g.class_id].times.push(g.submission.time_taken_seconds)
      }
    })
    return Object.values(map).map(c => ({
      name: c.name,
      avg: c.scores.length ? Math.round(c.scores.reduce((a, b) => a + b, 0) / c.scores.length) : 0,
      avgTime: c.times.length ? Math.round(c.times.reduce((a, b) => a + b, 0) / c.times.length) : null,
    }))
  }, [groups])

  const slowestGroup = useMemo(() => {
    return leaderboard[leaderboard.length - 1] ?? null
  }, [leaderboard])

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-64 rounded-xl animate-pulse" style={{ background: 'var(--input)' }} />
      <div className="h-40 rounded-2xl animate-pulse" style={{ background: 'var(--input)' }} />
    </div>
  )
  if (!session) return null

  const totalMarks = questions.reduce((a, q) => a + q.marks, 0)

  return (
    <div className="p-6 pb-20 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/trivia')} className="mt-1">
          <ChevronLeft size={18} />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{session.title}</h1>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${session.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' : session.status === 'closed' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-500/10 text-slate-500'}`}>
              {session.status === 'published' ? '● Live' : session.status === 'closed' ? 'Closed' : 'Draft'}
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {questions.length} questions · {totalMarks} marks · {groups.length} groups · {submissions.length} submitted
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {session.status === 'draft' && <Button size="sm" onClick={() => updateStatus('published')}><Zap size={14} /> Publish</Button>}
          {session.status === 'published' && <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white border-0" onClick={() => updateStatus('closed')}><Lock size={14} /> Close</Button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-hide shrink-0" style={{ background: 'var(--input)' }}>
        {(['leaderboard','groups','analytics'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all capitalize ${tab === t ? 'bg-[var(--card)] text-primary shadow-sm' : 'text-[var(--text-muted)]'}`}>
            {t === 'leaderboard' && <Crown size={15} />}
            {t === 'groups' && <Users size={15} />}
            {t === 'analytics' && <BarChart3 size={15} />}
            {t}
          </button>
        ))}
      </div>

      {/* ── Leaderboard Tab ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {tab === 'leaderboard' && (
          <motion.div key="lb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {leaderboard.length === 0 ? (
              <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
                <Trophy size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No submissions yet</p>
              </div>
            ) : leaderboard.map((g, rank) => {
              const sub = g.submission!
              const pct = totalMarks > 0 ? Math.round((sub.score / totalMarks) * 100) : 0
              const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : null
              return (
                <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rank * 0.04 }}>
                  <Card className={`p-4 ${rank === 0 ? 'border-amber-400/40' : ''}`} style={rank === 0 ? { background: 'rgba(251,191,36,0.04)' } : {}}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--input)] border border-[var(--card-border)] p-1 shrink-0 overflow-hidden">
                        {g.submission?.group_avatar ? (
                           <img src={g.submission.group_avatar} alt="" className="w-full h-full object-contain" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-xs font-black">
                              {g.name[0]}
                           </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm mb-1" style={{ color: 'var(--text)' }}>{g.name}
                          {g.class && <span className="ml-2 text-[10px] font-normal px-2 py-0.5 rounded-full" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>{g.class.name}</span>}
                          {sub.auto_submitted && <span className="ml-2 text-[10px] font-bold text-amber-500 px-2 py-0.5 rounded-full bg-amber-500/10">⏰ Auto-submitted</span>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1 text-emerald-500 font-bold"><CheckCircle2 size={11} /> {sub.correct_count} correct</span>
                          <span className="flex items-center gap-1 text-red-400"><XCircle size={11} /> {sub.wrong_count} wrong</span>
                          <span className="flex items-center gap-1"><Clock size={11} /> {fmtDuration(sub.time_taken_seconds)}</span>
                          {sub.max_streak !== undefined && sub.max_streak > 0 && (
                             <span className="flex items-center gap-1 text-orange-500 font-bold"><Zap size={11} /> {sub.max_streak} streak</span>
                          )}
                          <span className="flex items-center gap-1 -ml-0.5">
                            {g.members?.map((m, mi) => (
                              <span key={mi} className="font-medium" style={{ color: 'var(--text-muted)' }}>{m.student?.full_name?.split(' ')[0]}{mi < g.members.length - 1 ? ', ' : ''}</span>
                            ))}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-2xl font-black ${pct >= 70 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-red-400'}`}>{sub.score}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>/ {totalMarks} pts</div>
                        <div className="text-xs font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>{pct}%</div>
                      </div>
                    </div>
                    {rank === 0 && (
                      <div className="w-full h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: 'var(--input)' }}>
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* ── Groups Tab ──────────────────────────────────────────── */}
        {tab === 'groups' && (
          <motion.div key="grp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {groups.length === 0 ? (
              <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No groups formed yet</p>
              </div>
            ) : groups.map((g, i) => (
              <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shrink-0 overflow-hidden border border-[var(--card-border)] bg-[var(--input)]">
                      {g.avatar_url ? (
                         <img src={g.avatar_url} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center text-xs" style={{ background: g.submission ? 'var(--primary)' : 'var(--input)', color: g.submission ? 'white' : 'var(--text-muted)' }}>
                            {g.name[0]}
                         </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm mb-1" style={{ color: 'var(--text)' }}>
                        {g.name}
                        {g.class && <span className="ml-2 text-[10px] font-normal px-2 py-0.5 rounded-full" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>{g.class.name}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {g.members?.map((m, mi) => (
                          <span key={mi} className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                            {m.student?.full_name ?? 'Unknown'}
                          </span>
                        ))}
                        {(!g.members || g.members.length === 0) && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No members</span>}
                      </div>
                    </div>
                    {g.submission ? (
                      <div className="text-right shrink-0">
                        <div className="text-xl font-black text-emerald-500">{g.submission.score}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>/ {totalMarks}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmtDuration(g.submission.time_taken_seconds)}</div>
                      </div>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-lg font-bold text-amber-500" style={{ background: 'rgba(245,158,11,0.1)' }}>Pending</span>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Analytics Tab ───────────────────────────────────────── */}
        {tab === 'analytics' && (
          <motion.div key="ana" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {submissions.length === 0 ? (
              <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
                <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No submissions yet to analyze</p>
              </div>
            ) : (
              <>
                {/* Class comparison */}
                {classComparison.length > 1 && (
                  <Card className="p-5">
                    <h3 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                      <TrendingUp size={16} className="text-primary" /> Class Performance Comparison
                    </h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={classComparison}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: 'var(--card)', color: 'var(--text)' }} />
                        <Bar dataKey="avg" name="Avg Score" radius={[6,6,0,0]}>
                          {classComparison.map((_, i) => <Cell key={i} fill={`hsl(${260 + i * 40}, 80%, 60%)`} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* Per-question analysis */}
                <Card className="p-5">
                  <h3 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    <Target size={16} className="text-primary" /> Per-Question Analysis
                  </h3>
                  <div className="space-y-3">
                    {questionStats.map((q, i) => {
                      const correctPct = q.total > 0 ? Math.round((q.correct / q.total) * 100) : 0
                      const timedOutPct = q.total > 0 ? Math.round((q.timedOut / q.total) * 100) : 0
                      return (
                        <div key={q.id} className="p-3 rounded-xl" style={{ background: 'var(--input)' }}>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 text-white" style={{ background: 'var(--primary)' }}>{i+1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold mb-2 truncate" style={{ color: 'var(--text)' }}>{q.text}</p>
                              <div className="flex flex-wrap gap-4">
                                <div>
                                  <div className="text-[10px] mb-1 font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Correct Rate</div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: 'var(--card-border)' }}>
                                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${correctPct}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-emerald-500">{correctPct}%</span>
                                  </div>
                                </div>
                                {q.avgTime !== null && (
                                  <div>
                                    <div className="text-[10px] mb-1 font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Avg Time</div>
                                    <span className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--text)' }}>
                                      <Clock size={10} /> {q.avgTime}s / {q.time_seconds}s
                                    </span>
                                  </div>
                                )}
                                {q.timedOut > 0 && (
                                  <div>
                                    <div className="text-[10px] mb-1 font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Timed Out</div>
                                    <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                                      <Timer size={10} /> {q.timedOut} group{q.timedOut !== 1 ? 's' : ''} ({timedOutPct}%)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>

                {/* Auto-submitted groups */}
                {submissions.some(s => s.auto_submitted) && (
                  <Card className="p-5">
                    <h3 className="font-black text-sm mb-3 flex items-center gap-2 text-amber-500">
                      <Timer size={16} /> Auto-Submitted Groups (Overall Timer Expired)
                    </h3>
                    <div className="space-y-2">
                      {groups.filter(g => g.submission?.auto_submitted).map(g => (
                        <div key={g.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <AlertCircle size={14} className="text-amber-500 shrink-0" />
                          <span className="text-sm font-bold text-amber-600">{g.name}</span>
                          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{g.submission?.score} / {totalMarks} pts</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Slowest group detail */}
                {slowestGroup?.submission && (
                  <Card className="p-5">
                    <h3 className="font-black text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                      <Clock size={16} className="text-red-400" /> Slowest Group: {slowestGroup.name}
                    </h3>
                    <div className="space-y-2">
                      {questions.map((q, i) => {
                        const timing = slowestGroup.submission!.question_timings?.[q.id]
                        const answer = slowestGroup.submission!.answers?.[q.id]
                        const isCorrect = answer === q.correct_option_id
                        const chosenOpt = q.options.find(o => o.id === answer)
                        return (
                          <div key={q.id} className={`p-3 rounded-xl border ${timing?.timed_out ? 'border-amber-400/40' : isCorrect ? 'border-emerald-500/30' : 'border-red-400/30'}`}
                            style={{ background: timing?.timed_out ? 'rgba(245,158,11,0.05)' : isCorrect ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)' }}>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-black shrink-0" style={{ color: 'var(--text-muted)' }}>Q{i+1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold mb-1 truncate" style={{ color: 'var(--text)' }}>{q.text}</p>
                                <div className="flex flex-wrap gap-3 text-[11px]">
                                  {timing?.timed_out ? (
                                    <span className="text-amber-500 font-bold flex items-center gap-1"><Timer size={10} /> Timed out</span>
                                  ) : (
                                    <span className={`font-bold flex items-center gap-1 ${isCorrect ? 'text-emerald-500' : 'text-red-400'}`}>
                                      {isCorrect ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                      {chosenOpt?.text ?? 'No answer'}
                                    </span>
                                  )}
                                  {timing && <span style={{ color: 'var(--text-muted)' }} className="flex items-center gap-1"><Clock size={10} /> {timing.time_taken_s}s</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
