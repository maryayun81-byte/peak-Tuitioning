'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ChevronLeft, Clock, Users, BookOpen, FileText,
  CheckCircle2, AlertTriangle, PenLine, Move, XCircle
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useTeacherIdentity } from '@/hooks/useTeacherIdentity'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import SessionContentBuilder from '@/components/homeschooling/SessionContentBuilder'
import TeacherMissionBuilder from '@/components/homeschooling/TeacherMissionBuilder'
import AiMarkingReview from '@/components/homeschooling/AiMarkingReview'
import PreparationBadge from '@/components/homeschooling/LearningBits'
import { RescheduleSessionModal, CancelSessionModal } from '@/components/homeschooling/SessionLifecycleModals'
import { requestSessionCorrections, acceptSessionWork } from '@/app/actions/homeschooling'
import { getLinkedAssignmentSubmissions } from '@/app/actions/homeschooling'
import { getSessionPreparation, publishMission, getLearningSignals } from '@/app/actions/homeschool-learning'
import { formatTimeRange, getSessionModeLabel } from '@/lib/homeschooling/constants'
import toast from 'react-hot-toast'

const MODE_COLORS: Record<string, string> = {
  TEACHER_LED: '#4F8CFF',
  SELF_STUDY: '#10B981',
  AI_SUPPORTED: '#A855F7',
  HYBRID: '#F59E0B',
}

