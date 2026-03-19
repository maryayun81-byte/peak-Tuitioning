'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Download, FileText, Printer, 
  Award, BookOpen, Star, Info
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'

export default function StudentTranscriptDetailPage() {
  const params = useParams()
  const router = useRouter()
  const transcriptId = params.id as string
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [transcript, setTranscript] = useState<any>(null)

  useEffect(() => {
    if (transcriptId) loadData()
  }, [transcriptId])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*, exam_event:exam_events(name, start_date)')
        .eq('id', transcriptId)
        .single()
      
      if (error) throw error
      setTranscript(data)
    } catch (err) {
      console.error('Error loading transcript detail:', err)
      toast.error('Could not load transcript.')
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async () => {
    const elementId = 'transcript-render'
    const element = document.getElementById(elementId)
    if (!element) return

    const toastId = toast.loading('Generating PDF...')
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Transcript_${transcript?.exam_event?.name || 'Academic_Report'}.pdf`)
      toast.success('Downloaded!', { id: toastId })
    } catch (err) {
      toast.error('Failed to generate PDF', { id: toastId })
    }
  }

  if (loading) return <div className="p-6"><SkeletonList count={10} /></div>
  if (!transcript) return <div className="p-20 text-center">Transcript not found.</div>

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/student/transcripts">
            <button className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-[var(--input)] transition-colors" style={{ border: '1px solid var(--card-border)' }}>
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-black">{transcript.exam_event?.name}</h1>
            <p className="text-sm text-muted-foreground">{formatDate(transcript.exam_event?.start_date)}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="secondary" onClick={downloadPDF}>
             <Download size={16} className="mr-2" /> Download PDF
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Visual Transcript */}
        <div className="lg:col-span-2">
           <Card className="overflow-hidden border-none shadow-2xl p-0">
             <div className="bg-white text-black p-8 sm:p-12 font-serif min-h-[800px]" id="transcript-render">
                <div className="text-center mb-12 border-b-2 border-black pb-6">
                   <h1 className="text-2xl font-bold uppercase tracking-widest">
                      {(transcript.branding_snapshot as any)?.school_name || 'Peak Performance Tutoring'}
                   </h1>
                   <p className="text-xs tracking-[0.2em] mt-2 opacity-60">OFFICIAL ACADEMIC TRANSCRIPT</p>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-12 text-sm">
                   <div>
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Student Information</div>
                      <div className="font-bold text-lg">{student?.full_name}</div>
                      <div className="opacity-70 mt-1">Admission #: {student?.admission_number}</div>
                   </div>
                   <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Academic Session</div>
                      <div className="font-bold text-lg">{transcript.exam_event?.name}</div>
                      <div className="opacity-70 mt-1">Date: {formatDate(transcript.created_at)}</div>
                   </div>
                </div>

                <table className="w-full text-sm border-collapse mb-12">
                   <thead>
                      <tr className="border-y-2 border-black bg-slate-50 uppercase text-[10px] font-black tracking-widest">
                         <th className="p-4 text-left">Subject / Course</th>
                         <th className="p-4 text-center">Mark (%)</th>
                         <th className="p-4 text-center">Grade</th>
                         <th className="p-4 text-left">Feedback</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y border-b-2 border-black">
                      {transcript.subject_results.map((res: any, i: number) => (
                        <tr key={i} className="group">
                           <td className="p-4 font-bold">{res.subject_name}</td>
                           <td className="p-4 text-center">{res.marks}</td>
                           <td className="p-4 text-center font-black">
                              <span className={res.grade === 'F' ? 'text-red-500' : ''}>{res.grade}</span>
                           </td>
                           <td className="p-4 italic text-xs leading-relaxed max-w-[200px]">{res.remark}</td>
                        </tr>
                      ))}
                   </tbody>
                   <tfoot className="bg-slate-50">
                      <tr className="font-black text-xs uppercase tracking-widest">
                         <td className="p-6">Performance Indices</td>
                         <td className="p-6 text-center text-lg">{transcript.total_marks?.toFixed(0)}</td>
                         <td className="p-6 text-center text-4xl">{transcript.overall_grade}</td>
                         <td className="p-6">
                            Average Score: <span className="text-lg">{transcript.average_score?.toFixed(1)}%</span>
                         </td>
                      </tr>
                   </tfoot>
                </table>

                <div className="space-y-8">
                   <div className="p-6 bg-slate-50 border-l-4 border-black italic">
                      <div className="text-[10px] font-black uppercase not-italic opacity-40 mb-2">Director General&apos;s Remarks</div>
                      <p className="text-sm leading-relaxed">{transcript.remarks || 'Excellent performance overall. Keep striving for greatness.'}</p>
                   </div>
                   
                   <div className="flex justify-between items-end pt-12">
                      <div className="text-center w-40">
                         <div className="border-t border-black pt-2 text-[10px] font-black uppercase tracking-widest">Director Signature</div>
                      </div>
                      <div className="w-24 h-24 rounded-full border-2 border-slate-200 flex items-center justify-center text-[10px] font-black uppercase opacity-20 rotate-[-15deg]">
                         School Stamp
                      </div>
                      <div className="text-center w-40">
                         <div className="border-t border-black pt-2 text-[10px] font-black uppercase tracking-widest">Verification Link</div>
                      </div>
                   </div>
                </div>
             </div>
           </Card>
        </div>

        {/* Right Column: Insights & Quick Actions */}
        <div className="space-y-6">
           <Card className="p-6">
             <h3 className="font-bold flex items-center gap-2 mb-4"><Star className="text-primary" /> Quick Summary</h3>
             <div className="space-y-4">
                <div className="flex justify-between">
                   <span className="text-xs text-muted-foreground">Highest Mark</span>
                   <span className="font-bold text-sm">
                      {Math.max(...transcript.subject_results.map((r: any) => r.marks))}%
                   </span>
                </div>
                <div className="flex justify-between">
                   <span className="text-xs text-muted-foreground">Subjects Passed</span>
                   <span className="font-bold text-sm">
                      {transcript.subject_results.filter((r: any) => r.grade !== 'F').length} / {transcript.subject_results.length}
                   </span>
                </div>
                <div className="pt-4 border-t border-[var(--card-border)]">
                   <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Overall Assessment</div>
                   <p className="text-xs font-semibold leading-relaxed">
                      You are performing in the top {transcript.overall_grade === 'A' ? '5%' : transcript.overall_grade === 'B' ? '15%' : 'tier'} of your class.
                   </p>
                </div>
             </div>
           </Card>

           <Card className="p-6 bg-[var(--primary-dim)] border-primary/20">
             <h3 className="font-bold flex items-center gap-2 mb-2"><Info size={16} /> Need a Physical Copy?</h3>
             <p className="text-xs text-muted-foreground mb-4 leading-relaxed">You can download this report as a high-quality PDF printout for your official records.</p>
             <Button variant="primary" className="w-full" onClick={downloadPDF}><Printer size={16} className="mr-2" /> Print Official PDF</Button>
           </Card>
        </div>
      </div>
    </div>
  )
}
