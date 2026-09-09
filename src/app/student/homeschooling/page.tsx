'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap, CalendarDays, AlertTriangle,
  ChevronRight, BookOpen, Clock, CheckCircle2, PlayCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Card'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { getHomeschoolDashboardData } from '@/app/actions/homeschooling'
import { formatTimeRange, getSessionModeLabel } from '@/lib/homeschooling/constants'
import Link from 'next/link'
import type { LearningSession } from '@/types/homeschooling'

const MODE_COLORS: Record<string, string> = {
  TEACHER_LED: '#4F8CFF',
  SELF_STUDY: '#10B981',
  AI_SUPPORTED: '#A855F7',
}

const STATUS_ICONS: Record<string, { color: string; Icon: typeof CheckCircle2 }> = {
  COMPLETED: { color: '#10B981', Icon: CheckCircle2 },
  IN_PROGRESS: { color: '#4F8CFF', Icon: PlayCircle },
  SUBMISSION_PENDING: { color: '#F59E0B', Icon: AlertTriangle },
  CORRECTIONS_REQUIRED: { color: '#EF4444', Icon: AlertTriangle },
  UPCOMING: { color: '#6B7280', Icon: Clock },
  READY: { color: '#6366F1', Icon: Clock },
  MISSED: { color: '#EF4444', Icon: AlertTriangle },
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function getWeekInfo() {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  const fmt = (d: Date) => d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
  return `${fmt(startOfWeek)} – ${fmt(endOfWeek)}`
}

function TodaySessionCard({ session, onClick }: { session: LearningSession; onClick: () => void }) {
  const statusInfo = STATUS_ICONS[session.student_status] || STATUS_ICONS.UPCOMING
  const modeColor = MODE_COLORS[session.learning_mode] || '#6B7280'
  const StatusIcon = statusInfo.Icon
  const cta =
    session.student_status === 'COMPLETED' ? 'Review' :
    session.student_status === 'IN_PROGRESS' || (session as any).mission?.is_started ? 'Continue' :
    session.student_status === 'SUBMITTED' ? 'View' :
    session.status === 'MISSED' ? 'Catch Up' : 'Start'

  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
      <Card
        className="p-4 cursor-pointer hover:shadow-md transition-all duration-200"
        style={{ borderLeft: `3px solid ${modeColor}` }}
        onClick={onClick}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                {formatTimeRange(session.start_time, session.end_time)}
              </span>
              <span className="text-[10px] font-bold opacity-40">•</span>
              <span className="text-xs font-semibold opacity-60">{session.subject?.name}</span>
            </div>
            {session.topic && (
              <p className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--text)' }}>
                {session.topic}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: `${modeColor}18`, color: modeColor, border: `1px solid ${modeColor}40` }}
            >
              {getSessionModeLabel(session.learning_mode)}
            </span>
            <StatusIcon size={16} style={{ color: statusInfo.color }} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <span className="text-[11px] font-black" style={{ color: 'var(--primary)' }}>{cta} →</span>
        </div>
      </Card>
    </motion.div>
  )
}

