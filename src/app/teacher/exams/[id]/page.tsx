'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, BookOpen, Users, ChevronRight, 
  Search, CheckCircle2, AlertCircle
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'

export default function ExamDetailMarkingPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.id as string
  const supabase = getSupabaseBrowserClient()
  const { teacher } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [exam, setExam] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([]) // Teacher's class + subject assignments

  useEffect(() => {
    if (examId && teacher) loadData()
  }, [examId, teacher])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Load exam details
      const { data: ex } = await supabase.from('exam_events').select('*, tuition_event:tuition_events(*)').eq('id', examId).single()
      setExam(ex)

      // 2. Load teacher's assignments for the tuition event associated with this exam
      // This is the core logical link: Teacher marks subjects they are assigned to.
      if (ex?.tuition_event_id) {
        const { data: assigns } = await supabase
          .from('teacher_assignments')
          .select('*, class:classes(id, name), subject:subjects(id, name)')
          .eq('teacher_id', teacher!.id)
        
        setAssignments(assigns || [])
      }
    } catch (err) {
      console.error('Error loading exam focus:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6"><SkeletonList count={5} /></div>
  if (!exam) return <div className="p-20 text-center">Exam session not found.</div>

  return (
    <div className="p-6 space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/teacher/exams">
          <button className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-[var(--input)] transition-colors" style={{ border: '1px solid var(--card-border)' }}>
            <ArrowLeft size={20} />
          </button>
        </Link>
        <div>
           <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{exam.name}</h1>
           <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Select a class and subject to start recording marks.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.length > 0 ? assignments.map((assign, i) => (
          <motion.div key={assign.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={`/teacher/exams/${examId}/${assign.class_id}/${assign.subject_id}`}>
              <Card className="p-5 hover:border-primary transition-all cursor-pointer group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>
                    <BookOpen size={20} />
                  </div>
                  <Badge variant="muted">{assign.class?.name}</Badge>
                </div>
                <h3 className="font-bold group-hover:text-primary transition-colors">{assign.subject?.name}</h3>
                <div className="mt-4 pt-4 border-t border-[var(--card-border)] flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted">
                   <div className="flex items-center gap-2">
                     <Users size={12} /> View Students
                   </div>
                   <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          </motion.div>
        )) : (
          <Card className="p-8 text-center lg:col-span-3 border-dashed">
            <AlertCircle className="mx-auto mb-2 text-muted" />
            <p className="text-sm text-muted">You have no class assignments for this exam period.<br/>Contact the admin for access.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
