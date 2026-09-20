'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ExamRoom } from '@/components/student/ExamRoom'
import { getExamWithQuestions } from '@/app/actions/exams'
import { getServerTime } from '@/app/actions/exams'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

export default function TakeExamPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [examData, setExamData] = useState<any>(null)
  const [timetable, setTimetable] = useState<any>(null)
  const [eventName, setEventName] = useState<string | null>(null)
  const [gate, setGate] = useState<'loading' | 'open' | 'early' | 'closed'>('loading')

  useEffect(() => {
    if (id) loadExam()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadExam = async () => {
    try {
      const data = await getExamWithQuestions(id as string)
      setExamData(data)

      // Timetable gate: if this paper is linked to an exam event subject with
      // a timetable slot, the student enters only inside the window.
      // Unlinked practice papers stay open (no gate).
      try {
        const { data: link } = await supabase
          .from('exam_event_subjects')
          .select('id, exam_event_id, exam_event:exam_events(name)')
          .eq('exam_id', id as string)
          .maybeSingle()
        if (link) {
          const ev: any = Array.isArray((link as any).exam_event) ? (link as any).exam_event[0] : (link as any).exam_event
          setEventName(ev?.name || null)
          const { data: slots } = await supabase
            .from('exam_timetable')
            .select('*')
            .eq('event_subject_id', (link as any).id)
            .order('starts_at', { ascending: true })
          const now = await getServerTime().catch(() => Date.now())
          const current = (slots || []).find(s => now >= new Date(s.starts_at).getTime() && now <= new Date(s.ends_at).getTime())
          const upcoming = (slots || []).find(s => now < new Date(s.starts_at).getTime())
          if (slots && slots.length > 0) {
            if (current) { setTimetable(current); setGate('open') }
            else if (upcoming) { setTimetable(upcoming); setGate('early') }
            else { setTimetable(slots[slots.length - 1]); setGate('closed') }
          } else {
            setGate('open')
          }
        } else {
          setGate('open')
        }
      } catch {
        setGate('open')
      }
    } catch (e) {
      toast.error('Failed to load exam')
      setGate('closed')
    }
  }

  if (gate === 'loading' || !examData) {
    return <div className="min-h-screen bg-[var(--bg)] p-8 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-rose-500 border-t-transparent animate-spin" /></div>
  }

  if (gate === 'early') {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-8 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center space-y-3">
          <p className="font-black text-lg">{examData.title}</p>
          <p className="text-sm text-muted">This examination opens at</p>
          <p className="font-black">{timetable ? new Date(timetable.starts_at).toLocaleString() : ''}</p>
          <Button onClick={() => router.push('/student/exam-desk')}>Back to Exam Desk</Button>
        </Card>
      </div>
    )
  }

  if (gate === 'closed') {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-8 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center space-y-3">
          <p className="font-black text-lg">{examData.title}</p>
          <p className="text-sm text-muted">This examination window has closed.</p>
          <Button onClick={() => router.push('/student/exam-desk')}>Back to Exam Desk</Button>
        </Card>
      </div>
    )
  }

  return <ExamRoom examData={examData} timetable={timetable} eventName={eventName} />
}
