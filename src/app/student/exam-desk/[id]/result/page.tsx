'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Printer, CheckCircle2, Clock } from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LatexRenderer } from '@/components/ui/LatexRenderer'
import { SchoolLogo } from '@/components/exam/SchoolLogo'
import { getStudentExamResult } from '@/app/actions/exams'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'

const AnnotationCanvas = dynamic(
  () => import('@/components/worksheet/AnnotationCanvas').then(m => m.AnnotationCanvas),
  { ssr: false }
)

function renderStudentAnswer(ans: any) {
  const q = ans.question
  const sa = ans.student_answer || {}
  if (q.question_type === 'mcq' || q.question_type === 'true_false') {
    return <p className="font-bold text-lg"><LatexRenderer text={sa.selected || 'No answer given'} /></p>
  }
  if (q.question_type === 'essay') {
    return sa.html
      ? <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sa.html }} />
      : <p className="text-muted">No answer given.</p>
  }
  if (q.question_type === 'math_working') {
    return (
      <div className="space-y-3">
        {sa.final_answer && (
          <p className="font-mono text-lg bg-[var(--input)] rounded-xl px-4 py-2">Final: {sa.final_answer}</p>
        )}
        {sa.canvas ? (
          <div className="h-[380px] rounded-2xl overflow-hidden border border-[var(--card-border)] print:h-[500px]">
            <AnnotationCanvas
              pageId={`result-${ans.id}`}
              initialData={ans.teacher_annotations || sa.canvas}
              onSave={() => {}}
              readOnly
            />
          </div>
        ) : (
          <p className="text-muted">No working shown.</p>
        )}
      </div>
    )
  }
  return <p className="whitespace-pre-wrap text-lg">{sa.text || 'No answer given.'}</p>
}

