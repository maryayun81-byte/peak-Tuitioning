'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Users, BookOpen, Calendar, Clock, CheckCircle2,
  AlertCircle, TrendingUp, FileText, ChevronRight,
  GraduationCap, ClipboardList, ArrowLeft, Sparkles,
  Target, BarChart3, Star, Zap, ShieldCheck
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton'
import { useTeacherIdentity } from '@/hooks/useTeacherIdentity'
import { usePageData } from '@/hooks/usePageData'
import { formatDate } from '@/lib/utils'
import { SESSION_STATUS_COLORS, getSessionModeLabel } from '@/lib/homeschooling/constants'
import { attachTeacherAssignments } from '@/lib/homeschooling/enrollment-subjects'
import Link from 'next/link'

export default function TeacherHomeschoolStudentPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const supabase = getSupabaseBrowserClient()
  const { teacherIds, hasTeacherIdentity } = useTeacherIdentity()
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'assignments' | 'signals'>('overview')

  const { data: studentData, status } = usePageData({
    cacheKey: ['teacher-homeschool-student', studentId, teacherIds.join('|')],
    fetcher: async () => {
      if (!studentId || teacherIds.length === 0) return { data: null, error: 'Missing params' }

      const { data: student } = await supabase
        .from('students')
        .select('id, full_name, admission_number, user_id, avatar_url')
        .eq('id', studentId)
        .maybeSingle()

      if (!student) return { data: null, error: 'Student not found' }

      const { data: enrollments } = await supabase
        .from('homeschool_enrollments')
        .select(`
          id, status, start_date, end_date, grade_level, academic_year, program_name,
          subjects:homeschool_subjects(
            id, subject_id, is_active,
            subject:subjects(id, name, code)
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (enrollments && enrollments.length > 0) {
        const { data: tas } = await supabase
          .from('homeschool_teacher_assignments')
          .select('id, enrollment_id, subject_id, teacher_id, assignment_type, teacher:teachers(id, full_name)')
          .in('enrollment_id', enrollments.map((e: any) => e.id))
        attachTeacherAssignments(enrollments as any[], tas || [])
      }

      const activeEnrollment = enrollments?.find((e: any) => e.status === 'ACTIVE') || enrollments?.[0]
      const enrollmentIds = enrollments?.map((e: any) => e.id) || []

      const [sessionsRes, submissionsRes, progressRes] = await Promise.all([
        enrollmentIds.length > 0
          ? supabase
              .from('learning_sessions')
              .select(`
                id, enrollment_id, subject_id, day, start_time, end_time,
                learning_mode, topic, learning_goal, status, student_status, submission_required,
                subject:subjects(id, name),
                teacher:teachers(id, full_name),
                objectives:learning_objectives(id, title, is_completed),
                mission:learning_missions(id, title, is_started, is_completed),
                reflection:learning_reflections(id, accomplished, difficulties, confidence),
                week:homeschool_weeks(id, week_number, title)
              `)
              .in('enrollment_id', enrollmentIds)
              .order('day', { ascending: true })
              .order('start_time', { ascending: true })
          : { data: [], error: null },
        supabase
          .from('submissions')
          .select('id, assignment_id, status, submitted_at, marks, feedback, assignment:assignments(id, title, max_marks)')
          .eq('student_id', studentId)
          .order('submitted_at', { ascending: false })
          .limit(20),
        supabase
          .from('learning_objectives')
          .select('id, is_completed')
          .in('session_id', (sessionsRes?.data || []).map((s: any) => s.id))
      ])

      const allSessions = sessionsRes?.data || []
      const subjectProgress = new Map<string, { name: string; total: number; completed: number; objectives: number; completedObjectives: number }>()

      for (const session of allSessions) {
        const key = session.subject_id
        if (!subjectProgress.has(key)) {
          subjectProgress.set(key, {
            name: session.subject?.name || 'Unknown',
            total: 0,
            completed: 0,
            objectives: 0,
            completedObjectives: 0,
          })
        }
        const entry = subjectProgress.get(key)!
        entry.total++
        if (session.student_status === 'COMPLETED' || session.status === 'COMPLETED') {
          entry.completed++
        }
        entry.objectives += (session.objectives || []).length
        entry.completedObjectives += (session.objectives || []).filter((o: any) => o.is_completed).length
      }

      const correctionsRequired = allSessions.filter(
        (s: any) => s.status === 'CORRECTIONS_REQUIRED'
      )

      return {
        data: {
          student,
          enrollments: enrollments || [],
          activeEnrollment,
          sessions: allSessions,
          submissions: submissionsRes.data || [],
          subjectProgress: Array.from(subjectProgress.values()),
          correctionsRequired,
          totalObjectives: progressRes.data?.length || 0,
          completedObjectives: (progressRes.data || []).filter((o: any) => o.is_completed).length,
        },
        error: null,
      }
    },
    enabled: hasTeacherIdentity && !!studentId,
  })

  const loading = status === 'loading' && !studentData

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <ShimmerSkeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <ShimmerSkeleton key={i} className="h-24" />)}
        </div>
        <ShimmerSkeleton className="h-96" />
      </div>
    )
  }

  if (!studentData) {
    return (
      <div className="p-6 min-h-[80vh] flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-lg font-black uppercase tracking-tight mb-2" style={{ color: 'var(--text)' }}>Student Not Found</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>This student doesn&apos;t exist or you don&apos;t have access.</p>
          <Link href="/teacher/homeschooling">
            <Button variant="secondary"><ArrowLeft size={16} /> Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const { student, activeEnrollment, sessions, submissions, subjectProgress, correctionsRequired, totalObjectives, completedObjectives } = studentData

  const completedSessions = sessions.filter(
    (s: any) => s.student_status === 'COMPLETED' || s.status === 'COMPLETED'
  ).length
  const inProgressSessions = sessions.filter(
    (s: any) => s.student_status === 'IN_PROGRESS'
  ).length
  const sessionProgress = sessions.length > 0 ? Math.round((completedSessions / sessions.length) * 100) : 0
  const objectiveProgress = totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0

  const tabs = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
    { key: 'sessions', label: 'Sessions', icon: <BookOpen size={14} /> },
    { key: 'assignments', label: 'Assignments', icon: <FileText size={14} /> },
    { key: 'signals', label: 'Signals', icon: <Sparkles size={14} /> },
  ]

  return (
    <div className="p-6 space-y-8 pb-12 bg-gradient-to-b from-transparent to-[var(--bg)] min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link href="/teacher/homeschooling" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-6 hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Back to Homeschool Hub
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl shrink-0">
              {student.avatar_url ? (
                <img src={student.avatar_url} alt={student.full_name} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                student.full_name?.[0] || '?'
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase italic" style={{ color: 'var(--text)' }}>
                {student.full_name}
              </h1>
              <p className="font-bold text-sm" style={{ color: 'var(--text-muted)' }}>
                {activeEnrollment?.grade_level} · {activeEnrollment?.program_name || 'Homeschooling'} · {activeEnrollment?.academic_year}
              </p>
            </div>
          </div>
          <Badge variant={activeEnrollment?.status === 'ACTIVE' ? 'success' : 'muted'} className="text-[10px] uppercase">
            {activeEnrollment?.status || 'No active enrollment'}
          </Badge>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Sessions"
          value={`${completedSessions}/${sessions.length}`}
          icon={<BookOpen size={20} />}
          subValue={`${sessionProgress}% complete`}
          className="border-none shadow-xl shadow-slate-200/5"
        />
        <StatCard
          title="Objectives"
          value={`${completedObjectives}/${totalObjectives}`}
          icon={<Target size={20} />}
          subValue={`${objectiveProgress}% complete`}
          className="border-none shadow-xl shadow-emerald-50/5"
        />
        <StatCard
          title="Submissions"
          value={submissions.length}
          icon={<FileText size={20} />}
          subValue={`${submissions.filter((s: any) => s.status === 'marked' || s.status === 'returned').length} reviewed`}
          className="border-none shadow-xl shadow-amber-50/5"
        />
        <StatCard
          title="Corrections"
          value={correctionsRequired.length}
          icon={<AlertCircle size={20} />}
          subValue={correctionsRequired.length > 0 ? 'Needs attention' : 'All clear'}
          className="border-none shadow-xl shadow-red-50/5"
        />
      </div>

      <div className="flex items-center gap-2 p-1 rounded-2xl w-fit" style={{ background: 'var(--input)' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.key
                ? 'bg-[var(--card)] text-primary shadow-md ring-1 ring-black/5'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6 border-2 border-primary/5 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]">
            <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 mb-6">
              <BarChart3 size={14} className="text-primary" /> Subject Progress
            </h3>
            <div className="space-y-4">
              {subjectProgress.length === 0 ? (
                <p className="text-xs italic opacity-40 text-center py-4">No subject data available</p>
              ) : (
                subjectProgress.map((sp: any, i: number) => {
                  const percent = sp.total > 0 ? Math.round((sp.completed / sp.total) * 100) : 0
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black" style={{ color: 'var(--text)' }}>{sp.name}</span>
                        <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                          {sp.completed}/{sp.total} sessions
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--input)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className="h-full rounded-full bg-primary"
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          <Card className="p-6 border-2 border-primary/5 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]">
            <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 mb-6">
              <Sparkles size={14} className="text-primary" /> Recent Reflections
            </h3>
            <div className="space-y-4">
              {sessions.filter((s: any) => s.reflection).slice(0, 4).map((session: any) => (
                <div key={session.id} className="p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {session.subject?.name} · {session.day}
                    </span>
                    <Badge variant={
                      session.reflection?.confidence === 'very_confident' ? 'success' :
                      session.reflection?.confidence === 'comfortable' ? 'info' :
                      session.reflection?.confidence === 'getting_there' ? 'warning' :
                      'danger'
                    } className="text-[8px] uppercase">
                      {session.reflection?.confidence?.replace(/_/g, ' ') || 'N/A'}
                    </Badge>
                  </div>
                  {session.reflection?.accomplished && (
                    <p className="text-[11px] font-bold line-clamp-2" style={{ color: 'var(--text)' }}>
                      {session.reflection.accomplished}
                    </p>
                  )}
                  {session.reflection?.difficulties && (
                    <p className="text-[10px] mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                      Difficulties: {session.reflection.difficulties}
                    </p>
                  )}
                </div>
              ))}
              {sessions.filter((s: any) => s.reflection).length === 0 && (
                <p className="text-xs italic opacity-40 text-center py-4">No reflections submitted yet</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'sessions' && (
        <Card className="p-6 border-2 border-primary/5 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]">
          <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 mb-6">
            <BookOpen size={14} className="text-primary" /> All Sessions
          </h3>
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-xs italic opacity-40 text-center py-8">No sessions found</p>
            ) : (
              sessions.map((session: any) => (
                <div key={session.id} className="p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                          {session.day} · {session.start_time} - {session.end_time}
                        </span>
                        <Badge variant={
                          session.status === 'COMPLETED' ? 'success' :
                          session.status === 'IN_PROGRESS' ? 'warning' :
                          session.status === 'CORRECTIONS_REQUIRED' ? 'danger' :
                          session.status === 'MISSED' ? 'danger' :
                          'secondary'
                        } className="text-[9px] uppercase">
                          {session.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm font-black" style={{ color: 'var(--text)' }}>{session.topic || session.subject?.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                          {session.subject?.name}
                        </span>
                        <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                          {getSessionModeLabel(session.learning_mode)}
                        </span>
                      </div>
                      {session.objectives && session.objectives.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <Target size={10} style={{ color: 'var(--text-muted)' }} />
                          <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                            {(session.objectives as any[]).filter((o: any) => o.is_completed).length}/{session.objectives.length} objectives
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {activeTab === 'assignments' && (
        <Card className="p-6 border-2 border-primary/5 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]">
          <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 mb-6">
            <FileText size={14} className="text-primary" /> Submissions & Assignments
          </h3>
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <p className="text-xs italic opacity-40 text-center py-8">No submissions yet</p>
            ) : (
              submissions.map((sub: any) => (
                <div key={sub.id} className="p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black" style={{ color: 'var(--text)' }}>
                        {sub.assignment?.title || 'Assignment'}
                      </p>
                      <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Submitted {formatDate(sub.submitted_at, 'relative')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sub.marks !== null && sub.assignment?.max_marks && (
                        <Badge variant={sub.marks / sub.assignment.max_marks >= 0.7 ? 'success' : sub.marks / sub.assignment.max_marks >= 0.5 ? 'warning' : 'danger'} className="text-[10px]">
                          {sub.marks}/{sub.assignment.max_marks}
                        </Badge>
                      )}
                      <Badge variant={
                        sub.status === 'marked' || sub.status === 'returned' ? 'success' :
                        sub.status === 'submitted' ? 'warning' :
                        'muted'
                      } className="text-[9px] uppercase">
                        {sub.status}
                      </Badge>
                    </div>
                  </div>
                  {sub.feedback && (
                    <div className="mt-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1">Feedback</p>
                      <p className="text-[11px] font-bold" style={{ color: 'var(--text)' }}>{sub.feedback}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {activeTab === 'signals' && (
        <div className="space-y-6">
          <Card className="p-6 border-2 border-amber-500/10 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]">
            <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 mb-6">
              <AlertCircle size={14} className="text-amber-500" /> Areas Needing Attention
            </h3>
            <div className="space-y-3">
              {correctionsRequired.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-green-500/10">
                    <CheckCircle2 size={24} className="text-green-500" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>No corrections required</p>
                </div>
              ) : (
                correctionsRequired.map((session: any) => (
                  <div key={session.id} className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="danger" className="text-[9px] uppercase">Corrections Required</Badge>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{session.subject?.name}</span>
                    </div>
                    <p className="text-sm font-black" style={{ color: 'var(--text)' }}>{session.topic || 'Session'}</p>
                    {session.notes && (
                      <p className="text-[11px] mt-2 font-bold" style={{ color: 'var(--text-muted)' }}>{session.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6 border-2 border-primary/5 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]">
            <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 mb-6">
              <Sparkles size={14} className="text-primary" /> Learning Signals
            </h3>
            <div className="space-y-4">
              {subjectProgress.filter((sp: any) => sp.total > 0 && (sp.completed / sp.total) < 0.5).map((sp: any, i: number) => (
                <div key={i} className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <TrendingUp size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black" style={{ color: 'var(--text)' }}>{sp.name}</p>
                      <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                        {Math.round((sp.completed / sp.total) * 100)}% completion rate · May need additional support
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {subjectProgress.filter((sp: any) => sp.total > 0 && (sp.completed / sp.total) < 0.5).length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>All subjects progressing well</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
