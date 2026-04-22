'use client'

import { useState, useEffect, useMemo, Suspense, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, 
  ChevronLeft,
  LayoutGrid,
  RefreshCw,
  Search,
  PlusCircle,
  Clock,
  CheckCircle2,
  FileText,
  Quote,
  Calendar,
  Layers,
  Award,
  Printer
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { TranscriptCollectionCard } from '@/components/admin/TranscriptCollectionCard'
import { TranscriptList } from '@/components/admin/TranscriptList'
import { PremiumTranscript } from '@/components/admin/PremiumTranscript'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import toast from 'react-hot-toast'
import type { Transcript, ExamEvent, TuitionEvent, GradingSystem } from '@/types/database'
import { ClassPerformanceSummary } from '@/components/admin/ClassPerformanceSummary'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

function TeacherTranscriptsContent() {
  const supabase = getSupabaseBrowserClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { teacher } = useAuthStore()

  // STATE
  const [tuitionEvents, setTuitionEvents] = useState<TuitionEvent[]>([])
  const [examEvents, setExamEvents] = useState<ExamEvent[]>([])
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [gradingSystems, setGradingSystems] = useState<GradingSystem[]>([])
  const [transcriptCounts, setTranscriptCounts] = useState<Record<string, number>>({})
  const [myClassIds, setMyClassIds] = useState<string[]>([])
  
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [view, setView] = useState<'collections' | 'manager'>('collections')
  
  // MODAL STATE
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null)
  const [remarkOpen, setRemarkOpen] = useState(false)
  const [tempRemark, setTempRemark] = useState('')
  const [isSavingRemark, setIsSavingRemark] = useState(false)
  const [previewScale, setPreviewScale] = useState(1)
  const [previewContentHeight, setPreviewContentHeight] = useState(0)
  const [isTranscriptReady, setIsTranscriptReady] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [isSummaryReady, setIsSummaryReady] = useState(false)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateScale = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.offsetWidth
        const scale = Math.min(1, (containerWidth - 32) / 1000)
        setPreviewScale(scale)
      }
    }
    if (previewOpen) {
      setTimeout(updateScale, 150)
      window.addEventListener('resize', updateScale)
    }
    return () => window.removeEventListener('resize', updateScale)
  }, [previewOpen])

  // Measure real content height after transcript renders
  useEffect(() => {
    if (!transcriptRef.current) return
    const ro = new ResizeObserver(() => {
      if (transcriptRef.current) {
        setPreviewContentHeight(transcriptRef.current.scrollHeight)
      }
    })
    ro.observe(transcriptRef.current)
    return () => ro.disconnect()
  }, [selectedTranscript, previewOpen])

  useEffect(() => {
    if (teacher?.id) {
      loadInitialData().then(() => {
        const examId = searchParams.get('examId')
        if (examId) {
          handleExamNavigation(examId)
        }
      })
    }
  }, [teacher?.id, searchParams])

  const handleExamNavigation = async (examId: string) => {
    try {
      const { data: exam } = await supabase
        .from('exam_events')
        .select('tuition_event_id')
        .eq('id', examId)
        .single()
      
      if (exam?.tuition_event_id) {
        setSelectedEventId(exam.tuition_event_id)
        setSelectedExamId(examId)
        setView('manager')
        loadTranscripts(exam.tuition_event_id, examId)
      }
    } catch (err) {
      console.error('Navigation error:', err)
    }
  }

  const loadInitialData = async () => {
    if (!teacher?.id) return
    setLoading(true)
    try {
      // 1. Get teacher's assigned classes
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select('class_id')
        .eq('teacher_id', teacher.id)
      
      const classIds = (assignments || []).map(a => a.class_id)
      setMyClassIds(classIds)

      // 2. Load global and specific data
      const [te, ee, gs, counts] = await Promise.all([
        supabase.from('tuition_events').select('*').order('start_date', { ascending: false }),
        supabase.from('exam_events').select('*'),
        supabase.from('grading_systems').select('*, scales:grading_scales(*)'),
        supabase.from('transcripts')
          .select('id, tuition_event_id, student:students(class_id)')
      ])

      setTuitionEvents(te.data || [])
      setExamEvents(ee.data || [])
      setGradingSystems(gs.data || [])
      
      // Filter counts only to teacher's classes
      const countMap: Record<string, number> = {}
      counts.data?.forEach((t: any) => {
        if (classIds.includes(t.student?.class_id)) {
          countMap[t.tuition_event_id] = (countMap[t.tuition_event_id] || 0) + 1
        }
      })
      setTranscriptCounts(countMap)
    } finally {
      setLoading(false)
    }
  }

  const loadTranscripts = async (eventId: string, examId?: string | null) => {
    if (!teacher?.id || myClassIds.length === 0) return
    setLoading(true)
    try {
      let query = supabase
        .from('transcripts')
        .select(`
          *,
          student:students(*, class:classes(*), curriculum:curriculums(*)),
          exam_event:exam_events(*)
        `)
        .eq('tuition_event_id', eventId)
        .in('student.class_id', myClassIds) // Security scope
        
      if (examId) {
        query = query.eq('exam_event_id', examId)
      }
      
      const { data } = await query
      setTranscripts(data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCollection = (id: string) => {
    setSelectedEventId(id)
    setView('manager')
    const collectionExams = examEvents.filter(e => e.tuition_event_id === id)
    const defaultExam = collectionExams.length > 0 ? collectionExams[0].id : null
    setSelectedExamId(defaultExam)
    
    if (defaultExam) {
      loadTranscripts(id, defaultExam)
    } else {
      setTranscripts([])
    }
  }

  const handleBack = () => {
    setView('collections')
    setSelectedEventId(null)
    setSelectedExamId(null)
    loadInitialData()
  }

  const computeGrade = (score: number, curriculumId: string, subjectId?: string, classId?: string, isOverall = false) => {
    let system = null
    if (isOverall) {
      system = gradingSystems.find(s => s.curriculum_id === curriculumId && (s as any).is_overall === true)
      if (!system) system = gradingSystems.find(s => s.curriculum_id === curriculumId && (s as any).is_default === true)
    } else {
      system = gradingSystems.find(s => s.curriculum_id === curriculumId && s.subject_id === subjectId && (s as any).class_id === classId)
      if (!system) system = gradingSystems.find(s => s.curriculum_id === curriculumId && s.subject_id === subjectId)
      if (!system) system = gradingSystems.find(s => s.curriculum_id === curriculumId && (s as any).is_default === true)
      if (!system) system = gradingSystems.find(s => s.curriculum_id === curriculumId)
    }

    if (!system || !system.scales) return 'N/A'
    const match = system.scales.find((s: any) => score >= s.min_score && score <= s.max_score)
    return match ? match.grade : 'F'
  }

  const regenerateAll = async () => {
    if (!selectedEventId || !selectedExamId || !teacher?.id) {
      toast.error('Missing context for generation')
      return
    }

    const toastId = toast.loading('Calculating rankings & generating transcripts...')
    try {
      // Fetch marks ONLY for students in teacher's assigned classes
      const { data: allMarks } = await supabase
        .from('exam_marks')
        .select(`
          *,
          student:students(*, class:classes(*), curriculum:curriculums(*)),
          exam_event:exam_events(*),
          subject:subjects(name, curriculum_id)
        `)
        .eq('exam_event_id', selectedExamId)
        .in('class_id', myClassIds)

      if (!allMarks?.length) {
        toast.error('No marks found for your assigned classes', { id: toastId })
        return
      }

      const { data: config } = await supabase.from('transcript_config').select('*').maybeSingle()

      const transcriptGroups = new Map<string, any[]>() 
      allMarks.forEach(m => {
        const key = `${m.exam_event_id}_${m.student_id}`
        if (!transcriptGroups.has(key)) transcriptGroups.set(key, [])
        transcriptGroups.get(key)!.push(m)
      })

      const rawTranscripts: any[] = []
      for (const [key, marks] of transcriptGroups.entries()) {
        const student = marks[0].student
        const exam = marks[0].exam_event
        const total = marks.reduce((sum, m) => sum + (Number(m.marks) || 0), 0)
        const avg = total / marks.length
        
        const subjResults = marks.map(m => ({
          subject_id: m.subject_id,
          subject_name: m.subject?.name || 'Unknown',
          marks: Number(m.marks),
          grade: m.grade || computeGrade(Number(m.marks), exam.curriculum_id || m.subject?.curriculum_id || '', m.subject_id, student.class_id),
          remark: m.teacher_remark || ''
        }))

        rawTranscripts.push({
          student_id: student.id,
          exam_event_id: exam.id,
          tuition_event_id: selectedEventId,
          subject_results: subjResults,
          total_marks: total,
          average_score: avg,
          overall_grade: computeGrade(avg, exam.curriculum_id || student.curriculum_id || student.class?.curriculum_id || '', undefined, student.class_id, true),
          branding_snapshot: config || {},
          class_id: student.class_id,
          curriculum_id: exam.curriculum_id || student.curriculum_id || student.class?.curriculum_id
        })
      }

      // Calculate Rankings (scoped to the list we just fetched)
      // Note: This matches rankings within the teacher's class set.
      rawTranscripts.sort((a,b) => b.average_score - a.average_score).forEach((t, i) => {
        t.class_rank = i + 1
        t.curriculum_rank = i + 1 // Scoped to teacher's view
      })

      const { error } = await supabase
        .from('transcripts')
        .upsert(rawTranscripts.map(({ class_id, curriculum_id, ...rest }) => rest), { 
          onConflict: 'student_id,exam_event_id' 
        })

      if (error) throw error
      toast.success('Generated your assigned transcripts!', { id: toastId })
      loadTranscripts(selectedEventId, selectedExamId)
    } catch (err: any) {
      console.error(err)
      toast.error('Failed: ' + err.message, { id: toastId })
    }
  }

  const downloadPDF = async (transcript: Transcript) => {
    const elementId = 'transcript-preview'
    let element = document.getElementById(elementId)
    
    if (!element) {
      setSelectedTranscript(transcript)
      setPreviewOpen(true)
      setTimeout(() => downloadPDF(transcript), 500)
      return
    }

    const toastId = toast.loading('Brewing luxury PDF...')
    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1000,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById(elementId)
          if (el) {
            el.style.width = '1000px'
            el.style.maxWidth = '1000px'
            el.style.minWidth = '1000px'
            el.style.height = 'auto'
            el.style.overflow = 'visible'
            el.style.padding = '0px'
            el.style.margin = '0px'
            el.style.transform = 'none'
          }
        }
      })
      
      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
      const safeName = (transcript.student?.full_name || 'Student').replace(/[^a-z0-9]/gi, '_')
      pdf.save(`Transcript_${safeName}.pdf`)
      toast.success('PDF Exported!', { id: toastId })
    } catch (err) {
      toast.error('PDF Failed', { id: toastId })
    }
  }

  const downloadImage = async (transcript: Transcript) => {
    const elementId = 'transcript-preview'
    let element = document.getElementById(elementId)
    if (!element) {
      setSelectedTranscript(transcript); setPreviewOpen(true)
      setTimeout(() => downloadImage(transcript), 500)
      return
    }
    const toastId = toast.loading('Capturing image...')
    try {
      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true, 
        backgroundColor: '#FDFBF7', 
        windowWidth: 1000,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById(elementId)
          if (el) {
            el.style.width = '1000px'
            el.style.maxWidth = '1000px'
            el.style.minWidth = '1000px'
            el.style.height = 'auto'
            el.style.overflow = 'visible'
            el.style.padding = '0px'
            el.style.margin = '0px'
            el.style.transform = 'none'
          }
        }
      })
      const link = document.createElement('a')
      link.download = `Transcript_${(transcript.student?.full_name || 'Student').replace(/ /g, '_')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Image Exported!', { id: toastId })
    } catch (err) {
      toast.error('Image Failed', { id: toastId })
    }
  }

  const downloadClassSummaryPDF = async () => {
    const elementId = 'class-summary-preview'
    const element = document.getElementById(elementId)
    if (!element) return

    const toastId = toast.loading('Brewing Class Summary PDF...')
    try {
      const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById(elementId)
          if (el) {
            el.style.width = 'fit-content'
            el.style.transform = 'none'
          }
        }
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3', 
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Class_Performance_Summary.pdf`)
      toast.success('Summary Exported!', { id: toastId })
    } catch (err) {
      toast.error('Export Failed', { id: toastId })
    }
  }

  const downloadClassSummaryImage = async () => {
    const elementId = 'class-summary-preview'
    const element = document.getElementById(elementId)
    if (!element) return

    const toastId = toast.loading('Capturing Class Summary...')
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById(elementId)
          if (el) {
            el.style.width = 'fit-content'
            el.style.transform = 'none'
          }
        }
      })

      const imgData = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `Class_Performance_Summary.png`
      link.href = imgData
      link.click()
      
      toast.success('Image Saved!', { id: toastId })
    } catch (err) {
      toast.error('Capture Failed', { id: toastId })
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24 transition-theme">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-[var(--text)] flex items-center gap-3">
               <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
                 <Zap size={24} />
               </div>
               My Class Transcripts
            </h1>
            <p className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-widest pl-1">Exams & Performance Management</p>
          </div>
          
          <AnimatePresence>
            {view === 'manager' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <Button variant="outline" onClick={handleBack} className="rounded-2xl px-6 font-bold uppercase tracking-widest text-xs border-[var(--card-border)] text-[var(--text)]">
                  <ChevronLeft size={16} className="mr-2" /> All Collections
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {loading ? (
          <SkeletonList count={8} />
        ) : (
          <AnimatePresence mode="wait">
             {view === 'collections' ? (
               <motion.div key="collections" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {tuitionEvents.map(event => (
                   <TranscriptCollectionCard 
                     key={event.id}
                     event={event}
                     transcriptCount={transcriptCounts[event.id] || 0}
                     onClick={() => handleSelectCollection(event.id)}
                   />
                 ))}
               </motion.div>
             ) : (
               <motion.div key="manager" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="bg-[var(--sidebar)] rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl border border-white/5 transition-theme">
                     <div className="relative">
                        <h2 className="text-4xl font-black mb-2 uppercase tracking-tight">Assigned Transcripts</h2>
                        <div className="flex flex-wrap items-center gap-3 mt-6">
                           <select 
                             value={selectedExamId || ''} 
                             onChange={e => { setSelectedExamId(e.target.value); loadTranscripts(selectedEventId!, e.target.value); }}
                             className="bg-white/10 border border-white/20 text-white text-xs font-bold rounded-2xl px-4 py-2 outline-none"
                           >
                             <option value="" className="text-black">All Assigned Exams</option>
                             {examEvents.filter(e => e.tuition_event_id === selectedEventId).map(e => (
                               <option key={e.id} value={e.id} className="text-black">{e.name}</option>
                             ))}
                           </select>

                           {transcripts.length > 0 && selectedExamId && (
                             <Button 
                              onClick={() => setSummaryOpen(true)}
                              variant="outline" 
                              className="bg-white/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-2xl px-6 font-black uppercase tracking-widest text-[10px]"
                             >
                               <Award size={14} className="mr-2" /> Export Class Summary
                             </Button>
                           )}
                        </div>
                     </div>
                  </div>

                  <TranscriptList 
                    transcripts={transcripts}
                    onPreview={t => { setSelectedTranscript(t); setPreviewOpen(true) }}
                    onDownload={downloadPDF}
                    onRegenerate={regenerateAll}
                    onBulkRegenerate={regenerateAll}
                    // Hide publish/delete for teachers if preferred, or keep if allowed by RLS
                    hideAdminPowers={!teacher?.is_class_teacher} 
                  />
               </motion.div>
             )}
          </AnimatePresence>
        )}
      </div>

      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title="Luxury Transcript Preview" size="lg">
        <div className="p-4 md:p-8 bg-[var(--bg)]/50 rounded-b-3xl overflow-hidden" ref={previewContainerRef}>
           <div
             style={{ 
               height: previewContentHeight ? `${previewContentHeight * previewScale}px` : 'auto',
               overflow: 'hidden',
               transition: 'height 0.3s ease'
             }}
           >
             <div
               ref={transcriptRef}
               id="transcript-preview"
               style={{ 
                 transformOrigin: 'top left',
                 transform: `scale(${previewScale})`,
                 width: '1000px',
               }}
             >
               {selectedTranscript && (
                 <PremiumTranscript 
                   transcript={selectedTranscript} 
                   onReady={setIsTranscriptReady} 
                 />
               )}
             </div>
           </div>
           <div className="mt-8 flex justify-end gap-3">
               <Button 
                 variant="outline" 
                 onClick={() => downloadImage(selectedTranscript!)} 
                 disabled={!isTranscriptReady}
                 className="rounded-2xl px-6 font-black text-xs text-[var(--text)] border-[var(--card-border)]"
               >
                 {!isTranscriptReady && <RefreshCw size={14} className="mr-2 animate-spin" />}
                 Download PNG
               </Button>
               <Button 
                 onClick={() => downloadPDF(selectedTranscript!)} 
                 disabled={!isTranscriptReady}
                 className="rounded-2xl px-8 font-black text-xs"
               >
                 {!isTranscriptReady && <RefreshCw size={14} className="mr-2 animate-spin" />}
                 Download PDF
               </Button>
           </div>
        </div>
      </Modal>

      {/* CLASS PERFORMANCE SUMMARY MODAL */}
      <Modal
        isOpen={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Class Performance Master Summary"
        size="lg"
      >
        <div className="p-4 overflow-auto bg-slate-100/50 rounded-b-3xl">
          <div 
            id="class-summary-preview"
            className="w-fit mx-auto"
          >
            <ClassPerformanceSummary 
              transcripts={transcripts} 
              onReady={setIsSummaryReady}
            />
          </div>
          
          <div className="mt-8 flex justify-center gap-4 pb-6">
             <Button 
               variant="outline" 
               onClick={downloadClassSummaryImage}
               disabled={!isSummaryReady}
               className="rounded-2xl px-8 uppercase tracking-widest font-black text-xs border-[var(--card-border)] bg-white text-[var(--text)]"
             >
               {!isSummaryReady && <RefreshCw size={14} className="mr-2 animate-spin" />}
               Download as Image
             </Button>
             <Button 
               onClick={downloadClassSummaryPDF}
               disabled={!isSummaryReady}
               className="rounded-2xl px-10 uppercase tracking-widest font-black text-xs shadow-xl shadow-[var(--primary)]/20"
             >
               {!isSummaryReady && <RefreshCw size={14} className="mr-2 animate-spin" />}
               Download Luxury PDF (A3)
             </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function TeacherTranscripts() {
  return (
    <Suspense fallback={<div className="p-12 text-center opacity-40 uppercase font-black tracking-widest text-xs">Initializing...</div>}>
      <TeacherTranscriptsContent />
    </Suspense>
  )
}
