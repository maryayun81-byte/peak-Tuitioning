'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Headphones,
  Loader2,
  MonitorPlay,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
  Users,
  Video,
  Wifi,
  Zap,
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

type SessionStatus = 'all' | 'live' | 'scheduled' | 'completed'

const PAGE_SIZE = 8

function formatSessionTime(value?: string) {
  if (!value) return 'Time not set'
  return new Date(value).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTimeHint(value?: string) {
  if (!value) return 'Time pending'
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60000)
  if (minutes <= 0) return 'Starting now'
  if (minutes < 60) return `Starts in ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Starts in ${hours} hr`
  return `Starts in ${Math.round(hours / 24)} days`
}

export default function ParentLivePage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const { parent, selectedStudent, setSelectedStudent } = useAuthStore()

  const [students, setStudents] = useState<any[]>([])
  const [activeStudent, setActiveStudent] = useState<any>(selectedStudent)
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SessionStatus>('all')
  const [page, setPage] = useState(1)

  const loadStudents = useCallback(async () => {
    if (!parent?.id) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('parent_student_links')
      .select('student:students(*, class:classes(name))')
      .eq('parent_id', parent.id)

    const linkedStudents = data?.map((link: any) => link.student).filter(Boolean) ?? []
    setStudents(linkedStudents)

    const nextStudent =
      linkedStudents.find((student: any) => student.id === selectedStudent?.id) ||
      linkedStudents[0] ||
      null

    setActiveStudent(nextStudent)
    if (nextStudent && selectedStudent?.id !== nextStudent.id) {
      setSelectedStudent(nextStudent)
    }
  }, [parent?.id, selectedStudent?.id, setSelectedStudent, supabase])

  const loadSessions = useCallback(async () => {
    if (!activeStudent?.class_id) {
      setSessions([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('live_sessions')
        .select('*, subject:subjects(name), class:classes(name), teacher:teachers(full_name), outcomes:live_session_outcomes(*)')
        .eq('class_id', activeStudent.class_id)
        .order('scheduled_at', { ascending: true })

      if (activeStudent.tuition_center_id) {
        query = query.eq('tuition_center_id', activeStudent.tuition_center_id)
      }

      const { data } = await query
      setSessions(data || [])
    } catch (error) {
      console.error('[ParentLivePage] Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [activeStudent?.class_id, activeStudent?.tuition_center_id, supabase])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  useEffect(() => {
    loadSessions()
    const interval = setInterval(loadSessions, 30000)
    return () => clearInterval(interval)
  }, [loadSessions])

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase()
    return sessions
      .filter((session) => statusFilter === 'all' || session.status === statusFilter)
      .filter((session) => {
        if (!query) return true
        return [session.title, session.subject?.name, session.teacher?.full_name, session.class?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      })
  }, [sessions, search, statusFilter])

  const liveSessions = sessions.filter((session) => session.status === 'live')
  const scheduledSessions = sessions.filter((session) => session.status === 'scheduled')
  const completedSessions = sessions.filter((session) => session.status === 'completed')
  const nextSession = liveSessions[0] || scheduledSessions[0] || sessions[0]
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE))
  const pagedSessions = filteredSessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const chooseStudent = (student: any) => {
    setActiveStudent(student)
    setSelectedStudent(student)
    setPage(1)
  }

  if (loading && students.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Loader2 size={28} className="text-emerald-500 animate-spin" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-600">Loading live sessions</p>
        </div>
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="p-6 lg:p-10">
        <div className="rounded-[2rem] border border-[var(--card-border)] bg-[var(--card)] p-10 text-center shadow-xl shadow-black/5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-5">
            <Users size={30} />
          </div>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text)' }}>Link a student first</h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            Live session visibility appears after your parent account is linked to a student.
          </p>
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 lg:p-10 space-y-8 pb-28">
      <section className="rounded-[2rem] border border-[var(--card-border)] bg-[var(--card)] overflow-hidden shadow-xl shadow-black/5">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 sm:p-8 lg:p-10 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <MonitorPlay size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">Family Live Campus</p>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
                  Know exactly when class is live.
                </h1>
              </div>
            </div>

            <p className="max-w-2xl text-sm sm:text-base leading-7 font-medium" style={{ color: 'var(--text-muted)' }}>
              See upcoming lessons, live status, teachers, and learning goals for your child. Parents get clarity; students keep the classroom controls.
            </p>

            <div className="flex flex-wrap gap-2">
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => chooseStudent(student)}
                  className={`h-11 px-4 rounded-2xl text-xs font-black transition-all ${
                    activeStudent?.id === student.id
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-[var(--input)] border border-[var(--card-border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {student.full_name?.split(' ')[0] || 'Student'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
              <MetricCard label="Live now" value={liveSessions.length} tone="emerald" />
              <MetricCard label="Upcoming" value={scheduledSessions.length} />
              <MetricCard label="Completed" value={completedSessions.length} />
            </div>
          </div>

          <div className="border-t lg:border-l lg:border-t-0 border-[var(--card-border)] bg-emerald-500/[0.06] p-6 sm:p-8 lg:p-10">
            {nextSession ? (
              <ParentNextSession session={nextSession} student={activeStudent} />
            ) : (
              <div className="min-h-[280px] flex flex-col justify-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-white/70 flex items-center justify-center text-emerald-600">
                  <BookOpen size={26} />
                </div>
                <div>
                  <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>No scheduled live lessons</h2>
                  <p className="text-sm mt-2 leading-6" style={{ color: 'var(--text-muted)' }}>
                    When a teacher schedules a room for {activeStudent?.full_name?.split(' ')[0] || 'your child'}, it will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>Session timeline</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {filteredSessions.length} lessons for {activeStudent?.full_name || 'your student'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative sm:w-72">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search title, subject, teacher"
                  className="w-full h-12 pl-10 pr-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] text-sm outline-none focus:border-emerald-500"
                  style={{ color: 'var(--text)' }}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {(['all', 'live', 'scheduled', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status)
                      setPage(1)
                    }}
                    className={`h-12 px-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      statusFilter === status
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-[var(--card)] text-[var(--text-muted)] border border-[var(--card-border)] hover:text-[var(--text)]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {pagedSessions.length === 0 ? (
              <div className="rounded-[1.5rem] border-2 border-dashed border-[var(--card-border)] bg-[var(--card)] p-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--input)] flex items-center justify-center text-[var(--text-muted)] mb-4">
                  <BookOpen size={26} />
                </div>
                <h3 className="font-black" style={{ color: 'var(--text)' }}>No sessions found</h3>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                  Try a different search or filter.
                </p>
              </div>
            ) : (
              pagedSessions.map((session) => <ParentSessionCard key={session.id} session={session} />)
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page === 1}
                className="h-10 px-4 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-xs font-bold disabled:opacity-40"
                style={{ color: 'var(--text)' }}
              >
                Previous
              </button>
              <span className="text-xs font-black px-3" style={{ color: 'var(--text-muted)' }}>
                {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page === totalPages}
                className="h-10 px-4 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-xs font-bold disabled:opacity-40"
                style={{ color: 'var(--text)' }}
              >
                Next
              </button>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <ParentSupportCard />
          <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck size={18} className="text-indigo-500" />
              <h3 className="font-black" style={{ color: 'var(--text)' }}>Access model</h3>
            </div>
            <p className="text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
              Parents monitor readiness and timing. Students join from their own Live Campus so classroom identity and attendance stay clean.
            </p>
          </div>
        </aside>
      </section>
    </motion.div>
  )
}

