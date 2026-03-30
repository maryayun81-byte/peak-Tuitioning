'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Trash2, Edit, Calendar, UserCircle, School,
  AlertTriangle, DoorOpen, ChevronLeft, ChevronRight,
  Globe, EyeOff, FileText, CheckCircle2, XCircle, Filter
} from 'lucide-react'
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
import type { Timetable, Class, Subject, Teacher, Curriculum, TeacherAssignment } from '@/types/database'
import { TimetablePDF } from '@/components/admin/TimetablePDF'
import { exportTimetableToPDF } from '@/lib/export/timetableExport'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_COLORS: Record<string, string> = {
  Monday: 'from-blue-500/20 to-blue-400/5 border-blue-500/30',
  Tuesday: 'from-violet-500/20 to-violet-400/5 border-violet-500/30',
  Wednesday: 'from-emerald-500/20 to-emerald-400/5 border-emerald-500/30',
  Thursday: 'from-amber-500/20 to-amber-400/5 border-amber-500/30',
  Friday: 'from-rose-500/20 to-rose-400/5 border-rose-500/30',
}
const DAY_TEXT: Record<string, string> = {
  Monday: 'text-blue-400', Tuesday: 'text-violet-400',
  Wednesday: 'text-emerald-400', Thursday: 'text-amber-400', Friday: 'text-rose-400',
}
const STATUS_CONFIG = {
  published:   { label: 'Published',   color: 'success',  icon: <CheckCircle2 size={12} /> },
  draft:       { label: 'Draft',       color: 'muted',    icon: <FileText size={12} /> },
  unpublished: { label: 'Unpublished', color: 'warning',  icon: <XCircle size={12} /> },
} as const

const schema = z.object({
  class_id:         z.string().uuid({ message: 'Select a class' }),
  subject_id:       z.string().uuid({ message: 'Select a subject' }),
  teacher_id:       z.string().uuid({ message: 'Select a teacher' }),
  tuition_event_id: z.string().uuid({ message: 'Select a tuition event' }),
  tuition_center_id: z.string().optional().nullable(),
  day:              z.string().min(1, 'Select a day'),
  start_time:       z.string().min(1, 'Set a start time'),
  end_time:         z.string().min(1, 'Set an end time'),
  room_number:      z.string().optional(),
})
type FormData = z.infer<typeof schema>

function timesOverlap(s1: string, e1: string, s2: string, e2: string) {
  return s1 < e2 && s2 < e1
}

