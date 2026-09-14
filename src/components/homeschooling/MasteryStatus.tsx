'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sprout, Trophy, RefreshCw } from 'lucide-react'
import { getMasteryStatus, getDueRetrievals, answerRetrieval } from '@/app/actions/homeschool-learning'

// §44, §101-102 — Progress in the student's own language:
// "I can now…" / "I'm strengthening…" / "Keep it fresh".
export function MasteryStatus({
  studentId,
  enrollmentId,
}: {
  studentId: string
  enrollmentId: string
}) {
  const [data, setData] = useState<{ canNow: any[]; strengthening: any[] } | null>(null)

  useEffect(() => {
    getMasteryStatus(studentId, enrollmentId).then((res) => {
      if (res.success) setData(res.data as any)
    })
  }, [studentId, enrollmentId])

  if (!data) return null
  if (data.canNow.length === 0 && data.strengthening.length === 0) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {data.canNow.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.25)' }}>
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider mb-2" style={{ color: '#10B981' }}>
            <Trophy size={13} /> I can now
          </p>
          <ul className="space-y-1.5">
            {data.canNow.slice(0, 5).map((c: any, i: number) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="text-[13px] font-semibold"
                style={{ color: 'var(--text)' }}
              >
                ✓ {c.title}
                {c.subject && <span className="font-normal" style={{ color: 'var(--text-muted)' }}> · {c.subject}</span>}
              </motion.li>
            ))}
          </ul>
        </div>
      )}
      {data.strengthening.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.25)' }}>
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider mb-2" style={{ color: '#F59E0B' }}>
            <Sprout size={13} /> I&apos;m strengthening
          </p>
          <ul className="space-y-1.5">
            {data.strengthening.slice(0, 5).map((c: any, i: number) => (
              <li key={i} className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                • {c.title}
                {c.subject && <span className="font-normal" style={{ color: 'var(--text-muted)' }}> · {c.subject}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// §99-100 — "Keep It Fresh": 2–5 minute retrieval of mastered skills.
export function KeepItFresh({ studentId }: { studentId: string }) {
  const [items, setItems] = useState<any[]>([])
  const [answering, setAnswering] = useState<string | null>(null)

  const load = () => {
    getDueRetrievals(studentId).then((res) => {
      if (res.success) setItems(res.data as any[])
    })
  }
  useEffect(load, [studentId])

  if (items.length === 0) return null

  const answer = async (id: string, correct: boolean) => {
    setAnswering(id)
    const res = await answerRetrieval(id, correct)
    setAnswering(null)
    if (res.success) load()
  }

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ background: 'rgba(79,140,255,0.05)', borderColor: 'rgba(79,140,255,0.25)' }}>
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
        <RefreshCw size={13} /> Keep it fresh
      </p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        You learned this earlier. Can you solve it without your notes?
      </p>
      {items.slice(0, 2).map((item: any) => (
        <div key={item.id} className="rounded-xl border p-3 space-y-2" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
            {item.question?.prompt || item.objective?.title || 'Retrieval check'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={answering === item.id}
              onClick={() => answer(item.id, true)}
              className="flex-1 rounded-xl px-3 py-2 text-xs font-black text-white disabled:opacity-50"
              style={{ background: '#10B981' }}
            >
              Still got it ✓
            </button>
            <button
              type="button"
              disabled={answering === item.id}
              onClick={() => answer(item.id, false)}
              className="flex-1 rounded-xl px-3 py-2 text-xs font-black disabled:opacity-50"
              style={{ background: 'var(--input)', color: 'var(--text)' }}
            >
              Need a refresh
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