export default function HomeschoolingHubPage() {
  const router = useRouter()
  const { student } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (student?.id) loadDashboard()
  }, [student?.id])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const result = await getHomeschoolDashboardData(student!.id)
      if (result.success) setData(result.data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />
  if (!data?.enrollment) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="p-12 text-center max-w-md">
          <GraduationCap size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--primary)' }} />
          <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>No Active Enrollment</h2>
          <p className="text-sm opacity-60 font-medium">
            You are not currently enrolled in the homeschooling program.
          </p>
        </Card>
      </div>
    )
  }

  const { enrollment, todaySessions, pendingItems, progress, weekOverview } = data
  const correctionsRequired = pendingItems?.filter((s: any) => s.status === 'CORRECTIONS_REQUIRED') || []
  const overdueItems = pendingItems?.filter((s: any) => s.status === 'MISSED') || []
  const awaitingReview = pendingItems?.filter((s: any) => s.student_status === 'SUBMITTED' || s.status === 'UNDER_REVIEW' || s.status === 'SUBMISSION_PENDING') || []

  const nextAction = (() => {
    const go = (session: any) => `/student/homeschooling/session/${session.id}`
    if (correctionsRequired.length > 0) {
      return { kind: 'corrections', session: correctionsRequired[0], title: 'Corrections requested', detail: 'Your teacher left feedback — review and resubmit.', cta: 'Review Corrections', href: go(correctionsRequired[0]), color: '#EF4444' }
    }
    if (overdueItems.length > 0) {
      return { kind: 'missed', session: overdueItems[0], title: 'Catch up on a missed session', detail: 'You missed a learning session — reopen it and continue.', cta: 'Catch Up', href: go(overdueItems[0]), color: '#F59E0B' }
    }
    const inProgress = (todaySessions || []).find((s: LearningSession) => s.student_status === 'IN_PROGRESS' || (s as any).mission?.is_started)
    if (inProgress) {
      return { kind: 'continue', session: inProgress, title: `Continue: ${inProgress.topic || inProgress.subject?.name}`, detail: 'Pick up right where you left off.', cta: 'Continue Learning', href: go(inProgress), color: '#4F8CFF' }
    }
    const upcoming = (todaySessions || []).find((s: LearningSession) => ['UPCOMING', 'NOT_STARTED', 'READY'].includes(s.student_status))
    if (upcoming) {
      return { kind: 'upcoming', session: upcoming, title: `Up next: ${upcoming.topic || upcoming.subject?.name}`, detail: formatTimeRange(upcoming.start_time, upcoming.end_time), cta: 'Start', href: go(upcoming), color: '#10B981' }
    }
    if (awaitingReview.length > 0) {
      return { kind: 'review', session: awaitingReview[0], title: 'Work under review', detail: 'Your teacher is reviewing your submission.', cta: 'View', href: go(awaitingReview[0]), color: '#A855F7' }
    }
    return null
  })()

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-gradient-to-r from-[var(--card)] to-transparent p-6 md:p-8 rounded-3xl border border-[var(--card-border)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <GraduationCap size={120} className="text-primary" />
          </div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(79,140,255,0.12)' }}>
                  <GraduationCap size={28} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
                    Homeschooling
                  </h1>
                  <p className="text-xs font-bold opacity-50 mt-0.5">
                    {getWeekInfo()} • Week {weekOverview?.[0]?.week_number || '—'}
                  </p>
                </div>
              </div>
              <Link href="/student/homeschooling/timetable">
                <Button variant="secondary" size="sm" className="rounded-xl">
                  View Timetable <ChevronRight size={14} />
                </Button>
              </Link>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="opacity-50">Weekly Progress</span>
                <span style={{ color: 'var(--primary)' }}>{progress.overallProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--input)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.overallProgress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #4F8CFF, #A855F7)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {nextAction && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 relative overflow-hidden" style={{ borderLeft: `3px solid ${nextAction.color}` }}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider opacity-50 mb-1">Up next for you</p>
                <h2 className="text-base font-black truncate" style={{ color: 'var(--text)' }}>{nextAction.title}</h2>
                <p className="text-xs font-medium opacity-60 mt-0.5">{nextAction.detail}</p>
              </div>
              <Button
                size="sm"
                className="shrink-0 rounded-xl"
                onClick={() => router.push(nextAction.href)}
              >
                {nextAction.cta} <ChevronRight size={14} />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Sessions Done', value: progress.sessionProgress ? `${progress.sessionProgress}%` : '0%', icon: <CheckCircle2 size={18} />, color: '#10B981' },
          { label: 'Objectives', value: progress.objectiveProgress ? `${progress.objectiveProgress}%` : '0%', icon: <BookOpen size={18} />, color: '#4F8CFF' },
          { label: 'Today', value: todaySessions?.length || 0, icon: <CalendarDays size={18} />, color: '#F59E0B' },
          { label: 'Pending', value: pendingItems?.length || 0, icon: <Clock size={18} />, color: '#EF4444' },
        ].map((stat) => (
          <motion.div key={stat.label} whileHover={{ y: -2 }}>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                </div>
              </div>
              <div className="text-xl font-black" style={{ color: 'var(--text)' }}>{stat.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-50">{stat.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>Today's Learning</h2>
          <Link href="/student/homeschooling/timetable" className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
            See all
          </Link>
        </div>
        {todaySessions && todaySessions.length > 0 ? (
          <div className="space-y-3">
            {todaySessions.map((session: LearningSession) => (
              <TodaySessionCard
                key={session.id}
                session={session}
                onClick={() => router.push(`/student/homeschooling/session/${session.id}`)}
              />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <BookOpen size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-bold opacity-50">No sessions scheduled for today</p>
          </Card>
        )}
      </div>

      {(correctionsRequired.length > 0 || overdueItems.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} style={{ color: '#EF4444' }} />
            <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>Needs Attention</h2>
          </div>
          <Card className="p-4 space-y-3" style={{ borderLeft: '3px solid #EF4444' }}>
            {correctionsRequired.map((session: any) => (
              <button
                key={session.id}
                onClick={() => router.push(`/student/homeschooling/session/${session.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:opacity-80 transition-opacity"
                style={{ background: 'rgba(239,68,68,0.06)' }}
              >
                <AlertTriangle size={16} style={{ color: '#EF4444' }} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                    Corrections required
                  </p>
                  <p className="text-[10px] font-bold uppercase opacity-50">Review feedback & resubmit</p>
                </div>
                <ChevronRight size={16} className="opacity-30 shrink-0" />
              </button>
            ))}
            {overdueItems.map((session: any) => (
              <button
                key={session.id}
                onClick={() => router.push(`/student/homeschooling/session/${session.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:opacity-80 transition-opacity"
                style={{ background: 'rgba(239,68,68,0.06)' }}
              >
                <Clock size={16} style={{ color: '#EF4444' }} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                    Missed session
                  </p>
                  <p className="text-[10px] font-bold uppercase opacity-50">Tap to catch up</p>
                </div>
                <ChevronRight size={16} className="opacity-30 shrink-0" />
              </button>
            ))}
          </Card>
        </div>
      )}

      <div>
        <h2 className="text-lg font-black mb-3" style={{ color: 'var(--text)' }}>Quick Access</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/student/homeschooling/timetable">
            <Card className="p-5 hover:shadow-md transition-all cursor-pointer group">
              <CalendarDays size={24} className="mb-3 group-hover:scale-110 transition-transform" style={{ color: '#4F8CFF' }} />
              <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>Timetable</h3>
              <p className="text-[10px] font-bold opacity-50 mt-0.5">Weekly grid view</p>
            </Card>
          </Link>
          <Link href="/student/homeschooling/history">
            <Card className="p-5 hover:shadow-md transition-all cursor-pointer group">
              <BookOpen size={24} className="mb-3 group-hover:scale-110 transition-transform" style={{ color: '#F59E0B' }} />
              <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>History</h3>
              <p className="text-[10px] font-bold opacity-50 mt-0.5">Past sessions & catch-up</p>
            </Card>
          </Link>
          <Link href="/student/homeschooling/week">
            <Card className="p-5 hover:shadow-md transition-all cursor-pointer group">
              <CalendarDays size={24} className="mb-3 group-hover:scale-110 transition-transform" style={{ color: '#10B981' }} />
              <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>Week View</h3>
              <p className="text-[10px] font-bold opacity-50 mt-0.5">All sessions by day</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
