'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar as CalIcon, Clock, MapPin, 
  User, ChevronLeft, ChevronRight, 
  Filter, Zap, Play, CheckCircle2, ArrowRight,
  Info, School, Coffee, BookOpen, LayoutGrid, List
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'
]

export default function StudentSchedule() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const { student } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [activeDay, setActiveDay] = useState(DAYS[new Date().getDay() - 1] || 'Monday')

  useEffect(() => {
    if (student) loadSchedule()
  }, [student])

  const loadSchedule = async () => {
    if (!student) return
    setLoading(true)
    try {
      // ── Strict tuition center filtering ──
      const { data, error } = await supabase
        .from('timetables')
        .select(`
          *, 
          teacher:teachers(full_name), 
          subject:subjects(name),
          center:tuition_centers(name)
        `)
        .eq('class_id', student.class_id)
        .eq('tuition_center_id', student.tuition_center_id)
        .eq('status', 'published')
        .order('start_time')
      
      if (error) throw error
      setSchedule(data ?? [])
    } catch (e) {
      toast.error('Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }

  const daySchedule = schedule.filter(s => s.day === activeDay)

  // Helper for grid positioning
  const getSessionStyle = (startTime: string, endTime: string) => {
    const startHour = parseInt(startTime.split(':')[0])
    const startMin = parseInt(startTime.split(':')[1])
    const endHour = parseInt(endTime.split(':')[0])
    const endMin = parseInt(endTime.split(':')[1])
    
    const startPos = (startHour - 8) * 60 + startMin
    const duration = (endHour - startHour) * 60 + (endMin - startMin)
    
    return {
      top: `${(startPos / 60) * 100}px`,
      height: `${(duration / 60) * 100}px`
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text)' }}>Weekly Roadmap</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Stay on track with your interactive academic schedule</p>
         </div>
         <div className="flex items-center gap-3">
            <div className="flex bg-[var(--input)] p-1 rounded-xl border border-[var(--card-border)]">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-primary'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-primary'}`}
              >
                <List size={18} />
              </button>
            </div>
            <Button variant="secondary" onClick={loadSchedule} size="sm">
              <Zap size={14} className="mr-2" /> Refresh
            </Button>
         </div>
      </div>

      {loading ? <SkeletonDashboard /> : (
        <div className="space-y-6">
          {/* Day Selector (Mobile/List View) */}
          <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar scroll-smooth">
             {DAYS.map(day => (
               <button 
                 key={day}
                 onClick={() => setActiveDay(day)}
                 className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap border-2 ${activeDay === day ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105' : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--card-border)] hover:bg-[var(--input)]'}`}
               >
                  {day}
               </button>
             ))}
          </div>

          <Card className="overflow-hidden border-none shadow-2xl relative" style={{ background: 'var(--card)' }}>
            {viewMode === 'list' ? (
              /* ── List View ── */
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {daySchedule.length > 0 ? daySchedule.map((item, i) => (
                  <ScheduleCard key={item.id} item={item} i={i} />
                )) : (
                  <EmptyState day={activeDay} />
                )}
              </div>
            ) : (
              /* ── Grid View (Desktop style) ── */
              <div className="p-0 md:p-4 overflow-x-auto">
                <div className="min-w-[1200px]">
                  {/* Grid Header */}
                  <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-[var(--card-border)] text-[10px] font-black uppercase tracking-[0.2em] text-muted py-4">
                    <div className="pl-4">Time</div>
                    {DAYS.map(day => (
                      <div key={day} className={`text-center ${day === activeDay ? 'text-primary' : ''}`}>{day}</div>
                    ))}
                  </div>

                  {/* Grid Body */}
                  <div className="relative grid grid-cols-[100px_repeat(7,1fr)] h-[600px]">
                    {/* Time labels column */}
                    <div className="relative pt-2">
                       {TIME_SLOTS.map(time => (
                         <div key={time} className="h-[100px] text-[10px] font-bold text-muted pl-4 border-r border-[var(--card-border)] flex items-start pt-1">
                           {time}
                         </div>
                       ))}
                    </div>

                    {/* Day columns */}
                    {DAYS.map(day => (
                      <div key={day} className={`relative border-r border-[var(--card-border)] last:border-r-0 ${day === activeDay ? 'bg-primary/5' : ''}`}>
                         {/* Hour lines */}
                         {TIME_SLOTS.map(t => (
                           <div key={t} className="h-[100px] border-b border-[var(--card-border)] opacity-20" />
                         ))}

                         {/* Sessions */}
                         {schedule.filter(s => s.day === day).map(s => {
                           const isBreak = s.session_type === 'break'
                           const isPrep = s.session_type === 'prep'
                           const style = getSessionStyle(s.start_time, s.end_time)
                           
                           return (
                             <motion.div 
                                key={s.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`absolute left-1 right-1 rounded-xl p-3 border-2 overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] hover:z-20 ${
                                  isBreak ? 'bg-emerald-500/10 border-emerald-500/30' :
                                  isPrep ? 'bg-amber-500/10 border-amber-500/30' :
                                  'bg-primary/10 border-primary/30'
                                }`}
                                style={style}
                             >
                                <div className="flex flex-col h-full">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">{s.start_time} - {s.end_time}</span>
                                    {isBreak && <Coffee size={12} className="text-emerald-500" />}
                                    {isPrep && <BookOpen size={12} className="text-amber-500" />}
                                  </div>
                                  <div className="font-black text-[11px] leading-tight truncate uppercase italic pr-2">
                                    {s.session_type === 'class' ? s.subject?.name : s.session_type}
                                  </div>
                                  <div className="mt-auto flex flex-col gap-0.5">
                                    {s.teacher && (
                                       <div className="flex items-center gap-1 text-[9px] font-bold text-muted truncate">
                                         <User size={8} /> {s.teacher.full_name}
                                       </div>
                                    )}
                                    {s.center?.name && (
                                       <div className="inline-flex items-center gap-1 text-[8px] font-black bg-white/40 dark:bg-black/20 px-1.5 py-0.5 rounded-md text-primary w-fit">
                                         <MapPin size={8} /> {s.center.name}
                                       </div>
                                    )}
                                  </div>
                                </div>
                             </motion.div>
                           )
                         })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-6 justify-center text-[10px] uppercase font-black tracking-widest text-muted">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-md bg-primary/20 border border-primary/40" /> Academic Class</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/40" /> Break Time</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500/40" /> Prep Period</div>
      </div>
    </div>
  )
}

function ScheduleCard({ item, i }: { item: any, i: number }) {
  const isBreak = item.session_type === 'break'
  const isPrep = item.session_type === 'prep'

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
      <Card className={`p-6 relative group border-none shadow-xl hover:shadow-2xl hover:shadow-primary/5 transition-all overflow-hidden ${isBreak ? 'bg-emerald-500/5' : isPrep ? 'bg-amber-500/5' : 'bg-[var(--card)]'}`}>
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-2xl opacity-10 group-hover:opacity-30 transition-all ${isBreak ? 'bg-emerald-500' : isPrep ? 'bg-amber-500' : 'bg-primary'}`} />
        <div className={`absolute top-0 left-0 w-1.5 h-full ${isBreak ? 'bg-emerald-500' : isPrep ? 'bg-amber-500' : 'bg-primary'}`} />
        
        <div className="flex items-start justify-between mb-8 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[var(--input)] flex flex-col items-center justify-center font-black shadow-inner border border-[var(--card-border)]">
              <span className={`text-sm ${isBreak ? 'text-emerald-500' : isPrep ? 'text-amber-500' : 'text-primary'}`}>{item.start_time.split(':')[0]}</span>
              <span className="text-[10px] text-muted">{item.start_time.split(':')[1]}</span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="muted" className="text-[9px] uppercase tracking-widest">{item.room_number || 'Room 101'}</Badge>
            {item.center?.name && (
              <Badge variant="primary" className="text-[8px] px-2 py-0.5 font-black uppercase">
                 <MapPin size={10} className="mr-1" /> {item.center.name}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          <div>
              <h3 className="font-black text-xl leading-tight uppercase italic" style={{ color: 'var(--text)' }}>
                {item.session_type === 'class' ? item.subject?.name : (
                  <span className="flex items-center gap-2">
                    {isBreak && <Coffee size={20} />}
                    {isPrep && <BookOpen size={20} />}
                    {item.session_type}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2 mt-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${isBreak ? 'bg-emerald-500/10 text-emerald-500' : isPrep ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                    {item.teacher?.full_name?.[0] || <Info size={14} />}
                </div>
                <span className="text-xs font-bold uppercase tracking-tight" style={{ color: 'var(--text-muted)' }}>{item.teacher?.full_name || 'N/A'}</span>
              </div>
          </div>

          <div className="pt-4 border-t border-[var(--card-border)] flex items-center justify-between text-xs font-black uppercase tracking-widest text-muted">
            <span className="flex items-center gap-2"><Clock size={14} className="text-primary" /> {item.start_time} - {item.end_time}</span>
            <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-primary" />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

function EmptyState({ day }: { day: string }) {
  return (
    <div className="col-span-full py-24 text-center space-y-6">
      <div className="w-24 h-24 rounded-[3rem] bg-[var(--input)] flex items-center justify-center mx-auto relative group">
          <CalIcon size={48} className="text-muted group-hover:text-primary transition-colors duration-500" />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.4, 0.1] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute inset-0 bg-primary rounded-[3rem] blur-2xl" />
      </div>
      <div>
          <h3 className="font-black text-2xl uppercase italic" style={{ color: 'var(--text)' }}>Quiet Day!</h3>
          <p className="text-sm font-bold uppercase tracking-tighter" style={{ color: 'var(--text-muted)' }}>No missions scheduled for {day}. Use this time to sharpen your skills!</p>
      </div>
    </div>
  )
}
