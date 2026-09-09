'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, BookOpen, Users, Sparkles, Clock, CheckCircle2, Circle,
  PlayCircle, Send, Target, FileText, ExternalLink,
  Video, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Card'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import {
  getLearningSessions, startSession, completeSession,
  toggleObjective, startMission, completeMission,
  submitReflection, catchUpSession, getLearningObjectives,
  getLearningResources, getLearningMission
} from '@/app/actions/homeschooling'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useHomeschoolRealtime } from '@/hooks/useHomeschoolRealtime'
import { formatTimeRange, getSessionModeLabel } from '@/lib/homeschooling/constants'
import { PeakCoachHomeschool } from '@/components/student/PeakCoachHomeschool'
import SessionSubmissionPanel from '@/components/student/SessionSubmissionPanel'
import toast from 'react-hot-toast'
import type { LearningSession, LearningObjective, LearningResource, LearningMission, LearningReflection } from '@/types/homeschooling'

const MODE_CONFIG: Record<string, { color: string; bg: string; border: string; Icon: typeof Users; label: string }> = {
  TEACHER_LED: { color: '#4F8CFF', bg: 'rgba(79,140,255,0.12)', border: 'rgba(79,140,255,0.3)', Icon: Users, label: 'Teacher-Led' },
  SELF_STUDY: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', Icon: BookOpen, label: 'Self-Study' },
  AI_SUPPORTED: { color: '#A855F7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)', Icon: Sparkles, label: 'AI-Supported' },
}

const CONFIDENCE_OPTIONS = [
  { value: 'need_help', label: 'Need Help', emoji: ' struggle', color: '#EF4444' },
  { value: 'getting_there', label: 'Getting There', emoji: '🤔', color: '#F59E0B' },
  { value: 'comfortable', label: 'Comfortable', emoji: '😊', color: '#10B981' },
  { value: 'very_confident', label: 'Very Confident', emoji: '🔥', color: '#A855F7' },
]

