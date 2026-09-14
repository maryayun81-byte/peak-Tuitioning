'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Home, Clock, ChevronRight, AlertTriangle, CalendarDays, Users, Video, BookOpen, Sparkles } from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { getTeacherHomeschoolDigest } from '@/app/actions/homeschool-learning'
import { formatTimeRange, getSessionModeLabel } from '@/lib/homeschooling/constants'

// Teacher dashboard: today's + upcoming ALLOCATED homeschool sessions
// plus work awaiting review. Same data as the homeschool timetable.
const MODE_ACCENT: Record<string, { color: string; Icon: typeof Users }> = {
  TEACHER_LED: { color: '#4F8CFF', Icon: Users },
  SELF_STUDY: { color: '#10B981', Icon: BookOpen },
  AI_SUPPORTED: { color: '#A855F7', Icon: Sparkles },
  HYBRID: { color: '#F59E0B', Icon: Video },
}

function modeAccent(mode?: string) {
  return MODE_ACCENT[mode || ''] || { color: '#4F8CFF', Icon: Video }
}

function isDone(s: any) {
  return s.status === 'COMPLETED' || s.student_status === 'COMPLETED'
}

export default function TeacherHomeschoolWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTeacherHomeschoolDigest().then((res) => {
      if (res.success) setData(res.data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="p-5 rounded-2xl border animate-pulse" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
        <div className="h-3 w-40 rounded bg-[var(--input)] mb-2" />
        <div className="h-8 w-full rounded-xl bg-[var(--input)]" />
      </div>
    )
  }
  if (!data || (data.today.length === 0 && data.upcoming.length === 0 && data.pendingReview.length === 0)) {
    return (
      <Link href="/teacher/homeschooling" className="block">
        <Card className="p-5 cursor-pointer hover:shadow-md transition-all">
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shrink-0">
              <Home size={18} />
            </span>
            <span>
              <span className="block text-sm font-black" style={{ color: 'var(--text)' }}>Homeschooling</span>
              <span className="block text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                {data ? 'Nothing scheduled — open your homeschooling hub' : 'Your allocated sessions and reviews live here'}
              </span>
            </span>
            <ChevronRight size={15} className="ml-auto opacity-40" />
          </span>
        </Card>
      </Link>
    )
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <Home size={18} />
          </span>
          <span>
            <span className="block text-sm font-black" style={{ color: 'var(--text)' }}>Homeschooling today</span>
            <span className="block text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              {data.students} student{data.students !== 1 ? 's' : ''} allocated
            </span>
          </span>
        </span>
        <Link href="/teacher/homeschooling" className="flex items-center gap-1 text-[11px] font-black" style={{ color: 'var(--primary)' }}>
          Hub <ChevronRight size={12} />
        </Link>
      </div>

      {data.pendingReview.length > 0 && (
        <Link href="/teacher/homeschooling" className="block">
          <span className="flex items-center gap-2 rounded-xl border p-3" style={{ background: 'rgba(245,158,11,0.07)', borderColor: 'rgba(245,158,11,0.3)' }}>
            <AlertTriangle size={14} style={{ color: '#F59E0B' }} className="shrink-0" />
            <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>
              {data.pendingReview.length} submission{data.pendingReview.length !== 1 ? 's' : ''} awaiting your review
            </span>
          </span>
        </Link>
      )}

      {data.today.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {data.today.map((s: any, i: number) => {
            const accent = modeAccent(s.learning_mode)
            const AccentIcon = accent.Icon
            const done = isDone(s)
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link
                  href={`/teacher/homeschooling/session/${s.id}`}
                  className="group flex items-center gap-3 rounded-2xl border p-3.5 min-h-[76px] transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: 'var(--card)', borderColor: 'var(--card-border)', borderLeft: `4px solid ${accent.color}` }}
                >
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-md"
                    style={{ background: `linear-gradient(135deg, ${accent.color}, ${accent.color}99)` }}
                  >
                    <AccentIcon size={19} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-black truncate" style={{ color: 'var(--text)' }}>
                      {s.topic || s.subject?.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                      {s.student_name} · {getSessionModeLabel(s.learning_mode)}
                    </span>
                    <span
                      className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums"
                      style={{ background: `${accent.color}14`, color: accent.color }}
                    >
                      <Clock size={10} /> {formatTimeRange(s.start_time, s.end_time)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    {done ? (
                      <Badge variant="success" className="text-[9px]">Done</Badge>
                    ) : (
                      <Badge variant="info" className="text-[9px]">Today</Badge>
                    )}
                    <ChevronRight size={14} className="opacity-30 transition-transform group-hover:translate-x-0.5 group-hover:opacity-70" />
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          <Clock size={13} /> No sessions today — rest up or prepare ahead.
        </p>
      )}

      {data.upcoming.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            <CalendarDays size={12} /> Up next
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {data.upcoming.slice(0, 3).map((s: any, i: number) => {
              const accent = modeAccent(s.learning_mode)
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }}>
                  <Link
                    href={`/teacher/homeschooling/session/${s.id}`}
                    className="group block rounded-2xl border p-3.5 min-h-[76px] transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                    style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                        style={{ background: `${accent.color}14`, color: accent.color }}
                      >
                        <CalendarDays size={10} /> {s.day_label || s.day}
                      </span>
                      <span className="text-[10px] font-bold tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {formatTimeRange(s.start_time, s.end_time)}
                      </span>
                    </span>
                    <span className="mt-1.5 block truncate text-sm font-black" style={{ color: 'var(--text)' }}>
                      {s.topic || s.subject?.name}
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                        {s.student_name} · {getSessionModeLabel(s.learning_mode)}
                      </span>
                      <ChevronRight size={14} className="shrink-0 opacity-30 transition-transform group-hover:translate-x-0.5 group-hover:opacity-70" />
                    </span>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
