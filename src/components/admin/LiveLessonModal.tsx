'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Video, Link2, UserCheck, BookOpen, Calendar, Clock } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import toast from 'react-hot-toast'

// ── Types ────────────────────────────────────────────────────────────────────
interface TuitionEvent { id: string; name: string; start_date: string; end_date: string; is_active: boolean }
interface ClassRecord   { id: string; name: string; curriculum_id: string }
interface Subject       { id: string; name: string; curriculum_id: string }
interface TeacherOpt    { id: string; full_name: string }

interface LessonFormData {
  title: string
  class_id: string
  subject: string
  teacher_id: string
  lesson_date: string
  start_time: string
  end_time: string
  platform: string
  meeting_url: string
  host_url: string
  notes: string
  tuition_event_id: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  events: TuitionEvent[]
  classes: ClassRecord[]
  editing?: any   // existing lesson for edit mode
  defaultEventId?: string
}

const PLATFORMS = [
  { value: 'zoom',         label: '🎥 Zoom' },
  { value: 'google_meet',  label: '📹 Google Meet' },
  { value: 'teams',        label: '💼 Microsoft Teams' },
  { value: 'other',        label: '🔗 Other' },
]

const EMPTY: LessonFormData = {
  title: '', class_id: '', subject: '', teacher_id: '',
  lesson_date: '', start_time: '09:00', end_time: '10:00',
  platform: 'zoom', meeting_url: '', host_url: '', notes: '',
  tuition_event_id: '',
}

function computeWeekNumber(eventStart: string, lessonDate: string): number {
  const ms = new Date(lessonDate).getTime() - new Date(eventStart).getTime()
  return Math.max(1, Math.ceil(ms / (7 * 86400000)))
}

