'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, BookOpen, Calendar, Clock, CheckCircle2,
  AlertCircle, TrendingUp, FileText, ChevronRight,
  GraduationCap, ClipboardList, Sparkles, ArrowRight
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard, SkeletonList } from '@/components/ui/Skeleton'
import { useTeacherIdentity } from '@/hooks/useTeacherIdentity'
import { usePageData } from '@/hooks/usePageData'
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton'
import { formatDate, getLocalISODate } from '@/lib/utils'
import { SESSION_STATUS_COLORS } from '@/lib/homeschooling/constants'
import Link from 'next/link'

export default function TeacherHomeschoolingDashboard() {
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher, teacherIds, hasTeacherIdentity } = useTeacherIdentity()

  const { data: dashboardData, status } = usePageData({
    cacheKey: ['teacher-homeschool-dashboard', teacherIds.join('|') || 'anon'],
    fetcher: async () => {
      if (teacherIds.length === 0) return { data: null, error: 'No teacher ID' }

      const { data: assignments } = await supabase
        .from('homeschool_teacher_assignments')
        .select(`
          id, enrollment_id, subject_id, assignment_type,
          enrollment:homeschool_enrollments(
            id, student_id, status, grade_level, academic_year, program_name,
            student:students(id, full_name, admission_number),
            subjects:homeschool_subjects(
              id, subject_id, is_active,
              subject:subjects(id, name)
            )
          ),
          subject:subjects(id, name, code),
          teacher:teachers(id, full_name)
        `)
        .in('teacher_id', teacherIds)

      const enrollmentIds = [...new Set((assignments || []).map((a: any) => a.enrollment_id).filter(Boolean))]
      const studentIds = [...new Set((assignments || []).map((a: any) => a.enrollment?.student_id).filter(Boolean))]

      const today = new Date()
      const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })

      const [sessionsRes, submissionsRes] = await Promise.all([
        enrollmentIds.length > 0
          ? supabase
              .from('learning_sessions')
              .select(`
                id, enrollment_id, subject_id, day, start_time, end_time,
                learning_mode, topic, status, student_status, submission_required,
                subject:subjects(id, name),
                enrollment:homeschool_enrollments(id, student_id, student:students(id, full_name)),
                objectives:learning_objectives(id, is_completed)
              `)
              .in('enrollment_id', enrollmentIds)
              .eq('day', dayName)
              .order('start_time', { ascending: true })
          : { data: [], error: null },
        supabase
          .from('submissions')
          .select('id, assignment_id, student_id, status, submitted_at, student:students(id, full_name)')
          .eq('status', 'submitted')
          .order('submitted_at', { ascending: false })
          .limit(10)
      ])

      const uniqueStudents = new Map<string, any>()
      for (const a of ((assignments || []) as any[])) {
        const e = a.enrollment
        if (!e?.student?.id) continue
        if (!uniqueStudents.has(e.student.id)) {
          uniqueStudents.set(e.student.id, {
            id: e.student.id,
            full_name: e.student.full_name,
            admission_number: e.student.admission_number,
            enrollment_id: e.id,
            status: e.status,
            grade_level: e.grade_level,
            academic_year: e.academic_year,
            program_name: e.program_name,
            subjects: (e.subjects || []).filter((s: any) => s.is_active).map((s: any) => ({
              id: s.subject_id,
              name: s.subject?.name || 'Unknown',
            })),
          })
        }
      }

      const subjectMap = new Map<string, { name: string; count: number }>()
      for (const a of ((assignments || []) as any[])) {
        const key = a.subject_id
        if (!subjectMap.has(key)) {
          subjectMap.set(key, { name: a.subject?.name || 'Unknown', count: 0 })
        }
        subjectMap.get(key)!.count++
      }

      return {
        data: {
          assignments: assignments || [],
          students: Array.from(uniqueStudents.values()),
          todaySessions: sessionsRes.data || [],
          submissions: submissionsRes.data || [],
          subjects: Array.from(subjectMap.values()),
          enrollmentCount: enrollmentIds.length,
        },
        error: null,
      }
    },
    enabled: hasTeacherIdentity,
  })

  const loading = status === 'loading' && !dashboardData

  if (!hasTeacherIdentity) {
    return (
      <div className="p-6 min-h-[80vh] flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={32} className="text-amber-500" />
          </div>
          <h2 className="text-lg font-black uppercase tracking-tight mb-2" style={{ color: 'var(--text)' }}>No Teacher Profile</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>You need a teacher profile to access the homeschooling dashboard.</p>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <ShimmerSkeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <ShimmerSkeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ShimmerSkeleton className="lg:col-span-2 h-96" />
          <ShimmerSkeleton className="h-96" />
        </div>
      </div>
    )
  }

  const todaySessions = dashboardData?.todaySessions || []
  const students = dashboardData?.students || []
  const submissions = dashboardData?.submissions || []
  const subjects = dashboardData?.subjects || []
  const enrollmentCount = dashboardData?.enrollmentCount || 0

  const sessionStats = {
    total: todaySessions.length,
    upcoming: todaySessions.filter((s: any) => s.status === 'UPCOMING' || s.status === 'READY').length,
    inProgress: todaySessions.filter((s: any) => s.status === 'IN_PROGRESS').length,
    pendingReview: todaySessions.filter((s: any) => s.status === 'SUBMISSION_PENDING' || s.status === 'UNDER_REVIEW').length,
  }

  return (
    <div className="p-6 space-y-8 pb-12 bg-gradient-to-b from-transparent to-[var(--bg)] min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 w-fit">
              <GraduationCap size={14} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--primary)' }}>Homeschooling Command</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase italic" style={{ color: 'var(--text)' }}>
              Homeschool Hub
            </h1>
            <p className="font-bold text-sm uppercase tracking-wide max-w-xl" style={{ color: 'var(--text-muted)' }}>
              Managing <span className="text-primary font-black">{students.length} student{students.length !== 1 ? 's' : ''}</span> across <span className="text-primary font-black">{enrollmentCount} enrollment{enrollmentCount !== 1 ? 's' : ''}</span>.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sessions"
          value={sessionStats.total}
          icon={<Calendar size={20} />}
          className="border-none shadow-xl shadow-slate-200/5"
        />
        <StatCard
          title="Assigned Students"
          value={students.length}
          icon={<Users size={20} />}
          className="border-none shadow-xl shadow-emerald-50/5"
        />
        <StatCard
          title="Pending Review"
          value={sessionStats.pendingReview}
          icon={<ClipboardList size={20} />}
          className="border-none shadow-xl shadow-amber-50/5"
        />
        <StatCard
          title="Submissions Today"
          value={submissions.length}
          icon={<FileText size={20} />}
          className="border-none shadow-xl shadow-indigo-50/5"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
          <Card className="p-6 border-2 border-primary/5 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} className="text-primary" /> Today&apos;s Sessions
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="info" className="text-[10px] uppercase">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</Badge>
                <Link href="/teacher/homeschooling/timetable">
                  <Button variant="secondary" size="sm" className="text-[10px] font-black uppercase">Timetable <ArrowRight size={12} /></Button>
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              {todaySessions.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--input)' }}>
                    <BookOpen size={24} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>No sessions scheduled for today</p>
                </div>
              ) : (
                todaySessions.map((session: any) => (
                  <Link key={session.id} href={`/teacher/homeschooling/student/${session.enrollment?.student_id}`}>
                    <div className="p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] hover:border-primary/30 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                              {session.start_time} - {session.end_time}
                            </span>
                            <Badge variant={
                              session.status === 'IN_PROGRESS' ? 'warning' :
                              session.status === 'SUBMISSION_PENDING' || session.status === 'UNDER_REVIEW' ? 'info' :
                              'secondary'
                            } className="text-[9px] uppercase">
                              {session.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>{session.topic || session.subject?.name}</p>
                          <p className="text-[11px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {session.enrollment?.student?.full_name} · {session.subject?.name}
                          </p>
                        </div>
                        <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} className="shrink-0 mt-1" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6 border-2 border-primary/5 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <Users size={14} className="text-primary" /> Assigned Students
              </h3>
              <Link href="/teacher/students">
                <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase">All <ArrowRight size={12} /></Button>
              </Link>
            </div>
            <div className="space-y-3">
              {students.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>No students assigned yet</p>
                </div>
              ) : (
                students.slice(0, 5).map((student: any) => (
                  <Link key={student.id} href={`/teacher/homeschooling/student/${student.id}`}>
                    <div className="p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] hover:border-primary/30 transition-all">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm shrink-0">
                            {student.full_name?.[0] || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>{student.full_name}</p>
                            <p className="text-[10px] font-bold truncate" style={{ color: 'var(--text-muted)' }}>
                              {student.grade_level} · {student.subjects?.map((s: any) => s.name).join(', ') || 'No subjects'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={student.status === 'ACTIVE' ? 'success' : 'muted'} className="text-[9px] uppercase shrink-0">
                          {student.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <Card className="p-6 border-2 border-amber-500/10 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500" /> Need Review
              </h3>
              <Link href="/teacher/marking">
                <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase">All <ArrowRight size={12} /></Button>
              </Link>
            </div>
            <div className="space-y-3">
              {submissions.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--input)' }}>
                    <CheckCircle2 size={24} className="text-green-500" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>All caught up!</p>
                </div>
              ) : (
                submissions.slice(0, 5).map((sub: any) => (
                  <div key={sub.id} className="p-3 rounded-xl bg-[var(--input)] border border-[var(--card-border)]">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate" style={{ color: 'var(--text)' }}>{sub.student?.full_name}</p>
                        <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(sub.submitted_at, 'relative')}
                        </p>
                      </div>
                      <Badge variant="warning" className="text-[9px] uppercase">Submitted</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6 border-2 border-primary/5 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={14} className="text-primary" /> Subjects Covered
              </h3>
            </div>
            <div className="space-y-3">
              {subjects.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>No subjects assigned</p>
                </div>
              ) : (
                subjects.map((subject: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--input)] border border-[var(--card-border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)', color: 'white' }}>
                        <BookOpen size={14} />
                      </div>
                      <span className="text-xs font-black" style={{ color: 'var(--text)' }}>{subject.name}</span>
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                      {subject.count} assignment{subject.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6 border-2 border-primary/5 bg-gradient-to-br from-[var(--card)] to-[var(--bg)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={14} className="text-primary" /> Quick Actions
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/teacher/homeschooling/timetable">
                <button className="w-full p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] hover:border-primary/30 transition-all flex flex-col items-center gap-2">
                  <BookOpen size={20} className="text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text)' }}>Timetable</span>
                </button>
              </Link>
              <Link href="/teacher/marking">
                <button className="w-full p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] hover:border-primary/30 transition-all flex flex-col items-center gap-2">
                  <ClipboardList size={20} className="text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text)' }}>Marking</span>
                </button>
              </Link>
              <Link href="/teacher/resources">
                <button className="w-full p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] hover:border-primary/30 transition-all flex flex-col items-center gap-2">
                  <FileText size={20} className="text-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text)' }}>Resources</span>
                </button>
              </Link>
              <Link href="/teacher/homeschooling/analytics">
                <button className="w-full p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] hover:border-primary/30 transition-all flex flex-col items-center gap-2">
                  <TrendingUp size={20} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text)' }}>Analytics</span>
                </button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
