'use client'

import { useMemo, useState } from 'react'
import type { WorkspaceProps } from './registry'

// Ordering board: move steps up/down into the correct sequence.
export default function OrderingBoard({ question, initialWorking, readOnly, onWorkingChange }: WorkspaceProps) {
  const items: string[] = useMemo(() => {
    const cfg = (question.config as any)?.items
    if (Array.isArray(cfg) && cfg.length > 0) return cfg
    return []
  }, [question.config])

  const [order, setOrder] = useState<number[]>(() => {
    const saved = (initialWorking as any)?.order
    if (Array.isArray(saved) && saved.length === items.length) return saved
    return items.map((_, i) => i)
  })

  const emit = (o: number[]) =>
    onWorkingChange?.({ order: o }, o.map((i) => items[i]))

  const move = (pos: number, dir: -1 | 1) => {
    if (readOnly) return
    const next = [...order]
    const swap = pos + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[pos], next[swap]] = [next[swap], next[pos]]
    setOrder(next)
    emit(next)
  }

  if (items.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        No steps configured for this activity yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {order.map((itemIdx, pos) => (
        <div
          key={itemIdx}
          className="flex items-center gap-2 rounded-xl border p-2.5"
          style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}
        >
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black"
            style={{ background: 'var(--card)', color: 'var(--primary)' }}
          >
            {pos + 1}
          </span>
          <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {items[itemIdx]}
          </span>
          {!readOnly && (
            <span className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => move(pos, -1)}
                disabled={pos === 0}
                className="px-2 py-0.5 rounded-md text-xs font-black disabled:opacity-30"
                style={{ background: 'var(--card)', color: 'var(--text)' }}
                aria-label={`Move step ${pos + 1} up`}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(pos, 1)}
                disabled={pos === order.length - 1}
                className="px-2 py-0.5 rounded-md text-xs font-black disabled:opacity-30"
                style={{ background: 'var(--card)', color: 'var(--text)' }}
                aria-label={`Move step ${pos + 1} down`}
              >
                ↓
              </button>
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
