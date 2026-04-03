'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar as CalIcon, Clock, MapPin, 
  Users, ChevronLeft, ChevronRight, 
  Filter, Zap, CheckCircle2, ArrowRight,
  Info, School, Coffee, BookOpen, LayoutGrid, List,
  ArrowRightLeft, UserCircle, MessageSquare, X, Check
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'
]

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
  
  // Class Context Toggle State
  const [selectedClassContext, setSelectedClassContext] = useState<string>('all')
  const [teacherContexts, setTeacherContexts] = useState<any[]>([])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
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
  }, [teacher, viewMode])

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
  }, [teacher, viewMode])

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

  const getSessionStyle = (startTime: string, endTime: string) => {
    const startHour = parseInt(startTime.split(':')[0])
    const startMin = parseInt(startTime.split(':')[1])
    const endHour = parseInt(endTime.split(':')[0])
    const endMin = parseInt(endTime.split(':')[1])
    const startPos = (startHour - 8) * 60 + startMin
    const duration = (endHour - startHour) * 60 + (endMin - startMin)
    return { top: `${(startPos / 60) * 100}px`, height: `${(duration / 60) * 100}px` }
  }

  return (
    <div className="p-4 md:p-8 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text)' }}>Faculty Schedule</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Coordinate and manage your teaching commitments</p>
         </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-[var(--input)] p-1 rounded-2xl border border-[var(--card-border)] w-full sm:w-auto">
              <button 
                onClick={() => setViewMode('personal')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'personal' ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-primary'}`}
              >
                <UserCircle size={14} /> My Sessions
              </button>
              <button 
                onClick={() => setViewMode('classes')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'classes' ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-primary'}`}
              >
                <Users size={14} /> Class Timetables
              </button>
            </div>
            {viewMode === 'classes' && teacherContexts.length > 0 && (
               <select 
                 className="flex-1 sm:flex-none bg-[var(--input)] border border-[var(--card-border)] text-[11px] font-bold text-primary p-2.5 rounded-xl outline-none ring-2 ring-primary/20 cursor-pointer min-w-0 max-w-full"
                 value={selectedClassContext}
                 onChange={(e) => setSelectedClassContext(e.target.value)}
                 style={{ color: 'var(--text)' }}
               >
                 <option value="all">All Assigned Classes</option>
                 {teacherContexts.map((ctx, idx) => (
                    <option key={idx} value={`${ctx.cls}|${ctx.cen}`}>
                      {ctx.clsName} - {ctx.cenName}
                    </option>
                 ))}
               </select>
            )}
          </div>
      </div>

      {/* Swaps Inbox */}
      {swaps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {swaps.map(s => (
             <Card key={s.id} className="p-4 border-amber-500/30 bg-amber-500/5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                   <Badge variant="warning" className="text-[9px]">Swap Request</Badge>
                   <span className="text-[10px] text-muted">{s.timetable?.day} {s.timetable?.start_time}</span>
                </div>
                <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                   {s.requested_by.full_name} is requesting someone to cover their class.
                </p>
                {s.reason && <p className="text-[10px] italic text-muted opacity-80">"{s.reason}"</p>}
                <div className="flex gap-2 mt-2">
                   <Button size="sm" variant="secondary" className="flex-1 text-[10px]" onClick={() => handleHandleSwap(s, 'accepted')}>
                      <Check size={12} className="mr-1" /> Stepping In
                   </Button>
                   <Button size="sm" variant="ghost" className="text-[10px]" onClick={() => handleHandleSwap(s, 'rejected')}>
                      <X size={12} />
                   </Button>
                </div>
             </Card>
           ))}
        </div>
      )}

      {loading ? <SkeletonDashboard /> : (
        <div className="space-y-6">
          <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar">
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
             {!isMobile ? (
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
                     <div className="relative pt-2">
                        {TIME_SLOTS.map(time => (
                          <div key={time} className="h-[100px] text-[10px] font-bold text-muted pl-4 border-r border-[var(--card-border)] flex items-start pt-1">{time}</div>
                        ))}
                     </div>

                     {DAYS.map(day => (
                       <div key={day} className={`relative border-r border-[var(--card-border)] last:border-r-0 ${day === activeDay ? 'bg-primary/5' : ''}`}>
                          {TIME_SLOTS.map(t => <div key={t} className="h-[100px] border-b border-[var(--card-border)] opacity-20" />)}
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
                   </div>
                 </div>
               </div>
             ) : (
               <div className="p-4 space-y-4 min-h-[400px]">
                 <div className="flex items-center justify-between mb-2">
                   <h3 className="text-sm font-black text-primary uppercase tracking-widest">{activeDay} Schedule</h3>
                   <Badge variant="muted">{schedule.filter(s => s.day === activeDay).length} Sessions</Badge>
                 </div>
                 {schedule.filter(s => s.day === activeDay).length === 0 ? (
                   <div className="py-20 text-center space-y-2 opacity-40">
                      <CalIcon size={40} className="mx-auto" />
                      <p className="text-xs font-bold uppercase">No sessions for {activeDay}</p>
                   </div>
                 ) : (
                   schedule.filter(s => s.day === activeDay).map(s => (
                     <SessionCard 
                       key={s.id} 
                       session={s} 
                       teacher={teacher} 
                       isMine={s.teacher_id === teacher?.id}
                       mobile
                       onSwapRequest={() => { setSelectedSession(s); setSwapModalOpen(true); }}
                     />
                   ))
                 )}
               </div>
             )}
          </Card>
        </div>
      )}

      {/* legend */}
      <div className="flex flex-wrap gap-6 justify-center text-[10px] font-black tracking-widest text-muted uppercase">
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-primary/20 border-2 border-primary/50" /> Your Session</div>
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[var(--input)] border-2 border-[var(--card-border)]" /> Colleague Session</div>
         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-100 border-2 border-slate-200" /> Break / Duty</div>
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
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => { if (isMine && s.session_type === 'class') onSwapRequest() }}
      className={`${mobile ? 'relative w-full' : 'absolute left-1 right-1'} rounded-xl p-3 border-2 overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] hover:z-20 ${
        isMine ? 'bg-primary/15 border-primary/40 ring-2 ring-primary/20 shadow-xl shadow-primary/5' : 
        isBreak ? 'bg-slate-500/10 border-slate-500/20 grayscale translate-y-1' :
        'bg-[var(--card)] border-[var(--card-border)] hover:bg-[var(--input)]'
      }`}
      style={style}
    >
      <div className="flex flex-col h-full gap-1">
        <div className="flex justify-between items-start">
          <Badge variant={isMine ? 'primary' : 'muted'} className="text-[8px] px-1 py-0 font-black tracking-widest uppercase">
            {s.start_time} - {s.end_time}
          </Badge>
          {isMine && <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
        </div>
        
        <div className="font-black text-[11px] md:text-xs leading-tight uppercase" style={{ color: 'var(--text)' }}>
          {s.session_type === 'class' ? s.subject?.name : s.session_type?.toUpperCase()}
          {s.class?.name && <span className="block text-[8px] md:text-[9px] opacity-60 font-bold lowercase tracking-tight">for {s.class.name}</span>}
        </div>

        <div className="mt-auto flex flex-col gap-1.5 pt-2">
          <div className="flex items-center gap-1 text-[9px] font-black text-muted truncate">
            <UserCircle size={10} className="shrink-0" />
            {isMine ? 'YOU' : s.teacher?.full_name || 'STAFF'}
          </div>
          <div className="flex items-center justify-between">
            <div className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1 max-w-[80%]">
              <MapPin size={8} />
              <span className="truncate">{s.center?.name || 'Main Center'}</span>
            </div>
            {isMine && s.session_type === 'class' && (
              <button 
                onClick={(e) => { e.stopPropagation(); onSwapRequest(); }}
                className="flex items-center gap-1.5 bg-[var(--card)] hover:bg-white text-[10px] font-black uppercase text-primary border-2 border-primary/20 px-2 py-1 rounded-lg hover:scale-105 active:scale-95 transition-all z-30"
              >
                <ArrowRightLeft size={12} /> Swap
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
