'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { createLearningSession, updateLearningSession } from '@/app/actions/homeschooling'
import toast from 'react-hot-toast'
import type { LearningSession } from '@/types/homeschooling'

interface Props {
  enrollmentId: string
  weekId: string
  session?: LearningSession
  subjects: Array<{ id: string; name: string; code?: string }>
  teachers: Array<{ id: string; full_name: string }>
  onSave: () => void
  onCancel: () => void
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const sessionSchema = z.object({
  subject_id: z.string().min(1, 'Subject is required'),
  teacher_id: z.string().optional(),
  day: z.string().min(1, 'Day is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  learning_mode: z.string().min(1, 'Learning mode is required'),
  topic: z.string().optional(),
  learning_goal: z.string().optional(),
  instructions: z.string().optional(),
  submission_required: z.boolean().optional(),
  ai_assistance_enabled: z.boolean().optional(),
  ai_instructions: z.string().optional(),
})

type SessionForm = z.infer<typeof sessionSchema>

export default function LearningSessionForm({
  enrollmentId, weekId, session, subjects, teachers, onSave, onCancel,
}: Props) {
  const isEditing = !!session
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      subject_id: session?.subject_id || '',
      teacher_id: session?.teacher_id || '',
      day: session?.day || 'Monday',
      start_time: session?.start_time || '09:00',
      end_time: session?.end_time || '10:00',
      learning_mode: session?.learning_mode || 'teacher_led',
      topic: session?.topic || '',
      learning_goal: session?.learning_goal || '',
      instructions: session?.instructions || '',
      submission_required: session?.submission_required || false,
      ai_assistance_enabled: session?.ai_assistance_enabled || false,
      ai_instructions: session?.ai_instructions || '',
    },
  })

  const formData = watch()
  const aiEnabled = watch('ai_assistance_enabled')

  const onSubmit = async (data: SessionForm) => {
    setSaving(true)
    try {
      const payload = {
        subject_id: data.subject_id,
        teacher_id: data.teacher_id || undefined,
        day: data.day,
        start_time: data.start_time,
        end_time: data.end_time,
        learning_mode: data.learning_mode,
        topic: data.topic || undefined,
        learning_goal: data.learning_goal || undefined,
        instructions: data.instructions || undefined,
        submission_required: data.submission_required || false,
        ai_assistance_enabled: data.ai_assistance_enabled !== false,
        ai_instructions: data.ai_instructions || undefined,
      }

      if (isEditing) {
        const res = await updateLearningSession(session.id, payload)
        if (!res.success) throw new Error(res.error)
        toast.success('Session updated')
      } else {
        const res = await createLearningSession({
          week_id: weekId,
          ...payload,
        })
        if (!res.success) throw new Error(res.error)
        toast.success('Session created')
      }
      onSave()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save session')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={isEditing ? 'Edit Session' : 'New Session'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Subject *" error={errors.subject_id?.message} {...register('subject_id')}>
            <option value="">Select subject</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Select label="Teacher" {...register('teacher_id')}>
            <option value="">No teacher</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Select label="Day *" error={errors.day?.message} {...register('day')}>
            {DAY_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Input label="Start Time *" type="time" error={errors.start_time?.message} {...register('start_time')} />
          <Input label="End Time *" type="time" error={errors.end_time?.message} {...register('end_time')} />
        </div>

        <Select label="Learning Mode *" error={errors.learning_mode?.message} {...register('learning_mode')}>
          <option value="teacher_led">Teacher-led</option>
          <option value="self_study">Self-study</option>
          <option value="ai_supported">AI-supported</option>
        </Select>

        <Input label="Topic" placeholder="Session topic" {...register('topic')} />

        <Textarea label="Learning Goal" rows={2} placeholder="What should the student achieve?" {...register('learning_goal')} />

        <Textarea label="Instructions" rows={2} placeholder="Detailed instructions for this session..." {...register('instructions')} />

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded"
              checked={formData.submission_required || false}
              onChange={e => setValue('submission_required', e.target.checked)}
            />
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Submission Required</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded"
              checked={formData.ai_assistance_enabled || false}
              onChange={e => setValue('ai_assistance_enabled', e.target.checked)}
            />
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Assistance</span>
          </label>
        </div>

        {aiEnabled && (
          <Textarea
            label="AI Instructions"
            rows={2}
            placeholder="Special instructions for AI assistance during this session..."
            {...register('ai_instructions')}
          />
        )}

        <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button type="submit" isLoading={saving}>
            {isEditing ? 'Update Session' : 'Create Session'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
