'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Check, Send, MessageSquare, Star,
  ChevronLeft, ChevronRight, User, BookOpen, CheckCircle2, 
  BarChart3, Users, AlertCircle, Clock
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, Badge } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/stores/authStore'
import { QuestionRenderer } from '@/components/worksheet/QuestionRenderer'
import { AnnotationCanvas } from '@/components/worksheet/AnnotationCanvas'
import { renderPdfToImages } from '@/lib/pdf-renderer'
import toast from 'react-hot-toast'
import type { WorksheetBlock, WorksheetAnswers } from '@/types/database'
import Link from 'next/link'
import { useAutoSave } from '@/hooks/useAutoSave'

export default function WorksheetGraderPage() {
  const params = useParams()
  const router = useRouter()
  const submissionId = params.id as string
  const supabase = getSupabaseBrowserClient()
  const { profile } = useAuthStore()

  const [submission, setSubmission] = useState<any>(null)
  const [assignment, setAssignment] = useState<any>(null)
  const [blocks, setBlocks] = useState<WorksheetBlock[]>([])
  const [answers, setAnswers] = useState<WorksheetAnswers>({})
  const [questionMarks, setQuestionMarks] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState('')
  const [annotations, setAnnotations] = useState<Record<string, string>>({}) // Map of blockId -> fabric json
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [returning, setReturning] = useState(false)
  const [confirmReturn, setConfirmReturn] = useState(false)
  const [renderingPdf, setRenderingPdf] = useState(false)
  const [activeTab, setActiveTab] = useState<'marking' | 'progress'>('marking')
  const [classStatus, setClassStatus] = useState<any[]>([])
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [pageImages, setPageImages] = useState<string[]>([])

  useEffect(() => { loadSubmission() }, [submissionId])

  const loadSubmission = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const { data: sub, error: subErr } = await supabase
        .from('submissions')
        .select('*, student:students(id, user_id, full_name, admission_number, class:classes(name)), assignment:assignments(*)')
        .eq('id', submissionId)
        .single()

      if (subErr || !sub) { 
        toast.error('Submission not found')
        setLoadError(true)
        setLoading(false)
        return 
      }
    setSubmission(sub)
    setFeedback(sub.feedback ?? '')
    setAnswers(sub.worksheet_answers ?? {})
    
    // Parse annotations map
    let savedAnnotations = {}
    try {
       savedAnnotations = typeof sub.annotations === 'string' ? JSON.parse(sub.annotations) : (sub.annotations ?? {})
    } catch { savedAnnotations = {} }
    setAnnotations(savedAnnotations)

    const a = sub.assignment
    setAssignment(a)
    const ws: WorksheetBlock[] = a?.worksheet ?? []
    setBlocks(ws)

    // Load Class Progress Data
    let studentsQuery = supabase.from('students')
      .select('id, full_name, admission_number')
      .eq('tuition_center_id', a.tuition_center_id)

    if (a.audience === 'selected_students' && a.selected_student_ids?.length > 0) {
      studentsQuery = studentsQuery.in('id', a.selected_student_ids)
    } else {
      studentsQuery = studentsQuery.eq('class_id', a.class_id)
    }

    const [studentsRes, subsRes] = await Promise.all([
      studentsQuery,
      supabase.from('submissions')
        .select('id, student_id, status, marks')
        .eq('assignment_id', a.id)
    ])

    const students = studentsRes.data ?? []
    const allSubs = subsRes.data ?? []

    const statusMap = students.map(st => {
      const sub = allSubs.find(s => s.student_id === st.id)
      return {
        ...st,
        submissionId: sub?.id,
        status: sub?.status || 'missing',
        marks: sub?.marks
      }
    }).sort((a, b) => a.full_name.localeCompare(b.full_name))
    
    setClassStatus(statusMap)

// ... existing mark initialization ...
    const saved = sub.question_marks ?? {}
    const initMarks: Record<string, number> = {}
    ws.forEach((b: WorksheetBlock) => {
      if (b.type === 'section_header' || b.type === 'reading_passage') return
      if (saved[b.id] !== undefined) {
        initMarks[b.id] = saved[b.id]
      } else if (b.type === 'mcq' || b.type === 'true_false') {
        initMarks[b.id] = sub.worksheet_answers?.[b.id] === b.correct_answer ? b.marks : 0
      } else if (b.type === 'multi_select') {
        const correct = JSON.stringify([...(b.correct_answers ?? [])].sort())
        const given = JSON.stringify([...(Array.isArray(sub.worksheet_answers?.[b.id]) ? sub.worksheet_answers[b.id] as string[] : [])].sort())
        initMarks[b.id] = correct === given ? b.marks : 0
      } else {
        initMarks[b.id] = 0
      }
    })
    setQuestionMarks(initMarks)

    const first = ws.find((b: WorksheetBlock) => b.type !== 'section_header' && b.type !== 'reading_passage')
    if (first) setActiveBlockId(first.id)

    // Multi-page PDF logic
    if (a.attachment_url?.toLowerCase().endsWith('.pdf')) {
       setRenderingPdf(true)
       try {
          const imgs = await renderPdfToImages(a.attachment_url)
          setPageImages(imgs)
       } catch (err: any) {
          console.error('[Grader] PDF render error:', err)
          toast.error(`Rendering failed: ${err.message || 'Unknown error'}. Try refreshing or check the browser console.`)
          setPageImages([a.attachment_url]) // Fallback
       } finally {
          setRenderingPdf(false)
       }
    } else if (a.attachment_url) {
       setPageImages([a.attachment_url])
    }

    } catch (err: any) {
      console.error('[Marking] Load error:', err)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  // Auto-save marking progress
  const markingData = useMemo(() => ({
    feedback,
    questionMarks,
    annotations
  }), [feedback, questionMarks, annotations])

  const { hasSavedDraft, restore, clear } = useAutoSave(`marking_${submissionId}`, markingData, (saved) => {
    setFeedback(saved.feedback)
    setQuestionMarks(saved.questionMarks)
    setAnnotations(saved.annotations)
    toast.success('Marking draft restored!')
  })

  const questionBlocks = blocks.filter(b => b.type !== 'section_header' && b.type !== 'reading_passage')
  const totalMarks = assignment?.total_marks ?? questionBlocks.reduce((s, b) => s + b.marks, 0)
  const awardedMarks = Object.values(questionMarks).reduce((s, v) => s + (v || 0), 0)

  const saveProgress = async () => {
    setSaving(true)
    const { error } = await supabase.from('submissions').update({
      question_marks: questionMarks,
      marks: awardedMarks,
      feedback,
      annotations: annotations,
      status: 'marked',
    }).eq('id', submissionId)
    if (error) toast.error('Save failed: ' + error.message)
    else {
      toast.success('Progress saved!')
      clear() // Clear draft on manual save
    }
    setSaving(false)
  }

  const returnSubmission = async () => {
    setReturning(true)
    setConfirmReturn(false)
    const { error } = await supabase.from('submissions').update({
      question_marks: questionMarks,
      marks: awardedMarks,
      feedback,
      annotations: annotations,
      status: 'returned',
      returned_at: new Date().toISOString(),
    }).eq('id', submissionId)

    if (!error) {
      const isHighPerf = (awardedMarks / totalMarks) >= 0.8
      let xpAwarded = isHighPerf ? 50 : 10
      
      const { data: st } = await supabase.from('students').select('xp').eq('id', submission.student_id).single()
      await supabase.from('students').update({ xp: (st?.xp || 0) + xpAwarded }).eq('id', submission.student_id)

      await supabase.from('notifications').insert({
        user_id: submission?.student?.user_id ?? null,
        type: 'assignment_returned',
        title: isHighPerf ? 'Mastery Achievement! +50 XP' : 'Assignment Returned (+10 XP)',
        body: isHighPerf 
          ? `Incredible work! You scored ${Math.round((awardedMarks/totalMarks)*100)}% on "${assignment?.title}".`
          : `Your worksheet "${assignment?.title}" has been marked. Score: ${awardedMarks}/${totalMarks}`,
        related_id: assignment?.id,
        data: { xp: xpAwarded, marks: awardedMarks, total: totalMarks, mastery: isHighPerf }
      })
      
      toast.success(isHighPerf ? '✅ Returned with Mastery Bonus!' : '✅ Submission returned to student!')
      router.push('/teacher/marking')
    } else {
      toast.error('Return failed: ' + error.message)
    }
    setReturning(false)
  }

  const activeBlock = blocks.find(b => b.id === activeBlockId)
  const activeIndex = questionBlocks.findIndex(b => b.id === activeBlockId)
  const navQuestion = (dir: number) => {
    const next = questionBlocks[activeIndex + dir]
    if (next) setActiveBlockId(next.id)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--primary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading submission…</p>
      </div>
    </div>
  )

  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="text-center space-y-5 max-w-sm">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 flex items-center justify-center mx-auto">
          <AlertCircle size={32} className="text-rose-500" />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase italic" style={{ color: 'var(--text)' }}>Failed to Load</h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Could not load this submission. Please check your connection.</p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={() => router.back()}><ArrowLeft size={16} /> Back</Button>
          <Button onClick={() => loadSubmission()}>Try Again</Button>
        </div>
      </div>
    </div>
  )

  const isDocumentAssignment = !!assignment?.attachment_url
  // Critical: workbook assignments have no attachment_url but ARE handled
  // with the canvas-based annotation view (student submits a photo of their book)
  const isWorkbook = !!assignment?.is_workbook
  const useCanvasMarkingView = isDocumentAssignment || isWorkbook

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 py-3" style={{ background: 'var(--card)', borderBottom: '1px solid var(--card-border)' }}>
        <Link href={assignment?.id ? `/teacher/assignments/${assignment.id}/progress` : '/teacher/marking'}>
          <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
            <ArrowLeft size={16} />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm truncate" style={{ color: 'var(--text)' }}>{assignment?.title}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {submission?.student?.full_name} · {submission?.student?.class?.name}
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-xl" style={{ background: 'var(--primary-dim)' }}>
          <span className="text-lg font-black" style={{ color: 'var(--primary)' }}>{awardedMarks}</span>
          <span className="text-sm text-gray-400">/{totalMarks}</span>
        </div>
        <Button size="sm" variant="secondary" onClick={saveProgress} isLoading={saving}>
          <Check size={14} /> Save
        </Button>
        <Button size="sm" onClick={() => setConfirmReturn(true)}>
          <Send size={14} /> Return
        </Button>
      </div>

      {/* Auto-save draft recovery */}
      <AnimatePresence>
        {hasSavedDraft && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-primary/10 border-b border-primary/20">
            <div className="px-6 py-2 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Unsaved marking progress found
              </div>
              <div className="flex gap-4">
                <button onClick={clear} className="text-[10px] font-bold text-muted transition-colors hover:text-rose-500">Discard</button>
                <button onClick={restore} className="text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:scale-105">Restore Progress</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex border-b border-[var(--card-border)] bg-[var(--card)] px-4 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('marking')}
          className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'marking' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
        >
          Marking View
        </button>
        <button 
          onClick={() => setActiveTab('progress')}
          className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'progress' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
        >
          Class Progress ({classStatus.filter(s => s.status !== 'missing').length}/{classStatus.length})
        </button>
      </div>

      {/* Body */}
      {activeTab === 'progress' ? (
          /* CLASS PROGRESS VIEW */
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
             <div className="max-w-5xl mx-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <Card className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                         <CheckCircle2 size={20} />
                      </div>
                      <div>
                         <div className="text-lg font-black">{classStatus.filter(s => s.status === 'marked' || s.status === 'returned').length}</div>
                         <div className="text-[10px] uppercase font-bold text-muted">Graded</div>
                      </div>
                   </Card>
                   <Card className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                         <Clock size={20} />
                      </div>
                      <div>
                         <div className="text-lg font-black">{classStatus.filter(s => s.status === 'submitted').length}</div>
                         <div className="text-[10px] uppercase font-bold text-muted">Pending</div>
                      </div>
                   </Card>
                   <Card className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                         <AlertCircle size={20} />
                      </div>
                      <div>
                         <div className="text-lg font-black">{classStatus.filter(s => s.status === 'missing').length}</div>
                         <div className="text-[10px] uppercase font-bold text-muted">Missing</div>
                      </div>
                   </Card>
                </div>

                <Card className="overflow-hidden border-none shadow-xl">
                   <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                         <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                               <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Student</th>
                               <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                               <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Score</th>
                               <th className="text-right px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Action</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                            {classStatus.map((s) => (
                               <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${s.id === submission?.student_id ? 'bg-primary/5' : ''}`}>
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-500">
                                           {s.full_name[0]}
                                        </div>
                                        <div>
                                           <div className="font-bold text-slate-700">{s.full_name}</div>
                                           <div className="text-[10px] text-slate-400">{s.admission_number}</div>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4">
                                     {s.status === 'missing' ? (
                                        <Badge variant="muted" className="bg-rose-50 text-rose-500 border-rose-100">Missing</Badge>
                                     ) : s.status === 'submitted' ? (
                                        <Badge variant="warning" className="animate-pulse">Needs Marking</Badge>
                                     ) : (
                                        <Badge variant="success">Graded</Badge>
                                     )}
                                  </td>
                                  <td className="px-6 py-4 font-bold text-slate-600">
                                     {s.marks !== undefined && s.marks !== null ? `${s.marks} / ${assignment?.total_marks || assignment?.max_marks}` : '—'}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     {s.submissionId ? (
                                        <Link href={`/teacher/marking/${s.submissionId}`}>
                                           <Button size="sm" variant={s.id === submission?.student_id ? 'primary' : 'secondary'}>
                                              {s.id === submission?.student_id ? 'Viewing' : 'Mark'}
                                           </Button>
                                        </Link>
                                     ) : (
                                        <span className="text-[10px] font-bold text-slate-300">No Submission</span>
                                     )}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </Card>
             </div>
          </div>
) : useCanvasMarkingView ? (
         /* DOCUMENT MARKING VIEW */
         <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left: Interactive Canvas */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
               <div className="max-w-4xl mx-auto space-y-4">
                  <div className="flex items-center justify-between px-2 flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        {isWorkbook && (
                          <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white" style={{ background: 'var(--primary)' }}>
                            📓 Physical Workbook
                          </span>
                        )}
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                          {isWorkbook ? 'Student Workbook Photo — Annotate & Return' : 'Student Submission & Marking'}
                        </h2>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                            {isWorkbook ? 'Student Photo' : 'Original Paper'}
                         </div>
                         <div className="flex items-center gap-2 text-[10px] font-bold text-red-500 uppercase tracking-tighter">
                            <div className="w-2 h-2 rounded-full bg-red-500" /> Your Annotations
                         </div>
                      </div>
                   </div>
                  
                  <div className="flex flex-col gap-10">
                    {renderingPdf ? (
                       <div className="flex flex-col items-center justify-center py-20 gap-4">
                          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <div className="text-sm font-bold text-slate-500">Rendering PDF Pages...</div>
                       </div>
                    ) : (answers?.__workbook_photo__ || pageImages.length > 0) ? (
                       (answers?.__workbook_photo__ ? [answers.__workbook_photo__ as string] : pageImages).map((img, idx) => {
                          const studentAnnMap = typeof answers.__annotation__ === 'string'
                             ? { "0": answers.__annotation__ }
                             : (answers.__annotation__ as any || {})
                          
                          return (
                             <div key={idx} className="space-y-3">
                                <div className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                   {answers?.__workbook_photo__ ? 'Student Workbook Photo' : `Page ${idx + 1}`}
                                </div>
                                <Card className="p-0 overflow-hidden border-4 border-white shadow-2xl rounded-[2.5rem] bg-white">
                                   <AnnotationCanvas 
                                      key={`grader-page-${idx}`}
                                      backgroundImageUrl={img}
                                      backgroundJson={studentAnnMap[idx.toString()]}
                                      initialJson={annotations[`doc_${idx}`] || annotations[idx.toString()]}
                                      onSave={json => setAnnotations(p => ({ ...p, [`doc_${idx}`]: json }))}
                                      defaultColor="#EF4444"
                                   />
                                </Card>
                             </div>
                          )
                       })
                    ) : (
                       <div className="py-20 text-center space-y-4">
                          <AlertCircle size={48} className="mx-auto text-slate-300" />
                          <p className="text-slate-500 font-medium">
                             {isWorkbook
                               ? 'This student has not yet uploaded a photo of their workbook. Remind them to submit.'
                               : 'No document submitted for annotation.'}
                          </p>
                       </div>
                    )}
                  </div>
               </div>
            </div>

            {/* Right: Scoring & Feedback */}
            <div className="w-full lg:w-96 overflow-y-auto bg-white border-l border-[var(--card-border)] p-6 space-y-6">
               <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Award Marks</h3>
                  <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-2 text-center">
                     <input 
                        type="number" 
                        min={0} 
                        max={totalMarks}
                        value={awardedMarks}
                        onChange={e => {
                           const v = Math.min(totalMarks, Math.max(0, parseInt(e.target.value) || 0))
                           // For doc assignments, we store the overall score in a special key or distribute it
                           setQuestionMarks({ __total__: v })
                        }}
                        className="text-4xl font-black w-32 text-center bg-transparent focus:outline-none"
                        style={{ color: 'var(--primary)' }}
                     />
                     <div className="text-xs font-bold text-slate-400 uppercase tracking-widest border-t border-slate-200 pt-2 w-full">
                        Total out of {totalMarks}
                     </div>
                  </div>
               </div>

               <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                     <MessageSquare size={14} /> Overall Feedback
                  </h3>
                  <textarea 
                     className="w-full rounded-2xl p-4 text-sm resize-none min-h-[160px] focus:ring-2 focus:ring-primary/20 border-slate-200"
                     style={{ background: 'var(--input)', color: 'var(--text)' }}
                     value={feedback}
                     onChange={e => setFeedback(e.target.value)}
                     placeholder="Write some encouraging words or specific feedback..."
                  />
               </div>

               <div className="pt-6 border-t border-slate-100">
                  <p className="text-[11px] text-slate-400 italic">
                     Students will see your red annotations overlaid on their work when you return this assignment.
                  </p>
               </div>
            </div>
         </div>
      ) : (
         /* TRADITIONAL BLOCK MARKING VIEW */
         <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
            {/* LEFT — Question + Student Answer */}
            <div className="overflow-y-auto" style={{ borderRight: '1px solid var(--card-border)' }}>
               {/* Question navigator */}
               <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2" style={{ background: 'var(--card)', borderBottom: '1px solid var(--card-border)' }}>
               <button onClick={() => navQuestion(-1)} disabled={activeIndex <= 0} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                  <ChevronLeft size={14} />
               </button>
               <div className="flex gap-1 flex-wrap flex-1">
                  {questionBlocks.map((b, i) => {
                     const awarded = questionMarks[b.id] ?? -1
                     const isActive = b.id === activeBlockId
                     const bg = isActive ? 'var(--primary)' : awarded === b.marks ? '#10B981' : awarded > 0 ? '#F59E0B' : awarded === 0 ? '#EF444420' : 'var(--input)'
                     return (
                        <button key={b.id} onClick={() => setActiveBlockId(b.id)}
                        className="w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center"
                        style={{ background: bg, color: isActive ? 'white' : 'var(--text)' }}>
                        {i + 1}
                        </button>
                     )
                  })}
               </div>
               <button onClick={() => navQuestion(1)} disabled={activeIndex >= questionBlocks.length - 1} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                  <ChevronRight size={14} />
               </button>
               </div>

               <div className="p-5 space-y-4">
               {activeBlock && (
                  <>
                     <div className="p-4 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
                        <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{ background: 'var(--primary)', color: 'white' }}>
                           {activeIndex + 1}
                        </span>
                        <div>
                           <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text)' }}>{activeBlock.question || 'Untitled Question'}</p>
                           {(activeBlock.type === 'mcq' || activeBlock.type === 'true_false') && (
                              <p className="text-xs mt-2 font-bold" style={{ color: '#10B981' }}>
                              ✓ Correct answer: {activeBlock.correct_answer}
                              </p>
                           )}
                        </div>
                        </div>
                     </div>
                     <div>
                        <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Student&apos;s Answer</div>
                        <QuestionRenderer
                        block={activeBlock}
                        index={activeIndex + 1}
                        answer={answers[activeBlock.id]}
                        onChange={() => {}}
                        readOnly
                        showCorrect
                        />
                     </div>
                  </>
               )}
               </div>
            </div>

            {/* RIGHT — Marks + Annotation + Feedback */}
            <div className="overflow-y-auto">
               {activeBlock && (
               <div className="p-5 space-y-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Marks — Q{activeIndex + 1}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                     {activeBlock.marks <= 10 ? (
                        // If marks <= 10, show all options as clickable chips
                        Array.from({ length: activeBlock.marks + 1 }).map((_, v) => (
                           <button key={v} onClick={() => setQuestionMarks(p => ({ ...p, [activeBlock.id]: v }))}
                              className="w-10 h-10 rounded-xl text-sm font-black transition-all flex items-center justify-center shrink-0"
                              style={{ background: questionMarks[activeBlock.id] === v ? 'var(--primary)' : 'var(--input)', color: questionMarks[activeBlock.id] === v ? 'white' : 'var(--text-muted)' }}>
                              {v}
                           </button>
                        ))
                     ) : (
                        // If marks > 10, show 0, Half, Full and an Input box that doesn't break when cleared
                        <>
                           {[0, Math.ceil(activeBlock.marks / 2), activeBlock.marks]
                              .filter((v, i, a) => a.indexOf(v) === i)
                              .map(v => (
                              <button key={v} onClick={() => setQuestionMarks(p => ({ ...p, [activeBlock.id]: v }))}
                                 className="px-4 py-2 rounded-xl text-sm font-black transition-all"
                                 style={{ background: questionMarks[activeBlock.id] === v ? 'var(--primary)' : 'var(--input)', color: questionMarks[activeBlock.id] === v ? 'white' : 'var(--text-muted)' }}>
                                 {v}
                              </button>
                              ))}
                           <input
                              type="number" min={0} max={activeBlock.marks}
                              value={questionMarks[activeBlock.id] === undefined ? '' : questionMarks[activeBlock.id]}
                              onChange={e => {
                                 const val = e.target.value
                                 if (val === '') {
                                    setQuestionMarks(p => { const next = { ...p }; delete next[activeBlock.id]; return next; })
                                 } else {
                                    setQuestionMarks(p => ({ ...p, [activeBlock.id]: Math.min(activeBlock.marks, Math.max(0, parseInt(val) || 0)) }))
                                 }
                              }}
                              className="w-20 rounded-xl px-3 py-2 text-sm text-center font-bold"
                              style={{ background: 'var(--input)', color: 'var(--primary)', border: '1px solid var(--card-border)' }}
                           />
                           <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>/ {activeBlock.marks}</span>
                        </>
                     )}
                  </div>
               </div>
               )}

               {/* Annotation */}
               <div className="p-5 space-y-2" style={{ borderBottom: '1px solid var(--card-border)' }}>
               <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Annotation Canvas</div>
               <div className="rounded-2xl border border-[var(--card-border)] bg-white">
                     <AnnotationCanvas
                        key={activeBlockId ?? 'canvas'}
                        backgroundText={activeBlockId && typeof answers[activeBlockId] === 'string' && !(answers[activeBlockId] as string).startsWith('{') ? (answers[activeBlockId] as string) : undefined}
                        backgroundJson={activeBlockId && typeof answers[activeBlockId] === 'string' && (answers[activeBlockId] as string).startsWith('{') ? (answers[activeBlockId] as string) : undefined}
                        initialJson={activeBlockId ? annotations[activeBlockId] : undefined}
                        defaultColor="#EF4444"
                     onSave={json => activeBlockId && setAnnotations(p => ({ ...p, [activeBlockId]: json }))}
                  />
                  </div>
               </div>

               {/* Feedback + all-questions summary */}
               <div className="p-5 space-y-4">
               <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Overall Feedback</div>
               <textarea
                  className="w-full rounded-xl p-3 text-sm resize-none"
                  style={{ background: 'var(--input)', color: 'var(--text)', border: '1px solid var(--card-border)' }}
                  rows={4}
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Write overall feedback for this student..."
               />

               <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>All Questions</div>
               <div className="space-y-2">
                  {questionBlocks.map((b, i) => {
                     const awarded = questionMarks[b.id] ?? 0
                     const pct = b.marks > 0 ? (awarded / b.marks) * 100 : 0
                     return (
                        <button key={b.id} onClick={() => setActiveBlockId(b.id)} className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                        style={{ background: b.id === activeBlockId ? 'var(--primary-dim)' : 'var(--input)', border: `1px solid ${b.id === activeBlockId ? 'var(--primary)' : 'transparent'}` }}>
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0" style={{ background: 'var(--primary)', color: 'white' }}>{i + 1}</span>
                        <span className="flex-1 text-xs truncate" style={{ color: 'var(--text)' }}>
                          {(b.question || 'Untitled Question').slice(0, 50)}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                           <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--card-border)' }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : pct > 0 ? '#F59E0B' : '#EF4444' }} />
                           </div>
                           <span className="text-xs font-bold w-12 text-right" style={{ color: 'var(--text)' }}>{awarded}/{b.marks}</span>
                        </div>
                        </button>
                     )
                  })}
               </div>
               </div>
            </div>
         </div>
      )}

      {/* Return confirm modal */}
      <Modal isOpen={confirmReturn} onClose={() => setConfirmReturn(false)} title="Return to Student?" size="sm">
        <div className="space-y-4 py-2">
          <div className="text-center p-4 rounded-2xl" style={{ background: 'var(--input)' }}>
            <div className="text-4xl font-black mb-1" style={{ color: 'var(--primary)' }}>{awardedMarks}/{totalMarks}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Final Score for {submission?.student?.full_name}</div>
          </div>
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            The student will be notified and can view their marks and annotations.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmReturn(false)}>Cancel</Button>
            <Button className="flex-1" onClick={returnSubmission} isLoading={returning}>
              <Send size={14} /> Return Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
