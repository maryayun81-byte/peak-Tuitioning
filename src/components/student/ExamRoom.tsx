'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Send, AlertTriangle, Maximize, Minimize, Flag, ChevronLeft, ChevronRight, WifiOff, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { LatexRenderer } from '@/components/ui/LatexRenderer'
import { startExamSubmission, submitExam, getServerTime } from '@/app/actions/exams'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { PassageReader } from '@/components/exam/PassageReader'
import { ExamWritingEditor } from '@/components/exam/ExamWritingEditor'
import { SchoolLogo } from '@/components/exam/SchoolLogo'

const AnnotationCanvas = dynamic(
  () => import('@/components/worksheet/AnnotationCanvas').then(m => m.AnnotationCanvas),
  { ssr: false }
)

const REVIEW_WINDOW_SECS = 3 * 60
const TEN_MIN_SECS = 10 * 60
const FIVE_MIN_SECS = 5 * 60

type Phase = 'briefing' | 'active' | 'review'
type SaveState = 'saved' | 'saving' | 'offline'

function isAnswered(q: any, ans: any): boolean {
  if (!ans) return false
  switch (q?.question_type) {
    case 'mcq':
    case 'true_false':
      return !!ans.selected
    case 'short_answer':
    case 'long_answer':
      return !!(ans.text || '').trim()
    case 'essay':
      return !!String(ans.html || '').replace(/<[^>]*>/g, '').trim()
    case 'math_working':
      return !!((ans.final_answer || '').trim() || ans.canvas)
    default:
      return !!(ans.text || '').trim() || !!ans.selected || !!ans.html
  }
}

