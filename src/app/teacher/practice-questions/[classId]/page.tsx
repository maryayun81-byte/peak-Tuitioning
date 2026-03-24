'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { SkeletonList } from '@/components/ui/Skeleton'
import { BookOpen, HelpCircle, ArrowRight, ArrowLeft, LayoutGrid, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface SubjectStat {
  subject_id: string
  subject_name: string
  topic_count: number
  question_count: number
}

interface PageProps {
  params: { classId: string }
}

export default function PracticeQuestionsSubjectsPage({ params }: PageProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([])
  const [className, setClassName] = useState('Loading...')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSubjects()
  }, [profile, teacher, params.classId])

  const loadSubjects = async () => {
    let currentTeacherId = teacher?.id
    if (!currentTeacherId && profile?.role === 'teacher') {
      const { data: tData } = await supabase.from('teachers').select('id').eq('user_id', profile.id).single()
      currentTeacherId = tData?.id
    }

    if (!currentTeacherId) return

    setLoading(true)
    try {
      // Get class name
      const { data: classData } = await supabase.from('classes').select('name').eq('id', params.classId).single()
      if (classData) setClassName(classData.name)

      // Fetch assigned subjects for this class
      const { data: mapData, error: mapError } = await supabase
        .from('teacher_teaching_map')
        .select(`
          subject_id,
          subjects (id, name)
        `)
        .eq('teacher_id', currentTeacherId)
        .eq('class_id', params.classId)

      if (mapError) throw mapError

      const assignedSubjectIds = (mapData || [])
         .filter(m => m.subject_id)
         .map(m => m.subject_id)

      if (assignedSubjectIds.length === 0) {
         setSubjectStats([])
         setLoading(false)
         return
      }

      // Unique subjects
      const uniqueSubjects = Array.from(new Set((mapData || [])
          .map(m => {
            const s = m.subjects
            return JSON.stringify(Array.isArray(s) ? s[0] : s)
          })))
          .filter(s => s && s !== 'null' && s !== 'undefined')
          .map(s => JSON.parse(s as string))

      // Fetch topics and questions to get counts
      const { data: topicData } = await supabase
        .from('topics')
        .select('id, subject_id, practice_questions(id)')
        .in('subject_id', assignedSubjectIds)

      const stats: SubjectStat[] = uniqueSubjects.map(sub => {
         const topicsForSubject = (topicData || []).filter(t => t.subject_id === sub.id)
         const qCount = topicsForSubject.reduce((acc, t) => acc + (t.practice_questions?.length ?? 0), 0)

         return {
            subject_id: sub.id,
            subject_name: sub.name,
            topic_count: topicsForSubject.length,
            question_count: qCount
         }
      })

      setSubjectStats(stats)
    } catch (err: any) {
      console.error('[PracticeQuestions] failed to load subjects:', err)
      toast.error('Failed to load your assigned subjects: ' + (err.message || String(err)))
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="p-6 space-y-6">
      <SkeletonList count={4} />
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
           onClick={() => router.push('/teacher/practice-questions')}
           className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:scale-105" 
           style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
           <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
            {className} Subjects
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Select a subject to view its topics.
          </p>
        </div>
      </div>

      {subjectStats.length === 0 ? (
         <div className="py-20 text-center rounded-3xl" style={{ border: '2px dashed var(--card-border)' }}>
            <AlertCircle size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>No Subjects Found</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>You don't have any subjects assigned for this class.</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectStats.map((stat, idx) => (
            <Link key={stat.subject_id} href={`/teacher/practice-questions/${params.classId}/${stat.subject_id}`}>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="p-5 h-full transition-all hover:-translate-y-1 hover:shadow-xl group relative overflow-hidden" 
                      style={{ 
                         background: 'var(--card)', 
                         border: '1px solid var(--card-border)',
                         boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                      }}>
                   
                   <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-[0.05] transition-transform group-hover:scale-150 duration-500" 
                        style={{ background: '#3B82F6' }} />

                   <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
                           <BookOpen size={20} />
                        </div>
                        <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                      </div>

                      <h2 className="text-lg font-black tracking-tight mb-4" style={{ color: 'var(--text)' }}>
                         {stat.subject_name}
                      </h2>

                      <div className="space-y-3">
                         <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-muted">
                               <LayoutGrid size={13} /> Topics
                            </span>
                            <span className="font-black tabular-nums" style={{ color: 'var(--text)' }}>{stat.topic_count}</span>
                         </div>
                         <div className="w-full h-px bg-[var(--card-border)]" />
                         <div className="flex items-center justify-between text-xs pt-1">
                            <span className="flex items-center gap-1.5 font-semibold text-blue-500 uppercase tracking-wider">
                               <HelpCircle size={13} /> Questions
                            </span>
                            <span className="font-black tabular-nums text-blue-500">{stat.question_count}</span>
                         </div>
                      </div>
                   </div>
                </Card>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
