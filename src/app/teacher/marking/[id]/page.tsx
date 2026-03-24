'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Check, Send, MessageSquare, Star,
  ChevronLeft, ChevronRight, User, BookOpen, CheckCircle2
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/stores/authStore'
import { QuestionRenderer } from '@/components/worksheet/QuestionRenderer'
import { AnnotationCanvas } from '@/components/worksheet/AnnotationCanvas'
import toast from 'react-hot-toast'
import type { WorksheetBlock, WorksheetAnswers } from '@/types/database'
import Link from 'next/link'

export default function WorksheetGraderPage() {
  const params = useParams()
  const router = useRouter()
  const submissionId = params.id as string
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()

  const [submission, setSubmission] = useState<any>(null)
  const [assignment, setAssignment] = useState<any>(null)
  const [blocks, setBlocks] = useState<WorksheetBlock[]>([])
  const [answers, setAnswers] = useState<WorksheetAnswers>({})
  const [questionMarks, setQuestionMarks] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState('')
  const [annotations, setAnnotations] = useState<Record<string, string>>({}) // Map of blockId -> fabric json
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [returning, setReturning] = useState(false)
  const [confirmReturn, setConfirmReturn] = useState(false)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)

  useEffect(() => { loadSubmission() }, [submissionId])

  const loadSubmission = async () => {
    setLoading(true)
    const { data: sub } = await supabase
      .from('submissions')
      .select('*, student:students(id, user_id, full_name, admission_number, class:classes(name)), assignment:assignments(*)')
      .eq('id', submissionId)
      .single()

    if (!sub) { toast.error('Submission not found'); setLoading(false); return }
    setSubmission(sub)
    setFeedback(sub.feedback ?? '')
    setAnswers(sub.worksheet_answers ?? {})
    
    // Parse annotations map
    let savedAnnotations = {}
    try {
       savedAnnotations = typeof sub.annotations === 'string' ? JSON.parse(sub.annotations) : (sub.annotations ?? {})
    } catch { savedAnnotations = {} }
    setAnnotations(savedAnnotations)

    const a = sub.assignment
    setAssignment(a)
    const ws: WorksheetBlock[] = a?.worksheet ?? []
    setBlocks(ws)

// ... existing mark initialization ...
    const saved = sub.question_marks ?? {}
    const initMarks: Record<string, number> = {}
    ws.forEach((b: WorksheetBlock) => {
      if (b.type === 'section_header' || b.type === 'reading_passage') return
      if (saved[b.id] !== undefined) {
        initMarks[b.id] = saved[b.id]
      } else if (b.type === 'mcq' || b.type === 'true_false') {
        initMarks[b.id] = sub.worksheet_answers?.[b.id] === b.correct_answer ? b.marks : 0
      } else if (b.type === 'multi_select') {
        const correct = JSON.stringify([...(b.correct_answers ?? [])].sort())
        const given = JSON.stringify([...(Array.isArray(sub.worksheet_answers?.[b.id]) ? sub.worksheet_answers[b.id] as string[] : [])].sort())
        initMarks[b.id] = correct === given ? b.marks : 0
      } else {
        initMarks[b.id] = 0
      }
    })
    setQuestionMarks(initMarks)

    const first = ws.find((b: WorksheetBlock) => b.type !== 'section_header' && b.type !== 'reading_passage')
    if (first) setActiveBlockId(first.id)

    setLoading(false)
  }

  const questionBlocks = blocks.filter(b => b.type !== 'section_header' && b.type !== 'reading_passage')
  const totalMarks = assignment?.total_marks ?? questionBlocks.reduce((s, b) => s + b.marks, 0)
  const awardedMarks = Object.values(questionMarks).reduce((s, v) => s + (v || 0), 0)

  const saveProgress = async () => {
    setSaving(true)
    const { error } = await supabase.from('submissions').update({
      question_marks: questionMarks,
      marks: awardedMarks,
      feedback,
      annotations: annotations,
      status: 'marked',
    }).eq('id', submissionId)
    if (error) toast.error('Save failed: ' + error.message)
    else toast.success('Progress saved!')
    setSaving(false)
  }

  const returnSubmission = async () => {
    setReturning(true)
    setConfirmReturn(false)
    const { error } = await supabase.from('submissions').update({
      question_marks: questionMarks,
      marks: awardedMarks,
      feedback,
      annotations: annotations,
      status: 'returned',
      returned_at: new Date().toISOString(),
    }).eq('id', submissionId)

    if (!error) {
      const isHighPerf = (awardedMarks / totalMarks) >= 0.8
      let xpAwarded = 0
      
      if (isHighPerf) {
        xpAwarded = 50
        const { data: st } = await supabase.from('students').select('xp').eq('id', submission.student_id).single()
        await supabase.from('students').update({ xp: (st?.xp || 0) + 50 }).eq('id', submission.student_id)
      }

      await supabase.from('notifications').insert({
        user_id: submission?.student?.user_id ?? null,
        type: 'assignment_returned',
        title: isHighPerf ? 'Mastery Achievement! +50 XP' : 'Assignment Returned',
        body: isHighPerf 
          ? `Incredible work! You scored ${Math.round((awardedMarks/totalMarks)*100)}% on "${assignment?.title}".`
          : `Your worksheet "${assignment?.title}" has been marked. Score: ${awardedMarks}/${totalMarks}`,
        related_id: assignment?.id,
        data: { xp: xpAwarded, marks: awardedMarks, total: totalMarks }
      })
      
      toast.success(isHighPerf ? '✅ Returned with Mastery Bonus!' : '✅ Submission returned to student!')
      router.push('/teacher/marking')
    } else {
      toast.error('Return failed: ' + error.message)
    }
    setReturning(false)
  }

  const activeBlock = blocks.find(b => b.id === activeBlockId)
  const activeIndex = questionBlocks.findIndex(b => b.id === activeBlockId)
  const navQuestion = (dir: number) => {
    const next = questionBlocks[activeIndex + dir]
    if (next) setActiveBlockId(next.id)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)' }} />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 py-3" style={{ background: 'var(--card)', borderBottom: '1px solid var(--card-border)' }}>
        <Link href="/teacher/marking">
          <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
            <ArrowLeft size={16} />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm truncate" style={{ color: 'var(--text)' }}>{assignment?.title}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {submission?.student?.full_name} · {submission?.student?.class?.name}
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-xl" style={{ background: 'var(--primary-dim)' }}>
          <span className="text-lg font-black" style={{ color: 'var(--primary)' }}>{awardedMarks}</span>
          <span className="text-sm text-gray-400">/{totalMarks}</span>
        </div>
        <Button size="sm" variant="secondary" onClick={saveProgress} isLoading={saving}>
          <Check size={14} /> Save
        </Button>
        <Button size="sm" onClick={() => setConfirmReturn(true)}>
          <Send size={14} /> Return
        </Button>
      </div>

      {/* Body: 2 columns */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* LEFT — Question + Student Answer */}
        <div className="overflow-y-auto" style={{ borderRight: '1px solid var(--card-border)' }}>
          {/* Question navigator */}
          <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2" style={{ background: 'var(--card)', borderBottom: '1px solid var(--card-border)' }}>
            <button onClick={() => navQuestion(-1)} disabled={activeIndex <= 0} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
              <ChevronLeft size={14} />
            </button>
            <div className="flex gap-1 flex-wrap flex-1">
              {questionBlocks.map((b, i) => {
                const awarded = questionMarks[b.id] ?? -1
                const isActive = b.id === activeBlockId
                const bg = isActive ? 'var(--primary)' : awarded === b.marks ? '#10B981' : awarded > 0 ? '#F59E0B' : awarded === 0 ? '#EF444420' : 'var(--input)'
                return (
                  <button key={b.id} onClick={() => setActiveBlockId(b.id)}
                    className="w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center"
                    style={{ background: bg, color: isActive ? 'white' : 'var(--text)' }}>
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <button onClick={() => navQuestion(1)} disabled={activeIndex >= questionBlocks.length - 1} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {activeBlock && (
              <>
                <div className="p-4 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{ background: 'var(--primary)', color: 'white' }}>
                      {activeIndex + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text)' }}>{activeBlock.question}</p>
                      {(activeBlock.type === 'mcq' || activeBlock.type === 'true_false') && (
                        <p className="text-xs mt-2 font-bold" style={{ color: '#10B981' }}>
                          ✓ Correct answer: {activeBlock.correct_answer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Student&apos;s Answer</div>
                  <QuestionRenderer
                    block={activeBlock}
                    index={activeIndex + 1}
                    answer={answers[activeBlock.id]}
                    onChange={() => {}}
                    readOnly
                    showCorrect
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT — Marks + Annotation + Feedback */}
        <div className="overflow-y-auto">
          {activeBlock && (
            <div className="p-5 space-y-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Marks — Q{activeIndex + 1}</div>
              <div className="flex items-center gap-2 flex-wrap">
                {[0, Math.ceil(activeBlock.marks / 2), activeBlock.marks]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map(v => (
                    <button key={v} onClick={() => setQuestionMarks(p => ({ ...p, [activeBlock.id]: v }))}
                      className="px-4 py-2 rounded-xl text-sm font-black transition-all"
                      style={{ background: questionMarks[activeBlock.id] === v ? 'var(--primary)' : 'var(--input)', color: questionMarks[activeBlock.id] === v ? 'white' : 'var(--text-muted)' }}>
                      {v}
                    </button>
                  ))}
                <input
                  type="number" min={0} max={activeBlock.marks}
                  value={questionMarks[activeBlock.id] ?? 0}
                  onChange={e => setQuestionMarks(p => ({ ...p, [activeBlock.id]: Math.min(activeBlock.marks, Math.max(0, parseInt(e.target.value) || 0)) }))}
                  className="w-20 rounded-xl px-3 py-2 text-sm text-center font-bold"
                  style={{ background: 'var(--input)', color: 'var(--primary)', border: '1px solid var(--card-border)' }}
                />
                <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>/ {activeBlock.marks}</span>
              </div>
            </div>
          )}

          {/* Annotation */}
          <div className="p-5 space-y-2" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Annotation Canvas</div>
          <div className="rounded-2xl border border-[var(--card-border)] bg-white">
                <AnnotationCanvas
                 key={activeBlockId ?? 'canvas'}
                 backgroundText={activeBlockId && typeof answers[activeBlockId] === 'string' && !(answers[activeBlockId] as string).startsWith('{') ? (answers[activeBlockId] as string) : undefined}
                 backgroundJson={activeBlockId && typeof answers[activeBlockId] === 'string' && (answers[activeBlockId] as string).startsWith('{') ? (answers[activeBlockId] as string) : undefined}
                 initialJson={activeBlockId ? annotations[activeBlockId] : undefined}
                 defaultColor="#EF4444"
                onSave={json => activeBlockId && setAnnotations(p => ({ ...p, [activeBlockId]: json }))}
              />
            </div>
          </div>

          {/* Feedback + all-questions summary */}
          <div className="p-5 space-y-4">
            <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Overall Feedback</div>
            <textarea
              className="w-full rounded-xl p-3 text-sm resize-none"
              style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
              rows={4}
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Write overall feedback for this student..."
            />

            <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>All Questions</div>
            <div className="space-y-2">
              {questionBlocks.map((b, i) => {
                const awarded = questionMarks[b.id] ?? 0
                const pct = b.marks > 0 ? (awarded / b.marks) * 100 : 0
                return (
                  <button key={b.id} onClick={() => setActiveBlockId(b.id)} className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                    style={{ background: b.id === activeBlockId ? 'var(--primary-dim)' : 'var(--input)', border: `1px solid ${b.id === activeBlockId ? 'var(--primary)' : 'transparent'}` }}>
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0" style={{ background: 'var(--primary)', color: 'white' }}>{i + 1}</span>
                    <span className="flex-1 text-xs truncate" style={{ color: 'var(--text)' }}>{b.question.slice(0, 50)}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--card-border)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : pct > 0 ? '#F59E0B' : '#EF4444' }} />
                      </div>
                      <span className="text-xs font-bold w-12 text-right" style={{ color: 'var(--text)' }}>{awarded}/{b.marks}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Return confirm modal */}
      <Modal isOpen={confirmReturn} onClose={() => setConfirmReturn(false)} title="Return to Student?" size="sm">
        <div className="space-y-4 py-2">
          <div className="text-center p-4 rounded-2xl" style={{ background: 'var(--input)' }}>
            <div className="text-4xl font-black mb-1" style={{ color: 'var(--primary)' }}>{awardedMarks}/{totalMarks}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Final Score for {submission?.student?.full_name}</div>
          </div>
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            The student will be notified and can view their marks and annotations.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmReturn(false)}>Cancel</Button>
            <Button className="flex-1" onClick={returnSubmission} isLoading={returning}>
              <Send size={14} /> Return Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
