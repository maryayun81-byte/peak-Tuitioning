'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Home, Clock, ChevronRight, AlertTriangle, CalendarDays } from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { getTeacherHomeschoolDigest } from '@/app/actions/homeschool-learning'
import { formatTimeRange, getSessionModeLabel } from '@/lib/homeschooling/constants'

// Teacher dashboard: today's + upcoming ALLOCATED homeschool sessions
// plus work awaiting review. Same data as the homeschool timetable.
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
        <div className="space-y-2">
          {data.today.map((s: any) => (
            <Link key={s.id} href={`/teacher/homeschooling/session/${s.id}`} className="block">
              <motion.span whileTap={{ scale: 0.98 }} className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer hover:border-[var(--primary)] transition-colors" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                <span className="text-xs font-black whitespace-nowrap" style={{ color: 'var(--text)' }}>
                  {formatTimeRange(s.start_time, s.end_time)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-black truncate" style={{ color: 'var(--text)' }}>
                    {s.topic || s.subject?.name}
                  </span>
                  <span className="block text-[11px] font-semibold truncate" style={{ color: 'var(--text-muted)' }}>
                    {s.student_name} · {getSessionModeLabel(s.learning_mode)}
                  </span>
                </span>
                {s.status === 'COMPLETED' || s.student_status === 'COMPLETED' ? (
                  <Badge variant="success" className="text-[9px]">Done</Badge>
                ) : (
                  <Badge variant="info" className="text-[9px]">Today</Badge>
                )}
              </motion.span>
            </Link>
          ))}
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
          <div className="space-y-1.5">
            {data.upcoming.slice(0, 3).map((s: any) => (
              <Link key={s.id} href={`/teacher/homeschooling/session/${s.id}`} className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text)' }}>
                <span style={{ color: 'var(--primary)' }}>{s.day_label}</span>
                <span style={{ color: 'var(--text-muted)' }}>{formatTimeRange(s.start_time, s.end_time)}</span>
                <span className="truncate">{s.topic || s.subject?.name} · {s.student_name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
