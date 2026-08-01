'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video, Plus, Pencil, Trash2, Eye, EyeOff, ChevronLeft,
  ChevronRight, Calendar, School, Radio, ExternalLink, Clock
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import LiveLessonModal from '@/components/admin/LiveLessonModal'
import { getEventWeeks } from '@/lib/utils'
import toast from 'react-hot-toast'

// ── Types ────────────────────────────────────────────────────────────────────
interface TuitionEvent { id: string; name: string; start_date: string; end_date: string; is_active: boolean; active_days: string[] }
interface ClassRecord   { id: string; name: string; curriculum_id: string }
interface LiveLesson {
  id: string; title: string; subject: string | null; lesson_date: string
  start_time: string; end_time: string; platform: string | null
  meeting_url: string | null; host_url: string | null
  is_published: boolean; week_number: number | null
  teacher: { full_name: string } | null; class: { name: string } | null
  class_id: string; teacher_id: string | null; tuition_event_id: string | null
  notes: string | null
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday']
const PLATFORM_BADGE: Record<string,{ label:string; color:string }> = {
  zoom:        { label:'Zoom',        color:'#2D8CFF' },
  google_meet: { label:'Google Meet', color:'#34A853' },
  teams:       { label:'Teams',       color:'#5558AF' },
  other:       { label:'Other',       color:'#6B7280' },
}

function dayName(dateStr: string) {
  return new Date(dateStr+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'})
}
function isLiveNow(l: LiveLesson) {
  const today = new Date().toISOString().split('T')[0]
  if (l.lesson_date!==today) return false
  const now=new Date()
  const [sh,sm]=l.start_time.split(':').map(Number)
  const [eh,em]=l.end_time.split(':').map(Number)
  const s=new Date(); s.setHours(sh,sm,0,0)
  const e=new Date(); e.setHours(eh,em,0,0)
  return now>=s && now<=e
}

export default function AdminLiveLessonsPage() {
  const supabase = getSupabaseBrowserClient()
  const [events,   setEvents]   = useState<TuitionEvent[]>([])
  const [classes,  setClasses]  = useState<ClassRecord[]>([])
  const [lessons,  setLessons]  = useState<LiveLesson[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selEvent, setSelEvent] = useState('')
  const [selClass, setSelClass] = useState('')
  const [weekNum,  setWeekNum]  = useState(1)
  const [modalOpen,setModalOpen]= useState(false)
  const [editing,  setEditing]  = useState<LiveLesson|null>(null)
  const [,setTick] = useState(0)

  useEffect(()=>{ const t=setInterval(()=>setTick(n=>n+1),60_000); return()=>clearInterval(t) },[])

  // Load reference data
  useEffect(()=>{
    (async()=>{
      const [evRes,clRes] = await Promise.all([
        supabase.from('tuition_events').select('*').order('created_at',{ascending:false}),
        supabase.from('classes').select('id,name,curriculum_id').order('name'),
      ])
      const evs = (evRes.data??[]) as TuitionEvent[]
      setEvents(evs)
      setClasses((clRes.data??[]) as ClassRecord[])
      const active = evs.find(e=>e.is_active)
      if (active) {
        setSelEvent(active.id)
        // find current week
        const weeks = getEventWeeks(active.start_date, active.end_date, active.active_days||[], [])
        const today = new Date().toISOString().split('T')[0]
        const cur = weeks.find(w=>{
          const ws=(w.startDate instanceof Date?w.startDate:new Date(w.startDate)).toISOString().split('T')[0]
          const we=(w.endDate   instanceof Date?w.endDate  :new Date(w.endDate  )).toISOString().split('T')[0]
          return today>=ws && today<=we
        })
        if (cur) setWeekNum(cur.weekNumber)
      }
    })()
  },[])

  const selectedEvent = useMemo(()=>events.find(e=>e.id===selEvent)??null,[events,selEvent])
  const weeks = useMemo(()=>{
    if (!selectedEvent) return []
    return getEventWeeks(selectedEvent.start_date,selectedEvent.end_date,selectedEvent.active_days||[],[])
  },[selectedEvent])
  const selectedWeek = useMemo(()=>weeks.find(w=>w.weekNumber===weekNum)??null,[weeks,weekNum])

  // Date range for selected week
  const weekDates = useMemo(()=>{
    if (!selectedWeek) return { start:'', end:'' }
    const s=selectedWeek.startDate instanceof Date?selectedWeek.startDate:new Date(selectedWeek.startDate)
    const e=selectedWeek.endDate   instanceof Date?selectedWeek.endDate  :new Date(selectedWeek.endDate)
    return { start:s.toISOString().split('T')[0], end:e.toISOString().split('T')[0] }
  },[selectedWeek])

  // Load lessons — all filters are optional so lessons always surface
  const loadLessons = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('live_lessons')
      .select('*, class:classes(name), teacher:teachers(full_name)')
      .order('lesson_date')
      .order('start_time')

    // Only filter by event if one is selected
    if (selEvent) q = q.eq('tuition_event_id', selEvent)

    // Only filter by week date range if a week is resolved
    if (weekDates.start && weekDates.end) {
      q = q.gte('lesson_date', weekDates.start).lte('lesson_date', weekDates.end)
    }

    // Optional class filter
    if (selClass) q = q.eq('class_id', selClass)

    const { data, error } = await q
    if (error) { console.error('[LiveLessons]', error); toast.error('Failed to load lessons') }
    setLessons((data ?? []) as LiveLesson[])
    setLoading(false)
  }, [selEvent, weekDates.start, weekDates.end, selClass])

