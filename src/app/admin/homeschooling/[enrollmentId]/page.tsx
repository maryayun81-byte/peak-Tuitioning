'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Calendar, BookOpen, Users, Settings2, ListChecks,
  Clock, CheckCircle2, AlertTriangle, Pause, Play, XCircle, Plus,
  GraduationCap, FileText, Eye, Edit3, Trash2, ChevronRight
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, StatCard, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import SessionContentBuilder from '@/components/homeschooling/SessionContentBuilder'
import HomeschoolAdminNav from '@/components/admin/HomeschoolAdminNav'
import { PublishWarningsModal, usePublishWeek } from '@/components/homeschooling/SessionLifecycleModals'
import {
  getHomeschoolWeeks, createHomeschoolWeek,
  updateLearningSession, createLearningSession, getLearningSessions,
  updateHomeschoolEnrollment, pauseHomeschoolEnrollment, resumeHomeschoolEnrollment,
  cancelHomeschoolEnrollment, getHomeschoolProgress, getSubjectProgress
} from '@/app/actions/homeschooling'
import toast from 'react-hot-toast'
import type {
  HomeschoolEnrollment, HomeschoolWeek, LearningSession, SubjectProgress
} from '@/types/homeschooling'

const TABS = [
  { key: 'overview', label: 'Overview', icon: Eye },
  { key: 'weeks', label: 'Weeks', icon: Calendar },
  { key: 'sessions', label: 'Sessions', icon: ListChecks },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
  { key: 'settings', label: 'Settings', icon: Settings2 },
]

const STATUS_STYLES: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'muted' }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  PENDING: { label: 'Pending', variant: 'warning' },
  PAUSED: { label: 'Paused', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'info' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
  EXPIRED: { label: 'Expired', variant: 'muted' },
}

const WEEK_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'muted' }> = {
  DRAFT: { label: 'Draft', variant: 'muted' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'info' },
  upcoming: { label: 'Upcoming', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'success' },
  completed: { label: 'Completed', variant: 'info' },
}