const STATUS_STEPS = ['UPCOMING', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED']
const STATUS_COLORS: Record<string, string> = {
  UPCOMING: '#6B7280',
  IN_PROGRESS: '#4F8CFF',
  SUBMITTED: '#F59E0B',
  COMPLETED: '#10B981',
  READY: '#6366F1',
  MISSED: '#EF4444',
  CORRECTIONS_REQUIRED: '#EF4444',
}

function ObjectiveItem({ objective, onToggle }: { objective: LearningObjective; onToggle: (id: string, val: boolean) => void }) {
  const [toggling, setToggling] = useState(false)

  const handleToggle = async () => {
    setToggling(true)
    try {
      await onToggle(objective.id, !objective.is_completed)
    } finally {
      setToggling(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer"
      style={{ background: objective.is_completed ? 'rgba(16,185,129,0.06)' : 'transparent' }}
      onClick={handleToggle}
    >
      <div className="mt-0.5 shrink-0">
        {objective.is_completed ? (
          <CheckCircle2 size={20} style={{ color: '#10B981' }} />
        ) : (
          <Circle size={20} className="opacity-30" style={{ color: 'var(--text)' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${objective.is_completed ? 'line-through opacity-60' : ''}`} style={{ color: 'var(--text)' }}>
          {objective.title}
        </p>
        {objective.description && (
          <p className="text-xs font-medium opacity-50 mt-0.5">{objective.description}</p>
        )}
      </div>
      {toggling && <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
    </motion.div>
  )
}

function ResourceItem({ resource }: { resource: LearningResource }) {
  const iconMap: Record<string, typeof FileText> = {
    url: ExternalLink,
    file: FileText,
    youtube: Video,
  }
  const Icon = iconMap[resource.type] || FileText

  const handleClick = () => {
    if (resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-[var(--input)] transition-colors"
      style={{ borderColor: 'var(--card-border)' }}
      onClick={handleClick}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(79,140,255,0.1)' }}>
        <Icon size={16} style={{ color: 'var(--primary)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{resource.title}</p>
        {resource.file_name && <p className="text-[10px] font-bold opacity-40">{resource.file_name}</p>}
      </div>
      {resource.is_required && (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
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
        Session Reflection
      </h3>

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
              className={`p-3 rounded-xl text-xs font-bold transition-all border-2 ${
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
  const [actionLoading, setActionLoading] = useState(false)

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
        }
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
      const [objRes, resRes, missionRes] = await Promise.all([
        getLearningObjectives(sessionId),
        getLearningResources(sessionId),
        getLearningMission(sessionId),
      ])
      if (objRes.success) setObjectives(objRes.data || [])
      if (resRes.success) setResources(resRes.data || [])
      if (missionRes.success && missionRes.data) setMission(missionRes.data)
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
        toast.success('Session started!')
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
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete session')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleObjective = async (objectiveId: string, isCompleted: boolean) => {
    try {
      const result = await toggleObjective(objectiveId, isCompleted)
      if (result.success) {
        setObjectives((prev) =>
          prev.map((o) =>
            o.id === objectiveId ? { ...o, is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null } : o
          )
        )
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update objective')
    }
  }

  const handleStartMission = async () => {
    try {
      const result = await startMission(sessionId)
      if (result.success) {
        setMission((prev) => prev ? { ...prev, is_started: true, started_at: new Date().toISOString() } : prev)
        toast.success('Mission started!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start mission')
    }
  }

  const handleCompleteMission = async () => {
    try {
      const result = await completeMission(sessionId)
      if (result.success) {
        setMission((prev) => prev ? { ...prev, is_completed: true, completed_at: new Date().toISOString() } : prev)
        toast.success('Mission completed!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete mission')
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
  const isSelfStudy = session.learning_mode === 'SELF_STUDY' || session.learning_mode === 'AI_SUPPORTED'
  const completedObjectives = objectives.filter((o) => o.is_completed).length
  const totalObjectives = objectives.length
  const currentStep = STATUS_STEPS.indexOf(session.student_status)

  return (
    <div className="min-h-screen pb-32">
      <div className="sticky top-0 z-40 border-b" style={{ background: 'rgba(var(--card-rgb,255,255,255),0.9)', backdropFilter: 'blur(12px)', borderColor: 'var(--card-border)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--input)] transition-colors">
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
          <div
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0"
            style={{ background: `${STATUS_COLORS[session.student_status] || '#6B7280'}15`, color: STATUS_COLORS[session.student_status] || '#6B7280' }}
          >
            {session.student_status?.replace('_', ' ')}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="flex gap-1">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex-1">
                <div
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    background: i <= currentStep ? STATUS_COLORS[step] : 'var(--input)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: modeConfig.bg }}>
                <ModeIcon size={24} style={{ color: modeConfig.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: modeConfig.color }}>
                    {modeConfig.label}
                  </span>
                </div>
                <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>
                  {session.topic || session.subject?.name}
                </h2>
                {session.learning_goal && (
                  <p className="text-sm font-medium opacity-60 mt-1">{session.learning_goal}</p>
                )}
              </div>
            </div>

            {session.teacher?.full_name && (
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--input)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: 'rgba(79,140,255,0.15)', color: 'var(--primary)' }}>
                  {session.teacher.full_name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{session.teacher.full_name}</p>
                  <p className="text-[10px] font-bold opacity-40">Teacher</p>
                </div>
              </div>
            )}

            {session.instructions && (
              <div className="mt-4 p-4 rounded-xl border" style={{ borderColor: 'var(--card-border)', background: 'rgba(79,140,255,0.04)' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1.5 opacity-50">Instructions</p>
                <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text)' }}>{session.instructions}</p>
              </div>
            )}
          </Card>
        </motion.div>

        {isSelfStudy && mission && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <Target size={18} style={{ color: '#A855F7' }} />
                <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>Learning Mission</h3>
              </div>
              {mission.title && (
                <p className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>{mission.title}</p>
              )}
              {mission.description && (
                <p className="text-xs font-medium opacity-60 mb-4">{mission.description}</p>
              )}
              <div className="flex items-center gap-3">
                {!mission.is_started && (
                  <Button onClick={handleStartMission} size="sm" className="rounded-xl">
                    <PlayCircle size={14} /> Start Mission
                  </Button>
                )}
                {mission.is_started && !mission.is_completed && (
                  <Button onClick={handleCompleteMission} variant="success" size="sm" className="rounded-xl">
                    <CheckCircle2 size={14} /> Complete Mission
                  </Button>
                )}
                {mission.is_completed && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                    <CheckCircle2 size={14} /> Mission Completed
                  </span>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {objectives.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} style={{ color: '#10B981' }} />
                  <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>Learning Objectives</h3>
                </div>
                <span className="text-xs font-bold opacity-50">
                  {completedObjectives}/{totalObjectives}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--input)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: totalObjectives > 0 ? `${(completedObjectives / totalObjectives) * 100}%` : '0%' }}
                  className="h-full rounded-full"
                  style={{ background: '#10B981' }}
                />
              </div>
              <div className="space-y-1">
                {objectives.map((obj) => (
                  <ObjectiveItem key={obj.id} objective={obj} onToggle={handleToggleObjective} />
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {resources.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={18} style={{ color: '#4F8CFF' }} />
                <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>Resources</h3>
              </div>
              <div className="space-y-2">
                {resources.map((res) => (
                  <ResourceItem key={res.id} resource={res} />
                ))}
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-5 text-center">
              <BookOpen size={24} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>No additional resources were attached.</p>
              <p className="text-[11px] font-medium opacity-50 mt-1">Continue with the objectives above, or ask Peak Coach for help below.</p>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <SessionSubmissionPanel
            sessionId={sessionId}
            submissionRequired={session.submission_required}
            onSubmitted={loadSession}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <ReflectionSection
            sessionId={sessionId}
            existingReflection={session.reflection}
            onSubmit={handleReflection}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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

        <div className="fixed bottom-0 left-0 right-0 z-50 border-t p-4" style={{ background: 'rgba(var(--card-rgb,255,255,255),0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--card-border)' }}>
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
            ) : session.status === 'MISSED' ? (
              <div className="flex-1 flex flex-col items-center gap-2 py-1">
                <p className="text-xs font-bold" style={{ color: '#EF4444' }}>
                  You missed this learning session.
                </p>
                <Button onClick={handleCatchUp} isLoading={actionLoading} className="w-full rounded-xl h-11 font-black">
                  <PlayCircle size={18} /> Catch Up
                </Button>
              </div>
            ) : (
              <div className="flex-1 text-center py-3">
                <span className="text-sm font-bold opacity-50">{session.student_status?.replace('_', ' ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
