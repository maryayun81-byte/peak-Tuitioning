'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { QuizForm } from '@/components/teacher/QuizForm'
import { SkeletonList } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'

export default function EditQuizPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [quizData, setQuizData] = useState<any>(null)

  useEffect(() => {
    if (id) loadQuiz()
  }, [id])

  const loadQuiz = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      setQuizData(data)
    } catch (err: any) {
      console.error('[Load Quiz Error]', err)
      toast.error('Could not load quiz details')
      router.push('/teacher/quizzes')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        <div className="h-8 w-64 bg-[var(--input)] rounded-lg animate-pulse" />
        <SkeletonList count={3} />
      </div>
    )
  }

  if (!quizData) return null

  return <QuizForm initialData={quizData} isEditing={true} />
}
