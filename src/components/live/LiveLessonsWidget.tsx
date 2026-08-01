'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, ExternalLink, ChevronLeft, ChevronRight, Radio, Clock, BookOpen, Users } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface LiveLesson {
  id: string; title: string; subject: string | null
  lesson_date: string; start_time: string; end_time: string
  meeting_url: string | null; host_url: string | null
  platform: string | null; is_published: boolean
  class: { name: string } | null
}

// ── Constants ──────────────────────────────────────────────────────────────────
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday']
const DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri']

const PLATFORM: Record<string,{ label:string; color:string; bg:string }> = {
  zoom:        { label:'Zoom',        color:'#2D8CFF', bg:'rgba(45,140,255,0.12)' },
  google_meet: { label:'Google Meet', color:'#34A853', bg:'rgba(52,168,83,0.12)'  },
  teams:       { label:'Teams',       color:'#5558AF', bg:'rgba(85,88,175,0.12)'  },
  other:       { label:'Other',       color:'#8B5CF6', bg:'rgba(139,92,246,0.12)' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function dayName(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long' })
}
function isLiveNow(l: LiveLesson) {
  const today = new Date().toISOString().split('T')[0]
  if (l.lesson_date !== today) return false
  const now = new Date()
  const [sh,sm] = l.start_time.split(':').map(Number)
  const [eh,em] = l.end_time.split(':').map(Number)
  const s = new Date(); s.setHours(sh,sm,0,0)
  const e = new Date(); e.setHours(eh,em,0,0)
  return now >= s && now <= e
}
function getWeekBounds(offset = 0) {
  const now = new Date()
  const dow = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7)
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4)
  const fmt = (d:Date) => d.toISOString().split('T')[0]
  const label = `${mon.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${fri.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`
  // Generate all 5 dates Mon-Fri
  const dates: Record<string,string> = {}
  DAYS.forEach((day,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); dates[day]=fmt(d) })
  return { start:fmt(mon), end:fmt(fri), label, dates }
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface Props { role:'student'|'teacher'; classId?:string; teacherId?:string }

