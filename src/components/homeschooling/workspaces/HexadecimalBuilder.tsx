'use client'

import { useMemo, useState } from 'react'
import type { WorkspaceProps } from './registry'

const HEX_DIGITS = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F']
const HEX_VALUE: Record<string, number> = {
  A: 10, B: 11, C: 12, D: 13, E: 14, F: 15,
}
const digitValue = (d: string): number => HEX_VALUE[d] ?? Number(d);

// §58 — Hexadecimal builder. Reason over each power of 16; the final
// total alone is not enough where the teacher configured reasoning.
export default function HexadecimalBuilder({ question, initialWorking, readOnly, onWorkingChange }: WorkspaceProps) {
  const digits: number = useMemo(() => {
    const n = Number((question.config as any)?.digits)
    return Number.isFinite(n) && n >= 1 && n <= 4 ? n : 2
  }, [question.config])

  const [values, setValues] = useState<string[]>(() => {
    const saved = (initialWorking as any)?.digits
    if (Array.isArray(saved) && saved.length === digits) return saved
    return Array(digits).fill('0')
  })

  const powers = useMemo(
    () => Array.from({ length: digits }, (_, i) => Math.pow(16, digits - 1 - i)),
    [digits]
  )
  const total = values.reduce((s, d, i) => s + digitValue(d) * powers[i], 0)

  const cycle = (i: number, dir: 1 | -1) => {
    if (readOnly) return
    const idx = HEX_DIGITS.indexOf(values[i])
    const next = [...values]
    next[i] = HEX_DIGITS[(idx + dir + HEX_DIGITS.length) % HEX_DIGITS.length]
    setValues(next)
    const t = next.reduce((s, d, k) => s + digitValue(d) * powers[k], 0)
    onWorkingChange?.(
      {
        digits: next,
        terms: next.map((d, k) => ({ digit: d, power: powers[k], product: digitValue(d) * powers[k] })),
        total: t,
      },
      t
    )
  }

  const setDigit = (i: number, raw: string) => {
    if (readOnly) return
    const d = raw.toUpperCase().slice(-1)
    if (!HEX_DIGITS.includes(d)) return
    const next = [...values]
    next[i] = d
    setValues(next)
    const t = next.reduce((s, x, k) => s + digitValue(x) * powers[k], 0)
    onWorkingChange?.(
      {
        digits: next,
        terms: next.map((x, k) => ({ digit: x, power: powers[k], product: digitValue(x) * powers[k] })),
        total: t,
      },
      t
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-center flex-wrap">
        {values.map((d, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1 rounded-xl border px-3 py-2 min-w-[76px]"
            style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}
          >
            <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
              16<sup>{digits - 1 - i}</sup> = {powers[i]}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => cycle(i, -1)}
                disabled={readOnly}
                className="px-1.5 py-0.5 rounded-lg text-sm font-black disabled:opacity-40"
                style={{ background: 'var(--card)', color: 'var(--text-muted)' }}
                aria-label="Previous digit"
              >
                −
              </button>
              <input
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
                maxLength={1}
                aria-label={`Hex digit ${i + 1}`}
                className="w-9 text-center text-xl font-black rounded-lg border outline-none"
                style={{ background: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--primary)' }}
              />
              <button
                type="button"
                onClick={() => cycle(i, 1)}
                disabled={readOnly}
                className="px-1.5 py-0.5 rounded-lg text-sm font-black disabled:opacity-40"
                style={{ background: 'var(--card)', color: 'var(--text-muted)' }}
                aria-label="Next digit"
              >
                +
              </button>
            </div>
            <span className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
              {d} × {powers[i]} = <span style={{ color: 'var(--text)' }}>{digitValue(d) * powers[i]}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-3 text-center text-sm font-bold" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
        Total = <span className="text-base font-black" style={{ color: 'var(--primary)' }}>{total}</span>
      </div>
    </div>
  )
}
