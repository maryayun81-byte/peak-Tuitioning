'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ClipboardList, Calendar, ChevronRight, 
  Lock, CheckCircle2, AlertCircle, Clock
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, StatCard, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { ExamEvent } from '@/types/database'

export default function TeacherExamsPage() {
  const supabase = getSupabaseBrowserClient()
  const { profile, teacher } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState<ExamEvent[]>([])

  useEffect(() => {
    if (profile && teacher) loadExams()
  }, [profile, teacher])

  const loadExams = async () => {
    setLoading(true)
    try {
      // Fetch all exam events that are NOT in draft/published status (active or closed)
      // or specifically those relevant to the teacher's assignments
      const { data, error } = await supabase
        .from('exam_events')
        .select('*, tuition_event:tuition_events(name)')
        .order('start_date', { ascending: false })
      
      if (error) throw error
      setExams(data || [])
    } catch (err) {
      console.error('Error loading exams:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="p-6">
      <SkeletonList count={4} />
    </div>
  )

  const activeExams = exams.filter(e => e.status === 'active')
  const closedExams = exams.filter(e => e.status === 'closed' || e.status === 'generated' || e.status === 'published')

  return (
    <div className="p-6 space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <ClipboardList className="text-primary" /> Exam Marking
           </h1>
           <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Record marks and remarks for official exams.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeExams.length > 0 ? activeExams.map((exam, i) => (
          <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Link href={`/teacher/exams/${exam.id}`}>
              <Card className="p-5 h-full hover:scale-[1.02] transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(79,140,255,0.1)', color: '#4F8CFF' }}>
                    <Calendar size={24} />
                  </div>
                  <Badge variant="info">Active</Badge>
                </div>
                <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{exam.name}</h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  {exam.tuition_event?.name} · {formatDate(exam.start_date)} — {formatDate(exam.end_date)}
                </p>
                <div className="mt-auto pt-4 border-t border-[var(--card-border)] flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Open for marking</span>
                  <ChevronRight size={16} className="text-primary" />
                </div>
              </Card>
            </Link>
          </motion.div>
        )) : (
          <Card className="p-8 text-center lg:col-span-3">
             <div className="w-16 h-16 rounded-full bg-[var(--input)] flex items-center justify-center mx-auto mb-4">
               <Clock className="text-muted" size={32} />
             </div>
             <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No active exam sessions. You&apos;ll be notified when an exam period starts.</p>
          </Card>
        )}
      </div>

      {closedExams.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="font-bold text-sm tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Past / Closed Exams</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {closedExams.map(exam => (
              <Card key={exam.id} className="p-4 opacity-75">
                <div className="flex justify-between items-center mb-3">
                  <Badge variant={exam.status === 'published' ? 'success' : 'muted'}>
                    {exam.status === 'published' ? 'Published' : 'Read Only'}
                  </Badge>
                  <Lock size={12} className="text-muted" />
                </div>
                <h4 className="font-bold text-sm truncate">{exam.name}</h4>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{formatDate(exam.start_date)} — {formatDate(exam.end_date)}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
