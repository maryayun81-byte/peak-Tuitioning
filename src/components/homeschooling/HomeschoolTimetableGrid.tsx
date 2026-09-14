'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, BookOpen, Sparkles, Clock, ChevronLeft, ChevronRight, List, Grid3X3 } from 'lucide-react'
import { Badge } from '@/components/ui/Card'
import { getSessionModeLabel } from '@/lib/homeschooling/constants'
import type { LearningSession } from '@/types/homeschooling'

interface Props {
  sessions: LearningSession[]
  days?: string[]
  startHour?: number
  endHour?: number
  viewMode?: 'student' | 'teacher' | 'admin'
  onSessionClick?: (session: LearningSession) => void
  onCellClick?: (day: string, time: string) => void
  showTeacher?: boolean
  showStudent?: boolean
  highlightCurrentSession?: boolean
}

const MODE_CONFIG: Record<string, { color: string; bg: string; border: string; Icon: typeof Users }> = {
  TEACHER_LED: { color: '#4F8CFF', bg: 'rgba(79,140,255,0.12)', border: 'rgba(79,140,255,0.3)', Icon: Users },
  SELF_STUDY: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', Icon: BookOpen },
  AI_SUPPORTED: { color: '#A855F7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)', Icon: Sparkles },
  HYBRID: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', Icon: Users },
}

const STATUS_DOT: Record<string, string> = {
  COMPLETED: 'bg-emerald-500',
  IN_PROGRESS: 'bg-blue-500',
  SUBMISSION_PENDING: 'bg-amber-500',
  UNDER_REVIEW: 'bg-purple-500',
  MISSED: 'bg-red-500',
  CANCELLED: 'bg-gray-400',
  UPCOMING: 'bg-slate-400',
  READY: 'bg-indigo-500',
  CORRECTIONS_REQUIRED: 'bg-orange-500',
}

