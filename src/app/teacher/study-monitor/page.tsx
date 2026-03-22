'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Search, Filter, BrainCircuit,
  MessageSquare, TrendingUp, Calendar,
  ChevronRight, Award, Clock
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function TeacherStudyMonitor() {
  const supabase = getSupabaseBrowserClient()
  const { teacher } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [studentDetails, setStudentDetails] = useState<any>(null)

  useEffect(() => {
    if (teacher) loadStudents()
  }, [teacher])

  const loadStudents = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('students')
      .select('*, class:classes(name)')
      .in('class_id', (await supabase.from('teacher_assignments').select('class_id').eq('teacher_id', teacher?.id)).data?.map(a => a.class_id) || [])
    
    // For each student, let's get some aggregate study stats (Mocked for now or semi-real)
    const studentsWithStats = await Promise.all((data || []).map(async (s) => {
      const { data: sess } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('student_id', s.id)
        .eq('status', 'completed')
      
      const totalMin = sess?.reduce((acc, curr) => acc + curr.duration_minutes, 0) || 0
      return { ...s, totalStudyMinutes: totalMin, completedCount: sess?.length || 0 }
    }))

    setStudents(studentsWithStats)
    setLoading(false)
  }

  const loadStudentDetails = async (studentId: string) => {
    const { data: sess } = await supabase
      .from('study_sessions')
      .select('*, goals:study_goals(*), reflections:study_reflections(*), subject:subjects(name)')
      .eq('student_id', studentId)
      .order('date', { ascending: false })
    
    setStudentDetails(sess || [])
  }

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) || 
    s.admission_number.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <SkeletonDashboard />

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
            <div className="space-y-2 overflow-y-auto max-h-[600px] pr-2 scrollbar-thin">
               {filteredStudents.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => { setSelectedStudent(s); loadStudentDetails(s.id) }}
                    className={`w-full p-4 rounded-2xl text-left border-2 transition-all flex items-center justify-between group ${selectedStudent?.id === s.id ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5' : 'border-transparent bg-[var(--card)] hover:border-[var(--card-border)]'}`}
                  >
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--input)] flex items-center justify-center font-bold text-xs uppercase">
                           {s.full_name[0]}
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
         </div>

         {/* Monitoring Detail Area */}
         <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
               {selectedStudent ? (
                  <motion.div key={selectedStudent.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                     <Card className="p-8 border-none shadow-2xl bg-gradient-to-br from-primary/5 via-transparent to-transparent flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                           <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-black border-4 border-white/20 shadow-xl">
                              {selectedStudent.full_name[0]}
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
                              <div className="text-lg font-black text-amber-500">5</div>
                              <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Streak</div>
                           </div>
                        </div>
                     </Card>

                     <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                           <Clock size={14} /> Recent Study Sessions & Reflections
                        </h3>
                        
                        {!studentDetails ? (
                           <SkeletonDashboard />
                        ) : studentDetails.length === 0 ? (
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
                                    “{sess.goals[0].objective} using {sess.goals[0].action}”
                                 </div>
                              )}

                              {sess.reflections?.[0] ? (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                       <span className="text-[9px] font-black uppercase opacity-40 tracking-widest flex items-center gap-1">
                                          <TrendingUp size={10} className="text-success" /> Key Learning
                                       </span>
                                       <p className="text-xs italic leading-relaxed opacity-80">“{sess.reflections[0].learned_summary}”</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                       <span className="text-[9px] font-black uppercase opacity-40 tracking-widest flex items-center gap-1 justify-end">
                                          <MessageSquare size={10} className="text-amber-500" /> Challenges
                                       </span>
                                       <p className="text-xs italic leading-relaxed opacity-80">“{sess.reflections[0].difficulty_summary}”</p>
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
