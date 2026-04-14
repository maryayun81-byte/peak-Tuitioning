'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar as CalIcon, Clock, MapPin, 
  Users, ChevronLeft, ChevronRight, 
  Filter, Zap, CheckCircle2, ArrowRight,
  Info, School, Coffee, BookOpen, LayoutGrid, List,
  ArrowRightLeft, UserCircle, MessageSquare, X, Check,
  Target, TrendingUp, HelpCircle, Activity, ExternalLink
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Subject Branding Map
const SUBJECT_STAYLE: Record<string, { color: string, bg: string, icon: any }> = {
  'math': { color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)', icon: <TrendingUp size={12} /> },
  'maths': { color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)', icon: <TrendingUp size={12} /> },
  'science': { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', icon: <Zap size={12} /> },
  'english': { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', icon: <BookOpen size={12} /> },
  'default': { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', icon: <Activity size={12} /> }
}

type ViewType = 'personal' | 'classes'

export default function TeacherSchedule() {
  const supabase = getSupabaseBrowserClient()
  const { teacher, profile } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<any[]>([])
  const [swaps, setSwaps] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<ViewType>('personal')
  const [activeDay, setActiveDay] = useState(DAYS[new Date().getDay() - 1] || 'Monday')
  const [isMobile, setIsMobile] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Class Context Toggle State
  const [selectedClassContext, setSelectedClassContext] = useState<string>('all')
  const [teacherContexts, setTeacherContexts] = useState<any[]>([])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      clearInterval(timer)
    }
  }, [])
  
  // Swap UI State
  const [swapModalOpen, setSwapModalOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [allTeachers, setAllTeachers] = useState<any[]>([])
  const [targetTeacherId, setTargetTeacherId] = useState<string>('')
  const [swapReason, setSwapReason] = useState('')
  const [submittingSwap, setSubmittingSwap] = useState(false)

  useEffect(() => {
    if (teacher) {
      loadData()
      loadTeachers()
    }
  }, [teacher, viewMode, selectedClassContext])

  const loadTeachers = async () => {
    const { data } = await supabase.from('teachers').select('id, full_name')
    setAllTeachers(data || [])
  }

  const loadData = useCallback(async () => {
    if (!teacher) return
    setLoading(true)
    try {
      // 1. Get Teacher Assignments and their existing personal sessions to derive (class, center) context
      const [assignmentsRes, sessionsRes] = await Promise.all([
        supabase.from('teacher_assignments').select('class_id').eq('teacher_id', teacher.id),
        supabase
          .from('timetables')
          .select('class_id, tuition_center_id, class:classes(name), center:tuition_centers(name)')
          .eq('teacher_id', teacher.id)
      ])
      
      const classIds = assignmentsRes.data?.map(a => a.class_id) || []
      const centerContexts = sessionsRes.data || []

      // 2. Build Query
      let query = supabase
        .from('timetables')
        .select(`
          *, 
          class:classes(name), 
          subject:subjects(name), 
          center:tuition_centers(name),
          teacher:teachers(full_name)
        `)
        .eq('status', 'published')

      if (viewMode === 'personal') {
        query = query.eq('teacher_id', teacher.id)
      } else {
        // "Classes" view: all sessions for classes I teach
        if (selectedClassContext !== 'all') {
           const [clsId, cenId] = selectedClassContext.split('|')
           query = query.eq('class_id', clsId).eq('tuition_center_id', cenId)
        } else if (centerContexts.length > 0) {
          const uniqueCenters = Array.from(new Set(centerContexts.map(c => c.tuition_center_id))).filter(Boolean)
          query = query.in('class_id', classIds).in('tuition_center_id', uniqueCenters)
        } else {
          query = query.in('class_id', classIds)
        }
        
        // Populate the dropdown context map if empty
        if (teacherContexts.length === 0) {
          const uniqueContexts = centerContexts.reduce((acc: any, curr: any) => {
            const key = `${curr.class_id}|${curr.tuition_center_id}`
            if (!acc[key]) acc[key] = { 
              cls: curr.class_id, 
              cen: curr.tuition_center_id,
              clsName: curr.class?.name || 'Unknown Class',
              cenName: curr.center?.name || 'Unknown Center'
            }
            return acc
          }, {})
          setTeacherContexts(Object.values(uniqueContexts))
        }
      }

      const { data: sessions, error } = await query.order('start_time')
      if (error) throw error
      setSchedule(sessions || [])

      // 3. Load Swaps
      const { data: swapData } = await supabase
        .from('timetable_swaps')
        .select('*, requested_by:teachers!requested_by_id(full_name), timetable:timetables(*)')
        .or(`requested_by_id.eq.${teacher.id},target_teacher_id.eq.${teacher.id},target_teacher_id.is.null`)
        .eq('status', 'pending')
      
      setSwaps(swapData || [])

    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [teacher, viewMode, selectedClassContext, supabase])

  const handleRequestSwap = async () => {
    if (!selectedSession || !teacher) return
    setSubmittingSwap(true)
    try {
      const { error } = await supabase.from('timetable_swaps').insert({
        timetable_id: selectedSession.id,
        requested_by_id: teacher.id,
        target_teacher_id: targetTeacherId || null,
        status: 'pending',
        reason: swapReason
      })
      if (error) throw error
      toast.success('Swap request sent!')
      setSwapModalOpen(false)
      loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmittingSwap(false)
    }
  }

  const handleHandleSwap = async (swap: any, action: 'accepted' | 'rejected') => {
    if (!teacher) return
    try {
      // 1. Update swap status
      const { error: swapErr } = await supabase
        .from('timetable_swaps')
        .update({ status: action })
        .eq('id', swap.id)
      
      if (swapErr) throw swapErr

      // 2. If accepted, update the timetable entry teacher
      if (action === 'accepted') {
        const { error: ttErr } = await supabase
          .from('timetables')
          .update({ teacher_id: teacher.id })
          .eq('id', swap.timetable_id)
        
        if (ttErr) throw ttErr
        toast.success('Successfully stepped in for this session!')
      } else {
        toast.success('Request declined')
      }
      loadData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Dynamic Timegrid Calculation
  const { timegrid, minHour, maxHour } = useMemo(() => {
     if (schedule.length === 0) return { timegrid: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'], minHour: 8, maxHour: 13 }
     
     const hours = schedule.map(s => parseInt(s.start_time.split(':')[0]))
     const endHours = schedule.map(s => parseInt(s.end_time.split(':')[0]))
     
     const min = Math.max(0, Math.min(...hours) - 1)
     const max = Math.min(23, Math.max(...endHours) + 1)
     
     const grid = []
     for (let i = min; i <= max; i++) {
        grid.push(`${i.toString().padStart(2, '0')}:00`)
     }
     
     return { timegrid: grid, minHour: min, maxHour: max }
  }, [schedule])

  const getSessionStyle = (startTime: string, endTime: string) => {
    const startHour = parseInt(startTime.split(':')[0])
    const startMin = parseInt(startTime.split(':')[1])
    const endHour = parseInt(endTime.split(':')[0])
    const endMin = parseInt(endTime.split(':')[1])
    
    const startPos = (startHour - minHour) * 60 + startMin
    const duration = (endHour - startHour) * 60 + (endMin - startMin)
    return { 
      top: `${(startPos / 60) * 120}px`, 
      height: `${(duration / 60) * 120}px` 
    }
  }

  // Live Indicator Position
  const liveIndicatorY = useMemo(() => {
     const h = currentTime.getHours()
     const m = currentTime.getMinutes()
     if (h < minHour || h > maxHour) return null
     const pos = (h - minHour) * 60 + m
     return (pos / 60) * 120
  }, [currentTime, minHour, maxHour])

  return (
    <div className="p-4 md:p-8 space-y-10 pb-32 max-w-[1800px] mx-auto min-h-screen">
      {/* Cinematic Header */}
      <div className="relative group">
         <div className="absolute -inset-1 bg-gradient-to-r from-primary to-violet-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
         <div className="relative flex flex-col xl:flex-row xl:items-end justify-between gap-8 bg-[var(--card)] p-8 rounded-3xl border border-[var(--card-border)] shadow-xl shadow-primary/5">
            <div className="space-y-4">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                     <CalIcon size={24} />
                  </div>
                  <div>
                    <h1 className="text-4xl font-black tracking-tight leading-none" style={{ color: 'var(--text)' }}>Faculty Hub</h1>
                    <div className="flex items-center gap-2 mt-1 text-xs font-bold text-muted uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                       <Clock size={12} className="text-primary" /> {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {activeDay}
                    </div>
                  </div>
               </div>
               <p className="text-sm font-medium max-w-lg leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Welcome, <span className="text-primary font-bold">{profile?.full_name?.split(' ')[0]}</span>. You have <span className="text-primary font-bold">{schedule.filter(s => s.teacher_id === teacher?.id).length} classes</span> assigned this week. Focus on inspiring excellence today.
               </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 p-2 rounded-[2rem] border border-[var(--card-border)]" style={{ background: 'var(--input)' }}>
               <button 
                  onClick={() => setViewMode('personal')}
                  className={`flex items-center gap-3 px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'personal' ? 'bg-primary text-white shadow-2xl shadow-primary/30 ring-4 ring-primary/10' : 'text-muted hover:text-primary'}`}
               >
                  <UserCircle size={16} /> My Stream
               </button>
               <button 
                  onClick={() => setViewMode('classes')}
                  className={`flex items-center gap-3 px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'classes' ? 'bg-primary text-white shadow-2xl shadow-primary/30 ring-4 ring-primary/10' : 'text-muted hover:text-primary'}`}
               >
                  <Users size={16} /> Global Grid
               </button>
               {viewMode === 'classes' && teacherContexts.length > 0 && (
                  <div className="pl-2 border-l py-1" style={{ borderColor: 'var(--card-border)' }}>
                     <select 
                        className="bg-transparent text-[11px] font-black text-primary uppercase tracking-widest outline-none cursor-pointer"
                        value={selectedClassContext}
                        onChange={(e) => setSelectedClassContext(e.target.value)}
                        style={{ color: 'var(--primary)' }}
                     >
                        <option value="all">Everywhere</option>
                        {teacherContexts.map((ctx, idx) => (
                           <option key={idx} value={`${ctx.cls}|${ctx.cen}`}>{ctx.clsName}</option>
                        ))}
                     </select>
                  </div>
               )}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
         {/* Main Schedule Pane */}
         <div className="space-y-8">
            {/* Days Pipeline */}
            <div className="flex items-center gap-3 p-2 rounded-[2rem] border border-[var(--card-border)] shadow-sm overflow-x-auto no-scrollbar" style={{ background: 'var(--card)' }}>
               {DAYS.map(day => (
                  <button 
                     key={day}
                     onClick={() => setActiveDay(day)}
                     className={`px-8 py-3 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeDay === day ? 'bg-primary text-white shadow-lg' : 'text-muted hover:bg-primary/5 hover:text-primary'}`}
                  >
                     {day.substring(0, 3)}
                  </button>
               ))}
            </div>

            {loading ? <SkeletonDashboard /> : (
               <div className="relative">
                  <Card className="overflow-hidden border-none shadow-2xl rounded-[2.5rem] border border-white/5" style={{ background: 'var(--card)' }}>
                     {!isMobile ? (
                        <div className="p-0 md:p-6 overflow-x-auto">
                           <div className="min-w-[1400px]">
                              {/* Grid Header */}
                              <div className="grid grid-cols-[100px_repeat(7,1fr)] py-6 mb-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
                                 <div className="pl-6 text-[10px] font-black uppercase tracking-[0.3em] text-muted">Time</div>
                                 {DAYS.map(day => (
                                    <div key={day} className={`text-center text-[11px] font-black uppercase tracking-[0.2em] ${day === activeDay ? 'text-primary' : 'text-muted opacity-40'}`}>
                                       {day}
                                    </div>
                                 ))}
                              </div>

                              {/* Grid Body */}
                              <div className="relative grid grid-cols-[100px_repeat(7,1fr)] rounded-[2rem]" style={{ height: `${timegrid.length * 120}px`, background: 'var(--input)', opacity: '0.8' }}>
                                 {/* Time labels column */}
                                 <div className="relative">
                                    {timegrid.map(time => (
                                       <div key={time} className="h-[120px] text-[10px] font-black text-muted pl-6 flex items-start pt-2 tracking-tighter" style={{ borderRight: '1px solid var(--card-border)' }}>{time}</div>
                                    ))}
                                 </div>

                                 {/* Day columns */}
                                 {DAYS.map(day => (
                                    <div key={day} className={`relative last:border-r-0 ${day === activeDay ? 'bg-primary/[0.03]' : ''}`} style={{ borderRight: '1px solid var(--card-border)' }}>
                                       {timegrid.map(t => <div key={t} className="h-[120px]" style={{ borderBottom: '1px solid var(--card-border)', opacity: '0.3' }} />)}
                                       {schedule.filter(s => s.day === day).map(s => (
                                          <SessionCard 
                                             key={s.id} 
                                             session={s} 
                                             teacher={teacher} 
                                             isMine={s.teacher_id === teacher?.id}
                                             style={getSessionStyle(s.start_time, s.end_time)}
                                             onSwapRequest={() => { setSelectedSession(s); setSwapModalOpen(true); }}
                                          />
                                       ))}
                                    </div>
                                 ))}

                                 {/* Live Timeline Indictor */}
                                 {liveIndicatorY !== null && (
                                    <motion.div 
                                       initial={{ opacity: 0, x: -20 }}
                                       animate={{ opacity: 1, x: 0 }}
                                       className="absolute left-0 right-0 z-30 pointer-events-none flex items-center gap-2"
                                       style={{ top: `${liveIndicatorY}px` }}
                                    >
                                       <div className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded uppercase ml-2 shadow-lg shadow-rose-500/30">Live</div>
                                       <div className="flex-1 h-px bg-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                                       <div className="w-2 h-2 rounded-full bg-rose-500 border-2 border-white dark:border-slate-800 shadow-lg mr-4" />
                                    </motion.div>
                                 )}
                              </div>
                           </div>
                        </div>
                     ) : (
                        <div className="p-6 space-y-6">
                           <div className="flex items-center justify-between">
                              <h3 className="text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>{activeDay} <span className="text-primary italic">Sessions</span></h3>
                              <Badge variant="primary" className="rounded-lg">{schedule.filter(s => s.day === activeDay).length} Slots</Badge>
                           </div>
                           {schedule.filter(s => s.day === activeDay).length === 0 ? (
                              <div className="py-24 text-center space-y-4 rounded-[2rem] border-2 border-dashed" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                                 <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-muted opacity-40" style={{ background: 'var(--card)' }}>
                                    <CalIcon size={32} />
                                 </div>
                                 <p className="text-xs font-black uppercase tracking-widest text-muted">No Commitments Scheduled</p>
                              </div>
                           ) : (
                              <div className="space-y-4">
                                 {schedule.filter(s => s.day === activeDay).map(s => (
                                    <SessionCard 
                                       key={s.id} 
                                       session={s} 
                                       teacher={teacher} 
                                       isMine={s.teacher_id === teacher?.id}
                                       mobile
                                       onSwapRequest={() => { setSelectedSession(s); setSwapModalOpen(true); }}
                                    />
                                 ))}
                              </div>
                           )}
                        </div>
                     )}
                  </Card>
               </div>
            )}
         </div>

         {/* Large Screen Focus Sidebar */}
         <div className="hidden xl:flex flex-col gap-8 sticky top-32">
            <Card className="p-8 space-y-6 bg-gradient-to-br from-primary to-violet-600 border-none shadow-2xl shadow-primary/20 text-white rounded-[2.5rem] relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl transition-transform group-hover:scale-150 duration-700" />
               <div className="relative space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <Zap size={20} />
                     </div>
                     <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Today's Pulse</span>
                  </div>
                  <div>
                     <div className="text-4xl font-black">{schedule.filter(s => s.teacher_id === teacher?.id && s.day === (DAYS[new Date().getDay() - 1] || 'Monday')).length}</div>
                     <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">Sessions across {Array.from(new Set(schedule.filter(s => s.teacher_id === teacher?.id).map(s => s.tuition_center_id))).length} centers</div>
                  </div>
                  <div className="pt-4 flex gap-2">
                     <div className="flex-1 bg-white/15 p-3 rounded-2xl">
                        <div className="text-xl font-black">2.4k</div>
                        <div className="text-[8px] font-black uppercase opacity-60">XP Goal</div>
                     </div>
                     <div className="flex-1 bg-white/15 p-3 rounded-2xl">
                        <div className="text-xl font-black">100%</div>
                        <div className="text-[8px] font-black uppercase opacity-60">Punctuality</div>
                     </div>
                  </div>
               </div>
            </Card>

            <Card className="p-8 space-y-6 rounded-[2.5rem] shadow-xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
               <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted">Quick Actions</h3>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
               </div>
               <div className="space-y-3">
                  <button className="w-full p-4 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-all group" style={{ background: 'var(--input)' }}>
                     <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <Activity size={18} />
                     </div>
                     <div className="text-left">
                        <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text)' }}>Swap Marketplace</div>
                        <div className="text-[10px] text-muted font-bold">{swaps.length} pending requests</div>
                     </div>
                  </button>
                  <Link href="/teacher/assignments" className="block">
                    <button className="w-full p-4 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-all group text-left" style={{ background: 'var(--input)' }}>
                       <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                          <Target size={18} />
                       </div>
                       <div>
                          <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text)' }}>Pending Marking</div>
                          <div className="text-[10px] text-muted font-bold">Grade 12 submissions now</div>
                       </div>
                    </button>
                  </Link>
                  <button className="w-full p-4 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-all group" style={{ background: 'var(--input)' }}>
                     <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        <HelpCircle size={18} />
                     </div>
                     <div className="text-left">
                        <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text)' }}>Support Chat</div>
                        <div className="text-[10px] text-muted font-bold">24/7 Admin assistance</div>
                     </div>
                  </button>
               </div>
            </Card>

            <div className="p-4 rounded-3xl border-2 border-dashed flex flex-col items-center text-center gap-2" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
               <div className="text-[10px] font-black uppercase tracking-widest text-muted">Need a permanent change?</div>
               <button className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline">
                  Contact Registrar <ExternalLink size={10} />
               </button>
            </div>
         </div>
      </div>

      <Modal isOpen={swapModalOpen} onClose={() => setSwapModalOpen(false)} title="Request Session Swap 🔄" size="md">
         <div className="space-y-6 pt-4">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
               <h4 className="font-black text-sm uppercase tracking-widest text-primary mb-1">Session Target</h4>
               <p className="text-xs font-bold leading-relaxed">
                  {selectedSession?.subject?.name} — {selectedSession?.class?.name}
                  <br />
                  <span className="text-muted">{selectedSession?.day} | {selectedSession?.start_time} - {selectedSession?.end_time}</span>
               </p>
            </div>

            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-black uppercase mb-1.5 block text-muted">Direct Request (Optional)</label>
                  <select 
                     className="w-full bg-[var(--input)] border border-[var(--card-border)] p-3 rounded-xl text-sm font-bold outline-none ring-primary focus:ring-2"
                     value={targetTeacherId}
                     onChange={(e) => setTargetTeacherId(e.target.value)}
                  >
                     <option value="">Post to all faculty</option>
                     {allTeachers.filter(t => t.id !== teacher?.id).map(t => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                     ))}
                  </select>
               </div>

               <div>
                  <label className="text-[10px] font-black uppercase mb-1.5 block text-muted">Reason / Notes</label>
                  <textarea 
                     className="w-full bg-[var(--input)] border border-[var(--card-border)] p-3 rounded-xl text-sm font-bold outline-none ring-primary focus:ring-2 min-h-[100px]"
                     placeholder="e.g. Unwell, medical appointment, or simply need more prep time..."
                     value={swapReason}
                     onChange={(e) => setSwapReason(e.target.value)}
                  />
               </div>
            </div>

            <div className="flex gap-3">
               <Button variant="ghost" className="flex-1" onClick={() => setSwapModalOpen(false)}>Cancel</Button>
               <Button variant="secondary" className="flex-1" onClick={handleRequestSwap} isLoading={submittingSwap}>
                  Complete Request
               </Button>
            </div>
         </div>
      </Modal>
    </div>
  )
}

// --- Internal Components ---

function SessionCard({ session: s, teacher, isMine, style, mobile, onSwapRequest }: any) {
  const isBreak = s.session_type === 'break'
  const subjectKey = (s.subject?.name || '').toLowerCase()
  const branding = SUBJECT_STAYLE[subjectKey] || SUBJECT_STAYLE['default']
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={() => { if (isMine && s.session_type === 'class') onSwapRequest() }}
      className={`${mobile ? 'relative w-full' : 'absolute left-2 right-2'} rounded-[1.5rem] p-4 border-2 overflow-hidden group cursor-pointer transition-all ${
        isMine ? 'bg-primary/5 border-primary/20 shadow-xl shadow-primary/5 ring-1 ring-primary/10' : 
        isBreak ? 'opacity-60 grayscale' :
        ''
      }`}
      style={{ 
        ...style,
        background: isMine ? 'var(--card)' : isBreak ? 'var(--input)' : 'var(--card)',
        borderColor: isMine ? 'var(--primary-hover)' : 'var(--card-border)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
    >
      {/* Decorative Branding Line */}
      <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: isMine ? 'var(--primary)' : branding.color }} />
      
      <div className="flex flex-col h-full gap-2 relative z-10">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-lg" style={{ background: isMine ? 'var(--primary)' : branding.color }}>
                {branding.icon}
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {s.start_time}
             </span>
          </div>
          {isMine && <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(245,158,11,1)]" />}
        </div>
        
        <div className="namespace">
          <div className="font-black text-[13px] leading-tight uppercase tracking-tight" style={{ color: 'var(--text)' }}>
            {s.session_type === 'class' ? s.subject?.name : s.session_type?.toUpperCase()}
          </div>
          {s.class?.name && (
             <div className="flex items-center gap-1 mt-0.5">
                <School size={10} className="text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-70" style={{ color: 'var(--primary)' }}>{s.class.name}</span>
             </div>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--input)' }}>
                   <UserCircle size={12} className="text-muted opacity-50" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-tighter truncate" style={{ color: 'var(--text-muted)' }}>
                   {isMine ? 'Assigned to You' : s.teacher?.full_name?.split(' ')[0] || 'Staff'}
                </span>
             </div>
             <Badge variant="secondary" className="text-[8px] px-1.5 shadow-sm">{s.center?.name?.substring(0, 10) || 'Main'}</Badge>
          </div>

          {isMine && s.session_type === 'class' && (
            <button 
              onClick={(e) => { e.stopPropagation(); onSwapRequest(); }}
              className="w-full flex items-center justify-center gap-2 text-[9px] font-black uppercase py-2 rounded-xl active:scale-95 transition-all opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
              style={{ background: 'var(--text)', color: 'var(--bg)' }}
            >
              <ArrowRightLeft size={10} /> Request Swap
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