  useEffect(()=>{ void loadLessons() },[loadLessons])

  // Group by day
  const byDay: Record<string,LiveLesson[]> = {}
  for (const day of DAYS) byDay[day]=lessons.filter(l=>dayName(l.lesson_date)===day)

  async function togglePublish(l: LiveLesson) {
    const { error } = await supabase.from('live_lessons').update({is_published:!l.is_published}).eq('id',l.id)
    if (error) { toast.error('Failed'); return }
    toast.success(l.is_published?'Unpublished':'Published!')
    setLessons(prev=>prev.map(x=>x.id===l.id?{...x,is_published:!x.is_published}:x))
  }

  async function deleteLesson(l: LiveLesson) {
    if (!confirm(`Delete "${l.title}"?`)) return
    await supabase.from('live_lessons').delete().eq('id',l.id)
    setLessons(prev=>prev.filter(x=>x.id!==l.id))
    toast.success('Deleted')
  }

  const todayName = new Date().toLocaleDateString('en-US',{weekday:'long'})
  const weekLabel = selectedWeek?.label ?? `Week ${weekNum}`

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{background:'var(--bg)'}}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{background:'linear-gradient(135deg,#1B3A5C,#2563EB)'}}>
              <Video size={20} className="text-white"/>
            </div>
            <div>
              <h1 className="font-black text-xl" style={{color:'var(--text)'}}>Live Lessons Timetable</h1>
              <p className="text-xs font-medium" style={{color:'var(--text-muted)'}}>
                Schedule and publish live lessons for students and teachers
              </p>
            </div>
          </div>
        </div>
        <Button onClick={()=>{setEditing(null);setModalOpen(true)}} className="shadow-lg shadow-primary/20">
          <Plus size={15}/> New Lesson
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-3 gap-4"
        style={{background:'var(--card)',borderColor:'var(--card-border)'}}>
        <Select label="Tuition Event" value={selEvent} onChange={e=>setSelEvent(e.target.value)}>
          <option value="">Select event…</option>
          {events.map(ev=>(
            <option key={ev.id} value={ev.id}>{ev.name}{ev.is_active?' ● Active':''}</option>
          ))}
        </Select>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{color:'var(--text-muted)'}}>Week</label>
          <div className="flex items-center gap-1.5">
            <button onClick={()=>setWeekNum(n=>Math.max(1,n-1))} disabled={weekNum<=1||!weeks.length}
              className="p-2 rounded-lg disabled:opacity-30 transition-colors"
              style={{background:'var(--input)',color:'var(--text-muted)'}}>
              <ChevronLeft size={14}/>
            </button>
            <select value={weekNum} onChange={e=>setWeekNum(parseInt(e.target.value))}
              disabled={!weeks.length}
              className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none"
              style={{background:'var(--input)',borderColor:'var(--card-border)',color:'var(--text)'}}>
              {weeks.length===0
                ? <option>Select an event first</option>
                : weeks.map(w=><option key={w.weekNumber} value={w.weekNumber}>{w.label}</option>)
              }
            </select>
            <button onClick={()=>setWeekNum(n=>Math.min(weeks.length,n+1))} disabled={weekNum>=weeks.length||!weeks.length}
              className="p-2 rounded-lg disabled:opacity-30 transition-colors"
              style={{background:'var(--input)',color:'var(--text-muted)'}}>
              <ChevronRight size={14}/>
            </button>
          </div>
        </div>
        <Select label="Filter by Class" value={selClass} onChange={e=>setSelClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        {[
          { label:'Total', val:lessons.length, color:'#2563EB' },
          { label:'Published', val:lessons.filter(l=>l.is_published).length, color:'#10B981' },
          { label:'Draft', val:lessons.filter(l=>!l.is_published).length, color:'#F59E0B' },
          { label:'Live Now', val:lessons.filter(isLiveNow).length, color:'#EF4444' },
        ].map(s=>(
          <div key={s.label} className="rounded-xl px-4 py-2.5 border flex items-center gap-2"
            style={{background:'var(--card)',borderColor:'var(--card-border)'}}>
            <div className="w-2 h-2 rounded-full" style={{background:s.color}}/>
            <span className="text-xs font-bold" style={{color:'var(--text-muted)'}}>{s.label}</span>
            <span className="text-sm font-black" style={{color:'var(--text)'}}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* Mon–Fri timetable grid */}
      {loading
        ? <div className="grid grid-cols-5 gap-3">{DAYS.map(d=><div key={d} className="h-64 rounded-2xl bg-[var(--card)] border animate-pulse" style={{borderColor:'var(--card-border)'}}/>)}</div>
        : (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {DAYS.map(day=>{
              const dayLessons = byDay[day]??[]
              const isToday = day===todayName
              // Find the actual date for this day in the selected week
              const lessonDate = dayLessons[0]?.lesson_date ?? ''
              return (
                <div key={day} className="rounded-2xl border overflow-hidden flex flex-col"
                  style={{background:'var(--card)',borderColor:isToday?'#2563EB':'var(--card-border)',boxShadow:isToday?'0 0 0 1px #2563EB inset':'none'}}>
                  {/* Day header */}
                  <div className="px-3 py-2.5 border-b flex items-center justify-between"
                    style={{background:isToday?'rgba(37,99,235,0.08)':'var(--input)',borderColor:'var(--card-border)'}}>
                    <div>
                      <div className="font-black text-xs uppercase tracking-wider" style={{color:isToday?'#2563EB':'var(--text)'}}>
                        {day.slice(0,3)}
                      </div>
                      {isToday && <div className="text-[9px] font-bold text-blue-500">Today</div>}
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{background:'var(--card)',color:'var(--text-muted)'}}>
                      {dayLessons.length}
                    </span>
                  </div>

                  {/* Lessons */}
                  <div className="flex-1 p-2 space-y-2">
                    {dayLessons.length===0
                      ? <div className="h-24 flex items-center justify-center text-[11px] italic" style={{color:'var(--text-muted)'}}>No lessons</div>
                      : dayLessons.map(lesson=>{
                          const live = isLiveNow(lesson)
                          const plat = PLATFORM_BADGE[lesson.platform??'other']??PLATFORM_BADGE.other
                          return (
                            <motion.div key={lesson.id} layout
                              className="rounded-xl p-2.5 border relative"
                              style={{
                                borderColor:live?'#ef4444':lesson.is_published?'rgba(16,185,129,0.3)':'var(--card-border)',
                                background:live?'rgba(239,68,68,0.06)':lesson.is_published?'rgba(16,185,129,0.04)':'var(--input)',
                              }}>
                              {/* Live pulse */}
                              {live && <motion.div animate={{opacity:[0.5,1,0.5]}} transition={{repeat:Infinity,duration:1.5}}
                                className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500"/>}

                              <div className="font-black text-xs mb-1 pr-4" style={{color:'var(--text)'}}>{lesson.title}</div>
                              {lesson.subject && <div className="text-[10px] font-semibold mb-1" style={{color:plat.color}}>{lesson.subject}</div>}
                              {lesson.class && <div className="text-[10px] font-medium mb-1" style={{color:'var(--text-muted)'}}><School size={9} className="inline mr-0.5"/>{(lesson.class as any).name}</div>}
                              {lesson.teacher && <div className="text-[10px] font-medium mb-1.5" style={{color:'var(--text-muted)'}}>{(lesson.teacher as any).full_name}</div>}
                              <div className="text-[10px] font-bold mb-2" style={{color:'var(--text-muted)'}}>
                                <Clock size={9} className="inline mr-0.5"/>{lesson.start_time.slice(0,5)}–{lesson.end_time.slice(0,5)}
                              </div>
                              <div className="flex items-center gap-1 mb-2">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{background:`${plat.color}20`,color:plat.color}}>{plat.label}</span>
                                {live && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500 text-white">LIVE</span>}
                              </div>
                              {lesson.meeting_url && (
                                <a href={lesson.meeting_url} target="_blank" rel="noopener noreferrer"
                                  className="text-[9px] font-bold flex items-center gap-1 mb-2 hover:opacity-70 transition-opacity"
                                  style={{color:'#2563EB'}}>
                                  <ExternalLink size={9}/> Student join link
                                </a>
                              )}

                              {/* Actions */}
                              <div className="flex items-center gap-1 pt-1.5 border-t" style={{borderColor:'var(--card-border)'}}>
                                <button onClick={()=>togglePublish(lesson)}
                                  className="flex-1 flex items-center justify-center gap-1 text-[9px] font-black py-1 rounded-lg transition-all hover:scale-[1.04]"
                                  style={{background:lesson.is_published?'rgba(16,185,129,0.12)':'var(--card)',color:lesson.is_published?'#10B981':'var(--text-muted)',border:'1px solid var(--card-border)'}}>
                                  {lesson.is_published?<><Eye size={9}/> Published</>:<><EyeOff size={9}/> Draft</>}
                                </button>
                                <button onClick={()=>{setEditing(lesson);setModalOpen(true)}}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-[var(--input)]"
                                  style={{color:'var(--text-muted)'}}>
                                  <Pencil size={11}/>
                                </button>
                                <button onClick={()=>deleteLesson(lesson)}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                                  style={{color:'var(--text-muted)'}}>
                                  <Trash2 size={11}/>
                                </button>
                              </div>
                            </motion.div>
                          )
                        })
                    }
                  </div>

                  {/* Add lesson to this day */}
                  <div className="p-2 border-t" style={{borderColor:'var(--card-border)'}}>
                    <button
                      onClick={()=>{setEditing(null);setModalOpen(true)}}
                      className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-bold transition-all hover:bg-[var(--input)]"
                      style={{color:'var(--text-muted)',border:'1px dashed var(--card-border)'}}>
                      <Plus size={10}/> Add
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }

      {/* Modal */}
      <LiveLessonModal
        isOpen={modalOpen}
        onClose={()=>{setModalOpen(false);setEditing(null)}}
        onSaved={loadLessons}
        events={events}
        classes={classes}
        editing={editing}
        defaultEventId={selEvent}
      />
    </div>
  )
}
