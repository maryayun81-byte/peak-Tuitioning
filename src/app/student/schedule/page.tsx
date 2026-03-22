'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar as CalIcon, Clock, MapPin, 
  User, ChevronLeft, ChevronRight, 
  Filter, Zap, Play, CheckCircle2, ArrowRight
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import type { Timetable } from '@/types/database'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function StudentSchedule() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const { student } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<any[]>([])
  const [activeDay, setActiveDay] = useState(DAYS[new Date().getDay() - 1] || 'Monday')

  useEffect(() => {
    if (student) loadSchedule()
  }, [student])

  const loadSchedule = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('timetables')
      .select('*, teacher:teachers(full_name), subject:subjects(name)')
      .eq('class_id', student?.class_id)
      .order('start_time')
    
    setSchedule(data ?? [])
    setLoading(false)
  }

  const daySchedule = schedule.filter(s => s.day === activeDay)

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Weekly Roadmap</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Stay on track with your interactive timetable</p>
         </div>
         <div className="hidden md:flex gap-2">
            <div className="px-4 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
               <Zap size={14} className="fill-primary" /> Multiplier Active
            </div>
         </div>
      </div>

      {/* Day Selector - Fun Pills */}
      <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar">
         {DAYS.map(day => (
           <button 
             key={day}
             onClick={() => setActiveDay(day)}
             className={`px-8 py-4 rounded-[1.5rem] font-bold text-sm transition-all whitespace-nowrap border-2 ${activeDay === day ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105' : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--card-border)] hover:bg-[var(--input)]'}`}
           >
              {day}
           </button>
         ))}
      </div>

      {loading ? <SkeletonDashboard /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {daySchedule.length > 0 ? daySchedule.map((item, i) => (
             <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-6 relative group border-none shadow-xl hover:shadow-2xl hover:shadow-primary/5 transition-all overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/20 transition-colors" />
                   
                   <div className="flex items-start justify-between mb-8 relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--input)] flex flex-col items-center justify-center font-black shadow-inner border border-[var(--card-border)]">
                         <span className="text-sm text-primary">{item.start_time.split(':')[0]}</span>
                         <span className="text-[10px] text-muted">{item.start_time.split(':')[1]}</span>
                      </div>
                      <Badge variant="muted" className="text-[9px]">{item.room_number || 'Room 101'}</Badge>
                   </div>

                   <div className="space-y-4 relative z-10">
                      <div>
                         <h3 className="font-black text-lg leading-tight" style={{ color: 'var(--text)' }}>{item.subject?.name}</h3>
                         <div className="flex items-center gap-2 mt-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500">
                               {item.teacher?.full_name[0]}
                            </div>
                            <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{item.teacher?.full_name}</span>
                         </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                         <span className="flex items-center gap-1"><Clock size={14} className="text-primary" /> {item.start_time} - {item.end_time}</span>
                      </div>
                   </div>

                </Card>
             </motion.div>
           )) : (
             <div className="col-span-full py-32 text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-[var(--input)] flex items-center justify-center mx-auto relative">
                   <CalIcon size={48} className="text-muted opacity-10" />
                   <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute inset-0 bg-primary rounded-full blur-xl" />
                </div>
                <div>
                   <h3 className="font-black text-xl" style={{ color: 'var(--text)' }}>Nothing Booked!</h3>
                   <p className="text-sm" style={{ color: 'var(--text-muted)' }}>You have no classes on {activeDay}. Use this time to finish quests!</p>
                </div>
                <Button variant="secondary" className="px-10 py-6 rounded-3xl" onClick={() => router.push('/student/assignments')}>
                   Go to Assignments Hub <ArrowRight className="ml-2" size={16} />
                </Button>
             </div>
           )}
        </div>
      )}
    </div>
  )
}

