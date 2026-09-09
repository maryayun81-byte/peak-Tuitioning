'use client'

import { useState, useEffect, use, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ChevronLeft, CalendarDays, Plus, Pencil, Trash2, Copy,
  Clock, Users, BookOpen, Sparkles, Megaphone, Move, XCircle, Radar
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import HomeschoolTimetableGrid from '@/components/homeschooling/HomeschoolTimetableGrid'
import { HomeschoolWeekSelector } from '@/components/homeschooling/HomeschoolWeekSelector'
import SessionContentBuilder from '@/components/homeschooling/SessionContentBuilder'
import HomeschoolAdminNav from '@/components/admin/HomeschoolAdminNav'
import { useHomeschoolRealtime } from '@/hooks/useHomeschoolRealtime'
import {
  RescheduleSessionModal, CancelSessionModal, PublishWarningsModal, usePublishWeek,
} from '@/components/homeschooling/SessionLifecycleModals'
import {
  getHomeschoolWeeks, getHomeschoolProgress, createHomeschoolWeek,
  createLearningSession, updateLearningSession,
  deleteLearningSession, duplicateWeekAsTemplate, scanMissedSessions
} from '@/app/actions/homeschooling'
import toast from 'react-hot-toast'
import type { HomeschoolWeek, LearningSession } from '@/types/homeschooling'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + hours * 60
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

export default function AdminTimetablePage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const resolvedParams = use(params)
  const enrollmentId = resolvedParams.enrollmentId
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState('')
  const [weeks, setWeeks] = useState<HomeschoolWeek[]>([])
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)
  const [subjects, setSubjects] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])

  const [weekModalOpen, setWeekModalOpen] = useState(false)
  const [weekForm, setWeekForm] = useState({ title: '', start_date: '', end_date: '' })
  const [weekSaving, setWeekSaving] = useState(false)

  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<LearningSession | null>(null)
  const [sessionForm, setSessionForm] = useState({
    subject_id: '', teacher_id: '', day: 'Monday', start_time: '09:00', end_time: '10:00',
    learning_mode: 'TEACHER_LED', topic: '', learning_goal: '', instructions: '',
    submission_required: false, ai_assistance_enabled: true, ai_instructions: '',
  })
  const [sessionSaving, setSessionSaving] = useState(false)
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [dupModalOpen, setDupModalOpen] = useState(false)
  const [dupForm, setDupForm] = useState({ sourceWeekId: '', newWeekNumber: 1, newStartDate: '', newEndDate: '' })
  const [dupSaving, setDupSaving] = useState(false)

  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [scanning, setScanning] = useState(false)

  useEffect(() => { load() }, [enrollmentId])

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const [progressRes, weeksRes, teachersRes, enrolledSubjectsRes] = await Promise.all([
        getHomeschoolProgress(enrollmentId),
        getHomeschoolWeeks(enrollmentId),
        supabase.from('teachers').select('id, full_name').order('full_name'),
        supabase.from('homeschool_subjects').select('subject:subjects(id, name)').eq('enrollment_id', enrollmentId),
      ])

      if (progressRes.success && progressRes.data?.enrollment) {
        setStudentName(progressRes.data.enrollment.student?.full_name || '')
      }
      if (weeksRes.success) {
        const sorted = [...(weeksRes.data || [])].sort((a: any, b: any) => a.week_number - b.week_number)
        setWeeks(sorted)
        setSelectedWeekIndex(Math.max(0, sorted.length - 1))
      }
      setTeachers(teachersRes.data || [])
      const enrolled = (enrolledSubjectsRes.data || []).map((r: any) => r.subject).filter(Boolean)
      if (enrolled.length > 0) {
        setSubjects(enrolled)
      } else {
        const { data: allSubjects } = await supabase.from('subjects').select('id, name').order('name')
        setSubjects(allSubjects || [])
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load timetable data')
    } finally {
      setLoading(false)
    }
  }

  const currentWeek = weeks[selectedWeekIndex]
  const publishWeek = usePublishWeek(load)
  const quietReload = useCallback(() => load(true), [enrollmentId])
  useHomeschoolRealtime('learning_sessions', `enrollment_id=eq.${enrollmentId}`, quietReload, true)
  const weekSessions: LearningSession[] = useMemo(
    () => (currentWeek?.sessions || []) as LearningSession[],
    [currentWeek]
  )

  const stats = useMemo(() => {
    const teacherLed = weekSessions.filter(s => s.learning_mode === 'TEACHER_LED').length
    const selfStudy = weekSessions.filter(s => s.learning_mode === 'SELF_STUDY').length
    const aiSupported = weekSessions.filter(s => s.learning_mode === 'AI_SUPPORTED').length
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const minutes = weekSessions.reduce((acc, s) => {
      try { return acc + Math.max(0, toMin(s.end_time) - toMin(s.start_time)) } catch { return acc }
    }, 0)
    return { total: weekSessions.length, teacherLed, selfStudy, aiSupported, hours: (minutes / 60).toFixed(1) }
  }, [weekSessions])

  const openNewSession = (day: string, time: string) => {
    if (!currentWeek) {
      toast.error('Create a week first')
      return
    }
    setEditingSession(null)
    setSessionForm({
      subject_id: subjects[0]?.id || '', teacher_id: '', day,
      start_time: time, end_time: addHours(time, 2),
      learning_mode: 'TEACHER_LED', topic: '', learning_goal: '', instructions: '',
      submission_required: false, ai_assistance_enabled: true, ai_instructions: '',
    })
    setSessionModalOpen(true)
  }

  const openEditSession = (session: LearningSession) => {
    setEditingSession(session)
    setSessionForm({
      subject_id: session.subject_id || '',
      teacher_id: session.teacher_id || '',
      day: session.day || 'Monday',
      start_time: session.start_time || '09:00',
      end_time: session.end_time || '10:00',
      learning_mode: session.learning_mode || 'TEACHER_LED',
      topic: session.topic || '',
      learning_goal: session.learning_goal || '',
      instructions: session.instructions || '',
      submission_required: session.submission_required || false,
      ai_assistance_enabled: session.ai_assistance_enabled !== false,
      ai_instructions: session.ai_instructions || '',
    })
    setSessionModalOpen(true)
  }

  const handleSaveSession = async () => {
    if (!sessionForm.subject_id || !sessionForm.day || !sessionForm.start_time || !sessionForm.end_time) {
      toast.error('Subject, day and times are required')
      return
    }
    if (!currentWeek) {
      toast.error('Select a week first')
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
          week_id: currentWeek.id,
          subject_id: sessionForm.subject_id,
          teacher_id: sessionForm.teacher_id || undefined,
          day: sessionForm.day,
          start_time: sessionForm.start_time,
          end_time: sessionForm.end_time,
          learning_mode: sessionForm.learning_mode,
          topic: sessionForm.topic || undefined,
          learning_goal: sessionForm.learning_goal || undefined,
          instructions: sessionForm.instructions || undefined,
          submission_required: sessionForm.submission_required,
          ai_assistance_enabled: sessionForm.ai_assistance_enabled,
          ai_instructions: sessionForm.ai_instructions || undefined,
        })
        if (!res.success) throw new Error(res.error)
        toast.success('Session added to timetable')
      }
      setSessionModalOpen(false)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save session')
    } finally {
      setSessionSaving(false)
    }
  }

  const handleDeleteSession = async () => {
    if (!deleteSessionId) return
    setDeleting(true)
    try {
      const res = await deleteLearningSession(deleteSessionId)
      if (!res.success) throw new Error(res.error)
      toast.success('Session removed')
      setDeleteSessionId(null)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete session')
    } finally {
      setDeleting(false)
    }
  }

  const handleCreateWeek = async () => {
    if (!weekForm.title || !weekForm.start_date || !weekForm.end_date) {
      toast.error('Fill all week fields')
      return
    }
    setWeekSaving(true)
    try {
      const res = await createHomeschoolWeek(enrollmentId, {
        week_number: weeks.length + 1,
        title: weekForm.title,
        start_date: weekForm.start_date,
        end_date: weekForm.end_date,
      })
      if (!res.success) throw new Error(res.error)
      toast.success('Week created')
      setWeekModalOpen(false)
      setWeekForm({ title: '', start_date: '', end_date: '' })
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create week')
    } finally {
      setWeekSaving(false)
    }
  }

  const handlePublishWeek = async () => {
    if (!currentWeek) return
    publishWeek.publish(currentWeek.id)
  }

  const handleScanMissed = async () => {
    setScanning(true)
    try {
      const res = await scanMissedSessions(enrollmentId)
      if (!res.success) throw new Error(res.error)
      const count = (res.data as any)?.missed || 0
      toast.success(count > 0 ? `${count} session${count !== 1 ? 's' : ''} marked as missed` : 'No missed sessions found')
      if (count > 0) load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to scan')
    } finally {
      setScanning(false)
    }
  }

  const handleDuplicate = async () => {
    if (!dupForm.sourceWeekId || !dupForm.newStartDate || !dupForm.newEndDate) {
      toast.error('Select source week and new dates')
      return
    }
    setDupSaving(true)
    try {
      const res = await duplicateWeekAsTemplate(
        dupForm.sourceWeekId, enrollmentId, dupForm.newWeekNumber,
        dupForm.newStartDate, dupForm.newEndDate
      )
      if (!res.success) throw new Error(res.error)
      toast.success(`Week duplicated with ${(res.data as any)?.sessions?.length || 0} sessions`)
      setDupModalOpen(false)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to duplicate week')
    } finally {
      setDupSaving(false)
    }
  }

  if (loading) return <div className="p-4 md:p-6"><SkeletonDashboard /></div>

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href={`/admin/homeschooling/${enrollmentId}`}>
          <Button variant="ghost" size="icon" className="rounded-xl"><ChevronLeft size={18} /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Timetable Builder
          </h1>
          <p className="text-xs font-bold opacity-50">{studentName || 'Homeschooling student'}</p>
        </div>
        <Link href={`/admin/homeschooling/${enrollmentId}`}>
          <Button variant="secondary" size="sm">Back to Program</Button>
        </Link>
      </div>

      <HomeschoolAdminNav enrollmentId={enrollmentId} studentName={studentName} />

      <Card className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            {weeks.length > 0 ? (
              <HomeschoolWeekSelector weeks={weeks} selectedIndex={selectedWeekIndex} onChange={setSelectedWeekIndex} />
            ) : (
              <p className="text-sm font-bold opacity-50 text-center">No weeks yet — create the first week to start building the timetable.</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setWeekModalOpen(true)}>
              <Plus size={14} /> New Week
            </Button>
            {currentWeek?.status === 'DRAFT' && (
              <Button variant="success" size="sm" onClick={handlePublishWeek} isLoading={publishWeek.saving}>
                <Megaphone size={14} /> Publish
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleScanMissed} isLoading={scanning}>
              <Radar size={14} /> Scan Missed
            </Button>
            {weeks.length > 0 && (
              <Button
                variant="ghost" size="sm"
                onClick={() => {
                  setDupForm({ sourceWeekId: currentWeek?.id || weeks[0]?.id || '', newWeekNumber: weeks.length + 1, newStartDate: '', newEndDate: '' })
                  setDupModalOpen(true)
                }}
              >
                <Copy size={14} /> Copy Week
              </Button>
            )}
          </div>
        </div>

        {currentWeek && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
            {[
              { label: 'Sessions', value: stats.total, icon: <CalendarDays size={14} />, color: '#4F8CFF' },
              { label: 'Teacher-led', value: stats.teacherLed, icon: <Users size={14} />, color: '#4F8CFF' },
              { label: 'Self-study', value: stats.selfStudy, icon: <BookOpen size={14} />, color: '#10B981' },
              { label: 'AI-supported', value: stats.aiSupported, icon: <Sparkles size={14} />, color: '#A855F7' },
              { label: 'Hours', value: stats.hours, icon: <Clock size={14} />, color: '#F59E0B' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'var(--input)' }}>
                <span style={{ color: s.color }}>{s.icon}</span>
                <div>
                  <div className="text-sm font-black leading-none" style={{ color: 'var(--text)' }}>{s.value}</div>
                  <div className="text-[9px] font-bold uppercase opacity-50 mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {!currentWeek ? (
        <Card className="p-12 text-center">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-20" />
          <h2 className="text-lg font-black mb-1" style={{ color: 'var(--text)' }}>No Timetable Yet</h2>
          <p className="text-sm opacity-50 font-medium mb-4">Create a week, then click any empty slot on the grid to place sessions.</p>
          <Button size="sm" onClick={() => setWeekModalOpen(true)}><Plus size={14} /> Create First Week</Button>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold opacity-50">Click an empty slot to add a session • Click a session to edit • Hover to delete</p>
            {currentWeek.status === 'DRAFT' && (
              <Badge variant="muted" className="uppercase text-[9px]">Draft — not visible to student</Badge>
            )}
            {currentWeek.status === 'PUBLISHED' && (
              <Badge variant="success" className="uppercase text-[9px]">Published</Badge>
            )}
          </div>
          <HomeschoolTimetableGrid
            sessions={weekSessions}
            days={DAY_NAMES.slice(0, 6)}
            viewMode="admin"
            showTeacher
            onSessionClick={openEditSession}
            onCellClick={openNewSession}
          />
        </motion.div>
      )}

      <Modal isOpen={sessionModalOpen} onClose={() => setSessionModalOpen(false)} title={editingSession ? 'Edit Session' : 'New Session'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Subject *" value={sessionForm.subject_id} onChange={e => setSessionForm({ ...sessionForm, subject_id: e.target.value })}>
              <option value="">Select subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select label="Teacher" value={sessionForm.teacher_id} onChange={e => setSessionForm({ ...sessionForm, teacher_id: e.target.value })}>
              <option value="">No teacher</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select label="Day *" value={sessionForm.day} onChange={e => setSessionForm({ ...sessionForm, day: e.target.value })}>
              {DAY_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Input label="Start *" type="time" value={sessionForm.start_time} onChange={e => setSessionForm({ ...sessionForm, start_time: e.target.value })} />
            <Input label="End *" type="time" value={sessionForm.end_time} onChange={e => setSessionForm({ ...sessionForm, end_time: e.target.value })} />
          </div>
          <Select label="Learning Mode *" value={sessionForm.learning_mode} onChange={e => setSessionForm({ ...sessionForm, learning_mode: e.target.value })}>
            <option value="TEACHER_LED">Teacher-led</option>
            <option value="SELF_STUDY">Self-study</option>
            <option value="AI_SUPPORTED">AI-supported</option>
          </Select>
          <Input label="Topic" placeholder="e.g. Quadratic equations" value={sessionForm.topic} onChange={e => setSessionForm({ ...sessionForm, topic: e.target.value })} />
          <Textarea label="Learning Goal" rows={2} value={sessionForm.learning_goal} onChange={e => setSessionForm({ ...sessionForm, learning_goal: e.target.value })} />
          <Textarea label="Instructions" rows={2} value={sessionForm.instructions} onChange={e => setSessionForm({ ...sessionForm, instructions: e.target.value })} />
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" checked={sessionForm.submission_required} onChange={e => setSessionForm({ ...sessionForm, submission_required: e.target.checked })} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Submission Required</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" checked={sessionForm.ai_assistance_enabled} onChange={e => setSessionForm({ ...sessionForm, ai_assistance_enabled: e.target.checked })} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Assistance</span>
            </label>
          </div>
          <div className="flex justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex gap-2 flex-wrap">
              {editingSession && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setRescheduleOpen(true)}>
                    <Move size={14} /> Move
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>
                    <XCircle size={14} /> Cancel
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => { setSessionModalOpen(false); setDeleteSessionId(editingSession.id) }}>
                    <Trash2 size={14} /> Delete
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setSessionModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSession} isLoading={sessionSaving}>
                {editingSession ? <><Pencil size={14} /> Update</> : <><Plus size={14} /> Add to Timetable</>}
              </Button>
            </div>
          </div>

          {editingSession && (
            <div className="pt-5 mt-1 border-t space-y-4" style={{ borderColor: 'var(--card-border)' }}>
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Session Content
              </h3>
              <SessionContentBuilder sessionId={editingSession.id} onChanged={() => load(true)} />
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={weekModalOpen} onClose={() => setWeekModalOpen(false)} title="New Week">
        <div className="space-y-4">
          <Input label="Week Title *" placeholder={`Week ${weeks.length + 1}`} value={weekForm.title} onChange={e => setWeekForm({ ...weekForm, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date *" type="date" value={weekForm.start_date} onChange={e => setWeekForm({ ...weekForm, start_date: e.target.value })} />
            <Input label="End Date *" type="date" value={weekForm.end_date} onChange={e => setWeekForm({ ...weekForm, end_date: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setWeekModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateWeek} isLoading={weekSaving}>Create Week</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={dupModalOpen} onClose={() => setDupModalOpen(false)} title="Copy Week Timetable">
        <div className="space-y-4">
          <Select label="Source Week" value={dupForm.sourceWeekId} onChange={e => setDupForm({ ...dupForm, sourceWeekId: e.target.value })}>
            {weeks.map(w => <option key={w.id} value={w.id}>Week {w.week_number} — {w.title} ({(w.sessions || []).length} sessions)</option>)}
          </Select>
          <div className="grid grid-cols-3 gap-4">
            <Input label="New Week #" type="number" value={String(dupForm.newWeekNumber)} onChange={e => setDupForm({ ...dupForm, newWeekNumber: Number(e.target.value) })} />
            <Input label="Start Date *" type="date" value={dupForm.newStartDate} onChange={e => setDupForm({ ...dupForm, newStartDate: e.target.value })} />
            <Input label="End Date *" type="date" value={dupForm.newEndDate} onChange={e => setDupForm({ ...dupForm, newEndDate: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setDupModalOpen(false)}>Cancel</Button>
            <Button onClick={handleDuplicate} isLoading={dupSaving}><Copy size={14} /> Duplicate</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteSessionId}
        onClose={() => setDeleteSessionId(null)}
        onConfirm={handleDeleteSession}
        title="Permanently Delete?"
        message="Only draft sessions with no learning activity can be deleted. Published sessions or sessions with activity must be cancelled instead to preserve history."
        confirmLabel="Delete"
      />

      <RescheduleSessionModal
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        sessionId={editingSession?.id || null}
        currentDay={editingSession?.day}
        currentStart={editingSession?.start_time}
        currentEnd={editingSession?.end_time}
        onRescheduled={() => { setSessionModalOpen(false); setEditingSession(null); load() }}
      />

      <CancelSessionModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        sessionId={editingSession?.id || null}
        onCancelled={() => { setSessionModalOpen(false); setEditingSession(null); load() }}
      />

      <PublishWarningsModal
        warnings={publishWeek.warnings}
        onClose={publishWeek.closeWarnings}
        onConfirm={publishWeek.confirmForce}
        saving={publishWeek.saving}
      />
    </div>
  )
}
