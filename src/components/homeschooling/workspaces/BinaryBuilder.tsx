'use client'

import { useMemo, useState } from 'react'
import type { WorkspaceProps } from './registry'

// §57 — Binary builder. The process is evaluated, not just the total:
// toggling place values, per-place products, then the sum.
export default function BinaryBuilder({ question, initialWorking, readOnly, onWorkingChange }: WorkspaceProps) {
  const places: number[] = useMemo(() => {
    const cfg = (question.config as any)?.places
    if (Array.isArray(cfg) && cfg.length > 0) return cfg
    return [32, 16, 8, 4, 2, 1]
  }, [question.config])

  const [bits, setBits] = useState<number[]>(() => {
    const saved = (initialWorking as any)?.bits
    if (Array.isArray(saved) && saved.length === places.length) return saved
    return places.map(() => 0)
  })

  const terms = places.map((p, i) => ({ place: p, bit: bits[i], product: p * bits[i] }))
  const total = terms.reduce((s, t) => s + t.product, 0)

  const toggle = (i: number) => {
    if (readOnly) return
    const next = bits.map((b, j) => (j === i ? (b === 1 ? 0 : 1) : b))
    setBits(next)
    const t = places.map((p, k) => p * next[k])
    onWorkingChange?.(
      { bits: next, terms: places.map((p, k) => ({ place: p, bit: next[k], product: p * next[k] })), total: t.reduce((a, b) => a + b, 0) },
      t.reduce((a, b) => a + b, 0)
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-center flex-wrap">
        {places.map((p, i) => (
          <button
            key={p}
            type="button"
            onClick={() => toggle(i)}
            disabled={readOnly}
            aria-pressed={bits[i] === 1}
            className="flex flex-col items-center gap-1 rounded-xl border px-3 py-2 min-w-[52px] transition-all disabled:opacity-60"
            style={{
              background: bits[i] === 1 ? 'rgba(16,185,129,0.14)' : 'var(--input)',
              borderColor: bits[i] === 1 ? '#10B981' : 'var(--card-border)',
            }}
          >
            <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{p}</span>
            <span className="text-xl font-black" style={{ color: bits[i] === 1 ? '#10B981' : 'var(--text)' }}>
              {bits[i]}
            </span>
          </button>
        ))}
      </div>
      <div className="rounded-xl p-3 text-center text-xs font-semibold" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
        {terms.map((t) => `${t.place} × ${t.bit}`).join('  +  ')}
        <span className="mx-2 font-black" style={{ color: 'var(--text)' }}>=</span>
        <span className="text-base font-black" style={{ color: 'var(--primary)' }}>{total}</span>
      </div>
    </div>
  )
}