const SESSION_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'muted' }> = {
  UPCOMING: { label: 'Upcoming', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'success' },
  COMPLETED: { label: 'Completed', variant: 'info' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
  MISSED: { label: 'Missed', variant: 'danger' },
  UNDER_REVIEW: { label: 'Under Review', variant: 'info' },
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function EnrollmentDetailPage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const resolvedParams = use(params)
  const enrollmentId = resolvedParams.enrollmentId
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [enrollment, setEnrollment] = useState<HomeschoolEnrollment | null>(null)
  const [weeks, setWeeks] = useState<HomeschoolWeek[]>([])
  const [sessions, setSessions] = useState<LearningSession[]>([])
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([])
  const [progress, setProgress] = useState<any>(null)
  const [teachers, setTeachers] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])

  const [weekModalOpen, setWeekModalOpen] = useState(false)
  const [weekForm, setWeekForm] = useState({ week_number: 1, title: '', start_date: '', end_date: '' })
  const [weekSaving, setWeekSaving] = useState(false)

  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<LearningSession | null>(null)
  const [sessionForm, setSessionForm] = useState({
    subject_id: '', teacher_id: '', day: 'Monday', start_time: '09:00', end_time: '10:00',
    learning_mode: 'teacher_led', topic: '', learning_goal: '', instructions: '',
    submission_required: false, ai_assistance_enabled: false, ai_instructions: '',
    week_id: '',
  })
  const [sessionSaving, setSessionSaving] = useState(false)
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)

  const [settingsForm, setSettingsForm] = useState({
    grade_level: '', notes: '', end_date: '',
  })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  useEffect(() => { load() }, [enrollmentId])

  const load = async () => {
    setLoading(true)
    try {
      const [weeksRes, sessionsRes, progressRes, subjectRes, teachersRes, subjectsRes] = await Promise.all([
        getHomeschoolWeeks(enrollmentId),
        getLearningSessions(undefined, enrollmentId),
        getHomeschoolProgress(enrollmentId),
        getSubjectProgress(enrollmentId),
        supabase.from('teachers').select('id, full_name').order('full_name'),
        supabase.from('subjects').select('*').order('name'),
      ])

      if (weeksRes.success) setWeeks(weeksRes.data || [])
      if (sessionsRes.success) setSessions(sessionsRes.data || [])
      if (progressRes.success && progressRes.data) {
        setProgress(progressRes.data)
        setEnrollment(progressRes.data.enrollment ?? null)
        setSettingsForm({
          grade_level: progressRes.data.enrollment?.grade_level || '',
          notes: (progressRes.data.enrollment as any)?.notes || '',
          end_date: progressRes.data.enrollment?.end_date || '',
        })
      }
      if (subjectRes.success) setSubjectProgress(subjectRes.data || [])
      setTeachers(teachersRes.data || [])
      setSubjects(subjectsRes.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load enrollment data')
    } finally {
      setLoading(false)
    }
  }

  const publishWeek = usePublishWeek(load)

  const handleCreateWeek = async () => {    if (!weekForm.title || !weekForm.start_date || !weekForm.end_date) {
      toast.error('Please fill all required fields')
      return
    }
    setWeekSaving(true)
    try {
      const res = await createHomeschoolWeek(enrollmentId, weekForm)
      if (!res.success) throw new Error(res.error)
      toast.success('Week created')
      setWeekModalOpen(false)
      setWeekForm({ week_number: weeks.length + 1, title: '', start_date: '', end_date: '' })
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create week')
    } finally {
      setWeekSaving(false)
    }
  }

  const handlePublishWeek = async (weekId: string) => {
    publishWeek.publish(weekId)
  }

  const openSessionModal = (session?: LearningSession, weekId?: string) => {
    if (session) {
      setEditingSession(session)
      setSessionForm({
        subject_id: session.subject_id || '',
        teacher_id: session.teacher_id || '',
        day: session.day || 'Monday',
        start_time: session.start_time || '09:00',
        end_time: session.end_time || '10:00',
        learning_mode: session.learning_mode || 'teacher_led',
        topic: session.topic || '',
        learning_goal: session.learning_goal || '',
        instructions: session.instructions || '',
        submission_required: session.submission_required || false,
        ai_assistance_enabled: session.ai_assistance_enabled || false,
        ai_instructions: session.ai_instructions || '',
        week_id: session.week_id || '',
      })
    } else {
      setEditingSession(null)
      setSessionForm({
        subject_id: '', teacher_id: '', day: 'Monday', start_time: '09:00', end_time: '10:00',
        learning_mode: 'teacher_led', topic: '', learning_goal: '', instructions: '',
        submission_required: false, ai_assistance_enabled: false, ai_instructions: '',
        week_id: weekId || (weeks[0]?.id || ''),
      })
    }
    setSessionModalOpen(true)
  }

  const handleSaveSession = async () => {
    if (!sessionForm.subject_id || !sessionForm.day || !sessionForm.start_time || !sessionForm.end_time) {
      toast.error('Please fill all required fields')
      return
    }
    const weekId = sessionForm.week_id || weeks[0]?.id
    if (!weekId) {
      toast.error('Create a week first')
      return
    }
    setSessionSaving(true)
    try {
      if (editingSession) {
        const res = await updateLearningSession(editingSession.id, {
          subject_id: sessionForm.subject_id,
          teacher_id: sessionForm.teacher_id || undefined,
          day: sessionForm.day,
          start_time: sessionForm.start_time,
          end_time: sessionForm.end_time,
          learning_mode: sessionForm.learning_mode,
          topic: sessionForm.topic,
          learning_goal: sessionForm.learning_goal,
          instructions: sessionForm.instructions,
          submission_required: sessionForm.submission_required,
          ai_assistance_enabled: sessionForm.ai_assistance_enabled,
          ai_instructions: sessionForm.ai_instructions,
        })
        if (!res.success) throw new Error(res.error)
        toast.success('Session updated')
      } else {
        const res = await createLearningSession({
          week_id: weekId,
          subject_id: sessionForm.subject_id,
          teacher_id: sessionForm.teacher_id || undefined,
          day: sessionForm.day,
          start_time: sessionForm.start_time,
          end_time: sessionForm.end_time,
          learning_mode: sessionForm.learning_mode,
          topic: sessionForm.topic,
          learning_goal: sessionForm.learning_goal,
          instructions: sessionForm.instructions,
          submission_required: sessionForm.submission_required,
          ai_assistance_enabled: sessionForm.ai_assistance_enabled,
          ai_instructions: sessionForm.ai_instructions,
        })
        if (!res.success) throw new Error(res.error)
        toast.success('Session created')
      }
      setSessionModalOpen(false)
      setEditingSession(null)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save session')
    } finally {
      setSessionSaving(false)
    }
  }

  const handleDeleteSession = async () => {
    if (!deleteSessionId) return
    try {
      const { error } = await supabase.from('learning_sessions').delete().eq('id', deleteSessionId)
      if (error) throw error
      toast.success('Session deleted')
      setDeleteSessionId(null)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete session')
    }
  }

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    try {
      const res = await updateHomeschoolEnrollment(enrollmentId, {
        grade_level: settingsForm.grade_level,
        notes: settingsForm.notes,
        end_date: settingsForm.end_date || undefined,
      })
      if (!res.success) throw new Error(res.error)
      toast.success('Settings saved')
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSettingsSaving(false)
    }
  }

  const handlePause = async () => {
    try {
      const res = await pauseHomeschoolEnrollment(enrollmentId)
      if (!res.success) throw new Error(res.error)
      toast.success('Enrollment paused')
      setPauseOpen(false)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to pause')
    }
  }

  const handleResume = async () => {
    try {
      const res = await resumeHomeschoolEnrollment(enrollmentId)
      if (!res.success) throw new Error(res.error)
      toast.success('Enrollment resumed')
      setResumeOpen(false)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to resume')
    }
  }

  const handleCancel = async () => {
    try {
      const res = await cancelHomeschoolEnrollment(enrollmentId)
      if (!res.success) throw new Error(res.error)
      toast.success('Enrollment cancelled')
      setCancelOpen(false)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel')
    }
  }

  const groupedSessions = DAY_NAMES.reduce((acc, day) => {
    acc[day] = sessions.filter(s => s.day === day)
    return acc
  }, {} as Record<string, LearningSession[]>)

  const enrollmentSubjects = (enrollment as any)?.subjects || []

  if (loading) return <SkeletonDashboard />
  if (!enrollment) return (
    <div className="p-6">
      <Card className="p-12 text-center">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Enrollment not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
          <ChevronLeft size={14} /> Go Back
        </Button>
      </Card>
    </div>
  )

  const status = STATUS_STYLES[enrollment.status?.toUpperCase()] || STATUS_STYLES.PENDING
  const studentName = (enrollment.student as any)?.full_name || 'Unknown'
  const summary = progress?.summary || {}
  const progressPct = progress?.progress?.overallProgress || 0

  return (
    <div className="p-6 space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/homeschooling')}>
          <ChevronLeft size={16} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/15 shrink-0">
              {studentName[0]}
            </div>
            <div>
              <h1 className="text-xl font-black" style={{ color: 'var(--text)' }}>{studentName}</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {(enrollment.student as any)?.admission_number || '—'} · Grade {enrollment.grade_level} · {enrollment.academic_year}
              </p>
            </div>
            <Badge variant={status.variant} className="ml-2">{status.label}</Badge>
          </div>
        </div>
        <Link href={`/admin/homeschooling/${enrollmentId}/timetable`} className="shrink-0">
          <Button size="sm"><Calendar size={14} /> Timetable Builder</Button>
        </Link>
      </div>

      <HomeschoolAdminNav enrollmentId={enrollmentId} studentName={studentName} />

      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--input)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
              style={{
                background: isActive ? 'var(--card)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Total Sessions"
                  value={summary.totalSessions || 0}
                  icon={<ListChecks size={18} />}
                  gradient="linear-gradient(135deg, rgba(79,140,255,0.08), rgba(79,140,255,0.02))"
                />
                <StatCard
                  title="Completed"
                  value={summary.completedSessions || 0}
                  icon={<CheckCircle2 size={18} />}
                  gradient="linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))"
                />
                <StatCard
                  title="In Progress"
                  value={summary.inProgressSessions || 0}
                  icon={<Clock size={18} />}
                  gradient="linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))"
                />
                <StatCard
                  title="Overall Progress"
                  value={`${progressPct}%`}
                  icon={<GraduationCap size={18} />}
                  gradient="linear-gradient(135deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))"
                />
              </div>

              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Subject Progress
                </h3>
                {subjectProgress.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No subject data yet</p>
                ) : (
                  <div className="space-y-3">
                    {subjectProgress.map(sp => (
                      <div key={sp.subject_id} className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{sp.subject_name}</span>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {sp.completed_sessions}/{sp.total_sessions} sessions
                            </span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--input)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${sp.progress_percent}%`, background: 'var(--primary)' }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-bold shrink-0" style={{ color: 'var(--primary)' }}>
                          {sp.progress_percent}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Enrolled Subjects
                </h3>
                <div className="space-y-2">
                  {enrollmentSubjects.map((sub: any) => {
                    const teacherNames = (sub.teacher_assignments || [])
                      .map((ta: any) => ta.teacher?.full_name)
                      .filter(Boolean)
                      .join(', ')
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} style={{ color: 'var(--primary)' }} />
                          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                            {sub.subject?.name || 'Subject'}
                          </span>
                        </div>
                        {teacherNames && (
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                            {teacherNames}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'weeks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Weeks ({weeks.length})
                </h3>
                <Button size="sm" onClick={() => {
                  setWeekForm({ week_number: weeks.length + 1, title: '', start_date: '', end_date: '' })
                  setWeekModalOpen(true)
                }}>
                  <Plus size={14} /> New Week
                </Button>
              </div>

              {weeks.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'var(--input)' }}>
                      <Calendar size={22} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No weeks created yet</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Create a week to start adding sessions</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {weeks.map((week, i) => {
                    const weekStatus = WEEK_STATUS[week.status] || WEEK_STATUS.DRAFT
                    const sessionCount = (week.sessions as any[])?.length || 0
                    return (
                      <motion.div
                        key={week.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <Card className="p-4 hover:shadow-lg hover:shadow-primary/5 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                              style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--primary)' }}>
                              W{week.week_number}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                                  {week.title}
                                </span>
                                <Badge variant={weekStatus.variant}>{weekStatus.label}</Badge>
                              </div>
                              <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                <span>{week.start_date} → {week.end_date}</span>
                                <span>·</span>
                                <span>{sessionCount} session{sessionCount !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {week.status?.toUpperCase() === 'DRAFT' && (
                                <Button variant="success" size="xs" onClick={() => handlePublishWeek(week.id)}>
                                  Publish
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => router.push(`/admin/homeschooling/${enrollmentId}/weeks/${week.id}`)}
                              >
                                <ChevronRight size={14} />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  All Sessions ({sessions.length})
                </h3>
                <Button size="sm" onClick={() => openSessionModal()}>
                  <Plus size={14} /> New Session
                </Button>
              </div>

              {sessions.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'var(--input)' }}>
                      <ListChecks size={22} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No sessions yet</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Create sessions to plan the learning schedule</p>
                  </div>
                </Card>
              ) : (
                DAY_NAMES.map(day => {
                  const daySessions = groupedSessions[day]
                  if (!daySessions?.length) return null
                  return (
                    <div key={day} className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {day} ({daySessions.length})
                      </p>
                      <div className="space-y-2">
                        {daySessions.map(session => {
                          const sessStatus = SESSION_STATUS[session.status?.toUpperCase()] || SESSION_STATUS.UPCOMING
                          return (
                            <Card key={session.id} className="p-4">
                              <div className="flex items-center gap-4">
                                <div className="text-xs font-bold shrink-0" style={{ color: 'var(--text-muted)', minWidth: 90 }}>
                                  {session.start_time} - {session.end_time}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                                      {session.topic || (session.subject as any)?.name || 'Session'}
                                    </span>
                                    <Badge variant={sessStatus.variant}>{sessStatus.label}</Badge>
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                    <span>{(session.subject as any)?.name || '—'}</span>
                                    {session.teacher && <span>· {(session.teacher as any).full_name}</span>}
                                    <span>· {session.learning_mode}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="icon" onClick={() => openSessionModal(session)}>
                                    <Edit3 size={14} />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteSessionId(session.id)}>
                                    <Trash2 size={14} className="text-red-400" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'subjects' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Subjects & Teacher Assignments
              </h3>
              {enrollmentSubjects.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No subjects enrolled</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {enrollmentSubjects.map((sub: any) => {
                    const teacherAssignments = sub.teacher_assignments || []
                    const sp = subjectProgress.find(s => s.subject_id === sub.subject_id)
                    return (
                      <Card key={sub.id} className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ background: 'rgba(79,140,255,0.1)' }}>
                              <BookOpen size={16} style={{ color: 'var(--primary)' }} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                                {sub.subject?.name || 'Subject'}
                              </h4>
                              {sub.subject?.code && (
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub.subject.code}</p>
                              )}
                            </div>
                          </div>
                          {sp && (
                            <div className="text-right">
                              <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{sp.progress_percent}%</p>
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {sp.completed_sessions}/{sp.total_sessions} sessions
                              </p>
                            </div>
                          )}
                        </div>
                        {teacherAssignments.length > 0 && (
                          <div className="space-y-1.5">
                            {teacherAssignments.map((ta: any) => (
                              <div key={ta.id} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                                <Users size={12} />
                                <span className="font-semibold">{ta.teacher?.full_name || '—'}</span>
                                <Badge variant="secondary">{ta.assignment_type}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                        {teacherAssignments.length === 0 && (
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No teacher assigned</p>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Enrollment Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Grade Level"
                    value={settingsForm.grade_level}
                    onChange={e => setSettingsForm(f => ({ ...f, grade_level: e.target.value }))}
                  />
                  <Input
                    label="End Date"
                    type="date"
                    value={settingsForm.end_date}
                    onChange={e => setSettingsForm(f => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
                <Textarea
                  label="Notes"
                  rows={3}
                  value={settingsForm.notes}
                  onChange={e => setSettingsForm(f => ({ ...f, notes: e.target.value }))}
                />
                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} isLoading={settingsSaving}>
                    Save Changes
                  </Button>
                </div>
              </Card>

              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Enrollment Actions
                </h3>
                <div className="flex gap-3">
                  {enrollment.status?.toUpperCase() === 'ACTIVE' && (
                    <>
                      <Button variant="outline" onClick={() => setPauseOpen(true)}>
                        <Pause size={14} /> Pause
                      </Button>
                      <Button variant="danger" onClick={() => setCancelOpen(true)}>
                        <XCircle size={14} /> Cancel
                      </Button>
                    </>
                  )}
                  {enrollment.status?.toUpperCase() === 'PAUSED' && (
                    <>
                      <Button variant="success" onClick={() => setResumeOpen(true)}>
                        <Play size={14} /> Resume
                      </Button>
                      <Button variant="danger" onClick={() => setCancelOpen(true)}>
                        <XCircle size={14} /> Cancel
                      </Button>
                    </>
                  )}
                  {enrollment.status?.toUpperCase() === 'PENDING' && (
                    <Button variant="danger" onClick={() => setCancelOpen(true)}>
                      <XCircle size={14} /> Cancel
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <Modal isOpen={weekModalOpen} onClose={() => setWeekModalOpen(false)} title="Create New Week" size="md">
        <div className="space-y-4">
          <Input
            label="Week Number *"
            type="number"
            value={weekForm.week_number}
            onChange={e => setWeekForm(f => ({ ...f, week_number: parseInt(e.target.value) || 1 }))}
          />
          <Input
            label="Title *"
            placeholder="e.g. Week 1 - Introduction"
            value={weekForm.title}
            onChange={e => setWeekForm(f => ({ ...f, title: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date *"
              type="date"
              value={weekForm.start_date}
              onChange={e => setWeekForm(f => ({ ...f, start_date: e.target.value }))}
            />
            <Input
              label="End Date *"
              type="date"
              value={weekForm.end_date}
              onChange={e => setWeekForm(f => ({ ...f, end_date: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setWeekModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateWeek} isLoading={weekSaving}>Create Week</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={sessionModalOpen} onClose={() => { setSessionModalOpen(false); setEditingSession(null); }}
        title={editingSession ? 'Edit Session' : 'Create Session'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Week *"
              value={sessionForm.week_id}
              onChange={e => setSessionForm(f => ({ ...f, week_id: e.target.value }))}
            >
              <option value="">Select week</option>
              {weeks.map(w => (
                <option key={w.id} value={w.id}>Week {w.week_number} - {w.title}</option>
              ))}
            </Select>
            <Select
              label="Subject *"
              value={sessionForm.subject_id}
              onChange={e => setSessionForm(f => ({ ...f, subject_id: e.target.value }))}
            >
              <option value="">Select subject</option>
              {enrollmentSubjects.map((sub: any) => (
                <option key={sub.subject_id} value={sub.subject_id}>{sub.subject?.name}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Teacher"
              value={sessionForm.teacher_id}
              onChange={e => setSessionForm(f => ({ ...f, teacher_id: e.target.value }))}
            >
              <option value="">No teacher</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </Select>
            <Select
              label="Day *"
              value={sessionForm.day}
              onChange={e => setSessionForm(f => ({ ...f, day: e.target.value }))}
            >
              {DAY_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time *"
              type="time"
              value={sessionForm.start_time}
              onChange={e => setSessionForm(f => ({ ...f, start_time: e.target.value }))}
            />
            <Input
              label="End Time *"
              type="time"
              value={sessionForm.end_time}
              onChange={e => setSessionForm(f => ({ ...f, end_time: e.target.value }))}
            />
          </div>
          <Select
            label="Learning Mode *"
            value={sessionForm.learning_mode}
            onChange={e => setSessionForm(f => ({ ...f, learning_mode: e.target.value }))}
          >
            <option value="teacher_led">Teacher-led</option>
            <option value="self_study">Self-study</option>
            <option value="ai_supported">AI-supported</option>
              <option value="hybrid">Hybrid</option>
          </Select>
          <Input
            label="Topic"
            placeholder="Session topic"
            value={sessionForm.topic}
            onChange={e => setSessionForm(f => ({ ...f, topic: e.target.value }))}
          />
          <Textarea
            label="Learning Goal"
            rows={2}
            value={sessionForm.learning_goal}
            onChange={e => setSessionForm(f => ({ ...f, learning_goal: e.target.value }))}
          />
          <Textarea
            label="Instructions"
            rows={2}
            value={sessionForm.instructions}
            onChange={e => setSessionForm(f => ({ ...f, instructions: e.target.value }))}
          />
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sessionForm.submission_required}
                onChange={e => setSessionForm(f => ({ ...f, submission_required: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Submission Required</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sessionForm.ai_assistance_enabled}
                onChange={e => setSessionForm(f => ({ ...f, ai_assistance_enabled: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Assistance</span>
            </label>
          </div>
          {sessionForm.ai_assistance_enabled && (
            <Textarea
              label="AI Instructions"
              rows={2}
              value={sessionForm.ai_instructions}
              onChange={e => setSessionForm(f => ({ ...f, ai_instructions: e.target.value }))}
            />
          )}
          <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
            <Button variant="ghost" onClick={() => { setSessionModalOpen(false); setEditingSession(null); }}>Cancel</Button>
            <Button onClick={handleSaveSession} isLoading={sessionSaving}>
              {editingSession ? 'Update Session' : 'Create Session'}
            </Button>
          </div>

          {editingSession && (
            <div className="pt-5 mt-1 border-t space-y-4" style={{ borderColor: 'var(--card-border)' }}>
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Session Content
              </h3>
              <SessionContentBuilder sessionId={editingSession.id} onChanged={load} />
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteSessionId}
        onClose={() => setDeleteSessionId(null)}
        onConfirm={handleDeleteSession}
        title="Delete Session"
        message="Are you sure you want to delete this session? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmModal isOpen={pauseOpen} onClose={() => setPauseOpen(false)} onConfirm={handlePause}
        title="Pause Enrollment" message="This will pause all learning sessions for this student."
        confirmLabel="Pause" variant="danger" />
      <ConfirmModal isOpen={resumeOpen} onClose={() => setResumeOpen(false)} onConfirm={handleResume}
        title="Resume Enrollment" message="This will reactivate the student's homeschooling program."
        confirmLabel="Resume" variant="primary" />
      <ConfirmModal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={handleCancel}
        title="Cancel Enrollment" message="This will permanently cancel the enrollment. This cannot be undone."
        confirmLabel="Cancel Enrollment" variant="danger" />

      <PublishWarningsModal
        warnings={publishWeek.warnings}
        onClose={publishWeek.closeWarnings}
        onConfirm={publishWeek.confirmForce}
        saving={publishWeek.saving}
      />
    </div>
  )
}
