'use client'

import { useState, useEffect } from 'react'
import { Move, XCircle, AlertTriangle, Megaphone } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import {
  rescheduleSession, cancelSession, publishHomeschoolWeek,
} from '@/app/actions/homeschooling'
import toast from 'react-hot-toast'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function RescheduleSessionModal({
  isOpen, onClose, sessionId, currentDay, currentStart, currentEnd, onRescheduled,
}: {
  isOpen: boolean
  onClose: () => void
  sessionId: string | null
  currentDay?: string
  currentStart?: string
  currentEnd?: string
  onRescheduled: () => void
}) {
  const [day, setDay] = useState(currentDay || 'Monday')
  const [start, setStart] = useState(currentStart || '09:00')
  const [end, setEnd] = useState(currentEnd || '10:00')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setDay(currentDay || 'Monday')
      setStart(currentStart || '09:00')
      setEnd(currentEnd || '10:00')
      setReason('')
    }
  }, [isOpen, currentDay, currentStart, currentEnd])

  const handleMove = async () => {
    if (!sessionId) return
    setSaving(true)
    try {
      const res = await rescheduleSession(sessionId, {
        day, start_time: start, end_time: end, reason: reason.trim() || undefined,
      })
      if (!res.success) throw new Error(res.error)
      toast.success('Session moved — history preserved')
      onClose()
      onRescheduled()
    } catch (err: any) {
      toast.error(err.message || 'Failed to move session')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Move Session">
      <div className="space-y-4">
        <p className="text-xs font-medium opacity-60">
          The original slot is kept as a cancelled record; a new session is created at the new time with all objectives, resources and the linked assignment carried over.
        </p>
        <Select label="New Day *" value={day} onChange={e => setDay(e.target.value)}>
          {DAY_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input label="New Start *" type="time" value={start} onChange={e => setStart(e.target.value)} />
          <Input label="New End *" type="time" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
        <Textarea label="Reason (shown in history)" rows={2} placeholder="e.g. Teacher unavailable Wednesday morning" value={reason} onChange={e => setReason(e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleMove} isLoading={saving}><Move size={14} /> Move Session</Button>
        </div>
      </div>
    </Modal>
  )
}

export function CancelSessionModal({
  isOpen, onClose, sessionId, onCancelled,
}: {
  isOpen: boolean
  onClose: () => void
  sessionId: string | null
  onCancelled: () => void
}) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (isOpen) setReason('') }, [isOpen])

  const handleCancel = async () => {
    if (!sessionId) return
    setSaving(true)
    try {
      const res = await cancelSession(sessionId, reason.trim() || undefined)
      if (!res.success) throw new Error(res.error)
      toast.success('Session cancelled — record preserved')
      onClose()
      onCancelled()
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel session')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancel Session?">
      <div className="space-y-4">
        <p className="text-xs font-medium opacity-60">
          The session stays in history as cancelled. Objectives, submissions and teacher feedback are preserved.
        </p>
        <Textarea label="Reason" rows={2} placeholder="e.g. Public holiday" value={reason} onChange={e => setReason(e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Keep Session</Button>
          <Button variant="danger" onClick={handleCancel} isLoading={saving}>
            <XCircle size={14} /> Cancel Session
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function PublishWarningsModal({
  warnings, onClose, onConfirm, saving,
}: {
  warnings: string[] | null
  onClose: () => void
  onConfirm: () => void
  saving: boolean
}) {
  return (
    <Modal isOpen={!!warnings} onClose={onClose} title="Publish With Gaps?">
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <AlertTriangle size={15} style={{ color: '#F59E0B' }} className="shrink-0 mt-0.5" />
          <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
            Some sessions are incomplete. Students will see exactly what is configured — empty self-study slots feel unprepared.
          </p>
        </div>
        <ul className="space-y-1.5 max-h-[240px] overflow-y-auto">
          {(warnings || []).map((w, i) => (
            <li key={i} className="text-xs font-medium p-2 rounded-lg" style={{ background: 'var(--input)', color: 'var(--text)' }}>
              {w}
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Go Back & Fix</Button>
          <Button variant="success" onClick={onConfirm} isLoading={saving}>
            <Megaphone size={14} /> Publish Anyway
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function usePublishWeek(reload: () => void) {
  const [warnings, setWarnings] = useState<string[] | null>(null)
  const [targetWeekId, setTargetWeekId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const publish = async (weekId: string, force = false) => {
    setSaving(true)
    try {
      const res = await publishHomeschoolWeek(weekId, force)
      if (!res.success && (res as any).needsConfirmation) {
        setWarnings((res as any).warnings || [])
        setTargetWeekId(weekId)
        return
      }
      if (!res.success) throw new Error(res.error)
      const count = ((res as any).warnings || []).length
      toast.success(count > 0 ? `Week published with ${count} warning${count !== 1 ? 's' : ''}` : 'Week published — visible to student')
      setWarnings(null)
      setTargetWeekId(null)
      reload()
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish week')
    } finally {
      setSaving(false)
    }
  }

  const confirmForce = () => {
    if (targetWeekId) publish(targetWeekId, true)
  }

  const closeWarnings = () => {
    setWarnings(null)
    setTargetWeekId(null)
  }

  return { publish, warnings, saving, confirmForce, closeWarnings }
}
