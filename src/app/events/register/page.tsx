'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpenCheck, GraduationCap, Loader2, Sparkles, UsersRound, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { getPublicRegistrationCounts, processPublicRegistration } from '@/app/actions/event-registration'

type CurriculumOption = { id: string; name: string }
type ClassOption = { id: string; name: string; curriculum_id: string; level?: number | null }
type SubjectOption = { id: string; name: string; curriculum_id: string; class_id?: string | null }
type RegistrationSlot = {
  eventId: string
  curriculum: string
  curriculumId: string
  classLevel: string
  classId: string
  capacity: number
  registered: number
  remaining: number
}

function formatEventCharge(event?: any) {
  if (!event) return 'Select a programme to see charges'
  const amount = Number(event.charge_amount)
  if (!Number.isFinite(amount) || amount <= 0) return 'Fee breakdown available'
  const unit = event.charge_unit_label || event.charge_frequency?.replace(/_/g, ' ') || 'per programme'
  return `${event.charge_currency || 'KES'} ${amount.toLocaleString()} ${unit}`
}

function formatSessionTime(event?: any) {
  if (!event?.session_start_time && !event?.session_end_time) return 'Time to be confirmed'
  const start = String(event.session_start_time || '').slice(0, 5)
  const end = String(event.session_end_time || '').slice(0, 5)
  return [start, end].filter(Boolean).join(' - ')
}

const GRADES: Record<string, string[]> = {
  academic: ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E', 'Not Yet Graded'],
  cbc: ['Exceeding Expectations', 'Meeting Expectations', 'Approaching Expectations', 'Below Expectations', 'Not Yet Assessed'],
}

const STRUGGLE_HINTS: Record<string, string> = {
  Mathematics: 'I struggle with algebra, graphs, word problems, and remembering formulas.',
  Chemistry: 'I struggle with mole concept, organic chemistry, electrochemistry, and writing equations.',
  English: 'I struggle with grammar, essays, set books, and comprehension.',
  'Integrated Science': 'I struggle with experiments, explaining answers, and remembering key terms.',
  Physics: 'I struggle with equations, electricity, waves, and interpreting diagrams.',
  Biology: 'I struggle with genetics, classification, and explaining biological processes.',
}

function isSupportedCurriculum(name = '') {
  const normalized = name.toLowerCase().replace(/\s/g, '')
  return normalized.includes('cbc') || normalized.includes('8-4-4') || normalized.includes('844')
}

function gradeOptions(curriculum: string) {
  return curriculum.toLowerCase().includes('cbc') ? GRADES.cbc : GRADES.academic
}

function improveStruggle(subject: string, text: string) {
  const lower = text.toLowerCase()
  if (subject.toLowerCase().includes('math') || lower.includes('graph')) {
    return 'I struggle with drawing and interpreting graphs, especially finding gradients, equations of lines, intercepts, and choosing the correct formula.'
  }
  if (subject.toLowerCase().includes('chem')) {
    return 'I struggle with mole concept, electrochemistry, organic chemistry, balancing equations, and explaining reactions using correct scientific terms.'
  }
  if (subject.toLowerCase().includes('english')) {
    return 'I struggle with grammar accuracy, essay structure, comprehension questions, set book analysis, and expressing answers clearly.'
  }
  return text.trim()
    ? `I need support in ${subject}, especially with ${text.trim()}.`
    : STRUGGLE_HINTS[subject] || `I need help identifying my weak areas in ${subject}.`
}

