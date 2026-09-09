'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap, Printer, CheckCircle2, AlertTriangle,
  Award, CalendarDays, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { getCurrentWeekIndex, formatTimeRange } from '@/lib/homeschooling/constants'

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function ParentReportPage() {
  const supabase = getSupabaseBrowserClient()
  const { parent } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<any[]>([])
  const [childId, setChildId] = useState('')
  const [enrollment, setEnrollment] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [weekIndex, setWeekIndex] = useState(0)

  useEffect(() => {
    if (parent?.id) loadChildren()
  }, [parent?.id])

  useEffect(() => {
    if (childId) loadReport()
  }, [childId])

  const loadChildren = async () => {
    const { data } = await supabase
      .from('parent_student_links')
      .select('student:students(id, full_name)')
      .eq('parent_id', parent!.id)
    const list = (data || []).map((r: any) => r.student).filter(Boolean)
    setChildren(list)
    if (list.length > 0) setChildId(list[0].id)
    else setLoading(false)
  }

  const loadReport = async () => {
    setLoading(true)
    try {
      const { data: enroll } = await supabase
        .from('homeschool_enrollments')
        .select(`
          id, status, start_date, end_date, grade_level, academic_year, program_name,
          student:students(id, full_name, admission_number),
          subjects:homeschool_subjects(
            id, subject_id,
            subject:subjects(id, name)
          ),
          weeks:homeschool_weeks(
            id, week_number, title, start_date, end_date, status,
            sessions:learning_sessions(
              id, subject_id, day, start_time, end_time, learning_mode, topic,
              status, student_status,
              subject:subjects(name),
              teacher:teachers(full_name),
              objectives:learning_objectives(id, is_completed),
              reflection:learning_reflections(confidence)
            )
          )
        `)
        .eq('student_id', childId)
        .eq('status', 'ACTIVE')
        .maybeSingle()

      setEnrollment(enroll || null)
      if (enroll) {
        const sorted = [...(enroll.weeks || [])].sort((a: any, b: any) => a.week_number - b.week_number)
        enroll.weeks = sorted
        setWeekIndex(getCurrentWeekIndex(sorted))
      }

      const { data: subs } = await supabase
        .from('submissions')
        .select('id, status, marks, grade, feedback, strengths, weaknesses, submitted_at, assignment:assignments(id, title, max_marks)')
        .eq('student_id', childId)
        .order('submitted_at', { ascending: false })
        .limit(30)
      setSubmissions(subs || [])
    } finally {
      setLoading(false)
    }
  }

  const weeks = useMemo(() => enrollment?.weeks || [], [enrollment])
  const week = weeks[weekIndex]
  const weekSessions = useMemo(
    () => ((week?.sessions || []) as any[]).filter((s) => s.status !== 'CANCELLED'),
    [week]
  )

  const stats = useMemo(() => {
    const total = weekSessions.length
    const completed = weekSessions.filter((s) => s.student_status === 'COMPLETED').length
    const submitted = weekSessions.filter((s) => ['SUBMITTED', 'UNDER_REVIEW', 'SUBMISSION_PENDING'].includes(s.student_status) || s.status === 'UNDER_REVIEW').length
    const corrections = weekSessions.filter((s) => s.status === 'CORRECTIONS_REQUIRED').length
    const missed = weekSessions.filter((s) => s.status === 'MISSED').length
    return { total, completed, submitted, corrections, missed }
  }, [weekSessions])

  const subjectRows = useMemo(() => {
    const map = new Map<string, { name: string; total: number; completed: number; objectives: number; objectivesDone: number }>()
    for (const s of weekSessions) {
      const key = s.subject_id || s.subject?.name || 'Other'
      if (!map.has(key)) map.set(key, { name: s.subject?.name || 'Other', total: 0, completed: 0, objectives: 0, objectivesDone: 0 })
      const row = map.get(key)!
      row.total += 1
      if (s.student_status === 'COMPLETED') row.completed += 1
      for (const o of s.objectives || []) {
        row.objectives += 1
        if (o.is_completed) row.objectivesDone += 1
      }
    }
    return [...map.values()]
  }, [weekSessions])

  const feedback = useMemo(
    () => submissions.filter((s: any) => s.feedback || s.marks != null).slice(0, 8),
    [submissions]
  )

  const attention = useMemo(
    () => weekSessions.filter((s) => s.status === 'CORRECTIONS_REQUIRED' || s.status === 'MISSED'),
    [weekSessions]
  )

  const nextSteps = useMemo(() => {
    const all = weeks.flatMap((w: any) => (w.sessions || []).map((s: any) => ({ ...s, week_number: w.week_number })))
    return all
      .filter((s: any) => s.status !== 'CANCELLED' && ['UPCOMING', 'NOT_STARTED', 'READY'].includes(s.student_status))
      .sort((a: any, b: any) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.start_time.localeCompare(b.start_time))
      .slice(0, 5)
  }, [weeks])

  const generatedOn = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return <SkeletonDashboard />

  if (children.length === 0) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center max-w-md mx-auto">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No linked students found.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <style>{`
        @media print {
          aside, header, nav { display: none !important; }
          main { padding: 0 !important; }
          main > div { margin-left: 0 !important; }
          body { background: #fff !important; }
          .hs-no-print { display: none !important; }
          .hs-report-card { box-shadow: none !important; border: 1px solid #ddd !important; break-inside: avoid; }
        }
      `}</style>

      <div className="flex items-center gap-3 hs-no-print">
        <Link href="/parent/homeschooling">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
        <div className="flex-1" />
        <select
          value={childId}
          onChange={(e) => setChildId(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm font-bold outline-none"
          style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
        >
          {children.map((c: any) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
        <Button size="sm" onClick={() => window.print()}><Printer size={14} /> Print / PDF</Button>
      </div>

      {!enrollment ? (
        <Card className="p-12 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No active homeschooling enrollment for this student.</p>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="text-center pt-2">
            <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--primary)' }}>
              Peak Performance Tutoring · Homeschooling
            </p>
            <h1 className="text-2xl font-black mt-1" style={{ color: 'var(--text)' }}>Weekly Learning Report</h1>
            <p className="text-xs font-semibold opacity-60 mt-1">
              {(enrollment.student as any)?.full_name} · Grade {enrollment.grade_level} · {enrollment.academic_year} · Generated {generatedOn}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 hs-no-print">
            <Button variant="ghost" size="sm" disabled={weekIndex <= 0} onClick={() => setWeekIndex((i) => i - 1)}>← Prev</Button>
            <span className="text-sm font-black min-w-[140px] text-center" style={{ color: 'var(--text)' }}>
              {week?.title || `Week ${week?.week_number || '—'}`}
            </span>
            <Button variant="ghost" size="sm" disabled={weekIndex >= weeks.length - 1} onClick={() => setWeekIndex((i) => i + 1)}>Next →</Button>
          </div>

          {!week ? (
            <Card className="p-8 text-center hs-report-card">
              <p className="text-sm font-semibold opacity-60">No weeks published yet.</p>
            </Card>
          ) : (
            <>
              <Card className="p-5 hs-report-card">
                <h2 className="text-sm font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text)' }}>
                  This Week · {week.start_date} → {week.end_date}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  {[
                    { label: 'Planned', value: stats.total },
                    { label: 'Completed', value: stats.completed },
                    { label: 'Submitted', value: stats.submitted },
                    { label: 'Corrections', value: stats.corrections },
                    { label: 'Missed', value: stats.missed },
                  ].map((s) => (
                    <div key={s.label} className="p-3 rounded-xl" style={{ background: 'var(--input)' }}>
                      <div className="text-xl font-black" style={{ color: 'var(--text)' }}>{s.value}</div>
                      <div className="text-[10px] font-bold uppercase opacity-50">{s.label}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5 hs-report-card">
                <h2 className="text-sm font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text)' }}>Subjects</h2>
                {subjectRows.length === 0 ? (
                  <p className="text-xs opacity-50">No sessions this week.</p>
                ) : (
                  <div className="space-y-2">
                    {subjectRows.map((r) => (
                      <div key={r.name} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--input)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{r.name}</p>
                          <p className="text-[11px] opacity-50 font-semibold">
                            {r.completed}/{r.total} sessions · {r.objectivesDone}/{r.objectives} objectives
                          </p>
                        </div>
                        <div className="w-24 h-2 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--card-border)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0}%`, background: '#10B981' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5 hs-report-card">
                <h2 className="text-sm font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text)' }}>Sessions</h2>
                <div className="space-y-1.5">
                  {weekSessions
                    .slice()
                    .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.start_time.localeCompare(b.start_time))
                    .map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--input)' }}>
                        {s.student_status === 'COMPLETED'
                          ? <CheckCircle2 size={15} style={{ color: '#10B981' }} className="shrink-0" />
                          : <CalendarDays size={15} className="opacity-40 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>
                            {s.topic || s.subject?.name}
                          </p>
                          <p className="text-[10px] opacity-50 font-semibold">
                            {s.day} · {formatTimeRange(s.start_time, s.end_time)}{s.teacher?.full_name ? ` · ${s.teacher.full_name}` : ''}
                          </p>
                        </div>
                        <Badge
                          variant={s.student_status === 'COMPLETED' ? 'success' : s.status === 'MISSED' ? 'danger' : s.status === 'CORRECTIONS_REQUIRED' ? 'warning' : 'muted'}
                          className="text-[9px] uppercase shrink-0"
                        >
                          {(s.student_status === 'COMPLETED' ? 'Completed' : s.status || '').replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    ))}
                </div>
              </Card>

              {feedback.length > 0 && (
                <Card className="p-5 hs-report-card">
                  <h2 className="text-sm font-black uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    <Award size={14} style={{ color: '#F59E0B' }} /> Teacher Feedback
                  </h2>
                  <div className="space-y-3">
                    {feedback.map((f: any) => (
                      <div key={f.id} className="p-3 rounded-xl" style={{ background: 'var(--input)' }}>
                        <p className="text-xs font-black" style={{ color: 'var(--text)' }}>
                          {f.assignment?.title}
                          {f.marks != null ? ` · ${f.marks}${f.assignment?.max_marks ? `/${f.assignment.max_marks}` : ''}` : ''}
                          {f.grade ? ` · ${f.grade}` : ''}
                        </p>
                        {f.feedback && <p className="text-xs mt-1 leading-relaxed opacity-80">“{f.feedback}”</p>}
                        {f.strengths && <p className="text-[11px] mt-1"><span className="font-black" style={{ color: '#10B981' }}>Strengths: </span>{f.strengths}</p>}
                        {f.weaknesses && <p className="text-[11px] mt-1"><span className="font-black" style={{ color: '#EF4444' }}>Work on: </span>{f.weaknesses}</p>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {attention.length > 0 && (
                <Card className="p-5 hs-report-card" style={{ borderLeft: '3px solid #EF4444' }}>
                  <h2 className="text-sm font-black uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    <AlertTriangle size={14} style={{ color: '#EF4444' }} /> Needs Attention
                  </h2>
                  <ul className="space-y-1.5">
                    {attention.map((s: any) => (
                      <li key={s.id} className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                        {s.subject?.name}: {s.topic || 'session'} — {s.status === 'MISSED' ? 'missed, catch-up pending' : 'corrections requested by teacher'}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {nextSteps.length > 0 && (
                <Card className="p-5 hs-report-card">
                  <h2 className="text-sm font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text)' }}>Coming Up Next</h2>
                  <ul className="space-y-1.5">
                    {nextSteps.map((s: any) => (
                      <li key={s.id} className="text-xs font-semibold opacity-80">
                        {s.day} {formatTimeRange(s.start_time, s.end_time)} — {s.subject?.name}{s.topic ? `: ${s.topic}` : ''}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <p className="text-[10px] text-center opacity-40 font-medium">
                Grounded in recorded sessions, submissions and teacher feedback · Peak Performance Tutoring
              </p>
            </>
          )}
        </motion.div>
      )}
    </div>
  )
}
