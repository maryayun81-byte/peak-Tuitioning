'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Clock, ShieldCheck, Megaphone, FileText, AlertTriangle, Camera } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { ExamScriptIntakeModal } from '@/components/admin/ExamScriptIntakeModal'
import {
  getExamControlCenter,
  upsertExamSubject,
  upsertTimetableEntry,
  verifyExamResults,
  publishExamResults,
  generateExamReports,
} from '@/app/actions/homeschool-exams'
import toast from 'react-hot-toast'

export default function ExamControlCenterPage() {
  const params = useParams()
  const examId = params.id as string
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [subjects, setSubjects] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [onlinePapers, setOnlinePapers] = useState<any[]>([])
  const [subjectOpen, setSubjectOpen] = useState(false)
  const [timetableOpen, setTimetableOpen] = useState(false)
  const [intakeOpen, setIntakeOpen] = useState(false)
  const [busy, setBusy] = useState('')

  // subject form
  const [fSubject, setFSubject] = useState('')
  const [fDelivery, setFDelivery] = useState<'online' | 'physical' | 'hybrid'>('physical')
  const [fTeacher, setFTeacher] = useState('')
  const [fExam, setFExam] = useState('')
  const [fTotal, setFTotal] = useState('100')
  const [fTime, setFTime] = useState('120')
  // timetable form
  const [tSubject, setTSubject] = useState('')
  const [tStart, setTStart] = useState('')
  const [tEnd, setTEnd] = useState('')

  const load = async () => {
    setLoading(true)
    const res = await getExamControlCenter(examId)
    if (!res.success) toast.error(res.error)
    else setData(res.data)
    const [sRes, tRes, eRes] = await Promise.all([
      supabase.from('subjects').select('id, name').order('name'),
      supabase.from('teachers').select('id, full_name').order('full_name'),
      supabase.from('exams').select('id, title, status').eq('status', 'published').order('created_at', { ascending: false }).limit(50),
    ])
    setSubjects(sRes.data || [])
    setTeachers(tRes.data || [])
    setOnlinePapers(eRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [examId])

  const saveSubject = async () => {
    if (!fSubject) return toast.error('Pick a subject.')
    setBusy('subject')
    const res = await upsertExamSubject({
      exam_event_id: examId,
      subject_id: fSubject,
      teacher_id: fTeacher || null,
      delivery_mode: fDelivery,
      exam_id: fDelivery === 'physical' ? null : fExam || null,
      total_marks: Number(fTotal) || 100,
      time_allowed_minutes: Number(fTime) || null,
    })
    setBusy('')
    if (!res.success) return toast.error(res.error)
    toast.success('Subject configured.')
    setSubjectOpen(false); setFSubject(''); setFTeacher(''); setFExam('')
    load()
  }

  const saveTimetable = async () => {
    if (!tStart || !tEnd) return toast.error('Start and end required.')
    setBusy('timetable')
    const evSub = (data?.subjects || []).find((s: any) => s.id === tSubject)
    const res = await upsertTimetableEntry({
      exam_event_id: examId,
      event_subject_id: tSubject || null,
      subject_id: evSub?.subject_id || null,
      starts_at: new Date(tStart).toISOString(),
      ends_at: new Date(tEnd).toISOString(),
    })
    setBusy('')
    if (!res.success) return toast.error(res.error)
    toast.success('Timetable entry saved — drives online availability.')
    setTimetableOpen(false); setTSubject(''); setTStart(''); setTEnd('')
    load()
  }

  const doVerify = async () => {
    setBusy('verify')
    const res = await verifyExamResults(examId)
    setBusy('')
    if (!res.success) return toast.error(res.error)
    toast.success(`Verified ${(res.data as any).verified} result(s).`)
    load()
  }

  const doReports = async () => {
    setBusy('reports')
    const res = await generateExamReports(examId)
    setBusy('')
    if (!res.success) return toast.error(res.error)
    toast.success(`Generated ${(res.data as any).reports} report(s).`)
    load()
  }

  const doPublish = async () => {
    if (!confirm('Publish results to students + parents?')) return
    setBusy('publish')
    const res = await publishExamResults(examId)
    setBusy('')
    if (!res.success) return toast.error(res.error)
    toast.success(`Published ${(res.data as any).published} result(s).`)
    load()
  }

  if (loading) return <div className="p-6"><SkeletonList count={6} /></div>
  if (!data) return <div className="p-6">Failed to load.</div>

  const evt = data.event
  const online = data.subjects.filter((s: any) => s.delivery_mode === 'online').length
  const physical = data.subjects.filter((s: any) => s.delivery_mode !== 'online').length

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <Link href="/admin/exam-events" className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft size={14} /> All exam events
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{evt.name}</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {evt.scope === 'homeschool' ? 'Homeschool' : 'Tuition'} · {data.subjects.length} subjects ({online} online · {physical} physical) · {data.marks.length} results
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setIntakeOpen(true)}><Camera size={14} className="mr-1" /> Script intake</Button>
          <Button size="sm" variant="secondary" onClick={doVerify} isLoading={busy === 'verify'}><ShieldCheck size={14} className="mr-1" /> Verify</Button>
          <Button size="sm" variant="secondary" onClick={doReports} isLoading={busy === 'reports'}><FileText size={14} className="mr-1" /> Reports</Button>
          <Button size="sm" onClick={doPublish} isLoading={busy === 'publish'}><Megaphone size={14} className="mr-1" /> Publish</Button>
        </div>
      </div>

      {data.attention.length > 0 && (
        <Card className="p-4 border-amber-300">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-600 mb-2">
            <AlertTriangle size={14} /> Attention required
          </div>
          <ul className="text-sm space-y-1" style={{ color: 'var(--text)' }}>
            {data.attention.map((a: string, i: number) => <li key={i}>⚠ {a}</li>)}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Subjects" value={data.subjects.length} icon={<FileText size={18} />} />
        <StatCard title="Online" value={online} icon={<Clock size={18} />} />
        <StatCard title="Physical" value={physical} icon={<Camera size={18} />} />
        <StatCard title="Results" value={data.marks.length} icon={<ShieldCheck size={18} />} />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-sm">Exam subjects & delivery</h3>
          <Button size="sm" onClick={() => setSubjectOpen(true)}><Plus size={14} className="mr-1" /> Add subject</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase" style={{ color: 'var(--text-muted)' }}>
              <th className="py-2 pr-4">Subject</th><th className="py-2 pr-4">Delivery</th><th className="py-2 pr-4">Teacher</th><th className="py-2 pr-4">Paper</th><th className="py-2 pr-4">Progress</th><th className="py-2">Status</th>
            </tr></thead>
            <tbody>
              {data.subjects.map((s: any) => {
                const p = data.bySubject[s.subject_id] || { total: 0, marked: 0, verified: 0, published: 0 }
                return (
                  <tr key={s.id} className="border-t border-[var(--card-border)]">
                    <td className="py-2 pr-4 font-bold">{s.subject?.name}</td>
                    <td className="py-2 pr-4"><Badge variant={s.delivery_mode === 'online' ? 'info' : 'muted'}>{s.delivery_mode}</Badge></td>
                    <td className="py-2 pr-4 text-xs">{s.teacher?.full_name || '—'}</td>
                    <td className="py-2 pr-4 text-xs">{s.delivery_mode === 'physical' ? 'Teacher records marks directly' : (s.exam_id ? 'Paper linked ✓' : 'Not linked')}</td>
                    <td className="py-2 pr-4 text-xs">{p.total} results · {p.verified} verified · {p.published} published</td>
                    <td className="py-2"><Badge variant="muted">{s.status}</Badge></td>
                  </tr>
                )
              })}
              {data.subjects.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No subjects yet — add Math (online), CRE (physical)…</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-sm">Timetable (drives online availability)</h3>
          <Button size="sm" variant="secondary" onClick={() => setTimetableOpen(true)}><Clock size={14} className="mr-1" /> Add slot</Button>
        </div>
        <div className="space-y-2 text-sm">
          {data.timetable.map((t: any) => (
            <div key={t.id} className="flex justify-between p-2 rounded-xl" style={{ background: 'var(--input)' }}>
              <span className="font-bold">{t.subject?.name || 'Paper'}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(t.starts_at).toLocaleString()} → {new Date(t.ends_at).toLocaleString()}</span>
            </div>
          ))}
          {data.timetable.length === 0 && <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>No slots — online papers unlock via these times.</p>}
        </div>
      </Card>

      <Modal isOpen={subjectOpen} onClose={() => setSubjectOpen(false)} title="Add exam subject" size="sm">
        <div className="space-y-3">
          <Select label="Subject" value={fSubject} onChange={e => setFSubject(e.target.value)}>
            <option value="">Select…</option>
            {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select label="Delivery" value={fDelivery} onChange={e => setFDelivery(e.target.value as any)}>
            <option value="online">Online — student sits digital paper</option>
            <option value="physical">Physical — paper + upload/mark</option>
            <option value="hybrid">Hybrid</option>
          </Select>
          <Select label="Teacher (owns paper / marking)" value={fTeacher} onChange={e => setFTeacher(e.target.value)}>
            <option value="">Select…</option>
            {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </Select>
          {fDelivery !== 'physical' && (
            <Select label="Online paper (teacher-configured)" value={fExam} onChange={e => setFExam(e.target.value)}>
              <option value="">Link later</option>
              {onlinePapers.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </Select>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Total marks" type="number" value={fTotal} onChange={e => setFTotal(e.target.value)} />
            <Input label="Time (min)" type="number" value={fTime} onChange={e => setFTime(e.target.value)} />
          </div>
          <Button className="w-full" onClick={saveSubject} isLoading={busy === 'subject'}>Save subject</Button>
        </div>
      </Modal>

      <Modal isOpen={timetableOpen} onClose={() => setTimetableOpen(false)} title="Add timetable slot" size="sm">
        <div className="space-y-3">
          <Select label="Exam subject" value={tSubject} onChange={e => setTSubject(e.target.value)}>
            <option value="">Select…</option>
            {data.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject?.name} ({s.delivery_mode})</option>)}
          </Select>
          <Input label="Starts at" type="datetime-local" value={tStart} onChange={e => setTStart(e.target.value)} />
          <Input label="Ends at" type="datetime-local" value={tEnd} onChange={e => setTEnd(e.target.value)} />
          <Button className="w-full" onClick={saveTimetable} isLoading={busy === 'timetable'}>Save slot</Button>
        </div>
      </Modal>

      <ExamScriptIntakeModal exam={data.event} isOpen={intakeOpen} onClose={() => { setIntakeOpen(false); load() }} />
    </div>
  )
}