function MetricCard({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'emerald' | 'slate' }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'emerald' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-[var(--input)] border-[var(--card-border)]'}`}>
      <div className="text-2xl font-black">{value}</div>
      <div className={`text-[10px] font-black uppercase tracking-widest ${tone === 'emerald' ? 'text-white/75' : 'text-[var(--text-muted)]'}`}>{label}</div>
    </div>
  )
}

function ParentNextSession({ session, student }: { session: any; student: any }) {
  const isLive = session.status === 'live'
  return (
    <div className="h-full min-h-[280px] flex flex-col justify-between gap-8">
      <div className="space-y-5">
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
          isLive ? 'bg-emerald-500 text-white' : 'bg-white/70 text-emerald-700'
        }`}>
          {isLive ? <Wifi size={12} /> : <Calendar size={12} />}
          {isLive ? 'Live now' : getTimeHint(session.scheduled_at)}
        </div>
        <div>
          <h2 className="text-2xl font-black leading-tight" style={{ color: 'var(--text)' }}>{session.title}</h2>
          <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
            {student?.full_name?.split(' ')[0] || 'Your child'} should join from the student dashboard when the teacher starts the room.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <InfoRow icon={<Users size={15} />} label={session.teacher?.full_name || 'Peak teacher'} />
        <InfoRow icon={<BookOpen size={15} />} label={session.subject?.name || 'Class session'} />
        <InfoRow icon={<Clock size={15} />} label={`${formatSessionTime(session.scheduled_at)}${session.duration_mins ? `, ${session.duration_mins} min` : ''}`} />
      </div>

      <div className={`h-14 rounded-2xl font-black flex items-center justify-center gap-2 ${
        isLive ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/25' : 'bg-white/70 border border-white text-emerald-700'
      }`}>
        {isLive ? <Bell size={18} /> : <Headphones size={18} />}
        {isLive ? 'Prompt student to join' : 'Help student prepare'}
      </div>
    </div>
  )
}

function ParentSessionCard({ session }: { session: any }) {
  const isLive = session.status === 'live'
  const isCompleted = session.status === 'completed'
  const outcomes = session.outcomes || []

  return (
    <article className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card)] p-5 sm:p-6 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all">
      <div className="flex flex-col md:flex-row md:items-center gap-5">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
          isLive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : isCompleted ? 'bg-indigo-500/10 text-indigo-500' : 'bg-[var(--input)] text-[var(--text-muted)]'
        }`}>
          {isLive ? <Video size={22} /> : isCompleted ? <CheckCircle2 size={22} /> : <Calendar size={22} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <StatusPill status={session.status} />
            {session.subject?.name && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">{session.subject.name}</span>}
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{session.class?.name || 'Class'}</span>
          </div>
          <h3 className="text-lg font-black leading-snug break-words overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]" style={{ color: 'var(--text)' }}>{session.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
            <span className="inline-flex items-center gap-1.5"><Users size={13} /> {session.teacher?.full_name || 'Peak teacher'}</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {formatSessionTime(session.scheduled_at)}</span>
            {session.duration_mins ? <span className="inline-flex items-center gap-1.5"><Target size={13} /> {session.duration_mins} min</span> : null}
            {outcomes.length ? <span className="inline-flex items-center gap-1.5"><UserRoundCheck size={13} /> {outcomes.length} outcomes</span> : null}
          </div>
        </div>

        <div className="md:w-48">
          <div className={`h-12 w-full rounded-2xl flex items-center justify-center text-xs font-black ${
            isLive ? 'bg-emerald-500 text-white' : 'bg-[var(--input)] border border-[var(--card-border)] text-[var(--text-muted)]'
          }`}>
            {isLive ? 'Student can join now' : isCompleted ? 'Lesson completed' : getTimeHint(session.scheduled_at)}
          </div>
        </div>
      </div>
    </article>
  )
}

function StatusPill({ status }: { status: string }) {
  const styles = {
    live: 'bg-emerald-500 text-white',
    scheduled: 'bg-amber-500/10 text-amber-600',
    completed: 'bg-indigo-500/10 text-indigo-600',
  } as Record<string, string>

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${styles[status] || 'bg-[var(--input)] text-[var(--text-muted)]'}`}>
      {status === 'live' ? <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> : null}
      {status || 'scheduled'}
    </span>
  )
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
      <span className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center text-emerald-600">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  )
}

function ParentSupportCard() {
  const items = [
    { icon: <Wifi size={15} />, text: 'Internet is stable' },
    { icon: <Headphones size={15} />, text: 'Headset is ready' },
    { icon: <BookOpen size={15} />, text: 'Book and notes nearby' },
    { icon: <Sparkles size={15} />, text: 'Student joins early' },
  ]

  return (
    <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <Zap size={18} className="text-emerald-500" />
        <h3 className="font-black" style={{ color: 'var(--text)' }}>Parent checklist</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.text} className="rounded-2xl bg-[var(--input)] border border-[var(--card-border)] p-3">
            <div className="text-emerald-500 mb-2">{item.icon}</div>
            <p className="text-xs font-black" style={{ color: 'var(--text)' }}>{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
