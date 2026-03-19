'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalIcon, Clock, MapPin, Users, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import type { Timetable } from '@/types/database'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function TeacherSchedule() {
  const supabase = getSupabaseBrowserClient()
  const { teacher } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<any[]>([])
  const [activeDay, setActiveDay] = useState(DAYS[new Date().getDay() - 1] || 'Monday')

  useEffect(() => {
    if (teacher) loadSchedule()
  }, [teacher])

  const loadSchedule = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('timetables')
        .select('*, class:classes(name), subject:subjects(name)')
        .eq('teacher_id', teacher?.id)
        .order('start_time')
      
      setSchedule(data ?? [])
    } finally {
      setLoading(false)
    }
  }

  // Safety timeout
  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setLoading(false), 5000)
      return () => clearTimeout(t)
    }
  }, [loading])

  const daySchedule = schedule.filter(s => s.day === activeDay)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>My Schedule</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage your weekly teaching hours</p>
         </div>
         <Badge variant="info" className="px-4 py-1.5"><CalIcon size={14} className="mr-2" /> Academic Year 2024/25</Badge>
      </div>

      {/* Day Selector */}
      <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
         {DAYS.map(day => (
           <button 
             key={day}
             onClick={() => setActiveDay(day)}
             className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap border ${activeDay === day ? 'bg-primary text-white border-transparent shadow-lg shadow-primary/20' : 'bg-[var(--card)] text-[var(--text-muted)] border-[var(--card-border)] hover:bg-[var(--input)]'}`}
           >
              {day}
           </button>
         ))}
      </div>

      {loading ? <SkeletonDashboard /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {daySchedule.length > 0 ? daySchedule.map((item, i) => (
             <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-6 relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                   
                   <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                         <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shrink-0" style={{ background: 'var(--bg)', border: '1px solid var(--card-border)' }}>
                            <span className="text-xs text-primary">{item.start_time.split(':')[0]}</span>
                            <span className="text-[10px] text-muted">{item.start_time.split(':')[1]}</span>
                         </div>
                         <div>
                            <h3 className="font-bold text-lg leading-tight" style={{ color: 'var(--text)' }}>{item.subject?.name}</h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                               <span className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}><Users size={12} className="text-primary" /> {item.class?.name}</span>
                               <span className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}><MapPin size={12} className="text-secondary" /> Room {item.room_number || 'TBA'}</span>
                               <span className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}><Clock size={12} className="text-amber-500" /> {item.start_time} - {item.end_time}</span>
                            </div>
                         </div>
                      </div>
                      <Badge variant="muted">Confirmed</Badge>
                   </div>

                   <div className="mt-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="secondary" className="flex-1">Mark Attendance</Button>
                      <Button size="sm" variant="ghost">View Students</Button>
                   </div>
                </Card>
             </motion.div>
           )) : (
             <div className="col-span-full py-24 text-center space-y-4 border-2 border-dashed rounded-[2.5rem]" style={{ borderColor: 'var(--card-border)' }}>
                <div className="w-20 h-20 rounded-full bg-[var(--input)] flex items-center justify-center mx-auto opacity-50">
                   <CalIcon size={40} className="text-muted" />
                </div>
                <div>
                   <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Free Day!</h3>
                   <p className="text-sm" style={{ color: 'var(--text-muted)' }}>You have no classes scheduled for {activeDay}.</p>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  )
}
