'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, BookOpen, Users, Sparkles, Clock, CheckCircle2, PlayCircle,
  Send, Target, FileText, ExternalLink, Video, ChevronDown, ChevronUp,
  AlertTriangle, Lock,
} from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import {
  getLearningSessions, startSession, completeSession,
  startMission, completeMission,
  submitReflection, catchUpSession, getLearningObjectives,
  getLearningResources, getLearningMission,
} from '@/app/actions/homeschooling'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useHomeschoolRealtime } from '@/hooks/useHomeschoolRealtime'
import { formatTimeRange, getSessionModeLabel } from '@/lib/homeschooling/constants'
import { isEndedUnfinished, isHappeningNow } from '@/lib/homeschooling/session-time'
import { PeakCoachHomeschool } from '@/components/student/PeakCoachHomeschool'
import SessionSubmissionPanel from '@/components/student/SessionSubmissionPanel'
import WorkspaceRenderer from '@/components/homeschooling/workspaces/registry'
import ErrorClassifier from '@/components/homeschooling/ErrorClassifier'
import MissionMap from '@/components/homeschooling/MissionMap'
import { AttemptTimeline } from '@/components/homeschooling/LearningBits'
import {
  getSessionActivities,
  submitQuestionAttempt,
  getQuestionAttempts,
} from '@/app/actions/homeschool-learning'
import toast from 'react-hot-toast'
import type { LearningSession, LearningObjective, LearningResource, LearningMission, LearningReflection } from '@/types/homeschooling'

// Student session — §§46–53. Staged mission flow, never a quiz dump:
// INTRO (today's mission) → MAP → OBJECTIVE (learn → practice → demonstrate)
// → REVIEW → CORRECTION → MASTERY.

const MODE_CONFIG: Record<string, { color: string; bg: string; Icon: typeof Users; label: string }> = {
  TEACHER_LED: { color: '#4F8CFF', bg: 'rgba(79,140,255,0.12)', Icon: Users, label: 'Teacher-led' },
  SELF_STUDY: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', Icon: BookOpen, label: 'Self-study' },
  AI_SUPPORTED: { color: '#A855F7', bg: 'rgba(168,85,247,0.12)', Icon: Sparkles, label: 'AI-supported' },
  HYBRID: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', Icon: Users, label: 'Hybrid' },
}

const CONFIDENCE_OPTIONS = [
  { value: 'need_help', label: 'Need Help', emoji: '😟', color: '#EF4444' },
  { value: 'getting_there', label: 'Getting There', emoji: '🤔', color: '#F59E0B' },
  { value: 'comfortable', label: 'Comfortable', emoji: '😊', color: '#10B981' },
  { value: 'very_confident', label: 'Very Confident', emoji: '🔥', color: '#A855F7' },
]

