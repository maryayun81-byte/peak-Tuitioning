'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { getHomeschoolWeeks, getHomeschoolDashboardData } from '@/app/actions/homeschooling'
import { DAY_NAMES, formatTimeRange, getSessionModeLabel, getCurrentWeekIndex } from '@/lib/homeschooling/constants'
import type { HomeschoolWeek, LearningSession } from '@/types/homeschooling'

const MODE_COLORS: Record<string, string> = {
  TEACHER_LED: '#4F8CFF',
  SELF_STUDY: '#10B981',
  AI_SUPPORTED: '#A855F7',
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#10B981',
  IN_PROGRESS: '#4F8CFF',
  SUBMISSION_PENDING: '#F59E0B',
  UNDER_REVIEW: '#A855F7',
  CORRECTIONS_REQUIRED: '#EF4444',
  UPCOMING: '#6B7280',
  READY: '#6366F1',
  MISSED: '#EF4444',
}

function SessionPill({ session, onClick }: { session: LearningSession; onClick: () => void }) {
  const modeColor = MODE_COLORS[session.learning_mode] || '#6B7280'
  const statusColor = STATUS_COLORS[session.student_status] || '#6B7280'

  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
      <div
        className="p-3 rounded-xl cursor-pointer hover:shadow-sm transition-all border"
        style={{ borderColor: `${modeColor}30`, background: `${modeColor}08` }}
        onClick={onClick}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold opacity-60">{formatTimeRange(session.start_time, session.end_time)}</span>
          <span
            className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase"
            style={{ background: `${modeColor}18`, color: modeColor }}
          >
            {getSessionModeLabel(session.learning_mode)}
          </span>
        </div>
        {session.topic && (
          <p className="text-xs font-bold line-clamp-2" style={{ color: 'var(--text)' }}>
            {session.topic}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[9px] font-bold opacity-50">{session.subject?.name}</span>
          {session.teacher?.full_name && (
            <>
              <span className="text-[8px] opacity-30">•</span>
              <span className="text-[9px] font-bold opacity-40">{session.teacher.full_name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
          <span className="text-[9px] font-bold" style={{ color: statusColor }}>
            {session.student_status?.replace('_', ' ')}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default function HomeschoolWeekPage() {
  const router = useRouter()
  const { student } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [weeks, setWeeks] = useState<HomeschoolWeek[]>([])
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)
  const [sessionsByDay, setSessionsByDay] = useState<Record<string, LearningSession[]>>({})

  useEffect(() => {
    if (student?.id) loadData()
  }, [student?.id])

  useEffect(() => {
    if (weeks.length > 0) buildDayMap(weeks[selectedWeekIndex])
  }, [selectedWeekIndex, weeks])

  const loadData = async () => {
    setLoading(true)
    try {
      const dashResult = await getHomeschoolDashboardData(student!.id)
      if (!dashResult.success || !dashResult.data?.enrollment) {
        setLoading(false)
        return
      }

      const enrollmentId = dashResult.data.enrollment.id
      const weeksResult = await getHomeschoolWeeks(enrollmentId)
      if (weeksResult.success && weeksResult.data) {
        const sorted = [...weeksResult.data].sort((a: any, b: any) => a.week_number - b.week_number)
        setWeeks(sorted)
        setSelectedWeekIndex(getCurrentWeekIndex(sorted))
      }
    } finally {
      setLoading(false)
    }
  }

  const buildDayMap = (week: HomeschoolWeek | undefined) => {
    if (!week?.sessions) {
      setSessionsByDay({})
      return
    }

    const map: Record<string, LearningSession[]> = {}
    for (const day of DAY_NAMES) {
      map[day] = []
    }

    for (const session of week.sessions) {
      if (session.status === 'CANCELLED') continue
      if (map[session.day]) {
        map[session.day].push(session)
      }
    }

    for (const day of DAY_NAMES) {
      map[day].sort((a, b) => a.start_time.localeCompare(b.start_time))
    }

    setSessionsByDay(map)
  }

  if (loading) return <SkeletonDashboard />

  if (weeks.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="p-12 text-center max-w-md">
          <CalendarDays size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--primary)' }} />
          <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>No Weeks Available</h2>
          <p className="text-sm opacity-60 font-medium">
            No homeschooling weeks have been published yet.
          </p>
        </Card>
      </div>
    )
  }

  const currentWeek = weeks[selectedWeekIndex]
  const hasPrev = selectedWeekIndex > 0
  const hasNext = selectedWeekIndex < weeks.length - 1

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-gradient-to-r from-[var(--card)] to-transparent p-6 rounded-3xl border border-[var(--card-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(79,140,255,0.12)' }}>
                <CalendarDays size={24} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
                  Weekly Schedule
                </h1>
                <p className="text-xs font-bold opacity-50 mt-0.5">
                  {currentWeek.title || `Week ${currentWeek.week_number}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4">
            <Button
              variant="ghost"
              size="icon"
              disabled={!hasPrev}
              onClick={() => setSelectedWeekIndex((i) => i - 1)}
              className="rounded-xl"
            >
              <ChevronLeft size={18} />
            </Button>
            <span className="text-sm font-bold min-w-[120px] text-center" style={{ color: 'var(--text)' }}>
              Week {currentWeek.week_number}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={!hasNext}
              onClick={() => setSelectedWeekIndex((i) => i + 1)}
              className="rounded-xl"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="space-y-4">
        {DAY_NAMES.map((day) => {
          const daySessions = sessionsByDay[day] || []
          const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day

          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: DAY_NAMES.indexOf(day) * 0.05 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: isToday ? 'var(--primary)' : 'var(--text)' }}>
                  {day}
                </h3>
                {isToday && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: 'rgba(79,140,255,0.12)', color: 'var(--primary)' }}>
                    Today
                  </span>
                )}
                <span className="text-[10px] font-bold opacity-30">{daySessions.length} sessions</span>
              </div>
              {daySessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {daySessions.map((session) => (
                    <SessionPill
                      key={session.id}
                      session={session}
                      onClick={() => router.push(`/student/homeschooling/session/${session.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl text-xs font-bold opacity-30" style={{ background: 'var(--input)' }}>
                  No sessions
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
