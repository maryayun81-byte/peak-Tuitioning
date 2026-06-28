'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Send, AlertTriangle, Maximize, Minimize, Flag, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { LatexRenderer } from '@/components/ui/LatexRenderer'
import { startExamSubmission, submitExam } from '@/app/actions/exams'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { PassageReader } from '@/components/exam/PassageReader'
import { ExamWritingEditor } from '@/components/exam/ExamWritingEditor'

const AnnotationCanvas = dynamic(
  () => import('@/components/worksheet/AnnotationCanvas').then(m => m.AnnotationCanvas),
  { ssr: false }
)

export function ExamRoom({ examData }: { examData: any }) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()

  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [passageAnnotations, setPassageAnnotations] = useState<Record<string, any[]>>({})
  const [flagged, setFlagged] = useState<Record<string, boolean>>({})

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(examData.duration_minutes * 60)
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0)
  const [warnings, setWarnings] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Group questions by their passage
  const questions: any[] = examData.questions || []
  const passages: any[] = examData.passages || []

  const question = questions[activeQuestionIdx]
  // Find passage linked to current question
  const currentPassage = question?.passage_id
    ? passages.find((p: any) => p.id === question.passage_id)
    : null

  // ─── Integrity monitoring ──────────────────────────────────────────────────
  useEffect(() => {
    initSubmission()

    const handleVisibilityChange = () => {
      if (document.hidden) logIntegrityEvent('tab_switch', { reason: 'Document hidden' })
    }
    const handleBlur = () => logIntegrityEvent('tab_switch', { reason: 'Window blur' })
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement
      setIsFullscreen(isFs)
      if (!isFs && submissionIdRef.current) logIntegrityEvent('fullscreen_exit', { reason: 'Exited fullscreen' })
    }
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      logIntegrityEvent('copy_attempt', {})
      toast.error('Copying is disabled during exams.')
    }
    const handlePaste = (e: ClipboardEvent) => {
      // Allow paste in ExamWritingEditor (contenteditable divs)
      const target = e.target as HTMLElement
      if (target.contentEditable === 'true') {
        // Let the editor handle it — it will paste plain text only
        return
      }
      e.preventDefault()
      logIntegrityEvent('paste_attempt', { length: e.clipboardData?.getData('text').length })
      toast.error('Pasting is disabled during exams.')
    }
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') setActiveQuestionIdx(i => Math.max(0, i - 1))
      if (e.altKey && e.key === 'ArrowRight') setActiveQuestionIdx(i => Math.min(questions.length - 1, i + 1))
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('keydown', handleKeyDown)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep a ref to submissionId for use in event handlers
  const submissionIdRef = useRef<string | null>(null)
  useEffect(() => { submissionIdRef.current = submissionId }, [submissionId])

  // ─── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeRemaining <= 0 && submissionId) {
      handleFinalSubmit()
      return
    }
    const timer = setInterval(() => setTimeRemaining(t => t - 1), 1000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, submissionId])

  // ─── Auto-save passage annotations ────────────────────────────────────────
  useEffect(() => {
    if (!submissionId) return
    const timeout = setTimeout(() => {
      Object.entries(passageAnnotations).forEach(async ([passageId, annots]) => {
        await supabase.from('exam_passage_annotations').upsert({
          submission_id: submissionId,
          passage_id: passageId,
          annotations: annots
        }, { onConflict: 'submission_id, passage_id' })
      })
    }, 1500)
    return () => clearTimeout(timeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageAnnotations, submissionId])

  const initSubmission = async () => {
    try {
      const id = await startExamSubmission(examData.id)
      setSubmissionId(id)
      submissionIdRef.current = id

      // Load saved answers from DB
      const { data: existingAnswers } = await supabase
        .from('exam_answers')
        .select('*')
        .eq('submission_id', id)

      const map: Record<string, any> = {}
      if (existingAnswers) {
        existingAnswers.forEach(a => { map[a.question_id] = a.student_answer })
      }

      // Merge with localStorage (offline recovery)
      const localCacheKey = `exam_cache_${id}`
      const cached = localStorage.getItem(localCacheKey)
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached)
          Object.keys(parsedCache).forEach(k => { map[k] = parsedCache[k] })
          toast.success('Recovered unsaved answers from local cache.')
        } catch (e) {}
      }
      setAnswers(map)

      // Load passage annotations
      const { data: annots } = await supabase
        .from('exam_passage_annotations')
        .select('*')
        .eq('submission_id', id)

      if (annots) {
        const annotMap: Record<string, any[]> = {}
        annots.forEach(a => { annotMap[a.passage_id] = a.annotations })
        setPassageAnnotations(annotMap)
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to start exam')
      router.push('/student/exam-desk')
    }
  }

  const logIntegrityEvent = async (type: string, details: any) => {
    const sid = submissionIdRef.current
    if (!sid) return
    setWarnings(prev => [...prev, type])
    try {
      await supabase.rpc('log_exam_integrity_event', {
        p_submission_id: sid,
        p_event_type: type,
        p_details: details
      })
    } catch (e) {
      console.error('Failed to log event', e)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => toast.error('Fullscreen blocked by browser'))
    } else {
      document.exitFullscreen()
    }
  }

  const handleAnswer = useCallback((questionId: string, answerData: any) => {
    setAnswers(prev => {
      const next = { ...prev, [questionId]: answerData }
      if (submissionIdRef.current) {
        localStorage.setItem(`exam_cache_${submissionIdRef.current}`, JSON.stringify(next))
      }
      return next
    })
    saveAnswer(questionId, answerData)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveAnswer = async (questionId: string, answerData: any) => {
    const sid = submissionIdRef.current
    if (!sid) return
    try {
      await supabase.from('exam_answers').upsert({
        submission_id: sid,
        question_id: questionId,
        student_answer: answerData
      }, { onConflict: 'submission_id, question_id' })
    } catch (e) {
      console.error('Auto-save failed, saved locally', e)
    }
  }

  const handleFinalSubmit = async () => {
    const sid = submissionIdRef.current
    if (!sid) return
    const toastId = toast.loading('Submitting exam...')
    try {
      await submitExam(sid, Object.entries(answers).map(([qId, ans]) => ({
        question_id: qId,
        student_answer: ans
      })))
      localStorage.removeItem(`exam_cache_${sid}`)
      toast.success('Exam submitted successfully!', { id: toastId })
      if (document.fullscreenElement) document.exitFullscreen()
      router.push('/student/exam-desk')
    } catch (e) {
      toast.error('Failed to submit exam. Will retry.', { id: toastId })
    }
  }

  const formatTime = (secs: number) => {
    if (secs < 0) return '00:00'
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (!question) return null

  // ─── Question Panel (shared between modes) ─────────────────────────────────
  const QuestionPanel = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky question header */}
      <div className="shrink-0 border-b border-[var(--card-border)] bg-[var(--card)] px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-rose-500 font-black whitespace-nowrap">
            {question.question_number || `Q${activeQuestionIdx + 1}`}
          </span>
          <span className="text-sm font-bold text-muted bg-[var(--input)] px-2 py-0.5 rounded-lg whitespace-nowrap">
            {question.marks} mark{question.marks !== 1 ? 's' : ''}
          </span>
          <div className="hidden md:flex items-center gap-2 ml-2 text-xs font-bold text-muted">
            <Clock size={12} className="text-rose-500" />
            <span className="font-mono text-rose-500 font-black">{formatTime(timeRemaining)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost" size="sm"
            onClick={() => setFlagged(prev => ({ ...prev, [question.id]: !prev[question.id] }))}
            className={flagged[question.id] ? 'text-amber-500 bg-amber-500/10' : 'text-muted'}
          >
            <Flag size={14} fill={flagged[question.id] ? 'currentColor' : 'none'} />
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="hidden md:flex text-muted">
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </Button>
        </div>
      </div>

      {/* Scrollable answer area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Question text */}
        <div className="text-base md:text-lg leading-relaxed font-medium">
          <LatexRenderer text={question.content} />
        </div>

        {/* Answer input — determined by question type */}
        <div>
          {/* MCQ */}
          {question.question_type === 'mcq' && (
            <div className="space-y-3">
              {(question.options || []).map((opt: string, i: number) => {
                const letters = ['A', 'B', 'C', 'D', 'E']
                const isSelected = answers[question.id]?.selected === opt
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(question.id, { selected: opt })}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                      isSelected ? 'border-rose-500 bg-rose-500/5' : 'border-[var(--card-border)] bg-[var(--card)] hover:border-rose-500/30'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 text-sm font-black ${isSelected ? 'border-rose-500 bg-rose-500 text-white' : 'border-muted text-muted'}`}>
                      {letters[i] || i + 1}
                    </span>
                    <span className="font-medium"><LatexRenderer text={opt} /></span>
                  </button>
                )
              })}
            </div>
          )}

          {/* True / False */}
          {question.question_type === 'true_false' && (
            <div className="grid grid-cols-2 gap-4">
              {['True', 'False'].map(opt => {
                const isSelected = answers[question.id]?.selected === opt
                return (
                  <button key={opt} onClick={() => handleAnswer(question.id, { selected: opt })}
                    className={`p-5 rounded-2xl border-2 transition-all text-center font-black text-lg ${isSelected ? 'border-rose-500 bg-rose-500 text-white' : 'border-[var(--card-border)] bg-[var(--card)] hover:border-rose-500/30'}`}>
                    {opt}
                  </button>
                )
              })}
            </div>
          )}

          {/* Short Answer */}
          {question.question_type === 'short_answer' && (
            <Textarea
              placeholder="Write your answer here..."
              value={answers[question.id]?.text || ''}
              onChange={e => handleAnswer(question.id, { text: e.target.value })}
              rows={4}
              className="text-base leading-relaxed"
            />
          )}

          {/* Essay / Functional Writing — uses ExamWritingEditor */}
          {question.question_type === 'essay' && (
            <ExamWritingEditor
              value={answers[question.id]?.html || ''}
              onChange={html => handleAnswer(question.id, { html })}
              functionalWritingType={question.functional_writing_type || 'free'}
              wordLimit={question.word_limit}
            />
          )}

          {/* Math Working */}
          {question.question_type === 'math_working' && (
            <div className="space-y-6">
              <Card className="p-1 overflow-hidden bg-[var(--card)] shadow-inner">
                <div className="h-[420px] w-full relative">
                  <AnnotationCanvas
                    pageId={`q-${question.id}`}
                    initialData={answers[question.id]?.canvas}
                    onSave={canvasData => handleAnswer(question.id, { ...answers[question.id], canvas: canvasData })}
                    readOnly={false}
                  />
                  <div className="absolute top-4 left-4 pointer-events-none opacity-50 bg-[var(--card)] px-3 py-1.5 rounded-lg border border-[var(--card-border)] shadow-sm text-xs font-black uppercase tracking-widest text-muted z-10">
                    Show your working
                  </div>
                </div>
              </Card>
              <div className="bg-rose-500/5 p-5 rounded-3xl border border-rose-500/20">
                <Input
                  label="Final Answer"
                  placeholder="e.g. x = 5, or ΔH = -286 kJ/mol..."
                  value={answers[question.id]?.final_answer || ''}
                  onChange={e => handleAnswer(question.id, { ...answers[question.id], final_answer: e.target.value })}
                  className="font-mono text-lg bg-[var(--bg)]"
                />
                <p className="text-xs font-bold text-muted mt-2">
                  Write full working on the canvas above. Final answer is required for auto-grading.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-8 pb-4 border-t border-[var(--card-border)]">
          <Button variant="ghost"
            onClick={() => setActiveQuestionIdx(Math.max(0, activeQuestionIdx - 1))}
            disabled={activeQuestionIdx === 0}
          >
            <ChevronLeft size={16} className="mr-1" /> Previous
          </Button>
          {activeQuestionIdx < questions.length - 1 ? (
            <Button variant="secondary"
              onClick={() => setActiveQuestionIdx(activeQuestionIdx + 1)}
            >
              Next <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button variant="primary" className="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => { if (confirm('Submit your exam? You cannot undo this.')) handleFinalSubmit() }}
            >
              <Send size={16} className="mr-2" /> Submit Exam
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  // ─── Full layout ───────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="h-screen bg-[var(--bg)] text-[var(--text)] flex overflow-hidden">

      {/* ─── LEFT: Question Palette Sidebar ──────────────────────────────── */}
      <div className="w-16 md:w-56 bg-[var(--card)] border-r border-[var(--card-border)] flex flex-col h-full shrink-0 shadow-xl">
        {/* Timer */}
        <div className="shrink-0 p-3 border-b border-[var(--card-border)]">
          <div className="flex flex-col items-center justify-center py-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
            <Clock size={16} className="text-rose-500 mb-1" />
            <span className="text-lg font-black font-mono text-rose-500 leading-none">{formatTime(timeRemaining)}</span>
          </div>
        </div>

        {/* Question palette */}
        <div className="flex-1 overflow-y-auto p-2 md:p-3">
          <p className="hidden md:block text-[10px] font-black text-muted uppercase tracking-widest mb-2 px-1">Questions</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {questions.map((q: any, i: number) => {
              const isAnswered = !!answers[q.id]
              const isFlagged = flagged[q.id]
              const isActive = activeQuestionIdx === i
              return (
                <button key={q.id} onClick={() => setActiveQuestionIdx(i)}
                  title={`Q${i + 1} — ${q.marks} marks`}
                  className={`relative flex items-center justify-center aspect-square rounded-xl text-xs font-black transition-all ${
                    isActive ? 'ring-2 ring-rose-500 bg-rose-500 text-white shadow-lg shadow-rose-500/30' :
                    isAnswered ? 'bg-[var(--input)] text-[var(--text)] border border-[var(--card-border)]' :
                    'bg-[var(--bg)] text-muted border border-dashed border-[var(--card-border)] hover:border-rose-500/50'
                  }`}>
                  {i + 1}
                  {isFlagged && <Flag size={8} className="absolute top-1 right-1 text-amber-500" fill="currentColor" />}
                  {isAnswered && !isActive && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Warnings + submit */}
        <div className="shrink-0 p-2 md:p-3 space-y-2 border-t border-[var(--card-border)]">
          {warnings.length > 0 && (
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 flex items-center gap-1.5 text-[10px] font-bold">
              <AlertTriangle size={12} className="shrink-0" />
              <span className="hidden md:block">{warnings.length} flag{warnings.length > 1 ? 's' : ''}</span>
            </div>
          )}
          <button
            onClick={() => { if (confirm('Submit your exam? You cannot undo this.')) handleFinalSubmit() }}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1"
          >
            <Send size={13} />
            <span className="hidden md:block">Submit</span>
          </button>
        </div>
      </div>

      {/* ─── RIGHT: Main Area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentPassage ? (
          // Split-pane mode for comprehension questions
          <PassageReader
            passage={currentPassage}
            annotations={passageAnnotations[currentPassage.id] || []}
            onAnnotationsChange={annots => setPassageAnnotations(prev => ({ ...prev, [currentPassage.id]: annots }))}
            highlightedParagraph={null}
          >
            <QuestionPanel />
          </PassageReader>
        ) : (
          // Standard full-width mode
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6 md:p-8">
              <QuestionPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
