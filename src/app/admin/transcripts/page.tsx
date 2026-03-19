'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, Download, Send, Plus, Trash2, Eye, 
  User, FileCheck, Stamp, RefreshCw, AlertTriangle, 
  CheckCircle2, Search, Filter, Printer, Zap, Clock
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import type { Transcript, Student, ExamEvent, ExamMark, Subject, GradingSystem } from '@/types/database'
import { useSearchParams, useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

function AdminTranscriptsContent() {
  const supabase = getSupabaseBrowserClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialExamId = searchParams.get('examId') || ''

  // State
  const [exams, setExams] = useState<ExamEvent[]>([])
  const [selectedExamId, setSelectedExamId] = useState(initialExamId)
  const [students, setStudents] = useState<any[]>([])
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [gradingSystems, setGradingSystems] = useState<GradingSystem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [search, setSearch] = useState('')
  
  // UI State
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null)
  const [remarkValue, setRemarkValue] = useState('')

  useEffect(() => { loadInitialData() }, [])
  useEffect(() => { if (selectedExamId) loadExamData() }, [selectedExamId])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const { data: ex } = await supabase.from('exam_events').select('*, tuition_event:tuition_events(name)').in('status', ['closed', 'generated', 'published']).order('start_date', { ascending: false })
      const { data: gs } = await supabase.from('grading_systems').select('*')
      setExams(ex || [])
      setGradingSystems(gs || [])
    } finally {
      setLoading(false)
    }
  }

  const loadExamData = async () => {
    setLoading(true)
    try {
       // 1. Fetch transcripts for this exam
       const { data: tRes } = await supabase
         .from('transcripts')
         .select('*, student:students(full_name, admission_number, class:classes(name))')
         .eq('exam_event_id', selectedExamId)

       // 2. Fetch all students who *should* have transcripts (those registered for subjects in this tuition event)
       const exam = exams.find(e => e.id === selectedExamId)
       if (!exam) return

       // For now, let's get students who have marks in this exam
       const { data: marks } = await supabase
         .from('exam_marks')
         .select('student_id, student:students(id, full_name, admission_number, class:classes(name))')
         .eq('exam_event_id', selectedExamId)
       
       // Deduplicate students from marks
       const studentsFromMarks = Array.from(new Map(marks?.map(m => [m.student_id, m.student])).values())
       
       setTranscripts(tRes || [])
       setStudents(studentsFromMarks || [])
    } finally {
       setLoading(false)
    }
  }

  const computeGrade = (score: number, curriculumId?: string) => {
    if (!curriculumId) return 'N/A'
    const system = gradingSystems.find(s => s.curriculum_id === curriculumId)
    if (!system) return 'N/A'
    const grades = system.grades as any[]
    const match = grades.find(g => score >= g.min_mark && score <= g.max_mark)
    return match ? match.grade : 'F'
  }

  const generateTranscripts = async () => {
    if (!selectedExamId) return
    const exam = exams.find(e => e.id === selectedExamId)
    if (!exam) return

    setGenerating(true)
    const toastId = toast.loading('Generating transcripts...')
    
    try {
      // 1. Fetch all marks and student info
      const { data: allMarks } = await supabase
        .from('exam_marks')
        .select('*, student:students(*), subject:subjects(name, curriculum_id)')
        .eq('exam_event_id', selectedExamId)

      if (!allMarks?.length) {
        toast.error('No marks found for this exam.', { id: toastId })
        return
      }

      // Group marks by student
      const studentMap = new Map<string, any[]>()
      allMarks.forEach(m => {
        if (!studentMap.has(m.student_id)) studentMap.set(m.student_id, [])
        studentMap.get(m.student_id)!.push(m)
      })

      // Fetch branding config
      const { data: config } = await supabase.from('transcript_config').select('*').single()

      const newTranscripts = []
      for (const [studentId, marks] of studentMap.entries()) {
        const student = marks[0].student
        const total = marks.reduce((sum, m) => sum + (Number(m.marks) || 0), 0)
        const avg = total / marks.length
        
        const subjectResults = marks.map(m => ({
          subject_id: m.subject_id,
          subject_name: m.subject?.name || 'Unknown',
          marks: Number(m.marks),
          grade: computeGrade(Number(m.marks), exam.curriculum_id || m.subject?.curriculum_id),
          remark: m.teacher_remark || ''
        }))

        newTranscripts.push({
          student_id: studentId,
          exam_event_id: selectedExamId,
          tuition_event_id: exam.tuition_event_id,
          title: `${exam.name} Report - ${student.full_name}`,
          file_url: '', // Will be used for PDF link later
          subject_results: subjectResults,
          total_marks: total,
          average_score: avg,
          overall_grade: computeGrade(avg, exam.curriculum_id),
          branding_snapshot: config || {},
          is_published: false
        })
      }

      // Bulk upsert
      const { error } = await supabase
        .from('transcripts')
        .upsert(newTranscripts, { onConflict: 'student_id,exam_event_id' })

      if (error) throw error

      // Update exam status to 'generated'
      await supabase.from('exam_events').update({ status: 'generated' }).eq('id', selectedExamId)

      toast.success(`Generated ${newTranscripts.length} transcripts!`, { id: toastId })
      loadExamData()
      loadInitialData() // refresh exam statuses
    } catch (err: any) {
      console.error(err)
      toast.error('Generation failed: ' + err.message, { id: toastId })
    } finally {
      setGenerating(false)
    }
  }

  const handlePublishAll = async () => {
    if (!selectedExamId) return
    setPublishing(true)
    const { error } = await supabase
      .from('transcripts')
      .update({ is_published: true, published_at: new Date().toISOString() })
      .eq('exam_event_id', selectedExamId)
    
    if (error) toast.error('Publish failed')
    else {
      await supabase.from('exam_events').update({ status: 'published' }).eq('id', selectedExamId)
      toast.success('All transcripts published!')
      loadExamData()
      loadInitialData()
    }
    setPublishing(false)
  }

  const saveDirectorRemark = async () => {
    if (!selectedTranscript) return
    const { error } = await supabase
      .from('transcripts')
      .update({ remarks: remarkValue })
      .eq('id', selectedTranscript.id)
    
    if (error) toast.error('Save failed')
    else {
      toast.success('Remark added')
      setPreviewOpen(false)
      loadExamData()
    }
  }

  const downloadPDF = async (transcript: Transcript) => {
    // If not already in preview, we might need a hidden div or to open preview first.
    // For better UX, we'll use the already open preview if available, 
    // or quickly mount/unmount a hidden one if called from table.
    
    const elementId = 'transcript-preview'
    let element = document.getElementById(elementId)
    
    const wasOpen = previewOpen
    if (!element) {
      // Logic for bulk/direct download from table: 
      // We'll just open the preview first or use a hidden portal.
      // But for a cleaner implementation, we'll assume preview is open for now 
      // or open it programmatically.
      setSelectedTranscript(transcript)
      setPreviewOpen(true)
      // Wait for DOM
      setTimeout(() => downloadPDF(transcript), 100)
      return
    }

    const toastId = toast.loading('Generating PDF...')
    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const imgProps = pdf.getImageProperties(imgData)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Transcript_${(transcript as any).student?.admission_number || 'ST'}.pdf`)
      toast.success('PDF Downloaded!', { id: toastId })
    } catch (err) {
      toast.error('PDF Generation failed', { id: toastId })
    }
  }

  const filtered = useMemo(() => {
    return transcripts.filter(t => 
      (t as any).student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      (t as any).student?.admission_number?.toLowerCase().includes(search.toLowerCase())
    )
  }, [transcripts, search])

  const stats = useMemo(() => {
    return {
      total: students.length,
      generated: transcripts.length,
      published: transcripts.filter(t => t.is_published).length,
      missing: students.length - transcripts.length
    }
  }, [students, transcripts])

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Zap className="text-primary" /> Transcripts Center
          </h1>
          <p className="text-sm text-muted-foreground">Lifecycle: Generate → Review → Publish</p>
        </div>
        <div className="flex gap-2">
           <Select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} className="w-64">
              <option value="">Select Exam Event...</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.status.toUpperCase()})</option>
              ))}
           </Select>
           <Button variant="secondary" onClick={() => loadExamData()} disabled={!selectedExamId}>
             <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
           </Button>
        </div>
      </div>

      {selectedExamId ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Target Students" value={stats.total} icon={<User size={18} />} />
            <StatCard title="Generated" value={stats.generated} icon={<FileText size={18} />} />
            <StatCard title="Published" value={stats.published} icon={<FileCheck size={18} />} />
            <StatCard title="Pending Generation" value={stats.missing} icon={<Clock size={18} />} changeType={stats.missing > 0 ? 'down' : 'neutral'} />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="flex-1 w-full">
               <Input 
                 placeholder="Search student or admission #..." 
                 value={search} 
                 onChange={e => setSearch(e.target.value)}
                 leftIcon={<Search size={16} />}
               />
             </div>
             <div className="flex gap-2 w-full md:w-auto">
                <Button variant="primary" onClick={generateTranscripts} isLoading={generating} disabled={loading}>
                  <Zap size={16} className="mr-2" /> Generate All
                </Button>
                <Button variant="success" onClick={handlePublishAll} isLoading={publishing} disabled={loading || transcripts.length === 0}>
                   <Send size={16} className="mr-2" /> Publish All
                </Button>
             </div>
          </div>

          {loading ? <SkeletonList count={8} /> : (
            <Card className="overflow-hidden border-none shadow-xl shadow-blue-500/5">
               <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                     <thead className="bg-[var(--input)] text-muted-foreground uppercase text-[10px] font-black tracking-widest">
                        <tr>
                           <th className="px-6 py-4 text-left">Student</th>
                           <th className="px-6 py-4 text-left">Class</th>
                           <th className="px-6 py-4 text-center">Avg Score</th>
                           <th className="px-6 py-4 text-center">Grade</th>
                           <th className="px-6 py-4 text-center">Status</th>
                           <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-[var(--card-border)]">
                        {filtered.map(t => (
                          <tr key={t.id} className="hover:bg-[var(--bg)] transition-colors">
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs capitalize">
                                      {(t as any).student?.full_name[0]}
                                   </div>
                                   <div>
                                      <div className="font-bold">{(t as any).student?.full_name}</div>
                                      <div className="text-[10px] opacity-60">{(t as any).student?.admission_number}</div>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-4 opacity-70">{(t as any).student?.class?.name}</td>
                             <td className="px-6 py-4 text-center font-black">{t.average_score?.toFixed(1) || '0.0'}</td>
                             <td className="px-6 py-4 text-center">
                                <Badge variant={t.overall_grade === 'F' ? 'danger' : 'success'}>{t.overall_grade}</Badge>
                             </td>
                             <td className="px-6 py-4 text-center">
                                <Badge variant={t.is_published ? 'success' : 'warning'}>
                                   {t.is_published ? 'Published' : 'Draft'}
                                </Badge>
                             </td>
                             <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-1">
                                   <button 
                                     onClick={() => { setSelectedTranscript(t); setRemarkValue(t.remarks || ''); setPreviewOpen(true) }}
                                     className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                     title="Preview & Remarks"
                                   >
                                      <Eye size={16} />
                                   </button>
                                   <button 
                                     onClick={() => downloadPDF(t)}
                                     className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors" 
                                     title="Print PDF"
                                   >
                                      <Printer size={16} />
                                   </button>
                                </div>
                             </td>
                          </tr>
                        ))}
                        {transcripts.length === 0 && (
                          <tr>
                             <td colSpan={6} className="py-20 text-center">
                                <FileText className="mx-auto mb-3 opacity-20" size={48} />
                                <p className="text-muted-foreground font-medium">No transcripts generated for this exam yet.</p>
                                <Button variant="ghost" className="mt-4" onClick={generateTranscripts}>Click "Generate All" to begin</Button>
                             </td>
                          </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-20 text-center border-dashed border-2">
           <Stamp className="mx-auto mb-4 opacity-10" size={64} />
           <h2 className="text-xl font-bold opacity-40">Select an exam event to start</h2>
           <p className="text-sm opacity-30 mt-2">Transcripts are generated based on the marks recorded for a specific exam.</p>
        </Card>
      )}

      {/* Preview & Remark Modal */}
      <Modal 
        isOpen={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
        title="Review Transcript" 
        size="lg"
      >
        {selectedTranscript && (
          <div className="space-y-6">
             {/* Mock Transcript Layout */}
             <div className="p-8 bg-white text-black border shadow-sm rounded-sm font-serif" id="transcript-preview">
                <div className="text-center mb-8 border-b-2 border-black pb-4">
                   <h1 className="text-2xl font-bold uppercase">{(selectedTranscript.branding_snapshot as any)?.school_name || 'Peak Performance Tutoring'}</h1>
                   <p className="text-xs tracking-widest mt-1">Official Academic Report Card</p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
                   <div>
                      <div className="opacity-50 text-[10px] uppercase font-bold mb-1">Student Details</div>
                      <div className="font-bold">{(selectedTranscript as any).student?.full_name}</div>
                      <div>Adm: {(selectedTranscript as any).student?.admission_number}</div>
                      <div>Class: {(selectedTranscript as any).student?.class?.name}</div>
                   </div>
                   <div className="text-right">
                      <div className="opacity-50 text-[10px] uppercase font-bold mb-1">Exam Details</div>
                      <div className="font-bold">{exams.find(e => e.id === selectedExamId)?.name}</div>
                      <div>Date: {formatDate(selectedTranscript.created_at)}</div>
                   </div>
                </div>

                <table className="w-full text-xs border-collapse">
                   <thead>
                      <tr className="border-y-2 border-black bg-slate-50">
                         <th className="p-3 text-left">Subject</th>
                         <th className="p-3 text-center">Mark</th>
                         <th className="p-3 text-center">Grade</th>
                         <th className="p-3 text-left">Teacher&apos;s Remark</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y border-b-2 border-black">
                      {selectedTranscript.subject_results.map((res, i) => (
                        <tr key={i}>
                           <td className="p-3 font-bold">{res.subject_name}</td>
                           <td className="p-3 text-center">{res.marks}</td>
                           <td className="p-3 text-center font-bold">{res.grade}</td>
                           <td className="p-3 italic text-[10px]">{res.remark}</td>
                        </tr>
                      ))}
                   </tbody>
                   <tfoot>
                      <tr className="font-bold">
                         <td className="p-3">TOTAL / AVERAGE</td>
                         <td className="p-3 text-center">{selectedTranscript.total_marks?.toFixed(0)}</td>
                         <td className="p-3 text-center text-lg">{selectedTranscript.overall_grade}</td>
                         <td className="p-3">AVG: {selectedTranscript.average_score?.toFixed(1)}%</td>
                      </tr>
                   </tfoot>
                </table>

                <div className="mt-8 space-y-4">
                   <div className="p-4 border border-black/10 rounded-sm">
                      <div className="text-[10px] font-bold uppercase mb-2">Director&apos;s Remarks</div>
                      <p className="text-sm italic">{remarkValue || 'Pending remark...'}</p>
                   </div>
                   <div className="flex justify-between items-end pt-8">
                      <div className="text-center w-32 border-t border-black pt-2 text-[10px]">DIRECTOR SIGNATURE</div>
                      <div className="text-center w-32 border-t border-black pt-2 text-[10px]">SCHOOL STAMP</div>
                   </div>
                </div>
             </div>

             {/* Admin Control Pane */}
             <div className="p-6 bg-[var(--input)] rounded-2xl space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Modify Director Remarks</label>
                <textarea 
                  className="w-full p-4 rounded-xl text-sm border focus:ring-2 ring-primary outline-none"
                  rows={3}
                  value={remarkValue}
                  onChange={e => setRemarkValue(e.target.value)}
                  placeholder="Excellent results, keep up the momentum!"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" onClick={() => setPreviewOpen(false)}>Close</Button>
                  <Button variant="outline" onClick={() => downloadPDF(selectedTranscript)}>
                     <Download size={16} className="mr-2" /> Download PDF
                  </Button>
                  <Button onClick={saveDirectorRemark}>Save Remark & Update</Button>
                </div>
             </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default function AdminTranscripts() {
  return (
    <Suspense fallback={<div className="p-12 text-center opacity-40">Loading transcripts...</div>}>
      <AdminTranscriptsContent />
    </Suspense>
  )
}
