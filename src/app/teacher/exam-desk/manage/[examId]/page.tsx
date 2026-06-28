'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { FileText, Users, Eye, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getExamWithQuestions, getExamSubmissions } from '@/app/actions/exams'
import toast from 'react-hot-toast'

export default function ManageExamPage() {
  const { examId } = useParams()
  const [exam, setExam] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (examId) loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId])

  const loadData = async () => {
    try {
      const [examData, subsData] = await Promise.all([
        getExamWithQuestions(examId as string),
        getExamSubmissions(examId as string)
      ])
      setExam(examData)
      setSubmissions(subsData)
    } catch (e) {
      toast.error('Failed to load exam data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
  if (!exam) return <div className="p-8 text-center">Exam not found</div>

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--card)] p-6 md:p-8 rounded-3xl border border-[var(--card-border)]">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black">{exam.title}</h1>
            <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded-lg ${
              exam.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--input)] text-muted'
            }`}>
              {exam.status}
            </span>
          </div>
          <p className="text-sm font-bold text-muted">
            {submissions.length} total submissions
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-black uppercase tracking-widest text-muted">Submissions</h3>
        <div className="bg-[var(--card)] rounded-3xl border border-[var(--card-border)] overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--input)] border-b border-[var(--card-border)]">
              <tr>
                <th className="p-4 font-bold text-muted">Student</th>
                <th className="p-4 font-bold text-muted">Status</th>
                <th className="p-4 font-bold text-muted">Integrity Flags</th>
                <th className="p-4 font-bold text-muted">Score</th>
                <th className="p-4 font-bold text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-[var(--input)] transition-colors group">
                  <td className="p-4 font-bold">
                    Student {sub.student.id.slice(0, 5).toUpperCase()}
                  </td>
                  <td className="p-4">
                    {sub.status === 'in_progress' && <span className="text-amber-500 bg-amber-500/10 px-2 py-1 rounded text-xs font-bold">In Progress</span>}
                    {sub.status === 'submitted' && <span className="text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded text-xs font-bold">Needs Marking</span>}
                    {sub.status === 'marked' && <span className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded text-xs font-bold">Marked</span>}
                  </td>
                  <td className="p-4">
                    {sub.integrity_logs?.length > 0 ? (
                      <span className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-1 rounded w-fit text-xs font-bold">
                        <AlertTriangle size={12} /> {sub.integrity_logs.length} flags
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-bold text-xs flex items-center gap-1">
                        <CheckCircle2 size={12} /> Clean
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-black">
                    {sub.status === 'marked' ? `${sub.total_score} / ${exam.questions.reduce((acc: number, q: any) => acc + Number(q.marks), 0)}` : '-'}
                  </td>
                  <td className="p-4 text-right">
                    {sub.status !== 'in_progress' && (
                      <Link href={`/teacher/exam-desk/mark/${sub.id}`}>
                        <Button variant="ghost" size="sm" className="text-indigo-500 hover:bg-indigo-500/10">
                          Mark Script <ChevronRight size={16} className="ml-1" />
                        </Button>
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted font-bold">
                    No submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