export default function LiveLessonModal({ isOpen, onClose, onSaved, events, classes, editing, defaultEventId }: Props) {
  const supabase = getSupabaseBrowserClient()
  const [form, setForm]       = useState<LessonFormData>(EMPTY)
  const [subjects, setSubjects]     = useState<Subject[]>([])
  const [teachers, setTeachers]     = useState<TeacherOpt[]>([])
  const [loadingSub, setLoadingSub] = useState(false)
  const [loadingTch, setLoadingTch] = useState(false)
  const [saving, setSaving]         = useState(false)

  // Populate form when editing or opening fresh
  useEffect(() => {
    if (!isOpen) return
    if (editing) {
      setForm({
        title:            editing.title ?? '',
        class_id:         editing.class_id ?? '',
        subject:          editing.subject ?? '',
        teacher_id:       editing.teacher_id ?? '',
        lesson_date:      editing.lesson_date ?? '',
        start_time:       editing.start_time?.slice(0, 5) ?? '09:00',
        end_time:         editing.end_time?.slice(0, 5) ?? '10:00',
        platform:         editing.platform ?? 'zoom',
        meeting_url:      editing.meeting_url ?? '',
        host_url:         editing.host_url ?? '',
        notes:            editing.notes ?? '',
        tuition_event_id: editing.tuition_event_id ?? defaultEventId ?? '',
      })
    } else {
      setForm({ ...EMPTY, tuition_event_id: defaultEventId ?? '' })
      setSubjects([]); setTeachers([])
    }
  }, [isOpen, editing, defaultEventId])

  // When class changes → load subjects for that class's curriculum
  useEffect(() => {
    if (!form.class_id) { setSubjects([]); setTeachers([]); return }
    const cls = classes.find(c => c.id === form.class_id)
    if (!cls?.curriculum_id) { setSubjects([]); setTeachers([]); return }
    setLoadingSub(true)
    supabase.from('subjects').select('id, name, curriculum_id')
      .eq('curriculum_id', cls.curriculum_id)
      .order('name')
      .then(({ data }) => {
        setSubjects((data ?? []) as Subject[])
        setLoadingSub(false)
      })
    setForm(f => ({ ...f, subject: '', teacher_id: '' }))
    setTeachers([])
  }, [form.class_id])

  // When subject changes → load teachers assigned to this class + subject
  useEffect(() => {
    if (!form.class_id || !form.subject) { setTeachers([]); return }
    // subject is stored as text (name), find matching subject id
    const subObj = subjects.find(s => s.name === form.subject)
    if (!subObj) { setTeachers([]); return }
    setLoadingTch(true)
    supabase
      .from('teacher_assignments')
      .select('teacher:teachers(id, full_name)')
      .eq('class_id', form.class_id)
      .eq('subject_id', subObj.id)
      .then(({ data }) => {
        const unique: TeacherOpt[] = []
        const seen = new Set<string>()
        for (const row of (data ?? []) as any[]) {
          const t = row.teacher
          if (t && !seen.has(t.id)) { seen.add(t.id); unique.push(t) }
        }
        setTeachers(unique)
        setLoadingTch(false)
      })
    setForm(f => ({ ...f, teacher_id: '' }))
  }, [form.subject, form.class_id, subjects])

  const set = (k: keyof LessonFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const selectedEvent = events.find(ev => ev.id === form.tuition_event_id)

  async function handleSave() {
    if (!form.title || !form.class_id || !form.lesson_date || !form.start_time || !form.end_time) {
      toast.error('Please fill in all required fields'); return
    }
    setSaving(true)
    const week_number = selectedEvent
      ? computeWeekNumber(selectedEvent.start_date, form.lesson_date)
      : null
    const payload = {
      title:            form.title,
      class_id:         form.class_id,
      subject:          form.subject || null,
      teacher_id:       form.teacher_id || null,
      lesson_date:      form.lesson_date,
      start_time:       form.start_time,
      end_time:         form.end_time,
      platform:         form.platform,
      meeting_url:      form.meeting_url || null,
      host_url:         form.host_url || null,
      notes:            form.notes || null,
      tuition_event_id: form.tuition_event_id || null,
      week_number,
    }
    const { error } = editing
      ? await supabase.from('live_lessons').update(payload).eq('id', editing.id)
      : await supabase.from('live_lessons').insert(payload)
    setSaving(false)
    if (error) { toast.error('Failed to save lesson'); return }
    toast.success(editing ? 'Lesson updated' : 'Lesson created')
    onSaved()
    onClose()
  }

  const selectedClass = classes.find(c => c.id === form.class_id)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit Lesson' : 'Create Live Lesson'} size="lg">
      <div className="space-y-5 py-2">

        {/* Event + Title */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Tuition Event" value={form.tuition_event_id} onChange={set('tuition_event_id')}>
            <option value="">No event</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}{ev.is_active ? ' ● Active' : ''}</option>
            ))}
          </Select>
          <Input label="Lesson Title *" value={form.title} onChange={set('title')} placeholder="e.g. Algebra Introduction" />
        </div>

        {/* Class → Subject → Teacher cascade */}
        <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--card-border)', background: 'var(--input)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(180deg,#2563EB,#1B3A5C)' }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Class → Subject → Teacher
            </span>
          </div>

          {/* Step 1: Class */}
          <Select label="Class *" value={form.class_id} onChange={set('class_id')}>
            <option value="">Select class…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          {/* Step 2: Subject (loads after class) */}
          <div>
            <Select
              label={loadingSub ? 'Loading subjects…' : `Subject${selectedClass ? ` (${selectedClass.name})` : ''}`}
              value={form.subject}
              onChange={set('subject')}
              disabled={!form.class_id || loadingSub}
            >
              <option value="">Select subject…</option>
              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </Select>
            {form.class_id && !loadingSub && subjects.length === 0 && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>No subjects found for this class's curriculum.</p>
            )}
          </div>

          {/* Step 3: Teacher (loads after subject) */}
          <div>
            <Select
              label={loadingTch ? 'Loading teachers…' : 'Teacher'}
              value={form.teacher_id}
              onChange={set('teacher_id')}
              disabled={!form.subject || loadingTch}
            >
              <option value="">Select teacher…</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </Select>
            {form.subject && !loadingTch && teachers.length === 0 && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>No teacher assigned to this class + subject.</p>
            )}
          </div>
        </div>

        {/* Date & Times */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Date *"
            type="date"
            value={form.lesson_date}
            onChange={set('lesson_date')}
            min={selectedEvent?.start_date}
            max={selectedEvent?.end_date}
          />
          <Input label="Start Time *" type="time" value={form.start_time} onChange={set('start_time')} />
          <Input label="End Time *"   type="time" value={form.end_time}   onChange={set('end_time')} />
        </div>
        {selectedEvent && form.lesson_date && (
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Week {computeWeekNumber(selectedEvent.start_date, form.lesson_date)} of {selectedEvent.name}
          </p>
        )}

        {/* Platform */}
        <Select label="Platform" value={form.platform} onChange={set('platform')}>
          {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>

        {/* Links */}
        <div className="space-y-3">
          <div>
            <Input
              label="Student Join URL"
              value={form.meeting_url}
              onChange={set('meeting_url')}
              placeholder="https://zoom.us/j/... or meet.google.com/..."
            />
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              This link is shown to students. Paste the public join link.
            </p>
          </div>
          <div>
            <Input
              label="Teacher Host / Start URL"
              value={form.host_url}
              onChange={set('host_url')}
              placeholder="Paste the link the teacher uses to START the meeting"
            />
            <div className="mt-1.5 rounded-lg p-2.5 space-y-1" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)' }}>
              <p className="text-[10px] font-black" style={{ color: '#2563EB' }}>What to paste here:</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                🎥 <strong>Zoom:</strong> In your Zoom meeting settings, copy the <em>"Start"</em> link (not the Join link). It looks like <code>https://zoom.us/s/...</code> — only the host can use it.
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                📹 <strong>Google Meet / Teams:</strong> There is only one link. The teacher who created the meeting is automatically the host. Paste the same link here as above.
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                💡 If you leave this blank, the teacher will use the student join link instead.
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Notes (optional)</label>
          <textarea
            value={form.notes} onChange={set('notes')} rows={2}
            placeholder="Any notes for students or teachers…"
            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Lesson'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
