'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, ChevronLeft, Flag, FileText, Send, User } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { getSubmissionDetails, saveQuestionMarking, finalizeSubmission } from '@/app/actions/exams'
import { LatexRenderer } from '@/components/ui/LatexRenderer'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'

const AnnotationCanvas = dynamic(() => import('@/components/worksheet/AnnotationCanvas').then(m => m.AnnotationCanvas), { ssr: false })

export default function MarkSubmissionPage() {
  const { submissionId } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [marks, setMarks] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})

  useEffect(() => {
    if (submissionId) loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId])

  const loadData = async () => {
    try {
      const result = await getSubmissionDetails(submissionId as string)
      setData(result)

      const m: Record<string, number> = {}
      const c: Record<string, string> = {}
      result.answers.forEach((ans: any) => {
        m[ans.id] = ans.marks_awarded || 0
        c[ans.id] = ans.teacher_comments || ''
      })
      setMarks(m)
      setComments(c)
    } catch (e) {
      toast.error('Failed to load submission')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveQuestion = async (answerId: string, annotations?: any) => {
    try {
      await saveQuestionMarking(answerId, {
        marks_awarded: marks[answerId] || 0,
        teacher_comments: comments[answerId],
        teacher_annotations: annotations
      })
      toast.success('Saved')
    } catch (e) {
      toast.error('Failed to save marking')
    }
  }

  const handleFinalize = async () => {
    const totalScore = Object.values(marks).reduce((acc, v) => acc + (v || 0), 0)
    setSaving(true)
    try {
      // Save all first
      await Promise.all(data.answers.map((ans: any) => saveQuestionMarking(ans.id, {
        marks_awarded: marks[ans.id] || 0,
        teacher_comments: comments[ans.id],
        teacher_annotations: ans.teacher_annotations // keep existing
      })))

      await finalizeSubmission(submissionId as string, totalScore)
      toast.success('Exam Marked and Finalized!')
      router.push(`/teacher/exam-desk/manage/${data.submission.exam_id}`)
    } catch (e) {
      toast.error('Failed to finalize')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" /></div>
  if (!data) return <div className="p-8 text-center text-muted">Submission not found</div>

  const { submission, answers } = data
  const { exam, student, integrity_logs } = submission

  const totalPossible = answers.reduce((acc: number, ans: any) => acc + Number(ans.question.marks), 0)
  const currentTotal = Object.values(marks).reduce((acc, v) => acc + (v || 0), 0)

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)] text-[var(--text)] overflow-hidden">
      
      {/* Header */}
      <header className="h-16 border-b border-[var(--card-border)] bg-[var(--card)] shrink-0 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <Link href={`/teacher/exam-desk/manage/${exam.id}`}>
            <Button variant="ghost" size="sm" className="text-muted hover:text-[var(--text)]">
              <ChevronLeft size={16} /> Back
            </Button>
          </Link>
          <div className="h-4 w-px bg-[var(--card-border)]" />
          <h1 className="font-black text-lg">{exam.title}</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm font-bold text-muted">
            <User size={16} /> Student {student.id.slice(0,5).toUpperCase()}
          </div>
          <div className="h-4 w-px bg-[var(--card-border)]" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-muted">Total Score:</span>
            <span className="font-black text-indigo-500 text-lg bg-indigo-500/10 px-3 py-1 rounded-xl">
              {currentTotal} / {totalPossible}
            </span>
          </div>
          <Button variant="primary" onClick={handleFinalize} disabled={saving} className="bg-indigo-500 hover:bg-indigo-600">
            <CheckCircle2 size={16} className="mr-2" />
            Finalize Marks
          </Button>
        </div>
      </header>

      {/* Main Content (Scrollable list of questions) */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
        
        {integrity_logs?.length > 0 && (
          <div className="max-w-6xl mx-auto p-6 bg-red-500/10 border border-red-500/20 rounded-3xl">
            <h3 className="font-black text-red-500 flex items-center gap-2 mb-4">
              <Flag size={20} /> Integrity Report ({integrity_logs.length} flags)
            </h3>
            <ul className="space-y-2 text-sm font-bold text-red-500/80">
              {integrity_logs.map((log: any) => (
                <li key={log.id}>• {new Date(log.timestamp).toLocaleTimeString()} - {log.event_type.replace('_', ' ')}</li>
              ))}
            </ul>
          </div>
        )}

        {answers.map((ans: any, index: number) => {
          const q = ans.question
          const isCorrectMcq = q.question_type === 'mcq' && ans.student_answer?.selected === q.correct_answer

          return (
            <Card key={ans.id} className="max-w-6xl mx-auto border-t-4 border-t-indigo-500 flex flex-col md:flex-row overflow-hidden rounded-3xl">
              
              {/* Left Side: Question & Rubric */}
              <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-[var(--card-border)] bg-[var(--card)]/50">
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-indigo-500 text-white text-xs font-black px-3 py-1 rounded-lg shadow-lg shadow-indigo-500/20">
                    Q{index + 1}
                  </div>
                  <div className="text-sm font-bold text-muted bg-[var(--input)] px-3 py-1 rounded-lg">
                    {q.marks} marks
                  </div>
                </div>

                <div className="text-lg font-medium leading-relaxed mb-6">
                  <LatexRenderer text={q.content} />
                </div>

                <div className="p-4 bg-[var(--input)] rounded-2xl border border-[var(--card-border)]">
                  <p className="text-xs font-black uppercase tracking-widest text-muted mb-2">Mark Scheme / Correct Answer</p>
                  <p className="font-medium">
                    {q.question_type === 'mcq' && q.correct_answer ? <LatexRenderer text={q.correct_answer} /> : 
                     q.correct_answer ? q.correct_answer : 'Teacher review required.'}
                  </p>
                </div>

                <div className="mt-8 space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-widest text-muted">Award Marks</h4>
                  <div className="flex items-center gap-4">
                    <Input 
                      type="number"
                      value={marks[ans.id]}
                      onChange={(e) => setMarks(m => ({ ...m, [ans.id]: parseFloat(e.target.value) || 0 }))}
                      className="w-24 font-black text-lg text-indigo-500"
                      min={0} max={q.marks}
                    />
                    <span className="text-muted font-bold">/ {q.marks}</span>
                  </div>
                  
                  <Textarea 
                    placeholder="Feedback comments for the student..."
                    value={comments[ans.id]}
                    onChange={(e) => setComments(c => ({ ...c, [ans.id]: e.target.value }))}
                    rows={3}
                  />
                  <Button variant="secondary" size="sm" onClick={() => handleSaveQuestion(ans.id, ans.teacher_annotations)}>
                    Save Score
                  </Button>
                </div>
              </div>

              {/* Right Side: Student Answer */}
              <div className="flex-1 p-6 md:p-8 bg-[var(--bg)]">
                <h3 className="font-black text-sm uppercase tracking-widest text-muted mb-6 flex items-center gap-2">
                  Student Answer
                  {q.question_type === 'mcq' && (
                    <span className={`ml-auto px-2 py-0.5 rounded text-[10px] ${isCorrectMcq ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {isCorrectMcq ? 'Auto: Correct' : 'Auto: Incorrect'}
                    </span>
                  )}
                </h3>

                {q.question_type === 'mcq' || q.question_type === 'true_false' ? (
                  <div className={`p-4 rounded-2xl border-2 ${isCorrectMcq ? 'border-emerald-500 bg-emerald-500/5' : 'border-rose-500 bg-rose-500/5'}`}>
                    <LatexRenderer text={ans.student_answer?.selected || 'No answer selected'} />
                  </div>
                ) : (q.question_type === 'short_answer' || q.question_type === 'essay') ? (
                  <div className="p-6 bg-[var(--card)] rounded-3xl border border-[var(--card-border)] whitespace-pre-wrap text-lg">
                    {ans.student_answer?.text || 'No text provided'}
                  </div>
                ) : q.question_type === 'math_working' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-[var(--card)] rounded-2xl border border-[var(--card-border)] font-mono text-lg">
                      <span className="text-xs font-bold text-muted uppercase block mb-1">Final Answer Text:</span>
                      {ans.student_answer?.final_answer || 'No final answer typed'}
                    </div>

                    <Card className="p-1 overflow-hidden bg-[var(--card)] shadow-inner">
                      <div className="h-[500px] w-full relative">
                        {ans.student_answer?.canvas ? (
                          <AnnotationCanvas 
                            pageId={`mark-${ans.id}`}
                            initialData={ans.teacher_annotations || ans.student_answer.canvas}
                            onSave={(canvasData) => handleSaveQuestion(ans.id, canvasData)}
                            readOnly={false}
                          />
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted font-bold">
                            No working shown
                          </div>
                        )}
                        <div className="absolute top-4 left-4 pointer-events-none opacity-50 bg-[var(--card)] px-3 py-1.5 rounded-lg border border-[var(--card-border)] shadow-sm text-xs font-black uppercase tracking-widest text-muted z-10">
                          Teacher Annotation Mode
                        </div>
                      </div>
                    </Card>
                    <p className="text-xs text-muted font-bold text-center">You can draw directly on the student's working above.</p>
                  </div>
                ) : null}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