function PracticeQuestion({
  question,
  sessionId,
  objectiveId,
  activityId,
  studentId,
}: {
  question: any
  sessionId: string
  objectiveId?: string
  activityId?: string
  studentId: string
}) {
  const draftKey = `hs-draft:${sessionId}:${question.id}`
  const [working, setWorking] = useState<any>(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      return raw ? JSON.parse(raw).working : undefined
    } catch {
      return undefined
    }
  })
  const [answer, setAnswer] = useState<any>(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      return raw ? JSON.parse(raw).answer : undefined
    } catch {
      return undefined
    }
  })
  const [attempts, setAttempts] = useState<any[]>([])
  const [lastAttempt, setLastAttempt] = useState<any>(null)
  const [showClassifier, setShowClassifier] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    getQuestionAttempts(question.id).then((res) => {
      if (res.success) {
        setAttempts(res.data as any[])
        const last = (res.data as any[])[(res.data as any[]).length - 1]
        if (last) setLastAttempt(last)
      }
    })
  }, [question.id])

  const handleWorking = (w: any, a: any) => {
    setWorking(w)
    if (a !== undefined) setAnswer(a)
    try {
      localStorage.setItem(draftKey, JSON.stringify({ working: w, answer: a !== undefined ? a : answer }))
    } catch { /* draft persistence is best-effort (§68, §115) */ }
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await submitQuestionAttempt({
        question_id: question.id,
        session_id: sessionId,
        objective_id: objectiveId,
        activity_id: activityId,
        final_answer: answer,
        working: working || {},
        steps: Array.isArray(working?.steps) ? working.steps : [],
        idempotency_key: crypto.randomUUID(),
      })
      if (!res.success) throw new Error(res.error)
      const attempt = res.data as any
      setAttempts((prev) => [...prev, attempt])
      setLastAttempt(attempt)
      try {
        localStorage.removeItem(draftKey)
      } catch { /* ignore */ }
      if (attempt.is_correct === true) {
        toast.success('Correct — nicely done.')
      } else if (attempt.is_correct === false) {
        toast('Not quite — let’s figure out what happened.', { icon: '🔍' })
        setShowClassifier(true)
      } else {
        toast.success('Submitted — your teacher will review it.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit attempt')
    } finally {
      setSubmitting(false)
    }
  }

  const answered = answer !== undefined && answer !== '' && answer !== null
  const reviewed = lastAttempt && lastAttempt.is_correct !== null && lastAttempt.is_correct !== undefined

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left min-h-[44px]">
        <span className="flex items-start justify-between gap-2">
          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
            {question.prompt}
          </span>
          {open ? <ChevronUp size={16} className="shrink-0 opacity-50" /> : <ChevronDown size={16} className="shrink-0 opacity-50" />}
        </span>
        <span className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          <span>{question.difficulty || 'standard'}</span>
          <span>·</span>
          <span>{question.marks || 1} mark{(question.marks || 1) !== 1 ? 's' : ''}</span>
          {lastAttempt?.is_correct === true && <span style={{ color: '#10B981' }}>· Correct</span>}
          {lastAttempt && lastAttempt.is_correct !== true && lastAttempt.is_correct !== null && lastAttempt.is_correct !== undefined && (
            <span style={{ color: '#F59E0B' }}>· Revisit</span>
          )}
        </span>
      </button>

      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <WorkspaceRenderer
            question={question}
            initialWorking={working}
            initialAnswer={answer}
            onWorkingChange={handleWorking}
          />
          {attempts.length > 0 && <AttemptTimeline attempts={attempts} />}
          {showClassifier && lastAttempt && lastAttempt.is_correct === false && (
            <ErrorClassifier
              attemptId={lastAttempt.id}
              onDone={() => setShowClassifier(false)}
            />
          )}
          <Button
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={!answered}
            className="w-full rounded-xl"
          >
            <Send size={15} /> {reviewed ? 'Try again' : 'Submit answer'}
          </Button>
        </motion.div>
      )}
    </div>
  )
}

