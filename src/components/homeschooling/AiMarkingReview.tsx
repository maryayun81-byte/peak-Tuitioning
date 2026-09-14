'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import {
  requestAiMarking,
  getAiMarking,
  acceptAiMarking,
  dismissAiMarking,
} from '@/app/actions/homeschool-marking'
import toast from 'react-hot-toast'

// AI marking review (§70-73 applied to photo work): the model drafts
// annotations + corrections; the teacher reviews, edits, and accepts.
// Nothing AI-made reaches the student unreviewed.
const VERDICT_COLORS: Record<string, string> = {
  correct: '#10B981',
  partial: '#F59E0B',
  incorrect: '#EF4444',
  unclear: '#9CA3AF',
}

const KIND_COLORS: Record<string, string> = {
  correct: '#10B981',
  error: '#EF4444',
  info: '#4F8CFF',
}

export default function AiMarkingReview({
  submissionId,
  maxMarks,
  onChanged,
}: {
  submissionId: string
  maxMarks?: number | null
  onChanged?: () => void
}) {
  const [marking, setMarking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [marks, setMarks] = useState('')
  const [feedback, setFeedback] = useState('')
  const [strengths, setStrengths] = useState('')
  const [weaknesses, setWeaknesses] = useState('')

  const load = async () => {
    setLoading(true)
    const res = await getAiMarking(submissionId)
    setLoading(false)
    if (res.success && res.data) {
      const m = res.data as any
      setMarking(m)
      setMarks(m.suggested_marks != null ? String(m.suggested_marks) : '')
      setFeedback(m.feedback_draft || '')
      setStrengths(m.strengths_draft || '')
      setWeaknesses(m.weaknesses_draft || '')
    } else {
      setMarking(null)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId])

  const request = async () => {
    setWorking(true)
    try {
      const res = await requestAiMarking(submissionId)
      if (!res.success) throw new Error(res.error)
      toast.success('AI marking ready for your review')
      await load()
    } catch (err: any) {
      toast.error(err.message || 'AI marking failed')
    } finally {
      setWorking(false)
    }
  }

  const accept = async (withCorrections: boolean) => {
    setWorking(true)
    try {
      const res = await acceptAiMarking(marking.id, {
        marks: marks.trim() === '' ? null : Number(marks),
        feedback,
        strengths,
        weaknesses,
        requestCorrections: withCorrections,
      })
      if (!res.success) throw new Error(res.error)
      toast.success(withCorrections ? 'Accepted + corrections requested' : 'Accepted — student notified')
      onChanged?.()
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept')
    } finally {
      setWorking(false)
    }
  }

  const dismiss = async () => {
    setWorking(true)
    const res = await dismissAiMarking(marking.id)
    setWorking(false)
    if (!res.success) {
      toast.error(res.error || 'Failed to dismiss')
      return
    }
    toast.success('AI marking dismissed')
    setMarking(null)
    onChanged?.()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
        <Loader2 size={13} className="animate-spin" /> Checking AI marking…
      </div>
    )
  }

  if (!marking || marking.status === 'dismissed') {
    return (
      <Button variant="secondary" size="sm" onClick={request} isLoading={working}>
        <Sparkles size={13} /> AI Mark photos
      </Button>
    )
  }

  if (marking.status === 'accepted') {
    return (
      <p className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: '#10B981' }}>
        <CheckCircle2 size={13} /> AI-assisted marking accepted by teacher
      </p>
    )
  }

  const images: string[] = marking.image_urls || []
  const annotations: any[] = (marking.annotations || []).filter(
    (a: any) => (a.image_index || 0) === activeImage
  )
  const findings: any[] = marking.findings || []
  const corrections: any[] = marking.corrections_draft || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-4 space-y-4"
      style={{ background: 'rgba(168,85,247,0.05)', borderColor: 'rgba(168,85,247,0.3)' }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="flex items-center gap-1.5 text-xs font-black" style={{ color: '#A855F7' }}>
          <Sparkles size={14} /> AI marking draft — review before it reaches the student
        </p>
        <button
          type="button"
          onClick={request}
          disabled={working}
          className="text-[11px] font-bold underline disabled:opacity-50"
          style={{ color: 'var(--text-muted)' }}
        >
          Re-run
        </button>
      </div>

      {images.length > 0 && (
        <div className="space-y-2">
          {images.length > 1 && (
            <div className="flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-black"
                  style={{
                    background: i === activeImage ? 'var(--primary)' : 'var(--input)',
                    color: i === activeImage ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  Photo {i + 1}
                </button>
              ))}
            </div>
          )}
          <div className="relative rounded-xl overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[activeImage]} alt={`Student work photo ${activeImage + 1}`} className="w-full object-contain max-h-[420px] bg-black/5" />
            {annotations.map((a: any, i: number) => (
              <span
                key={i}
                title={`${a.label || ''}: ${a.comment || ''}`}
                className="absolute grid place-items-center rounded-full text-white text-[10px] font-black shadow-lg cursor-help"
                style={{
                  left: `${Math.min(96, Math.max(0, Number(a.x) || 0))}%`,
                  top: `${Math.min(96, Math.max(0, Number(a.y) || 0))}%`,
                  width: 22,
                  height: 22,
                  transform: 'translate(-50%, -50%)',
                  background: KIND_COLORS[a.kind] || '#4F8CFF',
                }}
              >
                {i + 1}
              </span>
            ))}
          </div>
          {annotations.length > 0 && (
            <ol className="space-y-1">
              {annotations.map((a: any, i: number) => (
                <li key={i} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <span className="font-black" style={{ color: KIND_COLORS[a.kind] || 'var(--text)' }}>
                    {i + 1}. {a.label || a.kind}
                  </span>{' '}
                  — {a.comment}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {findings.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Findings
          </p>
          {findings.map((f: any, i: number) => (
            <div
              key={i}
              className="flex items-start justify-between gap-2 rounded-xl border px-3 py-2"
              style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
            >
              <div>
                <p className="text-xs font-black" style={{ color: 'var(--text)' }}>
                  {f.ref}{' '}
                  <span className="uppercase" style={{ color: VERDICT_COLORS[f.verdict] || 'var(--text-muted)' }}>
                    · {String(f.verdict || 'unclear').replace(/_/g, ' ')}
                  </span>
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{f.comment}</p>
              </div>
              <span className="text-xs font-black shrink-0" style={{ color: 'var(--text)' }}>
                {f.marks_awarded ?? '–'}/{f.marks_max ?? '–'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Input
          label={`Marks${maxMarks != null ? ` (out of ${maxMarks})` : ''}`}
          type="number"
          value={marks}
          onChange={(e) => setMarks(e.target.value)}
        />
        <div className="text-[11px] self-end pb-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
          AI suggested {marking.suggested_marks ?? '–'}{maxMarks != null ? ` / ${maxMarks}` : ''} — edit freely.
        </div>
      </div>
      <Textarea label="Feedback to student" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      <div className="grid sm:grid-cols-2 gap-3">
        <Textarea label="Strengths" rows={2} value={strengths} onChange={(e) => setStrengths(e.target.value)} />
        <Textarea label="Work on" rows={2} value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} />
      </div>

      {corrections.length > 0 && (
        <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
          <p className="text-[11px] font-black uppercase tracking-wider mb-1.5" style={{ color: '#EF4444' }}>
            Suggested corrections
          </p>
          <ul className="space-y-1">
            {corrections.map((c: any, i: number) => (
              <li key={i} className="text-[11px]" style={{ color: 'var(--text)' }}>
                <span className="font-black">{c.ref}:</span> {c.instruction}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => accept(false)} isLoading={working}>
          <CheckCircle2 size={14} /> Accept as marking
        </Button>
        {corrections.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => accept(true)} isLoading={working}>
            Accept + request corrections
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={dismiss} disabled={working}>
          <XCircle size={14} /> Dismiss
        </Button>
      </div>
    </motion.div>
  )
}
