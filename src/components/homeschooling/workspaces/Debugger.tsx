'use client'

import { useMemo, useState } from 'react'
import type { WorkspaceProps } from './registry'

// §60 — Debugger. Student diagnoses: picks the faulty line, predicts cause,
// proposes the fix. Evidence = diagnosis + explanation (not just final code).
export default function Debugger({ question, initialWorking, readOnly, onWorkingChange }: WorkspaceProps) {
  const cfg = (question.config as any) || {}
  const codeLines: string[] = useMemo(() => {
    if (Array.isArray(cfg.code_lines) && cfg.code_lines.length > 0) return cfg.code_lines
    const raw = String(cfg.code || (initialWorking as any)?.code || '')
    return raw ? raw.split('\n') : ['// No code provided by teacher yet.']
  }, [cfg, initialWorking])
  const expected: string = cfg.expected_output ?? ''
  const actual: string = cfg.actual_output ?? ''
  const testCase: string = cfg.test_case ?? ''

  const [faultyLine, setFaultyLine] = useState<number | null>((initialWorking as any)?.faulty_line ?? null)
  const [cause, setCause] = useState<string>((initialWorking as any)?.cause ?? '')
  const [fix, setFix] = useState<string>((initialWorking as any)?.fix ?? String((initialWorking as any)?.fixed_code ?? ''))

  const emit = (l: number | null, c: string, f: string) =>
    onWorkingChange?.(
      { faulty_line: l, cause: c, fix: f, test_case: testCase },
      l === null ? '' : `Line ${l + 1}: ${c}`
    )

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { label: 'Test case', value: testCase || '—' },
          { label: 'Expected', value: expected || '—' },
          { label: 'Actual', value: actual || '—' },
        ].map((b) => (
          <div key={b.label} className="rounded-xl border p-3" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{b.label}</p>
            <p className="font-mono text-sm mt-1" style={{ color: 'var(--text)' }}>{b.value}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          1 · Tap the faulty line
        </p>
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
          {codeLines.map((line, i) => (
            <button
              key={i}
              type="button"
              disabled={readOnly}
              onClick={() => { setFaultyLine(i); emit(i, cause, fix) }}
              aria-pressed={faultyLine === i}
              className="flex w-full items-center gap-3 px-3 py-2 font-mono text-[13px] text-left min-h-[44px]"
              style={{ background: faultyLine === i ? 'rgba(239,68,68,0.12)' : '#0B0F1A', color: '#E6EDF3' }}
            >
              <span className="w-8 shrink-0 text-right" style={{ color: faultyLine === i ? '#EF4444' : '#64748B' }}>{i + 1}</span>
              <span className="flex-1 whitespace-pre-wrap">{line}</span>
              {faultyLine === i && <span aria-hidden>⚠</span>}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }} htmlFor="dbg-cause">
          2 · What is the cause?
        </label>
        <input
          id="dbg-cause"
          value={cause}
          onChange={(e) => { setCause(e.target.value); emit(faultyLine, e.target.value, fix) }}
          readOnly={readOnly} disabled={readOnly}
          placeholder="e.g. Off-by-one: loop stops one step early"
          className="w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none min-h-[44px]"
          style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }} htmlFor="dbg-fix">
          3 · Write the corrected line / block
        </label>
        <textarea
          id="dbg-fix"
          value={fix}
          onChange={(e) => { setFix(e.target.value); emit(faultyLine, cause, e.target.value) }}
          readOnly={readOnly} disabled={readOnly}
          rows={3}
          placeholder="Type the fix here…"
          className="w-full rounded-xl border px-4 py-3 font-mono text-[13px] outline-none"
          style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
        />
      </div>
    </div>
  )
}
