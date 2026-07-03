'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, CalendarDays, ChevronLeft, ChevronRight, Download, FileText, GraduationCap, PencilLine, Phone, Plus, Printer, School, Search, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, Badge } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { adminRegisterEventStudents, deleteEventRegistration, updateEventRegistrationPerformance } from '@/app/actions/event-registration'

function csvEscape(value: any) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

const PAGE_SIZE = 8
const blankAdminRow = {
  studentName: '',
  parentName: '',
  parentPhone: '',
  studentPhone: '',
  schoolName: '',
  curriculumId: '',
  classId: '',
  tuitionEventId: '',
  tuitionCenterId: '',
  preferredMode: 'Physical',
  hasStudentAccount: false,
}

function countBy(items: any[], getKey: (item: any) => string | undefined | null) {
  return Object.entries(items.reduce((acc: Record<string, number>, item) => {
    const key = getKey(item) || 'Not provided'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {}))
    .map(([label, value]) => ({ label, value: Number(value) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
}

function AnalyticsBars({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((item) => item.value), 1)
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 size={16} className="text-primary" />
        <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>{title}</h3>
      </div>
      <div className="space-y-3">
        {data.slice(0, 6).map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-bold" style={{ color: 'var(--text)' }}>{item.label}</span>
              <span className="font-black text-primary">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--input)]">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-muted">No data yet.</p>}
      </div>
    </Card>
  )
}

export default function AdminEventRegistrations() {
  const supabase = getSupabaseBrowserClient()
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [programme, setProgramme] = useState('')
  const [eventId, setEventId] = useState('')
  const [curriculum, setCurriculum] = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [weakness, setWeakness] = useState('')
  const [page, setPage] = useState(1)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [adminEvents, setAdminEvents] = useState<any[]>([])
  const [adminCurriculums, setAdminCurriculums] = useState<any[]>([])
  const [adminClasses, setAdminClasses] = useState<any[]>([])
  const [adminSubjects, setAdminSubjects] = useState<any[]>([])
  const [adminCenters, setAdminCenters] = useState<any[]>([])
  const [adminRows, setAdminRows] = useState<any[]>([{ ...blankAdminRow }])
  const [credentialResults, setCredentialResults] = useState<any[]>([])
  const [editingPerformance, setEditingPerformance] = useState<any | null>(null)
  const [performanceOverall, setPerformanceOverall] = useState('')
  const [performanceSubjects, setPerformanceSubjects] = useState<Array<{ subjectName: string; grade: string; struggle: string }>>([])
  const [savingPerformance, setSavingPerformance] = useState(false)
  const [deletingRegistrationId, setDeletingRegistrationId] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, programme, eventId, curriculum, classLevel, weakness])

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('event_registrations')
      .select('*, tuition_event:tuition_events(id, name, start_date), student:students(id, admission_number, temp_password, created_at)')
      .order('registered_at', { ascending: false })

    const [eventRes, curriculumRes, classRes, subjectRes, centerRes] = await Promise.all([
      supabase.from('tuition_events').select('id, name, start_date, status, is_active').in('status', ['active', 'upcoming']).order('start_date', { ascending: true }),
      supabase.from('curriculums').select('id, name').order('name'),
      supabase.from('classes').select('id, name, curriculum_id').order('name'),
      supabase.from('subjects').select('id, name, curriculum_id, class_id').order('name'),
      supabase.from('tuition_centers').select('id, name').order('name'),
    ])

    if (error) {
      toast.error('Failed to load programme registrations')
    } else {
      setRegistrations(data || [])
    }
    setAdminEvents(eventRes.data || [])
    setAdminCurriculums(curriculumRes.data || [])
    setAdminClasses(classRes.data || [])
    setAdminSubjects(subjectRes.data || [])
    setAdminCenters(centerRes.data || [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const weak = weakness.toLowerCase()
    return registrations.filter((item) => {
      const subjectResults = Array.isArray(item.subject_results) ? item.subject_results : []
      const text = [
        item.student_name,
        item.parent_name,
        item.parent_phone,
        item.school_name,
        item.class_level,
        item.programme_selected || item.tuition_event?.name,
        item.overall_grade,
        ...subjectResults.flatMap((subject: any) => [subject.subjectName, subject.grade, subject.struggle]),
      ].join(' ').toLowerCase()

      const matchesSearch = q ? text.includes(q) : true
      const matchesProgramme = programme ? (item.programme_selected || item.tuition_event?.name) === programme : true
      const matchesEvent = eventId ? item.tuition_event_id === eventId : true
      const matchesCurriculum = curriculum ? item.curriculum_label === curriculum : true
      const matchesClass = classLevel ? item.class_level === classLevel : true
      const matchesWeakness = weak ? subjectResults.some((subject: any) => String(subject.struggle || '').toLowerCase().includes(weak) || String(subject.subjectName || '').toLowerCase().includes(weak)) : true
      return matchesSearch && matchesProgramme && matchesEvent && matchesCurriculum && matchesClass && matchesWeakness
    })
  }, [registrations, search, programme, eventId, curriculum, classLevel, weakness])

  const programmes = [...new Set(registrations.map((item) => item.programme_selected || item.tuition_event?.name).filter(Boolean))]
  const events = Array.from(
    new Map(
      registrations
        .filter((item) => item.tuition_event_id || item.tuition_event?.id)
        .map((item) => [item.tuition_event_id || item.tuition_event?.id, item.tuition_event?.name || item.programme_selected || 'Tuition event'])
    ).entries()
  ).map(([id, name]) => ({ id, name }))
  const curriculums = [...new Set(registrations.map((item) => item.curriculum_label).filter(Boolean))]
  const classLevels = [...new Set(registrations.map((item) => item.class_level).filter(Boolean))]
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const selectedEventTotal = eventId ? registrations.filter((item) => item.tuition_event_id === eventId).length : registrations.length
  const byEvent = countBy(filtered, (item) => item.tuition_event?.name || item.programme_selected)
  const byClass = countBy(filtered, (item) => item.class_level)
  const byCurriculum = countBy(filtered, (item) => item.curriculum_label)
  const missingAccountCount = filtered.filter((item) => !item.student_id).length
  const renderPagination = () => (
    <div className="flex flex-col gap-2 rounded-2xl bg-[var(--input)] p-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
      <span>Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} registrations</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={15} /> Prev</Button>
        <span className="text-xs font-black text-primary">Page {page} / {totalPages}</span>
        <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next <ChevronRight size={15} /></Button>
      </div>
    </div>
  )

  const exportCsv = () => {
    const rows = [
      ['Programme', 'Student', 'Parent', 'Parent Phone', 'School', 'Curriculum', 'Class/Form/Grade', 'Overall Grade', 'Subject Performance', 'Registered At'],
      ...filtered.map((item) => {
        const subjects = (Array.isArray(item.subject_results) ? item.subject_results : [])
          .map((subject: any) => `${subject.subjectName}: ${subject.grade} - ${subject.struggle}`)
          .join(' | ')
        return [
          item.programme_selected || item.tuition_event?.name,
          item.student_name,
          item.parent_name,
          item.parent_phone,
          item.school_name,
          item.curriculum_label,
          item.class_level,
          item.overall_grade,
          subjects,
          item.registered_at,
        ]
      }),
    ]
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `programme-registrations-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const updateAdminRow = (index: number, patch: any) => {
    setAdminRows((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row))
  }

  const addAdminRow = () => {
    const first = adminRows[0] || blankAdminRow
    setAdminRows((rows) => [...rows, {
      ...blankAdminRow,
      tuitionEventId: first.tuitionEventId || '',
      curriculumId: first.curriculumId || '',
      classId: first.classId || '',
      tuitionCenterId: first.tuitionCenterId || '',
      preferredMode: first.preferredMode || 'Physical',
    }])
  }

  const submitAdminRegistrations = async () => {
    const rows = adminRows
      .map((row) => ({ ...row, studentName: String(row.studentName || '').trim() }))
      .filter((row) => row.studentName)

    if (rows.length === 0) return toast.error('Add at least one student name.')
    if (rows.some((row) => !row.tuitionEventId || !row.curriculumId || !row.classId)) {
      return toast.error('Each row needs an event, curriculum and class.')
    }

    setRegistering(true)
    const result = await adminRegisterEventStudents({ rows })
    setRegistering(false)
    if (!result.success) return toast.error(result.error || 'Could not register students')

    setCredentialResults(result.results || [])
    toast.success(`Registered ${rows.length} learner${rows.length === 1 ? '' : 's'}. Created ${result.created || 0}, linked ${result.linked || 0}.`)
    await loadData()
  }

  const openPerformanceEditor = (registration: any) => {
    const existingSubjects = Array.isArray(registration.subject_results) ? registration.subject_results : []
    const hasRealOverall = registration.overall_grade && !String(registration.overall_grade).toLowerCase().includes('not provided')
    setEditingPerformance(registration)
    setPerformanceOverall(hasRealOverall ? registration.overall_grade : '')
    setPerformanceSubjects(existingSubjects.length > 0
      ? existingSubjects.map((item: any) => ({
          subjectName: String(item.subjectName || ''),
          grade: String(item.grade || ''),
          struggle: String(item.struggle || ''),
        }))
      : [{ subjectName: '', grade: '', struggle: '' }]
    )
  }

  const updatePerformanceSubject = (index: number, patch: Partial<{ subjectName: string; grade: string; struggle: string }>) => {
    setPerformanceSubjects((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row))
  }

  const savePerformance = async () => {
    if (!editingPerformance?.id) return
    const cleanRows = performanceSubjects.filter((row) => row.subjectName.trim())
    setSavingPerformance(true)
    const result = await updateEventRegistrationPerformance({
      registrationId: editingPerformance.id,
      overallGrade: performanceOverall,
      subjectResults: cleanRows,
    })
    setSavingPerformance(false)
    if (!result.success) return toast.error(result.error || 'Could not update performance.')
    toast.success(result.message || 'Performance updated.')
    setEditingPerformance(null)
    setPerformanceSubjects([])
    setPerformanceOverall('')
    await loadData()
  }

  const removeRegistration = async (registration: any) => {
    if (!registration?.id) return
    const name = registration.student_name || 'this learner'
    const ok = window.confirm(`Delete the event registration for ${name}? This removes the programme registration only. It will not delete the student account.`)
    if (!ok) return

    setDeletingRegistrationId(registration.id)
    const result = await deleteEventRegistration(registration.id)
    setDeletingRegistrationId('')
    if (!result.success) return toast.error(result.error || 'Could not delete registration.')
    toast.success(result.message || 'Registration deleted.')
    await loadData()
  }

  const editingCurriculumRow = editingPerformance
    ? adminCurriculums.find((item) => item.name === editingPerformance.curriculum_label)
    : null
  const editingClassRow = editingPerformance && editingCurriculumRow
    ? adminClasses.find((item) => item.name === editingPerformance.class_level && item.curriculum_id === editingCurriculumRow.id)
    : null
  const performanceSubjectOptions = editingCurriculumRow
    ? adminSubjects.filter((item) => item.curriculum_id === editingCurriculumRow.id && (!item.class_id || item.class_id === editingClassRow?.id))
    : []

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Academic intake</p>
          <h1 className="mt-2 text-2xl font-black" style={{ color: 'var(--text)' }}>Programme Registrations</h1>
          <p className="mt-1 text-sm text-muted">Review learner context before the programme starts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setRegisterOpen(true)}><Plus size={16} /> Register Students</Button>
          <Button variant="secondary" onClick={exportCsv}><Download size={16} /> Export CSV</Button>
          <Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Export PDF</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs font-bold text-muted">Total registrations</p><p className="mt-1 text-2xl font-black text-primary">{filtered.length}</p></Card>
        <Card className="p-4"><p className="text-xs font-bold text-muted">Selected event total</p><p className="mt-1 text-2xl font-black" style={{ color: 'var(--text)' }}>{selectedEventTotal}</p></Card>
        <Card className="p-4"><p className="text-xs font-bold text-muted">Accounts missing</p><p className="mt-1 flex items-center gap-2 text-2xl font-black text-amber-600"><AlertTriangle size={22} /> {missingAccountCount}</p></Card>
        <Card className="p-4"><p className="text-xs font-bold text-muted">Curricula represented</p><p className="mt-1 text-2xl font-black" style={{ color: 'var(--text)' }}>{byCurriculum.length}</p></Card>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_190px_190px_170px_170px_240px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, parent, school, subject..." className="h-11 w-full rounded-2xl bg-[var(--input)] pl-10 pr-3 text-sm outline-none" />
          </div>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="h-11 rounded-2xl bg-[var(--input)] px-3 text-sm outline-none">
            <option value="">All tuition events</option>
            {events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select value={programme} onChange={(e) => setProgramme(e.target.value)} className="h-11 rounded-2xl bg-[var(--input)] px-3 text-sm outline-none">
            <option value="">All programmes</option>
            {programmes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={curriculum} onChange={(e) => setCurriculum(e.target.value)} className="h-11 rounded-2xl bg-[var(--input)] px-3 text-sm outline-none">
            <option value="">All curricula</option>
            {curriculums.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className="h-11 rounded-2xl bg-[var(--input)] px-3 text-sm outline-none">
            <option value="">All classes</option>
            {classLevels.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input value={weakness} onChange={(e) => setWeakness(e.target.value)} placeholder="Filter by weakness e.g. graphs" className="h-11 rounded-2xl bg-[var(--input)] px-3 text-sm outline-none" />
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <AnalyticsBars title="Students per tuition event" data={byEvent} />
        <AnalyticsBars title="Students per class" data={byClass} />
        <AnalyticsBars title="Students per curriculum" data={byCurriculum} />
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted">Loading registrations...</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-3 font-bold" style={{ color: 'var(--text)' }}>No matching registrations.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {renderPagination()}
          {paginated.map((item) => {
            const subjects = Array.isArray(item.subject_results) ? item.subject_results : []
            const studentCreatedAt = item.student?.created_at ? new Date(item.student.created_at).getTime() : 0
            const isNewAccount = studentCreatedAt > 0 && Date.now() - studentCreatedAt < 24 * 60 * 60 * 1000
            return (
              <Card key={item.id} className="overflow-hidden border border-[var(--card-border)] bg-[var(--card)]">
                <div className="grid gap-4 p-4 lg:grid-cols-[minmax(260px,0.85fr)_1.15fr]">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge variant="primary" className="max-w-full truncate">{item.programme_selected || item.tuition_event?.name || 'Programme'}</Badge>
                      {item.student_id && <Badge variant="success" className="gap-1"><ShieldCheck size={12} /> Account linked</Badge>}
                      {!item.student_id && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-800 ring-1 ring-amber-300">
                          <AlertTriangle size={12} /> Account missing
                        </span>
                      )}
                      {isNewAccount && <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-950">New</span>}
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-black text-white">
                        {String(item.student_name || '?').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-black" style={{ color: 'var(--text)' }}>{item.student_name}</h2>
                        <p className="mt-0.5 text-xs font-bold text-muted">{item.curriculum_label || 'Curriculum not provided'} - {item.class_level || 'Class not provided'}</p>
                        {item.student_phone && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-muted">
                            <Phone size={12} /> Student: {item.student_phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                      <div className="rounded-xl bg-[var(--input)] p-2.5">
                        <p className="flex items-center gap-1.5 font-black" style={{ color: 'var(--text)' }}><UserRound size={13} /> {item.parent_name || 'Parent not provided'}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-muted"><Phone size={12} /> {item.parent_phone || 'No phone'}</p>
                      </div>
                      <div className="rounded-xl bg-[var(--input)] p-2.5">
                        <p className="flex items-center gap-1.5 font-black" style={{ color: 'var(--text)' }}><School size={13} /> {item.school_name || 'School not provided'}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-muted"><GraduationCap size={12} /> Overall: {item.overall_grade || 'Not provided'}</p>
                      </div>
                      <div className="rounded-xl bg-[var(--input)] p-2.5">
                        <p className="font-black" style={{ color: 'var(--text)' }}>{item.preferred_mode || 'Mode not provided'}</p>
                        <p className="mt-1 text-muted">Preferred learning mode</p>
                      </div>
                      <div className="rounded-xl bg-[var(--input)] p-2.5">
                        <p className="flex items-center gap-1.5 font-black" style={{ color: 'var(--text)' }}><CalendarDays size={13} /> {item.tuition_event?.start_date ? new Date(item.tuition_event.start_date).toLocaleDateString() : 'Date TBC'}</p>
                        <p className={`mt-1 ${item.student?.admission_number ? 'font-mono text-muted' : 'font-black text-amber-700'}`}>
                          {item.student?.admission_number || 'Account missing - create or link later'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                      <FileText size={17} className="text-primary" />
                        <h3 className="font-black" style={{ color: 'var(--text)' }}>Subjects and struggles</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[var(--input)] px-2.5 py-1 text-[10px] font-black text-muted">{subjects.length} subjects</span>
                        <button
                          type="button"
                          onClick={() => openPerformanceEditor(item)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition hover:opacity-90"
                        >
                          <PencilLine size={12} /> Update
                        </button>
                        <button
                          type="button"
                          disabled={deletingRegistrationId === item.id}
                          onClick={() => removeRegistration(item)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 size={12} /> {deletingRegistrationId === item.id ? 'Deleting' : 'Delete'}
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {subjects.map((subject: any, index: number) => (
                        <div key={`${subject.subjectName}-${index}`} className="rounded-2xl bg-[var(--input)] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-black" style={{ color: 'var(--text)' }}>{subject.subjectName}</p>
                            <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-black text-white">{subject.grade}</span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-muted">{subject.struggle || 'No struggle provided.'}</p>
                        </div>
                      ))}
                      {subjects.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/5 p-4 md:col-span-2">
                          <p className="text-sm font-black text-primary">Performance not captured yet</p>
                          <p className="mt-1 text-xs leading-5 text-muted">Ask the learner for subjects or a result slip, then update overall performance, subject grades and weaknesses here.</p>
                        </div>
                      )}
                    </div>
                    {item.whatsapp_summary && (
                      <details className="mt-4 rounded-2xl bg-[var(--input)] p-3">
                        <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-primary">WhatsApp-ready summary</summary>
                        <pre className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-muted">{item.whatsapp_summary}</pre>
                      </details>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
          {renderPagination()}
        </div>
      )}

      <Modal isOpen={Boolean(editingPerformance)} onClose={() => setEditingPerformance(null)} title="Update Learner Performance" size="lg">
        {editingPerformance && (
          <div className="space-y-5">
            <div className="rounded-3xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-sm font-black" style={{ color: 'var(--text)' }}>{editingPerformance.student_name}</p>
              <p className="mt-1 text-xs font-bold text-muted">
                {editingPerformance.curriculum_label || 'Curriculum not provided'} - {editingPerformance.class_level || 'Class not provided'} - {editingPerformance.programme_selected || editingPerformance.tuition_event?.name || 'Programme'}
              </p>
              <p className="mt-3 text-xs leading-5 text-muted">
                Use this after the learner brings a result slip or tells Peak their real subjects. These details improve placement, teacher preparation and linked student onboarding.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-[220px_1fr]">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Overall performance</label>
                <input
                  value={performanceOverall}
                  onChange={(event) => setPerformanceOverall(event.target.value)}
                  placeholder="e.g. B-, 62%, Exceeding expectations"
                  className="mt-1 h-12 w-full rounded-2xl bg-[var(--input)] px-3 text-sm font-bold outline-none"
                />
              </div>
              <div className="rounded-2xl bg-[var(--input)] p-3 text-xs leading-5 text-muted">
                If the parent still has no results, leave this blank. The system will keep it as not provided yet and admin can update it later.
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--text)' }}>Subject performance and weaknesses</p>
                  <p className="text-xs text-muted">Add only confirmed subjects. No guessing.</p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => setPerformanceSubjects((rows) => [...rows, { subjectName: '', grade: '', struggle: '' }])}>
                  <Plus size={14} /> Add Subject
                </Button>
              </div>

              {performanceSubjects.map((row, index) => (
                <div key={index} className="rounded-3xl border border-[var(--card-border)] bg-[var(--input)] p-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_150px_auto]">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted">Subject</label>
                      <input
                        list="performance-subject-options"
                        value={row.subjectName}
                        onChange={(event) => updatePerformanceSubject(index, { subjectName: event.target.value })}
                        placeholder="Select or type subject"
                        className="mt-1 h-11 w-full rounded-2xl bg-[var(--card)] px-3 text-sm font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted">Grade / mark</label>
                      <input
                        value={row.grade}
                        onChange={(event) => updatePerformanceSubject(index, { grade: event.target.value })}
                        placeholder="e.g. C+, 54%"
                        className="mt-1 h-11 w-full rounded-2xl bg-[var(--card)] px-3 text-sm font-bold outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPerformanceSubjects((rows) => rows.length > 1 ? rows.filter((_, rowIndex) => rowIndex !== index) : [{ subjectName: '', grade: '', struggle: '' }])}
                      className="mt-5 flex h-11 w-11 items-center justify-center rounded-2xl text-rose-500 transition hover:bg-rose-500/10"
                      aria-label="Remove subject"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <textarea
                    value={row.struggle}
                    onChange={(event) => updatePerformanceSubject(index, { struggle: event.target.value })}
                    placeholder="Weaknesses noticed or reported, e.g. algebra word problems, careless mistakes, time management..."
                    className="mt-3 min-h-[86px] w-full resize-none rounded-2xl bg-[var(--card)] p-3 text-sm font-medium leading-6 outline-none"
                  />
                </div>
              ))}

              <datalist id="performance-subject-options">
                {performanceSubjectOptions.map((subject) => (
                  <option key={subject.id} value={subject.name} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setEditingPerformance(null)}>Cancel</Button>
              <Button type="button" disabled={savingPerformance} onClick={savePerformance}>
                {savingPerformance ? 'Saving...' : 'Save Performance'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} title="Register Students For Event" size="full">
        <div className="space-y-5">
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <p className="text-sm font-black" style={{ color: 'var(--text)' }}>Admin registration does not require weaknesses.</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Add one or many students. If the learner does not already have a Peak account, the system will create one and show the admission number plus temporary password.
            </p>
          </div>

          <div className="space-y-3">
            {adminRows.map((row, index) => {
              const rowClasses = row.curriculumId ? adminClasses.filter((item) => item.curriculum_id === row.curriculumId) : adminClasses
              return (
                <div key={index} className="rounded-3xl border border-[var(--card-border)] bg-[var(--input)] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-primary">Student row {index + 1}</p>
                      <p className="text-xs text-muted">No weakness fields are needed here.</p>
                    </div>
                    {adminRows.length > 1 && (
                      <button type="button" onClick={() => setAdminRows((rows) => rows.filter((_, i) => i !== index))} className="rounded-xl p-2 text-rose-500 hover:bg-rose-500/10" aria-label="Remove row">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <input value={row.studentName} onChange={(e) => updateAdminRow(index, { studentName: e.target.value })} placeholder="Student full name" className="h-11 rounded-2xl bg-[var(--card)] px-3 text-sm font-bold outline-none" />
                    <input value={row.parentName} onChange={(e) => updateAdminRow(index, { parentName: e.target.value })} placeholder="Parent name optional" className="h-11 rounded-2xl bg-[var(--card)] px-3 text-sm font-bold outline-none" />
                    <input value={row.parentPhone} onChange={(e) => updateAdminRow(index, { parentPhone: e.target.value })} placeholder="Parent phone optional" className="h-11 rounded-2xl bg-[var(--card)] px-3 text-sm font-bold outline-none" />
                    <input value={row.schoolName} onChange={(e) => updateAdminRow(index, { schoolName: e.target.value })} placeholder="School optional" className="h-11 rounded-2xl bg-[var(--card)] px-3 text-sm font-bold outline-none" />
                    <select value={row.tuitionEventId} onChange={(e) => updateAdminRow(index, { tuitionEventId: e.target.value })} className="h-11 rounded-2xl bg-[var(--card)] px-3 text-sm font-bold outline-none">
                      <option value="">Select tuition event</option>
                      {adminEvents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <select value={row.curriculumId} onChange={(e) => updateAdminRow(index, { curriculumId: e.target.value, classId: '' })} className="h-11 rounded-2xl bg-[var(--card)] px-3 text-sm font-bold outline-none">
                      <option value="">Select curriculum</option>
                      {adminCurriculums.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <select value={row.classId} onChange={(e) => updateAdminRow(index, { classId: e.target.value })} className="h-11 rounded-2xl bg-[var(--card)] px-3 text-sm font-bold outline-none">
                      <option value="">Select class/grade/form</option>
                      {rowClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <select value={row.tuitionCenterId} onChange={(e) => updateAdminRow(index, { tuitionCenterId: e.target.value })} className="h-11 rounded-2xl bg-[var(--card)] px-3 text-sm font-bold outline-none">
                      <option value="">No center / assign later</option>
                      {adminCenters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[
                      [false, 'No account yet - create one'],
                      [true, 'Already has account - link only'],
                    ].map(([value, label]) => (
                      <button
                        type="button"
                        key={String(value)}
                        onClick={() => updateAdminRow(index, { hasStudentAccount: value })}
                        className={`rounded-2xl border px-4 py-3 text-left text-xs font-black uppercase tracking-widest transition ${row.hasStudentAccount === value ? 'border-primary bg-primary text-white' : 'border-[var(--card-border)] bg-[var(--card)] text-muted hover:text-primary'}`}
                      >
                        {label as string}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="secondary" onClick={addAdminRow}><Plus size={16} /> Add Row</Button>
            <Button type="button" disabled={registering} onClick={submitAdminRegistrations}>
              {registering ? 'Registering...' : 'Register Students & Create Accounts'}
            </Button>
          </div>

          {credentialResults.length > 0 && (
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-black text-emerald-600">Registration results</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {credentialResults.map((item, index) => (
                  <div key={`${item.studentName}-${index}`} className="rounded-2xl bg-[var(--card)] p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black" style={{ color: 'var(--text)' }}>{item.studentName}</p>
                      <Badge variant={item.status === 'created' ? 'success' : item.status === 'failed' ? 'warning' : 'info'}>{item.status}</Badge>
                    </div>
                    {item.admissionNumber && <p className="mt-2 font-mono text-muted">Admission: {item.admissionNumber}</p>}
                    {item.password && <p className="mt-1 font-mono text-muted">Password: {item.password}</p>}
                    {item.error && <p className="mt-2 text-rose-500">{item.error}</p>}
                    {item.note && <p className="mt-2 text-muted">{item.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
