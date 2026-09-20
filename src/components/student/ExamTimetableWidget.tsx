'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CalendarClock, ChevronRight } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface Slot {
  id: string
  starts_at: string
  ends_at: string
  subject_name: string
  event_name: string
  exam_id: string | null
  live: boolean
}

/**
 * Student homepage widget: live + upcoming examination windows from the
 * admin-configured exam timetable. Live papers get ENTER EXAM; upcoming
 * show their window. Falls back to the Exam Desk when nothing is scheduled.
 */
export function ExamTimetableWidget() {
  const supabase = getSupabaseBrowserClient()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const nowIso = new Date().toISOString()
        const { data } = await supabase
          .from('exam_timetable')
          .select(`
            id, starts_at, ends_at,
            subject:subjects(name),
            event_subject:exam_event_subjects(exam_id, exam:exams(title), exam_event:exam_events(name))
          `)
          .gte('ends_at', nowIso)
          .order('starts_at', { ascending: true })
          .limit(6)
        const now = Date.now()
        const mapped: Slot[] = ((data || []) as any[]).map((s: any) => {
          const evSub: any = Array.isArray(s.event_subject) ? s.event_subject[0] : s.event_subject
          const exam: any = evSub?.exam ? (Array.isArray(evSub.exam) ? evSub.exam[0] : evSub.exam) : null
          const event: any = evSub?.exam_event ? (Array.isArray(evSub.exam_event) ? evSub.exam_event[0] : evSub.exam_event) : null
          const subj: any = Array.isArray(s.subject) ? s.subject[0] : s.subject
          return {
            id: s.id,
            starts_at: s.starts_at,
            ends_at: s.ends_at,
            subject_name: subj?.name || exam?.title || 'Examination',
            event_name: event?.name || '',
            exam_id: evSub?.exam_id || null,
            live: now >= new Date(s.starts_at).getTime() && now <= new Date(s.ends_at).getTime(),
          }
        })
        // Live first, then chronological.
        mapped.sort((a, b) => Number(b.live) - Number(a.live))
        setSlots(mapped)
      } catch {
        setSlots([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  if (loading || slots.length === 0) {
    if (loading) return null
    return (
      <Link href="/student/exam-desk" className="block">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white">
            <CalendarClock size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black" style={{ color: 'var(--text)' }}>No exams scheduled right now</p>
            <p className="text-xs text-muted">Open the Exam Desk for practice papers</p>
          </div>
          <ChevronRight size={16} className="text-muted shrink-0" />
        </div>
      </Link>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🗓️</span>
        <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>Exam Timetable</h2>
        <Link href="/student/exam-desk" className="ml-auto text-[10px] font-black uppercase tracking-wider hover:underline" style={{ color: 'var(--primary)' }}>
          Exam Desk →
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {slots.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`min-w-[220px] shrink-0 rounded-2xl border p-4 shadow-lg ${
              s.live ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[var(--card-border)] bg-[var(--card)]'
            }`}
          >
            {s.live ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live now
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                {new Date(s.starts_at).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            )}
            <p className="mt-1 text-sm font-black truncate" style={{ color: 'var(--text)' }}>{s.subject_name}</p>
            {s.event_name && <p className="text-[11px] font-semibold text-muted truncate">{s.event_name}</p>}
            <p className="mt-1 text-[11px] font-bold text-muted">
              {new Date(s.starts_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
              {' — '}
              {new Date(s.ends_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {s.live && s.exam_id ? (
              <Link
                href={`/student/exam-desk/${s.exam_id}/take`}
                className="mt-3 block text-center text-xs font-black text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl py-2 transition-colors"
              >
                ENTER EXAM
              </Link>
            ) : (
              <p className="mt-3 text-center text-[11px] font-bold text-muted">Opens at the scheduled time</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