export default function TeacherSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const supabase = getSupabaseBrowserClient()
  const { hasTeacherIdentity } = useTeacherIdentity()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [review, setReview] = useState<{ assignment: any; submissions: any[] } | null>(null)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reviewBusy, setReviewBusy] = useState<string | null>(null)
  const [prep, setPrep] = useState<any>(null)
  const [signals, setSignals] = useState<any[]>([])
  const [showBuilder, setShowBuilder] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [markingFor, setMarkingFor] = useState<string | null>(null)

  const handleRequestCorrections = async (submissionId: string) => {
    setReviewBusy(submissionId)
    try {
      const res = await requestSessionCorrections(sessionId, submissionId)
      if (!res.success) throw new Error(res.error)
      toast.success('Corrections requested — student notified')
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to request corrections')
    } finally {
      setReviewBusy(null)
    }
  }

  const handleAcceptWork = async (submissionId: string) => {
    setReviewBusy(submissionId)
    try {
      const res = await acceptSessionWork(sessionId, submissionId)
      if (!res.success) throw new Error(res.error)
      toast.success('Work accepted — session completed')
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept work')
    } finally {
      setReviewBusy(null)
    }
  }

  useEffect(() => {
    if (hasTeacherIdentity) load()
  }, [hasTeacherIdentity, sessionId])

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('learning_sessions')
        .select(`
          id, day, start_time, end_time, learning_mode, topic, learning_goal,
          instructions, submission_required, status, student_status, cancelled_reason,
          subject:subjects(id, name),
          teacher:teachers(id, full_name),
          enrollment:homeschool_enrollments(id, student:students(id, full_name))
        `)
        .eq('id', sessionId)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        toast.error("You don't have permission to access this session.")
        return
      }
      setSession(data)

      const res = await getLinkedAssignmentSubmissions(sessionId)
      if (res.success) setReview(res.data as any)

      const prepRes = await getSessionPreparation(sessionId)
      if (prepRes.success) setPrep(prepRes.data)

      const enrollmentId = (data as any)?.enrollment?.id
      if (enrollmentId) {
        const sigRes = await getLearningSignals(enrollmentId)
        if (sigRes.success) {
          setSignals(
            (sigRes.data as any[]).filter(
              (s) => s.session_id === sessionId || !s.session_id
            ).slice(0, 5)
          )
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load session')
    } finally {
      setLoading(false)
    }
  }

  if (!hasTeacherIdentity) {
    return (
      <div className="p-6 min-h-[80vh] flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>You need a teacher profile to access this page.</p>
        </Card>
      </div>
    )
  }

  if (loading) return <div className="p-4 md:p-6"><SkeletonDashboard /></div>

  if (!session) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Session not found or not assigned to you.</p>
          <Link href="/teacher/homeschooling/timetable">
            <Button variant="ghost" className="mt-4"><ChevronLeft size={14} /> Back to Timetable</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const modeColor = MODE_COLORS[session.learning_mode] || '#6B7280'
  const student = (session.enrollment as any)?.student
  const pending = (review?.submissions || []).filter((s: any) => s.status === 'submitted')

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/teacher/homeschooling/timetable">
          <Button variant="ghost" size="icon" className="rounded-xl"><ChevronLeft size={18} /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
              {session.topic || session.subject?.name}
            </h1>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: `${modeColor}18`, color: modeColor, border: `1px solid ${modeColor}40` }}
            >
              {getSessionModeLabel(session.learning_mode)}
            </span>
          </div>
          <p className="text-xs font-bold opacity-50 mt-0.5">
            {session.day} · {formatTimeRange(session.start_time, session.end_time)} · {session.subject?.name}
          </p>
          {session.status === 'CANCELLED' ? (
            <p className="text-[11px] font-bold mt-1" style={{ color: '#EF4444' }}>
              Cancelled{session.cancelled_reason ? ` — ${session.cancelled_reason}` : ''}
            </p>
          ) : (
            <div className="flex gap-2 mt-2">
              <Button variant="secondary" size="sm" onClick={() => setRescheduleOpen(true)}>
                <Move size={13} /> Move
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>
                <XCircle size={13} /> Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0" style={{ background: 'linear-gradient(135deg, #4F8CFF, #A855F7)' }}>
            {(student?.full_name || '?')[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>{student?.full_name || 'Student'}</p>
            <p className="text-[11px] font-semibold opacity-50 flex items-center gap-1">
              <Clock size={11} /> Session status: {session.student_status?.replace(/_/g, ' ') || session.status}
            </p>
          </div>
          {student?.id && (
            <Link href={`/teacher/homeschooling/student/${student.id}`}>
              <Button variant="secondary" size="sm"><Users size={13} /> Progress</Button>
            </Link>
          )}
        </Card>
      </motion.div>

      {session.learning_goal && (
        <Card className="p-4">
          <h3 className="text-xs font-black uppercase tracking-wider mb-1.5 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <BookOpen size={13} /> Learning Goal
          </h3>
          <p className="text-sm" style={{ color: 'var(--text)' }}>{session.learning_goal}</p>
        </Card>
      )}

      <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Prepare This Session
          </h3>
          <span className="flex items-center gap-2">
            {prep && <PreparationBadge state={prep.state} />}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowBuilder((v) => !v)}
            >
              {showBuilder ? 'Hide builder' : '+ Mission builder'}
            </Button>
            {prep && prep.state !== 'PUBLISHED' && (
              <Button
                size="sm"
                isLoading={publishing}
                onClick={async () => {
                  setPublishing(true)
                  const res = await publishMission(sessionId)
                  setPublishing(false)
                  if (!res.success) {
                    toast.error(res.error || 'Cannot publish yet')
                  } else {
                    toast.success('Mission published — student can access it')
                  }
                  load()
                }}
              >
                Publish
              </Button>
            )}
          </span>
        </div>
        {showBuilder && (
          <div className="mb-4">
            <TeacherMissionBuilder sessionId={sessionId} onPublished={load} />
          </div>
        )}
        <SessionContentBuilder sessionId={sessionId} onChanged={load} />
      </Card>

      {signals.length > 0 && (
        <Card className="p-4 md:p-5">
          <h3 className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <AlertTriangle size={13} /> Learning signals
          </h3>
          <div className="space-y-2">
            {signals.map((s: any) => (
              <div
                key={s.id}
                className="rounded-xl border p-3"
                style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.3)' }}
              >
                <p className="text-xs font-black" style={{ color: 'var(--text)' }}>{s.title}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <FileText size={13} /> Submissions {pending.length > 0 && `(${pending.length} to review)`}
          </h3>
          {review?.assignment && (
            <Link href={`/teacher/marking?assignment_id=${review.assignment.id}`}>
              <Button variant="secondary" size="sm"><PenLine size={13} /> Open Marking</Button>
            </Link>
          )}
        </div>

        {!review?.assignment ? (
          <p className="text-xs font-medium opacity-50">Link an assignment above to collect and review student work.</p>
        ) : (review.submissions || []).length === 0 ? (
          <p className="text-xs font-medium opacity-50">No submissions yet.</p>
        ) : (
          <div className="space-y-2">
            {(review.submissions || []).map((s: any) => (
              <div key={s.id} className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
                {s.status === 'submitted'
                  ? <AlertTriangle size={15} style={{ color: '#F59E0B' }} className="shrink-0" />
                  : <CheckCircle2 size={15} style={{ color: '#10B981' }} className="shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>
                    {s.student?.full_name || 'Student'}
                  </p>
                  <p className="text-[10px] opacity-50">
                    {s.status}{s.marks != null ? ` · ${s.marks} marks` : ''}
                    {s.submitted_at ? ` · ${new Date(s.submitted_at).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setMarkingFor((m) => (m === s.id ? null : s.id))}
                  >
                    ✨ AI Mark
                  </Button>
                  <Link href={`/teacher/marking/${s.id}`}>
                    <Button variant="ghost" size="sm">Review</Button>
                  </Link>
                  <Button
                    variant="secondary" size="sm"
                    disabled={reviewBusy === s.id}
                    onClick={() => handleRequestCorrections(s.id)}
                  >
                    Corrections
                  </Button>
                  <Button
                    variant="success" size="sm"
                    disabled={reviewBusy === s.id}
                    onClick={() => handleAcceptWork(s.id)}
                  >
                    <CheckCircle2 size={13} /> Accept
                  </Button>
                </div>
              </div>
              {markingFor === s.id && (
                <AiMarkingReview
                  submissionId={s.id}
                  maxMarks={review?.assignment?.max_marks}
                  onChanged={load}
                />
              )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <RescheduleSessionModal
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        sessionId={sessionId}
        currentDay={session.day}
        currentStart={session.start_time}
        currentEnd={session.end_time}
        onRescheduled={load}
      />

      <CancelSessionModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        sessionId={sessionId}
        onCancelled={load}
      />
    </div>
  )
}
