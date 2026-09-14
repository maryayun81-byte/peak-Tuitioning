'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap, ChevronRight, BookOpen, Clock, CheckCircle2,
  AlertTriangle, Sparkles,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { getHomeschoolDashboardData } from '@/app/actions/homeschooling'
import { MasteryStatus, KeepItFresh } from '@/components/homeschooling/MasteryStatus'
import { formatTimeRange, getSessionModeLabel } from '@/lib/homeschooling/constants'
import { sessionTimeRelation, isEndedUnfinished, isHappeningNow } from '@/lib/homeschooling/session-time'
import type { LearningSession } from '@/types/homeschooling'

// §42–45 — Student home is personal, not administrative:
// "Good morning, Jane. Ready for today's mission?"
// Sections: Today → Next → Progress → Strengthening → Teacher.

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function firstName(full?: string | null): string {
  if (!full) return 'there'
  return full.trim().split(/\s+/)[0]
}

function objectiveCount(s: LearningSession): number {
  return Array.isArray((s as any).objectives) ? (s as any).objectives.length : 0
}

function teacherName(s: any): string | null {
  return s?.teacher?.full_name || null
}

// Main focus card — §42 NEXT SESSION.
function NextSessionCard({ session, onStart }: { session: LearningSession; onStart: () => void }) {
  const n = objectiveCount(session)
  const teacher = teacherName(session as any)
  const live = isHappeningNow(session as any)
  const ended = isEndedUnfinished(session as any)
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-6 md:p-8 relative overflow-hidden" style={{ borderLeft: '4px solid var(--primary)' }}>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-50 mb-2">
          {live ? 'Happening now' : ended ? 'Unfinished earlier today' : 'Next session'}
        </p>
        <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
          {session.subject?.name}
        </p>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight mt-1" style={{ color: 'var(--text)' }}>
          {session.topic || session.subject?.name}
        </h2>
        <p className="text-sm font-semibold opacity-60 mt-1">
          {formatTimeRange(session.start_time, session.end_time)}
          {n > 0 ? ` · ${n} objective${n !== 1 ? 's' : ''}` : ''}
          {` · ${getSessionModeLabel(session.learning_mode)}`}
        </p>
        {(session as any).learning_goal && (
          <p className="text-sm font-medium opacity-70 mt-3 leading-relaxed">
            {(session as any).learning_goal}
          </p>
        )}
        {teacher && (
          <p className="text-xs font-semibold opacity-50 mt-3">
            Prepared by your {session.subject?.name} teacher, {teacher}.
          </p>
        )}
        <Button onClick={onStart} className="mt-5 rounded-xl h-12 px-8 font-black">
          {ended ? 'Resume Mission' : 'Start Mission'} <ChevronRight size={16} />
        </Button>
      </Card>
    </motion.div>
  )
}

