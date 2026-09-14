'use client'

import { useState } from 'react'
import type { WorkspaceProps } from './registry'

// §63 — Written response: planning area → draft → final. Formal work
// stays teacher-reviewed; the workspace only structures the writing.
export default function WrittenResponse({ initialWorking, initialAnswer, readOnly, onWorkingChange }: WorkspaceProps) {
  const [plan, setPlan] = useState<string>((initialWorking as any)?.plan ?? '')
  const [draft, setDraft] = useState<string>((initialWorking as any)?.draft ?? '')
  const [final, setFinal] = useState<string>(
    typeof initialAnswer === 'string' ? initialAnswer : ((initialWorking as any)?.final ?? '')
  )
  const [tab, setTab] = useState<'plan' | 'draft' | 'final'>('final')

  const emit = (p: string, d: string, f: string) =>
    onWorkingChange?.({ plan: p, draft: d, final: f }, f)

  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--input)' }}>
        {(['plan', 'draft', 'final'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="flex-1 rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all"
            style={
              tab === t
                ? { background: 'var(--card)', color: 'var(--text)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }
                : { color: 'var(--text-muted)' }
            }
          >
            {t === 'plan' ? 'Planning' : t === 'draft' ? 'Draft' : 'Final response'}
          </button>
        ))}
      </div>
      {tab === 'plan' && (
        <textarea
          value={plan}
          onChange={(e) => { setPlan(e.target.value); emit(e.target.value, draft, final) }}
          readOnly={readOnly}
          disabled={readOnly}
          rows={4}
          placeholder="Key points, structure, vocabulary to use…"
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
        />
      )}
      {tab === 'draft' && (
        <textarea
          value={draft}
          onChange={(e) => { setDraft(e.target.value); emit(plan, e.target.value, final) }}
          readOnly={readOnly}
          disabled={readOnly}
          rows={6}
          placeholder="Write freely — this is your rough version…"
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
        />
      )}
      {tab === 'final' && (
        <textarea
          value={final}
          onChange={(e) => { setFinal(e.target.value); emit(plan, draft, e.target.value) }}
          readOnly={readOnly}
          disabled={readOnly}
          rows={7}
          placeholder="Your final response — check spelling, grammar and structure…"
          className="w-full rounded-xl border px-4 py-3 text-[15px] leading-relaxed outline-none focus:ring-2 focus:ring-primary/30"
          style={{ background: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
        />
      )}
      <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
        {final.trim().split(/\s+/).filter(Boolean).length} words in final response
      </p>
    </div>
  )
}
