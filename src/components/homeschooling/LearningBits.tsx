'use client'

import { CheckCircle2, XCircle, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// §17 — Preparation states. Every session visibly shows how ready
// its learning mission is.
export const PREPARATION_META: Record<string, { label: string; color: string; desc: string }> = {
  EMPTY: { label: 'Empty', color: '#9CA3AF', desc: 'This session is waiting for its learning mission.' },
  DRAFT: { label: 'Draft', color: '#F59E0B', desc: 'Your mission is not finished.' },
  READY: { label: 'Ready', color: '#4F8CFF', desc: 'Your mission is ready to publish.' },
  PUBLISHED: { label: 'Published', color: '#10B981', desc: 'Your student can access this mission.' },
  COMPLETED: { label: 'Completed', color: '#10B981', desc: 'Review your student’s evidence.' },
}

export default function PreparationBadge({
  state,
  showDesc,
}: {
  state: string
  showDesc?: boolean
}) {
  const meta = PREPARATION_META[state] || PREPARATION_META.EMPTY
  return (
    <span className="inline-flex flex-col gap-1">
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
        style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}45` }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
        {meta.label}
      </span>
      {showDesc && (
        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
          {meta.desc}
        </span>
      )}
    </span>
  )
}

// §74 — Attempt history timeline.
export function AttemptTimeline({ attempts }: { attempts: any[] }) {
  if (!attempts || attempts.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Attempt history
      </p>
      {attempts.map((a: any, i: number) => {
        const Icon: LucideIcon = a.is_correct === true ? CheckCircle2 : a.is_correct === false ? XCircle : Minus
        const color = a.is_correct === true ? '#10B981' : a.is_correct === false ? '#EF4444' : '#9CA3AF'
        return (
          <div
            key={a.id || i}
            className="flex items-center gap-2.5 rounded-xl border px-3 py-2"
            style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
          >
            <Icon size={15} style={{ color }} className="shrink-0" />
            <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>
              Attempt {a.attempt_number || i + 1}
            </span>
            {a.error_category && (
              <span className="text-[11px] font-semibold capitalize" style={{ color: 'var(--text-muted)' }}>
                · {(a.error_category as string).replace(/_/g, ' ')}
              </span>
            )}
            {(a.hints_used || 0) > 0 && (
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                · {a.hints_used} hint{(a.hints_used || 0) !== 1 ? 's' : ''}
              </span>
            )}
            {(a.support_level || 0) === 0 && a.is_correct && (
              <span className="ml-auto text-[10px] font-black uppercase" style={{ color: '#10B981' }}>
                Independent
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
