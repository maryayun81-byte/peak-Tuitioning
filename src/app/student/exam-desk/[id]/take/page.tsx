'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ExamRoom } from '@/components/student/ExamRoom'
import { getExamWithQuestions } from '@/app/actions/exams'
import toast from 'react-hot-toast'

export default function TakeExamPage() {
  const { id } = useParams()
  const [examData, setExamData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadExam()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadExam = async () => {
    try {
      const data = await getExamWithQuestions(id as string)
      setExamData(data)
    } catch (e) {
      toast.error('Failed to load exam')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[var(--bg)] p-8 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-rose-500 border-t-transparent animate-spin" /></div>
  if (!examData) return <div className="min-h-screen bg-[var(--bg)] p-8 flex items-center justify-center text-muted">Exam not found.</div>

  return <ExamRoom examData={examData} />
}
