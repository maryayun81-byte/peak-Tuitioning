'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit, Calendar, Clock, BookOpen, UserCircle, School } from 'lucide-react'
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
import type { Timetable, Class, Subject, Teacher } from '@/types/database'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const schema = z.object({
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  day: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  room_number: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function AdminTimetables() {
  const supabase = getSupabaseBrowserClient()
  const [timetables, setTimetables] = useState<Timetable[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Timetable | null>(null)
  const [filterClass, setFilterClass] = useState('')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [tRes, cRes, sRes, teRes] = await Promise.all([
        supabase.from('timetables').select('*, class:classes(name), subject:subjects(name), teacher:teachers(full_name)').order('day').order('start_time'),
        supabase.from('classes').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('teachers').select('*').order('full_name'),
      ])
      setTimetables(tRes.data ?? [])
      setClasses(cRes.data ?? [])
      setSubjects(sRes.data ?? [])
      setTeachers(teRes.data ?? [])
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to load timetables')
    } finally {
      setLoading(false)
    }
  }

  const filtered = filterClass ? timetables.filter(t => t.class_id === filterClass) : timetables

  const onSubmit = async (data: FormData) => {
    const { error } = editing
      ? await supabase.from('timetables').update(data).eq('id', editing.id)
      : await supabase.from('timetables').insert(data)
    if (error) { toast.error(error.message); return }
    toast.success(editing ? 'Entry updated!' : 'Entry added to timetable!')
    reset(); setEditing(null); setAddOpen(false); load()
  }

  const del = async (id: string) => {
    const { error } = await supabase.from('timetables').delete().eq('id', id)
    if (error) { toast.error('Delete failed'); return }
    toast.success('Deleted'); load()
  }

  // Organize by day
  const groupedByDay = DAYS.reduce((acc, day) => {
    acc[day] = filtered.filter(t => t.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
    return acc
  }, {} as Record<string, Timetable[]>)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Timetables</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Configure class schedules</p>
        </div>
        <Button onClick={() => { reset(); setEditing(null); setAddOpen(true) }}><Plus size={16} /> Add Entry</Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="max-w-xs">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      {loading ? <SkeletonList count={5} /> : (
        <div className="space-y-6">
          {DAYS.map(day => {
            const entries = groupedByDay[day]
            if (entries.length === 0 && filterClass) return null
            if (entries.length === 0) return null

            return (
              <motion.div key={day} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <h3 className="text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Calendar size={14} /> {day}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entries.map((entry) => (
                    <Card key={entry.id} className="p-4 group relative">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="primary">{entry.start_time} - {entry.end_time}</Badge>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditing(entry); reset(entry); setAddOpen(true) }} className="p-1.5 rounded-lg text-muted hover:bg-input"><Edit size={12} /></button>
                          <button onClick={() => del(entry.id)} className="p-1.5 rounded-lg text-danger hover:bg-danger-light"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <h4 className="font-bold text-base mb-1" style={{ color: 'var(--text)' }}>{(entry as any).subject?.name}</h4>
                      <div className="space-y-1">
                         <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <School size={12} /> {(entry as any).class?.name}
                         </div>
                         <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <UserCircle size={12} /> {(entry as any).teacher?.full_name}
                         </div>
                         {entry.room_number && (
                           <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <Clock size={12} /> Room: {entry.room_number}
                           </div>
                         )}
                      </div>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )
          })}
          {filtered.length === 0 && <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>No timetable slots found for this selection.</div>}
        </div>
      )}

      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); reset(); setEditing(null) }} title={editing ? 'Edit Timetable Entry' : 'Add Timetable Entry'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <Select label="Class" error={errors.class_id?.message} {...register('class_id')}>
               <option value="">Select Class</option>
               {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </Select>
             <Select label="Subject" error={errors.subject_id?.message} {...register('subject_id')}>
               <option value="">Select Subject</option>
               {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
             </Select>
          </div>
          <Select label="Teacher" error={errors.teacher_id?.message} {...register('teacher_id')}>
             <option value="">Select Teacher</option>
             {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </Select>
          <div className="grid grid-cols-3 gap-3">
             <Select label="Day" error={errors.day?.message} {...register('day')}>
               <option value="">Select Day</option>
               {DAYS.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
             </Select>
             <Input label="Start Time" type="time" error={errors.start_time?.message} {...register('start_time')} />
             <Input label="End Time" type="time" error={errors.end_time?.message} {...register('end_time')} />
          </div>
          <Input label="Room Number (optional)" placeholder="e.g. Room 101" {...register('room_number')} />
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit">Save Entry</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
