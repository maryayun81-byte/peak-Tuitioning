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
import type { Transcript, ExamEvent, TuitionEvent, GradingSystem, Curriculum, Class } from '@/types/database'
import { ClassPerformanceSummary } from '@/components/admin/ClassPerformanceSummary'
import { useSearchParams, useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

function AdminTranscriptsContent() {
  const supabase = getSupabaseBrowserClient()
  const searchParams = useSearchParams()
  const router = useRouter()

  // STATE
  const [tuitionEvents, setTuitionEvents] = useState<TuitionEvent[]>([])
  const [examEvents, setExamEvents] = useState<ExamEvent[]>([])
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [gradingSystems, setGradingSystems] = useState<GradingSystem[]>([])
  const [transcriptCounts, setTranscriptCounts] = useState<Record<string, number>>({})
  
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [view, setView] = useState<'collections' | 'manager'>('collections')
  
  // NEW FILTER STATES
  const [curriculums, setCurriculums] = useState<Curriculum[]>([])
  const [allClasses, setAllClasses] = useState<Class[]>([])
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string | 'all'>('all')
  const [selectedClassId, setSelectedClassId] = useState<string | 'all'>('all')
  const [selectedSubject, setSelectedSubject] = useState<string | 'all'>('all')
  
  // MODAL EXCLUSIVE STATE
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
  const summaryRef = useRef<HTMLDivElement>(null)
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
    loadCollections().then(() => {
      const examId = searchParams.get('examId')
      if (examId) {
        handleExamNavigation(examId)
      }
    })
  }, [searchParams])

  const handleExamNavigation = async (examId: string) => {
    try {
      // Find which tuition event this exam belongs to
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

  const loadCollections = async () => {
    setLoading(true)
    try {
      const [te, ee, gs, counts, currs, cls] = await Promise.all([
        supabase.from('tuition_events').select('*').order('start_date', { ascending: false }),
        supabase.from('exam_events').select('*'),
        supabase.from('grading_systems').select('*, scales:grading_scales(*)'),
        supabase.from('transcripts').select('tuition_event_id'),
        supabase.from('curriculums').select('*').order('name'),
        supabase.from('classes').select('*').order('name')
      ])

      setTuitionEvents(te.data || [])
      setExamEvents(ee.data || [])
      setGradingSystems(gs.data || [])
      setCurriculums(currs?.data || [])
      setAllClasses(cls?.data || [])
      
      const countMap: Record<string, number> = {}
      counts.data?.forEach((t: any) => {
        countMap[t.tuition_event_id] = (countMap[t.tuition_event_id] || 0) + 1
      })
      setTranscriptCounts(countMap)
    } finally {
      setLoading(false)
    }
  }

  const loadTranscripts = async (eventId: string, examId?: string | null) => {
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
    setSelectedCurriculumId('all')
    setSelectedClassId('all')
    setSelectedSubject('all')
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
    loadCollections()
  }

  // --- LOGIC ---

  // FILTERED DATA
  const filteredTranscripts = useMemo(() => {
    return transcripts.filter(t => {
      const student = t.student as any
      const matchCurriculum = selectedCurriculumId === 'all' || student?.curriculum_id === selectedCurriculumId
      const matchClass = selectedClassId === 'all' || student?.class_id === selectedClassId
      return matchCurriculum && matchClass
    })
  }, [transcripts, selectedCurriculumId, selectedClassId])

  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>()
    filteredTranscripts.forEach(t => {
      (t.subject_results as any[] || []).forEach(r => subjects.add(r.subject_name))
    })
    return Array.from(subjects).sort()
  }, [filteredTranscripts])

  const computeGrade = (score: number, curriculumId: string, subjectId?: string, classId?: string, isOverall = false) => {
    let system = null
    if (isOverall) {
      system = gradingSystems.find(s => s.curriculum_id === curriculumId && (s as any).is_overall === true)
      if (!system) {
        system = gradingSystems.find(s => s.curriculum_id === curriculumId && (s as any).is_default === true)
      }
    } else {
      system = gradingSystems.find(s => s.curriculum_id === curriculumId && s.subject_id === subjectId && (s as any).class_id === classId)
      if (!system) {
         system = gradingSystems.find(s => s.curriculum_id === curriculumId && s.subject_id === subjectId)
      }
      if (!system) {
         system = gradingSystems.find(s => s.curriculum_id === curriculumId && (s as any).is_default === true)
      }
      if (!system) {
         system = gradingSystems.find(s => s.curriculum_id === curriculumId)
      }
    }

    if (!system || !system.scales) return 'N/A'
    const match = system.scales.find((s: any) => score >= s.min_score && score <= s.max_score)
    return match ? match.grade : 'F'
  }

  const regenerateAll = async () => {
    if (!selectedEventId) return
    if (!selectedExamId) {
      toast.error('Please select an Exam Event below to generate transcripts.')
      return
    }
    const event = tuitionEvents.find(e => e.id === selectedEventId)
    if (!event) return

    const toastId = toast.loading('Calculating rankings & generating transcripts...')
    try {
      // 1. Fetch ALL marks for the specific exam_event
      const { data: allMarks } = await supabase
        .from('exam_marks')
        .select(`
          *,
          student:students(*, class:classes(*), curriculum:curriculums(*)),
          exam_event:exam_events(*),
          subject:subjects(name, curriculum_id)
        `)
        .eq('exam_event_id', selectedExamId)

      if (!allMarks?.length) {
        toast.error('No marks found for this tuition event', { id: toastId })
        return
      }

      // 2. Fetch config
      const { data: config } = await supabase.from('transcript_config').select('*').maybeSingle()

      // 3. Group marks by exam_event AND student
      // Transcripts are unique per (student, exam_event)
      const transcriptGroups = new Map<string, any[]>() 
      allMarks.forEach(m => {
        const key = `${m.exam_event_id}_${m.student_id}`
        if (!transcriptGroups.has(key)) transcriptGroups.set(key, [])
        transcriptGroups.get(key)!.push(m)
      })

      const rawTranscripts: any[] = []

      // 4. Calculate raw data for each transcript
      for (const [key, marks] of transcriptGroups.entries()) {
        const student = marks[0].student
        const exam = marks[0].exam_event
        const total = marks.reduce((sum, m) => sum + (Number(m.marks) || 0), 0)
        const avg = total / marks.length
        
        const subjResults = marks.map(m => ({
          subject_id: m.subject_id,
          subject_name: m.subject?.name || 'Unknown',
          marks: m.marks === -1 ? null : Number(m.marks),
          progress_summary: m.progress_summary || null,
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
          // Temporaries for ranking
          class_id: student.class_id,
          curriculum_id: exam.curriculum_id || student.curriculum_id || student.class?.curriculum_id
        })
      }

      // 5. CALCULATE RANKINGS
      // Rankings are within the same exam_event
      const examIds = Array.from(new Set(rawTranscripts.map(t => t.exam_event_id)))
      
      examIds.forEach(examId => {
        const examTranscripts = rawTranscripts.filter(t => t.exam_event_id === examId)
        
        // a. Class Ranking
        const classIds = Array.from(new Set(examTranscripts.map(t => t.class_id)))
        classIds.forEach(classId => {
          const classSet = examTranscripts
            .filter(t => t.class_id === classId)
            .sort((a, b) => b.average_score - a.average_score)
          
          classSet.forEach((t, index) => {
            t.class_rank = index + 1
          })
        })

        // b. Curriculum Ranking
        const curriculumIds = Array.from(new Set(examTranscripts.map(t => t.curriculum_id)))
        curriculumIds.forEach(currId => {
          const currSet = examTranscripts
            .filter(t => t.curriculum_id === currId)
            .sort((a, b) => b.average_score - a.average_score)
          
          currSet.forEach((t, index) => {
            t.curriculum_rank = index + 1
          })
        })
      })

      // 6. UPSERT
      const { error } = await supabase
        .from('transcripts')
        .upsert(rawTranscripts.map(({ class_id, curriculum_id, ...rest }) => rest), { 
          onConflict: 'student_id,exam_event_id' 
        })

      if (error) throw error
      toast.success('Successfully generated persistent transcripts with rankings!', { id: toastId })
      loadTranscripts(selectedEventId, selectedExamId)
    } catch (err: any) {
      console.error(err)
      toast.error('Failed: ' + err.message, { id: toastId })
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

  const downloadPDF = async (transcript: Transcript) => {
    const elementId = 'transcript-preview'
    let element = document.getElementById(elementId)
    
    if (!element) {
      setSelectedTranscript(transcript)
      setPreviewOpen(true)
      // Wait for modal to open and content to render
      setTimeout(() => downloadPDF(transcript), 500)
      return
    }

    const toastId = toast.loading('Brewing luxury PDF...')
    try {
      // 1. Capture the element with high scale for quality
      // and explicit dimensions to prevent cutoff
      const canvas = await html2canvas(element, {
        scale: 4, // Fixes poor quality blurriness
        useCORS: true, 
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
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
      
      // 2. Setup A4 Dimensions (in mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      // 3. Calculate Scaling to Fit One Page
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = imgWidth / imgHeight

      // We set the width to fit the page, and calculate height based on ratio
      let width = pdfWidth
      let height = pdfWidth / ratio

      // CRITICAL: If the calculated height is still longer than A4, 
      // we scale the whole thing down to fit the height instead.
      if (height > pdfHeight) {
        height = pdfHeight
        width = pdfHeight * ratio
      }

      // 4. Center it on the page
      const xOffset = (pdfWidth - width) / 2
      const yOffset = (pdfHeight - height) / 2
      
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, width, height, undefined, 'FAST')
      const safeName = (transcript.student?.full_name || 'Student').replace(/[^a-z0-9]/gi, '_')
      pdf.save(`Transcript_${safeName}.pdf`)
      
      toast.success('PDF Delivered!', { id: toastId })
    } catch (err) {
      console.error('PDF error:', err)
      toast.error('PDF Failed', { id: toastId })
    }
  }

  const downloadImage = async (transcript: Transcript) => {
    const elementId = 'transcript-preview'
    let element = document.getElementById(elementId)
    
    if (!element) {
      setSelectedTranscript(transcript)
      setPreviewOpen(true)
      setTimeout(() => downloadImage(transcript), 500)
      return
    }

    const toastId = toast.loading('Capturing high-res image...')
    try {
      const canvas = await html2canvas(element, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#FDFBF7',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
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

      const imgData = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      const safeName = (transcript.student?.full_name || 'Student').replace(/[^a-z0-9]/gi, '_')
      link.download = `Transcript_${safeName}.png`
      link.href = imgData
      link.click()
      
      toast.success('Image Exported!', { id: toastId })
    } catch (err) {
      console.error('Image capture error:', err)
      toast.error('Image Capture Failed', { id: toastId })
    }
  }

  const saveRemark = async () => {
    if (!selectedTranscript) return
    setIsSavingRemark(true)
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .update({ remarks: tempRemark })
        .eq('id', selectedTranscript.id)
        .select()
      
      if (error) throw error
      if (!data || data.length === 0) throw new Error('Database update rejected (possibly due to invalid ID or permissions).')
      
      toast.success('Remark updated')
      setRemarkOpen(false)
      // Update local state immediately for the preview
      setSelectedTranscript((prev: any) => prev ? { ...prev, remarks: tempRemark } : null)
      loadTranscripts(selectedEventId!, selectedExamId)
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Remark save failed')
    } finally {
      setIsSavingRemark(false)
    }
  }

  const deleteTranscript = async (t: Transcript) => {
     if (!confirm('Are you sure you want to delete this transcript?')) return
     const { error } = await supabase.from('transcripts').delete().eq('id', t.id)
     if (error) toast.error('Delete failed')
     else {
       toast.success('Deleted')
       loadTranscripts(selectedEventId!, selectedExamId)
     }
  }

  const bulkPublish = async () => {
    if (!selectedEventId) return
    const toastId = toast.loading('Publishing selected transcripts...')
    try {
      let query = supabase.from('transcripts').update({ 
        is_published: true,
        published_at: new Date().toISOString() 
      }).eq('tuition_event_id', selectedEventId)
      
      if (selectedExamId) query = query.eq('exam_event_id', selectedExamId)
      
      const { data: published, error } = await query.select('id, student_id, student:students(user_id)')

      if (error) throw error
      
      // SEND NOTIFICATIONS
      if (published && published.length > 0) {
        const notifications = published
          .map((p: any) => ({
            user_id: Array.isArray(p.student) ? p.student[0]?.user_id : p.student?.user_id,
            type: 'transcript_published',
            title: 'Academic Transcript Published',
            body: 'Your official academic transcript has been published and is now available in your portal.',
            related_id: p.id,
            data: { transcript_id: p.id }
          }))
          .filter(n => n.user_id)
        
        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications)
        }
      }

      toast.success('Transcripts published to students', { id: toastId })
      loadTranscripts(selectedEventId, selectedExamId)
    } catch (err) {
      toast.error('Failed to publish transcripts', { id: toastId })
    }
  }

  const togglePublish = async (t: Transcript) => {
    const toastId = toast.loading(`${t.is_published ? 'Unpublishing' : 'Publishing'} transcript...`)
    try {
      const willPublish = !t.is_published
      const { data, error } = await supabase
        .from('transcripts')
        .update({ 
          is_published: willPublish,
          published_at: willPublish ? new Date().toISOString() : null
        })
        .eq('id', t.id)
        .select('id, student:students(user_id)')
        .single()

      if (error) throw error

      const studentData = data as any
      if (willPublish && studentData?.student?.user_id) {
         await supabase.from('notifications').insert({
            user_id: studentData.student.user_id,
            type: 'transcript_published',
            title: 'Academic Transcript Published',
            body: 'Your official academic transcript has been published and is now available in your portal.',
            related_id: t.id,
            data: { transcript_id: t.id }
         })
      }

      toast.success(`Transcript ${t.is_published ? 'unpublished' : 'published'}`, { id: toastId })
      loadTranscripts(selectedEventId!, selectedExamId)
    } catch (err) {
      toast.error('Failed to update publishing status', { id: toastId })
    }
  }

  const bulkDelete = async () => {
     if (!confirm('EXTREME WARNING: You are about to delete ALL selected transcripts. Proceed?')) return
     let query = supabase.from('transcripts').delete().eq('tuition_event_id', selectedEventId)
     if (selectedExamId) query = query.eq('exam_event_id', selectedExamId)
     const { error } = await query
     if (error) toast.error('Bulk delete failed')
     else {
       toast.success('Transcripts cleared')
       loadTranscripts(selectedEventId!, selectedExamId)
     }
  }

  // --- RENDERING ---

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24 transition-theme">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-[var(--text)] flex items-center gap-3">
               <div className="w-12 h-12 bg-[var(--primary)] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[var(--primary)]/20">
                 <Zap size={24} />
               </div>
               Transcript Collections
            </h1>
            <p className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-widest pl-1">Premium Academic Management System</p>
          </div>
          
          <AnimatePresence mode="wait">
            {view === 'manager' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Button variant="outline" onClick={handleBack} className="rounded-2xl px-6 font-bold uppercase tracking-widest text-xs border-[var(--card-border)] text-[var(--text)]">
                  <ChevronLeft size={16} className="mr-2" /> Back to Collections
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="h-64 rounded-[2.5rem] bg-[var(--input)] animate-pulse" />
               <div className="h-64 rounded-[2.5rem] bg-[var(--input)] animate-pulse" />
               <div className="h-64 rounded-[2.5rem] bg-[var(--input)] animate-pulse" />
            </div>
            <SkeletonList count={8} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
             {view === 'collections' ? (
               <motion.div 
                 key="collections"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
               >
                 {tuitionEvents.map(event => (
                   <TranscriptCollectionCard 
                     key={event.id}
                     event={event}
                     transcriptCount={transcriptCounts[event.id] || 0}
                     onClick={() => handleSelectCollection(event.id)}
                   />
                 ))}
                 
                 {tuitionEvents.length === 0 && (
                   <div className="col-span-full py-32 text-center bg-[var(--card)] rounded-[3rem] border border-dashed border-[var(--card-border)] transition-theme">
                      <LayoutGrid className="mx-auto text-[var(--text-muted)] opacity-20 mb-6" size={64} />
                      <h2 className="text-xl font-black text-[var(--text)] uppercase mb-2">No Collections Found</h2>
                      <p className="text-[var(--text-muted)] text-sm font-medium">Create tuition events first to start organizing transcripts.</p>
                   </div>
                 )}
               </motion.div>
             ) : (
               <motion.div 
                 key="manager"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="space-y-8"
               >
                 <div className="bg-[var(--sidebar)] rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl border border-white/5 transition-theme">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--primary)]/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
                    <div className="relative">
                       <h2 className="text-4xl font-black mb-2 uppercase tracking-tight">Collection Management</h2>
                       <div className="flex flex-col gap-4 mt-6">
                          <div className="flex items-center gap-4 text-white/50">
                            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                               <LayoutGrid size={12} /> {tuitionEvents.find(e => e.id === selectedEventId)?.name}
                            </span>
                            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                               <FileText size={12} /> {transcripts.length} Transcripts
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-full md:w-64">
                              <select 
                                value={selectedExamId || ''} 
                                onChange={e => {
                                  setSelectedExamId(e.target.value)
                                  loadTranscripts(selectedEventId!, e.target.value)
                                }}
                                className="w-full bg-white/10 border border-white/20 text-white text-xs font-bold rounded-2xl px-4 py-2 outline-none appearance-none focus:ring-2 ring-white/30"
                              >
                                <option value="" className="text-black">All Exams in Collection</option>
                                {examEvents.filter(e => e.tuition_event_id === selectedEventId).map(e => (
                                  <option key={e.id} value={e.id} className="text-black">{e.name} ({e.status})</option>
                                ))}
                              </select>
                              <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                            </div>

                            {/* CURRICULUM FILTER */}
                            <div className="relative w-full md:w-48">
                              <select 
                                value={selectedCurriculumId} 
                                onChange={e => setSelectedCurriculumId(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 text-white text-xs font-bold rounded-2xl px-4 py-2 outline-none appearance-none focus:ring-2 ring-white/30"
                              >
                                <option value="all" className="text-black">All Curriculums</option>
                                {curriculums.map(c => (
                                  <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                                ))}
                              </select>
                              <Layers size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                            </div>

                            {/* CLASS FILTER */}
                            <div className="relative w-full md:w-48">
                              <select 
                                value={selectedClassId} 
                                onChange={e => setSelectedClassId(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 text-white text-xs font-bold rounded-2xl px-4 py-2 outline-none appearance-none focus:ring-2 ring-white/30"
                              >
                                <option value="all" className="text-black">All Classes</option>
                                {allClasses
                                  .filter(c => selectedCurriculumId === 'all' || c.curriculum_id === selectedCurriculumId)
                                  .map(c => (
                                    <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                                  ))
                                }
                              </select>
                              <Award size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                            </div>

                            {/* SUBJECT FILTER */}
                            <div className="relative w-full md:w-48">
                              <select 
                                value={selectedSubject} 
                                onChange={e => setSelectedSubject(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 text-white text-xs font-bold rounded-2xl px-4 py-2 outline-none appearance-none focus:ring-2 ring-white/30"
                              >
                                <option value="all" className="text-black">All Subjects Summary</option>
                                {availableSubjects.map(sub => (
                                  <option key={sub} value={sub} className="text-black">{sub}</option>
                                ))}
                              </select>
                              <Quote size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                            </div>
                            
                            {!selectedExamId && transcripts.length === 0 && (
                              <div className="text-xs font-medium text-amber-200 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                                Please select an exam to view or generate transcripts.
                              </div>
                            )}
                              {filteredTranscripts.length > 0 && selectedExamId && (
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
                </div>

                  <TranscriptList 
                    transcripts={filteredTranscripts}
                    onPreview={t => { setSelectedTranscript(t); setPreviewOpen(true) }}
                    onDownload={downloadPDF}
                    onDelete={deleteTranscript}
                    onRegenerate={t => regenerateAll()} // Simplified for bulk
                    onBulkRegenerate={regenerateAll}
                    onBulkDelete={bulkDelete}
                    onUpdateRemark={t => { setSelectedTranscript(t); setTempRemark(t.remarks || ''); setRemarkOpen(true) }}
                    onPublishIndividual={togglePublish}
                    onBulkPublish={bulkPublish}
                  />
               </motion.div>
             )}
          </AnimatePresence>
        )}
      </div>

      {/* PREVIEW MODAL */}
      <Modal 
        isOpen={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
        title="Transcript Mastery Preview" 
        size="lg"
      >
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
                className="rounded-2xl px-6 uppercase tracking-widest font-black text-xs text-[var(--text)] border-[var(--card-border)]"
               >
                  {!isTranscriptReady ? <RefreshCw size={14} className="mr-2 animate-spin" /> : null}
                  Download PNG
               </Button>
               <Button 
                onClick={() => downloadPDF(selectedTranscript!)} 
                disabled={!isTranscriptReady}
                className="rounded-2xl px-8 uppercase tracking-widest font-black text-xs shadow-xl shadow-[var(--primary)]/20"
               >
                  {!isTranscriptReady ? <RefreshCw size={14} className="mr-2 animate-spin" /> : (
                    <Printer size={16} className="mr-2" />
                  )}
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
              transcripts={filteredTranscripts} 
              filterSubject={selectedSubject !== 'all' ? selectedSubject : undefined}
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

      {/* REMARK MODAL */}
      <Modal
        isOpen={remarkOpen}
        onClose={() => setRemarkOpen(false)}
        title="Admin Remarks"
        size="md"
      >
        <div className="p-6 space-y-6 bg-[var(--card)] rounded-b-3xl transition-theme">
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 px-1">Director&apos;s Comment</p>
              <textarea 
                className="w-full h-40 p-6 rounded-[2rem] bg-[var(--input)] border border-[var(--card-border)] text-[var(--text)] font-medium text-sm focus:ring-4 ring-[var(--primary)]/10 outline-none resize-none transition-all placeholder:text-[var(--text-muted)]/50"
                placeholder="Enter overall student feedback..."
                value={tempRemark}
                onChange={e => setTempRemark(e.target.value)}
              />
           </div>
           <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRemarkOpen(false)} disabled={isSavingRemark} className="rounded-2xl text-[var(--text)] border-[var(--card-border)]">Cancel</Button>
              <Button onClick={saveRemark} isLoading={isSavingRemark} className="rounded-2xl px-8 shadow-lg shadow-[var(--primary)]/20">Save & Commit</Button>
           </div>
        </div>
      </Modal>
    </div>
  )
}

export default function AdminTranscripts() {
  return (
    <Suspense fallback={<div className="p-12 text-center opacity-40 uppercase font-black tracking-widest text-xs">Initializing Transcript Engine...</div>}>
      <AdminTranscriptsContent />
    </Suspense>
  )
}
