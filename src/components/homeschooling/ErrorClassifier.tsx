'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { classifyAttemptError } from '@/app/actions/homeschool-learning'

// §75-77 — Error intelligence. A wrong answer is learning information:
// the student reflects first, classifies, then gets targeted support.
// Classification is reflective data, never an official judgment.
const UNDERSTANDING = [
  { id: 'understand', label: 'I understand it now' },
  { id: 'mistake', label: 'I made a mistake' },
  { id: 'guessed', label: 'I guessed' },
  { id: 'unsure', label: "I'm not sure" },
  { id: 'help', label: 'I need help' },
]

const CATEGORIES = [
  { id: 'concept', label: 'Concept', desc: 'I didn’t fully grasp the idea' },
  { id: 'calculation', label: 'Calculation', desc: 'My method was right, the arithmetic slipped' },
  { id: 'formula', label: 'Formula', desc: 'Wrong or misremembered formula' },
  { id: 'sign', label: 'Sign', desc: 'Lost a +/− somewhere' },
  { id: 'unit_conversion', label: 'Unit / conversion', desc: 'Units or number-system step' },
  { id: 'reading_interpretation', label: 'Reading', desc: 'Misread what was asked' },
  { id: 'procedure', label: 'Procedure', desc: 'Steps in the wrong order or missing' },
  { id: 'grammar_vocabulary', label: 'Language', desc: 'Grammar, vocabulary or expression' },
  { id: 'careless', label: 'Careless slip', desc: 'I knew it — rushed it' },
  { id: 'incomplete', label: 'Incomplete', desc: 'Didn’t finish the working' },
]

export default function ErrorClassifier({
  attemptId,
  onDone,
}: {
  attemptId: string
  onDone?: (category: string) => void
}) {
  const [step, setStep] = useState<0 | 1>(0)
  const [saving, setSaving] = useState(false)

  const save = async (category: string) => {
    setSaving(true)
    const res = await classifyAttemptError({ attempt_id: attemptId, category })
    setSaving(false)
    if (res.success) onDone?.(category)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-4 space-y-3"
      style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.3)' }}
    >
      <p className="text-sm font-black" style={{ color: 'var(--text)' }}>
        Let&apos;s figure out what happened.
      </p>
      {step === 0 ? (
        <>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            What do you think happened?
          </p>
          <div className="flex flex-wrap gap-2">
            {UNDERSTANDING.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={saving}
                onClick={() => (u.id === 'understand' ? save('not_sure') : setStep(1))}
                className="px-3 py-2 rounded-xl border text-xs font-bold transition-all hover:scale-[1.03] disabled:opacity-50"
                style={{ background: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
              >
                {u.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            Which best describes it?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={saving}
                onClick={() => save(c.id)}
                className="text-left rounded-xl border p-2.5 transition-all hover:scale-[1.01] disabled:opacity-50"
                style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
              >
                <span className="block text-xs font-black" style={{ color: 'var(--text)' }}>{c.label}</span>
                <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.desc}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="text-[11px] font-bold"
            style={{ color: 'var(--text-muted)' }}
          >
            ← Back
          </button>
        </>
      )}
    </motion.div>
  )
}