export default function AdminTimetables() {
  const supabase = getSupabaseBrowserClient()
  const [timetables, setTimetables]     = useState<Timetable[]>([])
  const [classes, setClasses]           = useState<Class[]>([])
  const [subjects, setSubjects]         = useState<Subject[]>([])
  const [teachers, setTeachers]         = useState<Teacher[]>([])
  const [curriculums, setCurriculums]   = useState<Curriculum[]>([])
  const [tuitionEvents, setTuitionEvents] = useState<{ id: string; name: string; status: string }[]>([])
  const [centers, setCenters]             = useState<any[]>([])
  const [assignments, setAssignments]     = useState<TeacherAssignment[]>([])
  const [loading, setLoading]           = useState(true)
  const [addOpen, setAddOpen]           = useState(false)
  const [editing, setEditing]           = useState<Timetable | null>(null)
  const [saving, setSaving] = useState(false)
  const [mobileDay, setMobileDay]       = useState(0)
  const [exporting, setExporting]       = useState(false)
  
  // PDF Rendering State (Current Class to Export)
  const [pdfClass, setPdfClass] = useState<{ name: string; id: string; curriculum_id: string } | null>(null)
  const [pdfSessions, setPdfSessions] = useState<Timetable[]>([])

  // Persistent ref so openAdd always has the active event id even before state settles
  const activeEventIdRef = useRef<string | null>(null)

  // Filters – smart defaults applied after data loads
  const [filterCurriculum, setFilterCurriculum] = useState('')
  const [filterClass, setFilterClass]           = useState('')
  const [filterEvent, setFilterEvent]           = useState('')
  const [filterCenter, setFilterCenter]         = useState('')
  const defaultsApplied = useRef(false)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const watchDay       = watch('day')
  const watchClassId   = watch('class_id')
  const watchSubjectId = watch('subject_id')
  const watchTeacherId = watch('teacher_id')
  const watchStart     = watch('start_time')
  const watchEnd       = watch('end_time')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, cRes, sRes, teRes, evRes, curRes, asRes, cenRes] = await Promise.all([
        supabase.from('timetables')
          .select('*, class:classes(name, curriculum_id), subject:subjects(name), teacher:teachers(full_name), center:tuition_centers(name)')
          .order('day').order('start_time'),
        supabase.from('classes').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('teachers').select('*').order('full_name'),
        supabase.from('tuition_events').select('id, name, status').order('name'),
        supabase.from('curriculums').select('*').order('name'),
        supabase.from('teacher_assignments').select('*, teacher:teachers(full_name), class:classes(name), subject:subjects(name)'),
        supabase.from('tuition_centers').select('*').order('name'),
      ])
      const events   = evRes.data ?? []
      const curList  = curRes.data ?? []

      setTimetables(tRes.data ?? [])
      setClasses(cRes.data ?? [])
      setSubjects(sRes.data ?? [])
      setTeachers(teRes.data ?? [])
      setTuitionEvents(events)
      setCurriculums(curList)
      setAssignments(asRes.data ?? [])
      setCenters(cenRes.data ?? [])

      // Store active event id in ref so form can use it reliably
      const activeEvent = events.find((e: any) => e.status === 'active')
      activeEventIdRef.current = activeEvent?.id ?? null

      // Apply smart filter defaults once on first load
      if (!defaultsApplied.current) {
        defaultsApplied.current = true
        if (activeEvent?.id) setFilterEvent(activeEvent.id)
        // Default curriculum: find '8-4-4' (case-insensitive) or first one
        const cur844 = curList.find((c: any) => c.name.toLowerCase().includes('8-4-4') || c.name.toLowerCase().includes('844'))
          ?? curList[0]
        if (cur844?.id) setFilterCurriculum(cur844.id)
      }
    } catch {
      toast.error('Failed to load timetables')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Filtered timetables
  const filtered = timetables.filter(t => {
    const cls = t as any
    if (filterCurriculum && cls.class?.curriculum_id !== filterCurriculum) return false
    if (filterClass && t.class_id !== filterClass) return false
    if (filterEvent && t.tuition_event_id !== filterEvent) return false
    if (filterCenter && t.tuition_center_id !== filterCenter) return false
    return true
  })

  const groupedByDay = DAYS.reduce((acc, day) => {
    acc[day] = filtered
      .filter(t => t.day.toLowerCase() === day.toLowerCase())
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
    return acc
  }, {} as Record<string, Timetable[]>)

  // Conflict detection
  const getConflicts = (data: FormData): string[] => {
    const conflicts: string[] = []
    const existing = timetables.filter(t =>
      t.day.toLowerCase() === data.day.toLowerCase() && t.id !== editing?.id
    )
    const classConflict = existing.find(t =>
      t.class_id === data.class_id &&
      timesOverlap(data.start_time, data.end_time, t.start_time, t.end_time)
    )
    if (classConflict)
      conflicts.push(`This class already has a session at ${classConflict.start_time}–${classConflict.end_time}`)
    const teacherConflict = existing.find(t =>
      t.teacher_id === data.teacher_id &&
      timesOverlap(data.start_time, data.end_time, t.start_time, t.end_time)
    )
    if (teacherConflict) {
      const tc = teachers.find(t => t.id === data.teacher_id)
      conflicts.push(`${tc?.full_name ?? 'This teacher'} is already scheduled at that time`)
    }
    return conflicts
  }

  const inlineConflicts = watchDay && watchClassId && watchTeacherId && watchStart && watchEnd
    ? getConflicts({ class_id: watchClassId, subject_id: '', teacher_id: watchTeacherId, tuition_event_id: '', day: watchDay, start_time: watchStart, end_time: watchEnd })
    : []

  const roster = watchClassId
    ? assignments.filter(a => a.class_id === watchClassId)
    : []
  
  const suggestedAssignment = watchClassId && watchSubjectId
    ? roster.find(a => a.subject_id === watchSubjectId)
    : null

  const onSubmit = async (data: FormData) => {
    if (!editing) {
      const c = getConflicts(data)
      if (c.length > 0) { c.forEach(msg => toast.error(msg, { duration: 5000, icon: '⚠️' })); return }
    }
    setSaving(true)
    const payload = { ...data, status: 'draft' }
    const { error } = editing
      ? await supabase.from('timetables').update(data).eq('id', editing.id)
      : await supabase.from('timetables').insert(payload)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(editing ? 'Session updated!' : 'Session saved as draft!')
    reset(); setEditing(null); setAddOpen(false); load()
  }

  const setStatus = async (id: string, status: 'published' | 'draft' | 'unpublished') => {
    const { error } = await supabase.from('timetables').update({ status }).eq('id', id)
    if (error) { toast.error(error.message); return }
    const labels: Record<string, string> = { published: 'Published ✅', draft: 'Moved to Draft', unpublished: 'Unpublished' }
    toast.success(labels[status])
    load()
  }

  const del = async (id: string) => {
    const { error } = await supabase.from('timetables').delete().eq('id', id)
    if (error) { toast.error('Delete failed'); return }
    toast.success('Session deleted'); load()
  }

  const exportSingleClass = async (targetClassId: string) => {
    const cls = classes.find(c => c.id === targetClassId)
    if (!cls) return

    setExporting(true)
    const sessions = timetables.filter(t => t.class_id === targetClassId)
    const curriculum = curriculums.find(c => c.id === (cls as any).curriculum_id)

    setPdfClass(cls as any)
    setPdfSessions(sessions)

    // Small delay to ensure the component renders in the hidden area
    toast.loading('Preparing PDF...', { id: 'pdf-gen' })
    await new Promise(r => setTimeout(r, 800))

    try {
      const fileName = `${cls.name.replace(/\s+/g, '_')}_Timetable.pdf`
      await exportTimetableToPDF('timetable-pdf-content', fileName)
      toast.success('Timetable exported!', { id: 'pdf-gen' })
    } catch (err) {
      toast.error('Failed to generate PDF', { id: 'pdf-gen' })
    } finally {
      setPdfClass(null)
      setPdfSessions([])
      setExporting(false)
    }
  }

  const exportCurriculum = async () => {
    if (!filterCurriculum) {
      toast.error('Please select a curriculum first')
      return
    }

    const curriculum = curriculums.find(c => c.id === filterCurriculum)
    const targetClasses = classes.filter(c => (c as any).curriculum_id === filterCurriculum)

    if (targetClasses.length === 0) {
      toast.error('No classes found in this curriculum')
      return
    }

    setExporting(true)
    toast.loading(`Exporting ${targetClasses.length} timetables...`, { id: 'pdf-gen' })

    try {
      for (const cls of targetClasses) {
        const sessions = timetables.filter(t => t.class_id === cls.id)
        
        setPdfClass(cls as any)
        setPdfSessions(sessions)

        // Wait for render
        await new Promise(r => setTimeout(r, 600))
        
        const fileName = `${cls.name.replace(/\s+/g, '_')}_Timetable.pdf`
        await exportTimetableToPDF('timetable-pdf-content', fileName)
        
        // Brief pause to avoid browser block on multiple downloads
        await new Promise(r => setTimeout(r, 200))
      }
      toast.success('All timetables exported!', { id: 'pdf-gen' })
    } catch (err) {
      console.error(err)
      toast.error('Batch export interupted', { id: 'pdf-gen' })
    } finally {
      setPdfClass(null)
      setPdfSessions([])
      setExporting(false)
    }
  }

  const openEdit = (entry: Timetable) => {
    setEditing(entry)
    reset({
      class_id: entry.class_id, subject_id: entry.subject_id,
      teacher_id: entry.teacher_id, tuition_event_id: entry.tuition_event_id,
      tuition_center_id: entry.tuition_center_id || '',
      day: entry.day, start_time: entry.start_time, end_time: entry.end_time,
      room_number: entry.room_number ?? '',
    })
    setAddOpen(true)
  }

  const openAdd = () => {
    // Reset the form and immediately inject the active tuition event from the ref
    reset({ tuition_event_id: activeEventIdRef.current ?? '' })
    setEditing(null)
    setAddOpen(true)
  }

  const filteredClasses = filterCurriculum
    ? classes.filter(c => (c as any).curriculum_id === filterCurriculum)
    : classes

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Timetable Manager</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Create sessions, manage publishing, and prevent scheduling conflicts
          </p>
        </div>
        <div className="flex gap-2">
          {filterCurriculum && (
            <Button variant="secondary" onClick={exportCurriculum} disabled={exporting}>
               <FileText size={16} className="mr-2" /> Export Curriculum
            </Button>
          )}
          {filterClass && (
            <Button variant="secondary" onClick={() => exportSingleClass(filterClass)} disabled={exporting}>
               <FileText size={16} className="mr-2" /> Export Class PDF
            </Button>
          )}
          <Button onClick={openAdd}><Plus size={16} /> Add Session</Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-muted" />
          <span className="text-xs font-black uppercase tracking-widest text-muted">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Select value={filterCurriculum} onChange={e => { setFilterCurriculum(e.target.value); setFilterClass('') }}>
            <option value="">All Curriculums</option>
            {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
            <option value="">All Tuition Events</option>
            {tuitionEvents.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          <Select value={filterCenter} onChange={e => setFilterCenter(e.target.value)}>
            <option value="">All Centers</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Badge variant="muted">{filtered.length} session{filtered.length !== 1 ? 's' : ''}</Badge>
          <Badge variant="success">{filtered.filter(t => t.status === 'published').length} published</Badge>
          <Badge variant="muted">{filtered.filter(t => t.status === 'draft').length} draft</Badge>
          {(filterCurriculum || filterClass || filterEvent || filterCenter) && (
            <button onClick={() => { setFilterCurriculum(''); setFilterClass(''); setFilterEvent(''); setFilterCenter('') }}
              className="text-xs text-primary underline ml-2">Clear filters</button>
          )}
        </div>
      </Card>

      {loading ? <SkeletonList count={5} /> : (
        <>
          {/* === DESKTOP GRID === */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--card-border)]">
            <div className="grid min-w-[700px]" style={{ gridTemplateColumns: `repeat(${DAYS.length}, 1fr)` }}>
              {DAYS.map(day => (
                <div key={day} className={`px-4 py-3 border-b border-[var(--card-border)] bg-gradient-to-b ${DAY_COLORS[day]} sticky top-0`}>
                  <div className={`text-xs font-black uppercase tracking-widest ${DAY_TEXT[day]}`}>{day}</div>
                  <div className={`text-[10px] mt-0.5 font-bold opacity-60 ${day === today ? 'text-primary' : 'text-muted'}`}>
                    {day === today ? 'Today' : `${groupedByDay[day].length} sessions`}
                  </div>
                </div>
              ))}
              {DAYS.map(day => (
                <div key={day} className={`p-2 border-r last:border-r-0 border-[var(--card-border)] space-y-2 min-h-[180px] bg-gradient-to-b ${DAY_COLORS[day]}`}>
                  {groupedByDay[day].length === 0
                    ? <div className="flex items-center justify-center h-16 text-[10px] text-muted opacity-40">No sessions</div>
                    : groupedByDay[day].map(entry => (
                      <SessionBlock key={entry.id} entry={entry} teachers={teachers}
                        onEdit={openEdit} onDelete={del} onSetStatus={setStatus} />
                    ))}
                </div>
              ))}
            </div>
          </div>

          {/* === MOBILE DAY VIEW === */}
          <div className="md:hidden space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setMobileDay(d => Math.max(0, d - 1))} disabled={mobileDay === 0}
                className="p-2 rounded-xl border border-[var(--card-border)] disabled:opacity-30"
                style={{ background: 'var(--card)' }}>
                <ChevronLeft size={16} />
              </button>
              <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-none">
                {DAYS.map((day, i) => (
                  <button key={day} onClick={() => setMobileDay(i)}
                    className={`px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-colors ${i === mobileDay ? 'bg-primary text-white' : 'border border-[var(--card-border)] text-muted'}`}
                    style={i !== mobileDay ? { background: 'var(--card)' } : {}}>
                    {day}{day === today ? ' ●' : ''}
                  </button>
                ))}
              </div>
              <button onClick={() => setMobileDay(d => Math.min(DAYS.length - 1, d + 1))} disabled={mobileDay === DAYS.length - 1}
                className="p-2 rounded-xl border border-[var(--card-border)] disabled:opacity-30"
                style={{ background: 'var(--card)' }}>
                <ChevronRight size={16} />
              </button>
            </div>
            <div className={`space-y-3 p-4 rounded-2xl border bg-gradient-to-b ${DAY_COLORS[DAYS[mobileDay]]}`}>
              <div className={`text-sm font-black uppercase tracking-widest ${DAY_TEXT[DAYS[mobileDay]]}`}>
                {DAYS[mobileDay]}{DAYS[mobileDay] === today ? ' — Today' : ''}
              </div>
              {groupedByDay[DAYS[mobileDay]].length === 0
                ? <div className="text-sm text-muted py-6 text-center">No sessions scheduled</div>
                : groupedByDay[DAYS[mobileDay]].map(entry => (
                  <SessionBlock key={entry.id} entry={entry} mobile teachers={teachers}
                    onEdit={openEdit} onDelete={del} onSetStatus={setStatus} />
                ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No sessions found</p>
              <p className="text-xs mt-1 opacity-60">Try adjusting filters or add a new session</p>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); reset(); setEditing(null) }}
        title={editing ? 'Edit Session' : 'New Timetable Session'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!editing && inlineConflicts.length > 0 && (
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1">
              {inlineConflicts.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-400">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {c}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form Fields */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Class *" error={errors.class_id?.message} {...register('class_id')}>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Select label="Subject *" error={errors.subject_id?.message} {...register('subject_id')}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>

              <div className="space-y-2">
                <Select label="Teacher *" error={errors.teacher_id?.message} {...register('teacher_id')}>
                  <option value="">Select Teacher</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </Select>
                
                {suggestedAssignment && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-2 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-full bg-primary text-white"><CheckCircle2 size={12} /></div>
                      <span className="text-[10px] font-bold text-primary">Suggested: {(suggestedAssignment as any).teacher?.full_name}</span>
                    </div>
                    <button type="button" onClick={() => setValue('teacher_id', suggestedAssignment.teacher_id)}
                      className="text-[10px] font-black text-primary hover:underline px-2">Use Suggested</button>
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Tuition Event *" error={errors.tuition_event_id?.message} {...register('tuition_event_id')}>
                  <option value="">Select Tuition Event</option>
                  {tuitionEvents.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name}{e.status === 'active' ? ' ✓ Active' : ''}
                    </option>
                  ))}
                </Select>
                <Select label="Tuition Center" {...register('tuition_center_id')}>
                  <option value="">All Centers (Default)</option>
                  {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Select label="Day *" error={errors.day?.message} {...register('day')}>
                  <option value="">Select Day</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
                <Input label="Start *" type="time" error={errors.start_time?.message} {...register('start_time')} />
                <Input label="End *" type="time" error={errors.end_time?.message} {...register('end_time')} />
              </div>

              <Input label="Room Number" placeholder="e.g. Room 101 or Online" {...register('room_number')} />
            </div>

            {/* Sidebar Reference */}
            <div className="space-y-4 border-l border-[var(--card-border)] pl-6 hidden md:block">
              <div className="flex items-center gap-2 text-muted uppercase tracking-widest text-[10px] font-black">
                <UserCircle size={14} /> Teacher Roster
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                {!watchClassId ? (
                  <p className="text-[10px] text-muted italic">Select a class to see assigned teachers.</p>
                ) : roster.length === 0 ? (
                  <p className="text-[10px] text-muted italic">No teachers assigned to this class yet.</p>
                ) : roster.map(a => (
                  <div key={a.id} className="p-2 rounded-lg bg-[var(--input)] border border-transparent hover:border-primary/20 transition-all cursor-pointer"
                    onClick={() => setValue('teacher_id', a.teacher_id)}>
                    <div className="text-[10px] font-black" style={{ color: 'var(--text)' }}>{(a as any).teacher?.full_name}</div>
                    <div className="text-[9px] text-muted flex items-center justify-between">
                      <span>{(a as any).subject?.name}</span>
                      {a.is_class_teacher && <Badge variant="primary" className="!text-[7px] !px-1">Class Tr</Badge>}
                    </div>
                  </div>
                ))}
              </div>

              {watchClassId && (
                <div className="pt-2">
                  <p className="text-[8px] text-muted leading-tight">Click a teacher to assign them to this session.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-[var(--card-border)]">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={saving}>{editing ? 'Update Session' : 'Save as Draft'}</Button>
          </div>
        </form>
      </Modal>

      {/* Hidden PDF Render Area */}
      {pdfClass && (
        <TimetablePDF 
          className={pdfClass.name}
          curriculumName={curriculums.find(c => c.id === pdfClass.curriculum_id)?.name || ''}
          termInfo="Current Term 2026"
          sessions={pdfSessions}
        />
      )}
    </div>
  )
}

// ============================================================
// Session Block
// ============================================================
interface SBProps {
  entry: Timetable
  teachers: Teacher[]
  onEdit: (e: Timetable) => void
  onDelete: (id: string) => void
  onSetStatus: (id: string, s: 'published' | 'draft' | 'unpublished') => void
  mobile?: boolean
}

function SessionBlock({ entry, teachers: _teachers, onEdit, onDelete, onSetStatus, mobile }: SBProps) {
  const status = entry.status ?? 'draft'
  const sc = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={`group relative rounded-xl border border-[var(--card-border)] p-3 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 ${mobile ? 'flex items-start gap-3' : ''}`}
      style={{ background: 'var(--card)' }}>

      <div className={mobile ? 'shrink-0' : 'mb-2 flex items-center justify-between'}>
        <div className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md inline-block whitespace-nowrap">
          {entry.start_time} – {entry.end_time}
        </div>
        {!mobile && (
          <Badge variant={sc.color as any} className="text-[9px] !py-0 !px-1.5 flex items-center gap-0.5">
            {sc.icon}{sc.label}
          </Badge>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-black text-sm truncate" style={{ color: 'var(--text)' }}>
          {(entry as any).subject?.name}
        </h4>
        <div className="flex items-center gap-1 text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
          <UserCircle size={10} className="shrink-0" /><span className="truncate">{(entry as any).teacher?.full_name}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
          <School size={10} className="shrink-0" /><span className="truncate">{(entry as any).class?.name}</span>
          {(entry as any).center?.name && (
            <><span className="mx-1 opacity-40">•</span><span className="truncate">{(entry as any).center.name}</span></>
          )}
        </div>
        {entry.room_number && (
          <div className="flex items-center gap-1 text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            <DoorOpen size={10} className="shrink-0" />{entry.room_number}
          </div>
        )}
        {mobile && (
          <Badge variant={sc.color as any} className="text-[9px] !py-0 !px-1.5 inline-flex items-center gap-0.5 mt-1">
            {sc.icon}{sc.label}
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className={`${mobile ? 'shrink-0 flex flex-col gap-1.5' : 'flex flex-col gap-1 mt-3 pt-3 border-t border-[var(--card-border)]'}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(entry)} title="Edit Session"
            className="flex-1 flex items-center justify-center p-2 rounded-xl bg-[var(--input)] text-muted hover:text-primary transition-all">
            <Edit size={14} />
          </button>
          
          {status !== 'published' && (
            <button onClick={() => onSetStatus(entry.id, 'published')} title="Publish to Class"
              className="flex-1 flex items-center justify-center p-2 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all">
              <Globe size={14} />
            </button>
          )}
          
          {status === 'published' && (
            <button onClick={() => onSetStatus(entry.id, 'unpublished')} title="Unpublish (Hide)"
              className="flex-1 flex items-center justify-center p-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all">
              <EyeOff size={14} />
            </button>
          )}

          {status !== 'draft' && (
            <button onClick={() => onSetStatus(entry.id, 'draft')} title="Move to Draft"
              className="flex-1 flex items-center justify-center p-2 rounded-xl bg-[var(--input)] text-muted hover:text-primary transition-all">
              <FileText size={14} />
            </button>
          )}

          <button onClick={() => onDelete(entry.id)} title="Delete Session"
            className="flex-1 flex items-center justify-center p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
