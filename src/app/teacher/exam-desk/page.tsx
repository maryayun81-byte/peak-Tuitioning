'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Plus, Target, Users, Clock, Eye, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getExamsByTeacher } from '@/app/actions/exams'
import toast from 'react-hot-toast'

export default function TeacherExamDesk() {
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExams()
  }, [])

  const loadExams = async () => {
    try {
      const data = await getExamsByTeacher()
      setExams(data)
    } catch (e) {
      toast.error('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-6 md:p-8 rounded-3xl border border-indigo-500/20">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
              <FileText size={24} />
            </div>
            <h1 className="text-3xl font-black" style={{ color: 'var(--text)' }}>Exam Desk</h1>
          </div>
          <p className="text-sm font-bold text-muted ml-14">
            Create structured exams, monitor integrity, and mark scripts.
          </p>
        </div>
        <Link href="/teacher/exam-desk/create">
          <Button variant="primary" className="shadow-lg shadow-primary/20 bg-indigo-500 hover:bg-indigo-600">
            <Plus size={18} className="mr-2" />
            Create Exam
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam, i) => (
          <motion.div
            key={exam.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="h-full hover:border-indigo-500/50 transition-colors group cursor-pointer flex flex-col p-0 overflow-hidden relative">
              <div className="absolute top-4 right-4 flex gap-2">
                <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded-lg ${
                  exam.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--input)] text-muted'
                }`}>
                  {exam.status}
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-bold text-lg mb-1 group-hover:text-indigo-500 transition-colors pr-16">{exam.title}</h3>
                <p className="text-sm text-muted font-medium mb-4 flex-1 line-clamp-2">{exam.description || 'No description provided.'}</p>
                
                <div className="flex flex-wrap gap-3 mt-auto">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted bg-[var(--input)] px-2.5 py-1 rounded-lg">
                    <Clock size={12} /> {exam.duration_minutes}m
                  </div>
                  {exam.subject && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted bg-[var(--input)] px-2.5 py-1 rounded-lg">
                      <Target size={12} /> {exam.subject.name}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-[var(--card-border)] bg-[var(--bg)] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-muted">
                  <Users size={14} /> 0 Submissions
                </div>
                <Link href={`/teacher/exam-desk/manage/${exam.id}`}>
                  <Button variant="ghost" size="sm" className="text-indigo-500 hover:bg-indigo-500/10">
                    <Eye size={16} className="mr-2" />
                    Manage
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        ))}

        {exams.length === 0 && (
          <div className="col-span-full py-16 text-center bg-[var(--card)] rounded-3xl border border-[var(--card-border)] border-dashed">
            <FileText size={48} className="mx-auto text-muted mb-4 opacity-20" />
            <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>No Exams Yet</h3>
            <p className="text-sm font-bold text-muted mb-6">Create your first exam to test your students.</p>
            <Link href="/teacher/exam-desk/create">
              <Button variant="primary">Create Exam</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
