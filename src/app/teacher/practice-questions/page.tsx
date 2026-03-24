'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { SkeletonList } from '@/components/ui/Skeleton'
import { BookOpen, Folders, HelpCircle, ArrowRight, LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Class } from '@/types/database'

interface ClassStat {
  class_id: string
  class_name: string
  subject_count: number
  topic_count: number
  question_count: number
}

export default function PracticeQuestionsDashboard() {
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()
  const [classStats, setClassStats] = useState<ClassStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClasses()
  }, [profile, teacher])

  const loadClasses = async () => {
    let currentTeacherId = teacher?.id
    if (!currentTeacherId && profile?.role === 'teacher') {
      const { data: tData } = await supabase.from('teachers').select('id').eq('user_id', profile.id).single()
      currentTeacherId = tData?.id
    }

    if (!currentTeacherId) return

    setLoading(true)
    try {
      // 1. Fetch assigned classes and subjects
      const { data: mapData, error: mapError } = await supabase
        .from('teacher_teaching_map')
        .select(`
          class_id,
          subject_id,
          classes (id, name),
          subjects (id, name, class_id)
        `)
        .eq('teacher_id', currentTeacherId)

      if (mapError) throw mapError

      // Unique classes aggregated reliably
      const classMap = new Map<string, Class>()
      ;(mapData || []).forEach(m => {
        if (!m.class_id) return
        if (!classMap.has(m.class_id)) {
           // Provide fallback name if joined object is missing
           let name = 'Unknown Class'
           const cObj = Array.isArray(m.classes) ? m.classes[0] : m.classes
           if (cObj && cObj.name) name = cObj.name

           classMap.set(m.class_id, {
             id: m.class_id,
             name: name,
           } as Class)
        }
      })
      const uniqueClasses = Array.from(classMap.values())

      const stats: ClassStat[] = []

      // For each class, calculate the stats
      for (const cls of uniqueClasses) {
        // Find subject IDs for this class assigned to this teacher
        const classSubjectIds = (mapData || [])
          .filter(m => m.class_id === cls.id && m.subject_id)
          .map(m => m.subject_id)

        // Count topics in those subjects
        let topicCount = 0
        let questionCount = 0

        if (classSubjectIds.length > 0) {
           const { data: topicData } = await supabase
              .from('topics')
              .select('id, practice_questions(id)')
              .in('subject_id', classSubjectIds)

           if (topicData) {
              topicCount = topicData.length
              questionCount = topicData.reduce((acc, topic) => acc + (topic.practice_questions?.length ?? 0), 0)
           }
        }

        stats.push({
          class_id: cls.id,
          class_name: cls.name,
          subject_count: classSubjectIds.length,
          topic_count: topicCount,
          question_count: questionCount,
        })
      }

      setClassStats(stats)
    } catch (err) {
      console.error('[PracticeQuestions] failed to load classes:', err)
      toast.error('Failed to load your assigned classes.')
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
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <LayoutGrid className="text-primary" /> Practice Collections
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage your high-quality structured content across your classes.
        </p>
      </div>

      {classStats.length === 0 ? (
         <div className="py-20 text-center rounded-3xl" style={{ border: '2px dashed var(--card-border)' }}>
            <Folders size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>No Classes Assigned</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>You must be assigned to at least one class to build practice questions.</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classStats.map((stat, idx) => (
            <Link key={stat.class_id} href={`/teacher/practice-questions/${stat.class_id}`}>
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
                   
                   {/* Decorative background element */}
                   <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 duration-500" 
                        style={{ background: 'var(--primary)' }} />

                   <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>
                           <Folders size={20} />
                        </div>
                        <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                      </div>

                      <h2 className="text-lg font-black tracking-tight mb-4" style={{ color: 'var(--text)' }}>
                         {stat.class_name}
                      </h2>

                      <div className="space-y-3">
                         <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-muted">
                               <BookOpen size={13} /> Subjects
                            </span>
                            <span className="font-black tabular-nums" style={{ color: 'var(--text)' }}>{stat.subject_count}</span>
                         </div>
                         <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-muted">
                               <LayoutGrid size={13} /> Topics
                            </span>
                            <span className="font-black tabular-nums" style={{ color: 'var(--text)' }}>{stat.topic_count}</span>
                         </div>
                         <div className="w-full h-px bg-[var(--card-border)]" />
                         <div className="flex items-center justify-between text-xs pt-1">
                            <span className="flex items-center gap-1.5 font-semibold text-primary uppercase tracking-wider">
                               <HelpCircle size={13} /> Total Questions
                            </span>
                            <span className="font-black tabular-nums text-primary">{stat.question_count}</span>
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
