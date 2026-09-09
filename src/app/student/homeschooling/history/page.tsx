'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { History, Search, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, Badge } from '@/components/ui/Card'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { getHomeschoolDashboardData, getLearningSessions } from '@/app/actions/homeschooling'
import { formatTimeRange } from '@/lib/homeschooling/constants'
import type { LearningSession } from '@/types/homeschooling'

const HISTORY_STATUSES = ['COMPLETED', 'MISSED', 'CANCELLED', 'CORRECTIONS_REQUIRED']

const STATUS_STYLE: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; label: string; Icon: typeof CheckCircle2; color: string }> = {
  COMPLETED: { variant: 'success', label: 'Completed', Icon: CheckCircle2, color: '#10B981' },
  MISSED: { variant: 'danger', label: 'Missed', Icon: AlertTriangle, color: '#EF4444' },
  CANCELLED: { variant: 'muted', label: 'Cancelled', Icon: XCircle, color: '#6B7280' },
  CORRECTIONS_REQUIRED: { variant: 'warning', label: 'Corrections', Icon: AlertTriangle, color: '#F59E0B' },
}

export default function HomeschoolHistoryPage() {
  const router = useRouter()
  const { student } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<LearningSession[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (student?.id) loadData()
  }, [student?.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const dashResult = await getHomeschoolDashboardData(student!.id)
      if (!dashResult.success || !dashResult.data?.enrollment) {
        setLoading(false)
        return
      }
      const res = await getLearningSessions(undefined, dashResult.data.enrollment.id)
      if (res.success && res.data) {
        const done = (res.data as LearningSession[]).filter(
          (s) => s.student_status === 'COMPLETED' || HISTORY_STATUSES.includes(s.status)
        )
        setSessions(done)
      }
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((s) =>
      (s.topic || '').toLowerCase().includes(q) ||
      (s.subject?.name || '').toLowerCase().includes(q) ||
      (s.teacher?.full_name || '').toLowerCase().includes(q)
    )
  }, [sessions, search])

  const grouped = useMemo(() => {
    const map = new Map<number, LearningSession[]>()
    for (const s of filtered) {
      const weekNo = (s as any).week?.week_number || 0
      if (!map.has(weekNo)) map.set(weekNo, [])
      map.get(weekNo)!.push(s)
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0])
  }, [filtered])

  if (loading) return <SkeletonDashboard />

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(79,140,255,0.12)' }}>
            <History size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
              Learning History
            </h1>
            <p className="text-xs font-bold opacity-50 mt-0.5">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} on record
            </p>
          </div>
        </div>
      </motion.div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
        <input
          type="text"
          placeholder="Search by topic, subject, or teacher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none"
          style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <History size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-bold opacity-50">
            {sessions.length === 0 ? 'No completed sessions yet — your history builds as you learn.' : 'No sessions match your search.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([weekNo, list]) => (
            <div key={weekNo}>
              <h2 className="text-xs font-black uppercase tracking-wider opacity-50 mb-2">
                {weekNo > 0 ? `Week ${weekNo}` : 'Earlier'} · {list.length}
              </h2>
              <div className="space-y-2">
                {list.map((s) => {
                  const key = s.student_status === 'COMPLETED' ? 'COMPLETED' : s.status
                  const meta = STATUS_STYLE[key] || STATUS_STYLE.COMPLETED
                  const StatusIcon = meta.Icon
                  return (
                    <button
                      key={s.id}
                      onClick={() => router.push(`/student/homeschooling/session/${s.id}`)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left hover:opacity-85 transition-opacity"
                      style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}
                    >
                      <StatusIcon size={17} style={{ color: meta.color }} className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                          {s.topic || s.subject?.name || 'Learning Session'}
                        </p>
                        <p className="text-[11px] font-semibold opacity-50">
                          {s.subject?.name} · {s.day} · {formatTimeRange(s.start_time, s.end_time)}
                        </p>
                      </div>
                      <Badge variant={meta.variant} className="text-[9px] uppercase shrink-0">{meta.label}</Badge>
                      <ChevronRight size={15} className="opacity-30 shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
