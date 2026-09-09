'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  TrendingUp, Users, CheckCircle2, AlertTriangle,
  ChevronRight, Clock, FileText
} from 'lucide-react'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useTeacherIdentity } from '@/hooks/useTeacherIdentity'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface StudentRow {
  studentId: string
  studentName: string
  sessions: number
  completed: number
  missed: number
  corrections: number
  objectives: number
  objectivesDone: number
  submitted: number
  reviewed: number
  reflections: number
}

export default function TeacherAnalyticsPage() {
  const supabase = getSupabaseBrowserClient()
  const { teacherIds, hasTeacherIdentity } = useTeacherIdentity()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<StudentRow[]>([])

  useEffect(() => {
    if (hasTeacherIdentity && teacherIds.length > 0) load()
  }, [hasTeacherIdentity, teacherIds])

  const load = async () => {
    setLoading(true)
    try {
      const { data: assignments } = await supabase
        .from('homeschool_teacher_assignments')
        .select('enrollment_id, enrollment:homeschool_enrollments(id, student:students(id, full_name))')
        .in('teacher_id', teacherIds)

      const enrollMap = new Map<string, { studentId: string; studentName: string }>()
      for (const a of assignments || []) {
        const e = a.enrollment as any
        if (!e?.id || !e?.student?.id || enrollMap.has(e.id)) continue
        enrollMap.set(e.id, { studentId: e.student.id, studentName: e.student.full_name || 'Unknown' })
      }

      const enrollmentIds = [...enrollMap.keys()]
      if (enrollmentIds.length === 0) {
        setRows([])
        return
      }

      const [{ data: sessions }, { data: linkedAssignments }] = await Promise.all([
        supabase
          .from('learning_sessions')
          .select('id, enrollment_id, status, student_status')
          .in('enrollment_id', enrollmentIds)
          .neq('status', 'CANCELLED'),
        supabase
          .from('assignments')
          .select('id, session_id, submissions(id, status)')
          .eq('program', 'HOMESCHOOLING')
          .not('session_id', 'is', null),
      ])

      const sessionIds = (sessions || []).map((s: any) => s.id)
      const [{ data: objectives }, { data: reflections }] = await Promise.all([
        sessionIds.length > 0
          ? supabase.from('learning_objectives').select('id, is_completed, session_id').in('session_id', sessionIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from('learning_reflections').select('id, session_id').in(
          'session_id', sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000']
        ),
      ])

      const sessionToEnrollment = new Map((sessions || []).map((s: any) => [s.id, s.enrollment_id]))
      const subsBySession = new Map<string, any[]>()
      for (const a of linkedAssignments || []) {
        if (!a.session_id || !sessionToEnrollment.has(a.session_id)) continue
        const list = subsBySession.get(a.session_id) || []
        for (const sub of a.submissions || []) list.push(sub)
        subsBySession.set(a.session_id, list)
      }

      const agg = new Map<string, StudentRow>()
      for (const [enrollmentId, info] of enrollMap) {
        agg.set(enrollmentId, {
          studentId: info.studentId, studentName: info.studentName,
          sessions: 0, completed: 0, missed: 0, corrections: 0,
          objectives: 0, objectivesDone: 0, submitted: 0, reviewed: 0, reflections: 0,
        })
      }

      for (const s of sessions || []) {
        const row = agg.get(s.enrollment_id)
        if (!row) continue
        row.sessions += 1
        if (s.student_status === 'COMPLETED') row.completed += 1
        if (s.status === 'MISSED') row.missed += 1
        if (s.status === 'CORRECTIONS_REQUIRED') row.corrections += 1
        for (const sub of subsBySession.get(s.id) || []) {
          if (['submitted', 'marked', 'returned'].includes(sub.status)) row.submitted += 1
          if (['marked', 'returned'].includes(sub.status)) row.reviewed += 1
        }
      }

      for (const o of objectives || []) {
        const row = agg.get(sessionToEnrollment.get(o.session_id) || '')
        if (!row) continue
        row.objectives += 1
        if (o.is_completed) row.objectivesDone += 1
      }

      for (const r of reflections || []) {
        const row = agg.get(sessionToEnrollment.get(r.session_id) || '')
        if (row) row.reflections += 1
      }

      setRows([...agg.values()].sort((a, b) => a.studentName.localeCompare(b.studentName)))
    } finally {
      setLoading(false)
    }
  }

  const totals = useMemo(() => ({
    students: rows.length,
    sessions: rows.reduce((n, r) => n + r.sessions, 0),
    completed: rows.reduce((n, r) => n + r.completed, 0),
    attention: rows.reduce((n, r) => n + r.missed + r.corrections, 0),
  }), [rows])

  const needsAttention = rows.filter((r) => r.missed > 0 || r.corrections > 0)

  if (!hasTeacherIdentity) {
    return (
      <div className="p-6 min-h-[80vh] flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>You need a teacher profile to view analytics.</p>
        </Card>
      </div>
    )
  }

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
            <TrendingUp size={24} style={{ color: '#10B981' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
              Homeschool Analytics
            </h1>
            <p className="text-xs font-bold opacity-50 mt-0.5">Evidence across your assigned students — no vanity metrics</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Students" value={totals.students} icon={<Users size={18} />} />
        <StatCard title="Sessions" value={totals.sessions} icon={<FileText size={18} />} />
        <StatCard title="Completed" value={totals.completed} icon={<CheckCircle2 size={18} />} />
        <StatCard title="Need Attention" value={totals.attention} icon={<AlertTriangle size={18} />} />
      </div>

      {needsAttention.length > 0 && (
        <Card className="p-5" style={{ borderLeft: '3px solid #EF4444' }}>
          <h2 className="text-sm font-black mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <AlertTriangle size={15} style={{ color: '#EF4444' }} /> Needs Your Attention
          </h2>
          <div className="space-y-2">
            {needsAttention.map((r) => (
              <Link key={r.studentId} href={`/teacher/homeschooling/student/${r.studentId}`}>
                <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:opacity-85" style={{ background: 'rgba(239,68,68,0.05)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{r.studentName}</p>
                    <p className="text-[11px] font-semibold opacity-50">
                      {r.missed > 0 ? `${r.missed} missed` : ''}{r.missed > 0 && r.corrections > 0 ? ' · ' : ''}{r.corrections > 0 ? `${r.corrections} awaiting corrections` : ''}
                    </p>
                  </div>
                  <ChevronRight size={15} className="opacity-30 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="text-sm font-black mb-4" style={{ color: 'var(--text)' }}>Per-Student Evidence</h2>
        {rows.length === 0 ? (
          <p className="text-xs font-medium opacity-50 text-center py-6">No assigned homeschooling students yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const sessionPct = r.sessions > 0 ? Math.round((r.completed / r.sessions) * 100) : 0
              const objPct = r.objectives > 0 ? Math.round((r.objectivesDone / r.objectives) * 100) : 0
              return (
                <Link key={r.studentId} href={`/teacher/homeschooling/student/${r.studentId}`}>
                  <div className="p-4 rounded-xl cursor-pointer hover:opacity-90 transition-opacity" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>{r.studentName}</p>
                      <div className="flex gap-1.5 shrink-0">
                        {r.corrections > 0 && <Badge variant="danger" className="text-[9px]">{r.corrections} corrections</Badge>}
                        {r.missed > 0 && <Badge variant="warning" className="text-[9px]">{r.missed} missed</Badge>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                      {[
                        { label: 'Sessions', value: `${r.completed}/${r.sessions}` },
                        { label: 'Objectives', value: `${objPct}%` },
                        { label: 'Submitted', value: r.submitted },
                        { label: 'Reviewed', value: r.reviewed },
                        { label: 'Reflections', value: r.reflections },
                      ].map((c) => (
                        <div key={c.label} className="p-2 rounded-lg" style={{ background: 'var(--card)' }}>
                          <div className="text-sm font-black" style={{ color: 'var(--text)' }}>{c.value}</div>
                          <div className="text-[9px] font-bold uppercase opacity-50">{c.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{ background: 'var(--card-border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${sessionPct}%`, background: 'linear-gradient(90deg, #4F8CFF, #10B981)' }} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Card>

      <div className="flex items-center gap-2 text-[11px] font-medium opacity-50">
        <Clock size={12} />
        <span>Completion reflects started objectives, submitted work, reviews and reflections — never app opens.</span>
      </div>
    </div>
  )
}