const DAY_ABBREV: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export default function HomeschoolTimetableGrid({
  sessions,
  days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  startHour = 7,
  endHour = 21,
  viewMode = 'student',
  onSessionClick,
  onCellClick,
  showTeacher = false,
  showStudent = false,
  highlightCurrentSession = true,
}: Props) {
  const [now, setNow] = useState<Date>(new Date())
  const [isMobile, setIsMobile] = useState(false)
  const [mobileDayIndex, setMobileDayIndex] = useState(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const idx = days.indexOf(today)
    return idx >= 0 ? idx : 0
  })
  const [listView, setListView] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches)
    handler(mq)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const timeSlots = useMemo(() => {
    const slots: string[] = []
    for (let h = startHour; h < endHour; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`)
    }
    return slots
  }, [startHour, endHour])

  const todayDay = now.toLocaleDateString('en-US', { weekday: 'long' })

  const sessionGrid = useMemo(() => {
    const grid: Record<string, Record<string, LearningSession[]>> = {}
    for (const day of days) {
      grid[day] = {}
      for (const slot of timeSlots) {
        grid[day][slot] = []
      }
    }
    for (const session of sessions) {
      const day = session.day
      if (!grid[day]) continue
      const slotHour = session.start_time.split(':')[0]
      const slot = `${slotHour.padStart(2, '0')}:00`
      if (grid[day][slot]) {
        grid[day][slot].push(session)
      }
    }
    return grid
  }, [sessions, days, timeSlots])

  const currentMinute = now.getHours() * 60 + now.getMinutes()
  const showTimeIndicator =
    highlightCurrentSession &&
    days.includes(todayDay) &&
    currentMinute >= startHour * 60 &&
    currentMinute < endHour * 60

  const timeIndicatorTop = useMemo(() => {
    if (!showTimeIndicator) return 0
    return ((currentMinute - startHour * 60) / 60) * 64
  }, [showTimeIndicator, currentMinute, startHour])

  const allSessionsToday = useMemo(
    () =>
      sessions
        .filter((s) => s.day === todayDay)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)),
    [sessions, todayDay]
  )

  if (isMobile && listView) {
    return (
      <div className="w-full" style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--card-border)' }}>
        <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Schedule</span>
          <button
            onClick={() => setListView(false)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
          >
            <Grid3X3 size={14} /> Grid
          </button>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
          {allSessionsToday.length === 0 && (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No sessions today
            </div>
          )}
          {allSessionsToday.map((session) => (
            <SessionListItem key={session.id} session={session} onClick={onSessionClick} viewMode={viewMode} showTeacher={showTeacher} />
          ))}
        </div>
      </div>
    )
  }

  const visibleDays = isMobile ? [days[mobileDayIndex]] : days

  return (
    <div className="w-full" style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--card-border)' }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--card-border)' }}>
        <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Timetable</span>
        <div className="flex items-center gap-2">
          {isMobile && (
            <>
              <button
                onClick={() => setMobileDayIndex(Math.max(0, mobileDayIndex - 1))}
                disabled={mobileDayIndex === 0}
                className="p-1 rounded-lg disabled:opacity-30"
                style={{ background: 'var(--input)' }}
              >
                <ChevronLeft size={14} style={{ color: 'var(--text)' }} />
              </button>
              <span className="text-xs font-semibold min-w-[60px] text-center" style={{ color: 'var(--text)' }}>
                {DAY_ABBREV[days[mobileDayIndex]] || days[mobileDayIndex]}
              </span>
              <button
                onClick={() => setMobileDayIndex(Math.min(days.length - 1, mobileDayIndex + 1))}
                disabled={mobileDayIndex === days.length - 1}
                className="p-1 rounded-lg disabled:opacity-30"
                style={{ background: 'var(--input)' }}
              >
                <ChevronRight size={14} style={{ color: 'var(--text)' }} />
              </button>
              <button
                onClick={() => setListView(true)}
                className="p-1 rounded-lg ml-1"
                style={{ background: 'var(--input)' }}
              >
                <List size={14} style={{ color: 'var(--text)' }} />
              </button>
            </>
          )}
          {!isMobile && (
            <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
              {startHour}:00 – {endHour}:00
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <div style={{ minWidth: visibleDays.length > 5 ? 720 : 600 }}>
          <div className="grid" style={{ gridTemplateColumns: `56px repeat(${visibleDays.length}, 1fr)` }}>
            <div
              className="sticky top-0 z-10"
              style={{ background: 'var(--card)', borderBottom: '1px solid var(--card-border)' }}
            />
            {visibleDays.map((day) => {
              const isToday = day === todayDay
              return (
                <div
                  key={day}
                  className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider"
                  style={{
                    color: isToday ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: '1px solid var(--card-border)',
                    background: isToday ? 'rgba(79,140,255,0.05)' : 'var(--card)',
                  }}
                >
                  {DAY_ABBREV[day] || day}
                </div>
              )
            })}

            {timeSlots.map((slot, slotIdx) => (
              <TimeSlotRow
                key={slot}
                slot={slot}
                slotIdx={slotIdx}
                days={visibleDays}
                sessionGrid={sessionGrid}
                viewMode={viewMode}
                onSessionClick={onSessionClick}
                onCellClick={onCellClick}
                showTeacher={showTeacher}
                showStudent={showStudent}
                todayDay={todayDay}
                isLast={slotIdx === timeSlots.length - 1}
              />
            ))}
          </div>

          {showTimeIndicator && days.includes(todayDay) && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: `${40 + timeIndicatorTop}px` }}
            >
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                <div className="flex-1 h-[2px] bg-red-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TimeSlotRow({
  slot,
  slotIdx,
  days,
  sessionGrid,
  viewMode,
  onSessionClick,
  onCellClick,
  showTeacher,
  showStudent,
  todayDay,
  isLast,
}: {
  slot: string
  slotIdx: number
  days: string[]
  sessionGrid: Record<string, Record<string, LearningSession[]>>
  viewMode: string
  onSessionClick?: (s: LearningSession) => void
  onCellClick?: (day: string, time: string) => void
  showTeacher: boolean
  showStudent: boolean
  todayDay: string
  isLast: boolean
}) {
  const hour = parseInt(slot.split(':')[0], 10)
  const label = formatTime12(slot)

  return (
    <>
      <div
        className="px-1 py-0 text-right pr-2 flex flex-col items-end"
        style={{
          borderBottom: isLast ? 'none' : '1px solid var(--card-border)',
          borderRight: '1px solid var(--card-border)',
          height: 64,
        }}
      >
        <span className="text-[10px] font-bold leading-none mt-1" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      {days.map((day) => {
        const cellSessions = sessionGrid[day]?.[slot] || []
        const isToday = day === todayDay
        return (
          <div
            key={`${day}-${slot}`}
            className="relative"
            style={{
              borderBottom: isLast ? 'none' : '1px solid var(--card-border)',
              borderRight: '1px solid var(--card-border)',
              background: isToday ? 'rgba(79,140,255,0.03)' : 'transparent',
              minHeight: 64,
            }}
          >
            {cellSessions.length === 0 && viewMode === 'admin' && onCellClick && (
              <button
                onClick={() => onCellClick(day, slot)}
                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
              >
                <span className="text-lg font-light">+</span>
              </button>
            )}
            <AnimatePresence>
              {cellSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onClick={onSessionClick}
                  viewMode={viewMode}
                  showTeacher={showTeacher}
                  showStudent={showStudent}
                />
              ))}
            </AnimatePresence>
          </div>
        )
      })}
    </>
  )
}

function SessionCard({
  session,
  onClick,
  viewMode,
  showTeacher,
  showStudent,
}: {
  session: LearningSession
  onClick?: (s: LearningSession) => void
  viewMode: string
  showTeacher: boolean
  showStudent: boolean
}) {
  const modeConfig = MODE_CONFIG[session.learning_mode] || MODE_CONFIG.SELF_STUDY
  const dotColor = STATUS_DOT[session.student_status] || STATUS_DOT.UPCOMING
  const startMin = timeToMinutes(session.start_time)
  const endMin = timeToMinutes(session.end_time)
  const durationMinutes = endMin - startMin
  const rows = Math.max(1, Math.round(durationMinutes / 60))
  const height = rows * 64 - 8

  const ModeIcon = modeConfig.Icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -1, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      className="absolute inset-x-1 top-1 rounded-lg p-2 cursor-pointer overflow-hidden transition-shadow"
      style={{
        height,
        background: modeConfig.bg,
        borderLeft: `3px solid ${modeConfig.color}`,
        border: `1px solid ${modeConfig.border}`,
        borderLeftWidth: 3,
        borderLeftColor: modeConfig.color,
        zIndex: 5,
      }}
      onClick={() => onClick?.(session)}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-[11px] font-bold leading-tight truncate" style={{ color: modeConfig.color }}>
          {session.subject?.name || 'Session'}
        </p>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${dotColor}`} />
      </div>

      <p className="text-[9px] font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>
        {formatTime12(session.start_time)} – {formatTime12(session.end_time)}
      </p>

      <div className="flex items-center gap-1 mt-1">
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[8px] font-bold uppercase"
          style={{ background: modeConfig.bg, color: modeConfig.color, border: `1px solid ${modeConfig.border}` }}
        >
          <ModeIcon size={8} />
          {getSessionModeLabel(session.learning_mode)}
        </span>
      </div>

      {(showTeacher || viewMode === 'admin') && session.teacher?.full_name && (
        <p className="text-[9px] font-semibold mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
          {session.teacher.full_name}
        </p>
      )}

      {showStudent && (session as any).enrollment?.student?.full_name && (
        <p className="text-[9px] font-semibold truncate" style={{ color: 'var(--text-muted)' }}>
          {(session as any).enrollment.student.full_name}
        </p>
      )}

      {height > 80 && session.topic && (
        <p className="text-[9px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
          {session.topic}
        </p>
      )}
    </motion.div>
  )
}

function SessionListItem({
  session,
  onClick,
  viewMode,
  showTeacher,
}: {
  session: LearningSession
  onClick?: (s: LearningSession) => void
  viewMode: string
  showTeacher: boolean
}) {
  const modeConfig = MODE_CONFIG[session.learning_mode] || MODE_CONFIG.SELF_STUDY
  const dotColor = STATUS_DOT[session.student_status] || STATUS_DOT.UPCOMING
  const ModeIcon = modeConfig.Icon

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-3 p-3 cursor-pointer"
      style={{ background: 'var(--card)' }}
      onClick={() => onClick?.(session)}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
            {session.subject?.name || 'Session'}
          </span>
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[9px] font-bold uppercase shrink-0"
            style={{ background: modeConfig.bg, color: modeConfig.color, border: `1px solid ${modeConfig.border}` }}
          >
            <ModeIcon size={9} />
            {getSessionModeLabel(session.learning_mode)}
          </span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {formatTime12(session.start_time)} – {formatTime12(session.end_time)}
        </p>
      </div>
      {showTeacher && session.teacher?.full_name && (
        <span className="text-[10px] font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>
          {session.teacher.full_name}
        </span>
      )}
    </motion.div>
  )
}
