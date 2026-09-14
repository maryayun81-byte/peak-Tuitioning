'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CalendarDays, Users, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useTeacherIdentity } from '@/hooks/useTeacherIdentity'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { HomeschoolWeekSelector } from '@/components/homeschooling/HomeschoolWeekSelector'
import HomeschoolTimetableGrid from '@/components/homeschooling/HomeschoolTimetableGrid'
import type { HomeschoolWeek, LearningSession } from '@/types/homeschooling'

interface StudentEnrollment {
  studentId: string
  studentName: string
  enrollmentId: string
  weeks: HomeschoolWeek[]
}

export default function TeacherTimetablePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { teacherIds, hasTeacherIdentity } = useTeacherIdentity()

  const [loading, setLoading] = useState(true)
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all')
  const [selectedWeekIndices, setSelectedWeekIndices] = useState<Record<string, number>>({})

  useEffect(() => {
    if (hasTeacherIdentity && teacherIds.length > 0) loadData()
  }, [hasTeacherIdentity, teacherIds])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: assignments } = await supabase
        .from('homeschool_teacher_assignments')
        .select(`
          id, enrollment_id,
          enrollment:homeschool_enrollments(
            id, student_id, status,
            student:students(id, full_name)
          )
        `)
        .in('teacher_id', teacherIds)

      const uniqueEnrollments = new Map<string, StudentEnrollment>()
      for (const a of assignments || []) {
        const e = a.enrollment as any
        if (!e?.student?.id || !e?.id) continue
        if (uniqueEnrollments.has(e.id)) continue
        uniqueEnrollments.set(e.id, {
          studentId: e.student.id,
          studentName: e.student.full_name || 'Unknown',
          enrollmentId: e.id,
          weeks: [],
        })
      }

      const enrollmentList = Array.from(uniqueEnrollments.values())

      const weekResults = await Promise.all(
        enrollmentList.map(async (enr) => {
          const { data: weeks } = await supabase
            .from('homeschool_weeks')
            .select(`
              id, enrollment_id, week_number, title, start_date, end_date, status, created_at, updated_at,
              sessions:learning_sessions(
                id, subject_id, teacher_id, day, start_time, end_time, learning_mode, topic, status, student_status,
                subject:subjects(id, name),
                teacher:teachers(id, full_name),
                enrollment:homeschool_enrollments(id, student_id, student:students(id, full_name))
              )
            `)
            .eq('enrollment_id', enr.enrollmentId)
            .order('week_number', { ascending: true })
          return { enrollmentId: enr.enrollmentId, weeks: weeks || [] }
        })
      )

      for (const wr of weekResults) {
        const enr = enrollmentList.find((e) => e.enrollmentId === wr.enrollmentId)
        if (enr) enr.weeks = wr.weeks as any
      }

      setEnrollments(enrollmentList)

      const defaultIndices: Record<string, number> = {}
      for (const enr of enrollmentList) {
        const currentIdx = enr.weeks.findIndex((w) => w.status === 'PUBLISHED')
        defaultIndices[enr.enrollmentId] = Math.max(0, currentIdx)
      }
      setSelectedWeekIndices(defaultIndices)
    } finally {
      setLoading(false)
    }
  }

  const filteredEnrollments = useMemo(() => {
    if (selectedStudentId === 'all') return enrollments
    return enrollments.filter((e) => e.studentId === selectedStudentId)
  }, [enrollments, selectedStudentId])

  const allSessions = useMemo(() => {
    const sessions: LearningSession[] = []
    for (const enr of filteredEnrollments) {
      const weekIdx = selectedWeekIndices[enr.enrollmentId] ?? 0
      const week = enr.weeks[weekIdx]
      if (!week?.sessions) continue
      sessions.push(...week.sessions)
    }
    return sessions
  }, [filteredEnrollments, selectedWeekIndices])

  const displayWeeks = useMemo(() => {
    if (filteredEnrollments.length === 1) {
      return filteredEnrollments[0].weeks
    }
    const merged = new Map<string, HomeschoolWeek>()
    for (const enr of filteredEnrollments) {
      for (const w of enr.weeks) {
        if (!merged.has(w.id)) merged.set(w.id, w)
      }
    }
    return Array.from(merged.values()).sort((a, b) => a.week_number - b.week_number)
  }, [filteredEnrollments])

  const displayWeekIndex = useMemo(() => {
    if (filteredEnrollments.length === 1) {
      const enr = filteredEnrollments[0]
      return selectedWeekIndices[enr.enrollmentId] ?? 0
    }
    return 0
  }, [filteredEnrollments, selectedWeekIndices])

  const handleWeekChange = useCallback((index: number) => {
    if (filteredEnrollments.length === 1) {
      const enr = filteredEnrollments[0]
      setSelectedWeekIndices((prev) => ({ ...prev, [enr.enrollmentId]: index }))
    }
  }, [filteredEnrollments])

  const uniqueStudents = useMemo(() => {
    const seen = new Set<string>()
    return enrollments.filter((e) => {
      if (seen.has(e.studentId)) return false
      seen.add(e.studentId)
      return true
    })
  }, [enrollments])

  const handleSessionClick = useCallback((session: LearningSession) => {
    router.push(`/teacher/homeschooling/session/${session.id}`)
  }, [router])

  if (!hasTeacherIdentity) {
    return (
      <div className="p-6 min-h-[80vh] flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <Users size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--primary)' }} />
          <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>No Teacher Profile</h2>
          <p className="text-sm opacity-60 font-medium">You need a teacher profile to view the timetable.</p>
        </Card>
      </div>
    )
  }

  if (loading) return <SkeletonDashboard />

  if (enrollments.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="p-12 text-center max-w-md">
          <CalendarDays size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--primary)' }} />
          <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>No Assignments</h2>
          <p className="text-sm opacity-60 font-medium">
            You are not assigned to any homeschooling enrollments.
          </p>
        </Card>
      </div>
    )
  }

  const currentWeek = displayWeeks[Math.min(displayWeekIndex, displayWeeks.length - 1)]

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const todayIdx = DAY_ORDER.indexOf(todayName)
  const todaySessions = allSessions
    .filter((s) => s.day === todayName)
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
  const upcomingSessions = allSessions
    .map((s) => ({ ...s, _distance: (DAY_ORDER.indexOf(s.day) - todayIdx + 7) % 7 }))
    .filter((s) => (s as any)._distance > 0)
    .sort((a, b) => (a as any)._distance - (b as any)._distance || String(a.start_time).localeCompare(String(b.start_time)))
    .slice(0, 3)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-gradient-to-r from-[var(--card)] to-transparent p-6 rounded-3xl border border-[var(--card-border)]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(79,140,255,0.12)' }}>
              <CalendarDays size={24} style={{ color: 'var(--primary)' }} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
                Teaching Timetable
              </h1>
              <p className="text-xs font-bold opacity-50 mt-0.5">
                {uniqueStudents.length} student{uniqueStudents.length !== 1 ? 's' : ''} assigned
                {currentWeek && ` \u00b7 Week ${currentWeek.week_number}`}
              </p>
            </div>

            {uniqueStudents.length > 1 && (
              <div className="relative">
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-xl text-xs font-bold border cursor-pointer"
                  style={{
                    background: 'var(--input)',
                    color: 'var(--text)',
                    borderColor: 'var(--card-border)',
                  }}
                >
                  <option value="all">All Students</option>
                  {uniqueStudents.map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.studentName}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
              </div>
            )}
          </div>

          {displayWeeks.length > 0 && (
            <HomeschoolWeekSelector
              weeks={displayWeeks}
              selectedIndex={Math.min(displayWeekIndex, displayWeeks.length - 1)}
              onChange={handleWeekChange}
            />
          )}
        </div>
      </motion.div>

      <Card className="p-4 overflow-hidden">
        {(todaySessions.length > 0 || upcomingSessions.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-3" style={{ background: 'rgba(79,140,255,0.06)', border: '1px solid rgba(79,140,255,0.25)' }}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: '#4F8CFF' }}>
                Teaching today ({todaySessions.length})
              </p>
              {todaySessions.length === 0 ? (
                <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Nothing today.</p>
              ) : (
                <div className="space-y-1.5">
                  {todaySessions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSessionClick(s)}
                      className="w-full text-left text-xs font-bold truncate hover:underline"
                      style={{ color: 'var(--text)' }}
                    >
                      {String(s.start_time).slice(0, 5)} · {s.topic || (s.subject as any)?.name} · {(s as any).enrollment?.student?.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Up next
              </p>
              {upcomingSessions.length === 0 ? (
                <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Nothing upcoming this week.</p>
              ) : (
                <div className="space-y-1.5">
                  {upcomingSessions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSessionClick(s)}
                      className="w-full text-left text-xs font-bold truncate hover:underline"
                      style={{ color: 'var(--text)' }}
                    >
                      {(s as any)._distance === 1 ? 'Tomorrow' : s.day} · {String(s.start_time).slice(0, 5)} · {s.topic || (s.subject as any)?.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {allSessions.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-bold opacity-50">No sessions this week</p>
          </div>
        ) : (
          <HomeschoolTimetableGrid
            sessions={allSessions}
            onSessionClick={handleSessionClick}
            viewMode="teacher"
            showStudent
          />
        )}
      </Card>
    </div>
  )
}
