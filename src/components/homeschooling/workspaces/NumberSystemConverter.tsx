'use client'

import { useState } from 'react'
import type { WorkspaceProps } from './registry'

// Generic stepped converter (e.g. decimal → binary/hex): student records
// each division/remainder step. The steps ARE the evidence.
export default function NumberSystemConverter({ question, initialWorking, readOnly, onWorkingChange }: WorkspaceProps) {
  const [steps, setSteps] = useState<string[]>(() => {
    const saved = (initialWorking as any)?.steps
    return Array.isArray(saved) && saved.length > 0 ? saved : ['']
  })
  const [result, setResult] = useState<string>((initialWorking as any)?.result ?? '')

  const emit = (s: string[], r: string) => onWorkingChange?.({ steps: s, result: r }, r)

  const setStep = (i: number, v: string) => {
    if (readOnly) return
    const next = [...steps]
    next[i] = v
    setSteps(next)
    emit(next, result)
  }
  const addStep = () => {
    if (readOnly) return
    const next = [...steps, '']
    setSteps(next)
    emit(next, result)
  }
  const removeStep = (i: number) => {
    if (readOnly || steps.length <= 1) return
    const next = steps.filter((_, k) => k !== i)
    setSteps(next)
    emit(next, result)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Show each step
      </p>
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black"
            style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
          >
            {i + 1}
          </span>
          <input
            value={s}
            onChange={(e) => setStep(i, e.target.value)}
            readOnly={readOnly}
            disabled={readOnly}
            placeholder={i === 0 ? 'e.g. 45 ÷ 2 = 22 remainder 1' : 'Next step…'}
            className="flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
          />
          {steps.length > 1 && !readOnly && (
            <button
              type="button"
              onClick={() => removeStep(i)}
              className="text-xs font-bold px-2 py-1 rounded-lg"
              style={{ color: 'var(--text-muted)' }}
              aria-label={`Remove step ${i + 1}`}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button
          type="button"
          onClick={addStep}
          className="text-xs font-bold px-3 py-2 rounded-xl border"
          style={{ borderColor: 'var(--card-border)', color: 'var(--primary)' }}
        >
          + Add step
        </button>
      )}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
          Final answer
        </p>
        <input
          value={result}
          onChange={(e) => { setResult(e.target.value); emit(steps, e.target.value) }}
          readOnly={readOnly}
          disabled={readOnly}
          placeholder="Your final answer…"
          className="w-full rounded-xl border px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-primary/30"
          style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
        />
      </div>
    </div>
  )
}
