'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ClipboardList, ChevronRight, CheckCircle2, Clock, PenLine, Camera, MonitorSmartphone, ListChecks,
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, StatCard, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useTeacherIdentity } from '@/hooks/useTeacherIdentity'
import Link from 'next/link'

/**
 * My Examinations — the teacher's single front door for all exam work.
 * Three lanes: Upcoming (papers to configure + timetable), Marking
 * (physical scripts + online submissions awaiting marks), Results
 * (recently finalized records). Deep links replace the old four-door maze.
 */
export default function TeacherExamsPage() {
  const supabase = getSupabaseBrowserClient()
  const { teacherIds, hasTeacherIdentity } = useTeacherIdentity()
  const [loading, setLoading] = useState(true)
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [markQueue, setMarkQueue] = useState<any[]>([])
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    if (hasTeacherIdentity) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherIds.join('|'), hasTeacherIdentity])

  const load = async () => {
    setLoading(true)
    try {
      const [subjectsRes, papersRes, subsRes, marksRes] = await Promise.all([
        // Subjects assigned to me inside exam events (online + physical).
        supabase
          .from('exam_event_subjects')
          .select('id, delivery_mode, status, total_marks, exam_id, subject:subjects(name), exam_event:exam_events(id, name, status, start_date, end_date)')
          .in('teacher_id', teacherIds)
          .order('created_at', { ascending: false })
          .limit(30),
        // Physical scripts waiting on my marking.
        supabase
          .from('exam_physical_papers')
          .select('id, status, pages, student:students(full_name), subject:subjects(name), exam_event:exam_events(name), assignment_id')
          .in('assigned_teacher_id', teacherIds)
          .in('status', ['uploaded', 'assigned', 'marking'])
          .order('created_at', { ascending: false })
          .limit(20),
        // Online submissions awaiting my marking (my papers only).
        supabase
          .from('exam_submissions')
          .select('id, status, submit_time, student:students(full_name), exam:exams!inner(id, title, teacher_id)')
          .in('exam.teacher_id', teacherIds)
          .eq('status', 'submitted')
          .order('submit_time', { ascending: false })
          .limit(20),
        // My recent teacher-recorded results.
        supabase
          .from('exam_marks')
          .select('id, marks, max_marks, percentage, grade, result_status, created_at, student:students(full_name), subject:subjects(name), exam_event:exam_events(name)')
          .in('teacher_id', teacherIds)
          .order('created_at', { ascending: false })
          .limit(20),
      ])
      setUpcoming(subjectsRes.data || [])

      const queue: any[] = []
      for (const p of (papersRes.data || []) as any[]) {
        const pages = Array.isArray(p.pages) ? p.pages.length : 0
        queue.push({
          id: `physical-${p.id}`,
          kind: 'physical',
          title: `${p.subject?.name || 'Paper'} — ${p.student?.full_name || 'Student'}`,
          meta: `${p.exam_event?.name || ''} · ${pages} page(s) · ${p.status}`,
          href: p.assignment_id ? `/teacher/marking/${p.assignment_id}` : '/teacher/marking',
        })
      }
      for (const s of (subsRes.data || []) as any[]) {
        queue.push({
          id: `online-${s.id}`,
          kind: 'online',
          title: `${s.exam?.title || 'Paper'} — ${s.student?.full_name || 'Student'}`,
          meta: `Submitted ${s.submit_time ? new Date(s.submit_time).toLocaleString() : ''}`,
          href: `/teacher/exam-desk/mark/${s.id}`,
        })
      }
      setMarkQueue(queue)
      setResults(marksRes.data || [])
    } catch (e) {
      console.error('Failed to load exam center', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6"><SkeletonList count={6} /></div>

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <ClipboardList size={24} className="text-primary" /> My Examinations
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Upcoming papers · marking queue · recent results — one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/teacher/exam-desk/create"><Button size="sm"><PenLine size={14} className="mr-1" /> New paper</Button></Link>
          <Link href="/teacher/exam-marks"><Button size="sm" variant="secondary"><ListChecks size={14} className="mr-1" /> Enter marks</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="My subjects" value={upcoming.length} icon={<ClipboardList size={18} />} />
        <StatCard title="Awaiting marking" value={markQueue.length} icon={<Camera size={18} />} />
        <StatCard title="Results recorded" value={results.length} icon={<CheckCircle2 size={18} />} />
        <StatCard title="Online to mark" value={markQueue.filter(q => q.kind === 'online').length} icon={<MonitorSmartphone size={18} />} />
      </div>

      {/* UPCOMING */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Clock size={14} /> Upcoming — configure & schedule
        </h2>
        {upcoming.length === 0 ? (
          <Card className="p-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            No exam subjects assigned to you yet. When admin adds you to an event, it appears here.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((s: any, i: number) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black">{s.subject?.name}</p>
                    <Badge variant={s.delivery_mode === 'online' ? 'info' : 'muted'}>{s.delivery_mode}</Badge>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.exam_event?.name} · out of {s.total_marks}</p>
                  {!s.exam_id && s.delivery_mode !== 'physical' ? (
                    <Link href="/teacher/exam-desk/create">
                      <Button size="sm" className="w-full mt-1">Configure paper <ChevronRight size={14} className="ml-1" /></Button>
                    </Link>
                  ) : (
                    <p className="text-xs font-bold text-emerald-500">{s.delivery_mode === 'physical' ? 'Physical — record marks when done' : 'Paper linked ✓'}</p>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* MARKING */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Camera size={14} /> Marking queue ({markQueue.length})
        </h2>
        {markQueue.length === 0 ? (
          <Card className="p-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            Queue clear. Physical scripts and submitted online papers land here.
          </Card>
        ) : (
          <Card className="divide-y divide-[var(--card-border)]">
            {markQueue.map(q => (
              <Link key={q.id} href={q.href} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--input)] transition-colors">
                <Badge variant={q.kind === 'online' ? 'info' : 'warning'}>{q.kind}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{q.title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{q.meta}</p>
                </div>
                <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
              </Link>
            ))}
          </Card>
        )}
      </section>

      {/* RESULTS */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <CheckCircle2 size={14} /> Recent results
        </h2>
        {results.length === 0 ? (
          <Card className="p-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>No recorded results yet.</Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {(results as any[]).slice(0, 10).map(r => (
                  <tr key={r.id} className="border-b border-[var(--card-border)]">
                    <td className="px-5 py-2.5 font-semibold">{r.student?.full_name}</td>
                    <td className="px-5 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{r.subject?.name} · {r.exam_event?.name}</td>
                    <td className="px-5 py-2.5 font-black whitespace-nowrap">{r.marks}/{r.max_marks} {r.percentage != null ? `(${r.percentage}%)` : ''}</td>
                    <td className="px-5 py-2.5"><Badge variant="primary">{r.grade || '—'}</Badge></td>
                    <td className="px-5 py-2.5"><Badge variant="muted">{r.result_status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  )
}
