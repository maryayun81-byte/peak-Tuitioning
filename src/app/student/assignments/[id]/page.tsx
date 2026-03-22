'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Send, Clock, BookOpen,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Save
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { QuestionRenderer } from '@/components/worksheet/QuestionRenderer'
import { AnnotationCanvas } from '@/components/worksheet/AnnotationCanvas'
import toast from 'react-hot-toast'
import type { WorksheetBlock, WorksheetAnswers, Student } from '@/types/database'
import Link from 'next/link'

const AUTOSAVE_MS = 4000

// IndexedDB helpers
async function idbGet(key: string): Promise<WorksheetAnswers | null> {
  try {
    const { openDB } = await import('idb')
    const db = await openDB('worksheet-solver', 1, { upgrade: db => db.createObjectStore('answers') })
    return db.get('answers', key) ?? null
  } catch { return null }
}
async function idbSet(key: string, value: WorksheetAnswers) {
  try {
    const { openDB } = await import('idb')
    const db = await openDB('worksheet-solver', 1, { upgrade: db => db.createObjectStore('answers') })
    await db.put('answers', value, key)
  } catch {}
}

export default function StudentWorksheetSolver() {
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string
  const supabase = getSupabaseBrowserClient()
  const { student, profile } = useAuthStore()

  const [assignment, setAssignment] = useState<any>(null)
  const [blocks, setBlocks] = useState<WorksheetBlock[]>([])
  const [answers, setAnswers] = useState<WorksheetAnswers>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultMode, setResultMode] = useState(false)
  const [returnedSub, setReturnedSub] = useState<any>(null)

  // Pagination: page = group of questions
  const [currentPage, setCurrentPage] = useState(0)
  const QUESTIONS_PER_PAGE = resultMode ? 1 : 3 // Show one by one in result mode for better focus on annotations

  // Passage panel
  const [passageOpen, setPassageOpen] = useState(false)

  // Timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Autosave
  const autosaveRef = useRef<NodeJS.Timeout | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => { loadAssignment() }, [assignmentId])

  const loadAssignment = async () => {
    setLoading(true)
    const [aRes, sRes] = await Promise.all([
      supabase.from('assignments').select('*, teacher:teachers(full_name)').eq('id', assignmentId).single(),
      supabase.from('submissions').select('*').eq('assignment_id', assignmentId).eq('student_id', student?.id).maybeSingle(),
    ])

    if (!aRes.data) { toast.error('Assignment not found'); setLoading(false); return }
    const a = aRes.data
    setAssignment(a)

    const worksheet: WorksheetBlock[] = a.worksheet ?? []
    setBlocks(worksheet)

    // Returned submission — show results
    if (sRes.data?.status === 'returned') {
      setReturnedSub(sRes.data)
      setAnswers(sRes.data.worksheet_answers ?? {})
      setResultMode(true)
      setLoading(false)
      return
    }

    // Restore from IDB or existing submission
    const idbAnswers = await idbGet(`ws-${assignmentId}`)
    const existing: WorksheetAnswers = sRes.data?.worksheet_answers ?? {}
    setAnswers(idbAnswers && Object.keys(idbAnswers).length > 0 ? idbAnswers : existing)

    // Timer
    if (a.show_timer && a.time_limit && sRes.data?.status !== 'submitted') {
      setTimeLeft(a.time_limit * 60)
    }

    setLoading(false)
  }

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || resultMode) return
    timerRef.current = setTimeout(() => setTimeLeft(t => (t ?? 1) - 1), 1000)
    if (timeLeft === 0) { toast.error('⏰ Time is up! Submitting...'); handleSubmit() }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [timeLeft, resultMode])

  // Autosave
  const saveLocally = useCallback(async (a: WorksheetAnswers) => {
    if (resultMode) return
    await idbSet(`ws-${assignmentId}`, a)
    setLastSaved(new Date())
    setIsDirty(false)
  }, [assignmentId, resultMode])

  useEffect(() => {
    if (!isDirty || resultMode) return
    if (autosaveRef.current) clearTimeout(autosaveRef.current)
    autosaveRef.current = setTimeout(() => saveLocally(answers), AUTOSAVE_MS)
    return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current) }
  }, [answers, isDirty, saveLocally, resultMode])

  const updateAnswer = (blockId: string, value: WorksheetAnswers[string]) => {
    if (resultMode) return
    setAnswers(prev => ({ ...prev, [blockId]: value }))
    setIsDirty(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setConfirmOpen(false)
    await saveLocally(answers)

    // Auto-grade MCQ/TF/MultiSelect
    let totalMarks = 0
    let autoMarks = 0
    const questionMarks: Record<string, number> = {}

    for (const block of blocks) {
      if (block.type === 'section_header' || block.type === 'reading_passage') continue
      const ans = answers[block.id]
      totalMarks += block.marks
      if (block.type === 'mcq' || block.type === 'true_false') {
        if (ans === block.correct_answer) { questionMarks[block.id] = block.marks; autoMarks += block.marks }
        else questionMarks[block.id] = 0
      } else if (block.type === 'multi_select') {
        const correct = new Set(block.correct_answers ?? [])
        const given = new Set(Array.isArray(ans) ? ans as string[] : [])
        if (JSON.stringify([...correct].sort()) === JSON.stringify([...given].sort())) {
          questionMarks[block.id] = block.marks; autoMarks += block.marks
        } else questionMarks[block.id] = 0
      }
    }

    const { error } = await supabase.from('submissions').upsert({
      assignment_id: assignmentId,
      student_id: student?.id,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      worksheet_answers: answers,
      question_marks: questionMarks,
      marks: autoMarks,
    }, { onConflict: 'assignment_id,student_id' })

    if (error) { toast.error('Submission failed: ' + error.message); setSubmitting(false); return }

    // Award Completion XP (+20 XP)
    const { data: updatedStudent } = await supabase
      .from('students')
      .update({ xp: (student?.xp || 0) + 20 })
      .eq('id', student?.id)
      .select('*')
      .single()
    
    if (updatedStudent) {
      useAuthStore.getState().setStudent(updatedStudent as Student)
      await supabase.from('notifications').insert({
        user_id: profile?.id,
        title: 'Quest Submitted!',
        body: 'You earned +20 XP for submitting your worksheet.',
        type: 'info',
        data: { xp: 20, category: 'assignment_completion' }
      })
      toast.success('✅ Worksheet submitted! +20 XP earned!', { icon: '🚀' })
    } else {
      toast.success('✅ Worksheet submitted successfully!')
    }

    router.push('/student/assignments')
  }

  // Paginate: only real questions (skip section_header, reading_passage)
  const questionBlocks = blocks.filter(b => b.type !== 'section_header' && b.type !== 'reading_passage')
  const passageBlocks = blocks.filter(b => b.type === 'reading_passage')
  const sectionHeaders = blocks.filter(b => b.type === 'section_header')
  const totalPages = Math.ceil(questionBlocks.length / QUESTIONS_PER_PAGE)
  const pageBlocks = questionBlocks.slice(currentPage * QUESTIONS_PER_PAGE, (currentPage + 1) * QUESTIONS_PER_PAGE)

  const answeredCount = questionBlocks.filter(b => {
    const a = answers[b.id]
    if (a === null || a === undefined) return false
    if (typeof a === 'string') return a.trim().length > 0
    if (Array.isArray(a)) return a.length > 0
    return false
  }).length

  // Find the question index in the full list for display
  const getQuestionNumber = (blockId: string) => questionBlocks.findIndex(b => b.id === blockId) + 1

  const passage = passageBlocks[0]
  const hasPassage = !!passage?.passage_text || !!assignment?.passage

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--primary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading worksheet...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 px-4 md:px-6 py-3 flex items-center justify-between gap-3" style={{ background: 'var(--card)', borderBottom: '1px solid var(--card-border)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <Link href="/student/assignments">
            <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
              <ChevronLeft size={16} />
            </button>
          </Link>
          <div className="min-w-0">
            <h1 className="font-black text-sm truncate" style={{ color: 'var(--text)' }}>
              {resultMode ? `Results: ${assignment?.title}` : assignment?.title}
            </h1>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              {resultMode ? (
                <span className="font-black text-emerald-500">SCORE: {returnedSub?.marks}/{assignment?.total_marks}</span>
              ) : (
                <>
                  <span>{answeredCount}/{questionBlocks.length} answered</span>
                  {lastSaved && <span>· Saved {lastSaved.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!resultMode && timeLeft !== null && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black ${timeLeft < 300 ? 'text-red-400 bg-red-400/10 animate-pulse' : ''}`} style={{ background: timeLeft < 300 ? undefined : 'var(--input)', color: timeLeft < 300 ? undefined : 'var(--text)' }}>
              <Clock size={12} />
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          )}
          {resultMode ? (
            <div className="flex items-center gap-2">
               <span className="hidden sm:inline text-xs font-black px-3 py-1.5 rounded-xl" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>Graded by {assignment?.teacher?.full_name}</span>
            </div>
          ) : (
            <Button size="sm" onClick={() => setConfirmOpen(true)} isLoading={submitting}>
              <Send size={14} /> Submit
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar (Active mode only) */}
      {!resultMode && (
        <div className="h-1 w-full" style={{ background: 'var(--input)' }}>
          <motion.div
            className="h-full"
            style={{ background: 'linear-gradient(90deg, var(--primary), #22D3EE)' }}
            animate={{ width: `${(answeredCount / Math.max(questionBlocks.length, 1)) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Hero section for Results */}
      {resultMode && currentPage === 0 && (
         <div className="p-4 md:p-8" style={{ background: 'var(--primary-dim)' }}>
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
               <div>
                  <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--text)' }}>Excellent Work! 🚀</h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>You&apos;ve completed the assessment. Review the teacher&apos;s feedback and annotations below to improve your skills.</p>
                  <div className="flex gap-4">
                     <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-white/20">
                        <div className="text-xs font-bold text-muted uppercase tracking-tighter mb-1">Total Score</div>
                        <div className="text-2xl font-black text-primary">{returnedSub?.marks} / {assignment?.total_marks}</div>
                     </div>
                     <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-white/20">
                        <div className="text-xs font-bold text-muted uppercase tracking-tighter mb-1">XP Earned</div>
                        <div className="text-2xl font-black text-amber-500">
                          +{((returnedSub?.marks || 0) / (assignment?.total_marks || 1)) >= 0.8 ? 70 : 20} XP
                        </div>
                     </div>
                  </div>
               </div>
               {returnedSub?.feedback && (
                  <Card className="p-5 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-3 opacity-10"><BookOpen size={48} /></div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">Teacher Feedback</span>
                     <p className="text-sm font-medium italic leading-relaxed" style={{ color: 'var(--text)' }}>&quot;{returnedSub.feedback}&quot;</p>
                  </Card>
               )}
            </div>
         </div>
      )}

      <div className={`flex-1 flex flex-col md:flex-row overflow-hidden relative`}>
        {/* Passage panel (Left Side on Desktop) */}
        {hasPassage && (
          <motion.div 
            initial={false}
            animate={{ 
              width: passageOpen || window.innerWidth >= 768 ? (window.innerWidth >= 1280 ? '45%' : '40%') : '0%',
              x: passageOpen || window.innerWidth >= 768 ? 0 : -340
            }}
            className={cn(
              "h-full overflow-hidden flex flex-col bg-[var(--sidebar)] border-r border-[var(--card-border)] z-20 absolute md:relative w-full md:w-auto",
              !passageOpen && "hidden md:flex"
            )}
          >
            <div className="px-5 py-4 flex items-center justify-between bg-primary/5 border-b border-primary/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                   <BookOpen size={18} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-[var(--text)]">
                   {passage?.passage_type === 'poem' ? 'Reading: Poem' : 'Reading: Passage'}
                </span>
              </div>
              <button onClick={() => setPassageOpen(false)} className="md:hidden p-2 hover:bg-[var(--input)] rounded-xl">
                 <ChevronUp size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
               <div className="max-w-2xl mx-auto">
                  <div 
                    className="text-lg leading-[1.8] whitespace-pre-wrap select-none" 
                    style={{ 
                       fontFamily: passage?.passage_type === 'poem' ? 'Georgia, serif' : 'inherit',
                       color: 'var(--text)',
                       fontStyle: passage?.passage_type === 'poem' ? 'italic' : 'normal'
                    }}
                  >
                    {passage?.passage_text || assignment?.passage}
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {/* Mobile Passage Toggle */}
        {hasPassage && (
          <button
            onClick={() => setPassageOpen(true)}
            className="md:hidden fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary text-white shadow-2xl flex items-center justify-center z-40 ring-4 ring-primary/20"
          >
            <BookOpen size={24} />
          </button>
        )}

        {/* Content column */}
        <div className="flex-1 overflow-y-auto pb-28">
          <div className={`max-w-${resultMode ? '4xl' : '2xl'} mx-auto p-4 md:p-6 space-y-4`}>
            {/* Nav dots */}
            <div className="flex items-center gap-1.5 flex-wrap">
               {questionBlocks.map((b, i) => {
                  const subIdx = Math.floor(i / QUESTIONS_PER_PAGE)
                  const isActive = currentPage === subIdx && (!resultMode || pageBlocks.some(pb => pb.id === b.id))
                  const answered = !!answers[b.id]
                  const qMarks = returnedSub?.question_marks?.[b.id]
                  
                  let dotBg = 'var(--input)'
                  if (resultMode) {
                     if (qMarks === b.marks) dotBg = '#10B981'
                     else if (qMarks > 0) dotBg = '#F59E0B'
                     else dotBg = '#EF4444'
                  } else if (answered) dotBg = 'var(--primary-dim)'

                  return (
                     <button
                        key={b.id}
                        onClick={() => setCurrentPage(subIdx)}
                        className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                        style={{ 
                           background: isActive ? 'var(--primary)' : dotBg,
                           color: isActive ? 'white' : 'var(--text)',
                           border: isActive ? '2px solid var(--primary)' : '2px solid transparent'
                        }}
                     >
                        {i + 1}
                     </button>
                  )
               })}
            </div>

            {/* Main Worksheet Display */}
            <div className={resultMode ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}>
               {/* Question Side */}
               <div className="space-y-4">
                  <AnimatePresence mode="wait">
                     <motion.div
                        key={currentPage}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                     >
                        {pageBlocks.map(block => (
                           <div key={block.id} className="space-y-4">
                              <QuestionRenderer
                                 block={block}
                                 index={getQuestionNumber(block.id)}
                                 answer={answers[block.id]}
                                 onChange={val => updateAnswer(block.id, val)}
                                 readOnly={resultMode}
                                 showCorrect={resultMode}
                              />
                              {resultMode && (
                                 <div className="p-4 rounded-xl flex items-center justify-between" style={{ background: 'var(--input)' }}>
                                    <span className="text-xs font-black uppercase tracking-widest text-muted">Marks Awarded</span>
                                    <span className="font-black text-primary">{returnedSub?.question_marks?.[block.id] ?? 0} / {block.marks}</span>
                                 </div>
                              )}
                           </div>
                        ))}
                     </motion.div>
                  </AnimatePresence>
               </div>

               {/* Annotation Side (Result Mode Only) */}
               {resultMode && (
                  <div className="space-y-4">
                     <div className="text-xs font-black uppercase tracking-widest text-muted">Teacher Annotations</div>
                     {pageBlocks.map(block => {
                        let blockAnnotation = undefined
                        try {
                           const annMap = typeof returnedSub?.annotations === 'string' ? JSON.parse(returnedSub.annotations) : (returnedSub?.annotations ?? {})
                           blockAnnotation = annMap[block.id]
                        } catch { blockAnnotation = undefined }

                        return (
                           <div key={`ann-${block.id}`} style={{ height: '320px' }} className="rounded-2xl overflow-hidden border border-[var(--card-border)]">
                              <AnnotationCanvas
                                 backgroundText={typeof answers[block.id] === 'string' ? answers[block.id] as string : undefined}
                                 initialJson={blockAnnotation}
                                 readOnly={true}
                                 onSave={() => {}}
                              />
                           </div>
                        )
                     })}
                     <p className="text-[10px] text-muted italic">Annotations show pointers, highlights, and marks from your teacher.</p>
                  </div>
               )}
            </div>

            {/* Pagination Controls */}
            <div className="flex gap-3 pt-6">
               <Button variant="secondary" className="flex-1" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft size={16} /> Previous
               </Button>
               {currentPage < totalPages - 1 ? (
                  <Button className="flex-1" onClick={() => setCurrentPage(p => p + 1)}>
                     Next <ChevronRight size={16} />
                  </Button>
               ) : !resultMode && (
                  <Button className="flex-1" onClick={() => setConfirmOpen(true)}>
                     <Send size={16} /> Submit
                  </Button>
               )}
               {resultMode && currentPage === totalPages - 1 && (
                  <Link href="/student/assignments" className="flex-1">
                     <Button className="w-full">Back to Quests <CheckCircle2 size={16} className="ml-2" /></Button>
                  </Link>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Submit Worksheet?" size="sm">
        <div className="space-y-4 py-2">
          <div className="p-4 rounded-2xl text-center" style={{ background: 'var(--input)' }}>
            <div className="text-3xl font-black" style={{ color: 'var(--primary)' }}>{answeredCount}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>of {questionBlocks.length} questions answered</div>
          </div>
          {answeredCount < questionBlocks.length && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <AlertCircle size={16} className="text-amber-500 shrink-0" />
              <p className="text-xs" style={{ color: '#F59E0B' }}>You have {questionBlocks.length - answeredCount} unanswered questions.</p>
            </div>
          )}
          <div className="flex gap-2">
             <Button variant="secondary" className="flex-1" onClick={() => setConfirmOpen(false)}>Review</Button>
             <Button className="flex-1" onClick={handleSubmit} isLoading={submitting}>Confirm Submit</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
