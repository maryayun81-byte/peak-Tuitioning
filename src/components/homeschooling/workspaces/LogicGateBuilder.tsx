'use client'

import { useMemo, useState } from 'react'
import type { WorkspaceProps } from './registry'

// §62 — Logic gate builder. Student picks a gate, toggles inputs, predicts the
// output; the truth table updates interactively. Evidence = prediction + reasoning.
const GATES = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR'] as const
type Gate = (typeof GATES)[number]

function compute(gate: Gate, a: boolean, b: boolean): boolean {
  switch (gate) {
    case 'AND': return a && b
    case 'OR': return a || b
    case 'NOT': return !a
    case 'NAND': return !(a && b)
    case 'NOR': return !(a || b)
    case 'XOR': return a !== b
  }
}

export default function LogicGateBuilder({ question, initialWorking, readOnly, onWorkingChange }: WorkspaceProps) {
  const cfg = (question.config as any) || {}
  const [gate, setGate] = useState<Gate>(() => (GATES as readonly string[]).includes((initialWorking as any)?.gate) ? (initialWorking as any).gate : (cfg.gate || 'AND'))
  const [a, setA] = useState<boolean>((initialWorking as any)?.a ?? false)
  const [b, setB] = useState<boolean>((initialWorking as any)?.b ?? false)
  const [prediction, setPrediction] = useState<number | null>((initialWorking as any)?.prediction ?? null)

  const actual = compute(gate, a, b) ? 1 : 0
  const rows = useMemo(() => {
    const out: Array<{ a: number; b: number; o: number }> = []
    for (const x of [0, 1]) for (const y of [0, 1]) out.push({ a: x, b: y, o: compute(gate, x === 1, y === 1) ? 1 : 0 })
    return gate === 'NOT' ? [{ a: a ? 1 : 0, b: -1, o: actual }] : out
  }, [gate, a, actual])

  const emit = (g: Gate, x: boolean, y: boolean, p: number | null) => {
    onWorkingChange?.(
      { gate: g, a: x, b: y, prediction: p, actual, truth_table: rows },
      p === null ? '' : `Gate ${g} with A=${x ? 1 : 0}${g === 'NOT' ? '' : `, B=${y ? 1 : 0}`} → predicted ${p}`
    )
  }

  const single = gate === 'NOT'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose gate">
        {GATES.map((g) => (
          <button key={g} type="button" disabled={readOnly}
            onClick={() => { setGate(g); setPrediction(null); emit(g, a, b, null) }}
            aria-pressed={gate === g}
            className="rounded-xl border px-4 py-2.5 text-sm font-black min-h-[44px]"
            style={{
              background: gate === g ? 'rgba(16,185,129,0.14)' : 'var(--input)',
              borderColor: gate === g ? '#10B981' : 'var(--card-border)',
              color: gate === g ? '#10B981' : 'var(--text)',
            }}>{g}</button>
        ))}
      </div>

      <div className="flex items-center gap-4 rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
        <div className="flex gap-2">
          <button type="button" disabled={readOnly} aria-pressed={a}
            onClick={() => { const v = !a; setA(v); emit(gate, v, b, prediction) }}
            className="rounded-xl border px-4 py-3 text-lg font-black min-w-[56px] min-h-[48px]"
            style={{ background: a ? 'rgba(16,185,129,0.14)' : 'var(--input)', borderColor: a ? '#10B981' : 'var(--card-border)' }}>
            A={a ? 1 : 0}
          </button>
          {!single && (
            <button type="button" disabled={readOnly} aria-pressed={b}
              onClick={() => { const v = !b; setB(v); emit(gate, a, v, prediction) }}
              className="rounded-xl border px-4 py-3 text-lg font-black min-w-[56px] min-h-[48px]"
              style={{ background: b ? 'rgba(16,185,129,0.14)' : 'var(--input)', borderColor: b ? '#10B981' : 'var(--card-border)' }}>
              B={b ? 1 : 0}
            </button>
          )}
        </div>
        <span className="text-xl font-black" style={{ color: 'var(--text-muted)' }}>{gate}</span>
        <span className="text-xl font-black" style={{ color: 'var(--primary)' }}>→ {single ? '(predict below)' : `Q=${actual}`}</span>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Predict the output</p>
        <div className="flex gap-2">
          {[0, 1].map((v) => (
            <button key={v} type="button" disabled={readOnly}
              onClick={() => { setPrediction(v); emit(gate, a, b, v) }}
              aria-pressed={prediction === v}
              className="flex-1 rounded-xl border py-3 text-lg font-black min-h-[48px]"
              style={{
                background: prediction === v ? (v === actual ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.12)') : 'var(--input)',
                borderColor: prediction === v ? (v === actual ? '#10B981' : '#EF4444') : 'var(--card-border)',
                color: prediction === v ? (v === actual ? '#10B981' : '#EF4444') : 'var(--text)',
              }}>{v}</button>
          ))}
        </div>
        {prediction !== null && (
          <p className="mt-2 text-sm font-bold" style={{ color: prediction === actual ? '#10B981' : '#EF4444' }}>
            {prediction === actual ? '✓ Correct — the truth table agrees.' : 'Not quite — check the truth table and try again.'}
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--card-border)' }}>
        <table className="w-full text-sm text-center">
          <thead>
            <tr style={{ background: 'var(--input)' }}>
              <th className="px-3 py-2 font-bold" style={{ color: 'var(--text-muted)' }}>A</th>
              {!single && <th className="px-3 py-2 font-bold" style={{ color: 'var(--text-muted)' }}>B</th>}
              <th className="px-3 py-2 font-bold" style={{ color: 'var(--text-muted)' }}>Q</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--card-border)', background: (single || (r.a === (a ? 1 : 0) && r.b === (b ? 1 : 0))) && i === rows.length - 1 ? 'rgba(16,185,129,0.08)' : undefined }}>
                <td className="px-3 py-1.5 font-mono font-bold">{r.a}</td>
                {!single && <td className="px-3 py-1.5 font-mono font-bold">{r.b}</td>}
                <td className="px-3 py-1.5 font-mono font-bold">{r.o}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
