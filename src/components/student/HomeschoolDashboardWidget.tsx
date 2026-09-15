'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, Clock, ChevronRight, CheckCircle2, PlayCircle, AlertTriangle, RefreshCw, CalendarDays } from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { useAuthStore } from '@/stores/authStore'
import { formatTimeRange, getSessionModeLabel } from '@/lib/homeschooling/constants'
import { HomeschoolOnboardingModal, hasSeenOnboarding, markOnboardingSeen } from '@/components/student/HomeschoolOnboardingModal'
import { getHomeschoolDashboardData, getHomeschoolWeeks } from '@/app/actions/homeschooling'
import Link from 'next/link'

const MODE_COLORS: Record<string, string> = {
  TEACHER_LED: '#4F8CFF',
  SELF_STUDY: '#10B981',
  AI_SUPPORTED: '#A855F7',
  HYBRID: '#F59E0B',
}

const STATUS_META: Record<string, { color: string; Icon: typeof CheckCircle2; label: string }> = {
  COMPLETED: { color: '#10B981', Icon: CheckCircle2, label: 'Done' },
  IN_PROGRESS: { color: '#4F8CFF', Icon: PlayCircle, label: 'In progress' },
  SUBMITTED: { color: '#F59E0B', Icon: Clock, label: 'Submitted' },
  CORRECTIONS_REQUIRED: { color: '#EF4444', Icon: AlertTriangle, label: 'Corrections' },
  UPCOMING: { color: '#6B7280', Icon: Clock, label: 'Upcoming' },
  NOT_STARTED: { color: '#6B7280', Icon: Clock, label: 'Not started' },
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface DisplaySession {
  id: string
  day: string
  start_time: string
  end_time: string
  learning_mode: string
  topic: string | null
  student_status: string
  subjectName: string | null
  teacherName: string | null
}

function toDisplay(s: any): DisplaySession {
  return {
    id: s.id,
    day: s.day || '',
    start_time: s.start_time,
    end_time: s.end_time,
    learning_mode: s.learning_mode,
    topic: s.topic ?? null,
    student_status: s.student_status || 'UPCOMING',
    subjectName: s.subject?.name ?? null,
    teacherName: s.teacher?.full_name ?? null,
  }
}

function upcomingLabel(day: string, distance: number): string {
  if (distance === 1) return 'Tomorrow'
  return day
}

export default function HomeschoolDashboardWidget() {
  const { student } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'none' | 'active' | 'error'>('loading')
  const [todaySessions, setTodaySessions] = useState<DisplaySession[]>([])
  const [upcoming, setUpcoming] = useState<Array<DisplaySession & { distance: number }>>([])
  const [correctionsCount, setCorrectionsCount] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (!student?.id) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id])

  const loadData = async () => {
    if (!student?.id) return
    setStatus('loading')
    try {
      const dash = await getHomeschoolDashboardData(student.id)
      if (!dash.success) {
        setStatus('error')
        return
      }
      if (!dash.data?.enrollment) {
        setStatus('none')
        return
      }

      setStatus('active')

      // QC: "shown once" must be recorded at SHOW time, not close time.
      // Students who back-button/gesture away without tapping anything never
      // run the close handler — recording only on close is why the modal
      // returned on every visit.
      if (!hasSeenOnboarding()) {
        markOnboardingSeen()
        setShowOnboarding(true)
      }

      const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
      const todayIdx = DAY_ORDER.indexOf(todayName)

      // Today's sessions come from the dashboard payload (already day-filtered server-side).
      const today = ((dash.data.todaySessions || []) as any[]).map(toDisplay)
      today.sort((a, b) => a.start_time.localeCompare(b.start_time))
      setTodaySessions(today)

      // Corrections needing the student's attention.
      const pending = (dash.data.pendingItems || []) as any[]
      setCorrectionsCount(
        pending.filter(s => s.student_status === 'CORRECTIONS_REQUIRED' || s.status === 'CORRECTIONS_REQUIRED').length
      )

      // Upcoming lessons: next sessions after today from published weeks.
      const weeksRes = await getHomeschoolWeeks(dash.data.enrollment.id)
      if (weeksRes.success && weeksRes.data) {
        const published = (weeksRes.data as any[]).filter(w => w.status === 'PUBLISHED')
        const candidates: Array<DisplaySession & { distance: number }> = []
        for (const week of published) {
          for (const s of (week.sessions || []) as any[]) {
            if (s.status === 'CANCELLED') continue
            const dayIdx = DAY_ORDER.indexOf(s.day)
            if (dayIdx < 0) continue
            const distance = (dayIdx - todayIdx + 7) % 7
            if (distance === 0) continue // today is rendered separately
            candidates.push({ ...toDisplay(s), distance })
          }
        }
        // De-duplicate (a session could theoretically appear once per week list — keep unique ids,
        // preferring the nearest occurrence).
        const seen = new Map<string, DisplaySession & { distance: number }>()
        for (const c of candidates) {
          const prev = seen.get(c.id)
          if (!prev || c.distance < prev.distance) seen.set(c.id, c)
        }
        const next = [...seen.values()]
          .sort((a, b) => a.distance - b.distance || a.start_time.localeCompare(b.start_time))
          .slice(0, 3)
        setUpcoming(next)
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <div className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--input)]" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-24 rounded bg-[var(--input)]" />
            <div className="h-2 w-36 rounded bg-[var(--input)]" />
          </div>
        </div>
        <div className="h-8 w-full rounded-xl bg-[var(--input)]" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <Card className="p-5 relative overflow-hidden border border-[var(--card-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-red-500 to-orange-600 shadow-lg">
            <AlertTriangle size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Homeschooling</p>
            <p className="text-[11px] font-semibold text-muted">Couldn&apos;t load today&apos;s classes.</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-black"
            style={{ background: 'var(--input)', color: 'var(--text)' }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </Card>
    )
  }

  if (status === 'none') {
    return (
      <Link href="/student/homeschooling" className="block">
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Card className="p-5 relative overflow-hidden cursor-pointer group border border-[var(--card-border)] bg-gradient-to-br from-[var(--card)] to-indigo-500/5 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:from-indigo-500/20 transition-all" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                  <GraduationCap size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Homeschooling Program</p>
                  <p className="text-[11px] font-semibold text-muted">Personalized learning, guided study</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-muted leading-relaxed mb-3">
                Teacher support, AI-powered assistance, and self-study plans tailored to you.
              </p>
              <div className="flex items-center gap-1 text-xs font-black" style={{ color: 'var(--primary)' }}>
                Learn more <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>
        </motion.div>
      </Link>
    )
  }

  const doneCount = todaySessions.filter(s => s.student_status === 'COMPLETED').length

  const renderSession = (s: DisplaySession, showDayLabel?: string) => {
    const meta = STATUS_META[s.student_status] || STATUS_META.UPCOMING
    const StatusIcon = meta.Icon
    const modeColor = MODE_COLORS[s.learning_mode] || '#6B7280'
    return (
      <Link key={s.id} href={`/student/homeschooling/session/${s.id}`} className="block">
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--input)] hover:border-[var(--primary)] transition-colors cursor-pointer"
          style={{ borderLeft: `3px solid ${modeColor}` }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>
              {showDayLabel ? `${showDayLabel} · ` : ''}{formatTimeRange(s.start_time, s.end_time)}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: meta.color }}>
              <StatusIcon size={12} /> {meta.label}
            </span>
          </div>
          <p className="text-sm font-black line-clamp-1 mt-0.5" style={{ color: 'var(--text)' }}>
            {s.topic || s.subjectName || 'Learning Session'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {s.subjectName && (
              <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                {s.subjectName}
              </span>
            )}
            {s.teacherName && (
              <>
                <span className="text-[10px] opacity-30">·</span>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {s.teacherName}
                </span>
              </>
            )}
            <span className="text-[10px] opacity-30">·</span>
            <span className="text-[10px] font-bold" style={{ color: modeColor }}>
              {getSessionModeLabel(s.learning_mode)}
            </span>
          </div>
        </motion.div>
      </Link>
    )
  }

  return (
    <>
      <Card className="p-5 relative overflow-hidden border border-[var(--card-border)] bg-gradient-to-br from-[var(--card)] to-indigo-500/5">
        <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-indigo-500/8 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                <GraduationCap size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Today&apos;s Classes</p>
                <p className="text-[11px] font-semibold text-muted">
                  {todaySessions.length === 0
                    ? 'No classes scheduled today'
                    : `${doneCount}/${todaySessions.length} completed`}
                </p>
              </div>
            </div>
            <Badge variant="success" className="text-[10px]">Active</Badge>
          </div>

          {correctionsCount > 0 && (
            <Link href="/student/homeschooling" className="block mb-2">
              <div
                className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer"
                style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }}
              >
                <AlertTriangle size={14} className="shrink-0" style={{ color: '#EF4444' }} />
                <p className="text-[11px] font-bold" style={{ color: '#EF4444' }}>
                  {correctionsCount} {correctionsCount === 1 ? 'correction needs' : 'corrections need'} your attention
                </p>
                <ChevronRight size={13} className="ml-auto shrink-0" style={{ color: '#EF4444' }} />
              </div>
            </Link>
          )}

          {todaySessions.length > 0 ? (
            <div className="space-y-2">
              {todaySessions.map((s) => renderSession(s))}
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--input)] text-center">
              <p className="text-xs font-semibold text-muted">No classes today — rest up or get ahead</p>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <CalendarDays size={12} style={{ color: 'var(--text-muted)' }} />
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Up next
                </p>
              </div>
              <div className="space-y-2">
                {upcoming.map((s) => renderSession(s, upcomingLabel(s.day, s.distance)))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <Link href="/student/homeschooling" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black text-white" style={{ background: 'var(--primary)' }}>
              <GraduationCap size={12} /> Open Homeschooling
            </Link>
            <Link href="/student/homeschooling/timetable" className="flex items-center gap-1 text-[11px] font-black" style={{ color: 'var(--primary)' }}>
              Full Timetable <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </Card>
      <HomeschoolOnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </>
  )
}
