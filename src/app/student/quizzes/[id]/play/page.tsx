'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, Trophy, Clock, BrainCircuit, 
  ArrowRight, CheckCircle2, XCircle,
  AlertTriangle, Play, HelpCircle
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, Badge } from '@/components/ui/Card'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { gradeQuiz, GradingQuestion } from '@/lib/quiz/grading'
import { LatexRenderer } from '@/components/ui/LatexRenderer'
import { clearPageDataCache } from '@/hooks/usePageData'

export default function QuizPlayer() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [quiz, setQuiz] = useState<any>(null)
  
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [score, setScore] = useState(0)
  const [results, setResults] = useState<any>(null)

  useEffect(() => {
    loadQuiz()
  }, [id])

  const loadQuiz = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const { data, error } = await supabase.from('quizzes').select('*, teacher:teachers(full_name)').eq('id', id).single()
      if (error || !data) { 
        toast.error('Quiz not found or network error')
        setLoadError(true)
        setLoading(false)
        return 
      }
      
      setQuiz(data)
      const limit = data.duration_minutes || 0
      setTimeLeft(limit * 60)
    } catch (err) {
      console.error('[Quiz] Load error:', err)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (timeLeft > 0 && !isFinished) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
      return () => clearInterval(timer)
    } else if (timeLeft === 0 && quiz && !isFinished) {
      finishQuiz()
    }
  }, [timeLeft, isFinished])

  const selectAnswer = (questionId: string, answer: string) => {
    if (isFinished) return
    setAnswers({ ...answers, [questionId]: answer })
  }

  const selectMultiAnswer = (questionId: string, answer: string) => {
    if (isFinished) return
    const current = (answers[questionId] as unknown as string[]) || [];
    const updated = current.includes(answer)
      ? current.filter(a => a !== answer)
      : [...current, answer];
    setAnswers({ ...answers, [questionId]: updated as any });
  }

  const finishQuiz = async () => {
    if (isFinished) return
    setIsFinished(true)
    
    // Use Grading Engine
    const { percentage, totalScore, details } = gradeQuiz(quiz.questions as GradingQuestion[], answers)
    
    setScore(percentage)
    
    const passed = percentage >= (quiz.pass_mark_percentage || 70)
    const resStatus = passed ? 'pass' : 'fail'

    // Save to DB
    const { data: attempt, error } = await supabase.from('quiz_attempts').insert({
      quiz_id: id as string,
      student_id: (student as any)?.id || student?.id, 
      score: totalScore,
      total_marks: quiz.total_marks || 0,
      percentage: percentage,
      answers: answers,
      status: 'submitted',
      result: resStatus,
      grading_details: details,
      completed_at: new Date().toISOString()
    }).select().single()

    if (error) {
      console.error(error)
      toast.error('Failed to save results')
    } else {
      setResults(attempt)
      
      // Award XP
      try {
        const baseXP = 30 // Attempt XP
        const bonusXP = percentage >= 80 ? 50 : 0 // Bonus XP for mastering
        const totalXPToAdd = baseXP + bonusXP
        
        const currentXP = student?.xp || 0
        const newXP = currentXP + totalXPToAdd
        
        const { error: xpError } = await supabase
          .from('students')
          .update({ 
            xp: newXP,
            last_active_at: new Date().toISOString().split('T')[0]
          })
          .eq('id', student?.id)
        
        if (!xpError) {
          const { setStudent } = useAuthStore.getState()
          setStudent({ ...student as any, xp: newXP })
          toast.success(`+${totalXPToAdd} XP! (${baseXP} attempt ${bonusXP > 0 ? '+ 50 bonus' : ''})`)
        }
      } catch (err) {
        console.error('XP Awarding Error', err)
      }

      toast.success('Quiz Submitted!')
      clearPageDataCache()
    }
  }

  if (loading && !quiz) return (
     <div className="h-screen flex flex-col items-center justify-center bg-[var(--bg)] gap-4">
        <BrainCircuit size={64} className="text-primary animate-pulse" />
        <p className="text-sm font-bold text-muted">Loading Quiz Engine...</p>
     </div>
  )

  if (loadError && !quiz) return (
    <div className="h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 flex items-center justify-center mx-auto">
          <AlertTriangle size={32} className="text-rose-500" />
        </div>
        <h2 className="text-xl font-black uppercase italic" style={{ color: 'var(--text)' }}>Failed to Load</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>We couldn't connect to the quiz engine. Check your connection.</p>
        <div className="flex gap-3 justify-center pt-4">
          <Button variant="secondary" onClick={() => router.push('/student/quizzes')}>Back to Hub</Button>
          <Button onClick={() => loadQuiz()}>Try Again</Button>
        </div>
      </div>
    </div>
  )

  const currentQ = quiz.questions[currentIdx]
  const progress = ((currentIdx + 1) / quiz.questions.length) * 100
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  if (isFinished) {
     const passed = score >= quiz.passing_score
     return (
        <div className="h-screen flex items-center justify-center p-6 bg-[var(--bg)] overflow-y-auto">
           <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl w-full text-center space-y-8">
              <div className="relative inline-block">
                 <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl ${passed ? 'bg-emerald-500 shadow-emerald-500/40' : 'bg-amber-500 shadow-amber-500/40'}`}>
                    {passed ? <Trophy size={64} className="text-white" /> : <BrainCircuit size={64} className="text-white" />}
                 </div>
                 {passed && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: 'linear' }} className="absolute inset-0 border-4 border-dashed border-emerald-500/20 rounded-full -m-4" />}
              </div>
              
              <div>
                 <h1 className="text-4xl font-black" style={{ color: 'var(--text)' }}>
                    {passed ? 'Epic Victory!' : 'Good Effort!'}
                 </h1>
                 <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {passed ? 'You crushed the challenge and earned massive XP!' : 'You&apos;re getting closer. Review your results to master this topic.'}
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <Card className="p-6 border-none shadow-xl">
                    <div className="text-3xl font-black text-primary">{results?.score || 0} / {results?.total_marks || 0}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Marks Scored</div>
                 </Card>
                 <Card className="p-6 border-none shadow-xl">
                    <div className="text-3xl font-black text-amber-500">+{score >= 80 ? 80 : 30}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted">XP Earned</div>
                 </Card>
              </div>

              <div className="flex gap-4">
                 <Button className="flex-1 py-8 rounded-3xl" variant="secondary" onClick={() => router.push('/student/quizzes')}>Exit to Hub</Button>
                 <Button className="flex-1 py-8 rounded-3xl shadow-xl shadow-primary/20" onClick={() => router.push(`/student/quizzes/${id}/results`)}>View Intel</Button>
              </div>
           </motion.div>
        </div>
     )
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden">
      {/* Quiz Header */}
      <header className="h-20 px-6 border-b border-[var(--card-border)] bg-[var(--card)] flex items-center justify-between">
         <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--input)]"><XCircle size={20} /></button>
            <div className="hidden md:block">
               <h2 className="text-sm font-black" style={{ color: 'var(--text)' }}>{quiz.title}</h2>
               <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Question {currentIdx + 1} of {quiz.questions.length}</p>
            </div>
         </div>

         {/* Timer */}
         <div className={`flex items-center gap-3 px-6 py-2 rounded-2xl border transition-all ${timeLeft < 60 ? 'bg-rose-500/10 border-rose-500 text-rose-500 animate-pulse' : 'bg-primary/10 border-primary/20 text-primary'}`}>
            <Clock size={18} />
            <span className="font-black text-lg tabular-nums">
               {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </span>
         </div>

         <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={finishQuiz}>End Session</Button>
         </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200">
         <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-primary shadow-[0_0_8px_var(--primary)]" />
      </div>

      {/* Question Layout */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center">
         <div className="max-w-3xl w-full flex-1 flex flex-col justify-center gap-12 pb-20">
            <AnimatePresence mode="wait">
               <motion.div 
                 key={currentIdx}
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="space-y-12"
               >
                  <h2 className="text-3xl md:text-4xl font-black text-center leading-tight" style={{ color: 'var(--text)' }}>
                     <LatexRenderer content={currentQ.text} />
                  </h2>

                  {/* Question Image Support */}
                  {currentQ.image_url && (
                    <div className="w-full flex justify-center">
                       <motion.div 
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         className="relative group max-w-2xl w-full rounded-[2rem] overflow-hidden border-4 border-[var(--card-border)] bg-[var(--card)] shadow-2xl"
                       >
                          <img 
                            src={currentQ.image_url} 
                            alt="Question illustration" 
                            className="w-full max-h-[400px] object-contain"
                          />
                       </motion.div>
                    </div>
                  )}

                  <div className="w-full">
                     {(currentQ.type === 'multiple_choice' || currentQ.type === 'multiple_answer') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {currentQ.options.map((opt: string, i: number) => {
                             const isSelected = currentQ.type === 'multiple_choice' 
                               ? answers[currentQ.id] === opt 
                               : Array.isArray(answers[currentQ.id]) && (answers[currentQ.id] as unknown as string[]).includes(opt);
                               
                             return (
                               <button
                                 key={i}
                                 onClick={() => currentQ.type === 'multiple_choice' ? selectAnswer(currentQ.id, opt) : selectMultiAnswer(currentQ.id, opt)}
                                 className={`p-6 rounded-[2rem] border-4 text-left transition-all ${isSelected ? 'border-primary bg-primary/10 scale-105 shadow-xl shadow-primary/10' : 'border-transparent bg-[var(--card)] hover:bg-[var(--input)]'}`}
                               >
                                  <div className="flex items-center gap-4">
                                     <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${isSelected ? 'bg-primary text-white' : 'bg-[var(--input)] text-muted'}`}>
                                        {String.fromCharCode(65 + i)}
                                     </div>
                                     <LatexRenderer content={opt} className="font-bold whitespace-normal" style={{ color: 'var(--text)' }} />
                                  </div>
                               </button>
                             )
                           })}
                        </div>
                     )}

                     {currentQ.type === 'true_false' && (
                        <div className="flex justify-center gap-6">
                           {['True', 'False'].map(opt => (
                              <button
                                key={opt}
                                onClick={() => selectAnswer(currentQ.id, opt)}
                                className={`px-12 py-8 rounded-[2rem] border-4 text-2xl font-black transition-all ${answers[currentQ.id] === opt ? 'border-primary bg-primary/10 scale-110 shadow-xl' : 'border-transparent bg-[var(--card)] hover:bg-[var(--input)]'}`}
                              >
                                {opt}
                              </button>
                           ))}
                        </div>
                     )}

                     {currentQ.type === 'short_answer' && (
                        <div className="max-w-md mx-auto">
                           <input 
                              type="text"
                              autoFocus
                              placeholder="Type your answer here..."
                              className="w-full bg-[var(--input)] border-2 border-primary/20 rounded-3xl p-6 text-xl text-center font-bold focus:border-primary outline-none transition-all"
                              value={answers[currentQ.id] || ''}
                              onChange={e => selectAnswer(currentQ.id, e.target.value)}
                           />
                        </div>
                     )}
                  </div>
               </motion.div>
            </AnimatePresence>
         </div>

         {/* Navigation Btm */}
         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 flex gap-2 md:gap-4 justify-center z-50">
            {currentIdx > 0 && (
              <Button variant="secondary" className="flex-1 py-4 md:py-6 rounded-full text-xs md:text-sm whitespace-nowrap" onClick={() => setCurrentIdx(i => i - 1)}>Previous</Button>
            )}
            {currentIdx < quiz.questions.length - 1 ? (
              <Button 
                className="flex-1 py-4 md:py-6 rounded-full shadow-xl shadow-primary/20 text-xs md:text-sm whitespace-nowrap" 
                disabled={!answers[currentQ.id]} 
                onClick={() => setCurrentIdx(i => i + 1)}
              >
                 Next <ArrowRight className="ml-1 md:ml-2 w-4 h-4 md:w-5 md:h-5" />
              </Button>
            ) : (
              <Button 
                className="flex-1 py-4 md:py-6 rounded-full bg-emerald-500 hover:bg-emerald-600 border-none shadow-xl shadow-emerald-500/20 text-xs md:text-sm whitespace-nowrap" 
                disabled={!answers[currentQ.id]} 
                onClick={finishQuiz}
              >
                 Finish <Zap className="ml-1 md:ml-2 w-4 h-4 md:w-5 md:h-5" />
              </Button>
            )}
         </div>
      </main>
    </div>
  )
}
