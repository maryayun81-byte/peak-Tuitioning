'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit, ClipboardList, Calendar, CheckCircle, AlertCircle } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card, Badge } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import type { ExamEvent, TuitionEvent, Curriculum, Class } from '@/types/database'

const schema = z.object({
  name: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  tuition_event_id: z.string().uuid(),
  curriculum_id: z.string().uuid().nullable().optional().or(z.literal('')),
  target_class_ids: z.array(z.string().uuid()).default([]),
  status: z.enum(['upcoming', 'active', 'finalized', 'closed', 'cancelled', 'ended', 'generated', 'published']).default('upcoming'),
})
type FormData = z.infer<typeof schema>

export default function AdminExamEvents() {
  const supabase = getSupabaseBrowserClient()
  const [exams, setExams] = useState<ExamEvent[]>([])
  const [tuitionEvents, setTuitionEvents] = useState<TuitionEvent[]>([])
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<ExamEvent | null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({ 
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      start_date: '',
      end_date: '',
      tuition_event_id: '',
      curriculum_id: '',
      target_class_ids: [],
      status: 'upcoming'
    }
  })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [eRes, tRes, cRes, clRes] = await Promise.all([
        supabase.from('exam_events').select('*, tuition_event:tuition_events(name), curriculum:curriculums(name)').order('start_date', { ascending: false }),
        supabase.from('tuition_events').select('*').order('start_date', { ascending: false }),
        supabase.from('curriculums').select('*').order('name'),
        supabase.from('classes').select('*').order('level'),
      ])
      setExams(eRes.data ?? [])
      setTuitionEvents(tRes.data ?? [])
      setCurriculums(cRes.data ?? [])
      setClasses(clRes.data ?? [])
    } catch (e) {
      console.error('Failed to load exam events:', e)
      toast.error('Failed to load data.')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    const cleanData: any = { ...data }
    if (!cleanData.curriculum_id) delete cleanData.curriculum_id;

    const { error } = editing
      ? await supabase.from('exam_events').update(cleanData).eq('id', editing.id)
      : await supabase.from('exam_events').insert(cleanData)
    if (error) { toast.error(error.message); return }
    toast.success(editing ? 'Exam event updated!' : 'Exam event created!')
    reset(); setEditing(null); setAddOpen(false); load()
  }

  const updateStatus = async (exam: ExamEvent, newStatus: ExamEvent['status']) => {
    const { error } = await supabase.from('exam_events').update({ status: newStatus }).eq('id', exam.id)
    if (error) { toast.error('Status update failed'); return }
    
    // NOTIFY STUDENTS ON PUBLISH
    if (newStatus === 'published') {
      try {
        const { data: marks } = await supabase
          .from('exam_marks')
          .select('student:students(user_id)')
          .eq('exam_event_id', exam.id)
        
        const userIds = Array.from(new Set(marks?.map(m => {
          const s = m.student as any
          return Array.isArray(s) ? s[0]?.user_id : s?.user_id
        }).filter(Boolean)))
        
        if (userIds.length > 0) {
          const notifications = userIds.map(uid => ({
            user_id: uid,
            type: 'results_published',
            title: 'Exam Results Published',
            body: `Results for "${exam.name}" have been published. Check your grades in the portal.`,
            related_id: exam.id,
            data: { exam_event_id: exam.id }
          }))
          await supabase.from('notifications').insert(notifications)
        }
      } catch (err) {
        console.error('Failed to send exam notifications:', err)
      }
    }

    toast.success(`Exam is now ${newStatus.toUpperCase()}`)
    load()
  }

  const del = async (id: string) => {
    const { error } = await supabase.from('exam_events').delete().eq('id', id)
    if (error) { toast.error('Cannot delete — marks may exist'); return }
    toast.success('Deleted'); load()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Exam Events</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{exams.length} exams recorded</p>
        </div>
        <Button onClick={() => { reset(); setEditing(null); setAddOpen(true) }}><Plus size={16} /> New Exam Event</Button>
      </div>

      {loading ? <SkeletonList count={5} /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Exam Name', 'Dates', 'Tuition Event', 'Curriculum', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exams.map((e, i) => (
                  <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--input)', color: '#A855F7' }}>
                          <ClipboardList size={14} />
                        </div>
                        <span className="font-semibold" style={{ color: 'var(--text)' }}>{e.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                        {formatDate(e.start_date, 'short')} — {formatDate(e.end_date, 'short')}
                      </div>
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{(e as any).tuition_event?.name}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{(e as any).curriculum?.name}</td>
                    <td className="px-5 py-3">
                      <select
                        value={e.status}
                        onChange={(ev) => updateStatus(e, ev.target.value as any)}
                        className="text-xs font-bold uppercase tracking-wider bg-[var(--input)] border border-[var(--card-border)] rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                        style={{ 
                          color: e.status === 'published' ? '#10B981' : 
                                 e.status === 'active' ? '#3B82F6' : 
                                 e.status === 'closed' ? '#F59E0B' : 'var(--text)'
                        }}
                      >
                        <option value="upcoming">UPCOMING</option>
                        <option value="active">ACTIVE</option>
                        <option value="finalized">FINALIZED</option>
                        <option value="closed">CLOSED</option>
                        <option value="generated">GENERATED</option>
                        <option value="published">PUBLISHED</option>
                        <option value="cancelled">CANCELLED</option>
                        <option value="ended">ENDED</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        {e.status === 'active' ? (
                          <Button size="sm" variant="warning" onClick={() => updateStatus(e, 'finalized')}>
                            Finalize Exam (Marking)
                          </Button>
                        ) : e.status === 'finalized' ? (
                          <Button size="sm" variant="danger" onClick={() => updateStatus(e, 'closed')}>
                            Close (Transcripts)
                          </Button>
                        ) : (
                          <Link href={`/admin/transcripts?examId=${e.id}`}>
                            <Button size="sm" variant="info">
                              Transcripts
                            </Button>
                          </Link>
                        )}
                        <button onClick={() => { 
                          setEditing(e); 
                          setValue('name', e.name); 
                          setValue('start_date', e.start_date || '');
                          setValue('end_date', e.end_date || '');
                          setValue('tuition_event_id', e.tuition_event_id); 
                          setValue('curriculum_id', e.curriculum_id); 
                          setValue('target_class_ids', e.target_class_ids || []);
                          setValue('status', e.status); 
                          setAddOpen(true) 
                        }} className="p-1.5 rounded-lg" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                          <Edit size={14} />
                        </button>
                        <button onClick={() => del(e.id)} className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {exams.length === 0 && <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No exam events found</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); reset(); setEditing(null) }} title={editing ? 'Edit Exam' : 'New Exam'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Exam Name" placeholder="e.g. End of Term assessment" error={errors.name?.message} {...register('name')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" error={errors.start_date?.message} {...register('start_date')} required />
            <Input label="End Date" type="date" error={errors.end_date?.message} {...register('end_date')} required />
          </div>
          <Select label="Tuition Event" error={errors.tuition_event_id?.message} {...register('tuition_event_id')}>
            <option value="">Select tuition event</option>
            {tuitionEvents.map(te => <option key={te.id} value={te.id}>{te.name}</option>)}
          </Select>
          <Select label="Curriculum" error={errors.curriculum_id?.message} {...register('curriculum_id')}>
            <option value="">All Curriculums</option>
            {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          {/* Class Targeting */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted">Target Classes (Optional)</label>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-[var(--card-border)] bg-[var(--input)] max-h-40 overflow-y-auto">
              {classes
                .filter(cl => !watch('curriculum_id') || cl.curriculum_id === watch('curriculum_id'))
                .map(cl => (
                  <label key={cl.id} className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      value={cl.id} 
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                      checked={watch('target_class_ids')?.includes(cl.id)}
                      onChange={(e) => {
                        const current = watch('target_class_ids') || []
                        if (e.target.checked) setValue('target_class_ids', [...current, cl.id])
                        else setValue('target_class_ids', current.filter((id: string) => id !== cl.id))
                      }}
                    />
                    <span style={{ color: 'var(--text)' }}>{cl.name}</span>
                  </label>
                ))}
            </div>
            <p className="text-[10px] text-muted">Leave empty to target all classes in the selected curriculum.</p>
          </div>

          <Select label="Current Status" error={errors.status?.message} {...register('status')}>
            <option value="upcoming">Upcoming (Countdown visible)</option>
            <option value="active">Active (Banner + Ongoing)</option>
            <option value="finalized">Finalized (Open for teachers to record marks)</option>
            <option value="closed">Closed (Ready for admin transcripts, teachers locked)</option>
            <option value="generated">Generated (Review phase)</option>
            <option value="published">Published (Visible to students)</option>
            <option value="cancelled">Cancelled</option>
            <option value="ended">Ended</option>
          </Select>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
