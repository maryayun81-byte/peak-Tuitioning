'use client'

import { motion } from 'framer-motion'
import { Clock, Users, BookOpen, Sparkles, CheckCircle2, AlertCircle, PlayCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Card'
import { formatTimeRange, getSessionModeLabel } from '@/lib/homeschooling/constants'
import type { LearningSession } from '@/types/homeschooling'

interface LearningSessionCardProps {
  session: LearningSession
  onClick?: () => void
  compact?: boolean
}

const MODE_CONFIG: Record<string, { color: string; bg: string; border: string; Icon: typeof Users }> = {
  TEACHER_LED: { color: '#4F8CFF', bg: 'rgba(79,140,255,0.12)', border: 'rgba(79,140,255,0.3)', Icon: Users },
  SELF_STUDY: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', Icon: BookOpen },
  AI_SUPPORTED: { color: '#A855F7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)', Icon: Sparkles },
  HYBRID: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', Icon: Users },
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  COMPLETED: { color: '#10B981', icon: CheckCircle2 },
  IN_PROGRESS: { color: '#4F8CFF', icon: PlayCircle },
  SUBMISSION_PENDING: { color: '#F59E0B', icon: AlertCircle },
  UNDER_REVIEW: { color: '#A855F7', icon: AlertCircle },
  CORRECTIONS_REQUIRED: { color: '#EF4444', icon: AlertCircle },
  UPCOMING: { color: '#6B7280', icon: Clock },
  READY: { color: '#6366F1', icon: Clock },
  MISSED: { color: '#EF4444', icon: AlertCircle },
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export function LearningSessionCard({ session, onClick, compact }: LearningSessionCardProps) {
  const modeConfig = MODE_CONFIG[session.learning_mode] || MODE_CONFIG.SELF_STUDY
  const statusConfig = STATUS_CONFIG[session.student_status] || STATUS_CONFIG.UPCOMING
  const StatusIcon = statusConfig.icon

  return (
    <motion.div whileHover={onClick ? { y: -2 } : undefined} whileTap={onClick ? { scale: 0.98 } : undefined}>
      <Card
        className={`p-4 transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
        style={{ borderLeft: `3px solid ${modeConfig.color}` }}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: modeConfig.bg, color: modeConfig.color, border: `1px solid ${modeConfig.border}` }}
              >
                <modeConfig.Icon size={10} />
                {getSessionModeLabel(session.learning_mode)}
              </span>
              <span className="text-[10px] font-bold" style={{ color: statusConfig.color }}>
                <StatusIcon size={11} className="inline mr-0.5" />
                {session.student_status?.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
              <Clock size={14} className="shrink-0 opacity-50" />
              <span>{formatTimeRange(session.start_time, session.end_time)}</span>
              <span className="text-[10px] font-bold opacity-40">•</span>
              <span className="text-xs opacity-70">{session.subject?.name}</span>
            </div>

            {!compact && session.topic && (
              <p className="text-sm font-semibold mt-1.5 line-clamp-2" style={{ color: 'var(--text)' }}>
                {session.topic}
              </p>
            )}

            {!compact && session.teacher?.full_name && (
              <p className="text-[11px] font-bold mt-2 opacity-50">
                with {session.teacher.full_name}
              </p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
