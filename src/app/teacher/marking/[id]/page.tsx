'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Check, Send, MessageSquare, Star,
  ChevronLeft, ChevronRight, User, BookOpen, CheckCircle2,
  BarChart3, Users, AlertCircle, Clock, Zap, Trophy
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
  const [annotations, setAnnotations] = useState<Record<string, string>>({})
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
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [questionComments, setQuestionComments] = useState<Record<string, string>>({})
  const [showJumpList, setShowJumpList] = useState(false)
  const prevAwardedRef = useRef(0)

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

      let savedAnnotations = {}
      try {
        savedAnnotations = typeof sub.annotations === 'string' ? JSON.parse(sub.annotations) : (sub.annotations ?? {})
      } catch { savedAnnotations = {} }
      setAnnotations(savedAnnotations)

      const a = sub.assignment
      setAssignment(a)
      const ws: WorksheetBlock[] = a?.worksheet ?? []
      setBlocks(ws)

      // Load Class Progress
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
        supabase.from('submissions').select('id, student_id, status, marks').eq('assignment_id', a.id)
      ])

      const students = studentsRes.data ?? []
      const allSubs = subsRes.data ?? []
      const statusMap = students.map(st => {
        const sub = allSubs.find(s => s.student_id === st.id)
        return { ...st, submissionId: sub?.id, status: sub?.status || 'missing', marks: sub?.marks }
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

      if (a.attachment_url?.toLowerCase().endsWith('.pdf')) {
        setRenderingPdf(true)
        try {
          const imgs = await renderPdfToImages(a.attachment_url)
          setPageImages(imgs)
        } catch (err: any) {
          toast.error(`PDF rendering failed: ${err.message}`)
          setPageImages([a.attachment_url])
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

  const markingData = useMemo(() => ({ feedback, questionMarks, annotations }), [feedback, questionMarks, annotations])
  const { hasSavedDraft, restore, clear } = useAutoSave(`marking_${submissionId}`, markingData, (saved) => {
    setFeedback(saved.feedback)
    setQuestionMarks(saved.questionMarks)
    setAnnotations(saved.annotations)
    toast.success('Marking draft restored!')
  })

  const questionBlocks = blocks.filter(b => b.type !== 'section_header' && b.type !== 'reading_passage')
  const totalMarks = assignment?.total_marks ?? questionBlocks.reduce((s, b) => s + b.marks, 0)
  const awardedMarks = Object.values(questionMarks).reduce((s, v) => s + (v || 0), 0)
  const percentage = totalMarks > 0 ? Math.round((awardedMarks / totalMarks) * 100) : 0

  const saveProgress = async () => {
    setSaving(true)
    const { error } = await supabase.from('submissions').update({
      question_marks: questionMarks,
      marks: awardedMarks,
      feedback,
      annotations,
      status: 'marked',
    }).eq('id', submissionId)
    if (error) toast.error('Save failed: ' + error.message)
    else { toast.success('Progress saved!'); clear() }
    setSaving(false)
  }

  const returnSubmission = async () => {
    setReturning(true)
    setConfirmReturn(false)
    const { error } = await supabase.from('submissions').update({
      question_marks: questionMarks,
      marks: awardedMarks,
      feedback,
      annotations,
      status: 'returned',
      returned_at: new Date().toISOString(),
    }).eq('id', submissionId)

    if (!error) {
      const numericAwarded = Number(awardedMarks) || 0
      const numericTotal = Number(totalMarks) || 1
      const isHighPerf = (numericAwarded / numericTotal) >= 0.8
      const xpAwarded = isHighPerf ? 50 : 10
      const { data: st } = await supabase.from('students').select('xp').eq('id', submission.student_id).single()
      await supabase.from('students').update({ xp: (st?.xp || 0) + xpAwarded }).eq('id', submission.student_id)
      await supabase.from('notifications').insert({
        user_id: submission?.student?.user_id ?? null,
        type: 'assignment_returned',
        title: isHighPerf ? 'Mastery Achievement! +50 XP' : 'Assignment Returned (+10 XP)',
        body: isHighPerf
          ? `Incredible! You scored ${Math.round((numericAwarded / numericTotal) * 100)}% on "${assignment?.title}".`
          : `Your worksheet "${assignment?.title}" has been marked. Score: ${numericAwarded}/${numericTotal}`,
        related_id: assignment?.id,
        data: { xp: xpAwarded, marks: numericAwarded, total: numericTotal, mastery: isHighPerf, assignment_id: assignment?.id }
      })
      toast.success(isHighPerf ? '✅ Returned with Mastery Bonus!' : '✅ Submission returned!')
      router.push('/teacher/marking')
    } else {
      toast.error('Return failed: ' + error.message)
    }
    setReturning(false)
  }

  const activeBlock = blocks.find(b => b.id === activeBlockId)
  const activeIndex = questionBlocks.findIndex(b => b.id === activeBlockId)

  const setMark = (blockId: string, value: number) => {
    setQuestionMarks(p => ({ ...p, [blockId]: value }))
  }

  const navQuestion = (dir: number) => {
    const next = questionBlocks[activeIndex + dir]
    if (next) setActiveBlockId(next.id)
  }

  const getScoreColor = (pct: number) => {
    if (pct === 100) return '#10B981'
    if (pct >= 50) return '#F59E0B'
    if (pct > 0) return 'var(--primary)'
    return '#EF4444'
  }

  // ── Loading ──────────────────────────────────────────────────
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
        <h2 className="text-xl font-black uppercase italic" style={{ color: 'var(--text)' }}>Failed to Load</h2>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={() => router.back()}><ArrowLeft size={16} /> Back</Button>
          <Button onClick={() => loadSubmission()}>Try Again</Button>
        </div>
      </div>
    </div>
  )

  const isDocumentAssignment = !!assignment?.attachment_url
  const isWorkbook = !!assignment?.is_workbook

  // ── Percentage Ring ──────────────────────────────────────────────────
  const ringRadius = 22
  const ringCirc = 2 * Math.PI * ringRadius
  const ringOffset = ringCirc - (percentage / 100) * ringCirc

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ═══ TOP HEADER BAR ════════════════════════════════════════ */}
      <div className="shrink-0 z-30 flex items-center gap-2 px-3 py-2.5 border-b"
        style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>

        {/* Back */}
        <Link href={assignment?.id ? `/teacher/assignments/${assignment.id}/progress` : '/teacher/marking'}>
          <button className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 hover:opacity-70 transition-opacity"
            style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
            <ArrowLeft size={16} />
          </button>
        </Link>

        {/* Student Info */}
        <div className="flex-1 min-w-0">
          <div className="font-black text-xs leading-tight truncate" style={{ color: 'var(--text)' }}>
            {submission?.student?.full_name}
          </div>
          <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
            {assignment?.title} · {submission?.student?.class?.name}
          </div>
        </div>

        {/* Live Score Ring */}
        <div className="relative shrink-0 w-12 h-12 flex items-center justify-center">
          <svg className="absolute inset-0" width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r={ringRadius} fill="none" stroke="var(--card-border)" strokeWidth="3" />
            <circle
              cx="24" cy="24" r={ringRadius}
              fill="none"
              stroke={getScoreColor(percentage)}
              strokeWidth="3"
              strokeDasharray={ringCirc}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              transform="rotate(-90 24 24)"
              style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
            />
          </svg>
          <div className="text-center leading-none z-10">
            <div className="text-[10px] font-black" style={{ color: 'var(--text)' }}>{awardedMarks}</div>
            <div className="text-[7px]" style={{ color: 'var(--text-muted)' }}>/{totalMarks}</div>
          </div>
        </div>

        {/* Actions */}
        <Button size="sm" variant="secondary" onClick={saveProgress} isLoading={saving} className="shrink-0 px-3">
          <Check size={14} />
          <span className="hidden sm:inline ml-1">Save</span>
        </Button>
        <Button size="sm" onClick={() => setConfirmReturn(true)} className="shrink-0 px-3">
          <Send size={14} />
          <span className="hidden sm:inline ml-1">Return</span>
        </Button>
      </div>

      {/* Draft recovery banner */}
      <AnimatePresence>
        {hasSavedDraft && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden shrink-0 bg-primary/10 border-b border-primary/20">
            <div className="px-4 py-1.5 flex items-center justify-between gap-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Unsaved progress found
              </div>
              <div className="flex gap-4">
                <button onClick={clear} className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Discard</button>
                <button onClick={restore} className="text-[10px] font-black uppercase tracking-widest text-primary">Restore</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TABS ══════════════════════════════════════════════════ */}
      <div className="shrink-0 flex border-b px-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
        {['marking', 'progress'].map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent'}`}
            style={{ color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)' }}>
            {tab === 'marking' ? 'Marking' : `Class (${classStatus.filter(s => s.status !== 'missing').length}/${classStatus.length})`}
          </button>
        ))}
      </div>

      {/* ═══ BODY ════════════════════════════════════════════════════ */}
      {activeTab === 'progress' ? (

        /* CLASS PROGRESS */
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Graded', count: classStatus.filter(s => ['marked', 'returned'].includes(s.status)).length, color: '#10B981', icon: CheckCircle2 },
                { label: 'Pending', count: classStatus.filter(s => s.status === 'submitted').length, color: '#F59E0B', icon: Clock },
                { label: 'Missing', count: classStatus.filter(s => s.status === 'missing').length, color: '#EF4444', icon: AlertCircle },
              ].map(({ label, count, color, icon: Icon }) => (
                <div key={label} className="p-3 rounded-2xl border text-center" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                  <div className="text-xl font-black" style={{ color }}>{count}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
              {classStatus.map((s, i) => (
                <div key={s.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 ${s.id === submission?.student_id ? 'bg-primary/5' : ''}`}
                  style={{ borderColor: 'var(--card-border)', background: s.id === submission?.student_id ? 'var(--primary-dim)' : i % 2 === 0 ? 'var(--card)' : 'var(--input)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                    style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                    {s.full_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs truncate" style={{ color: 'var(--text)' }}>{s.full_name}</div>
                    <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{s.admission_number}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.marks != null && (
                      <span className="text-xs font-black" style={{ color: 'var(--text)' }}>{s.marks}/{totalMarks}</span>
                    )}
                    {s.submissionId ? (
                      <Link href={`/teacher/marking/${s.submissionId}`}>
                        <button className="px-3 py-1 rounded-lg text-[10px] font-black uppercase"
                          style={{ background: s.id === submission?.student_id ? 'var(--primary)' : 'var(--input)', color: s.id === submission?.student_id ? 'white' : 'var(--text-muted)' }}>
                          {s.id === submission?.student_id ? 'Here' : 'Mark'}
                        </button>
                      </Link>
                    ) : (
                      <span className="text-[9px] opacity-40" style={{ color: 'var(--text-muted)' }}>No sub</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      ) : isDocumentAssignment || isWorkbook ? (

        /* DOCUMENT / WORKBOOK MARKING — Always-visible score panel below canvas */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

          {/* Canvas area */}
          <div className="flex-1 overflow-y-auto p-3" style={{ background: 'var(--bg)' }}>
            {renderingPdf ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="text-sm font-bold opacity-50" style={{ color: 'var(--text)' }}>Rendering PDF…</div>
              </div>
        ) : (answers?.__workbook_photos__ as any)?.length > 0 || answers?.__workbook_photo__ || pageImages.length > 0 ? (
              (() => {
                // Collect all workbook pages — support both new multi-photo and legacy single photo
                const wbPhotos: string[] = [
                  ...((answers?.__workbook_photos__ as string[]) || []),
                  ...(!((answers?.__workbook_photos__ as any)?.length) && answers?.__workbook_photo__ ? [answers.__workbook_photo__ as string] : []),
                ]
                const displayImages = wbPhotos.length > 0 ? wbPhotos : pageImages
                return displayImages.map((img, idx) => {
                  const studentAnnMap = typeof answers.__annotation__ === 'string'
                    ? { "0": answers.__annotation__ }
                    : (answers.__annotation__ as any || {})
                  return (

                  <div key={idx} className="mb-6">
                    <div className="px-2 pb-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {answers?.__workbook_photo__ ? 'Workbook Photo' : `Page ${idx + 1}`}
                    </div>
                    <div className="rounded-2xl overflow-hidden border-2 shadow-xl" style={{ borderColor: 'var(--card-border)' }}>
                      <AnnotationCanvas
                        key={`grader-page-${idx}`}
                        backgroundImageUrl={img}
                        backgroundJson={studentAnnMap[idx.toString()]}
                        initialJson={annotations[`doc_${idx}`] || annotations[idx.toString()]}
                        onSave={json => setAnnotations(p => ({ ...p, [`doc_${idx}`]: json }))}
                        defaultColor="#EF4444"
                      />
                    </div>
                  </div>
                 )
                })
              })()
            ) : (
              <div className="py-20 text-center">
                <AlertCircle size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {isWorkbook ? 'Student has not uploaded a workbook photo yet.' : 'No document submitted.'}
                </p>
              </div>
            )}
            {/* Extra padding so floating panel doesn't overlap */}
            <div className="h-64 lg:hidden" />
          </div>

          {/* SCORING PANEL — Always visible at bottom on mobile, right sidebar on desktop */}
          <div className="shrink-0 lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l overflow-y-auto"
            style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
            <DocScoringPanel
              questionBlocks={questionBlocks}
              questionMarks={questionMarks}
              totalMarks={totalMarks}
              awardedMarks={awardedMarks}
              percentage={percentage}
              feedback={feedback}
              setFeedback={setFeedback}
              setMark={setMark}
              getScoreColor={getScoreColor}
            />
          </div>
        </div>

      ) : (

        /* WORKSHEET MARKING — Question viewer + always-visible bottom marking bar */
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Question number bubbles nav */}
          <div className="shrink-0 border-b" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto no-scrollbar">
              <button onClick={() => navQuestion(-1)} disabled={activeIndex <= 0}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-opacity disabled:opacity-30 font-black text-lg"
                style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                <ChevronLeft size={16} />
              </button>

              <div className="flex gap-1.5 flex-1 overflow-x-auto no-scrollbar">
                {questionBlocks.map((b, i) => {
                  const awarded = questionMarks[b.id] ?? -1
                  const isActive = b.id === activeBlockId
                  const pct = b.marks > 0 ? (awarded / b.marks) * 100 : -1
                  let bg = 'var(--input)'
                  if (isActive) bg = 'var(--primary)'
                  else if (pct === 100) bg = '#10B981'
                  else if (pct > 0) bg = '#F59E0B'
                  else if (pct === 0) bg = '#EF444440'
                  return (
                    <button key={b.id} onClick={() => setActiveBlockId(b.id)}
                      className="w-9 h-9 rounded-xl text-xs font-black flex items-center justify-center shrink-0 transition-all"
                      style={{ background: bg, color: isActive || pct >= 100 ? 'white' : 'var(--text)' }}>
                      {i + 1}
                    </button>
                  )
                })}
              </div>

              <button onClick={() => navQuestion(1)} disabled={activeIndex >= questionBlocks.length - 1}
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-opacity disabled:opacity-30"
                style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                <ChevronRight size={16} />
              </button>

              {/* Jump to question picker for long papers */}
              {questionBlocks.length > 6 && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowJumpList(v => !v)}
                    className="px-3 h-8 rounded-xl text-[10px] font-black uppercase tracking-wider"
                    style={{ background: 'var(--input)', color: 'var(--primary)' }}>
                    Jump
                  </button>
                  <AnimatePresence>
                    {showJumpList && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        className="absolute right-0 top-10 z-50 w-64 rounded-2xl border shadow-2xl overflow-hidden"
                        style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                        <div className="p-2 text-[9px] font-black uppercase tracking-widest border-b px-3 py-2"
                          style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
                          Jump to Question
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {questionBlocks.map((b, i) => {
                            const awarded = questionMarks[b.id] ?? -1
                            const pct = b.marks > 0 ? (awarded / b.marks) * 100 : -1
                            const isActive = b.id === activeBlockId
                            return (
                              <button key={b.id}
                                onClick={() => { setActiveBlockId(b.id); setShowJumpList(false) }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all hover:opacity-80"
                                style={{ background: isActive ? 'var(--primary-dim)' : 'transparent' }}>
                                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                                  style={{
                                    background: pct === 100 ? '#10B981' : pct > 0 ? '#F59E0B' : pct === 0 ? '#EF4444' : 'var(--input)',
                                    color: pct >= 0 ? 'white' : 'var(--text-muted)'
                                  }}>{i + 1}</span>
                                <span className="flex-1 text-xs truncate" style={{ color: 'var(--text)' }}>
                                  {b.question?.slice(0, 40) || 'Untitled'}
                                </span>
                                <span className="text-[10px] font-black shrink-0" style={{ color: 'var(--text-muted)' }}>
                                  {awarded >= 0 ? `${awarded}/${b.marks}` : `/${b.marks}`}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Progress bar across full width */}
            <div className="h-1" style={{ background: 'var(--card-border)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: getScoreColor(percentage) }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Main layout: scrollable question | fixed marking strip */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

            {/* Left: Question content */}
            <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '0' }}>
              <div className="p-4 space-y-4 max-w-2xl mx-auto">
                {activeBlock ? (
                  <>
                    {/* Question card */}
                    <div className="p-4 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                          style={{ background: 'var(--primary)', color: 'white' }}>
                          {activeIndex + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text)' }}>
                            {activeBlock.question || 'Untitled Question'}
                          </p>
                          {(activeBlock.type === 'mcq' || activeBlock.type === 'true_false') && (
                            <p className="text-xs mt-2 font-bold text-emerald-500">
                              ✓ {activeBlock.correct_answer}
                            </p>
                          )}
                        </div>
                        <div className="text-xs font-black shrink-0 px-2 py-1 rounded-lg"
                          style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                          /{activeBlock.marks}
                        </div>
                      </div>
                    </div>

                    {/* Student Answer */}
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                        Student's Answer
                      </div>
                      <QuestionRenderer
                        block={activeBlock}
                        index={activeIndex + 1}
                        answer={answers[activeBlock.id]}
                        onChange={() => {}}
                        readOnly
                        showCorrect
                      />
                    </div>

                    {/* Annotation canvas (mobile inline) */}
                    <div className="lg:hidden">
                      <div className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                        Annotation (optional)
                      </div>
                      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
                        <AnnotationCanvas
                          key={`mobile-${activeBlockId}`}
                          backgroundText={activeBlockId && typeof answers[activeBlockId] === 'string' && !(answers[activeBlockId] as string).startsWith('{') ? (answers[activeBlockId] as string) : undefined}
                          backgroundJson={activeBlockId && typeof answers[activeBlockId] === 'string' && (answers[activeBlockId] as string).startsWith('{') ? (answers[activeBlockId] as string) : undefined}
                          initialJson={activeBlockId ? annotations[activeBlockId] : undefined}
                          defaultColor="#EF4444"
                          onSave={json => activeBlockId && setAnnotations(p => ({ ...p, [activeBlockId]: json }))}
                        />
                      </div>
                    </div>

                    {/* spacer so content doesn't hide under marking strip on mobile */}
                    <div className="lg:hidden h-4" />
                  </>
                ) : (
                  <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
                    Select a question to begin marking.
                  </div>
                )}
              </div>
            </div>

            {/* ── ALWAYS-VISIBLE MARKING STRIP (Mobile bottom / Desktop right) ── */}
            <div
              className="shrink-0 lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l overflow-y-auto"
              style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
            >
              {activeBlock ? (
                <div className="p-4 space-y-4">
                  {/* Question label + max */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        Award Marks
                      </div>
                      <div className="text-xs font-black" style={{ color: 'var(--text)' }}>
                        Q{activeIndex + 1} · Max {activeBlock.marks}
                      </div>
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={questionMarks[activeBlock.id] ?? 'empty'}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.2, opacity: 0 }}
                        className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg"
                        style={{
                          background: questionMarks[activeBlock.id] === undefined
                            ? 'var(--input)'
                            : questionMarks[activeBlock.id] === activeBlock.marks
                              ? '#10B981'
                              : questionMarks[activeBlock.id] === 0
                                ? '#EF4444'
                                : 'var(--primary)',
                          color: questionMarks[activeBlock.id] === undefined ? 'var(--text-muted)' : 'white'
                        }}
                      >
                        {questionMarks[activeBlock.id] ?? '?'}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Mark buttons grid — 0 through max */}
                  {activeBlock.marks <= 10 ? (
                    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))' }}>
                      {Array.from({ length: activeBlock.marks + 1 }, (_, v) => {
                        const isSelected = questionMarks[activeBlock.id] === v
                        const isZero = v === 0
                        const isFull = v === activeBlock.marks
                        return (
                          <motion.button
                            key={v}
                            whileTap={{ scale: 0.88 }}
                            onClick={() => {
                              setMark(activeBlock.id, v)
                              // Auto advance after short delay
                              if (activeIndex < questionBlocks.length - 1) {
                                setTimeout(() => navQuestion(1), 350)
                              }
                            }}
                            className="aspect-square rounded-2xl font-black text-lg flex items-center justify-center transition-all border-2"
                            style={{
                              background: isSelected
                                ? isFull ? '#10B981' : isZero ? '#EF4444' : 'var(--primary)'
                                : 'var(--input)',
                              color: isSelected ? 'white' : 'var(--text-muted)',
                              borderColor: isSelected
                                ? isFull ? '#10B981' : isZero ? '#EF4444' : 'var(--primary)'
                                : 'transparent',
                              boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                              transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                            }}
                          >
                            {v}
                          </motion.button>
                        )
                      })}
                    </div>
                  ) : (
                    /* High-mark question: quick picks + manual input */
                    <div className="space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        {[0, Math.floor(activeBlock.marks * 0.25), Math.floor(activeBlock.marks * 0.5), Math.floor(activeBlock.marks * 0.75), activeBlock.marks]
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .map(v => {
                            const isSelected = questionMarks[activeBlock.id] === v
                            return (
                              <motion.button
                                key={v}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setMark(activeBlock.id, v)}
                                className="flex-1 min-w-[48px] py-3 rounded-2xl font-black text-sm border-2 transition-all"
                                style={{
                                  background: isSelected ? 'var(--primary)' : 'var(--input)',
                                  color: isSelected ? 'white' : 'var(--text-muted)',
                                  borderColor: isSelected ? 'var(--primary)' : 'transparent'
                                }}
                              >
                                {v}
                              </motion.button>
                            )
                          })}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={activeBlock.marks}
                          value={questionMarks[activeBlock.id] ?? ''}
                          onChange={e => {
                            const raw = e.target.value
                            if (raw === '') {
                              setQuestionMarks(p => { const n = { ...p }; delete n[activeBlock.id]; return n })
                            } else {
                              const v = Math.min(activeBlock.marks, Math.max(0, Number(raw)))
                              if (!isNaN(v)) setMark(activeBlock.id, v)
                            }
                          }}
                          className="flex-1 h-12 rounded-2xl px-4 text-center font-black text-lg border-2 focus:outline-none focus:border-primary"
                          style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                          placeholder="Enter marks"
                        />
                        <span className="text-sm font-black shrink-0" style={{ color: 'var(--text-muted)' }}>/ {activeBlock.marks}</span>
                      </div>
                    </div>
                  )}

                  {/* Running total */}
                  <div className="flex items-center justify-between p-3 rounded-2xl"
                    style={{ background: 'var(--input)' }}>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Running Total</span>
                    <div className="flex items-center gap-1">
                      <span className="font-black text-base" style={{ color: getScoreColor(percentage) }}>{awardedMarks}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ {totalMarks}</span>
                      <span className="text-[10px] font-black ml-1" style={{ color: getScoreColor(percentage) }}>({percentage}%)</span>
                    </div>
                  </div>

                  {/* Per-question comment */}
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      <MessageSquare size={10} className="inline mr-1" />Comment on Q{activeIndex + 1}
                    </div>
                    <textarea
                      className="w-full rounded-xl p-2.5 text-xs resize-none border focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ background: 'var(--input)', color: 'var(--text)', borderColor: 'var(--card-border)' }}
                      rows={2}
                      value={questionComments[activeBlock.id] ?? ''}
                      onChange={e => setQuestionComments(p => ({ ...p, [activeBlock.id]: e.target.value }))}
                      placeholder="e.g. Good use of key terms, but missed the second marking point…"
                    />
                  </div>

                  {/* Navigation buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => navQuestion(-1)}
                      disabled={activeIndex <= 0}
                      className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wide border-2 transition-all disabled:opacity-30 flex items-center justify-center gap-1"
                      style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <button
                      onClick={() => navQuestion(1)}
                      disabled={activeIndex >= questionBlocks.length - 1}
                      className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wide transition-all disabled:opacity-30 flex items-center justify-center gap-1"
                      style={{ background: 'var(--primary)', color: 'white' }}>
                      Next <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Overall Feedback — always visible in strip */}
                  <div className="border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
                    <div className="text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <MessageSquare size={10} /> Overall Feedback
                    </div>
                    <textarea
                      className="w-full rounded-xl p-2.5 text-xs resize-none border focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ background: 'var(--input)', color: 'var(--text)', borderColor: 'var(--card-border)' }}
                      rows={3}
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder="Write overall encouraging feedback for this student…"
                    />
                  </div>

                  {/* Desktop: Annotation + Feedback + Summary */}
                  <div className="hidden lg:block space-y-4 border-t pt-4" style={{ borderColor: 'var(--card-border)' }}>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                        Annotation Canvas
                      </div>
                      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
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

                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                        Overall Feedback
                      </div>
                      <textarea
                        className="w-full rounded-2xl p-3 text-sm resize-none border focus:outline-none focus:ring-2 focus:ring-primary/20"
                        style={{ background: 'var(--input)', color: 'var(--text)', borderColor: 'var(--card-border)' }}
                        rows={3}
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        placeholder="Write encouraging feedback…"
                      />
                    </div>

                    {/* Marking summary */}
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                        Marking Summary
                      </div>
                      <div className="space-y-1 max-h-52 overflow-y-auto">
                        {questionBlocks.map((b, i) => {
                          const awarded = questionMarks[b.id] ?? 0
                          const pct = b.marks > 0 ? (awarded / b.marks) * 100 : 0
                          return (
                            <button key={b.id} onClick={() => setActiveBlockId(b.id)}
                              className="w-full flex items-center gap-2 p-2 rounded-xl transition-all text-left"
                              style={{ background: b.id === activeBlockId ? 'var(--primary-dim)' : 'var(--input)' }}>
                              <span className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black shrink-0"
                                style={{ background: 'var(--card)', color: 'var(--primary)' }}>{i + 1}</span>
                              <span className="flex-1 text-[11px] truncate" style={{ color: 'var(--text)' }}>
                                {b.question || 'Q'}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="w-12 h-1 rounded-full" style={{ background: 'var(--card-border)' }}>
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: getScoreColor(pct) }} />
                                </div>
                                <span className="text-[9px] font-black w-8 text-right" style={{ color: 'var(--text-muted)' }}>
                                  {awarded}/{b.marks}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center" style={{ color: 'var(--text-muted)' }}>
                  <p className="text-sm">Select a question to begin.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ RETURN CONFIRM MODAL ════════════════════════════════ */}
      <Modal isOpen={confirmReturn} onClose={() => setConfirmReturn(false)} title="Return to Student?" size="sm">
        <div className="space-y-4 py-2">
          <div className="text-center p-4 rounded-2xl" style={{ background: 'var(--input)' }}>
            <div className="text-4xl font-black mb-1" style={{ color: getScoreColor(percentage) }}>{awardedMarks}/{totalMarks}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {percentage}% · {submission?.student?.full_name}
            </div>
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

/* ─────────────────────────────────────────────────────────
   Document/Workbook Scoring Panel (shared sub-component)
───────────────────────────────────────────────────────── */
function DocScoringPanel({
  questionBlocks, questionMarks, totalMarks, awardedMarks, percentage,
  feedback, setFeedback, setMark, getScoreColor
}: {
  questionBlocks: WorksheetBlock[]
  questionMarks: Record<string, number>
  totalMarks: number
  awardedMarks: number
  percentage: number
  feedback: string
  setFeedback: (v: string) => void
  setMark: (id: string, v: number) => void
  getScoreColor: (pct: number) => string
}) {
  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Award Marks</div>
        <div className="font-black text-base" style={{ color: getScoreColor(percentage) }}>
          {awardedMarks} / {totalMarks} <span className="text-xs">({percentage}%)</span>
        </div>
      </div>

      {questionBlocks.length > 0 ? (
        <div className="space-y-3">
          {questionBlocks.map((b, i) => {
            const current = questionMarks[b.id]
            return (
              <div key={b.id} className="p-3 rounded-2xl border space-y-2"
                style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>Q{i + 1}: {b.question?.slice(0, 40) || '—'}</span>
                  <span className="text-[10px] font-black" style={{ color: 'var(--text-muted)' }}>/{b.marks}</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {b.marks <= 5 ? (
                    Array.from({ length: b.marks + 1 }, (_, v) => (
                      <motion.button
                        key={v}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => setMark(b.id, v)}
                        className="w-10 h-10 rounded-xl font-black text-sm border-2 transition-all"
                        style={{
                          background: current === v ? (v === 0 ? '#EF4444' : v === b.marks ? '#10B981' : 'var(--primary)') : 'var(--card)',
                          color: current === v ? 'white' : 'var(--text-muted)',
                          borderColor: current === v ? 'transparent' : 'var(--card-border)',
                        }}
                      >{v}</motion.button>
                    ))
                  ) : (
                    <input
                      type="number" min={0} max={b.marks}
                      value={current ?? ''}
                      onChange={e => {
                        const raw = e.target.value
                        if (raw === '') return
                        const v = Math.min(b.marks, Math.max(0, Number(raw)))
                        if (!isNaN(v)) setMark(b.id, v)
                      }}
                      className="w-full h-10 rounded-xl px-3 text-center font-black border-2 focus:outline-none focus:border-primary"
                      style={{ background: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                      placeholder={`0–${b.marks}`}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* No structured questions — manual total entry */
        <div className="p-5 rounded-3xl border text-center" style={{ background: 'var(--input)', borderColor: 'var(--card-border)' }}>
          <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Total Marks Awarded
          </div>
          <input
            type="number" min={0} max={totalMarks}
            value={awardedMarks || ''}
            onChange={e => {
              const raw = e.target.value
              if (raw === '') return
              const v = Math.min(totalMarks, Math.max(0, Number(raw)))
              if (!isNaN(v)) setMark('__total__', v)
            }}
            className="text-4xl font-black w-32 text-center bg-transparent focus:outline-none block mx-auto"
            style={{ color: 'var(--primary)' }}
          />
          <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>out of {totalMarks}</div>
        </div>
      )}

      {/* Feedback */}
      <div className="space-y-2 border-t pt-4" style={{ borderColor: 'var(--card-border)' }}>
        <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Overall Feedback
        </div>
        <textarea
          className="w-full rounded-2xl p-3 text-sm resize-none border focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{ background: 'var(--input)', color: 'var(--text)', borderColor: 'var(--card-border)' }}
          rows={4}
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="Write encouraging feedback…"
        />
      </div>
    </div>
  )
}
