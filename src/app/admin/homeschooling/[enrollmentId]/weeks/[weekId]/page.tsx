'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Plus, Calendar, Clock, BookOpen, Users, Edit3,
  Trash2, CheckCircle2, AlertTriangle, ChevronRight, ListChecks
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { ConfirmModal } from '@/components/ui/Modal'
import LearningSessionForm from '@/components/admin/LearningSessionForm'
import HomeschoolAdminNav from '@/components/admin/HomeschoolAdminNav'
import {
  getHomeschoolWeeks, getLearningSessions, updateHomeschoolEnrollment
} from '@/app/actions/homeschooling'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { HomeschoolWeek, LearningSession } from '@/types/homeschooling'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const SESSION_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'muted' }> = {
  UPCOMING: { label: 'Upcoming', variant: 'warning' },
  READY: { label: 'Ready', variant: 'info' },
  IN_PROGRESS: { label: 'In Progress', variant: 'success' },
  COMPLETED: { label: 'Completed', variant: 'info' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
  MISSED: { label: 'Missed', variant: 'danger' },
  UNDER_REVIEW: { label: 'Under Review', variant: 'info' },
  SUBMISSION_PENDING: { label: 'Pending Submission', variant: 'warning' },
}

const WEEK_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'muted' }> = {
  DRAFT: { label: 'Draft', variant: 'muted' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'info' },
}

export default function WeekDetailPage({
  params,
}: {
  params: Promise<{ enrollmentId: string; weekId: string }>
}) {
  const resolvedParams = use(params)
  const { enrollmentId, weekId } = resolvedParams
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [week, setWeek] = useState<HomeschoolWeek | null>(null)
  const [sessions, setSessions] = useState<LearningSession[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [enrollmentSubjects, setEnrollmentSubjects] = useState<any[]>([])

  const [formOpen, setFormOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<LearningSession | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { load() }, [weekId])

  const load = async () => {
    setLoading(true)
    try {
      const [weeksRes, sessionsRes, subjectsRes, teachersRes, enrollSubjectsRes] = await Promise.all([
        getHomeschoolWeeks(enrollmentId),
        getLearningSessions(weekId),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('teachers').select('id, full_name').order('full_name'),
        supabase.from('homeschool_subjects')
          .select('id, subject_id, subject:subjects(id, name, code)')
          .eq('enrollment_id', enrollmentId)
          .eq('is_active', true),
      ])

      if (weeksRes.success) {
        const found = (weeksRes.data || []).find((w: any) => w.id === weekId)
        setWeek(found || null)
      }
      if (sessionsRes.success) setSessions(sessionsRes.data || [])
      setSubjects(subjectsRes.data || [])
      setTeachers(teachersRes.data || [])
      setEnrollmentSubjects(enrollSubjectsRes.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load week data')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('learning_sessions').delete().eq('id', deleteId)
      if (error) throw error
      toast.success('Session deleted')
      setDeleteId(null)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const handleSaveDone = () => {
    setFormOpen(false)
    setEditingSession(null)
    load()
  }

  const groupedSessions = DAY_NAMES.reduce((acc, day) => {
    acc[day] = sessions.filter(s => s.day === day)
    return acc
  }, {} as Record<string, LearningSession[]>)

  const totalMinutes = sessions.reduce((sum, s) => {
    if (!s.start_time || !s.end_time) return sum
    const [sh, sm] = s.start_time.split(':').map(Number)
    const [eh, em] = s.end_time.split(':').map(Number)
    return sum + ((eh * 60 + em) - (sh * 60 + sm))
  }, 0)

  if (loading) return <SkeletonDashboard />
  if (!week) return (
    <div className="p-6">
      <Card className="p-12 text-center">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Week not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
          <ChevronLeft size={14} /> Go Back
        </Button>
      </Card>
    </div>
  )

  const ws = WEEK_STATUS[week.status?.toUpperCase()] || WEEK_STATUS.DRAFT

  return (
    <div className="p-6 space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/homeschooling/${enrollmentId}/weeks`)}>
          <ChevronLeft size={16} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black" style={{ color: 'var(--text)' }}>
              Week {week.week_number} — {week.title}
            </h1>
            <Badge variant={ws.variant}>{ws.label}</Badge>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {week.start_date} → {week.end_date} · {sessions.length} session{sessions.length !== 1 ? 's' : ''} · {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m total
          </p>
        </div>
        <Button onClick={() => { setEditingSession(null); setFormOpen(true) }}>
          <Plus size={14} /> New Session
        </Button>
      </div>

      <HomeschoolAdminNav enrollmentId={enrollmentId} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-black" style={{ color: 'var(--primary)' }}>{sessions.length}</p>
          <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Sessions</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-black" style={{ color: '#10B981' }}>
            {sessions.filter(s => s.status?.toUpperCase() === 'COMPLETED').length}
          </p>
          <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Completed</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-black" style={{ color: '#F59E0B' }}>
            {sessions.filter(s => s.status?.toUpperCase() === 'IN_PROGRESS').length}
          </p>
          <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>In Progress</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-black" style={{ color: 'var(--text)' }}>
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
          </p>
          <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Duration</p>
        </Card>
      </div>

      {sessions.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'var(--input)' }}>
              <ListChecks size={28} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>No sessions this week</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Add sessions to build the weekly schedule
              </p>
            </div>
            <Button onClick={() => { setEditingSession(null); setFormOpen(true) }}>
              <Plus size={14} /> Add First Session
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {DAY_NAMES.map(day => {
            const daySessions = groupedSessions[day]
            if (!daySessions?.length) return null
            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {day}
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                    {daySessions.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {daySessions.map((session, idx) => {
                    const ss = SESSION_STATUS[session.status?.toUpperCase()] || SESSION_STATUS.UPCOMING
                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                      >
                        <Card className="p-4 hover:shadow-md transition-all">
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center shrink-0 pt-0.5">
                              <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
                                {session.start_time}
                              </span>
                              <div className="w-px h-4 my-0.5" style={{ background: 'var(--card-border)' }} />
                              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                                {session.end_time}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                                  {session.topic || (session.subject as any)?.name || 'Untitled Session'}
                                </h4>
                                <Badge variant={ss.variant}>{ss.label}</Badge>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {(session.subject as any)?.name && (
                                  <span className="flex items-center gap-1">
                                    <BookOpen size={10} />
                                    {(session.subject as any).name}
                                  </span>
                                )}
                                {session.teacher && (
                                  <span className="flex items-center gap-1">
                                    <Users size={10} />
                                    {(session.teacher as any).full_name}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 capitalize">
                                  <Clock size={10} />
                                  {session.learning_mode?.replace('_', ' ')}
                                </span>
                                {session.submission_required && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                                    style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                                    SUBMISSION
                                  </span>
                                )}
                                {session.ai_assistance_enabled && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                                    style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
                                    AI
                                  </span>
                                )}
                              </div>

                              {session.learning_goal && (
                                <p className="text-xs line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                                  {session.learning_goal}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setEditingSession(session); setFormOpen(true) }}
                              >
                                <Edit3 size={14} />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(session.id)}>
                                <Trash2 size={14} className="text-red-400" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <LearningSessionForm
            enrollmentId={enrollmentId}
            weekId={weekId}
            session={editingSession || undefined}
            subjects={enrollmentSubjects.map((s: any) => ({ id: s.subject_id, name: s.subject?.name, code: s.subject?.code }))}
            teachers={teachers}
            onSave={handleSaveDone}
            onCancel={() => { setFormOpen(false); setEditingSession(null) }}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Session"
        message="Are you sure you want to delete this session? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
