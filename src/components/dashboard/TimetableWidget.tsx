'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, UserCircle, DoorOpen, Clock, MapPin } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { useAuthStore } from '@/stores/authStore'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_COLORS: Record<string, string> = {
  Monday: 'border-blue-500/30 bg-blue-500/5',
  Tuesday: 'border-violet-500/30 bg-violet-500/5',
  Wednesday: 'border-emerald-500/30 bg-emerald-500/5',
  Thursday: 'border-amber-500/30 bg-amber-500/5',
  Friday: 'border-rose-500/30 bg-rose-500/5',
}
const DAY_TEXT: Record<string, string> = {
  Monday: 'text-blue-400', Tuesday: 'text-violet-400',
  Wednesday: 'text-emerald-400', Thursday: 'text-amber-400', Friday: 'text-rose-400',
}

interface TimetableEntry {
  id: string
  day: string
  start_time: string
  end_time: string
  room_number?: string
  subject?: { name: string }
  teacher?: { full_name: string }
  class?: { name: string }
  center?: { name: string }
  session_type?: string
}

interface Props {
  role: 'student' | 'teacher'
}

export function TimetableWidget({ role }: Props) {
  const supabase = getSupabaseBrowserClient()
  const { student, teacher, profile } = useAuthStore()
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayIdx = DAYS.indexOf(today)
  const [mobileDay, setMobileDay] = useState(todayIdx >= 0 ? todayIdx : 0)
  const [sessions, setSessions] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (role === 'student' && student) loadStudentTimetable()
    else if (role === 'teacher' && teacher) loadTeacherTimetable()
  }, [student, teacher, profile, role])

  // Safety Timeout: Never let the widget load infinitely
  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setLoading(false), 5000)
      return () => clearTimeout(t)
    }
  }, [loading])

  const loadStudentTimetable = async () => {
    if (!student) return
    setLoading(true)
    const { data } = await supabase
      .from('timetables')
      .select('*, subject:subjects(name), teacher:teachers(full_name), center:tuition_centers(name)')
      .eq('class_id', student.class_id)
      .eq('tuition_center_id', student.tuition_center_id)
      .eq('status', 'published')
      .order('start_time')
    setSessions(data ?? [])
    setLoading(false)
  }

  const loadTeacherTimetable = async () => {
    if (!teacher) return
    setLoading(true)
    try {
      // Only sessions where this teacher is assigned
      const { data } = await supabase
        .from('timetables')
        .select('*, subject:subjects(name), class:classes(name), center:tuition_centers(name)')
        .eq('teacher_id', teacher.id)
        .eq('status', 'published')
        .order('day').order('start_time')
      setSessions(data ?? [])
    } finally {
      setLoading(false)
    }
  }

  const groupedByDay = DAYS.reduce((acc, day) => {
    acc[day] = sessions.filter(s => s.day.toLowerCase() === day.toLowerCase())
    return acc
  }, {} as Record<string, TimetableEntry[]>)

  const hasSessions = sessions.length > 0

  if (loading) return (
    <div className="rounded-2xl border border-[var(--card-border)] p-4 animate-pulse">
      <div className="h-4 w-32 bg-[var(--input)] rounded mb-3" />
      <div className="space-y-2">
        {[1,2,3].map(i => <div key={i} className="h-12 bg-[var(--input)] rounded-xl" />)}
      </div>
    </div>
  )

  if (!hasSessions) return (
    <div className="rounded-2xl border border-[var(--card-border)] p-6 text-center" style={{ background: 'var(--card)' }}>
      <Calendar size={28} className="mx-auto mb-2 opacity-30" />
      <p className="text-sm font-bold text-muted">No timetable available yet</p>
      <p className="text-xs text-muted opacity-60 mt-1">Check back once your schedule is published</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-primary" />
          <span className="text-sm font-black" style={{ color: 'var(--text)' }}>My Timetable</span>
        </div>
        <Badge variant="primary">{sessions.length} classes/week</Badge>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {DAYS.map((day, i) => {
          const count = groupedByDay[day].length
          return (
            <button key={day} onClick={() => setMobileDay(i)}
              className={`px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all shrink-0 ${
                i === mobileDay ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'border border-[var(--card-border)] text-muted'
              }`}
              style={i !== mobileDay ? { background: 'var(--card)' } : {}}>
              {day.slice(0,3)}{day === today ? ' ●' : ''}{count > 0 ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      {/* Sessions for selected day */}
      <div className={`rounded-2xl border p-3 space-y-2 min-h-[80px] ${DAY_COLORS[DAYS[mobileDay]]}`}>
        <div className={`text-[10px] font-black uppercase tracking-widest ${DAY_TEXT[DAYS[mobileDay]]}`}>
          {DAYS[mobileDay]}{DAYS[mobileDay] === today ? ' — Today' : ''}
        </div>
        {groupedByDay[DAYS[mobileDay]].length === 0
          ? <div className="text-xs text-muted py-8 text-center flex flex-col items-center gap-2">
              <Calendar size={20} className="opacity-20" />
              <span>No sessions on this day</span>
            </div>
          : groupedByDay[DAYS[mobileDay]].map(s => (
            <motion.div key={s.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--card-border)]"
              style={{ background: 'var(--card)' }}>
              <div className="shrink-0 text-center min-w-[60px]">
                <div className="text-xs font-black text-primary">{s.start_time}</div>
                <div className="text-[10px] font-bold text-muted">{s.end_time}</div>
              </div>
              <div className="w-px h-8 bg-[var(--card-border)]" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>
                  {s.session_type === 'class' ? s.subject?.name : s.session_type?.toUpperCase()}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {role === 'student' && s.teacher && (
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <UserCircle size={10} />{s.teacher.full_name}
                    </span>
                  )}
                  {role === 'teacher' && s.class && (
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Clock size={10} />{s.class.name}
                    </span>
                  )}
                  {s.room_number && (
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <DoorOpen size={10} />{s.room_number}
                    </span>
                  )}
                </div>
                {s.center?.name && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <MapPin size={9} />{s.center.name}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
      </div>
    </div>
  )
}
