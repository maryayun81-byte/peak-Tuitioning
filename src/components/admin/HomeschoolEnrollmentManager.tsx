'use client'

import { useState } from 'react'
import {
  Pause, Play, XCircle, BookOpen, UserCheck, Calendar, CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge, Card } from '@/components/ui/Card'
import { ConfirmModal } from '@/components/ui/Modal'
import { pauseHomeschoolEnrollment, resumeHomeschoolEnrollment, cancelHomeschoolEnrollment, activateHomeschoolEnrollment } from '@/app/actions/homeschooling'
import toast from 'react-hot-toast'
import type { HomeschoolEnrollment } from '@/types/homeschooling'

interface Props {
  enrollment: HomeschoolEnrollment | null
  studentId: string
  onUpdate: () => void
}

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'muted' }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  PENDING: { label: 'Pending', variant: 'warning' },
  PAUSED: { label: 'Paused', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'info' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
  EXPIRED: { label: 'Expired', variant: 'muted' },
}

export default function HomeschoolEnrollmentManager({ enrollment, studentId, onUpdate }: Props) {
  const [pauseOpen, setPauseOpen] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [activateOpen, setActivateOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleActivate = async () => {
    if (!enrollment) return
    setLoading(true)
    try {
      const res = await activateHomeschoolEnrollment(enrollment.id)
      if (!res.success) throw new Error(res.error)
      toast.success('Homeschooling activated')
      onUpdate()
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate')
    } finally {
      setLoading(false)
      setActivateOpen(false)
    }
  }

  const handlePause = async () => {
    if (!enrollment) return
    setLoading(true)
    try {
      const res = await pauseHomeschoolEnrollment(enrollment.id)
      if (!res.success) throw new Error(res.error)
      toast.success('Enrollment paused')
      onUpdate()
    } catch (err: any) {
      toast.error(err.message || 'Failed to pause')
    } finally {
      setLoading(false)
      setPauseOpen(false)
    }
  }

  const handleResume = async () => {
    if (!enrollment) return
    setLoading(true)
    try {
      const res = await resumeHomeschoolEnrollment(enrollment.id)
      if (!res.success) throw new Error(res.error)
      toast.success('Enrollment resumed')
      onUpdate()
    } catch (err: any) {
      toast.error(err.message || 'Failed to resume')
    } finally {
      setLoading(false)
      setResumeOpen(false)
    }
  }

  const handleCancel = async () => {
    if (!enrollment) return
    setLoading(true)
    try {
      const res = await cancelHomeschoolEnrollment(enrollment.id)
      if (!res.success) throw new Error(res.error)
      toast.success('Enrollment cancelled')
      onUpdate()
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel')
    } finally {
      setLoading(false)
      setCancelOpen(false)
    }
  }

  if (!enrollment) {
    return (
      <Card className="p-6 text-center">
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center" style={{ background: 'var(--input)' }}>
            <BookOpen size={20} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            No homeschooling program enabled
          </p>
        </div>
      </Card>
    )
  }

  const status = STATUS_MAP[enrollment.status?.toUpperCase()] || STATUS_MAP.PENDING
  const subjects = enrollment.subjects || []

  return (
    <>
      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black" style={{ color: 'var(--text)' }}>
                {enrollment.program_name || 'Homeschooling'}
              </h4>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Grade {enrollment.grade_level} · {enrollment.academic_year}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            <div>
              <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Start</p>
              <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{enrollment.start_date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}>
            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            <div>
              <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>End</p>
              <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{enrollment.end_date || '—'}</p>
            </div>
          </div>
        </div>

        {subjects.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Subjects ({subjects.length})
            </p>
            <div className="space-y-2">
              {subjects.map((sub: any) => {
                const teacherNames = (sub.teacher_assignments || [])
                  .map((ta: any) => ta.teacher?.full_name)
                  .filter(Boolean)
                  .join(', ')
                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-2.5 rounded-xl"
                    style={{ background: 'var(--input)', border: '1px solid var(--card-border)' }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen size={12} style={{ color: 'var(--primary)' }} />
                      <span className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>
                        {sub.subject?.name || 'Subject'}
                      </span>
                    </div>
                    {teacherNames && (
                      <div className="flex items-center gap-1 shrink-0">
                        <UserCheck size={10} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {teacherNames}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
          {enrollment.status?.toUpperCase() === 'ACTIVE' && (
            <>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setPauseOpen(true)}>
                <Pause size={12} /> Pause
              </Button>
              <Button variant="danger" size="sm" className="flex-1" onClick={() => setCancelOpen(true)}>
                <XCircle size={12} /> Cancel
              </Button>
            </>
          )}
          {enrollment.status?.toUpperCase() === 'PAUSED' && (
            <>
              <Button variant="success" size="sm" className="flex-1" onClick={() => setResumeOpen(true)}>
                <Play size={12} /> Resume
              </Button>
              <Button variant="danger" size="sm" className="flex-1" onClick={() => setCancelOpen(true)}>
                <XCircle size={12} /> Cancel
              </Button>
            </>
          )}
          {(enrollment.status?.toUpperCase() === 'PENDING') && (
            <>
              <Button variant="success" size="sm" className="flex-1" onClick={() => setActivateOpen(true)}>
                <CheckCircle2 size={12} /> Activate
              </Button>
              <Button variant="danger" size="sm" className="flex-1" onClick={() => setCancelOpen(true)}>
                <XCircle size={12} /> Cancel
              </Button>
            </>
          )}
        </div>
      </Card>

      <ConfirmModal
        isOpen={activateOpen}
        onClose={() => setActivateOpen(false)}
        onConfirm={handleActivate}
        title="Activate Homeschooling?"
        message="This will add the Homeschooling badge, enable the Homeschooling Hub, apply the timetable and enable the assigned learning features. Existing account data is untouched."
        confirmLabel="Activate"
        variant="primary"
      />
      <ConfirmModal
        isOpen={pauseOpen}
        onClose={() => setPauseOpen(false)}
        onConfirm={handlePause}
        title="Pause Enrollment"
        message="This will pause all learning sessions for this student. You can resume anytime."
        confirmLabel="Pause"
        variant="danger"
      />
      <ConfirmModal
        isOpen={resumeOpen}
        onClose={() => setResumeOpen(false)}
        onConfirm={handleResume}
        title="Resume Enrollment"
        message="This will reactivate the student's homeschooling program and resume learning sessions."
        confirmLabel="Resume"
        variant="primary"
      />
      <ConfirmModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Enrollment"
        message="This will permanently cancel the homeschooling enrollment. This action cannot be undone."
        confirmLabel="Cancel Enrollment"
        variant="danger"
      />
    </>
  )
}
