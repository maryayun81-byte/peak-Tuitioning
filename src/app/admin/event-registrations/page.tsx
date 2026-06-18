'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, ChevronLeft, ChevronRight, Download, FileText, Printer, Search, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, Badge } from '@/components/ui/Card'

function csvEscape(value: any) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

const PAGE_SIZE = 8

function countBy(items: any[], getKey: (item: any) => string | undefined | null) {
  return Object.entries(items.reduce((acc: Record<string, number>, item) => {
    const key = getKey(item) || 'Not provided'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {}))
    .map(([label, value]) => ({ label, value }))
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
      .select('*, tuition_event:tuition_events(id, name, start_date)')
      .order('registered_at', { ascending: false })

    if (error) {
      toast.error('Failed to load programme registrations')
    } else {
      setRegistrations(data || [])
    }
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

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Academic intake</p>
          <h1 className="mt-2 text-2xl font-black" style={{ color: 'var(--text)' }}>Programme Registrations</h1>
          <p className="mt-1 text-sm text-muted">Review learner context before the programme starts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportCsv}><Download size={16} /> Export CSV</Button>
          <Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Export PDF</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs font-bold text-muted">Total registrations</p><p className="mt-1 text-2xl font-black text-primary">{filtered.length}</p></Card>
        <Card className="p-4"><p className="text-xs font-bold text-muted">Selected event total</p><p className="mt-1 text-2xl font-black" style={{ color: 'var(--text)' }}>{selectedEventTotal}</p></Card>
        <Card className="p-4"><p className="text-xs font-bold text-muted">Classes represented</p><p className="mt-1 text-2xl font-black" style={{ color: 'var(--text)' }}>{byClass.length}</p></Card>
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
          <div className="flex flex-col gap-2 rounded-2xl bg-[var(--input)] p-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} registrations</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={15} /> Prev</Button>
              <span className="text-xs font-black text-primary">Page {page} / {totalPages}</span>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next <ChevronRight size={15} /></Button>
            </div>
          </div>
          {paginated.map((item) => {
            const subjects = Array.isArray(item.subject_results) ? item.subject_results : []
            return (
              <Card key={item.id} className="overflow-hidden border border-[var(--card-border)] bg-[var(--card)]">
                <div className="grid gap-4 p-5 lg:grid-cols-[0.8fr_1.2fr]">
                  <div>
                    <Badge variant="primary" className="mb-3">{item.programme_selected || item.tuition_event?.name || 'Programme'}</Badge>
                    <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>{item.student_name}</h2>
                    <div className="mt-3 space-y-1 text-sm text-muted">
                      <p><strong>Parent:</strong> {item.parent_name || 'Not provided'} - {item.parent_phone || 'No phone'}</p>
                      <p><strong>Student phone:</strong> {item.student_phone || 'Optional not provided'}</p>
                      <p><strong>School:</strong> {item.school_name || 'Not provided'}</p>
                      <p><strong>Curriculum:</strong> {item.curriculum_label || 'Not provided'}</p>
                      <p><strong>Class/Form/Grade:</strong> {item.class_level || 'Not provided'}</p>
                      <p><strong>Preferred mode:</strong> {item.preferred_mode || 'Not provided'}</p>
                      <p><strong>Overall grade:</strong> <span className="font-black text-primary">{item.overall_grade || 'Not provided'}</span></p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <FileText size={17} className="text-primary" />
                      <h3 className="font-black" style={{ color: 'var(--text)' }}>Subject-by-subject grades and struggles</h3>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {subjects.map((subject: any, index: number) => (
                        <div key={`${subject.subjectName}-${index}`} className="rounded-2xl bg-[var(--input)] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-black" style={{ color: 'var(--text)' }}>{subject.subjectName}</p>
                            <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-black text-white">{subject.grade}</span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-muted">{subject.struggle || 'No struggle provided.'}</p>
                        </div>
                      ))}
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
        </div>
      )}
    </div>
  )
}
