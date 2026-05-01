'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, MessageSquare, AlertCircle, 
  TrendingUp, Clock, CheckCircle2,
  Users, ArrowRight, Sparkles, Send,
  ShieldAlert, Trophy, Target, ChevronDown,
  BarChart3, Heart
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { nudgeStudent, generateParentInsight } from '@/app/actions/teacher'
import toast from 'react-hot-toast'
import { GlitchToast } from '@/components/ui/GlitchToast'

interface Activity {
  id: string
  type: 'submission' | 'quiz' | 'badge' | 'trivia'
  student_name: string
  student_id: string
  title: string
  detail: string
  timestamp: string
  score?: number
}

interface StudentRisk {
  id: string
  name: string
  class_id: string
  risk_level: 'high' | 'medium' | 'low'
  reasons: string[]
  missing_assignments: number
  avg_score: number
  last_active: string | null
}

const PAGE_SIZE = 5

export function ClassPulse({ teacherId }: { teacherId: string }) {
  const supabase = getSupabaseBrowserClient()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchActivities = useCallback(async (isLoadMore = false) => {
    try {
      // 1. Get ONLY primary class where is_class_teacher = true
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select('class_id')
        .eq('teacher_id', teacherId)
        .eq('is_class_teacher', true)
      
      const classIds = Array.from(new Set(assignments?.map(a => a.class_id) || []))
      if (classIds.length === 0) {
        setLoading(false)
        return
      }

      const currentLimit = (isLoadMore ? page + 1 : 1) * PAGE_SIZE

      // Fetch recent events with !inner joins for filtering
      const [subs, quiz, badges] = await Promise.all([
        supabase.from('submissions').select('*, student:students(full_name), assignment:assignments!inner(title, class_id)').in('assignment.class_id', classIds).order('submitted_at', { ascending: false }).limit(currentLimit),
        supabase.from('quiz_attempts').select('*, student:students(full_name), quiz:quizzes!inner(title, class_id)').in('quiz.class_id', classIds).order('completed_at', { ascending: false }).limit(currentLimit),
        supabase.from('study_badges').select('*, student:students!inner(full_name, class_id)').in('student.class_id', classIds).order('created_at', { ascending: false }).limit(currentLimit)
      ])

      const combined: Activity[] = [
        ...(subs.data || []).map(s => ({
          id: s.id,
          type: 'submission' as const,
          student_name: (s.student as any)?.full_name || 'Unknown Student',
          student_id: s.student_id,
          title: 'Submitted Assignment',
          detail: (s.assignment as any)?.title || 'Unknown Assignment',
          timestamp: s.submitted_at,
          score: s.marks
        })),
        ...(quiz.data || []).map(q => ({
          id: q.id,
          type: 'quiz' as const,
          student_name: (q.student as any)?.full_name || 'Unknown Student',
          student_id: q.student_id,
          title: 'Completed Quiz',
          detail: `${(q.quiz as any)?.title || 'Unknown Quiz'} (${q.percentage}%)`,
          timestamp: q.completed_at,
          score: q.percentage
        })),
        ...(badges.data || []).map(b => ({
          id: b.id,
          type: 'badge' as const,
          student_name: (b.student as any)?.full_name || 'Unknown Student',
          student_id: b.student_id,
          title: 'Earned Badge',
          detail: b.badge_type.replace(/_/g, ' '),
          timestamp: b.created_at
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setActivities(combined.slice(0, currentLimit))
      setHasMore(combined.length >= currentLimit)
      if (isLoadMore) setPage(prev => prev + 1)
    } catch (e) {
      console.error('Pulse fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }, [teacherId, page, supabase])

  useEffect(() => {
    fetchActivities()

    // Realtime subscription
    const channel = supabase
      .channel('class_pulse')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, () => fetchActivities())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quiz_attempts' }, () => fetchActivities())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [teacherId]) // Only re-run if teacherId changes, not on page change to avoid infinite loops

  if (loading) return <div className="h-48 animate-pulse bg-white/5 rounded-2xl" />

  return (
    <>
      <GlitchToast 
        isVisible={!!errorMsg} 
        message={errorMsg || ''} 
        onClose={() => setErrorMsg(null)} 
      />
    <Card className="p-6 overflow-hidden border-2 border-primary/10 relative transition-colors duration-300" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles size={48} className="text-primary" />
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <h3 className="font-black text-sm uppercase tracking-widest" style={{ color: 'var(--text)' }}>Class Pulse • Live</h3>
        </div>
        <Badge variant="muted" className="text-[9px] font-black uppercase tracking-tighter border-primary/20 text-primary">
          Class Teacher View
        </Badge>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {activities.length === 0 ? (
             <div className="py-12 text-center opacity-30 italic text-sm">No activity in your primary class yet.</div>
          ) : activities.map((act) => (
            <motion.div
              key={act.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--input)] border border-[var(--card-border)] hover:border-primary/30 transition-all group"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
                act.type === 'submission' ? "bg-blue-500 text-white" : 
                act.type === 'quiz' ? "bg-purple-500 text-white" : "bg-amber-500 text-white"
              )}>
                {act.type === 'submission' ? <Target size={18} /> : 
                 act.type === 'quiz' ? <Trophy size={18} /> : <Zap size={18} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                   <p className="text-xs font-black" style={{ color: 'var(--text)' }}>
                     {act.student_name.split(' ')[0]} <span className="font-medium opacity-60">· {act.title}</span>
                   </p>
                   <span className="text-[9px] opacity-40 font-bold">{formatDate(act.timestamp, 'short')}</span>
                </div>
                <p className="text-[11px] mt-1 font-bold truncate opacity-80" style={{ color: 'var(--text-muted)' }}>
                  {act.detail}
                </p>
              </div>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <button 
                  onClick={async () => {
                     const res = await nudgeStudent(act.student_id, 'motivation')
                     if (res.success) toast.success(`Motivation sent to ${act.student_name.split(' ')[0]}!`)
                     else setErrorMsg(res.error || 'Failed to send motivation')
                  }}
                  className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                  title="Motivate Student"
                >
                  <Heart size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {hasMore && activities.length > 0 && (
           <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 mt-2"
            onClick={() => fetchActivities(true)}
           >
             Load More Activity <ChevronDown size={12} className="ml-1" />
           </Button>
        )}
      </div>
    </Card>
    </>
  )
}

export function ClassInterventionPanel({ teacherId }: { teacherId: string }) {
  const supabase = getSupabaseBrowserClient()
  const [atRiskStudents, setAtRiskStudents] = useState<StudentRisk[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const analyzeRisk = async () => {
      try {
        // 1. Get teacher's PRIMARY class
        const { data: assignments } = await supabase
          .from('teacher_assignments')
          .select('class_id')
          .eq('teacher_id', teacherId)
          .eq('is_class_teacher', true)

        const classIds = Array.from(new Set(assignments?.map(a => a.class_id) || []))
        if (classIds.length === 0) {
          setLoading(false)
          return
        }

        // 2. Fetch all students and their submissions/quizzes
        const [students, submissions, quizzes] = await Promise.all([
          supabase.from('students').select('id, full_name, class_id').in('class_id', classIds),
          supabase.from('submissions').select('student_id, status, marks').in('status', ['submitted', 'marked']),
          supabase.from('quiz_attempts').select('student_id, percentage')
        ])

        if (!students.data) {
          setLoading(false)
          return
        }

        // 3. Risk Calculation
        const riskList: StudentRisk[] = (students.data || []).map(s => {
          const studentSubs = submissions.data?.filter(sub => sub.student_id === s.id) || []
          const studentQuizzes = quizzes.data?.filter(q => q.student_id === s.id) || []
          
          const avgScore = [...studentSubs.map(s => s.marks), ...studentQuizzes.map(q => q.percentage)]
            .reduce((acc, val, _, arr) => acc + (val || 0) / arr.length, 0) || 0
          
          const reasons: string[] = []
          if (avgScore > 0 && avgScore < 60) reasons.push('Low performance')
          if (studentSubs.length === 0 && studentQuizzes.length === 0) reasons.push('Zero participation')
          
          let riskLevel: 'high' | 'medium' | 'low' = 'low'
          if (reasons.length >= 2 || (avgScore > 0 && avgScore < 50)) riskLevel = 'high'
          else if (reasons.length === 1 || (avgScore > 0 && avgScore < 70)) riskLevel = 'medium'

          return {
            id: s.id,
            name: s.full_name || 'Unknown Student',
            class_id: s.class_id,
            risk_level: riskLevel,
            reasons,
            missing_assignments: 0,
            avg_score: Math.round(avgScore),
            last_active: null
          }
        }).filter(r => r.risk_level !== 'low').sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 }
          return order[a.risk_level] - order[b.risk_level]
        })

        setAtRiskStudents(riskList)
      } catch (e) {
        console.error('Risk analysis failed:', e)
      } finally {
        setLoading(false)
      }
    }

    analyzeRisk()
  }, [teacherId])

  if (loading) return <div className="h-64 animate-pulse bg-white/5 rounded-2xl" />

  const displayedStudents = atRiskStudents.slice(0, limit)

  return (
    <>
      <GlitchToast 
        isVisible={!!errorMsg} 
        message={errorMsg || ''} 
        onClose={() => setErrorMsg(null)} 
      />
    <Card className="p-6 border-2 border-rose-500/10 relative overflow-hidden transition-colors duration-300" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <ShieldAlert size={48} className="text-rose-500" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <AlertCircle size={18} className="text-rose-500" />
           <h3 className="font-black text-sm uppercase tracking-widest" style={{ color: 'var(--text)' }}>Intervention Hub</h3>
        </div>
        <Badge variant="danger" className="text-[9px] font-black uppercase tracking-tighter">
          {atRiskStudents.length} Flagged
        </Badge>
      </div>

      <div className="space-y-4">
        {atRiskStudents.length === 0 ? (
          <div className="py-12 text-center space-y-3 opacity-50">
             <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
               <CheckCircle2 size={32} className="text-emerald-500" />
             </div>
             <p className="text-xs font-black uppercase tracking-widest">Class is Performing at Peak!</p>
          </div>
        ) : displayedStudents.map((s) => (
          <div key={s.id} className="p-5 rounded-3xl bg-[var(--input)] border border-rose-500/20 group hover:border-rose-500/40 transition-all">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <h4 className="font-black text-sm" style={{ color: 'var(--text)' }}>{s.name}</h4>
                   <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-0.5">
                     {s.risk_level} Attention
                   </p>
                </div>
                <div className="text-right">
                   <div className="text-lg font-black" style={{ color: s.avg_score < 50 ? '#EF4444' : '#F59E0B' }}>
                     {s.avg_score}%
                   </div>
                   <div className="text-[8px] font-black uppercase opacity-40">Performance</div>
                </div>
             </div>
             
             <div className="flex flex-wrap gap-1.5 mb-6">
                {s.reasons.map((r, i) => (
                  <span key={i} className="text-[9px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 font-bold border border-rose-500/10 uppercase tracking-tighter">
                    {r}
                  </span>
                ))}
             </div>

             <div className="grid grid-cols-3 gap-2">
                <Button 
                   size="sm" 
                   variant="secondary" 
                   className="text-[9px] h-9 gap-1.5 rounded-xl border border-white/5"
                   onClick={async () => {
                     const res = await nudgeStudent(s.id, 'motivation')
                     if (res.success) toast.success(`Motivation sent!`)
                     else setErrorMsg(res.error || 'Failed to send nudge')
                   }}
                >
                   <Heart size={12} className="text-rose-500" /> Nudge
                </Button>
                <Button 
                   size="sm" 
                   variant="secondary" 
                   className="text-[9px] h-9 gap-1.5 rounded-xl border border-white/5"
                   onClick={async () => {
                     const res = await nudgeStudent(s.id, 'assignment')
                     if (res.success) toast.success(`Reminder sent!`)
                     else toast.error(res.error || 'Failed to send reminder')
                   }}
                >
                   <Clock size={12} className="text-amber-500" /> Work
                </Button>
                <Button 
                   size="sm" 
                   className="text-[9px] h-9 gap-1.5 rounded-xl bg-primary text-white border-none"
                   onClick={async () => {
                     const res = await generateParentInsight(s.id)
                     if (res.success) toast.success(`Parent notified!`)
                     else toast.error(res.error || 'Failed to notify parent')
                   }}
                >
                   <BarChart3 size={12} /> Insight
                </Button>
             </div>
          </div>
        ))}
      </div>
      
      {atRiskStudents.length > limit && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-4 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100"
          onClick={() => setLimit(prev => prev + PAGE_SIZE)}
        >
          View More Flags <ChevronDown size={12} className="ml-1" />
        </Button>
      )}
    </Card>
    </>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
