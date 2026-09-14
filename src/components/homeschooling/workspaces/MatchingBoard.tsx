'use client'

import { useMemo, useState } from 'react'
import type { WorkspaceProps } from './registry'

// Matching board: tap a left item, then its match. Order-free.
export default function MatchingBoard({ question, initialWorking, readOnly, onWorkingChange }: WorkspaceProps) {
  const pairs: Array<{ left: string; right: string }> = useMemo(() => {
    const cfg = (question.config as any)?.pairs
    if (Array.isArray(cfg) && cfg.length > 0) return cfg
    return []
  }, [question.config])

  // Deterministic shuffle of the right column (stable per question)
  const rightOrder = useMemo(() => {
    const idx = pairs.map((_, i) => i)
    let seed = question.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[idx[i], idx[j]] = [idx[j], idx[i]]
    }
    return idx
  }, [pairs, question.id])

  const [matches, setMatches] = useState<Record<number, number>>(
    () => ((initialWorking as any)?.matches || {})
  )
  const [selected, setSelected] = useState<number | null>(null)

  const emit = (m: Record<number, number>) => {
    const answer = pairs.map((p, i) => ({ left: p.left, matched: m[i] !== undefined ? pairs[m[i]].right : null }))
    onWorkingChange?.({ matches: m }, answer)
  }

  const tapLeft = (i: number) => {
    if (readOnly) return
    if (matches[i] !== undefined) {
      const next = { ...matches }
      delete next[i]
      setMatches(next)
      emit(next)
      return
    }
    setSelected(i)
  }

  const tapRight = (j: number) => {
    if (readOnly || selected === null) return
    const next = { ...matches, [selected]: j }
    setMatches(next)
    setSelected(null)
    emit(next)
  }

  if (pairs.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        No pairs configured for this activity yet.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-2">
        {pairs.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => tapLeft(i)}
            disabled={readOnly}
            className="w-full rounded-xl border px-3 py-2.5 text-sm font-bold text-left transition-all disabled:opacity-60"
            style={{
              background: selected === i ? 'rgba(79,140,255,0.14)' : matches[i] !== undefined ? 'rgba(16,185,129,0.1)' : 'var(--input)',
              borderColor: selected === i ? 'var(--primary)' : matches[i] !== undefined ? '#10B981' : 'var(--card-border)',
              color: 'var(--text)',
            }}
          >
            {p.left}
            {matches[i] !== undefined && (
              <span className="block text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                → {pairs[matches[i]].right}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {rightOrder.map((j) => {
          const usedBy = Object.entries(matches).find(([, v]) => v === j)?.[0]
          return (
            <button
              key={j}
              type="button"
              onClick={() => tapRight(j)}
              disabled={readOnly || selected === null}
              className="w-full rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all disabled:opacity-60"
              style={{
                background: usedBy !== undefined ? 'rgba(16,185,129,0.1)' : 'var(--input)',
                borderColor: usedBy !== undefined ? '#10B981' : 'var(--card-border)',
                color: 'var(--text)',
              }}
            >
              {pairs[j].right}
            </button>
          )
        })}
      </div>
    </div>
  )
}
