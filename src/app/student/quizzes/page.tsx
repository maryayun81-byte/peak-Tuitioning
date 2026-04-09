'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  SearchIcon, ArrowRight, Trophy, Target, BrainCircuit, Clock, Play, Zap, CheckCircle2
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Quiz, QuizAttempt } from '@/types/database'

export default function StudentQuizzes() {
  const supabase = getSupabaseBrowserClient()
  const { student, profile } = useAuthStore()
  
  const [search, setSearch] = useState('')

  const fetchQuizzes = async () => {
    if (!student) return { quizzes: [], attempts: {} }

    const { data: subData } = await supabase
      .from('student_subjects')
      .select('subject_id')
      .eq('student_id', student.id)
    const subjectIds = subData?.map((s: any) => s.subject_id) || []

    const [allRes, classRes, aRes] = await Promise.all([
      supabase.from('quizzes')
        .select('id, title, created_at, audience, class_id')
        .eq('audience', 'all_classes')
        .eq('is_published', true)
        .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
        .or(`tuition_center_id.eq.${student.tuition_center_id},tuition_center_id.is.null`),
      student.class_id
        ? supabase.from('quizzes')
            .select('id, title, created_at, audience, class_id')
            .in('audience', ['class', 'class_subject'])
            .eq('class_id', student.class_id)
            .eq('is_published', true)
            .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
            .or(`tuition_center_id.eq.${student.tuition_center_id},tuition_center_id.is.null`)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('quiz_attempts').select('*').eq('student_id', student.id)
    ])

    const matchedIds = [...(allRes.data || []), ...(classRes.data || [])].map((q: any) => q.id)
    let quizzes: any[] = []
    if (matchedIds.length > 0) {
      const { data: finalData } = await supabase
        .from('quizzes')
        .select('*, subject:subjects(name), teacher:teachers(full_name)')
        .in('id', matchedIds)
        .order('created_at', { ascending: false })
      quizzes = finalData || []
    }

    const attempts = (aRes.data ?? []).reduce((acc: Record<string, any[]>, a: any) => {
      if (!acc[a.quiz_id]) acc[a.quiz_id] = []
      acc[a.quiz_id].push(a)
      return acc
    }, {})

    return { quizzes, attempts }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['student-quizzes', student?.id, student?.class_id],
    queryFn: fetchQuizzes,
    enabled: !!student?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const quizzes = data?.quizzes ?? []
  const attempts = data?.attempts ?? {}
  const loading = isLoading && !data

  const filtered = quizzes.filter(q => 
    q.title.toLowerCase().includes(search.toLowerCase()) || 
    q.subject?.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="space-y-1">
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Quiz Arena</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Test your knowledge and earn high scores for global rank!</p>
         </div>
         <div className="flex gap-4">
            <div className="px-6 py-2 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center">
               <span className="text-xl font-black text-primary">{Object.keys(attempts).length}</span>
               <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Challenges Done</span>
            </div>
            <div className="px-6 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center">
               <span className="text-xl font-black text-amber-600">
                  {Object.keys(attempts).length > 0 
                    ? Math.round(Object.values(attempts).reduce((acc, aArr: any[]) => {
                        const best = aArr.reduce((prev, curr) => (curr.percentage > prev.percentage ? curr : prev), aArr[0])
                        return acc + (best?.percentage || 0)
                      }, 0) / Object.keys(attempts).length)
                    : 0}%
               </span>
               <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Avg. Accuracy</span>
            </div>
         </div>
      </div>

      <div className="relative">
         <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
         <Input className="pl-12 py-6 rounded-3xl" placeholder="Search challenges..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <SkeletonList count={6} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((q, i) => {
              const quizAttempts = attempts[q.id] || []
              const bestAtt = quizAttempts.length > 0 ? quizAttempts.reduce((best: any, current: any) => current.percentage > best.percentage ? current : best, quizAttempts[0]) : null
              const isPassed = bestAtt && bestAtt.percentage >= (q.pass_mark_percentage || 70)
              
              const attemptCount = quizAttempts.length
              const canRetry = attemptCount < (q.max_attempts || 1)
              
              // Check retake delay
              let delayMsg = null
              if (attemptCount > 0 && attemptCount < (q.max_attempts || 1)) {
                 // Sort attempts by completed_at to get the latest one
                 const sortedAttempts = [...quizAttempts].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
                 const latestAttempt = sortedAttempts[0];

                 const delayMs = (q.retake_delay_minutes || 0) * 60 * 1000
                 const timeSince = Date.now() - new Date(latestAttempt.completed_at).getTime()
                 if (timeSince < delayMs) {
                    delayMsg = `Retake in ${Math.ceil((delayMs - timeSince) / (60 * 1000))}m`
                 }
              }

              return (
                <motion.div key={q.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                   <Card className="p-6 h-full flex flex-col group hover:shadow-2xl hover:shadow-primary/5 transition-all">
                      <div className="flex items-start justify-between mb-4">
                         <div className={`p-3 rounded-2xl ${isPassed ? 'bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10' : 'bg-primary/10 text-primary shadow-primary/10'} shadow-lg`}>
                            <BrainCircuit size={24} />
                         </div>
                         <div className="flex gap-1">
                            {isPassed && <Badge variant="success" className="text-[9px]">Mastered</Badge>}
                            {attemptCount > 0 && !isPassed && !canRetry && <Badge variant="danger" className="text-[9px]">Failed</Badge>}
                         </div>
                      </div>

                      <h3 className="font-black text-lg mb-1 leading-tight group-hover:text-primary transition-colors" style={{ color: 'var(--text)' }}>{q.title}</h3>
                      <p className="text-[10px] font-bold mb-6" style={{ color: 'var(--text-muted)' }}>{q.subject?.name} • by {q.teacher?.full_name}</p>

                      <div className="grid grid-cols-2 gap-2 mb-8">
                         <div className="flex items-center gap-2 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                            <Clock size={12} /> {q.time_limit}m Limit
                         </div>
                         <div className="flex items-center gap-2 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                            <Target size={12} /> {q.pass_mark_percentage || 70}% to Pass
                         </div>
                         <div className="flex items-center gap-2 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                            <Zap size={12} /> {attemptCount} / {q.max_attempts || 1} Used
                         </div>
                      </div>

                      <div className="mt-auto space-y-4 pt-4 border-t border-[var(--card-border)]">
                         {bestAtt ? (
                            <div className="flex items-center justify-between">
                               <div className="text-xs font-black" style={{ color: 'var(--text)' }}>Best: <span className={isPassed ? 'text-emerald-500' : 'text-rose-500'}>{bestAtt.percentage}%</span></div>
                               <Link href={`/student/quizzes/${q.id}/results`} className="text-[10px] font-bold text-primary hover:underline">View Intel</Link>
                            </div>
                         ) : (
                            <div className="flex items-center gap-2 text-[10px] font-black text-amber-500">
                               <Zap size={12} className="fill-amber-500" /> +{q.time_limit * 10} XP Possible
                            </div>
                         )}

                         {delayMsg ? (
                            <Button disabled className="w-full py-4 text-xs font-black rounded-2xl bg-[var(--input)] text-[var(--text-muted)] border border-[var(--card-border)] cursor-not-allowed">
                               {delayMsg}
                            </Button>
                         ) : (!isPassed && canRetry) || (!bestAtt) ? (
                            <Link href={`/student/quizzes/${q.id}/play`}>
                               <Button className="w-full py-4 text-xs font-black rounded-2xl shadow-xl shadow-primary/20" variant="primary">
                                  {bestAtt ? 'Retake Challenge' : 'Start Challenge'}
                                  <Play size={14} className="ml-2 fill-current" />
                               </Button>
                            </Link>
                         ) : (
                            <Link href={`/student/quizzes/${q.id}/results`}>
                               <Button className="w-full py-4 text-xs font-black rounded-2xl bg-[var(--input)] text-[var(--text)] border border-[var(--card-border)]" variant="secondary">
                                  Mastery Intel
                                  <ArrowRight size={14} className="ml-2" />
                               </Button>
                            </Link>
                         )}
                      </div>
                   </Card>
                </motion.div>
              )
            })}
        </div>
      )}
    </div>
  )
}