// §50 — Learn resource in context: what it is for + required state.
function ResourceItem({ resource }: { resource: LearningResource }) {
  const iconMap: Record<string, typeof FileText> = {
    link: ExternalLink,
    file: FileText,
    video: Video,
    document: FileText,
    image: FileText,
    quiz: FileText,
    question_set: FileText,
  }
  const Icon = iconMap[resource.type] || FileText
  const purpose =
    resource.type === 'video' ? 'Watch — your teacher chose this to explain the idea.' :
    resource.type === 'link' ? 'Explore — background reading for this objective.' :
    'Study — work through this with your notebook open.'
  const minutes = (resource as any).estimated_minutes as number | null | undefined

  const handleClick = () => {
    if (resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      className="flex items-center gap-3 p-4 rounded-2xl border cursor-pointer hover:shadow-sm transition-all min-h-[64px]"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick() }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(79,140,255,0.1)' }}>
        <Icon size={17} style={{ color: 'var(--primary)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{resource.title}</p>
        <p className="text-[11px] font-medium opacity-50 mt-0.5">
          {resource.is_required ? 'Required · ' : ''}{minutes ? `~${minutes} min · ` : ''}{purpose}
        </p>
      </div>
      {resource.is_required && (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
          Required
        </span>
      )}
      <ExternalLink size={14} className="opacity-30 shrink-0" />
    </div>
  )
}

function ReflectionSection({ sessionId, existingReflection, onSubmit }: {
  sessionId: string
  existingReflection?: LearningReflection | null
  onSubmit: (data: any) => Promise<void>
}) {
  const [accomplished, setAccomplished] = useState(existingReflection?.accomplished || '')
  const [difficulties, setDifficulties] = useState(existingReflection?.difficulties || '')
  const [confidence, setConfidence] = useState(existingReflection?.confidence || '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSubmit({ accomplished, difficulties, confidence })
      toast.success('Reflection submitted!')
    } catch {
      toast.error('Failed to submit reflection')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text)' }}>
        Reflect
      </h3>
      <p className="text-xs font-medium opacity-60 -mt-2">What did you take away from this mission?</p>

      <div>
        <label className="text-xs font-bold mb-1.5 block opacity-60">What did you accomplish?</label>
        <textarea
          value={accomplished}
          onChange={(e) => setAccomplished(e.target.value)}
          placeholder="Describe what you learned..."
          className="w-full p-3 rounded-xl text-sm font-medium resize-none focus:ring-2 focus:ring-primary/30 outline-none border"
          style={{ background: 'var(--input)', color: 'var(--text)', borderColor: 'var(--card-border)' }}
          rows={3}
        />
      </div>

      <div>
        <label className="text-xs font-bold mb-1.5 block opacity-60">Any difficulties?</label>
        <textarea
          value={difficulties}
          onChange={(e) => setDifficulties(e.target.value)}
          placeholder="What was challenging..."
          className="w-full p-3 rounded-xl text-sm font-medium resize-none focus:ring-2 focus:ring-primary/30 outline-none border"
          style={{ background: 'var(--input)', color: 'var(--text)', borderColor: 'var(--card-border)' }}
          rows={2}
        />
      </div>

      <div>
        <label className="text-xs font-bold mb-2 block opacity-60">Confidence level</label>
        <div className="grid grid-cols-2 gap-2">
          {CONFIDENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setConfidence(opt.value)}
              className={`p-3 rounded-xl text-xs font-bold transition-all border-2 min-h-[56px] ${
                confidence === opt.value ? 'shadow-md' : 'opacity-60 hover:opacity-80'
              }`}
              style={{
                background: confidence === opt.value ? `${opt.color}12` : 'var(--input)',
                borderColor: confidence === opt.value ? opt.color : 'var(--card-border)',
                color: 'var(--text)',
              }}
            >
              <span className="text-lg block mb-1">{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        isLoading={submitting}
        disabled={!accomplished && !confidence}
        className="w-full rounded-xl"
      >
        Submit Reflection
      </Button>
    </Card>
  )
}

// §48 — Objective intro + staged flow: LEARN → PRACTICE → DEMONSTRATE.
function ObjectiveFocus({
  index,
  objective,
  resources,
  questions,
  submissionRequired,
  sessionId,
  studentId,
  onBack,
  children,
}: {
  index: number
  objective: LearningObjective
  resources: LearningResource[]
  questions: any[]
  submissionRequired: boolean
  sessionId: string
  studentId: string
  onBack: () => void
  children?: React.ReactNode
}) {
  const steps = [
    { key: 'learn', label: 'Learn', show: resources.length > 0 },
    { key: 'practice', label: 'Practice', show: questions.length > 0 },
    { key: 'demonstrate', label: 'Demonstrate', show: submissionRequired || questions.length > 0 },
    { key: 'master', label: 'Master', show: true },
  ].filter((s) => s.show)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold opacity-60 min-h-[44px]">
        <ArrowLeft size={14} /> Back to mission map
      </button>

      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--primary)' }}>
          Objective {index + 1}
        </p>
        <h2 className="text-2xl font-black tracking-tight mt-1" style={{ color: 'var(--text)' }}>
          {objective.title}
        </h2>
        {objective.description && (
          <>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-50 mt-4 mb-1.5">
              Why this matters
            </p>
            <p className="text-sm font-medium leading-relaxed opacity-70">{objective.description}</p>
          </>
        )}
        <div className="mt-4 p-4 rounded-2xl" style={{ background: 'var(--input)' }}>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-50 mb-2">You&apos;ll</p>
          <ul className="space-y-1.5">
            {steps.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--text)' }}>
                <CheckCircle2 size={14} style={{ color: '#10B981' }} /> {s.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {resources.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-sm font-black mb-3" style={{ color: 'var(--text)' }}>
            <BookOpen size={16} style={{ color: '#4F8CFF' }} /> Learn
          </h3>
          <p className="text-xs font-medium opacity-60 mb-3">Your teacher prepared these for this objective.</p>
          <div className="space-y-2">
            {resources.map((res) => (
              <ResourceItem key={res.id} resource={res} />
            ))}
          </div>
        </section>
      )}

      {questions.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-sm font-black mb-3" style={{ color: 'var(--text)' }}>
            <Target size={16} style={{ color: '#4F8CFF' }} /> Practice
          </h3>
          <div className="space-y-3">
            {questions.map((q: any) => (
              <PracticeQuestion
                key={q.id}
                question={q}
                sessionId={sessionId}
                objectiveId={objective.id}
                activityId={q.activity_id}
                studentId={studentId}
              />
            ))}
          </div>
        </section>
      )}

      {children}
    </motion.div>
  )
}