export function ExamRoom({ examData, timetable, eventName }: { examData: any; timetable?: any | null; eventName?: string | null }) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()

  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [passageAnnotations, setPassageAnnotations] = useState<Record<string, any[]>>({})
  const [flagged, setFlagged] = useState<Record<string, boolean>>({})

  const [phase, setPhase] = useState<Phase>('briefing')
  const [endTime, setEndTime] = useState<number | null>(null)
  const [reviewEndsAt, setReviewEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [tenMinShown, setTenMinShown] = useState(false)
  const [showTenMinModal, setShowTenMinModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  // Official identity, prefilled from the school record — never typed.
  const [candidate, setCandidate] = useState({ name: (student as any)?.full_name || '', className: '', adm: '' })
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0)
  const [flagCount, setFlagCount] = useState(0)
  const [initError, setInitError] = useState<string | null>(null)
  // Lockdown: leaving the exam surface locks the paper until acknowledged.
  const [lockReason, setLockReason] = useState<null | 'hidden' | 'blur' | 'fullscreen'>(null)
  const [violations, setViolations] = useState(0)
  const lockReasonRef = useRef<null | 'hidden' | 'blur' | 'fullscreen'>(null)
  const violationsRef = useRef(0)
  // Server-clock offset: serverNow() is immune to device-clock tampering.
  // Anchored at init, refreshed on reconnect. All exam timing uses it.
  const offsetRef = useRef(0)
  const serverNow = useCallback(() => Date.now() + offsetRef.current, [])
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { lockReasonRef.current = lockReason }, [lockReason])
  const containerRef = useRef<HTMLDivElement>(null)
  const submissionIdRef = useRef<string | null>(null)
  const submittedRef = useRef(false)

  const questions: any[] = examData.questions || []
  const passages: any[] = examData.passages || []
  const totalMarks = questions.reduce((s, q) => s + Number(q.marks || 0), 0)

  const question = questions[activeQuestionIdx]
  const prevQuestion = activeQuestionIdx > 0 ? questions[activeQuestionIdx - 1] : null
  const showSectionHeader = !!question?.section_title &&
    (!prevQuestion || prevQuestion.section_title !== question.section_title)
  const currentPassage = question?.passage_id
    ? passages.find((p: any) => p.id === question.passage_id)
    : null

  const remainingSecs = endTime ? Math.max(0, Math.floor((endTime - now) / 1000)) : examData.duration_minutes * 60
  const reviewSecs = reviewEndsAt ? Math.max(0, Math.floor((reviewEndsAt - now) / 1000)) : 0

  const answeredCount = questions.filter(q => isAnswered(q, answers[q.id])).length
  const unansweredCount = questions.length - answeredCount
  const flaggedCount = questions.filter(q => flagged[q.id]).length

  // ─── Submission init (row + answer recovery). Timer starts only on START. ──
  useEffect(() => {
    initSubmission()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { submissionIdRef.current = submissionId }, [submissionId])
  useEffect(() => { setFlagCount(flaggedCount) }, [flaggedCount])

  // Tick (monotonic 1s cadence; values always derived from server clock)
  useEffect(() => {
    if (phase !== 'active' && phase !== 'review') return
    const t = setInterval(() => setNow(serverNow()), 1000)
    return () => clearInterval(t)
  }, [phase, serverNow])

  // 10-minute warning trigger
  useEffect(() => {
    if (phase === 'active' && endTime && remainingSecs === TEN_MIN_SECS && !tenMinShown) {
      setTenMinShown(true)
      setShowTenMinModal(true)
      logIntegrityEvent('idle_warning', { kind: 'ten_minute_warning' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSecs, phase])

  // Time expires → lock into 3-minute review window (corrections allowed, no extra exam time)
  useEffect(() => {
    if (phase === 'active' && endTime && remainingSecs <= 0) {
      const ends = serverNow() + REVIEW_WINDOW_SECS * 1000
      setReviewEndsAt(ends)
      if (submissionIdRef.current) {
        try { localStorage.setItem(`exam_review_${submissionIdRef.current}`, String(ends)) } catch {}
      }
      setPhase('review')
      logIntegrityEvent('idle_warning', { kind: 'time_expired_review_started' })
      toast('Time has ended — 3:00 review, then auto-submit.', { icon: '⏰' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSecs, phase])

  // Review window expires → auto-submit
  useEffect(() => {
    if (phase === 'review' && reviewEndsAt && reviewSecs <= 0) {
      handleFinalSubmit(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewSecs, phase])

  // ─── Lockdown enforcement ──────────────────────────────────────────────────
  // Browsers cannot physically trap a tab (Alt+Tab / force-quit are OS-level),
  // so leaving is made useless and costly: the paper locks instantly, the
  // timer keeps bleeding, and every exit is a logged strike for review.
  const triggerLock = useCallback((reason: 'hidden' | 'blur' | 'fullscreen', eventType: string, details: any) => {
    if (phaseRef.current !== 'active' && phaseRef.current !== 'review') return
    if (lockReasonRef.current) return // already locked — one strike per exit
    setLockReason(reason)
    // Ref mirror (not the state updater) so StrictMode never double-logs.
    violationsRef.current += 1
    const n = violationsRef.current
    setViolations(n)
    logIntegrityEventRef.current?.(eventType, { ...details, strike: n })
    if (n === 1) toast.error('You left the exam — paper locked. Time keeps running.')
    else if (n === 2) toast.error('Second exit — your teacher will review this sitting.', { duration: 5000 })
    else toast.error(`Exit ${n} logged — this sitting is flagged for review.`, { duration: 5000 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logIntegrityEventRef = useRef<((type: string, details: any) => Promise<void>) | null>(null)

  const resumeExam = useCallback(() => {
    setLockReason(null)
    // Return to the focused environment (desktop); mobile simply continues.
    try {
      if (!document.fullscreenElement && !('ontouchstart' in window)) {
        containerRef.current?.requestFullscreen().catch(() => {})
      }
    } catch {}
  }, [])

  // ─── Integrity monitoring (evidence, never auto-accusation) ────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) triggerLock('hidden', 'tab_switch', { reason: 'Document hidden' })
    }
    const handleBlur = () => triggerLock('blur', 'tab_switch', { reason: 'Window blur / focus loss' })
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement
      setIsFullscreen(isFs)
      if (!isFs && submissionIdRef.current && (phaseRef.current === 'active' || phaseRef.current === 'review')) {
        triggerLock('fullscreen', 'fullscreen_exit', { reason: 'Exited fullscreen' })
      }
    }
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      logIntegrityEvent('copy_attempt', {})
      toast.error('Copying is disabled during exams.')
    }
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      if (target.contentEditable === 'true') return // ExamWritingEditor handles plain-text paste
      e.preventDefault()
      logIntegrityEvent('paste_attempt', { length: e.clipboardData?.getData('text').length })
      toast.error('Pasting is disabled during exams.')
    }
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    const handleOffline = () => {
      setSaveState('offline')
      logIntegrityEvent('idle_warning', { kind: 'connection_lost' })
      toast.error('Connection interrupted — answers stored locally.')
    }
    const handleOnline = () => {
      logIntegrityEvent('idle_warning', { kind: 'connection_restored' })
      // Re-anchor the clock after any offline spell, then sync answers.
      getServerTime().then(t => { offsetRef.current = t - Date.now() }).catch(() => {})
      syncOfflineAnswers()
    }
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (phaseRef.current === 'active' || phaseRef.current === 'review') e.preventDefault()
    }
    // Devtools / source / save / print shortcuts + screenshot key.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'active' && phaseRef.current !== 'review') return
      const mod = e.ctrlKey || e.metaKey
      const devtools =
        e.key === 'F12' ||
        (mod && e.shiftKey && ['I', 'J', 'C', 'K'].includes(e.key.toUpperCase())) ||
        (mod && ['U', 'S', 'P'].includes(e.key.toUpperCase()))
      if (devtools) {
        e.preventDefault()
        logIntegrityEvent('copy_attempt', { kind: 'blocked_shortcut', key: e.key })
        toast.error('That shortcut is disabled during exams.')
        return
      }
      if (e.key === 'PrintScreen') {
        logIntegrityEvent('copy_attempt', { kind: 'screenshot_key' })
        toast.error('Screenshots are logged during exams.')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ─── Auto-save passage annotations ─────────────────────────────────────────
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
      const { id, start_time } = await startExamSubmission(examData.id)
      void start_time
      setSubmissionId(id)
      submissionIdRef.current = id
      // Official identity from the school record (name, class, admission).
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: me } = await supabase
            .from('students')
            .select('full_name, admission_number, class:classes(name)')
            .eq('user_id', user.id)
            .maybeSingle()
          if (me) {
            const cls: any = Array.isArray((me as any).class) ? (me as any).class[0] : (me as any).class
            const full = {
              name: (me as any).full_name || '',
              className: cls?.name || '',
              adm: (me as any).admission_number || '',
            }
            setCandidate(full)
          }
        }
      } catch { /* identity fallback: auth store values */ }
      // Anchor to the SERVER clock — device-clock changes can't buy time.
      try {
        offsetRef.current = (await getServerTime()) - Date.now()
        setNow(serverNow())
      } catch { /* offline fallback: device clock */ }

      const { data: existingAnswers } = await supabase
        .from('exam_answers')
        .select('*')
        .eq('submission_id', id)

      const map: Record<string, any> = {}
      if (existingAnswers) existingAnswers.forEach(a => { map[a.question_id] = a.student_answer })

      // Offline recovery: local cache wins for keys missing from DB
      try {
        const cached = localStorage.getItem(`exam_cache_${id}`)
        if (cached) {
          const parsed = JSON.parse(cached)
          let recovered = 0
          Object.keys(parsed).forEach(k => { if (!map[k]) { map[k] = parsed[k]; recovered += 1 } })
          if (recovered > 0) toast.success(`Recovered ${recovered} unsaved answer(s).`)
        }
        // Resume an already-started timer (refresh / reconnect / device restart)
        const timing = localStorage.getItem(`exam_timing_${id}`)
        const review = localStorage.getItem(`exam_review_${id}`)
        if (review) {
          const ends = Number(review)
          if (ends > serverNow()) { setReviewEndsAt(ends); setPhase('review') }
          else if (timing) {
            const end = Number(timing)
            if (end > serverNow()) { setEndTime(end); setPhase('active') }
          }
        } else if (timing) {
          const end = Number(timing)
          if (end > serverNow()) { setEndTime(end); setPhase('active') }
        }
      } catch {}

      setAnswers(map)

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
      setInitError(e.message || 'Failed to start exam')
    }
  }

  const logIntegrityEvent = async (type: string, details: any) => {
    const sid = submissionIdRef.current
    if (!sid) return
    setFlagCount(c => c + 1)
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
  useEffect(() => { logIntegrityEventRef.current = logIntegrityEvent })

  const syncOfflineAnswers = async () => {
    const sid = submissionIdRef.current
    if (!sid) return
    try {
      const cached = localStorage.getItem(`exam_cache_${sid}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        for (const [qId, ans] of Object.entries(parsed)) {
          await supabase.from('exam_answers').upsert({
            submission_id: sid, question_id: qId, student_answer: ans
          }, { onConflict: 'submission_id, question_id' })
        }
      }
      setSaveState('saved')
      toast.success('Responses synchronized ✓')
    } catch {
      setSaveState('offline')
    }
  }

  const startExam = () => {
    if (!candidate.name.trim()) { toast.error('Identity still loading — wait a moment.'); return }
    if (!submissionId) { toast.error('Still preparing — wait a moment.'); return }
    const end = serverNow() + examData.duration_minutes * 60 * 1000
    setEndTime(end)
    try {
      localStorage.setItem(`exam_timing_${submissionId}`, String(end))
    } catch {}
    // Late start evidence (timetable exists and window already open)
    if (timetable?.starts_at && Date.now() > new Date(timetable.starts_at).getTime() + 5 * 60 * 1000) {
      logIntegrityEvent('idle_warning', { kind: 'late_start', timetable_start: timetable.starts_at })
    }
    setPhase('active')
    // Focused environment (recommended, not forced)
    try { containerRef.current?.requestFullscreen().catch(() => {}) } catch {}
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
        try { localStorage.setItem(`exam_cache_${submissionIdRef.current}`, JSON.stringify(next)) } catch {}
      }
      return next
    })
    saveAnswer(questionId, answerData)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveAnswer = async (questionId: string, answerData: any) => {
    const sid = submissionIdRef.current
    if (!sid) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) { setSaveState('offline'); return }
    setSaveState('saving')
    try {
      await supabase.from('exam_answers').upsert({
        submission_id: sid,
        question_id: questionId,
        student_answer: answerData
      }, { onConflict: 'submission_id, question_id' })
      // Best-effort snapshot for resume + teacher review
      try {
        const cached = localStorage.getItem(`exam_cache_${sid}`)
        await supabase.from('exam_submissions').update({
          current_answers: cached ? JSON.parse(cached) : answers,
          last_saved_at: new Date().toISOString()
        }).eq('id', sid)
      } catch {}
      setSaveState('saved')
    } catch (e) {
      setSaveState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'saving')
      console.error('Auto-save failed, kept locally', e)
    }
  }

  const handleFinalSubmit = async (auto = false) => {
    const sid = submissionIdRef.current
    if (!sid || submittedRef.current) return
    submittedRef.current = true
    if (auto) logIntegrityEvent('idle_warning', { kind: 'auto_submit' })
    const toastId = toast.loading(auto ? 'Review ended — submitting…' : 'Submitting exam…')
    try {
      await submitExam(sid, Object.entries(answers).map(([qId, ans]) => ({
        question_id: qId,
        student_answer: ans
      })))
      try {
        localStorage.removeItem(`exam_cache_${sid}`)
        localStorage.removeItem(`exam_timing_${sid}`)
        localStorage.removeItem(`exam_review_${sid}`)
      } catch {}
      toast.success('Exam submitted successfully!', { id: toastId })
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      router.push('/student/exam-desk')
    } catch (e) {
      submittedRef.current = false
      toast.error('Submit failed — answers are saved, please retry.', { id: toastId })
    }
  }

  const formatTime = (secs: number) => {
    if (secs < 0) secs = 0
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const urgent = phase === 'active' && remainingSecs <= FIVE_MIN_SECS
  const warning = phase === 'active' && remainingSecs <= TEN_MIN_SECS

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--bg)]">
        <Card className="p-8 max-w-md text-center space-y-3">
          <p className="font-black">Could not start exam</p>
          <p className="text-sm text-muted">{initError}</p>
          <Button onClick={() => router.push('/student/exam-desk')}>Back to Exam Desk</Button>
        </Card>
      </div>
    )
  }

  // ─── BRIEFING (timer starts ONLY after START) ──────────────────────────────
  if (phase === 'briefing') {
    return (
      <div className="min-h-screen bg-[#e9e4d6] p-6 md:p-10 font-serif">
        <div className="max-w-2xl mx-auto bg-white rounded-sm shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)] px-6 py-8 md:px-10">
          <div className="text-center border-double border-b-8 border-slate-800 pb-6 mb-6">
            <div className="flex justify-center mb-3"><SchoolLogo size={56} /></div>
            <p className="text-xs font-bold tracking-[0.35em] text-slate-500 font-sans">PEAK CAMPUS</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-2">{examData.subject?.name || 'Examination'}</h1>
            <p className="font-bold text-sm mt-1 font-sans">{eventName || examData.title}</p>
            {timetable && (
              <p className="text-xs text-slate-500 mt-2 font-sans">
                Window: {new Date(timetable.starts_at).toLocaleString()} → {new Date(timetable.ends_at).toLocaleString()}
              </p>
            )}
          </div>
          <div className="space-y-4 font-sans">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded bg-slate-50 border border-slate-200"><p className="text-[10px] font-bold uppercase text-slate-500">Time allowed</p><p className="font-bold">{examData.duration_minutes} min</p></div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200"><p className="text-[10px] font-bold uppercase text-slate-500">Total marks</p><p className="font-bold">{totalMarks}</p></div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200"><p className="text-[10px] font-bold uppercase text-slate-500">Questions</p><p className="font-bold">{questions.length}</p></div>
            </div>
            <div className="text-sm space-y-1.5 text-slate-700">
              <p>• Read all questions carefully.</p>
              <p>• Answer all required questions.</p>
              <p>• Your work auto-saves — a short offline spell will not lose it.</p>
              <p>• Do not leave the exam environment unnecessarily; exits are logged for review.</p>
              <p>• <strong>Switching tabs, leaving fullscreen or opening other apps locks your paper</strong> — the timer keeps running and every exit is reported to your teacher.</p>
              <p>• At 10 minutes a warning appears; at 00:00 you get a 3:00 review, then auto-submit.</p>
            </div>
            <div className="border border-slate-300 rounded p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Sitting as (from school record)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <p><span className="text-slate-500">Name:</span> <strong>{candidate.name || 'Loading…'}</strong></p>
                <p><span className="text-slate-500">Class:</span> <strong>{candidate.className || '—'}</strong></p>
                <p><span className="text-slate-500">Adm:</span> <strong>{candidate.adm || '—'}</strong></p>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Wrong details? Tell your teacher before starting — do not sit under another name.</p>
            </div>
            <p className="text-xs text-slate-500">For a focused experience, fullscreen is recommended. Exiting fullscreen is logged, never auto-failed.</p>
            <Button className="w-full py-4 bg-slate-900 hover:bg-slate-800" onClick={startExam} disabled={!submissionId}>
              I&apos;M READY — START EXAM
            </Button>
            {!submissionId && <p className="text-xs text-center text-slate-500">Preparing your paper…</p>}
          </div>
        </div>
      </div>
    )
  }

  if (!question) return null

  // ─── Question Panel ────────────────────────────────────────────────────────
  const QuestionPanel = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 md:px-6 py-3 flex items-center justify-between gap-4 font-sans">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-slate-900 font-bold whitespace-nowrap">
            {question.question_number || `Q${activeQuestionIdx + 1}`}
          </span>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg whitespace-nowrap">
            [{question.marks} {Number(question.marks) === 1 ? 'mark' : 'marks'}]
          </span>
          <div className="hidden md:flex items-center gap-2 ml-2 text-xs font-bold text-slate-500">
            <Clock size={12} className={urgent ? 'text-red-500' : 'text-slate-400'} />
            <span className={`font-mono font-black ${urgent ? 'text-red-500 text-base' : 'text-slate-700'}`}>
              {phase === 'review' ? `REVIEW ${formatTime(reviewSecs)}` : formatTime(remainingSecs)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline text-[10px] font-bold text-slate-500">
            {saveState === 'saved' && <span className="text-emerald-600">Saved ✓</span>}
            {saveState === 'saving' && <span>Saving…</span>}
            {saveState === 'offline' && <span className="text-amber-600 flex items-center gap-1"><WifiOff size={11} /> Offline — stored locally</span>}
          </span>
          <Button
            variant="ghost" size="sm"
            onClick={() => setFlagged(prev => ({ ...prev, [question.id]: !prev[question.id] }))}
            className={flagged[question.id] ? 'text-amber-500 bg-amber-500/10' : 'text-slate-400'}
          >
            <Flag size={14} fill={flagged[question.id] ? 'currentColor' : 'none'} />
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="hidden md:flex text-slate-400">
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-white">
        {showSectionHeader && (
          <div className="text-center bg-slate-900 text-white px-4 py-2">
            <span className="font-bold text-sm tracking-wide font-sans">{question.section_title}</span>
          </div>
        )}
        {phase === 'review' && (
          <div className="p-4 rounded bg-amber-50 border border-amber-300 text-sm font-bold text-amber-800 font-sans">
            FINAL REVIEW — {formatTime(reviewSecs)} remaining. This is NOT extra exam time: check your name, unanswered
            questions and corrections. Auto-submit at 00:00.
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={() => handleFinalSubmit(false)}>Submit now</Button>
            </div>
          </div>
        )}
        <div className="text-base md:text-[17px] leading-relaxed select-none">
          <LatexRenderer text={question.content} />
        </div>
        {question.media_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={question.media_url} alt="Question diagram" className="rounded border border-slate-300 max-h-80 object-contain bg-white" />
        )}

        <div>
          {question.question_type === 'mcq' && (
            <div className="space-y-3">
              {(question.options || []).map((opt: string, i: number) => {
                const letters = ['A', 'B', 'C', 'D', 'E']
                const isSelected = answers[question.id]?.selected === opt
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(question.id, { selected: opt })}
                    className={`w-full text-left p-4 rounded border-2 transition-all flex items-center gap-4 font-sans ${
                      isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white hover:border-slate-500'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 text-sm font-bold ${isSelected ? 'border-white text-white' : 'border-slate-400 text-slate-500'}`}>
                      {letters[i] || i + 1}
                    </span>
                    <span className="font-medium select-none"><LatexRenderer text={opt} /></span>
                  </button>
                )
              })}
            </div>
          )}

          {question.question_type === 'true_false' && (
            <div className="grid grid-cols-2 gap-4">
              {['True', 'False'].map(opt => {
                const isSelected = answers[question.id]?.selected === opt
                return (
                  <button key={opt} onClick={() => handleAnswer(question.id, { selected: opt })}
                    className={`p-5 rounded border-2 transition-all text-center font-bold text-lg font-sans ${isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white hover:border-slate-500'}`}>
                    {opt}
                  </button>
                )
              })}
            </div>
          )}

          {question.question_type === 'short_answer' && (
            <Textarea
              placeholder="Write your answer here..."
              value={answers[question.id]?.text || ''}
              onChange={e => handleAnswer(question.id, { text: e.target.value })}
              rows={4}
              className="text-base leading-relaxed"
            />
          )}

          {/* Long answer — ruled paragraph workspace with live word count */}
          {question.question_type === 'long_answer' && (
            <div className="rounded border border-slate-300 bg-white p-1 font-sans">
              <Textarea
                placeholder="Write a full paragraph answer — explain, give evidence, conclude…"
                value={answers[question.id]?.text || ''}
                onChange={e => handleAnswer(question.id, { text: e.target.value })}
                rows={10}
                className="text-base border-0 focus:ring-0 bg-transparent"
                style={{
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #cbd5e1 32px)',
                  lineHeight: '32px',
                }}
              />
              <p className="text-[11px] font-bold text-slate-500 text-right px-3 pb-2">
                {(answers[question.id]?.text || '').trim().split(/\s+/).filter(Boolean).length} words
              </p>
            </div>
          )}

          {question.question_type === 'essay' && (
            <ExamWritingEditor
              value={answers[question.id]?.html || ''}
              onChange={html => handleAnswer(question.id, { html })}
              functionalWritingType={question.functional_writing_type || 'free'}
              wordLimit={question.word_limit}
            />
          )}

          {question.question_type === 'math_working' && (
            <div className="space-y-4 font-sans">
              <div className="rounded border border-slate-300 overflow-hidden bg-white shadow-inner">
                <div className="h-[420px] w-full relative">
                  <AnnotationCanvas
                    pageId={`q-${question.id}`}
                    initialData={answers[question.id]?.canvas}
                    onSave={canvasData => handleAnswer(question.id, { ...answers[question.id], canvas: canvasData })}
                    readOnly={false}
                  />
                  <div className="absolute top-4 left-4 pointer-events-none bg-white/80 px-3 py-1.5 rounded border border-slate-300 shadow-sm text-xs font-bold uppercase tracking-widest text-slate-500 z-10">
                    Show your working
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded border border-slate-300">
                <Input
                  label="Final Answer"
                  placeholder="e.g. x = 5"
                  value={answers[question.id]?.final_answer || ''}
                  onChange={e => handleAnswer(question.id, { ...answers[question.id], final_answer: e.target.value })}
                  className="font-mono text-lg bg-white"
                />
              </div>
            </div>
          )}

          {/* Fallback for fill_in_the_blank / matching / case_study / structured */}
          {!['mcq', 'true_false', 'short_answer', 'long_answer', 'essay', 'math_working'].includes(question.question_type) && (
            <div className="space-y-3">
              {question.question_number && /\(?[a-z]\)/i.test(String(question.question_number)) === false && null}
              <Textarea
                placeholder="Write your answer here… (use one block per sub-part, e.g. (a) … (b) …)"
                value={answers[question.id]?.text || ''}
                onChange={e => handleAnswer(question.id, { text: e.target.value })}
                rows={6}
                className="text-base leading-relaxed"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-6 pb-2 border-t-2 border-slate-800 font-sans">
          <Button variant="ghost"
            onClick={() => setActiveQuestionIdx(Math.max(0, activeQuestionIdx - 1))}
            disabled={activeQuestionIdx === 0}
          >
            <ChevronLeft size={16} className="mr-1" /> Previous
          </Button>
          {activeQuestionIdx < questions.length - 1 ? (
            <Button variant="secondary" onClick={() => setActiveQuestionIdx(activeQuestionIdx + 1)}>
              Next <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button variant="primary" className="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => setShowConfirm(true)}
            >
              <Send size={16} className="mr-2" /> {phase === 'review' ? 'Submit now' : 'Finish…'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  // ─── Full layout: warm desk, white paper ───────────────────────────────────
  return (
    <div ref={containerRef} className="h-screen bg-[#e9e4d6] text-slate-900 flex overflow-hidden">
      <div className="w-16 md:w-56 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 shadow-xl">
        <div className="shrink-0 p-3 border-b border-slate-200 space-y-2">
          <div className={`flex flex-col items-center justify-center py-3 rounded-xl border font-sans ${
            urgent || phase === 'review' ? 'bg-red-50 border-red-300' : warning ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'
          }`}>
            <Clock size={16} className={urgent || phase === 'review' ? 'text-red-500 mb-1' : 'text-slate-500 mb-1'} />
            <span className={`text-lg font-bold font-mono leading-none ${urgent || phase === 'review' ? 'text-red-600' : 'text-slate-800'}`}>
              {phase === 'review' ? formatTime(reviewSecs) : formatTime(remainingSecs)}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-1">
              {phase === 'review' ? 'review left' : 'remaining'}
            </span>
          </div>
          <p className="hidden md:block text-center text-[10px] font-bold text-slate-500">
            {saveState === 'saved' && <span className="text-emerald-600 flex items-center justify-center gap-1"><Check size={11} /> Saved ✓</span>}
            {saveState === 'saving' && <span>Saving…</span>}
            {saveState === 'offline' && <span className="text-amber-600">Offline — stored locally</span>}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 md:p-3">
          <p className="hidden md:block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Questions</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {questions.map((q: any, i: number) => {
              const done = isAnswered(q, answers[q.id])
              const isFlagged = flagged[q.id]
              const isActive = activeQuestionIdx === i
              return (
                <button key={q.id} onClick={() => setActiveQuestionIdx(i)}
                  title={`Q${i + 1} — ${q.marks} marks${done ? ' — answered' : ''}${isFlagged ? ' — for review' : ''}`}
                  className={`relative flex items-center justify-center aspect-square rounded-xl text-xs font-black transition-all ${
                    isActive ? 'ring-2 ring-slate-900 bg-slate-900 text-white shadow-lg' :
                    done ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30' :
                    'bg-slate-50 text-slate-500 border border-dashed border-slate-300 hover:border-slate-500'
                  }`}>
                  {i + 1}
                  {isFlagged && <Flag size={8} className="absolute top-1 right-1 text-amber-500" fill="currentColor" />}
                  {done && !isActive && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full" />}
                </button>
              )
            })}
          </div>
          <p className="hidden md:block text-[10px] text-slate-500 mt-3 px-1">
            {answeredCount} answered · {unansweredCount} unanswered · {flaggedCount} for review
          </p>
        </div>

        <div className="shrink-0 p-2 md:p-3 space-y-2 border-t border-slate-200">
          {flagCount > 0 && (
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 flex items-center gap-1.5 text-[10px] font-bold">
              <AlertTriangle size={12} className="shrink-0" />
              <span className="hidden md:block">{flagCount} integrity event(s) — review only</span>
            </div>
          )}
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1"
          >
            <Send size={13} />
            <span className="hidden md:block">Submit</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {warning && phase === 'active' && (
          <div className={`shrink-0 px-4 py-2 text-xs font-black text-center ${urgent ? 'bg-red-500 text-white' : 'bg-amber-500/15 text-amber-600'}`}>
            {urgent ? `⚠ ${formatTime(remainingSecs)} REMAINING — review now` : `⚠ ${formatTime(remainingSecs)} remaining — start reviewing`}
          </div>
        )}
        {currentPassage ? (
          <PassageReader
            passage={currentPassage}
            annotations={passageAnnotations[currentPassage.id] || []}
            onAnnotationsChange={annots => setPassageAnnotations(prev => ({ ...prev, [currentPassage.id]: annots }))}
            highlightedParagraph={null}
          >
            <QuestionPanel />
          </PassageReader>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-4 md:p-8">
              {/* White exam sheet */}
              <div className="bg-white rounded-sm shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)] px-5 py-6 md:px-10 md:py-8 font-serif">
                <div className="text-center border-double border-b-8 border-slate-800 pb-5 mb-4">
                  <div className="flex justify-center mb-2"><SchoolLogo size={44} /></div>
                  <p className="text-[10px] font-bold tracking-[0.35em] text-slate-500 font-sans">PEAK CAMPUS</p>
                  <p className="text-lg font-bold mt-1">{examData.subject?.name} — {eventName || examData.title}</p>
                  <p className="text-xs text-slate-500 mt-1 font-sans">Name: {candidate.name || '__________'} · {candidate.className} · Adm: {candidate.adm || '___'} · Total: {totalMarks} marks · {examData.duration_minutes} min</p>
                </div>
                <QuestionPanel />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 10-minute warning modal */}
      {showTenMinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <Card className="p-8 max-w-md w-full text-center space-y-4">
            <p className="text-3xl font-black">10 MINUTES REMAINING</p>
            <div className="text-sm text-left space-y-1">
              <p>✓ Your name is correctly entered</p>
              <p>✓ Required questions are answered ({unansweredCount} left)</p>
              <p>✓ Your answers are saved ({saveState === 'saved' ? 'yes ✓' : 'saving…'})</p>
              <p>✓ You have checked your work</p>
            </div>
            <Button className="w-full" onClick={() => setShowTenMinModal(false)}>CONTINUE EXAM</Button>
          </Card>
        </div>
      )}

      {/* Submission confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <Card className="p-8 max-w-md w-full space-y-4">
            <p className="text-xl font-black">SUBMIT EXAM?</p>
            <div className="text-sm space-y-1">
              <p>• {questions.length} question(s) total</p>
              <p>• {answeredCount} answered</p>
              <p>• {unansweredCount} unanswered</p>
              <p>• {flaggedCount} marked for review</p>
            </div>
            {unansweredCount > 0 && <p className="text-xs text-amber-600 font-bold">You still have unanswered questions.</p>}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowConfirm(false)}>Go back</Button>
              <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600" onClick={() => { setShowConfirm(false); handleFinalSubmit(false) }}>Submit examination</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Lockdown overlay: paper frozen until the student returns */}
      {lockReason && (phase === 'active' || phase === 'review') && (
        <div className="fixed inset-0 z-[60] bg-slate-900/95 flex items-center justify-center p-6 font-sans">
          <div className="bg-white rounded-sm shadow-2xl max-w-md w-full p-8 text-center space-y-4">
            <div className="flex justify-center"><SchoolLogo size={44} /></div>
            <p className="text-2xl font-bold text-slate-900">PAPER LOCKED</p>
            <p className="text-sm text-slate-600">
              {lockReason === 'hidden' && 'You switched tabs or minimized the exam.'}
              {lockReason === 'blur' && 'You left the exam window.'}
              {lockReason === 'fullscreen' && 'You exited fullscreen mode.'}
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-3">
              <p className="font-mono font-bold text-xl text-slate-900">
                {phase === 'review' ? formatTime(reviewSecs) : formatTime(remainingSecs)}
              </p>
              <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest mt-1">
                Your time keeps running
              </p>
            </div>
            <p className="text-xs font-bold text-amber-700">
              Exit {violations} of this sitting logged
              {violations >= 2 ? ' — flagged for teacher review.' : '.'}
            </p>
            <Button className="w-full py-4 bg-slate-900 hover:bg-slate-800" onClick={resumeExam}>
              I&apos;M BACK — RESUME EXAM
            </Button>
            <p className="text-[11px] text-slate-500">Further exits are reported to your teacher with timestamps.</p>
          </div>
        </div>
      )}
    </div>
  )
}
