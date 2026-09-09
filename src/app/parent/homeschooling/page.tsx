'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap, BookOpen, Calendar, Clock, CheckCircle2,
  AlertCircle, TrendingUp, FileText, ChevronRight,
  Users, ClipboardList, Sparkles, ArrowRight, Target,
  ShieldCheck, Star, Zap
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import { SESSION_STATUS_COLORS, getSessionModeLabel } from '@/lib/homeschooling/constants'
import { attachTeacherAssignments } from '@/lib/homeschooling/enrollment-subjects'
import Link from 'next/link'

export default function ParentHomeschoolingPage() {
  const supabase = getSupabaseBrowserClient()
  const { profile, parent, selectedStudent } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)

  useEffect(() => {
    if (selectedStudent?.id && parent?.id) loadDashboard()
  }, [selectedStudent, parent])

  const loadDashboard = async () => {
    if (!selectedStudent?.id || !parent?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data: link } = await supabase
        .from('parent_student_links')
        .select('id')
        .eq('parent_id', parent.id)
        .eq('student_id', selectedStudent.id)
        .maybeSingle()

      if (!link) {
        setLoading(false)
        return
      }

      const { data: enrollment } = await supabase
        .from('homeschool_enrollments')
        .select(`
          id, status, start_date, end_date, grade_level, academic_year, program_name,
          subjects:homeschool_subjects(
            id, subject_id, is_active,
            subject:subjects(id, name, code)
          ),
          weeks:homeschool_weeks(
            id, week_number, title, start_date, end_date, status,
            sessions:learning_sessions(
              id, subject_id, day, start_time, end_time, learning_mode, topic,
              status, student_status, submission_required,
              subject:subjects(id, name),
              teacher:teachers(id, full_name),
              objectives:learning_objectives(id, is_completed),
              reflection:learning_reflections(id, accomplished, difficulties, confidence)
            )
          )
        `)
        .eq('student_id', selectedStudent.id)
        .eq('status', 'ACTIVE')
        .maybeSingle()

      if (enrollment) {
        const { data: tas } = await supabase
          .from('homeschool_teacher_assignments')
          .select('id, enrollment_id, subject_id, teacher_id, assignment_type, teacher:teachers(id, full_name)')
          .eq('enrollment_id', (enrollment as any).id)
        attachTeacherAssignments([enrollment as any], tas || [])
      }

      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, status, submitted_at, marks, feedback, assignment:assignments(id, title, max_marks)')
        .eq('student_id', selectedStudent.id)
        .order('submitted_at', { ascending: false })
        .limit(20)

      const allSessions = (enrollment?.weeks || []).flatMap((w: any) => w.sessions || [])
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay() + 1)
      startOfWeek.setHours(0, 0, 0, 0)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      const weekSessions = allSessions.filter((s: any) => {
        const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(s.day)
        if (dayIndex === -1) return false
        const sessionDate = new Date(now)
        sessionDate.setDate(now.getDate() - now.getDay() + dayIndex)
        return sessionDate >= startOfWeek && sessionDate <= endOfWeek
      })

      const subjectHighlights = new Map<string, {
        name: string
        total: number
        completed: number
        needAttention: boolean
        recentReflection: any
      }>()

      for (const session of allSessions) {
        const key = session.subject_id
        if (!subjectHighlights.has(key)) {
          subjectHighlights.set(key, {
            name: session.subject?.name || 'Unknown',
            total: 0,
            completed: 0,
            needAttention: false,
            recentReflection: null,
          })
        }
        const entry = subjectHighlights.get(key)!
        entry.total++
        if (session.student_status === 'COMPLETED' || session.status === 'COMPLETED') {
          entry.completed++
        }
        if (session.status === 'CORRECTIONS_REQUIRED') {
          entry.needAttention = true
        }
        if (session.reflection && !entry.recentReflection) {
          entry.recentReflection = session.reflection
        }
      }

      const weekStats = {
        planned: weekSessions.length,
        completed: weekSessions.filter((s: any) => s.student_status === 'COMPLETED' || s.status === 'COMPLETED').length,
        submitted: (submissions || []).filter((s: any) => {
          const d = new Date(s.submitted_at)
          return d >= startOfWeek && d <= endOfWeek
        }).length,
        reviewed: (submissions || []).filter((s: any) => {
          const d = new Date(s.submitted_at)
          return d >= startOfWeek && d <= endOfWeek && (s.status === 'marked' || s.status === 'returned')
        }).length,
      }

      const teacherFeedback = (submissions || [])
        .filter((s: any) => s.feedback)
        .slice(0, 3)
        .map((s: any) => ({
          assignment: s.assignment?.title || 'Assignment',
          feedback: s.feedback,
          date: s.submitted_at,
        }))

      const areasNeedingAttention = allSessions
        .filter((s: any) => s.status === 'CORRECTIONS_REQUIRED')
        .slice(0, 5)
        .map((s: any) => ({
          id: s.id,
          subject: s.subject?.name || 'Unknown',
          topic: s.topic || 'Session',
          day: s.day,
        }))

      const upcomingSessions = allSessions
        .filter((s: any) => s.student_status === 'UPCOMING' || s.student_status === 'NOT_STARTED')
        .slice(0, 5)

      setDashboardData({
        enrollment,
        weekStats,
        subjectHighlights: Array.from(subjectHighlights.values()),
        teacherFeedback,
        areasNeedingAttention,
        upcomingSessions,
        totalSessions: allSessions.length,
        completedSessions: allSessions.filter((s: any) => s.student_status === 'COMPLETED' || s.status === 'COMPLETED').length,
      })
    } catch (err) {
      console.error('[ParentHomeschooling] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />

  if (!selectedStudent) {
    return (
      <div className="p-4 sm:p-6 min-h-[85vh] flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <GraduationCap size={48} className="text-primary mx-auto mb-4" />
          <h2 className="text-lg font-black uppercase tracking-tight mb-2" style={{ color: 'var(--text)' }}>Select a Student</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Choose a student from the dashboard to view their homeschooling progress.</p>
        </Card>
      </div>
    )
  }

  if (!dashboardData || !dashboardData.enrollment) {
    return (
      <div className="p-4 sm:p-6 min-h-[85vh] flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <GraduationCap size={40} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-3" style={{ color: 'var(--text)' }}>No Homeschooling Enrollment</h2>
          <p className="text-sm font-bold max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
            {selectedStudent.full_name} doesn&apos;t have an active homeschooling enrollment yet. Contact your administrator to enroll.
          </p>
        </Card>
      </div>
    )
  }

  const { enrollment, weekStats, subjectHighlights, teacherFeedback, areasNeedingAttention, upcomingSessions, totalSessions, completedSessions } = dashboardData
  const overallProgress = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0

  return (
    <div className="p-6 space-y-10 pb-40">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 w-fit border" style={{ borderColor: 'rgba(79,140,255,0.3)' }}>
              <GraduationCap size={14} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--primary)' }}>Homeschooling Portal</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase italic" style={{ color: 'var(--text)' }}>
              {selectedStudent.full_name}&apos;s Journey
            </h1>
            <p className="font-bold text-sm uppercase tracking-wide max-w-xl" style={{ color: 'var(--text-muted)' }}>
              {enrollment.program_name} · {enrollment.grade_level} · {enrollment.academic_year}
            </p>
            <Link href="/parent/homeschooling/report">
              <Button size="sm" variant="secondary" className="mt-2">
                <FileText size={14} /> Weekly Report
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Overall Progress"
          value={`${overallProgress}%`}
          icon={<TrendingUp size={20} />}
          subValue={`${completedSessions}/${totalSessions} sessions`}
          className="border-none shadow-xl shadow-slate-200/5"
        />
        <StatCard
          title="This Week"
          value={`${weekStats.completed}/${weekStats.planned}`}
          icon={<Calendar size={20} />}
          subValue="sessions completed"
          className="border-none shadow-xl shadow-emerald-50/5"
        />
        <StatCard
          title="Submissions"
          value={weekStats.submitted}
          icon={<FileText size={20} />}
          subValue={`${weekStats.reviewed} reviewed`}
          className="border-none shadow-xl shadow-amber-50/5"
        />
        <StatCard
          title="Active Subjects"
          value={subjectHighlights.length}
          icon={<BookOpen size={20} />}
          className="border-none shadow-xl shadow-indigo-50/5"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <BookOpen size={16} /> Learning Highlights
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {subjectHighlights.map((sh: any, i: number) => {
                const percent = sh.total > 0 ? Math.round((sh.completed / sh.total) * 100) : 0
                return (
                  <Card key={i} className="p-6 border-2 border-primary/5 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <BookOpen size={18} className="text-primary" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black" style={{ color: 'var(--text)' }}>{sh.name}</h4>
                          <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                            {sh.completed}/{sh.total} sessions
                          </p>
                        </div>
                      </div>
                      {sh.needAttention && (
                        <Badge variant="danger" className="text-[9px] uppercase">Needs Attention</Badge>
                      )}
                    </div>
                    <div className="h-2.5 w-full rounded-full overflow-hidden mb-3" style={{ background: 'var(--input)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className={`h-full rounded-full ${percent >= 70 ? 'bg-green-500' : percent >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                      />
                    </div>
                    {sh.recentReflection?.accomplished && (
                      <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1">Latest Reflection</p>
                        <p className="text-[11px] font-bold line-clamp-2" style={{ color: 'var(--text)' }}>{sh.recentReflection.accomplished}</p>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>

          {areasNeedingAttention.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <AlertCircle size={16} className="text-amber-500" /> Areas Needing Attention
                </h3>
              </div>
              <div className="space-y-4">
                {areasNeedingAttention.map((area: any) => (
                  <div key={area.id} className="p-5 rounded-3xl border-2 border-dashed border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <AlertCircle size={18} className="text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs font-black" style={{ color: 'var(--text)' }}>{area.subject} · {area.topic}</p>
                        <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{area.day} · Corrections required</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <Calendar size={16} /> Upcoming Sessions
              </h3>
            </div>
            <div className="space-y-4">
              {upcomingSessions.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>All sessions completed for now</p>
                </Card>
              ) : (
                upcomingSessions.map((session: any) => (
                  <div key={session.id} className="p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Clock size={18} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-black" style={{ color: 'var(--text)' }}>{session.topic || session.subject?.name}</p>
                          <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                            {session.day} · {session.start_time} - {session.end_time} · {session.subject?.name}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[9px] uppercase">
                        {getSessionModeLabel(session.learning_mode)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-10">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <ClipboardList size={16} /> Teacher Feedback
              </h3>
            </div>
            <div className="space-y-4">
              {teacherFeedback.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>No feedback yet</p>
                </Card>
              ) : (
                teacherFeedback.map((fb: any, i: number) => (
                  <Card key={i} className="p-5 border-none shadow-md" style={{ background: 'var(--card)' }}>
                    <div className="flex gap-4">
                      <div className="p-2.5 rounded-xl h-fit" style={{ background: 'var(--input)' }}>
                        <Sparkles size={14} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-tight truncate" style={{ color: 'var(--text)' }}>{fb.assignment}</p>
                        <p className="text-[11px] mt-1 font-medium line-clamp-3" style={{ color: 'var(--text-muted)' }}>{fb.feedback}</p>
                        <p className="text-[8px] mt-2 font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{formatDate(fb.date, 'short')}</p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <Card className="p-8 bg-gradient-to-br from-indigo-600 to-purple-700 text-white space-y-6 rounded-[3rem] relative overflow-hidden shadow-2xl shadow-indigo-500/30 border-none">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md shadow-xl border border-white/20">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h4 className="font-black text-sm uppercase tracking-[0.2em] mb-2 leading-tight">Homeschool Support</h4>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-relaxed">
                Your child&apos;s teacher is actively monitoring their homeschooling progress. Reach out for updates.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