export default function HomeschoolingHubPage() {
  const router = useRouter()
  const { student } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (student?.id) loadDashboard()
  }, [student?.id])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const result = await getHomeschoolDashboardData(student!.id)
      if (result.success) setData(result.data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <SkeletonDashboard />
  if (!data?.enrollment) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="p-12 text-center max-w-md">
          <GraduationCap size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--primary)' }} />
          <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>No Active Enrollment</h2>
          <p className="text-sm opacity-60 font-medium">
            You are not currently enrolled in the homeschooling program. Ask your parent or teacher to enroll you.
          </p>
        </Card>
      </div>
    )
  }

  const name = firstName(student?.full_name || (data.enrollment as any)?.student?.full_name)
  const now = new Date()
  const todaySessions: LearningSession[] = [...(data.todaySessions || [])].sort((a: any, b: any) =>
    String(a.start_time || '').localeCompare(String(b.start_time || ''))
  )
  const pendingItems: any[] = data.pendingItems || []

  const corrections = pendingItems.filter((s: any) => s.status === 'CORRECTIONS_REQUIRED' || s.student_status === 'CORRECTIONS_REQUIRED')
  const missed = [
    ...pendingItems.filter((s: any) => s.status === 'MISSED'),
    // Time truth: today's slot passed but work never finished — surface for
    // resume even before any server-side missed scan runs.
    ...todaySessions.filter((s: any) => isEndedUnfinished(s, now) && s.status !== 'MISSED'),
  ].filter((s: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === s.id) === i)

  // Priority: happening now → upcoming later today → missed → next
  // pending. Stored statuses never move on their own, so the clock decides
  // between "live" and "up next". Corrections keep their own section below.
  const liveNow = todaySessions.find((s: any) => isHappeningNow(s, now))
  const upcomingToday = todaySessions.find((s: any) => sessionTimeRelation(s, now) === 'upcoming')
  const nextPending = pendingItems.find((s: any) => ['UPCOMING', 'NOT_STARTED', 'READY'].includes(s.student_status))
  const focus: LearningSession | null = (liveNow || upcomingToday || missed[0] || nextPending || null) as any

  // "Next" = everything after the focus session.
  const nextUp = [...todaySessions, ...pendingItems.filter((s: any) => !todaySessions.some((t: any) => t.id === s.id))]
    .filter((s: any) => !focus || s.id !== (focus as any).id)
    .slice(0, 3)

  // "Teacher" — what the teacher prepared for the focus/next sessions.
  const teacherNotes = [focus, ...nextUp].filter(Boolean).slice(0, 2)

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-4xl mx-auto pb-16">
      {/* §42 — Personal header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
          {greeting()}, {name} 👋
        </h1>
        <p className="text-sm font-semibold opacity-60 mt-1">
          Ready for today&apos;s mission?
        </p>
      </motion.div>

      {/* §42 — Main focus */}
      {focus ? (
        <NextSessionCard
          session={focus}
          onStart={() => router.push(`/student/homeschooling/session/${(focus as any).id}`)}
        />
      ) : (
        <Card className="p-8 text-center">
          <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: '#10B981' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>You&apos;re all caught up.</p>
          <p className="text-xs font-medium opacity-50 mt-1">Your next learning mission will appear here.</p>
        </Card>
      )}

      {/* §43 — Today */}
      <section>
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] opacity-50 mb-3">Today</h2>
        {todaySessions.length > 0 ? (
          <div className="space-y-2">
            {todaySessions.map((s: any) => {
              const live = isHappeningNow(s, now)
              const ended = isEndedUnfinished(s, now)
              const done = s.student_status === 'COMPLETED'
              return (
              <button
                key={s.id}
                onClick={() => router.push(`/student/homeschooling/session/${s.id}`)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all hover:shadow-md min-h-[64px]"
                style={{
                  borderColor: live ? 'var(--primary)' : 'var(--card-border)',
                  background: 'var(--card)',
                }}
              >
                <span className="text-sm font-black shrink-0" style={{ color: live ? 'var(--primary)' : 'var(--text)' }}>
                  {formatTimeRange(s.start_time, s.end_time)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                    {s.topic || s.subject?.name}
                  </span>
                  <span className="block text-[11px] font-semibold opacity-50">
                    {s.subject?.name}
                    {done ? ' · Done ✓' : live ? ' · Happening now' : ended ? ' · Ended — resume to finish' : ''}
                  </span>
                </span>
                <ChevronRight size={16} className="opacity-30 shrink-0" />
              </button>
              )
            })}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-sm font-semibold opacity-50">Nothing scheduled for today — rest up or get ahead.</p>
          </Card>
        )}
      </section>

      {/* Corrections & missed — §112 "Your progress is still here." */}
      {(corrections.length > 0 || missed.length > 0) && (
        <section>
          <h2 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] mb-3" style={{ color: '#EF4444' }}>
            <AlertTriangle size={13} /> Needs your attention
          </h2>
          <div className="space-y-2">
            {corrections.map((s: any) => (
              <button
                key={s.id}
                onClick={() => router.push(`/student/homeschooling/session/${s.id}`)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl text-left min-h-[64px]"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <AlertTriangle size={16} style={{ color: '#EF4444' }} className="shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                    {s.topic || s.subject?.name} — revisit {Array.isArray(s.questions) ? '' : 'your work'}
                  </span>
                  <span className="block text-[11px] font-semibold opacity-60">Your teacher left feedback — review and resubmit.</span>
                </span>
                <ChevronRight size={16} className="opacity-30 shrink-0" />
              </button>
            ))}
            {missed.map((s: any) => (
              <div key={s.id} className="p-4 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
                <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                  {s.status === 'MISSED'
                    ? `You missed ${s.topic || s.subject?.name}.`
                    : `Earlier today: ${s.topic || s.subject?.name} (${formatTimeRange(s.start_time, s.end_time)}).`}
                </p>
                <p className="text-xs font-medium opacity-60 mt-0.5">Your progress is still here.</p>
                <Button size="sm" className="mt-3 rounded-xl" onClick={() => router.push(`/student/homeschooling/session/${s.id}`)}>
                  Resume Mission <ChevronRight size={14} />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* §43 — Next */}
      {nextUp.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-black uppercase tracking-[0.18em] opacity-50">Next</h2>
            <Link href="/student/homeschooling/timetable" className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
              Full timetable
            </Link>
          </div>
          <div className="space-y-2">
            {nextUp.map((s: any) => (
              <button
                key={s.id}
                onClick={() => router.push(`/student/homeschooling/session/${s.id}`)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border text-left opacity-80 min-h-[60px]"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}
              >
                <Clock size={15} className="opacity-40 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                    {s.topic || s.subject?.name}
                  </span>
                  <span className="block text-[11px] font-semibold opacity-50">
                    {s.day ? `${s.day} · ` : ''}{s.start_time ? formatTimeRange(s.start_time, s.end_time) : s.subject?.name}
                  </span>
                </span>
                <ChevronRight size={16} className="opacity-30 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* §43–44 — Progress: what can I now do? */}
      <section>
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] opacity-50 mb-3">Progress</h2>
        {student?.id && data.enrollment?.id ? (
          <MasteryStatus studentId={student.id} enrollmentId={data.enrollment.id} />
        ) : null}
        <Link href="/student/homeschooling/history" className="flex items-center gap-1 mt-3 text-xs font-bold" style={{ color: 'var(--primary)' }}>
          <BookOpen size={13} /> My learning journey <ChevronRight size={12} />
        </Link>
      </section>

      {/* §43 — Strengthening */}
      {student?.id && (
        <section>
          <h2 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] opacity-50 mb-3">
            <Sparkles size={13} /> Strengthening
          </h2>
          <KeepItFresh studentId={student.id} />
        </section>
      )}

      {/* §43, §45 — Teacher: what has my teacher prepared? */}
      {teacherNotes.length > 0 && (
        <section>
          <h2 className="text-[11px] font-black uppercase tracking-[0.18em] opacity-50 mb-3">From your teacher</h2>
          <div className="space-y-2">
            {teacherNotes.map((s: any) => (
              <Card key={s.id} className="p-4">
                <p className="text-xs font-semibold opacity-50">
                  Prepared by your {s.subject?.name} teacher{teacherName(s) ? `, ${teacherName(s)}` : ''}.
                </p>
                {(s.learning_goal || s.instructions) && (
                  <p className="text-sm font-semibold mt-1.5 leading-relaxed" style={{ color: 'var(--text)' }}>
                    {s.learning_goal ? (
                      <>“Today I want you to be able to {s.learning_goal.charAt(0).toLowerCase() + s.learning_goal.slice(1)}”</>
                    ) : (
                      s.instructions
                    )}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