// ── Component ──────────────────────────────────────────────────────────────────
export function LiveLessonsWidget({ role, classId, teacherId }: Props) {
  const supabase = getSupabaseBrowserClient()
  const [lessons,  setLessons]  = useState<LiveLesson[]>([])
  const [loading,  setLoading]  = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [,setTick] = useState(0)

  // Re-render every minute for live detection
  useEffect(()=>{ const t=setInterval(()=>setTick(n=>n+1),60_000); return()=>clearInterval(t) },[])

  const week = getWeekBounds(weekOffset)
  const todayStr = new Date().toISOString().split('T')[0]
  const todayName = new Date().toLocaleDateString('en-US',{weekday:'long'})

  const load = useCallback(async () => {
    setLoading(true)
    let q = (supabase as any)
      .from('live_lessons')
      .select('*, class:classes(name)')
      .order('lesson_date').order('start_time')

    if (role === 'student') {
      q = q.eq('is_published', true)
      if (classId) q = q.eq('class_id', classId)
    } else if (role === 'teacher' && teacherId) {
      // Teachers only see lessons they are assigned to host. A teacher assigned
      // to multiple classes naturally sees all their lessons (grouped by day).
      q = q.eq('teacher_id', teacherId)
    }
    // No date filter — show all lessons so admins can always see something
    // (The UI groups by day and shows empty days clearly)

    const { data, error } = await q
    if (error) console.error('[LiveLessonsWidget]', error)
    // Filter to the current week client-side
    const filtered = (data ?? []).filter((l:LiveLesson) =>
      l.lesson_date >= week.start && l.lesson_date <= week.end
    )
    setLessons(filtered as LiveLesson[])
    setLoading(false)
  }, [role, classId, teacherId, week.start, week.end])

  useEffect(()=>{ void load() },[load])

  // Group by day
  const byDay: Record<string,LiveLesson[]> = {}
  for (const day of DAYS) byDay[day] = lessons.filter(l=>dayName(l.lesson_date)===day)
  const liveNow = lessons.filter(isLiveNow)
  const totalLessons = lessons.length
  const isCurrentWeek = weekOffset === 0

  // ── Lesson card (shared between mobile list and desktop grid) ──────────────
  function LessonCard({ lesson, compact=false }: { lesson:LiveLesson; compact?:boolean }) {
    const live = isLiveNow(lesson)
    const plat = PLATFORM[lesson.platform ?? 'other'] ?? PLATFORM.other
    const url  = (role==='teacher' ? lesson.host_url : null) || lesson.meeting_url

    return (
      <motion.div
        layout
        initial={{ opacity:0, scale:0.96 }}
        animate={{ opacity:1, scale:1 }}
        className="relative rounded-2xl overflow-hidden border transition-all"
        style={{
          borderColor: live ? '#EF4444' : 'var(--card-border)',
          background: live
            ? 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.04))'
            : 'var(--input)',
          boxShadow: live ? '0 0 0 1.5px rgba(239,68,68,0.4), 0 4px 16px rgba(239,68,68,0.15)' : 'none',
        }}
      >
        {/* Platform color bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: live ? '#EF4444' : plat.color }} />

        <div className={compact ? 'pl-3 pr-2 py-2' : 'pl-4 pr-3 py-3'}>
          {/* Live badge + title row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-black leading-tight flex-1 min-w-0"
              style={{ color:'var(--text)', fontSize: compact ? 11 : 13 }}>
              {lesson.title}
            </div>
            {live && (
              <motion.div
                animate={{ opacity:[1,0.4,1] }} transition={{ repeat:Infinity, duration:1.2 }}
                className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white"
                style={{ fontSize:8, fontWeight:900 }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white block" />LIVE
              </motion.div>
            )}
          </div>

          {/* Subject */}
          {lesson.subject && (
            <div className="font-semibold mb-1 truncate"
              style={{ color: plat.color, fontSize: compact ? 9 : 10 }}>
              {lesson.subject}
            </div>
          )}

          {/* Time */}
          <div className="flex items-center gap-1 mb-1.5"
            style={{ color:'var(--text-muted)', fontSize: compact ? 9 : 10 }}>
            <Clock size={compact ? 8 : 9} />
            {lesson.start_time.slice(0,5)} – {lesson.end_time.slice(0,5)}
          </div>

          {/* Class */}
          {lesson.class && (
            <div className="text-[9px] font-medium mb-1.5 truncate"
              style={{ color:'var(--text-muted)' }}>
              {(lesson.class as any).name}
            </div>
          )}

          {/* Platform + Join */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: plat.bg, color: plat.color }}>
              {plat.label}
            </span>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer"
                onClick={e=>e.stopPropagation()}
                className="inline-flex items-center gap-1 font-black rounded-lg px-2 py-1 transition-all hover:scale-[1.06] active:scale-95"
                style={{
                  background: live ? '#EF4444' : plat.color,
                  color:'#fff', fontSize:9,
                  boxShadow: live ? '0 2px 8px rgba(239,68,68,0.4)' : `0 2px 8px ${plat.color}40`
                }}>
                <ExternalLink size={8} />{live ? 'Join Live' : 'Join'}
              </a>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  // ── Empty day slot ──────────────────────────────────────────────────────────
  function EmptyDay() {
    return (
      <div className="flex flex-col items-center justify-center py-6 opacity-30">
        <Video size={16} />
        <span className="text-[9px] mt-1 font-medium">No lessons</span>
      </div>
    )
  }

  if (loading) return (
    <div className="rounded-3xl border p-5 animate-pulse"
      style={{ background:'var(--card)', borderColor:'var(--card-border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-36 rounded-lg bg-[var(--input)]" />
        <div className="h-5 w-20 rounded-full bg-[var(--input)]" />
      </div>
      <div className="space-y-2 sm:hidden">
        {[1,2,3].map(i=><div key={i} className="h-20 rounded-2xl bg-[var(--input)]"/>)}
      </div>
      <div className="hidden sm:grid sm:grid-cols-5 gap-3">
        {[1,2,3,4,5].map(i=><div key={i} className="h-40 rounded-2xl bg-[var(--input)]"/>)}
      </div>
    </div>
  )

  return (
    <motion.section initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }}
      className="rounded-3xl border overflow-hidden"
      style={{ background:'var(--card)', borderColor:'var(--card-border)' }}
    >
      {/* ── LIVE NOW Banner ── */}
      <AnimatePresence>
        {liveNow.length > 0 && (
          <motion.div key="live-banner"
            initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
              style={{ background:'linear-gradient(135deg,#EF4444,#DC2626)', boxShadow:'inset 0 -1px 0 rgba(0,0,0,0.1)' }}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <motion.div animate={{ scale:[1,1.5,1] }} transition={{ repeat:Infinity, duration:1 }}
                  className="w-3 h-3 rounded-full bg-white shrink-0 shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
                <div className="min-w-0">
                  <div className="text-white font-black text-sm sm:text-base truncate">
                    🔴 LIVE — {liveNow[0].title}
                  </div>
                  <div className="text-white/75 text-xs font-medium">
                    {liveNow[0].start_time.slice(0,5)}–{liveNow[0].end_time.slice(0,5)}
                    {liveNow[0].subject && ` · ${liveNow[0].subject}`}
                  </div>
                </div>
              </div>
              {((role==='teacher'?liveNow[0].host_url:null)||liveNow[0].meeting_url) && (
                <a href={(role==='teacher'?liveNow[0].host_url:null)||liveNow[0].meeting_url!}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white font-black text-sm px-5 py-2.5 rounded-2xl transition-transform hover:scale-[1.04] active:scale-95 shadow-lg shrink-0"
                  style={{ color:'#DC2626' }}>
                  <Video size={14} /> Join Now
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor:'var(--card-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
            style={{ background:'linear-gradient(135deg,#1B3A5C,#2563EB)' }}>
            <Video size={16} className="text-white" />
          </div>
          <div>
            <div className="font-black text-sm" style={{ color:'var(--text)' }}>
              Live Lessons
            </div>
            <div className="text-[10px] font-semibold" style={{ color:'var(--text-muted)' }}>
              {week.label}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalLessons > 0 && (
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
              style={{ background:'rgba(37,99,235,0.1)', color:'#2563EB' }}>
              {totalLessons} lesson{totalLessons!==1?'s':''}
            </span>
          )}
          {/* Week navigation */}
          <div className="flex items-center gap-1">
            <button onClick={()=>setWeekOffset(n=>n-1)}
              className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ background:'var(--input)', color:'var(--text-muted)' }}>
              <ChevronLeft size={14} />
            </button>
            <button onClick={()=>setWeekOffset(0)} disabled={isCurrentWeek}
              className="text-[9px] font-black px-2 py-1 rounded-lg transition-all disabled:opacity-30"
              style={{ background:'var(--input)', color:'var(--text-muted)' }}>
              Now
            </button>
            <button onClick={()=>setWeekOffset(n=>n+1)}
              className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ background:'var(--input)', color:'var(--text-muted)' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE: Vertical list grouped by day ── */}
      <div className="sm:hidden divide-y divide-[var(--card-border)]">
        {DAYS.map((day, di) => {
          const dayLessons = byDay[day] ?? []
          const date = week.dates[day]
          const isToday = date === todayStr && isCurrentWeek
          if (!isToday && dayLessons.length === 0) return null // hide empty non-today days on mobile
          return (
            <div key={day} style={{ borderTop: di > 0 ? '1px solid var(--card-border)' : 'none' }}>
              {/* Day chip */}
              <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs"
                  style={{
                    background: isToday ? '#2563EB' : 'var(--input)',
                    color: isToday ? '#fff' : 'var(--text-muted)',
                  }}>
                  {date ? new Date(date+'T12:00:00').getDate() : di+1}
                </div>
                <div>
                  <div className="font-black text-xs" style={{ color: isToday ? '#2563EB' : 'var(--text)' }}>
                    {day}
                  </div>
                  {isToday && <div className="text-[9px] font-bold text-blue-500">Today</div>}
                </div>
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background:'var(--input)', color:'var(--text-muted)' }}>
                  {dayLessons.length}
                </span>
              </div>

              {/* Lessons */}
              <div className="px-4 pb-3 space-y-2">
                {dayLessons.length === 0
                  ? <div className="text-xs italic py-2 text-center opacity-40">No lessons</div>
                  : dayLessons.map(l => <LessonCard key={l.id} lesson={l} />)
                }
              </div>
            </div>
          )
        })}
        {/* Show all-empty state on mobile */}
        {DAYS.every(day => (byDay[day]??[]).length === 0) && (
          <div className="py-10 text-center space-y-2">
            <div className="text-3xl">📅</div>
            <div className="font-black text-sm" style={{ color:'var(--text)' }}>No lessons this week</div>
            <div className="text-xs" style={{ color:'var(--text-muted)' }}>Check back later or browse another week</div>
          </div>
        )}
      </div>

      {/* ── DESKTOP (sm+): 5-column Mon–Fri grid ── */}
      <div className="hidden sm:grid grid-cols-5 divide-x"
        style={{ '--divide-color':'var(--card-border)' } as any}>
        {DAYS.map((day, di) => {
          const dayLessons = byDay[day] ?? []
          const date = week.dates[day]
          const isToday = date === todayStr && isCurrentWeek
          return (
            <div key={day} style={{ borderRight: di < 4 ? '1px solid var(--card-border)' : 'none' }}>
              {/* Column header */}
              <div className="px-3 py-3 border-b text-center"
                style={{
                  borderColor:'var(--card-border)',
                  background: isToday ? 'linear-gradient(180deg,rgba(37,99,235,0.1),transparent)' : 'transparent',
                }}>
                <div className="font-black text-xs uppercase tracking-widest"
                  style={{ color: isToday ? '#2563EB' : 'var(--text-muted)' }}>
                  {DAY_SHORT[di]}
                </div>
                {date && (
                  <div className="text-[10px] font-bold mt-0.5"
                    style={{ color: isToday ? '#2563EB' : 'var(--text-muted)' }}>
                    {new Date(date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
                  </div>
                )}
                {isToday && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mx-auto mt-1" />
                )}
              </div>

              {/* Lessons */}
              <div className="p-2 space-y-2 min-h-[120px]">
                {dayLessons.length === 0
                  ? <EmptyDay />
                  : dayLessons.map(l => <LessonCard key={l.id} lesson={l} compact />)
                }
              </div>
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}
