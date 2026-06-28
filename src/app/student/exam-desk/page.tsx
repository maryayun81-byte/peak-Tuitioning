'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Target, Clock, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getStudentExams } from '@/app/actions/exams'
import toast from 'react-hot-toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

export default function StudentExamDesk() {
  const [exams, setExams] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()

  useEffect(() => {
    if (student?.id) {
      loadData()
    }
  }, [student?.id])

  const loadData = async () => {
    try {
      const examsData = await getStudentExams()
      setExams(examsData)

      // Fetch my submissions
      const { data: subs } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('student_id', student!.id)

      if (subs) {
        const subMap = subs.reduce((acc, sub) => ({ ...acc, [sub.exam_id]: sub }), {})
        setSubmissions(subMap)
      }
    } catch (e) {
      toast.error('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 pb-32">
      <div className="bg-gradient-to-r from-rose-500/10 to-orange-500/10 p-6 md:p-8 rounded-3xl border border-rose-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/30">
              <FileText size={24} />
            </div>
            <h1 className="text-3xl font-black" style={{ color: 'var(--text)' }}>Exam Desk</h1>
          </div>
          <p className="text-sm font-bold text-muted ml-14">
            Take official exams set by your teachers in a secure environment.
          </p>
        </div>
        <Link href="/student/ai-exams">
          <Button variant="ghost" className="text-rose-500 hover:bg-rose-500/10">
            Go to AI Practice Exams <ChevronRight size={16} className="ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exams.map((exam, i) => {
          const sub = submissions[exam.id]
          
          return (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full hover:border-rose-500/50 transition-colors group p-6 flex flex-col relative overflow-hidden">
                {sub?.status === 'submitted' && (
                  <div className="absolute top-4 right-4 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest flex items-center gap-1">
                    <CheckCircle2 size={12} /> Submitted
                  </div>
                )}
                {sub?.status === 'in_progress' && (
                  <div className="absolute top-4 right-4 text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest flex items-center gap-1">
                    <Clock size={12} /> In Progress
                  </div>
                )}

                <h3 className="font-bold text-lg mb-2 group-hover:text-rose-500 transition-colors pr-24">{exam.title}</h3>
                <p className="text-sm text-muted font-medium mb-6 flex-1 line-clamp-2">{exam.description || 'No instructions provided.'}</p>
                
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted bg-[var(--input)] px-2.5 py-1 rounded-lg">
                    <Clock size={12} /> {exam.duration_minutes} mins
                  </div>
                  {exam.subject && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted bg-[var(--input)] px-2.5 py-1 rounded-lg">
                      <Target size={12} /> {exam.subject.name}
                    </div>
                  )}
                </div>

                {!sub ? (
                  <Link href={`/student/exam-desk/${exam.id}/take`}>
                    <Button variant="primary" className="w-full bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20">
                      Start Exam <ChevronRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                ) : sub.status === 'in_progress' ? (
                  <Link href={`/student/exam-desk/${exam.id}/take`}>
                    <Button variant="secondary" className="w-full">
                      Resume Exam <ChevronRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="ghost" disabled className="w-full bg-[var(--input)] text-muted">
                    Waiting for Results
                  </Button>
                )}
              </Card>
            </motion.div>
          )
        })}

        {exams.length === 0 && (
          <div className="col-span-full py-16 text-center bg-[var(--card)] rounded-3xl border border-[var(--card-border)] border-dashed">
            <FileText size={48} className="mx-auto text-muted mb-4 opacity-20" />
            <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>No Exams Available</h3>
            <p className="text-sm font-bold text-muted">Check back later when your teachers publish new exams.</p>
          </div>
        )}
      </div>
    </div>
  )
}
