'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Edit, Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, Badge } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'

const schema = z.object({
  exam_type: z.enum(['KCSE', 'KPSEA', 'KJSEA']),
  name: z.string().min(1, 'Name is required'),
  exam_date: z.string().min(1, 'Exam date is required'),
  registration_deadline: z.string().optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  target_class_ids: z.array(z.string().uuid()).default([]),
  notes: z.string().optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

const EXAM_HELP: Record<FormData['exam_type'], string> = {
  KCSE: 'Form 4 national exam countdown',
  KPSEA: 'Grade 9 national exam countdown',
  KJSEA: 'Grade 6 national exam countdown',
}

export default function AdminNationalExamsPage() {
  const supabase = getSupabaseBrowserClient()
  const [exams, setExams] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      exam_type: 'KCSE',
      name: '',
      exam_date: '',
      registration_deadline: '',
      status: 'draft',
      target_class_ids: [],
      notes: '',
    },
  })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [examRes, classRes] = await Promise.all([
        supabase.from('national_exam_events').select('*').order('exam_date', { ascending: true }),
        supabase.from('classes').select('*').order('level'),
      ])
      setExams(examRes.data ?? [])
      setClasses(classRes.data ?? [])
      if (examRes.error) throw examRes.error
      if (classRes.error) throw classRes.error
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load national exams')
    } finally {
      setLoading(false)
    }
  }

  const startCreate = () => {
    reset({
      exam_type: 'KCSE',
      name: '',
      exam_date: '',
      registration_deadline: '',
      status: 'draft',
      target_class_ids: [],
      notes: '',
    })
    setEditing(null)
    setOpen(true)
  }

  const startEdit = (exam: any) => {
    setEditing(exam)
    reset({
      exam_type: exam.exam_type,
      name: exam.name,
      exam_date: exam.exam_date,
      registration_deadline: exam.registration_deadline || '',
      status: exam.status,
      target_class_ids: exam.target_class_ids || [],
      notes: exam.notes || '',
    })
    setOpen(true)
  }

  const onSubmit = async (values: FormData) => {
    const payload = {
      ...values,
      registration_deadline: values.registration_deadline || null,
      notes: values.notes || null,
    }

    const { error } = editing
      ? await supabase.from('national_exam_events').update(payload).eq('id', editing.id)
      : await supabase.from('national_exam_events').insert(payload)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(editing ? 'National exam updated' : 'National exam created')
    setOpen(false)
    setEditing(null)
    load()
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('national_exam_events').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('National exam removed')
    load()
  }

  const selectedClassIds = watch('target_class_ids') || []

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">External exam dates</p>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>National Exams</h1>
          <p className="mt-1 text-sm text-muted">Manage KCSE, KPSEA, and KJSEA countdown dates separately from internal exam events.</p>
        </div>
        <Button onClick={startCreate}><Plus size={16} /> New National Exam</Button>
      </div>

      {loading ? <SkeletonList count={4} /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Exam', 'Date', 'Targets', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exams.map((exam, index) => {
                  const daysLeft = Math.ceil((new Date(exam.exam_date).getTime() - Date.now()) / 86400000)
                  const targetLabel = exam.target_class_ids?.length
                    ? `${exam.target_class_ids.length} class${exam.target_class_ids.length === 1 ? '' : 'es'}`
                    : 'All matching students'

                  return (
                    <motion.tr key={exam.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                            <CalendarDays size={18} />
                          </div>
                          <div>
                            <div className="font-black" style={{ color: 'var(--text)' }}>{exam.name}</div>
                            <div className="text-xs font-bold text-muted">{exam.exam_type} - {EXAM_HELP[exam.exam_type as FormData['exam_type']]}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold" style={{ color: 'var(--text)' }}>{formatDate(exam.exam_date, 'long')}</div>
                        <div className="text-xs text-muted">{daysLeft >= 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days ago`}</div>
                      </td>
                      <td className="px-5 py-4 text-muted">{targetLabel}</td>
                      <td className="px-5 py-4">
                        <Badge variant={exam.status === 'published' ? 'success' : exam.status === 'archived' ? 'secondary' : 'warning'}>
                          {exam.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(exam)} className="rounded-lg p-2" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                            <Edit size={14} />
                          </button>
                          <button onClick={() => remove(exam.id)} className="rounded-lg p-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
                {exams.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted">No national exam dates yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit National Exam' : 'New National Exam'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select label="Exam Type" error={errors.exam_type?.message} {...register('exam_type')}>
            <option value="KCSE">KCSE - Form 4</option>
            <option value="KPSEA">KPSEA - Grade 9</option>
            <option value="KJSEA">KJSEA - Grade 6</option>
          </Select>
          <Input label="Display Name" placeholder="e.g. 2026 KCSE National Examination" error={errors.name?.message} {...register('name')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Exam Date" type="date" error={errors.exam_date?.message} {...register('exam_date')} required />
            <Input label="Registration Deadline" type="date" error={errors.registration_deadline?.message} {...register('registration_deadline')} />
          </div>
          <Select label="Status" error={errors.status?.message} {...register('status')}>
            <option value="draft">Draft - hidden from students</option>
            <option value="published">Published - visible on dashboards</option>
            <option value="archived">Archived</option>
          </Select>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted">Optional Class Targeting</label>
            <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--input)] p-3">
              {classes.map((cl) => (
                <label key={cl.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-xs hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={selectedClassIds.includes(cl.id)}
                    onChange={(e) => {
                      const current = selectedClassIds
                      setValue('target_class_ids', e.target.checked ? [...current, cl.id] : current.filter(id => id !== cl.id))
                    }}
                  />
                  <span style={{ color: 'var(--text)' }}>{cl.name}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-muted">Leave empty to show the countdown to all students whose class level matches the exam type.</p>
          </div>

          <Input label="Notes" placeholder="Optional admin note" error={errors.notes?.message} {...register('notes')} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
