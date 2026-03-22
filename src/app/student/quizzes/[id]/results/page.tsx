'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ChevronLeft, CheckCircle2, XCircle, 
  HelpCircle, Zap, Trophy, Award,
  Info, ArrowRight, BrainCircuit
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { Users } from 'lucide-react'

export default function QuizResults() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState<any>(null)
  const [attempt, setAttempt] = useState<any>(null)
  const [rankings, setRankings] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'class' | 'curriculum'>('class')

  useEffect(() => {
    if (student) loadData()
  }, [id, student])

  const loadData = async () => {
    setLoading(true)
    const [qRes, aRes] = await Promise.all([
      supabase.from('quizzes').select('*').eq('id', id).single(),
      supabase.from('quiz_attempts').select('*').eq('quiz_id', id).eq('student_id', (student as any)?.id || student?.id).order('completed_at', { ascending: false }).limit(1).single()
    ])
    
    if (qRes.data && aRes.data && student) {
      try {
        const curriculumId = (student as any)?.curriculum_id || (student as any)?.classes?.curriculum_id
        const [classRank, curriculumLeaderboard, overallRank] = await Promise.all([
          supabase.rpc('get_class_quiz_ranking', { p_quiz_id: id, p_class_id: (student as any)?.class_id }),
          supabase.rpc('get_subject_curriculum_leaderboard', { 
            p_subject_id: qRes.data.subject_id, 
            p_curriculum_id: curriculumId 
          }),
          supabase.rpc('get_overall_performance_ranking')
        ])
        
        setRankings({
          class: classRank.data?.find((r: any) => r.student_id === ((student as any)?.id || student?.id))?.rank,
          subject: curriculumLeaderboard.data?.find((r: any) => r.student_id === ((student as any)?.id || student?.id))?.rank,
          overall: overallRank.data?.find((r: any) => r.student_id === ((student as any)?.id || student?.id))?.rank,
        })

        if (classRank.data) {
          setLeaderboard(classRank.data.slice(0, 5))
        }
        if (curriculumLeaderboard.data) {
          setGlobalLeaderboard(curriculumLeaderboard.data.slice(0, 5))
        }
      } catch (err) {
        console.error('Ranking load error', err)
      }
    }
    
    setQuiz(qRes.data)
    setAttempt(aRes.data)
    setLoading(false)
  }

  if (loading) return <SkeletonDashboard />

  const questions = quiz.questions as any[]
  const answers = attempt.answers as Record<string, string>
  const passed = attempt.score >= quiz.passing_score

  return (
    <div className="p-6 max-w-4xl mx-auto pb-32 space-y-10">
      {/* Hero Result */}
      <div className="flex flex-col items-center text-center space-y-6">
         <div className="flex items-center gap-4 w-full">
            <button onClick={() => router.back()} className="p-3 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] hover:bg-[var(--input)]"><ChevronLeft size={20} /></button>
            <h1 className="text-xl font-black" style={{ color: 'var(--text)' }}>Quiz Performance Intel</h1>
         </div>

          <div className={`p-10 rounded-[3rem] w-full relative overflow-hidden flex flex-col items-center gap-4 ${passed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full items-center">
                <div className="flex flex-col items-center gap-4">
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl ${passed ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                       {passed ? <Trophy size={40} /> : <BrainCircuit size={40} />}
                    </div>
                    <div className="text-center">
                       <div className="text-4xl font-black" style={{ color: 'var(--text)' }}>
                          {attempt.score} / {attempt.total_marks || quiz?.total_marks || 0}
                       </div>
                       <div className="text-[10px] items-center gap-2 flex justify-center uppercase font-black tracking-[0.2em] mt-1" style={{ color: 'var(--text-muted)' }}>
                          {passed ? <Badge variant="success">Passed Sector</Badge> : <Badge variant="warning">Attempt Again</Badge>}
                       </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                   {[
                      { label: 'Class Rank', value: rankings?.class, icon: <Users size={14} /> },
                      { label: 'Subject Rank', value: rankings?.subject, icon: <Award size={14} /> },
                      { label: 'Global Rank', value: rankings?.overall, icon: <Trophy size={14} /> }
                   ].map((r, i) => (
                      <Card key={i} className="p-3 flex flex-col items-center justify-center bg-white/5 border-none">
                         <div className="text-lg font-black text-primary">{r.value || '--'}</div>
                         <div className="text-[8px] font-bold uppercase tracking-wider text-muted mt-1">{r.label}</div>
                      </Card>
                   ))}
                </div>
             </div>
             <motion.div initial={{ width: 0 }} animate={{ width: `${attempt.percentage}%` }} className={`h-1.5 rounded-full absolute bottom-0 left-0 ${passed ? 'bg-emerald-500 shadow-[0_0_12px_var(--emerald-500)]' : 'bg-amber-500'}`} />
          </div>

          {/* Total XP & Progress */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
             <Card className="p-4 flex items-center gap-4 bg-primary/5 border-primary/20">
                <div className="p-3 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                   <Zap size={24} />
                </div>
                <div>
                   <div className="text-2xl font-black" style={{ color: 'var(--text)' }}>{student?.xp || 0} XP</div>
                   <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Total Experience</div>
                </div>
             </Card>
             <Card className="p-4 flex items-center gap-4 bg-amber-500/5 border-amber-500/20">
                <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                   <Trophy size={24} />
                </div>
                <div>
                   <div className="text-2xl font-black" style={{ color: 'var(--text)' }}>#{rankings?.subject || '--'}</div>
                   <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Curriculum Rank</div>
                </div>
             </Card>
          </div>

          {/* Dual Leaderboards */}
          {(leaderboard.length > 0 || globalLeaderboard.length > 0) && (
            <Card className="w-full p-6 space-y-6">
               <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-4">
                  <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
                     <Trophy size={16} className="text-amber-500" /> Leaderboards
                  </h3>
                  <div className="flex bg-[var(--input)] p-1 rounded-xl gap-1">
                     <button 
                        onClick={() => setActiveTab('class')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeTab === 'class' ? 'bg-white shadow-sm text-primary' : 'text-muted hover:text-primary'}`}
                     >Class</button>
                     <button 
                        onClick={() => setActiveTab('curriculum')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeTab === 'curriculum' ? 'bg-white shadow-sm text-primary' : 'text-muted hover:text-primary'}`}
                     >Curriculum</button>
                  </div>
               </div>

               <div className="space-y-2">
                  {(activeTab === 'class' ? leaderboard : globalLeaderboard).map((entry, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${entry.student_id === student?.id ? 'bg-primary/10 border border-primary/20' : 'bg-[var(--input)]'}`}>
                       <div className="flex items-center gap-3 text-sm font-bold">
                          <span className={`${i === 0 ? 'text-amber-500' : 'text-muted'} w-4 text-xs`}>{i + 1}</span>
                          <span style={{ color: 'var(--text)' }}>{entry.full_name}</span>
                       </div>
                       <div className="text-xs font-black text-primary">
                          {activeTab === 'class' ? `${entry.percentage}%` : `${entry.avg_percentage}%`}
                       </div>
                    </div>
                  ))}
                  {(activeTab === 'class' ? leaderboard : globalLeaderboard).length === 0 && (
                    <p className="text-center py-4 text-xs text-muted font-bold italic">No data available for this field yet.</p>
                  )}
               </div>
               
               <p className="text-[9px] text-center text-muted font-bold opacity-60">
                  {activeTab === 'class' 
                    ? "Ranked based on scores for this specific quiz challenge." 
                    : "Ranked based on average performance in this subject across all classes in your curriculum."}
               </p>
            </Card>
          )}
      </div>

      {/* Review Section */}
      <div className="space-y-6">
         <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Info size={20} className="text-primary" /> Question Review
         </h2>

         <div className="space-y-4">
            {questions.map((q, idx) => {
               const studentAns = answers[q.id]
               const grading = attempt.grading_details?.[q.id]
               const isCorrect = grading ? grading.score === grading.max : (q.type === 'multiple_answer' ? (Array.isArray(studentAns) && q.correct_answers?.every((ca: string) => studentAns.includes(ca)) && studentAns.every((sa: string) => q.correct_answers?.includes(sa))) : studentAns === q.correct_answer)

               return (
                 <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                    <Card className={`p-6 border-l-8 ${isCorrect ? 'border-emerald-500' : 'border-rose-500'}`}>
                       <div className="flex justify-between items-start gap-4 mb-6">
                          <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>{idx + 1}. {q.text}</h3>
                          {isCorrect ? <CheckCircle2 className="text-emerald-500 shrink-0" /> : <XCircle className="text-rose-500 shrink-0" />}
                       </div>

                        <div className="space-y-4 mb-6">
                           {(q.type === 'multiple_choice' || q.type === 'multiple_answer' || q.type === 'true_false') && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(q.type === 'true_false' ? ['True', 'False'] : q.options).map((opt: string, oIdx: number) => {
                                   const isSelected = q.type === 'multiple_choice' || q.type === 'true_false'
                                     ? studentAns === opt
                                     : Array.isArray(studentAns) && studentAns.includes(opt)

                                   const isCorrectOpt = q.type === 'multiple_choice' || q.type === 'true_false'
                                     ? q.correct_answer === opt
                                     : q.correct_answers?.includes(opt)

                                   return (
                                     <div
                                       key={oIdx}
                                       className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all ${isCorrectOpt ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700' : isSelected ? 'bg-rose-500/10 border-rose-500 text-rose-700' : 'bg-[var(--input)] border-transparent opacity-50'}`}
                                     >
                                        <div className="flex items-center justify-between">
                                           <span>{opt}</span>
                                           {isCorrectOpt && <CheckCircle2 size={14} />}
                                           {isSelected && !isCorrectOpt && <XCircle size={14} />}
                                        </div>
                                     </div>
                                   )
                                })}
                             </div>
                           )}

                           {q.type === 'short_answer' && (
                             <div className="space-y-2">
                                <div className="p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)]">
                                   <div className="text-[10px] text-muted uppercase font-bold mb-1">Your Answer</div>
                                   <div className="font-bold">{studentAns || 'No Answer'}</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                                   <div className="text-[10px] text-emerald-600 uppercase font-bold mb-1">Correct Answer / Keywords</div>
                                   <div className="font-bold text-emerald-700">
                                      {q.grading_method === 'keyword' ? q.keywords?.join(', ') : q.correct_answers?.join(', ')}
                                   </div>
                                </div>
                             </div>
                           )}
                        </div>

                       {q.explanation && (
                          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                             <b>Intel Memo:</b> {q.explanation}
                          </div>
                       )}
                    </Card>
                 </motion.div>
               )
            })}
         </div>
      </div>

      <div className="flex justify-center pt-10">
         <Button className="px-12 py-8 rounded-[2rem] shadow-xl shadow-primary/20" onClick={() => router.push('/student/quizzes')}>
            Return to Arena Hub <ArrowRight className="ml-2" />
         </Button>
      </div>
    </div>
  )
}
