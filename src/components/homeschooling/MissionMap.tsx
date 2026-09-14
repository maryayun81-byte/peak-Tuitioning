'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Lock, CheckCircle2, PlayCircle, AlertTriangle, Clock, ChevronRight } from 'lucide-react'
import { getObjectiveStates, type ObjectiveState } from '@/app/actions/homeschool-learning'

// §47 — Mission map. Locked objectives explain themselves;
// assessment content is never exposed.
const STATE_META: Record<ObjectiveState, { label: string; color: string; Icon: typeof Clock }> = {
  LOCKED: { label: 'Locked', color: '#9CA3AF', Icon: Lock },
  AVAILABLE: { label: 'Ready', color: '#4F8CFF', Icon: PlayCircle },
  IN_PROGRESS: { label: 'In progress', color: '#4F8CFF', Icon: PlayCircle },
  ASSESSMENT_READY: { label: 'Ready to demonstrate', color: '#A855F7', Icon: PlayCircle },
  UNDER_REVIEW: { label: 'Under review', color: '#A855F7', Icon: Clock },
  NEEDS_REINFORCEMENT: { label: 'Strengthening', color: '#F59E0B', Icon: AlertTriangle },
  CORRECTIONS_REQUIRED: { label: 'Corrections', color: '#EF4444', Icon: AlertTriangle },
  MASTERED: { label: 'Mastered', color: '#10B981', Icon: CheckCircle2 },
}

export default function MissionMap({
  sessionId,
  studentId,
}: {
  sessionId: string
  studentId: string
}) {
  const [states, setStates] = useState<Array<{ objective_id: string; title: string; state: ObjectiveState }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getObjectiveStates(sessionId, studentId).then((res) => {
      if (res.success) setStates(res.data as any[])
      setLoading(false)
    })
  }, [sessionId, studentId])

  if (loading) {
    return <div className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--input)' }} />
  }
  if (states.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Your mission
      </p>
      {states.map((s, i) => {
        const meta = STATE_META[s.state]
        const Icon = meta.Icon
        return (
          <motion.div
            key={s.objective_id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 rounded-xl border p-3"
            style={{
              background: s.state === 'MASTERED' ? 'rgba(16,185,129,0.06)' : 'var(--card)',
              borderColor: s.state === 'LOCKED' ? 'var(--card-border)' : `${meta.color}45`,
              opacity: s.state === 'LOCKED' ? 0.75 : 1,
            }}
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-black"
              style={{ background: `${meta.color}18`, color: meta.color }}
            >
              {s.state === 'MASTERED' ? <CheckCircle2 size={16} /> : s.state === 'LOCKED' ? <Lock size={14} /> : <span>{String(i + 1).padStart(2, '0')}</span>}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                {s.title}
              </span>
              <span className="text-[11px] font-semibold" style={{ color: meta.color }}>
                {s.state === 'LOCKED'
                  ? 'Complete the previous objective to unlock this one.'
                  : meta.label}
              </span>
            </span>
            <Icon size={15} style={{ color: meta.color }} className="shrink-0" />
          </motion.div>
        )
      })}
      <Link
        href={`/student/homeschooling/session/${sessionId}`}
        className="flex items-center justify-end gap-1 text-[11px] font-black"
        style={{ color: 'var(--primary)' }}
      >
        Open mission <ChevronRight size={12} />
      </Link>
    </div>
  )
}