export default function SessionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string
  const { student } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<LearningSession | null>(null)
  const [objectives, setObjectives] = useState<LearningObjective[]>([])
  const [resources, setResources] = useState<LearningResource[]>([])
  const [mission, setMission] = useState<LearningMission | null>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [standaloneQuestions, setStandaloneQuestions] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  // Staged mission flow (§§46–49): intro → map → objective focus.
  const [entered, setEntered] = useState(false)
  const [focusedObjectiveId, setFocusedObjectiveId] = useState<string | null>(null)

  const loadSession = useCallback(async () => {
    if (!student?.id) return
    setLoading(true)
    try {
      const result = await getLearningSessions(undefined, undefined, undefined)
      if (result.success && result.data) {
        const found = result.data.find((s: LearningSession) => s.id === sessionId)
        if (found) {
          setSession(found)
          setObjectives(found.objectives || [])
          setResources((found.resources || []).filter((r: any) => r.is_current !== false))
          setMission(found.mission || null)
          if ((found.mission as any)?.is_started) setEntered(true)
        }
      }
      const actRes = await getSessionActivities(sessionId)
      if (actRes.success && actRes.data) {
        setActivities((actRes.data as any).activities || [])
        setStandaloneQuestions((actRes.data as any).standalone || [])
      }
    } finally {
      setLoading(false)
    }
  }, [student?.id, sessionId])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const refreshContent = useCallback(async () => {
    try {
      const [objRes, resRes, missionRes, actRes] = await Promise.all([
        getLearningObjectives(sessionId),
        getLearningResources(sessionId),
        getLearningMission(sessionId),
        getSessionActivities(sessionId),
      ])
      if (objRes.success) setObjectives(objRes.data || [])
      if (resRes.success) setResources(resRes.data || [])
      if (missionRes.success && missionRes.data) setMission(missionRes.data)
      if (actRes.success && actRes.data) {
        setActivities((actRes.data as any).activities || [])
        setStandaloneQuestions((actRes.data as any).standalone || [])
      }
    } catch { /* realtime refresh is best-effort */ }
  }, [sessionId])

  const patchSessionStatus = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from('learning_sessions')
        .select('status, student_status')
        .eq('id', sessionId)
        .maybeSingle()
      if (data) {
        setSession((prev) => prev ? { ...prev, ...data } : prev)
        if (data.status === 'CORRECTIONS_REQUIRED') {
          toast('Your teacher requested corrections on this session.', { icon: '📝' })
        }
      }
    } catch { /* best-effort */ }
  }, [sessionId])

  useHomeschoolRealtime('learning_objectives', `session_id=eq.${sessionId}`, refreshContent, !!sessionId)
  useHomeschoolRealtime('learning_resources', `session_id=eq.${sessionId}`, refreshContent, !!sessionId)
  useHomeschoolRealtime('learning_missions', `session_id=eq.${sessionId}`, refreshContent, !!sessionId)
  useHomeschoolRealtime('learning_sessions', `id=eq.${sessionId}`, patchSessionStatus, !!sessionId)

  const handleStartSession = async () => {
    setActionLoading(true)
    try {
      const result = await startSession(sessionId)
      if (result.success) {
        setSession((prev) => prev ? { ...prev, student_status: 'IN_PROGRESS' } : prev)
      } else {
        toast.error((result as any).error || 'Failed to start session')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start session')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteSession = async () => {
    setActionLoading(true)
    try {
      const result = await completeSession(sessionId)
      if (result.success) {
        setSession((prev) => prev ? { ...prev, student_status: 'COMPLETED', status: prev.submission_required ? 'UNDER_REVIEW' : 'COMPLETED' } : prev)
        toast.success('Session completed!')
      } else {
        toast.error((result as any).error || 'Failed to complete session')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete session')
    } finally {
      setActionLoading(false)
    }
  }

  // §46 — Begin enters the mission (starts mission + session together).
  // Guard: startSession only accepts UPCOMING/READY; an already-IN_PROGRESS
  // session just enters the mission without a failing call.
  const handleBegin = async () => {
    setActionLoading(true)
    try {
      const m = await startMission(sessionId)
      if (!m.success) throw new Error((m as any).error)
      setMission((prev) => prev ? { ...prev, is_started: true, started_at: new Date().toISOString() } : prev)
      if (session && ['UPCOMING', 'READY'].includes(session.student_status)) {
        await handleStartSession()
      }
      setEntered(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to begin mission')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReflection = async (data: any) => {
    const result = await submitReflection(sessionId, data)
    if (!result.success) throw new Error(result.error)
  }

  const handleCatchUp = async () => {
    setActionLoading(true)
    try {
      const result = await catchUpSession(sessionId)
      if (!result.success) throw new Error(result.error)
      setSession((prev) => prev ? { ...prev, status: 'IN_PROGRESS', student_status: 'IN_PROGRESS' } : prev)
      toast.success('Session reopened — catch up at your pace!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to reopen session')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />
  if (!session) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="p-12 text-center max-w-md">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>Session Not Found</h2>
          <Button onClick={() => router.back()} className="mt-4 rounded-xl">Go Back</Button>
        </Card>
      </div>
    )
  }

  const modeConfig = MODE_CONFIG[session.learning_mode] || MODE_CONFIG.SELF_STUDY
  const ModeIcon = modeConfig.Icon
  const isTeacherLed = session.learning_mode === 'TEACHER_LED' || session.learning_mode === 'HYBRID'
  const teacher = (session as any).teacher?.full_name as string | undefined
  const completedObjectives = objectives.filter((o) => o.is_completed).length

  // Questions grouped per objective (activity questions carry objective_id/activity id).
  const questionsFor = (objectiveId: string) => {
    const fromActivities = activities.flatMap((a: any) =>
      (a.questions || [])
        .filter((q: any) => (q.objective_id || a.objective_id) === objectiveId)
        .map((q: any) => ({ ...q, activity_id: a.id }))
    )
    const standalone = standaloneQuestions.filter((q: any) => q.objective_id === objectiveId)
    return [...fromActivities, ...standalone]
  }
  const unassignedQuestions = standaloneQuestions.filter((q: any) => !q.objective_id)

  const focusedObjective = focusedObjectiveId ? objectives.find((o) => o.id === focusedObjectiveId) || null : null
  const showIntro = !entered && !(mission as any)?.is_started && session.student_status !== 'COMPLETED'

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => focusedObjective ? setFocusedObjectiveId(null) : router.back()} className="p-2 rounded-xl hover:bg-[var(--input)] transition-colors min-w-[44px] min-h-[44px]" aria-label="Back">
            <ArrowLeft size={20} style={{ color: 'var(--text)' }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>
              {session.topic || session.subject?.name || 'Learning Session'}
            </h1>
            <p className="text-[10px] font-bold opacity-50">
              {formatTimeRange(session.start_time, session.end_time)} • {session.subject?.name}
            </p>
          </div>
          {completedObjectives > 0 && objectives.length > 0 && (
            <span className="text-[10px] font-black shrink-0" style={{ color: '#10B981' }}>
              {completedObjectives}/{objectives.length} ✓
            </span>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* §112 — Missed session keeps progress */}
        {session.status === 'MISSED' && session.student_status !== 'COMPLETED' ? (
          <Card className="p-8 text-center">
            <Clock size={32} className="mx-auto mb-3" style={{ color: '#EF4444' }} />
            <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>You missed this session.</h2>
            <p className="text-sm font-medium opacity-60 mt-1">Your progress is still here.</p>
            <Button onClick={handleCatchUp} isLoading={actionLoading} className="mt-5 rounded-xl h-12 px-8 font-black">
              <PlayCircle size={18} /> Resume Mission
            </Button>
          </Card>
        ) : showIntro ? (
          /* §46 — TODAY'S MISSION intro. Never a quiz first. */
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: modeConfig.bg }}>
                  <ModeIcon size={24} style={{ color: modeConfig.color }} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-50">Today&apos;s mission</p>
                  <p className="text-xs font-black uppercase tracking-wider" style={{ color: modeConfig.color }}>
                    {session.subject?.name} · {modeConfig.label}
                  </p>
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
                {session.topic || session.subject?.name}
              </h2>
              {session.learning_goal && (
                <>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-50 mt-5 mb-1.5">Your goal</p>
                  <p className="text-base font-semibold leading-relaxed" style={{ color: 'var(--text)' }}>
                    {session.learning_goal}
                  </p>
                </>
              )}
              {((mission as any)?.description || session.instructions) && (
                <>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-50 mt-5 mb-1.5">Why it matters</p>
                  <p className="text-sm font-medium leading-relaxed opacity-70">
                    {(mission as any)?.description || session.instructions}
                  </p>
                </>
              )}
              {teacher && (
                <p className="text-xs font-semibold opacity-50 mt-5">
                  Prepared by your {session.subject?.name} teacher, {teacher}.
                  {session.learning_goal ? ` “Today I want you to be able to ${session.learning_goal.charAt(0).toLowerCase() + session.learning_goal.slice(1)}”` : ''}
                </p>
              )}
              {isTeacherLed && (
                <div className="mt-4 flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(79,140,255,0.08)' }}>
                  <Users size={15} style={{ color: '#4F8CFF' }} />
                  <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                    Teacher-led session — your teacher is guiding this mission.
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-50 mb-4">Your mission</p>
              <ol className="space-y-3">
                {[
                  { n: '01', t: 'Understand', d: 'Learn the idea with your teacher’s resources.' },
                  { n: '02', t: 'Practice', d: 'Try examples and get feedback on mistakes.' },
                  { n: '03', t: 'Show what you know', d: 'Demonstrate the skill in your workspace.' },
                  { n: '04', t: 'Master', d: 'Prove it independently — then keep it fresh.' },
                ].map((s) => (
                  <li key={s.n} className="flex items-start gap-3">
                    <span className="text-xs font-black rounded-lg px-2 py-1 shrink-0" style={{ background: 'var(--input)', color: 'var(--primary)' }}>
                      {s.n}
                    </span>
                    <span>
                      <span className="block text-sm font-bold" style={{ color: 'var(--text)' }}>{s.t}</span>
                      <span className="block text-xs font-medium opacity-50">{s.d}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <Button onClick={handleBegin} isLoading={actionLoading} className="w-full mt-6 rounded-xl h-12 font-black">
                <PlayCircle size={18} /> Begin
              </Button>
            </Card>
          </motion.div>
        ) : focusedObjective ? (
          /* §48–49 — Objective focus */
          <ObjectiveFocus
            index={objectives.findIndex((o) => o.id === focusedObjective.id)}
            objective={focusedObjective}
            resources={resources}
            questions={questionsFor(focusedObjective.id)}
            submissionRequired={session.submission_required}
            sessionId={sessionId}
            studentId={student?.id || ''}
            onBack={() => setFocusedObjectiveId(null)}
          >
            <section>
              <h3 className="flex items-center gap-2 text-sm font-black mb-3" style={{ color: 'var(--text)' }}>
                <Send size={15} style={{ color: '#A855F7' }} /> Demonstrate
              </h3>
              <SessionSubmissionPanel
                sessionId={sessionId}
                submissionRequired={session.submission_required}
                onSubmitted={loadSession}
              />
            </section>
          </ObjectiveFocus>
        ) : (
          /* §47 — Mission map + staged sections */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {isEndedUnfinished(session as any) && (
              <div className="flex items-start gap-2.5 p-4 rounded-2xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.35)' }}>
                <Clock size={16} style={{ color: '#F59E0B' }} className="shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--text)' }}>
                  This session&apos;s time has passed ({formatTimeRange(session.start_time, session.end_time)}).
                  Your progress is still here — continue where you left off.
                </p>
              </div>
            )}
            {isHappeningNow(session as any) && (
              <div className="flex items-start gap-2.5 p-4 rounded-2xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.35)' }}>
                <PlayCircle size={16} style={{ color: '#10B981' }} className="shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--text)' }}>
                  Happening now ({formatTimeRange(session.start_time, session.end_time)}) — work through your mission below.
                </p>
              </div>
            )}
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: modeConfig.bg }}>
                  <ModeIcon size={20} style={{ color: modeConfig.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: modeConfig.color }}>
                    {session.subject?.name} · {modeConfig.label}
                  </p>
                  <h2 className="text-lg font-black truncate" style={{ color: 'var(--text)' }}>
                    {session.topic || session.subject?.name}
                  </h2>
                </div>
              </div>
              {session.learning_goal && (
                <p className="text-sm font-medium opacity-60 mt-2">{session.learning_goal}</p>
              )}
              {teacher && (
                <p className="text-[11px] font-semibold opacity-50 mt-2">
                  Prepared by your {session.subject?.name} teacher, {teacher}.
                </p>
              )}
            </Card>

            {student?.id && (
              <Card className="p-5">
                <MissionMap sessionId={sessionId} studentId={student.id} />
                {objectives.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {objectives.map((o, i) => (
                      <button
                        key={o.id}
                        onClick={() => setFocusedObjectiveId(o.id)}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all hover:shadow-sm min-h-[60px]"
                        style={{ borderColor: 'var(--card-border)', background: o.is_completed ? 'rgba(16,185,129,0.05)' : 'var(--card)' }}
                      >
                        <span className="text-xs font-black rounded-lg px-2 py-1 shrink-0" style={{ background: 'var(--input)', color: o.is_completed ? '#10B981' : 'var(--text-muted)' }}>
                          {o.is_completed ? '✓' : String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{o.title}</span>
                          <span className="block text-[11px] font-semibold opacity-50">
                            {o.is_completed ? 'Mastered — tap to review' : 'Tap to start this objective'}
                          </span>
                        </span>
                        {i > 0 && !objectives[i - 1].is_completed && !o.is_completed ? (
                          <Lock size={14} className="opacity-30 shrink-0" />
                        ) : (
                          <ChevronDown size={15} className="opacity-30 shrink-0" style={{ transform: 'rotate(-90deg)' }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {unassignedQuestions.length > 0 && student?.id && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Target size={16} style={{ color: '#4F8CFF' }} />
                  <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>Practice</h3>
                </div>
                {unassignedQuestions.map((q: any) => (
                  <PracticeQuestion
                    key={q.id}
                    question={q}
                    sessionId={sessionId}
                    objectiveId={q.objective_id}
                    studentId={student.id}
                  />
                ))}
              </Card>
            )}

            <SessionSubmissionPanel
              sessionId={sessionId}
              submissionRequired={session.submission_required}
              onSubmitted={loadSession}
            />

            <ReflectionSection
              sessionId={sessionId}
              existingReflection={session.reflection}
              onSubmit={handleReflection}
            />

            <PeakCoachHomeschool
              sessionId={sessionId}
              enrollmentId={(session as any).enrollment?.id || (session as any).enrollment_id || ''}
              subjectId={session.subject_id || session.subject?.id || ''}
              subjectName={session.subject?.name || 'this subject'}
              topic={session.topic || undefined}
              objectives={objectives}
              resources={resources}
              instructions={session.instructions || undefined}
              aiInstructions={session.ai_instructions || undefined}
              aiAssistanceEnabled={session.ai_assistance_enabled !== false}
            />
          </motion.div>
        )}

        {/* Bottom action bar */}
        {!showIntro && session.status !== 'MISSED' && (
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t p-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
            <div className="max-w-4xl mx-auto flex gap-3">
              {session.student_status === 'UPCOMING' || (session.student_status as string) === 'READY' ? (
                <Button onClick={handleStartSession} isLoading={actionLoading} className="flex-1 rounded-xl h-12 font-black">
                  <PlayCircle size={18} /> Start Learning
                </Button>
              ) : session.student_status === 'IN_PROGRESS' ? (
                <Button onClick={handleCompleteSession} isLoading={actionLoading} variant="success" className="flex-1 rounded-xl h-12 font-black">
                  <CheckCircle2 size={18} /> Complete Session
                </Button>
              ) : session.student_status === 'COMPLETED' ? (
                <div className="flex-1 text-center py-3">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: '#10B981' }}>
                    <CheckCircle2 size={16} /> Session Completed
                  </span>
                </div>
              ) : (
                <div className="flex-1 text-center py-3">
                  <span className="text-sm font-bold opacity-50">{session.student_status?.replace('_', ' ')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
