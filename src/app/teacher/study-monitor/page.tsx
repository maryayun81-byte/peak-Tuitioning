'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Search, BrainCircuit,
  MessageSquare, TrendingUp, Calendar,
  Award, Clock, AlertCircle
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

// Module-level cache: keyed by teacherId so it survives tab navigation
const studentsCache = new Map<string, { data: any[]; ts: number }>()
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes

export default function TeacherStudyMonitor() {
  const supabase = getSupabaseBrowserClient()
  const { teacher } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [studentDetails, setStudentDetails] = useState<any>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (teacher) loadStudents()
  }, [teacher])

  // Safety timeout — never show spinner more than 8 seconds
  useEffect(() => {
    if (!loading) return
    safetyTimerRef.current = setTimeout(() => {
      console.warn('[StudyMonitor] Safety timeout triggered')
      setLoading(false)
    }, 8000)
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
    }
  }, [loading])

  const loadStudents = async () => {
    if (!teacher?.id) return

    // Serve from cache if fresh
    const cached = studentsCache.get(teacher.id)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setStudents(cached.data)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Step 1: Get class IDs assigned to this teacher (single query)
      const { data: assignments, error: aErr } = await supabase
        .from('teacher_assignments')
        .select('class_id')
        .eq('teacher_id', teacher.id)

      if (aErr) throw aErr
      const classIds = (assignments ?? []).map(a => a.class_id).filter(Boolean)

      if (classIds.length === 0) {
        setStudents([])
        setLoading(false)
        return
      }

      // Step 2: Fetch students in those classes
      const { data: studentList, error: sErr } = await supabase
        .from('students')
        .select('id, full_name, admission_number, class:classes(name)')
        .in('class_id', classIds)
        .order('full_name')

      if (sErr) throw sErr

      const ids = (studentList ?? []).map(s => s.id)

      if (ids.length === 0) {
        setStudents([])
        setLoading(false)
        return
      }

      // Step 3: Fetch ALL completed study sessions for ALL students in ONE query (no N+1)
      const { data: allSessions, error: sessErr } = await supabase
        .from('study_sessions')
        .select('student_id, duration_minutes')
        .in('student_id', ids)
        .eq('status', 'completed')

      if (sessErr) throw sessErr

      // Aggregate in JS — much faster than N round-trips
      const statsMap = new Map<string, { totalMin: number; count: number }>()
      for (const sess of allSessions ?? []) {
        const prev = statsMap.get(sess.student_id) ?? { totalMin: 0, count: 0 }
        statsMap.set(sess.student_id, {
          totalMin: prev.totalMin + (sess.duration_minutes || 0),
          count: prev.count + 1,
        })
      }

      const studentsWithStats = (studentList ?? []).map(s => {
        const agg = statsMap.get(s.id) ?? { totalMin: 0, count: 0 }
        return { ...s, totalStudyMinutes: agg.totalMin, completedCount: agg.count }
      })

      studentsCache.set(teacher.id, { data: studentsWithStats, ts: Date.now() })
      setStudents(studentsWithStats)
    } catch (err: any) {
      console.error('[StudyMonitor] loadStudents failed:', err)
      setError('Failed to load students. Please refresh the page.')
      toast.error('Could not load study monitor data.')
    } finally {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
      setLoading(false)
    }
  }

  const loadStudentDetails = async (studentId: string) => {
    setDetailsLoading(true)
    setStudentDetails(null)
    try {
      const { data: sess, error } = await supabase
        .from('study_sessions')
        .select('*, goals:study_goals(*), reflections:study_reflections(*), subject:subjects(name)')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .limit(20)

      if (error) throw error
      setStudentDetails(sess ?? [])
    } catch (err) {
      console.error('[StudyMonitor] loadStudentDetails failed:', err)
      setStudentDetails([])
    } finally {
      setDetailsLoading(false)
    }
  }

  const filteredStudents = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <SkeletonDashboard />

  if (error) return (
    <div className="p-6 py-24 text-center space-y-4">
      <AlertCircle size={40} className="mx-auto text-red-400 opacity-60" />
      <div>
        <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Failed to Load</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{error}</p>
      </div>
      <Button onClick={() => { setError(null); loadStudents() }}>Try Again</Button>
    </div>
  )

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <h1 className="text-2xl font-black flex items-center gap-3">
               <BrainCircuit className="text-primary" /> Study Discipline Monitor
            </h1>
            <p className="text-sm opacity-60">Track self-reflection and focus consistency across your classes.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Student List Sidebar */}
         <div className="lg:col-span-1 space-y-4">
            <Input 
              placeholder="Search students..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
            />
            {filteredStudents.length === 0 ? (
              <div className="py-16 text-center space-y-3 opacity-30">
                <Users size={40} className="mx-auto" />
                <p className="text-sm font-bold">No students found</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[600px] pr-2 scrollbar-thin">
                {filteredStudents.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => { setSelectedStudent(s); loadStudentDetails(s.id) }}
                    className={`w-full p-4 rounded-2xl text-left border-2 transition-all flex items-center justify-between group ${selectedStudent?.id === s.id ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5' : 'border-transparent bg-[var(--card)] hover:border-[var(--card-border)]'}`}
                  >
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--input)] flex items-center justify-center font-bold text-xs uppercase">
                           {s.full_name?.[0] ?? '?'}
                        </div>
                        <div>
                           <div className="text-sm font-bold truncate max-w-[120px]">{s.full_name}</div>
                           <div className="text-[10px] opacity-40 uppercase font-black">{s.class?.name}</div>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="text-xs font-black text-primary">{Math.floor(s.totalStudyMinutes / 60)}h</div>
                        <div className="text-[9px] opacity-40">Total Focus</div>
                     </div>
                  </button>
                ))}
              </div>
            )}
         </div>

         {/* Monitoring Detail Area */}
         <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
               {selectedStudent ? (
                  <motion.div key={selectedStudent.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                     <Card className="p-8 border-none shadow-2xl bg-gradient-to-br from-primary/5 via-transparent to-transparent flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                           <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-black border-4 border-white/20 shadow-xl">
                              {selectedStudent.full_name?.[0] ?? '?'}
                           </div>
                           <div>
                              <h2 className="text-2xl font-black">{selectedStudent.full_name}</h2>
                              <p className="text-sm opacity-60">Studying at {selectedStudent.school_name || 'Peak Performance'}</p>
                           </div>
                        </div>
                        <div className="flex gap-4">
                           <div className="text-center px-4 py-2 rounded-2xl bg-white shadow-sm border border-[var(--card-border)]">
                              <div className="text-lg font-black text-primary">{selectedStudent.completedCount}</div>
                              <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Sessions</div>
                           </div>
                           <div className="text-center px-4 py-2 rounded-2xl bg-white shadow-sm border border-[var(--card-border)]">
                              <div className="text-lg font-black text-amber-500">{Math.floor(selectedStudent.totalStudyMinutes / 60)}h</div>
                              <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Focus</div>
                           </div>
                        </div>
                     </Card>

                     <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                           <Clock size={14} /> Recent Study Sessions & Reflections
                        </h3>
                        
                        {detailsLoading ? (
                           <SkeletonDashboard />
                        ) : studentDetails === null ? null
                        : studentDetails.length === 0 ? (
                           <div className="py-20 text-center border-2 border-dashed rounded-3xl opacity-20">
                              <BrainCircuit size={48} className="mx-auto mb-4" />
                              <p className="font-bold">No study activity recorded yet.</p>
                           </div>
                        ) : studentDetails.map((sess: any) => (
                           <Card key={sess.id} className="p-6 border-none shadow-lg space-y-6 group">
                              <div className="flex items-start justify-between">
                                 <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${sess.status === 'completed' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                                       <Award size={20} />
                                    </div>
                                    <div>
                                       <h4 className="font-bold">{sess.subject?.name || 'Self-Study'}</h4>
                                       <div className="text-[10px] opacity-40 font-black uppercase tracking-widest">
                                          {new Date(sess.date).toLocaleDateString()} • {sess.duration_minutes} MINS
                                       </div>
                                    </div>
                                 </div>
                                 <Badge variant={sess.status === 'completed' ? 'success' : 'info'}>
                                    {sess.status.toUpperCase()}
                                 </Badge>
                              </div>

                              {sess.goals?.[0] && (
                                 <div className="p-4 rounded-2xl bg-[var(--input)] text-xs border border-[var(--card-border)]">
                                    <span className="font-black text-primary uppercase text-[9px] block mb-1">Session Goal</span>
                                    "{sess.goals[0].objective} using {sess.goals[0].action}"
                                 </div>
                              )}

                              {sess.reflections?.[0] ? (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                       <span className="text-[9px] font-black uppercase opacity-40 tracking-widest flex items-center gap-1">
                                          <TrendingUp size={10} className="text-success" /> Key Learning
                                       </span>
                                       <p className="text-xs italic leading-relaxed opacity-80">"{sess.reflections[0].learned_summary}"</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                       <span className="text-[9px] font-black uppercase opacity-40 tracking-widest flex items-center gap-1 justify-end">
                                          <MessageSquare size={10} className="text-amber-500" /> Challenges
                                       </span>
                                       <p className="text-xs italic leading-relaxed opacity-80">"{sess.reflections[0].difficulty_summary}"</p>
                                    </div>
                                 </div>
                              ) : sess.status === 'completed' ? (
                                 <div className="text-[10px] opacity-30 italic">No reflection submitted for this session.</div>
                              ) : null}

                              <div className="pt-4 border-t border-[var(--card-border)] flex items-center justify-between">
                                 <Button variant="secondary" size="sm" className="h-8 text-[10px] font-bold">
                                    <MessageSquare size={12} className="mr-2" /> Give Feedback
                                 </Button>
                                 <span className="text-[10px] opacity-30 font-bold">Logged {new Date(sess.created_at).toLocaleDateString()}</span>
                              </div>
                           </Card>
                        ))}
                     </div>
                  </motion.div>
               ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 opacity-30">
                     <Users size={64} />
                     <div>
                        <h3 className="text-xl font-black">Select a Student</h3>
                        <p className="text-sm">Choose a student from the sidebar to monitor their study discipline.</p>
                     </div>
                  </div>
               )}
            </AnimatePresence>
         </div>
      </div>
    </div>
  )
}