export default function StudentExamResultPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      getStudentExamResult(id as string)
        .then(setData)
        .catch(() => toast.error('Failed to load result'))
        .finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return <div className="min-h-screen p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-rose-500 border-t-transparent animate-spin" /></div>
  }
  if (!data?.submission) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center space-y-3">
          <p className="font-black">No attempt found</p>
          <Button onClick={() => router.push('/student/exam-desk')}>Back to Exam Desk</Button>
        </Card>
      </div>
    )
  }

  const { exam, student, submission, answers } = data
  const totalPossible = answers.reduce((s: number, a: any) => s + Number(a.question?.marks || 0), 0)
  const awarded = answers.reduce((s: number, a: any) => s + (Number(a.marks_awarded) || 0), 0)
  const marked = ['marked', 'published'].includes(submission.status)
  const pct = totalPossible > 0 ? Math.round((awarded / totalPossible) * 100) : 0

  const handlePrint = () => window.print()

  const handleDownloadHtml = () => {
    const rows = answers.map((a: any, i: number) => {
      const q = a.question || {}
      const sa = a.student_answer || {}
      const text = (sa.selected || sa.text || sa.final_answer || '').toString().replace(/</g, '&lt;')
      return `<h3>Q${i + 1} — ${q.marks || 0} marks (awarded: ${a.marks_awarded ?? '—'})</h3><p><b>Q:</b> ${(q.content || '').replace(/</g, '&lt;')}</p><p><b>Answer:</b> ${text}</p><p><b>Feedback:</b> ${(a.teacher_comments || '—').replace(/</g, '&lt;')}</p><hr/>`
    }).join('')
    const html = `<html><head><title>${exam.title} — marked paper</title></head><body><h1>${exam.title}</h1><p>${student?.full_name || ''} — ${awarded}/${totalPossible} (${pct}%)</p>${rows}</body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `marked-paper-${exam.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.html`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/student/exam-desk" className="text-xs font-bold flex items-center gap-1 print:hidden" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Exam Desk
        </Link>

        {/* Score header */}
        <div className="text-center border-b-2 border-[var(--card-border)] pb-5">
          <div className="flex justify-center mb-3"><SchoolLogo size={52} /></div>
          <p className="text-[10px] font-black tracking-[0.3em] text-muted">PEAK CAMPUS — MARKED PAPER</p>
          <h1 className="text-2xl font-black mt-1">{exam.title}</h1>
          <p className="text-sm text-muted mt-1">
            {student?.full_name}
            {(student as any)?.class ? ` · ${(Array.isArray((student as any).class) ? (student as any).class[0] : (student as any).class)?.name || ''}` : ''}
            {(student as any)?.admission_number ? ` · Adm: ${(student as any).admission_number}` : ''}
            {' · '}{exam.subject?.name}
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            {marked ? (
              <span className="font-black text-2xl text-emerald-500 bg-emerald-500/10 px-5 py-2 rounded-2xl">
                {awarded} / {totalPossible} · {pct}%
              </span>
            ) : (
              <Badge variant="warning" className="text-xs px-4 py-2">
                <Clock size={12} className="mr-1 inline" /> Submitted — awaiting marking
              </Badge>
            )}
          </div>
          {(submission.auto_score != null || submission.manual_score != null) && (
            <p className="text-xs text-muted mt-2">
              Auto: {submission.auto_score ?? '—'} · Teacher: {submission.manual_score ?? '—'}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="secondary" onClick={handlePrint} disabled={!marked}>
            <Printer size={15} className="mr-2" /> Print / Save as PDF
          </Button>
          <Button variant="secondary" onClick={handleDownloadHtml} disabled={!marked}>
            <Download size={15} className="mr-2" /> Download paper
          </Button>
          {!marked && <p className="text-xs text-muted self-center">Marked paper unlocks once your teacher finalizes marking.</p>}
        </div>

        {/* Per-question marked view */}
        {answers.map((ans: any, i: number) => {
          const q = ans.question || {}
          return (
            <Card key={ans.id} className="p-6 space-y-4 break-inside-avoid">
              <div className="flex items-center justify-between">
                <span className="font-black">Q{i + 1}{q.question_number ? ` (${q.question_number})` : ''}</span>
                <span className={`text-sm font-black px-3 py-1 rounded-xl ${marked ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--input)] text-muted'}`}>
                  {marked ? `${ans.marks_awarded ?? 0} / ${q.marks ?? 0}` : `${q.marks ?? 0} marks`}
                </span>
              </div>
              {q.section_title && <p className="text-[10px] font-black uppercase tracking-widest text-muted">{q.section_title}</p>}
              <div className="text-base font-medium"><LatexRenderer text={q.content || ''} /></div>
              <div className="p-4 rounded-2xl bg-[var(--input)]">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Your answer</p>
                {renderStudentAnswer(ans)}
              </div>
              {marked && ans.teacher_comments && (
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Teacher feedback</p>
                  <p className="text-sm">{ans.teacher_comments}</p>
                </div>
              )}
              {marked && q.correct_answer && (
                <details className="text-sm">
                  <summary className="font-bold cursor-pointer text-muted">Model answer{Array.isArray(q.marking_rubric) && q.marking_rubric.length > 0 ? ' & marking guide' : ''}</summary>
                  <p className="mt-1"><LatexRenderer text={typeof q.correct_answer === 'string' ? q.correct_answer : JSON.stringify(q.correct_answer)} /></p>
                  {Array.isArray(q.marking_rubric) && q.marking_rubric.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {q.marking_rubric.map((r: any, ri: number) => (
                        <li key={ri} className="flex items-start gap-2 text-sm">
                          <span className="font-black text-xs">[{r.type || '•'} +{r.marks}]</span>
                          <span>{r.step}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              )}
            </Card>
          )
        })}

        {marked && (
          <p className="text-center text-xs text-muted print:hidden flex items-center justify-center gap-1">
            <CheckCircle2 size={12} /> Marked by your teacher — annotations in red are theirs.
          </p>
        )}
      </div>

      <style>{`@media print { a, button { display: none !important; } .break-inside-avoid { break-inside: avoid; } }`}</style>
    </div>
  )
}
