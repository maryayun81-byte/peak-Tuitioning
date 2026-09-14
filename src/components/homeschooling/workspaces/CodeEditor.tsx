'use client'

import { useMemo, useState } from 'react'
import type { WorkspaceProps } from './registry'

// §59 — Code editor. Safe predefined tests only (no arbitrary server exec).
// Teacher sets question.config: { language, starter, tests: [{input, expected, hint}], solution_hint }.
// Student writes code, runs visible checks, and every run is evidence (attempt history).
export default function CodeEditor({ question, initialWorking, initialAnswer, readOnly, onWorkingChange }: WorkspaceProps) {
  const cfg = (question.config as any) || {}
  const language: string = cfg.language || 'javascript'
  const starter: string = cfg.starter || (initialAnswer as string) || ''
  const tests: Array<{ input?: string; expected: string; hint?: string }> = Array.isArray(cfg.tests) ? cfg.tests : []

  const [code, setCode] = useState<string>(() => String((initialWorking as any)?.code ?? starter ?? ''))
  const [output, setOutput] = useState<string>('')
  const [results, setResults] = useState<Array<{ pass: boolean; expected: string; got: string }>>([])
  const [runs, setRuns] = useState<number>(Number((initialWorking as any)?.runs ?? 0))
  const [showHint, setShowHint] = useState(false)

  const runChecks = () => {
    if (readOnly) return
    // Client-side safe runner: evaluate code as a function body returning a value.
    // Tests call the student's `solve` function when defined, else compare stdout.
    let got = ''
    let passList: Array<{ pass: boolean; expected: string; got: string }> = []
    try {
      const fn = new Function(`${code}\n; return (typeof solve === 'function') ? solve : null;`)
      const solve = fn() as ((...a: any[]) => any) | null
      if (tests.length === 0) {
        const outFn = new Function(`${code}`)
        const r = outFn()
        got = String(r ?? 'Ran without errors.')
        passList = []
      } else {
        passList = tests.map((t) => {
          try {
            let val: any = null
            if (solve) {
              const args = t.input ? JSON.parse(`[${t.input}]`) : []
              val = solve(...args)
            } else {
              val = new Function(`${code}\n; return undefined;`)()
            }
            const s = String(val ?? '')
            return { pass: s.trim() === String(t.expected).trim(), expected: String(t.expected), got: s }
          } catch (e: any) {
            return { pass: false, expected: String(t.expected), got: `Error: ${e?.message || e}` }
          }
        })
        const passed = passList.filter((r) => r.pass).length
        got = `${passed}/${passList.length} checks passed.`
      }
    } catch (e: any) {
      got = `Error: ${e?.message || e}`
      passList = tests.map((t) => ({ pass: false, expected: String(t.expected), got }))
    }
    const nextRuns = runs + 1
    setOutput(got)
    setResults(passList)
    setRuns(nextRuns)
    onWorkingChange?.({ code, runs: nextRuns, results: passList }, code)
  }

  const reset = () => {
    if (readOnly) return
    setCode(starter)
    setOutput('')
    setResults([])
    onWorkingChange?.({ code: starter, runs, results: [] }, starter)
  }

  const passed = useMemo(() => results.filter((r) => r.pass).length, [results])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        <span>{language} · attempt {runs + 1}</span>
        {tests.length > 0 && <span>{passed}/{tests.length} passing</span>}
      </div>
      <textarea
        value={code}
        onChange={(e) => { setCode(e.target.value); onWorkingChange?.({ code: e.target.value, runs, results }, e.target.value) }}
        readOnly={readOnly}
        disabled={readOnly}
        rows={10}
        spellCheck={false}
        aria-label="Code editor"
        placeholder={starter || '// Write your solution here. Define solve(...) if tests need it.'}
        className="w-full rounded-xl border px-4 py-3 font-mono text-[13px] leading-relaxed outline-none focus:ring-2 focus:ring-primary/30"
        style={{ background: '#0B0F1A', borderColor: 'var(--card-border)', color: '#E6EDF3' }}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={runChecks} disabled={readOnly}
          className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 min-h-[44px]"
          style={{ background: 'var(--primary)' }}>Run checks</button>
        <button type="button" onClick={reset} disabled={readOnly}
          className="rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-50 min-h-[44px]"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text)' }}>Reset</button>
        {cfg.solution_hint && (
          <button type="button" onClick={() => setShowHint((v) => !v)}
            className="rounded-xl border px-4 py-2.5 text-sm font-bold min-h-[44px]"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text)' }}>
            {showHint ? 'Hide hint' : 'Show hint'}
          </button>
        )}
      </div>
      {showHint && cfg.solution_hint && (
        <p className="rounded-xl p-3 text-sm" style={{ background: 'var(--input)', color: 'var(--text)' }}>{cfg.solution_hint}</p>
      )}
      {output && (
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Output</p>
          <p className="font-mono text-sm" style={{ color: 'var(--text)' }}>{output}</p>
          {results.length > 0 && (
            <ul className="mt-2 space-y-1">
              {results.map((r, i) => (
                <li key={i} className="text-xs font-semibold" style={{ color: r.pass ? '#10B981' : '#EF4444' }}>
                  {r.pass ? '✓' : '✗'} Test {i + 1}: expected “{r.expected}”{r.pass ? '' : `, got “${r.got}”`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
