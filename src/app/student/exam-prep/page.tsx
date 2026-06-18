'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Target, BookOpen, ChevronRight, Play, CheckCircle2, Circle, Flag, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { getStudentPlanners, createExamPlanner, togglePlanDayComplete } from '@/app/actions/planner'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

export default function ExamPrepPlanner() {
  const { student } = useAuthStore()
  const [planners, setPlanners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activePlanner, setActivePlanner] = useState<any>(null)

  // Creation State
  const [isCreating, setIsCreating] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [targetScore, setTargetScore] = useState('')
  const [subjects, setSubjects] = useState<string[]>(['Mathematics', 'English', 'Science', 'Social Studies'])
  const [newSubject, setNewSubject] = useState('')

  useEffect(() => {
    if (student?.id) {
      loadPlanners()
    }
  }, [student?.id])

  const loadPlanners = async () => {
    if (!student?.id) return
    try {
      const data = await getStudentPlanners(student.id)
      setPlanners(data)
    } catch (e) {
      toast.error('Failed to load study plans')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlanner = async () => {
    if (!examName || !examDate || subjects.length === 0) return
    setIsGenerating(true)
    try {
      await createExamPlanner(student!.id, examName, examDate, targetScore, subjects)
      setIsCreating(false)
      loadPlanners()
      toast.success('AI Study Plan Generated!', { icon: '✨' })
    } catch (e) {
      toast.error('Failed to generate study plan')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggleDay = async (dayId: string, currentStatus: boolean) => {
    try {
      await togglePlanDayComplete(dayId, !currentStatus)
      if (!currentStatus) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } })
        toast.success('+20 XP Earned!')
      }
      
      // Optimistic update
      const updatedPlanners = planners.map(p => {
        if (p.id === activePlanner.id) {
          return {
            ...p,
            days: p.days.map((d: any) => d.id === dayId ? { ...d, is_completed: !currentStatus } : d)
          }
        }
        return p
      })
      setPlanners(updatedPlanners)
      setActivePlanner(updatedPlanners.find(p => p.id === activePlanner.id))

    } catch (e) {
      toast.error('Failed to update progress')
    }
  }

  if (loading) return <div className="p-6 flex justify-center items-center h-64"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>

  if (activePlanner) {
    const todayStr = new Date().toISOString().split('T')[0]
    
    // Calculate days remaining
    const diffTime = new Date(activePlanner.exam_date).getTime() - new Date().getTime()
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

    const completedDays = activePlanner.days.filter((d: any) => d.is_completed).length
    const totalDays = activePlanner.days.length
    const progressPct = totalDays > 0 ? (completedDays / totalDays) * 100 : 0

    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto pb-32 space-y-8">
        <Button variant="ghost" onClick={() => setActivePlanner(null)} className="-ml-4 text-muted">
          <ChevronRight className="mr-2 rotate-180" size={16} /> Back to Planners
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-gradient-to-r from-sky-500/10 to-indigo-500/10 p-8 rounded-3xl border border-sky-500/20">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/30">
                <Target size={20} />
              </div>
              <h1 className="text-3xl font-black" style={{ color: 'var(--text)' }}>{activePlanner.exam_name}</h1>
            </div>
            <p className="text-sm font-bold text-muted flex items-center gap-2">
              <Calendar size={14} /> Exam Date: {new Date(activePlanner.exam_date).toLocaleDateString()}
              <span className="mx-2">•</span>
              <Flag size={14} /> Target: {activePlanner.target_score || 'Do my best!'}
            </p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="px-6 py-4 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] flex flex-col items-center">
              <span className="font-black text-sky-500 text-3xl">{daysRemaining}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted font-bold">Days Left</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm font-bold text-muted">
            <span>Overall Progress</span>
            <span className="text-sky-500">{Math.round(progressPct)}%</span>
          </div>
          <div className="h-3 w-full bg-[var(--input)] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h3 className="font-black text-lg uppercase tracking-widest text-muted">Day by Day Plan</h3>
          
          <div className="relative border-l-2 border-[var(--card-border)] ml-4 space-y-8 pl-8 py-4">
            {activePlanner.days.map((day: any) => {
              const isToday = day.study_date === todayStr
              const isPast = new Date(day.study_date) < new Date(todayStr)
              const isFuture = new Date(day.study_date) > new Date(todayStr)
              
              let markerClass = 'bg-[var(--card)] border-[var(--card-border)] text-muted'
              if (day.is_completed) markerClass = 'bg-emerald-500 border-emerald-500 text-white'
              else if (isToday) markerClass = 'bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-500/40 ring-4 ring-sky-500/20'
              else if (isPast) markerClass = 'bg-rose-500/20 border-rose-500 text-rose-500'

              return (
                <div key={day.id} className="relative">
                  <div className={`absolute -left-[41px] top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] ${markerClass}`}>
                    {day.is_completed ? <CheckCircle2 size={12} /> : ''}
                  </div>
                  
                  <Card className={`p-6 transition-all ${isToday && !day.is_completed ? 'ring-2 ring-sky-500 shadow-xl shadow-sky-500/10' : ''} ${day.is_completed ? 'opacity-70' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-black text-lg flex items-center gap-2" style={{ color: 'var(--text)' }}>
                          {new Date(day.study_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                          {isToday && <span className="text-[10px] bg-sky-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Today</span>}
                        </h4>
                      </div>
                      <Button 
                        variant={day.is_completed ? 'secondary' : 'primary'} 
                        size="sm" 
                        onClick={() => handleToggleDay(day.id, day.is_completed)}
                        className={!day.is_completed && isToday ? 'bg-sky-500 hover:bg-sky-600 border-none' : ''}
                      >
                        {day.is_completed ? 'Undo' : 'Mark Complete'}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {(day.tasks || []).map((task: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <BookOpen size={16} className="text-muted mt-0.5 shrink-0" />
                          <div>
                            <span className="font-bold mr-2" style={{ color: 'var(--text)' }}>[{task.subject}]</span>
                            <span style={{ color: 'var(--text-muted)' }}>{task.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Exam Preparation</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>AI-generated daily study schedules leading up to your big exams.</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="rounded-2xl shadow-lg shadow-sky-500/20 bg-gradient-to-r from-sky-500 to-indigo-500 border-none hover:scale-105 transition-transform">
          <Target size={16} className="mr-2" /> Plan New Exam
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="p-6 md:p-8 border-sky-500/20 bg-sky-500/5 shadow-2xl">
              <h3 className="font-black text-xl mb-6 text-sky-500 flex items-center gap-2">
                <Target size={24} /> New Exam Target
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="flex items-center justify-between ml-1 mb-1">
                    <label className="text-[10px] uppercase font-bold text-muted block">Exam Name</label>
                  </div>
                  <Input placeholder="e.g. End of Term 3 Finals" value={examName} onChange={e => setExamName(e.target.value)} className="rounded-xl" />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <button onClick={() => setExamName('KCSE')} className="text-[10px] px-2 py-1 bg-sky-500/10 text-sky-500 rounded-md font-bold hover:bg-sky-500/20">KCSE (8-4-4)</button>
                    <button onClick={() => setExamName('KPSEA')} className="text-[10px] px-2 py-1 bg-sky-500/10 text-sky-500 rounded-md font-bold hover:bg-sky-500/20">KPSEA (Grade 9)</button>
                    <button onClick={() => setExamName('KJSEA')} className="text-[10px] px-2 py-1 bg-sky-500/10 text-sky-500 rounded-md font-bold hover:bg-sky-500/20">KJSEA (Grade 6)</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted ml-1 mb-1 block">Exam Date</label>
                  <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="rounded-xl" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted ml-1 mb-1 block">Target Score / Grade (Optional)</label>
                  <Input placeholder="e.g. 400 Marks / Grade A" value={targetScore} onChange={e => setTargetScore(e.target.value)} className="rounded-xl" />
                </div>
              </div>

              <div className="mb-8">
                <label className="text-[10px] uppercase font-bold text-muted ml-1 mb-2 block">Subjects to Revise</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {subjects.map(sub => (
                    <div key={sub} className="px-3 py-1.5 bg-[var(--card)] border border-[var(--card-border)] rounded-lg text-sm font-bold flex items-center gap-2">
                      {sub}
                      <X size={14} className="text-muted cursor-pointer hover:text-rose-500" onClick={() => setSubjects(subjects.filter(s => s !== sub))} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 max-w-sm">
                  <Input placeholder="Add subject..." value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => {
                    if (e.key === 'Enter' && newSubject) { setSubjects([...subjects, newSubject]); setNewSubject(''); }
                  }} className="rounded-xl h-10" />
                  <Button variant="secondary" onClick={() => { if(newSubject){setSubjects([...subjects, newSubject]); setNewSubject('');} }} className="rounded-xl h-10 px-4">Add</Button>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                <Button 
                  onClick={handleCreatePlanner} 
                  disabled={!examName || !examDate || subjects.length === 0 || isGenerating}
                  className="bg-sky-500 hover:bg-sky-600 text-white border-none rounded-xl px-8"
                >
                  {isGenerating ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" /> AI Generating...</>
                  ) : 'Generate AI Plan'}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planners.map((planner: any) => {
          const completedDays = planner.days.filter((d: any) => d.is_completed).length
          const totalDays = planner.days.length
          const progressPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0
          
          return (
            <motion.div key={planner.id} whileHover={{ y: -5 }}>
              <Card className="p-6 h-full flex flex-col group cursor-pointer hover:shadow-xl hover:shadow-sky-500/10 transition-all border-t-4 border-t-sky-500" onClick={() => setActivePlanner(planner)}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-xl leading-tight pr-4" style={{ color: 'var(--text)' }}>{planner.exam_name}</h3>
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 shrink-0">
                    <Target size={20} />
                  </div>
                </div>
                
                <p className="text-xs font-bold mb-6 text-muted flex items-center gap-1">
                  <Calendar size={12} /> {new Date(planner.exam_date).toLocaleDateString()}
                </p>

                <div className="mt-auto space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted">
                    <span>Progress</span>
                    <span className="text-sky-500">{progressPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-[var(--input)] rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
        
        {planners.length === 0 && !isCreating && (
          <Card className="col-span-full p-12 text-center border-dashed">
            <Target size={48} className="mx-auto text-muted opacity-20 mb-4" />
            <h3 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>No Active Plans</h3>
            <p className="text-sm text-muted font-bold mb-6 max-w-sm mx-auto">Create your first exam study plan and let Peak AI organize your revision schedule.</p>
            <Button onClick={() => setIsCreating(true)} className="rounded-2xl bg-sky-500 hover:bg-sky-600 text-white border-none">
              Plan New Exam
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