export default function EventRegistrationPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [events, setEvents] = useState<any[]>([])
  const [curriculums, setCurriculums] = useState<CurriculumOption[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [registrationSlots, setRegistrationSlots] = useState<RegistrationSlot[]>([])
  const [form, setForm] = useState({
    student_full_name: '',
    parent_name: '',
    parent_phone: '',
    student_phone: '',
    school_name: '',
    curriculum: '',
    class_level: '',
    event_id: '',
    programme_selected: '',
    preferred_mode: '',
    overall_grade: '',
  })
  const [subjectResults, setSubjectResults] = useState<Array<{ subjectName: string; grade: string; struggle: string }>>([])

  useEffect(() => {
    const load = async () => {
      const [eventRes, curriculumRes, classRes, subjectRes, countsRes] = await Promise.all([
        supabase
          .from('tuition_events')
          .select('id, name, start_date, end_date, status, is_active, charge_amount, charge_currency, charge_frequency, charge_unit_label, pricing_note, event_location, session_start_time, session_end_time')
          .in('status', ['active', 'upcoming'])
          .order('start_date', { ascending: true }),
        supabase.from('curriculums').select('id, name').order('name'),
        supabase.from('classes').select('id, name, curriculum_id, level').order('level').order('name'),
        supabase.from('subjects').select('id, name, curriculum_id, class_id').order('name'),
        getPublicRegistrationCounts(),
      ])

      const loadedEvents = eventRes.data || []
      const configuredCurriculums = (curriculumRes.data || []).filter((item: any) => isSupportedCurriculum(item.name))
      setEvents(loadedEvents)
      setCurriculums(configuredCurriculums)
      setClasses(classRes.data || [])
      setSubjects(subjectRes.data || [])
      setRegistrationSlots(countsRes.success ? (countsRes.slots || []) as RegistrationSlot[] : [])

      const params = new URLSearchParams(window.location.search)
      const eventId = params.get('eventId')
      const shortEventId = params.get('e')
      const programme = params.get('programme')
      const selected = loadedEvents.find((event) => event.id === eventId)
        || loadedEvents.find((event) => shortEventId && String(event.id).startsWith(shortEventId))
        || loadedEvents[0]

      setForm((prev) => ({
        ...prev,
        event_id: selected?.id || '',
        programme_selected: programme || selected?.name || '',
      }))
      setLoading(false)
    }
    load()
  }, [supabase])

  const selectedCurriculum = curriculums.find((item) => item.name === form.curriculum)
  const classOptions = selectedCurriculum
    ? classes.filter((item) => item.curriculum_id === selectedCurriculum.id)
    : []
  const curriculumSubjects = selectedCurriculum
    ? subjects.filter((item) => item.curriculum_id === selectedCurriculum.id)
    : []
  const classSpecificSubjects = selectedClassId
    ? curriculumSubjects.filter((item) => item.class_id === selectedClassId)
    : []
  const availableSubjects = selectedCurriculum && selectedClassId
    ? (classSpecificSubjects.length > 0 ? classSpecificSubjects : curriculumSubjects.filter((item) => !item.class_id))
    : []
  const grades = gradeOptions(form.curriculum)

  useEffect(() => {
    setForm((prev) => ({ ...prev, class_level: '', overall_grade: '' }))
    setSelectedClassId('')
    setSubjectResults([])
  }, [form.curriculum])

  useEffect(() => {
    setSubjectResults([])
  }, [selectedClassId])

  const selectedEventName = useMemo(() => {
    return events.find((event) => event.id === form.event_id)?.name || form.programme_selected
  }, [events, form.event_id, form.programme_selected])
  const selectedEvent = useMemo(() => {
    return events.find((event) => event.id === form.event_id)
  }, [events, form.event_id])
  const selectedSlotRows = useMemo(() => {
    return registrationSlots
      .filter((item) => !form.event_id || item.eventId === form.event_id)
      .sort((a, b) => b.remaining - a.remaining)
  }, [registrationSlots, form.event_id])
  const selectedRemainingTotal = selectedSlotRows.reduce((sum, item) => sum + item.remaining, 0)
  const selectedClassSlot = selectedClassId
    ? selectedSlotRows.find((item) => item.classId === selectedClassId)
    : undefined
  const selectedEventHasSlots = selectedSlotRows.length > 0

  const toggleSubject = (subjectName: string) => {
    setSubjectResults((prev) => prev.some((item) => item.subjectName === subjectName)
      ? prev.filter((item) => item.subjectName !== subjectName)
      : [...prev, { subjectName, grade: '', struggle: '' }]
    )
  }

  const updateSubject = (subjectName: string, patch: Partial<{ grade: string; struggle: string }>) => {
    setSubjectResults((prev) => prev.map((item) => item.subjectName === subjectName ? { ...item, ...patch } : item))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (subjectResults.length === 0) return toast.error('Select at least one subject.')
    if (selectedClassSlot && selectedClassSlot.remaining <= 0) {
      return toast.error(`${form.curriculum} ${form.class_level} is full for this programme. Please choose another available class or contact Peak Performance.`)
    }
    setSubmitting(true)
    const payload = new FormData()
    Object.entries({ ...form, programme_selected: selectedEventName }).forEach(([key, value]) => payload.append(key, value))
    payload.append('subject_results', JSON.stringify(subjectResults))
    const result = await processPublicRegistration(payload)
    setSubmitting(false)
    if (!result.success) return toast.error(result.error || 'Registration failed')
    const message = result.message || 'Registration received successfully. Peak Performance will review your academic details and contact you with the next steps.'
    toast.success(message, { duration: 6000 })
    router.push('/')
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff4ff_0,#f6fbff_34%,#eef7f0_100%)] px-4 py-8 text-slate-950 md:py-12">
      <Link href="/" className="mx-auto mb-6 flex max-w-6xl items-center gap-2 text-sm font-black text-[#145da0]"><ArrowLeft size={16} /> Back to Peak Performance</Link>
      <form onSubmit={submit} className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="h-fit overflow-hidden rounded-[2.2rem] bg-[#062744] text-white shadow-[0_30px_80px_rgba(7,49,89,0.22)] lg:sticky lg:top-6">
          <div className="relative p-6 md:p-8">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#7ed957]/20 blur-2xl" />
            <div className="absolute -bottom-20 left-8 h-52 w-52 rounded-full bg-[#32b7ff]/20 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#bff8a7]">
                <Sparkles size={14} /> Academic Intake
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight">Programme Registration</h1>
              <p className="mt-3 text-sm leading-relaxed text-white/72">A premium learner profile for teachers: curriculum, class, recent performance, and exactly where support is needed.</p>
              <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-widest text-white/50">Selected programme</p>
                <p className="mt-1 text-lg font-black">{selectedEventName || 'Choose a programme'}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Location</p>
                    <p className="mt-1 font-black">{selectedEvent?.event_location || 'To be confirmed'}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Time</p>
                    <p className="mt-1 font-black">{formatSessionTime(selectedEvent)}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl bg-[#7ed957]/15 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#bff8a7]">Charges</p>
                  <p className="mt-1 text-sm font-black">{formatEventCharge(selectedEvent)}</p>
                  {selectedEvent?.pricing_note && <p className="mt-1 text-xs leading-5 text-white/60">{selectedEvent.pricing_note}</p>}
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#7ed957] text-[#073159] shadow-lg shadow-[#7ed957]/20">
                    <UsersRound size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Available places</p>
                    <div className="mt-1 flex items-end gap-2">
                      <span className="text-4xl font-black leading-none text-white">{selectedEventHasSlots ? selectedRemainingTotal : 'Open'}</span>
                      <span className="pb-1 text-xs font-black uppercase tracking-[0.14em] text-[#bff8a7]">
                        {selectedEventHasSlots ? (selectedRemainingTotal === 1 ? 'slot remaining' : 'slots remaining') : 'registration'}
                      </span>
                    </div>
                  </div>
                </div>
                {selectedSlotRows.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    {selectedSlotRows.slice(0, 8).map((item) => (
                      <div key={`${item.eventId}-${item.curriculum}-${item.classLevel}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
                        <span className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.13em] text-white/82">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${item.remaining > 0 ? 'bg-[#7ed957]' : 'bg-rose-400'}`} />
                          <span className="truncate">{item.curriculum} · {item.classLevel}</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${item.remaining > 0 ? 'bg-white text-[#073159]' : 'bg-rose-100 text-rose-700'}`}>
                          {item.remaining > 0 ? `${item.remaining} left` : 'Full'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs leading-5 text-white/55">Slots are being confirmed. Submit your details and Peak Performance will advise on availability.</p>
                )}
              </div>
              <div className="mt-5 grid gap-3 text-sm">
                {[
                  ['1', 'Student and parent details'],
                  ['2', 'Curriculum and class'],
                  ['3', 'Subject performance'],
                ].map(([step, label]) => (
                  <div key={step} className="flex items-center gap-3 rounded-2xl bg-white/8 p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-black text-[#073159]">{step}</span>
                    <span className="font-bold text-white/85">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="space-y-5">
          <section className="rounded-[2rem] border border-white bg-white/90 p-5 shadow-[0_18px_55px_rgba(7,49,89,0.08)] backdrop-blur md:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e9f8e2] text-[#2f8517]"><GraduationCap size={22} /></div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#145da0]">Step 1</p>
                <h2 className="text-xl font-black">Student Details</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Input required placeholder="Student full name" value={form.student_full_name} onChange={(e) => setForm({ ...form, student_full_name: e.target.value })} />
              <Input required placeholder="Parent/guardian name" value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} />
              <Input required placeholder="Parent/guardian phone number" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
              <Input placeholder="Student phone number (optional)" value={form.student_phone} onChange={(e) => setForm({ ...form, student_phone: e.target.value })} />
              <Input required placeholder="School name" value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} />
              <Select required value={form.preferred_mode} onChange={(e) => setForm({ ...form, preferred_mode: e.target.value })}>
                <option value="">Preferred learning mode</option>
                <option value="Physical">Physical</option>
                <option value="Online">Online</option>
                <option value="Hybrid">Hybrid</option>
              </Select>
              <Select required value={form.event_id} onChange={(e) => {
                const chosen = events.find((item) => item.id === e.target.value)
                setForm({ ...form, event_id: e.target.value, programme_selected: chosen?.name || form.programme_selected })
              }}>
                <option value="">Programme selected</option>
                {events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white bg-white/90 p-5 shadow-[0_18px_55px_rgba(7,49,89,0.08)] backdrop-blur md:p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf3f8] text-[#145da0]"><BookOpenCheck size={22} /></div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#145da0]">Step 2</p>
                <h2 className="text-xl font-black">Curriculum & Overall Performance</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Select required value={form.curriculum} onChange={(e) => setForm({ ...form, curriculum: e.target.value })}>
                <option value="">Curriculum</option>
                {curriculums.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </Select>
              <Select required value={selectedClassId} disabled={!selectedCurriculum} onChange={(e) => {
                const chosen = classOptions.find((item) => item.id === e.target.value)
                setSelectedClassId(e.target.value)
                setForm({ ...form, class_level: chosen?.name || '' })
              }}>
                <option value="">{form.curriculum ? 'Class/Form/Grade' : 'Select curriculum first'}</option>
                {classOptions.map((item) => {
                  const slot = selectedSlotRows.find((slotItem) => slotItem.classId === item.id)
                  const label = slot
                    ? `${item.name} - ${slot.remaining > 0 ? `${slot.remaining} slots left` : 'full'}`
                    : item.name
                  return <option key={item.id} value={item.id} disabled={Boolean(slot && slot.remaining <= 0)}>{label}</option>
                })}
              </Select>
              <Select required value={form.overall_grade} onChange={(e) => setForm({ ...form, overall_grade: e.target.value })}>
                <option value="">Overall grade / performance</option>
                {grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
              </Select>
            </div>
            {selectedClassId && (
              <div className={`mt-4 rounded-3xl border p-4 text-sm font-bold ${selectedClassSlot ? (selectedClassSlot.remaining > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900') : 'border-[#145da0]/15 bg-[#eaf3f8] text-[#073159]'}`}>
                {selectedClassSlot
                  ? selectedClassSlot.remaining > 0
                    ? `${selectedClassSlot.remaining} ${selectedClassSlot.remaining === 1 ? 'slot remains' : 'slots remain'} for ${form.curriculum} ${form.class_level}.`
                    : `${form.curriculum} ${form.class_level} is full for this programme. Choose another available class or contact Peak Performance.`
                  : 'This programme is accepting registrations for the selected class. Peak Performance will confirm the final placement.'}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white bg-white/90 p-5 shadow-[0_18px_55px_rgba(7,49,89,0.08)] backdrop-blur md:p-7">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff5db] text-[#b77900]"><Sparkles size={21} /></div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#145da0]">Step 3</p>
                  <h2 className="text-xl font-black">Recent Academic Performance</h2>
                  <p className="mt-1 text-sm text-slate-500">After curriculum and class, select current subjects, grades, and struggles.</p>
                </div>
              </div>
            </div>

            {!form.curriculum || !selectedClassId ? (
              <div className="mt-5 rounded-3xl border border-dashed border-[#145da0]/20 bg-[#eaf3f8]/70 p-5 text-sm font-bold text-[#073159]">
                Select curriculum and class first. The correct subject list will appear here automatically.
              </div>
            ) : availableSubjects.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm font-bold text-amber-900">
                No subjects are configured for {form.curriculum} - {form.class_level}. Ask admin to add subjects for this curriculum/class.
              </div>
            ) : (
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {availableSubjects.map((subject) => {
                  const selected = subjectResults.some((item) => item.subjectName === subject.name)
                  return (
                    <button
                      type="button"
                      key={subject.id}
                      onClick={() => toggleSubject(subject.name)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${selected ? 'border-[#073159] bg-[#073159] text-white shadow-lg shadow-[#073159]/15' : 'border-[#145da0]/10 bg-[#f4f9fc] text-[#073159] hover:border-[#145da0]/30 hover:bg-white'}`}
                    >
                      <span className="mr-2">{selected ? '✓' : '+'}</span>{subject.name}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="mt-6 space-y-4">
              {subjectResults.map((item) => (
                <div key={item.subjectName} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-black">{item.subjectName}</h3>
                    <button type="button" onClick={() => toggleSubject(item.subjectName)} className="text-xs font-bold text-rose-600">Remove</button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
                    <Select required value={item.grade} onChange={(e) => updateSubject(item.subjectName, { grade: e.target.value })}>
                      <option value="">Recent grade</option>
                      {grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                    </Select>
                    <div className="space-y-2">
                      <Textarea required placeholder={STRUGGLE_HINTS[item.subjectName] || `What are you struggling with in ${item.subjectName}?`} value={item.struggle} onChange={(e) => updateSubject(item.subjectName, { struggle: e.target.value })} />
                      <button type="button" onClick={() => updateSubject(item.subjectName, { struggle: improveStruggle(item.subjectName, item.struggle) })} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#145da0]">
                        <Wand2 size={14} /> Help Me Describe My Struggles
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Button type="submit" disabled={submitting || Boolean(selectedClassSlot && selectedClassSlot.remaining <= 0)} className="w-full rounded-2xl py-5 text-sm font-black">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {selectedClassSlot && selectedClassSlot.remaining <= 0 ? 'Selected Class Is Full' : 'Submit Programme Registration'}
          </Button>
        </main>
      </form>
    </div>
  )
}
