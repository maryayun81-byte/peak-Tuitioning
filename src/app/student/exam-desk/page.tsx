'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Target, Clock, AlertTriangle, ChevronRight, CheckCircle2, ScrollText } from 'lucide-react'
import Link from 'next/link'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getStudentExams } from '@/app/actions/exams'
import { MarkedPaperViewer } from '@/components/exams/MarkedPaperViewer'
import toast from 'react-hot-toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

export default function StudentExamDesk() {
  const [exams, setExams] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<Record<string, any>>({})
  const [schedule, setSchedule] = useState<Record<string, { eventName: string; starts_at: string; ends_at: string; live: boolean }>>({})
  const [recorded, setRecorded] = useState<any[]>([])
  const [viewer, setViewer] = useState<{ title: string; pages: string[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()

  useEffect(() => {
    if (student?.id) {
      loadData()
    }
  }, [student?.id])

  const loadData = async () => {
    try {
      const examsData = await getStudentExams()
      setExams(examsData)

      // Fetch my submissions
      const { data: subs } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('student_id', student!.id)

      if (subs) {
        const subMap = subs.reduce((acc, sub) => ({ ...acc, [sub.exam_id]: sub }), {})
        setSubmissions(subMap)
      }

      // Recorded results (physical papers + direct entries): every exam_mark
      // for this student, newest first — visible regardless of publish state,
      // with the marked paper attached where one was uploaded.
      try {
        const { data: marks } = await supabase
          .from('exam_marks')
          .select('id, exam_event_id, marks, max_marks, percentage, grade, result_status, teacher_comment, subject:subjects(name), exam_event:exam_events(name)')
          .eq('student_id', student!.id)
          .order('created_at', { ascending: false })
          .limit(20)
        const { data: scriptSubs } = await supabase
          .from('submissions')
          .select('worksheet_answers, assignment:assignments!inner(exam_event_id, subject:subjects(name))')
          .eq('student_id', student!.id)
        const pagesByKey: Record<string, string[]> = {}
        for (const ss of (scriptSubs || []) as any[]) {
          const a: any = Array.isArray(ss.assignment) ? ss.assignment[0] : ss.assignment
          const wa: any = ss.worksheet_answers || {}
          const photos: string[] = wa.__workbook_photos__ || (wa.__workbook_photo__ ? [wa.__workbook_photo__] : [])
          const subj: any = a?.subject ? (Array.isArray(a.subject) ? a.subject[0] : a.subject) : null
          if (a?.exam_event_id && subj?.name && photos.length > 0) {
            pagesByKey[`${a.exam_event_id}|${subj.name}`] = photos
          }
        }
        setRecorded(
          ((marks || []) as any[]).map(m => {
            const subjName: string = (m.subject as any)?.name || ''
            return { ...m, _pages: pagesByKey[`${m.exam_event_id || ''}|${subjName}`] || [] }
          })
        )
      } catch { /* recorded results best-effort */ }

      // Event + timetable context: which published paper belongs to which
      // exam event window (Math online in END TERM, etc.). Unlinked papers
      // are practice — always open.
      try {
        const ids = (examsData || []).map((e: any) => e.id)
        if (ids.length > 0) {
          const { data: links } = await supabase
            .from('exam_event_subjects')
            .select('exam_id, exam_event:exam_events(name)')
            .in('exam_id', ids)
          const linkByExam: Record<string, string> = {}
          const subjectIds: string[] = []
          for (const l of (links || []) as any[]) {
            if (!l.exam_id) continue
            const ev: any = Array.isArray(l.exam_event) ? l.exam_event[0] : l.exam_event
            linkByExam[l.exam_id] = ev?.name || 'Exam event'
          }
          // timetable slots joined via event_subject rows
          const { data: slots } = await supabase
            .from('exam_timetable')
            .select('event_subject_id, starts_at, ends_at, event_subject:exam_event_subjects(exam_id)')
          const now = Date.now()
          const map: Record<string, { eventName: string; starts_at: string; ends_at: string; live: boolean }> = {}
          for (const s of (slots || []) as any[]) {
            const exId: string | undefined = (s.event_subject as any)?.exam_id || (Array.isArray(s.event_subject) ? (s.event_subject[0] as any)?.exam_id : undefined)
            if (!exId || !linkByExam[exId]) continue
            const start = new Date(s.starts_at).getTime()
            const end = new Date(s.ends_at).getTime()
            const live = now >= start && now <= end
            // Prefer the live slot, else the next upcoming one
            if (!map[exId] || (live && !map[exId].live)) {
              map[exId] = { eventName: linkByExam[exId], starts_at: s.starts_at, ends_at: s.ends_at, live }
            }
          }
          void subjectIds
          setSchedule(map)
        }
      } catch { /* schedule is best-effort */ }
    } catch (e) {
      toast.error('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 pb-32">
      <div className="bg-gradient-to-r from-rose-500/10 to-orange-500/10 p-6 md:p-8 rounded-3xl border border-rose-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/30">
              <FileText size={24} />
            </div>
            <h1 className="text-3xl font-black" style={{ color: 'var(--text)' }}>Exam Desk</h1>
          </div>
          <p className="text-sm font-bold text-muted ml-14">
            Take official exams set by your teachers in a secure environment.
          </p>
        </div>
        <Link href="/student/ai-exams">
          <Button variant="ghost" className="text-rose-500 hover:bg-rose-500/10">
            Go to AI Practice Exams <ChevronRight size={16} className="ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exams.map((exam, i) => {
          const sub = submissions[exam.id]
          const sched = schedule[exam.id]
          const live = !!sched?.live
          
          return (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full hover:border-rose-500/50 transition-colors group p-6 flex flex-col relative overflow-hidden">
                {sub?.status === 'submitted' && (
                  <div className="absolute top-4 right-4 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest flex items-center gap-1">
                    <CheckCircle2 size={12} /> Submitted
                  </div>
                )}
                {sub?.status === 'in_progress' && (
                  <div className="absolute top-4 right-4 text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest flex items-center gap-1">
                    <Clock size={12} /> In Progress
                  </div>
                )}

                <h3 className="font-bold text-lg mb-2 group-hover:text-rose-500 transition-colors pr-24">{exam.title}</h3>
                <p className="text-sm text-muted font-medium mb-4 flex-1 line-clamp-2">{exam.description || 'No instructions provided.'}</p>

                {sched ? (
                  <div className={`mb-4 p-3 rounded-2xl border text-xs font-bold ${live ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-[var(--input)] border-[var(--card-border)] text-muted]'}`}>
                    {live ? '● LIVE NOW — ' : '◷ '}
                    {sched.eventName} · {new Date(sched.starts_at).toLocaleString()} — {new Date(sched.ends_at).toLocaleTimeString()}
                  </div>
                ) : (
                  <div className="mb-4 text-[11px] font-bold text-muted">Practice paper · open anytime</div>
                )}
                
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted bg-[var(--input)] px-2.5 py-1 rounded-lg">
                    <Clock size={12} /> {exam.duration_minutes} mins
                  </div>
                  {exam.subject && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted bg-[var(--input)] px-2.5 py-1 rounded-lg">
                      <Target size={12} /> {exam.subject.name}
                    </div>
                  )}
                </div>

                {!sub ? (
                  <Link href={`/student/exam-desk/${exam.id}/take`}>
                    <Button variant="primary" className={`w-full shadow-lg ${live ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'}`}>
                      {live ? 'ENTER EXAM' : 'Start Exam'} <ChevronRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                ) : sub.status === 'in_progress' ? (
                  <Link href={`/student/exam-desk/${exam.id}/take`}>
                    <Button variant="secondary" className="w-full">
                      {live ? 'ENTER EXAM — Resume' : 'Resume Exam'} <ChevronRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/student/exam-desk/${exam.id}/result`}>
                    <Button variant="secondary" className="w-full">
                      {sub.status === 'submitted' ? 'View result — marking…' : 'View marked paper'} <ChevronRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                )}
              </Card>
            </motion.div>
          )
        })}

        {exams.length === 0 && (
          <div className="col-span-full py-16 text-center bg-[var(--card)] rounded-3xl border border-[var(--card-border)] border-dashed">
            <FileText size={48} className="mx-auto text-muted mb-4 opacity-20" />
            <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>No Exams Available</h3>
            <p className="text-sm font-bold text-muted">Check back later when your teachers publish new exams.</p>
          </div>
        )}
      </div>

      {/* Recorded results: physical papers + directly entered marks, one list */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <ScrollText size={18} className="text-muted" />
          <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>Recorded results</h2>
        </div>
        {recorded.length === 0 ? (
          <Card className="p-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            No recorded results yet — marked physical papers and teacher-entered marks appear here.
          </Card>
        ) : (
          <Card className="divide-y divide-[var(--card-border)]">
            {recorded.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">
                    {(m.subject as any)?.name} <span className="font-medium" style={{ color: 'var(--text-muted)' }}>· {(m.exam_event as any)?.name}</span>
                  </p>
                  <p className="text-xs font-black mt-0.5">
                    {m.marks}/{m.max_marks ?? '?'} {m.percentage != null ? `(${m.percentage}%)` : ''}
                    {m.grade ? <Badge variant="primary" className="ml-2">{m.grade}</Badge> : null}
                    <Badge variant="muted" className="ml-2">{m.result_status}</Badge>
                  </p>
                </div>
                {m._pages?.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setViewer({ title: `${(m.subject as any)?.name} — marked paper`, pages: m._pages })}
                  >
                    View paper
                  </Button>
                )}
              </div>
            ))}
          </Card>
        )}
      </div>

      {viewer && (
        <MarkedPaperViewer
          isOpen
          onClose={() => setViewer(null)}
          title={viewer.title}
          pages={viewer.pages}
        />
      )}
    </div>
  )
}
