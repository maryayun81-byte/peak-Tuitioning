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
  const [isScoringOpen, setIsScoringOpen] = useState(false)

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
          <span className="text-sm text-opacity-50" style={{ color: 'var(--text)' }}>/{totalMarks}</span>
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
      <div className="flex border-b border-[var(--card-border)] bg-[var(--card)] px-4 overflow-x-auto no-scrollbar shrink-0">
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
                         <div className="text-lg font-black" style={{ color: 'var(--text)' }}>{classStatus.filter(s => s.status === 'marked' || s.status === 'returned').length}</div>
                         <div className="text-[10px] uppercase font-bold text-muted">Graded</div>
                      </div>
                   </Card>
                   <Card className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                         <Clock size={20} />
                      </div>
                      <div>
                         <div className="text-lg font-black" style={{ color: 'var(--text)' }}>{classStatus.filter(s => s.status === 'submitted').length}</div>
                         <div className="text-[10px] uppercase font-bold text-muted">Pending</div>
                      </div>
                   </Card>
                   <Card className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                         <AlertCircle size={20} />
                      </div>
                      <div>
                         <div className="text-lg font-black" style={{ color: 'var(--text)' }}>{classStatus.filter(s => s.status === 'missing').length}</div>
                         <div className="text-[10px] uppercase font-bold text-muted">Missing</div>
                      </div>
                   </Card>
                </div>

                <Card className="overflow-hidden border-none shadow-xl">
                   <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                         <thead>
                            <tr className="border-b" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                               <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Student</th>
                               <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Status</th>
                               <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Score</th>
                               <th className="text-right px-6 py-4 text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Action</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                            {classStatus.map((s) => (
                               <tr key={s.id} className="transition-colors hover:opacity-80" style={{ background: s.id === submission?.student_id ? 'var(--primary-dim)' : 'transparent' }}>
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px]" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                                           {s.full_name[0]}
                                        </div>
                                        <div>
                                           <div className="font-bold" style={{ color: 'var(--text)' }}>{s.full_name}</div>
                                           <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.admission_number}</div>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4">
                                     {s.status === 'missing' ? (
                                        <Badge variant="danger" className="opacity-50">Missing</Badge>
                                     ) : s.status === 'submitted' ? (
                                        <Badge variant="warning" className="animate-pulse">Needs Marking</Badge>
                                     ) : (
                                        <Badge variant="success">Graded</Badge>
                                     )}
                                  </td>
                                  <td className="px-6 py-4 font-bold" style={{ color: 'var(--text)' }}>
                                     {s.marks !== undefined && s.marks !== null ? `${s.marks} / ${totalMarks}` : '—'}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     {s.submissionId ? (
                                        <Link href={`/teacher/marking/${s.submissionId}`}>
                                           <Button size="sm" variant={s.id === submission?.student_id ? 'primary' : 'secondary'}>
                                              {s.id === submission?.student_id ? 'Viewing' : 'Mark'}
                                           </Button>
                                        </Link>
                                     ) : (
                                        <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>No Submission</span>
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
         <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            {/* Left: Interactive Canvas */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8" style={{ background: 'var(--bg)' }}>
               <div className="max-w-4xl mx-auto space-y-4">
                  <div className="flex items-center justify-between px-2 flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        {isWorkbook && (
                          <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white" style={{ background: 'var(--primary)' }}>
                            📓 Physical Workbook
                          </span>
                        )}
                        <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                          {isWorkbook ? 'Student Workbook Photo — Annotate' : 'Student Submission & Marking'}
                        </h2>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter" style={{ color: 'var(--text-muted)' }}>
                            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--card-border)' }} />
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
                          <div className="text-sm font-bold opacity-50" style={{ color: 'var(--text)' }}>Rendering PDF...</div>
                       </div>
                    ) : (answers?.__workbook_photo__ || pageImages.length > 0) ? (
                       (answers?.__workbook_photo__ ? [answers.__workbook_photo__ as string] : pageImages).map((img, idx) => {
                          const studentAnnMap = typeof answers.__annotation__ === 'string'
                             ? { "0": answers.__annotation__ }
                             : (answers.__annotation__ as any || {})
                          
                          return (
                             <div key={idx} className="space-y-3">
                                <div className="px-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                   {answers?.__workbook_photo__ ? 'Student Workbook Photo' : `Page ${idx + 1}`}
                                </div>
                                <Card className="p-0 overflow-hidden border-4 shadow-2xl rounded-[2.5rem]" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
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
                          <AlertCircle size={48} className="mx-auto" style={{ color: 'var(--card-border)' }} />
                          <p className="font-medium" style={{ color: 'var(--text-muted)' }}>
                             {isWorkbook
                               ? 'This student has not yet uploaded a photo of their workbook.'
                               : 'No document submitted for annotation.'}
                          </p>
                       </div>
                    )}
                  </div>
               </div>
            </div>

            {/* Right: Scoring & Feedback (Drawer on Mobile, Sidebar on Desktop) */}
            <AnimatePresence>
               {(isScoringOpen || typeof window !== 'undefined' && window.innerWidth >= 1024) && (
                  <motion.div 
                     initial={{ y: '100%', opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     exit={{ y: '100%', opacity: 0 }}
                     transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                     className="fixed inset-x-0 bottom-0 z-40 lg:relative lg:inset-auto lg:w-96 lg:translate-y-0 h-[80vh] lg:h-full border-t lg:border-t-0 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] lg:shadow-none flex flex-col rounded-t-[2.5rem] lg:rounded-none overflow-hidden"
                     style={{ background: 'var(--card)', borderColor: 'var(--card-border)', borderLeftWidth: '1px' }}
                  >
                     {/* Mobile Handle */}
                     <div className="lg:hidden flex justify-center py-4 shrink-0" onClick={() => setIsScoringOpen(false)}>
                        <div className="w-12 h-1.5 rounded-full" style={{ background: 'var(--card-border)' }} />
                     </div>

                     <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                        <div className="space-y-6">
                           <div className="flex items-center justify-between">
                             <div className="flex flex-col">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Award Marks</h3>
                                <div className="lg:hidden text-[10px] font-bold opacity-50" style={{ color: 'var(--text-muted)' }}>Tap Handle to Close</div>
                             </div>
                             <div className="px-3 py-1 bg-primary/10 rounded-lg text-[10px] font-black text-primary uppercase">
                                {awardedMarks} / {totalMarks} Total
                             </div>
                           </div>

                           <div className="space-y-4">
                              {questionBlocks.length > 0 ? (
                                 questionBlocks.map((b, i) => (
                                    <div key={b.id} className="p-4 rounded-2xl border space-y-3" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                                       <div className="flex justify-between items-start gap-4">
                                          <div className="flex-1">
                                             <div className="text-[10px] font-black text-primary uppercase mb-1">Question {i + 1}</div>
                                             <div className="text-xs font-bold line-clamp-2 leading-relaxed" style={{ color: 'var(--text)' }}>
                                                {b.question || 'Untitled Question'}
                                             </div>
                                          </div>
                                          <div className="text-[10px] font-black uppercase" style={{ color: 'var(--text-muted)' }}>/{b.marks}</div>
                                       </div>
                                       <div className="flex items-center gap-1.5 flex-wrap">
                                          {Array.from({ length: Math.min(b.marks + 1, 6) }).map((_, v) => (
                                             <button 
                                                key={v} 
                                                onClick={() => setQuestionMarks(p => ({ ...p, [b.id]: v }))}
                                                className={`w-9 h-9 rounded-xl text-xs font-black transition-all border ${questionMarks[b.id] === v ? 'bg-primary text-white shadow-md' : 'shadow-sm'}`}
                                                style={{ background: questionMarks[b.id] === v ? 'var(--primary)' : 'var(--card)', borderColor: 'var(--card-border)', color: questionMarks[b.id] === v ? 'white' : 'var(--text-muted)' }}
                                             >
                                                {v}
                                             </button>
                                          ))}
                                          {b.marks > 5 && (
                                             <input 
                                                type="number"
                                                max={b.marks}
                                                min={0}
                                                value={questionMarks[b.id] ?? ''}
                                                onChange={e => {
                                                   const v = Math.min(b.marks, Math.max(0, parseInt(e.target.value) || 0))
                                                   setQuestionMarks(p => ({ ...p, [b.id]: v }))
                                                }}
                                                placeholder="..."
                                                className="w-12 h-9 rounded-xl border text-center text-xs font-black focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                style={{ background: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                                             />
                                          )}
                                       </div>
                                    </div>
                                 ))
                              ) : (
                                 <div className="p-5 rounded-3xl border flex flex-col items-center justify-center gap-2 text-center" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                                    <input 
                                       type="number" 
                                       min={0} 
                                       max={totalMarks}
                                       value={awardedMarks}
                                       onChange={e => {
                                          const v = Math.min(totalMarks, Math.max(0, parseInt(e.target.value) || 0))
                                          setQuestionMarks({ __total__: v })
                                       }}
                                       className="text-4xl font-black w-32 text-center bg-transparent focus:outline-none"
                                       style={{ color: 'var(--primary)' }}
                                    />
                                    <div className="text-xs font-bold uppercase tracking-widest border-t pt-2 w-full" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
                                       Total out of {totalMarks}
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
                           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                              <MessageSquare size={14} /> Overall Feedback
                           </h3>
                           <textarea 
                              className="w-full rounded-2xl p-4 text-sm resize-none min-h-[160px] outline-none ring-primary/20 focus:ring-2 border"
                              style={{ background: 'var(--input)', color: 'var(--text)', borderColor: 'var(--card-border)' }}
                              value={feedback}
                              onChange={e => setFeedback(e.target.value)}
                              placeholder="Write some encouraging words..."
                           />
                        </div>

                        <div className="pt-6 border-t pb-10" style={{ borderColor: 'var(--card-border)' }}>
                           <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>
                              Students see your red annotations overlaid on their photo.
                           </p>
                        </div>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>

            {/* Mobile Float Toggle */}
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
               <button 
                  onClick={() => setIsScoringOpen(!isScoringOpen)}
                  className="px-6 py-4 bg-primary text-white rounded-[2rem] shadow-2xl shadow-primary/40 flex items-center gap-3 active:scale-95 transition-transform"
               >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">
                     {awardedMarks}
                  </div>
                  <div className="flex flex-col items-start leading-none text-left">
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Award Marks</span>
                     <span className="text-xs font-bold">Open Drawer</span>
                  </div>
                  {isScoringOpen ? <ChevronLeft className="-rotate-90" size={18} /> : <ChevronLeft className="rotate-90" size={18} />}
               </button>
            </div>
         </div>
      ) : (
          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 overflow-hidden relative">
            {/* LEFT — Question + Student Answer */}
            <div className="flex-1 overflow-y-auto lg:border-r" style={{ borderColor: 'var(--card-border)' }}>
               {/* Question navigator */}
               <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 border-b" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <button onClick={() => navQuestion(-1)} disabled={activeIndex <= 0} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-all hover:opacity-80 disabled:opacity-30" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                   <ChevronLeft size={14} />
                </button>
                <div className="flex gap-1 flex-wrap flex-1">
                   {questionBlocks.map((b, i) => {
                      const awarded = questionMarks[b.id] ?? -1
                      const isActive = b.id === activeBlockId
                      const bg = isActive ? 'var(--primary)' : awarded === b.marks ? '#10B981' : awarded > 0 ? '#F59E0B' : awarded === 0 ? '#EF444420' : 'var(--input)'
                      return (
                         <button key={b.id} onClick={() => setActiveBlockId(b.id)}
                         className="w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all shadow-sm"
                         style={{ background: bg, color: isActive ? 'white' : 'var(--text)' }}>
                         {i + 1}
                         </button>
                      )
                   })}
                </div>
                <button onClick={() => navQuestion(1)} disabled={activeIndex >= questionBlocks.length - 1} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-all hover:opacity-80 disabled:opacity-30" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                   <ChevronRight size={14} />
                </button>
               </div>

               <div className="p-5 space-y-4">
               {activeBlock && (
                  <>
                     <div className="p-4 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
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
            <AnimatePresence>
               {(isScoringOpen || typeof window !== 'undefined' && window.innerWidth >= 1024) && (
                  <motion.div 
                     initial={{ y: '100%', opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     exit={{ y: '100%', opacity: 0 }}
                     transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                     className="fixed inset-x-0 bottom-0 z-40 lg:relative lg:inset-auto lg:w-full lg:translate-y-0 h-[80vh] lg:h-full border-t lg:border-t-0 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] lg:shadow-none flex flex-col rounded-t-[2.5rem] lg:rounded-none overflow-hidden"
                     style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                  >
                     {/* Mobile Handle */}
                     <div className="lg:hidden flex justify-center py-4 shrink-0" onClick={() => setIsScoringOpen(false)}>
                        <div className="w-12 h-1.5 rounded-full" style={{ background: 'var(--card-border)' }} />
                     </div>

                     <div className="flex-1 overflow-y-auto p-5 space-y-8 no-scrollbar">
                        {activeBlock && (
                           <div className="p-5 rounded-3xl border space-y-4 shadow-sm" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                              <div className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Marks — Q{activeIndex + 1}</div>
                              <div className="flex items-center gap-2 flex-wrap">
                                 {activeBlock.marks <= 10 ? (
                                    Array.from({ length: activeBlock.marks + 1 }).map((_, v) => (
                                       <button key={v} onClick={() => setQuestionMarks(p => ({ ...p, [activeBlock.id]: v }))}
                                          className={`w-10 h-10 rounded-xl text-sm font-black transition-all flex items-center justify-center shrink-0 border shadow-sm ${questionMarks[activeBlock.id] === v ? 'bg-primary text-white' : ''}`}
                                          style={{ background: questionMarks[activeBlock.id] === v ? 'var(--primary)' : 'var(--card)', color: questionMarks[activeBlock.id] === v ? 'white' : 'var(--text-muted)', borderColor: 'var(--card-border)' }}>
                                          {v}
                                       </button>
                                    ))
                                 ) : (
                                    <>
                                       {[0, Math.ceil(activeBlock.marks / 2), activeBlock.marks]
                                          .filter((v, i, a) => a.indexOf(v) === i)
                                          .map(v => (
                                          <button key={v} onClick={() => setQuestionMarks(p => ({ ...p, [activeBlock.id]: v }))}
                                             className={`px-4 py-2 rounded-xl text-sm font-black transition-all border shadow-sm ${questionMarks[activeBlock.id] === v ? 'bg-primary text-white' : ''}`}
                                             style={{ background: questionMarks[activeBlock.id] === v ? 'var(--primary)' : 'var(--card)', color: questionMarks[activeBlock.id] === v ? 'white' : 'var(--text-muted)', borderColor: 'var(--card-border)' }}>
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
                                          className="w-20 rounded-xl px-3 py-2 text-sm text-center font-bold border focus:ring-2 ring-primary/20"
                                          style={{ background: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                                          placeholder="..."
                                       />
                                       <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>/ {activeBlock.marks}</span>
                                    </>
                                 )}
                              </div>
                           </div>
                        )}

                        {/* Annotation */}
                        <div className="space-y-3">
                           <div className="text-xs font-black uppercase tracking-widest text-slate-400">Annotation Canvas</div>
                           <div className="rounded-3xl border overflow-hidden shadow-inner" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
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

                        {/* Feedback + summary */}
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Overall Feedback</div>
                              <textarea
                                 className="w-full rounded-2xl p-4 text-sm resize-none outline-none ring-primary/20 focus:ring-2 border"
                                 style={{ background: 'var(--input)', color: 'var(--text)', borderColor: 'var(--card-border)' }}
                                 rows={4}
                                 value={feedback}
                                 onChange={e => setFeedback(e.target.value)}
                                 placeholder="Write overall feedback for this student..."
                              />
                           </div>

                           <div className="space-y-3">
                              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Marking Summary</div>
                              <div className="space-y-2">
                                 {questionBlocks.map((b, i) => {
                                    const awarded = questionMarks[b.id] ?? 0
                                    const pct = b.marks > 0 ? (awarded / b.marks) * 100 : 0
                                    return (
                                       <button key={b.id} onClick={() => setActiveBlockId(b.id)} className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${b.id === activeBlockId ? 'bg-primary/5 ring-1 ring-primary/20' : 'border border-transparent hover:opacity-80'}`} style={{ background: b.id === activeBlockId ? 'transparent' : 'var(--input)' }}>
                                          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm" style={{ background: 'var(--card)', color: 'var(--primary)' }}>{i + 1}</span>
                                          <span className="flex-1 text-xs truncate font-medium" style={{ color: 'var(--text)' }}>
                                             {b.question || 'Untitled Question'}
                                          </span>
                                          <div className="flex items-center gap-2 shrink-0">
                                             <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--card-border)' }}>
                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : pct > 0 ? '#F59E0B' : '#EF4444' }} />
                                             </div>
                                             <span className="text-[10px] font-black w-10 text-right" style={{ color: 'var(--text-muted)' }}>{awarded}/{b.marks}</span>
                                          </div>
                                       </button>
                                    )
                                 })}
                              </div>
                           </div>
                        </div>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>

            {/* Mobile Toggle */}
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
               <button 
                  onClick={() => setIsScoringOpen(!isScoringOpen)}
                  className="px-6 py-4 bg-primary text-white rounded-[2rem] shadow-2xl flex items-center gap-3 active:scale-95 transition-transform"
               >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">{awardedMarks}</div>
                  <div className="flex flex-col items-start leading-none text-left">
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Award Marks</span>
                     <span className="text-xs font-bold">Open Drawer</span>
                  </div>
                  {isScoringOpen ? <ChevronLeft className="-rotate-90" size={18} /> : <ChevronLeft className="rotate-90" size={18} />}
               </button>
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
