'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Clock, BookOpen, Target, 
  ChevronRight, ChevronLeft, Check, 
  Sparkles, PenTool, Trash2, Plus
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, Badge } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { getGoalTemplate, generateStorytellingGoal } from '@/lib/study/goalEngine'
import toast from 'react-hot-toast'

interface StudyPlannerProps {
  onComplete: () => void
}

export const StudyPlanner = ({ onComplete }: StudyPlannerProps) => {
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()
  
  const [step, setStep] = useState(1) // 1: Date Range, 2: Daily Sessions, 3: Review & Save
  const [planName, setPlanName] = useState('My Study Roadmap')
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })
  
  const [subjects, setSubjects] = useState<any[]>([])
  const [plannedSessions, setPlannedSessions] = useState<any[]>([])
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [isEditMode, setIsEditMode] = useState(false)
  const [existingPlanId, setExistingPlanId] = useState<string | null>(null)
  
  // Grade-adaptive template
  const level = (student as any)?.class?.level || 10
  const template = getGoalTemplate(level)
  
  useEffect(() => {
    if (student) {
      loadSubjects()
      loadExistingSessions()
    }
  }, [student])
  
  const loadExistingSessions = async () => {
    try {
      const { data: plans } = await supabase
        .from('study_plans')
        .select('*')
        .eq('student_id', student?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (plans && plans.length > 0) {
        const plan = plans[0]
        setExistingPlanId(plan.id)
        setPlanName(plan.name)
        setDateRange({ start: plan.start_date, end: plan.end_date })
        setIsEditMode(true)

        const { data: sess } = await supabase
          .from('study_sessions')
          .select('*, goals:study_goals(*)')
          .eq('plan_id', plan.id)
        
        if (sess) {
          const formatted = sess.map(s => ({
            id: s.id,
            day: s.date,
            subject_id: s.subject_id,
            duration: s.duration_minutes,
            start_time: s.start_time,
            goals: s.goals?.[0] || { objective: '', action: '', outcome: '', meaning: '' }
          }))
          setPlannedSessions(formatted)
        }
      }
    } catch (err) {
      console.error('[StudyPlanner] Error loading existing sessions:', err)
    }
  }
  
  const loadSubjects = async () => {
    try {
      const { data: studentSubjects } = await supabase
        .from('student_subjects')
        .select('subject:subjects(*)')
        .eq('student_id', student?.id)
      
      const enrolled = studentSubjects?.map((s: any) => s.subject).filter(Boolean) || []
      const { data: classSubjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('class_id', student?.class_id)
      
      const combined = [...enrolled, ...(classSubjects || [])]
      const unique = Array.from(new Map(combined.map(s => [s.id, s])).values())
      setSubjects(unique)
    } catch (err) {
      console.error('[StudyPlanner] Error loading subjects:', err)
    }
  }

  const days = (() => {
    if (!dateRange.start || !dateRange.end) return []
    try {
      const start = new Date(dateRange.start + 'T00:00:00')
      const end = new Date(dateRange.end + 'T00:00:00')
      const ds = []
      let current = new Date(start)
      let safetyCount = 0
      while (current <= end && safetyCount < 60) {
        ds.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
        safetyCount++
      }
      return ds
    } catch (e) {
      return []
    }
  })()

  const addSessionToDay = (day: string) => {
    const newSession = {
      id: 'new-' + Math.random().toString(36).substring(2, 9),
      day,
      subject_id: '',
      duration: 60,
      start_time: '16:00',
      goals: { objective: '', action: '', outcome: '', meaning: '' }
    }
    setPlannedSessions([...plannedSessions, newSession])
  }

  const updateSession = (id: string, updates: any) => {
    setPlannedSessions(plannedSessions.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const removeSession = (id: string) => {
    setPlannedSessions(plannedSessions.filter(s => s.id !== id))
  }

  const saveAllSessions = async () => {
    const toastId = toast.loading('Syncing your roadmap...')
    try {
      const planData = {
        student_id: student?.id,
        name: planName,
        start_date: dateRange.start,
        end_date: dateRange.end,
        is_active: true
      }

      let planId = existingPlanId
      if (isEditMode && existingPlanId) {
        await supabase.from('study_plans').update(planData).eq('id', existingPlanId)
      } else {
        const { data: newPlan, error: pErr } = await supabase.from('study_plans').insert(planData).select().single()
        if (pErr) throw pErr
        planId = newPlan.id
      }

      if (isEditMode) {
        await supabase.from('study_sessions').delete().eq('plan_id', planId)
      }

      const allSessionsToInsert = plannedSessions.map(s => {
        const [h, m] = s.start_time.split(':')
        const start = new Date(s.day)
        start.setHours(parseInt(h), parseInt(m))
        const end = new Date(start.getTime() + s.duration * 60000)
        
        return {
          student_id: student?.id,
          plan_id: planId,
          subject_id: s.subject_id || null,
          title: subjects.find(sub => sub.id === s.subject_id)?.name || 'Study Session',
          date: s.day,
          start_time: s.start_time,
          end_time: `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
          duration_minutes: s.duration,
          status: 'planned'
        }
      })

      const { data: insertedSessions, error: sessionErr } = await supabase
        .from('study_sessions')
        .insert(allSessionsToInsert)
        .select()

      if (sessionErr) throw sessionErr

      const goalsToInsert = plannedSessions.map((s, idx) => ({
        session_id: insertedSessions[idx].id,
        objective: s.goals.objective,
        action: s.goals.action,
        outcome: s.goals.outcome,
        meaning: s.goals.meaning,
        age_style: template.style
      }))

      await supabase.from('study_goals').insert(goalsToInsert)

      toast.success(isEditMode ? 'Roadmap updated!' : 'New roadmap deployed!', { id: toastId })
      onComplete()
    } catch (err: any) {
      toast.error('Sync failed: ' + err.message, { id: toastId })
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <Card className="p-4 sm:p-10 space-y-10 border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-[var(--card)] rounded-[3rem]">
               <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto text-primary relative">
                     <Calendar size={36} />
                     <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
                        <Sparkles size={16} fill="white" />
                     </div>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
                     {isEditMode ? 'Refine Your Roadmap' : 'Create New Focus Plan'}
                  </h1>
                  <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto uppercase font-black tracking-widest opacity-60">Architect your success journey</p>
               </div>

               <div className="space-y-6">
                  <div className="p-8 rounded-[2.5rem] bg-[var(--input)] space-y-6 border border-[var(--card-border)]">
                     <Input 
                       label="Roadmap Name" 
                       placeholder="e.g. Exam Mastery 2024" 
                       value={planName} 
                       onChange={e => setPlanName(e.target.value)}
                       className="text-lg font-bold h-14 bg-white/50"
                     />
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Input label="Start Date" type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="h-14 font-bold" />
                        <Input label="End Date" type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="h-14 font-bold" />
                     </div>
                  </div>
               </div>

               <div className="flex justify-center pt-4">
                  <Button size="lg" className="w-full sm:w-auto px-16 rounded-[2rem] h-20 text-lg font-black bg-slate-900 border-none shadow-2xl hover:scale-105 transition-all text-white" onClick={() => setStep(2)}>
                    Begin Guided Flow <ChevronRight className="ml-2" />
                  </Button>
               </div>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
             <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 p-6 bg-[var(--card)] rounded-[2.5rem] border border-[var(--card-border)]">
                   <div>
                      <h2 className="text-2xl font-black tracking-tight">{new Date(days[currentDayIndex]).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Day {currentDayIndex + 1} of {days.length} • {plannedSessions.filter(s => s.day === days[currentDayIndex]).length} Missions</p>
                   </div>
                   <div className="flex gap-3">
                       <Button size="sm" variant="secondary" className="w-14 h-14 rounded-2xl" disabled={currentDayIndex === 0} onClick={() => setCurrentDayIndex(currentDayIndex - 1)}>
                          <ChevronLeft size={20} />
                       </Button>
                       <Button size="sm" variant="secondary" className="w-14 h-14 rounded-2xl" disabled={currentDayIndex === days.length - 1} onClick={() => setCurrentDayIndex(currentDayIndex + 1)}>
                          <ChevronRight size={20} />
                       </Button>
                   </div>
                </div>

                <div className="space-y-6">
                   {plannedSessions.filter(s => s.day === days[currentDayIndex]).map((s, idx) => (
                      <Card key={s.id} className="p-6 sm:p-10 relative group border border-dashed border-primary/20 hover:border-primary/50 transition-all rounded-[3rem] bg-[var(--card)] overflow-visible">
                         <button onClick={() => removeSession(s.id)} className="absolute -top-4 -right-4 w-12 h-12 bg-rose-500 text-white shadow-xl rounded-2xl flex items-center justify-center hover:scale-110 transition-all z-20">
                            <Trash2 size={24} />
                         </button>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                            <Select label="Subject" value={s.subject_id} onChange={e => updateSession(s.id, { subject_id: e.target.value })} className="h-14 font-bold rounded-2xl">
                               <option value="">Select Target</option>
                               {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                            </Select>
                            <Input label="Start Time" type="time" value={s.start_time} onChange={e => updateSession(s.id, { start_time: e.target.value })} className="h-14 font-bold rounded-2xl" />
                            <Input label="Duration (min)" type="number" value={s.duration} onChange={e => updateSession(s.id, { duration: parseInt(e.target.value) })} className="h-14 font-bold rounded-2xl" />
                         </div>

                         <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10 relative overflow-hidden group/goal">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                               <Sparkles size={64} className="text-primary group-hover/goal:scale-125 transition-transform duration-700" />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-8 flex items-center gap-3">
                               <PenTool size={16} /> Mission Blueprint
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                               <Input label="The Objective" placeholder="What are you conquering?" value={s.goals.objective} onChange={e => updateSession(s.id, { goals: { ...s.goals, objective: e.target.value } })} className="bg-white/50" />
                               <Input label="The Strategy" placeholder="How will you win?" value={s.goals.action} onChange={e => updateSession(s.id, { goals: { ...s.goals, action: e.target.value } })} className="bg-white/50" />
                               <Input label="The Outcome" placeholder="Proof of victory?" value={s.goals.outcome} onChange={e => updateSession(s.id, { goals: { ...s.goals, outcome: e.target.value } })} className="bg-white/50" />
                               <Input label="The Significance" placeholder="Why does this matter?" value={s.goals.meaning} onChange={e => updateSession(s.id, { goals: { ...s.goals, meaning: e.target.value } })} className="bg-white/50" />
                            </div>
                         </div>
                      </Card>
                   ))}

                   <Button variant="secondary" className="w-full py-16 border-2 border-dashed border-primary/20 rounded-[3rem] bg-white transition-all hover:bg-primary/5 hover:border-primary/50 group" onClick={() => addSessionToDay(days[currentDayIndex])}>
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <Plus size={24} />
                         </div>
                         <span className="font-black text-xs uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">Add New Mission Block</span>
                      </div>
                   </Button>
                </div>

                <div className="flex justify-between items-center pt-12 gap-6">
                   <Button variant="secondary" className="px-10 rounded-full h-16 font-bold" onClick={() => setStep(1)}><ChevronLeft size={20} className="mr-2" /> Back</Button>
                   <Button className="flex-1 rounded-full font-black shadow-2xl shadow-primary/20 bg-slate-900 h-20 text-white uppercase tracking-[0.2em]" onClick={() => setStep(3)}>
                      Analyze Roadmap <ChevronRight className="ml-3" size={20} />
                   </Button>
                </div>
             </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
             <Card className="p-8 sm:p-14 space-y-10 border-none shadow-2xl rounded-[3.5rem] bg-[var(--card)]">
                <div className="text-center space-y-4">
                   <div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                      Final Review
                   </div>
                   <h2 className="text-4xl font-black tracking-tight">{planName}</h2>
                   <p className="text-sm text-[var(--text-muted)] font-bold uppercase tracking-widest opacity-50">{plannedSessions.length} Sequential Missions planned</p>
                </div>

                <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                   {plannedSessions.sort((a,b) => a.day.localeCompare(b.day)).map(s => (
                      <div key={s.id} className="p-6 rounded-[2rem] bg-[var(--input)] flex items-center justify-between border border-transparent hover:border-primary/20 transition-all">
                         <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex flex-col items-center justify-center text-primary">
                               <span className="text-lg font-black">{new Date(s.day).getDate()}</span>
                               <span className="text-[8px] font-black uppercase">{new Date(s.day).toLocaleDateString(undefined, { month: 'short' })}</span>
                            </div>
                            <div>
                               <div className="font-black text-sm uppercase tracking-tight">
                                  {subjects.find(sub => sub.id === s.subject_id)?.name || 'Focus Session'}
                               </div>
                               <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{s.start_time} • {s.duration} Minutes</div>
                            </div>
                         </div>
                         <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest">Encoded</Badge>
                      </div>
                   ))}
                </div>

                <div className="flex flex-col gap-4">
                   <Button size="lg" className="w-full rounded-2xl h-20 font-black text-lg bg-emerald-500 shadow-2xl shadow-emerald-500/30 hover:bg-emerald-600 border-none text-white uppercase tracking-[0.2em]" onClick={saveAllSessions} disabled={plannedSessions.length === 0}>
                      Deploy Roadmap <Check className="ml-3" size={24} strokeWidth={3} />
                   </Button>
                   <Button variant="secondary" className="w-full h-14 rounded-2xl font-bold uppercase tracking-widest" onClick={() => setStep(2)}>Adjust Parameters</Button>
                </div>
             </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
