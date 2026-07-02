'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpenCheck, CheckCircle2, Copy, Loader2, Phone, School, ShieldCheck, Sparkles, UserRound, UsersRound, Wand2 } from 'lucide-react'
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
  chargeAmount?: number | null
  chargeCurrency?: string | null
  chargeFrequency?: string | null
  chargeUnitLabel?: string | null
  pricingNote?: string | null
}

function formatEventCharge(event?: any) {
  if (!event) return 'Select a programme to see charges'
  const amount = Number(event.charge_amount)
  if (!Number.isFinite(amount) || amount <= 0) return 'Fee breakdown available'
  const unit = event.charge_unit_label || event.charge_frequency?.replace(/_/g, ' ') || 'per programme'
  return `${event.charge_currency || 'KES'} ${amount.toLocaleString()} ${unit}`
}

function formatSelectedCharge(event?: any, slot?: RegistrationSlot) {
  const slotAmount = Number(slot?.chargeAmount)
  if (Number.isFinite(slotAmount) && slotAmount > 0) {
    const unit = slot?.chargeUnitLabel || slot?.chargeFrequency?.replace(/_/g, ' ') || event?.charge_unit_label || event?.charge_frequency?.replace(/_/g, ' ') || 'per programme'
    return `${slot?.chargeCurrency || event?.charge_currency || 'KES'} ${slotAmount.toLocaleString()} ${unit}`
  }
  return formatEventCharge(event)
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

function resolveEventPosterUrl(event?: any) {
  const raw = String(event?.banner_url || event?.poster_url || event?.image_url || '').trim()
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw
  const cleanPath = raw.replace(/^event-posters\//, '').replace(/^public\//, '').replace(/^\/+/, '')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/event-posters/${cleanPath}` : raw
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
    has_student_account: 'no',
  })
  const [subjectResults, setSubjectResults] = useState<Array<{ subjectName: string; grade: string; struggle: string }>>([])
  const [createdCredentials, setCreatedCredentials] = useState<{ admissionNumber?: string; email?: string; password?: string; note?: string } | null>(null)
  
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3

  useEffect(() => {
    const load = async () => {
      const [eventRes, curriculumRes, classRes, subjectRes, countsRes] = await Promise.all([
        supabase
          .from('tuition_events')
          .select('id, name, start_date, end_date, status, is_active, banner_url, banner_object_position, charge_amount, charge_currency, charge_frequency, charge_unit_label, pricing_note, event_location, session_start_time, session_end_time')
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
  const selectedPosterUrl = resolveEventPosterUrl(selectedEvent)
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
  const selectedCharge = formatSelectedCharge(selectedEvent, selectedClassSlot)

  const toggleSubject = (subjectName: string) => {
    setSubjectResults((prev) => prev.some((item) => item.subjectName === subjectName)
      ? prev.filter((item) => item.subjectName !== subjectName)
      : [...prev, { subjectName, grade: '', struggle: '' }]
    )
  }

  const updateSubject = (subjectName: string, patch: Partial<{ grade: string; struggle: string }>) => {
    setSubjectResults((prev) => prev.map((item) => item.subjectName === subjectName ? { ...item, ...patch } : item))
  }

  const nextStep = () => {
    if (currentStep === 1) {
      if (!form.student_full_name || !form.parent_name || !form.parent_phone || !form.school_name || !form.preferred_mode || !form.event_id) {
        toast.error('Please fill in all required fields.')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!form.curriculum || !selectedClassId || !form.overall_grade) {
        toast.error('Please select curriculum, class, and overall grade.')
        return
      }
      setCurrentStep(3)
    }
  }

  const prevStep = () => setCurrentStep(prev => Math.max(1, prev - 1))

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
    const message = result.message || 'Registration received successfully. Peak Performance will contact you with the next steps.'
    toast.success(message, { duration: 6000 })
    if (result.account?.created) {
      setCreatedCredentials(result.account)
      return
    }
    router.push('/')
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-[#f4f8fb] text-[#073159] font-dm-sans">
      {/* Top Banner */}
      <div className="relative bg-[#062744] text-white pt-8 pb-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#7ed957]/10 blur-[100px]" />
          <div className="absolute -left-20 bottom-0 h-96 w-96 rounded-full bg-[#32b7ff]/10 blur-[100px]" />
          {selectedPosterUrl && (
            <div 
              className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay" 
              style={{ backgroundImage: `url("${selectedPosterUrl}")`, backgroundPosition: selectedEvent?.banner_object_position || 'center center' }} 
            />
          )}
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#7ed957] hover:text-[#a5ef87] transition-colors mb-8"><ArrowLeft size={16} /> Back to Peak Performance</Link>
          <div>
            <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#d8ffc7] backdrop-blur mb-5">
              <Sparkles size={14} /> Academic Intake Registration
            </div>
            <h1 className="text-3xl md:text-5xl font-black leading-tight drop-shadow-md px-4">
              {selectedEventName || 'Choose a programme'}
            </h1>
            <p className="mt-5 text-sm md:text-base text-white/75 max-w-2xl mx-auto leading-relaxed">
              A premium learner profile for teachers: curriculum, class, recent performance, and exactly where support is needed.
            </p>
          </div>
          
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Location</p>
              <p className="mt-1.5 font-bold text-sm truncate">{selectedEvent?.event_location || 'To be confirmed'}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-md">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Time</p>
              <p className="mt-1.5 font-bold text-sm truncate">{formatSessionTime(selectedEvent)}</p>
            </div>
            <div className="rounded-2xl bg-[#7ed957]/15 p-4 border border-[#7ed957]/20 backdrop-blur-md md:col-span-2 text-left flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#bff8a7]">Charges</p>
                <p className="mt-1 text-sm font-black text-white">{selectedCharge}</p>
              </div>
              <div className="bg-[#7ed957] text-[#062744] text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm">
                {selectedEventHasSlots ? `${selectedRemainingTotal} slots` : 'Open'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Area */}
      <main className="relative -mt-16 mx-auto max-w-3xl px-4 pb-24 z-10">
        <form onSubmit={submit} className="rounded-[2rem] bg-white p-6 md:p-10 shadow-[0_30px_80px_rgba(7,49,89,0.08)] border border-[#145da0]/5">
          
          {/* Stepper */}
          <div className="mb-10 flex items-center justify-between relative max-w-lg mx-auto">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full z-0"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#145da0] rounded-full z-0 transition-all duration-500" style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}></div>
            
            {[1, 2, 3].map((step) => (
              <div key={step} className="relative z-10 flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 ${currentStep === step ? 'bg-[#145da0] text-white shadow-lg shadow-[#145da0]/30 ring-4 ring-white' : currentStep > step ? 'bg-[#7ed957] text-[#073159] ring-4 ring-white' : 'bg-slate-100 text-slate-400 ring-4 ring-white'}`}>
                  {currentStep > step ? <CheckCircle2 size={18} /> : step}
                </div>
                <span className={`absolute top-12 whitespace-nowrap text-[10px] uppercase tracking-wider font-bold transition-colors ${currentStep === step ? 'text-[#145da0]' : 'text-slate-400'}`}>
                  {step === 1 ? 'Details' : step === 2 ? 'Curriculum' : 'Subjects'}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-16">
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-[#073159]">Student & Parent Details</h2>
                  <p className="text-sm text-slate-500 mt-2">Let's start with the basic contact information.</p>
                </div>
                
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Student Full Name *</label>
                    <Input className="h-14 rounded-2xl bg-[#f4f9fc] border-transparent focus:bg-white focus:border-[#145da0] text-sm font-semibold transition-colors" leftIcon={<UserRound size={18} className="text-[#145da0]/50" />} required placeholder="e.g. John Doe" value={form.student_full_name} onChange={(e) => setForm({ ...form, student_full_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Parent/Guardian Name *</label>
                    <Input className="h-14 rounded-2xl bg-[#f4f9fc] border-transparent focus:bg-white focus:border-[#145da0] text-sm font-semibold transition-colors" leftIcon={<UsersRound size={18} className="text-[#145da0]/50" />} required placeholder="e.g. Jane Doe" value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Parent Phone *</label>
                    <Input className="h-14 rounded-2xl bg-[#f4f9fc] border-transparent focus:bg-white focus:border-[#145da0] text-sm font-semibold transition-colors" leftIcon={<Phone size={18} className="text-[#145da0]/50" />} required placeholder="07xx xxx xxx" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Student Phone (Optional)</label>
                    <Input className="h-14 rounded-2xl bg-[#f4f9fc] border-transparent focus:bg-white focus:border-[#145da0] text-sm font-semibold transition-colors" leftIcon={<Phone size={18} className="text-[#145da0]/50" />} placeholder="07xx xxx xxx" value={form.student_phone} onChange={(e) => setForm({ ...form, student_phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">School Name *</label>
                    <Input className="h-14 rounded-2xl bg-[#f4f9fc] border-transparent focus:bg-white focus:border-[#145da0] text-sm font-semibold transition-colors" leftIcon={<School size={18} className="text-[#145da0]/50" />} required placeholder="Current school" value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Programme *</label>
                    <Select className="h-14 rounded-2xl bg-[#f4f9fc] border-transparent focus:bg-white focus:border-[#145da0] text-sm font-semibold transition-colors" required value={form.event_id} onChange={(e) => {
                      const chosen = events.find((item) => item.id === e.target.value)
                      setForm({ ...form, event_id: e.target.value, programme_selected: chosen?.name || form.programme_selected })
                    }}>
                      <option value="">Select Programme</option>
                      {events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Preferred Mode *</label>
                    <Select className="h-14 rounded-2xl bg-[#f4f9fc] border-transparent focus:bg-white focus:border-[#145da0] text-sm font-semibold transition-colors" required value={form.preferred_mode} onChange={(e) => setForm({ ...form, preferred_mode: e.target.value })}>
                      <option value="">Select Mode</option>
                      <option value="Physical">Physical</option>
                      <option value="Online">Online</option>
                      <option value="Hybrid">Hybrid</option>
                    </Select>
                  </div>
                </div>

                <div className="mt-8 rounded-3xl border border-[#145da0]/10 bg-[#f4f9fc]/50 p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#145da0] shadow-sm">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="flex-1 w-full">
                      <p className="text-sm font-black text-[#073159]">Peak Student Account</p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500 mb-4">Does the learner already have an account? We will generate one if they don't.</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          ['no', 'No, create account'],
                          ['yes', 'Yes, returning learner'],
                        ].map(([value, label]) => (
                          <button
                            type="button"
                            key={value}
                            onClick={() => setForm({ ...form, has_student_account: value })}
                            className={`rounded-xl border-2 px-4 py-3.5 text-center text-sm font-bold transition-all ${form.has_student_account === value ? 'border-[#145da0] bg-[#145da0] text-white shadow-md' : 'border-[#145da0]/10 bg-white text-[#073159] hover:border-[#145da0]/30'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-[#073159]">Curriculum & Class</h2>
                  <p className="text-sm text-slate-500 mt-2">Help us place the learner in the correct group.</p>
                </div>

                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Curriculum *</label>
                    <Select className="h-14 rounded-2xl bg-[#f4f9fc] border-transparent focus:bg-white focus:border-[#145da0] text-sm font-semibold transition-colors" required value={form.curriculum} onChange={(e) => setForm({ ...form, curriculum: e.target.value })}>
                      <option value="">Select Curriculum</option>
                      {curriculums.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Class/Grade *</label>
                    <Select className="h-14 rounded-2xl bg-[#f4f9fc] border-transparent focus:bg-white focus:border-[#145da0] text-sm font-semibold transition-colors" required value={selectedClassId} disabled={!selectedCurriculum} onChange={(e) => {
                      const chosen = classOptions.find((item) => item.id === e.target.value)
                      setSelectedClassId(e.target.value)
                      setForm({ ...form, class_level: chosen?.name || '' })
                    }}>
                      <option value="">{form.curriculum ? 'Select Class' : 'Select curriculum first'}</option>
                      {classOptions.map((item) => {
                        const slot = selectedSlotRows.find((slotItem) => slotItem.classId === item.id)
                        const label = slot
                          ? `${item.name} - ${slot.remaining > 0 ? `${slot.remaining} left` : 'full'}`
                          : item.name
                        return <option key={item.id} value={item.id} disabled={Boolean(slot && slot.remaining <= 0)}>{label}</option>
                      })}
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Overall Grade *</label>
                    <Select className="h-14 rounded-2xl bg-[#f4f9fc] border-transparent focus:bg-white focus:border-[#145da0] text-sm font-semibold transition-colors" required value={form.overall_grade} onChange={(e) => setForm({ ...form, overall_grade: e.target.value })}>
                      <option value="">Select Grade</option>
                      {grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                    </Select>
                  </div>
                </div>

                {selectedClassId && (
                  <div className={`mt-6 rounded-3xl border-2 p-5 text-sm font-bold flex items-start gap-4 ${selectedClassSlot ? (selectedClassSlot.remaining > 0 ? 'border-[#7ed957]/30 bg-[#f4fcf1] text-[#2f8517]' : 'border-rose-200 bg-rose-50 text-rose-900') : 'border-[#145da0]/15 bg-[#f4f9fc] text-[#073159]'}`}>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedClassSlot ? (selectedClassSlot.remaining > 0 ? 'bg-[#7ed957] text-[#073159]' : 'bg-rose-200 text-rose-900') : 'bg-[#145da0] text-white'}`}>
                       <CheckCircle2 size={18} />
                    </div>
                    <div className="pt-1">
                      {selectedClassSlot
                        ? selectedClassSlot.remaining > 0
                          ? `${selectedClassSlot.remaining} ${selectedClassSlot.remaining === 1 ? 'slot remains' : 'slots remain'} for ${form.curriculum} ${form.class_level}. Fee: ${formatSelectedCharge(selectedEvent, selectedClassSlot)}.`
                          : `${form.curriculum} ${form.class_level} is full for this programme. Choose another available class or contact Peak Performance.`
                        : 'This programme is accepting registrations for the selected class. Peak Performance will confirm the final placement.'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-[#073159]">Subject Performance</h2>
                  <p className="text-sm text-slate-500 mt-2">Select subjects and tell us where you need the most help.</p>
                </div>

                {!form.curriculum || !selectedClassId ? (
                  <div className="rounded-3xl border border-dashed border-[#145da0]/20 bg-[#f4f9fc] p-8 text-center">
                    <p className="text-sm font-bold text-[#073159]">Please go back and select a curriculum and class first.</p>
                  </div>
                ) : availableSubjects.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center">
                    <p className="text-sm font-bold text-amber-900">No subjects are configured for {form.curriculum} - {form.class_level}.</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 ml-1">Select Subjects (Click to add/remove)</p>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                      {availableSubjects.map((subject) => {
                        const selected = subjectResults.some((item) => item.subjectName === subject.name)
                        return (
                          <button
                            type="button"
                            key={subject.id}
                            onClick={() => toggleSubject(subject.name)}
                            className={`rounded-xl border-2 px-3 py-2 text-center text-xs sm:text-sm font-bold transition-all ${selected ? 'border-[#145da0] bg-[#145da0] text-white shadow-md' : 'border-[#145da0]/5 bg-[#f4f9fc] text-[#073159] hover:border-[#145da0]/20 hover:bg-white'}`}
                          >
                            {subject.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {subjectResults.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <div className="h-px w-full bg-slate-100 mb-6"></div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 ml-1">Subject Details</p>
                    {subjectResults.map((item) => (
                      <div key={item.subjectName} className="rounded-2xl border border-slate-100 bg-[#f4f9fc]/30 p-5 shadow-sm transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-black text-lg text-[#073159] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#7ed957]"></span>
                            {item.subjectName}
                          </h3>
                          <button type="button" onClick={() => toggleSubject(item.subjectName)} className="text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full transition-colors">Remove</button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                          <Select className="h-12 rounded-xl bg-[#f4f9fc] border-transparent focus:bg-white focus:border-[#145da0] text-sm font-semibold transition-colors" required value={item.grade} onChange={(e) => updateSubject(item.subjectName, { grade: e.target.value })}>
                            <option value="">Recent grade</option>
                            {grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                          </Select>
                          <div className="space-y-2">
                            <Textarea className="min-h-[100px] rounded-xl bg-[#f4f9fc] border-transparent focus:bg-white focus:border-[#145da0] text-sm font-medium leading-relaxed p-4 resize-none transition-colors" required placeholder={STRUGGLE_HINTS[item.subjectName] || `What are you struggling with in ${item.subjectName}?`} value={item.struggle} onChange={(e) => updateSubject(item.subjectName, { struggle: e.target.value })} />
                            <div className="flex justify-end">
                              <button type="button" onClick={() => updateSubject(item.subjectName, { struggle: improveStruggle(item.subjectName, item.struggle) })} className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#145da0] hover:text-[#073159] transition-colors">
                                <Wand2 size={12} /> Help Me Describe
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6">
            {currentStep > 1 ? (
              <Button type="button" variant="outline" onClick={prevStep} className="rounded-xl px-4 sm:px-6 font-bold h-12 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                Back
              </Button>
            ) : (
              <div></div>
            )}

            {currentStep < totalSteps ? (
              <Button type="button" onClick={nextStep} className="rounded-xl px-6 sm:px-10 font-bold h-12 bg-[#145da0] hover:bg-[#073159] transition-colors shadow-lg shadow-[#145da0]/20">
                Next Step
              </Button>
            ) : (
              <Button type="submit" disabled={submitting || Boolean(selectedClassSlot && selectedClassSlot.remaining <= 0) || subjectResults.length === 0} className="rounded-xl px-6 sm:px-10 font-bold h-12 bg-[#7ed957] hover:bg-[#6cc546] text-[#073159] transition-colors shadow-lg shadow-[#7ed957]/25">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {selectedClassSlot && selectedClassSlot.remaining <= 0 ? 'Class Is Full' : 'Complete Registration'}
              </Button>
            )}
          </div>
        </form>
      </main>

      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#073159]/80 px-3 py-5 backdrop-blur-md sm:px-4">
          <div className="max-h-[calc(100vh-2.5rem)] w-full max-w-md overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300 sm:rounded-[2.25rem]">
            <div className="bg-[#145da0] p-5 text-center text-white relative overflow-hidden sm:p-7">
              <div className="absolute top-[-50%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7ed957] text-[#073159] shadow-lg shadow-[#7ed957]/30 mb-4 sm:h-16 sm:w-16">
                  <CheckCircle2 size={30} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d8ffc7] mb-2">Registration Complete</p>
                <h2 className="text-2xl font-black sm:text-3xl">Account Created</h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-white/80">
                  Save these two details. The student logs in using the admission number and temporary password.
                </p>
              </div>
            </div>
            <div className="space-y-3 bg-slate-50 p-5 sm:p-7">
              {[
                ['Admission number', createdCredentials.admissionNumber],
                ['Temporary password', createdCredentials.password],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="mt-1.5 truncate font-mono text-sm font-bold text-[#073159]">{value}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(String(value || ''))
                      toast.success(`${label} copied`)
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f9fc] text-[#145da0] hover:bg-[#eaf3f8] transition-colors"
                    aria-label={`Copy ${label}`}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              ))}
              <div className="rounded-2xl bg-[#eaf3f8] p-4 text-xs font-bold leading-5 text-[#073159]">
                Login email is kept internally by the system. Students should use the admission number on the student portal.
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" className="w-full rounded-2xl py-4 font-black bg-[#073159] hover:bg-[#062744] text-white shadow-xl shadow-[#073159]/20 transition-all" onClick={() => router.push('/auth/login?role=student')}>
                  Open Student Portal
                </Button>
                <Button type="button" variant="secondary" className="w-full rounded-2xl py-4 font-black" onClick={() => router.push('/')}>
                  Finish
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
