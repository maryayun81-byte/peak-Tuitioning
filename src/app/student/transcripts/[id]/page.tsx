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
import { PremiumTranscript } from '@/components/admin/PremiumTranscript'

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
        .select(`
          *, 
          student:students(*, class:classes(*)),
          exam_event:exam_events(*)
        `)
        .eq('id', transcriptId)
        .single()
      
      if (error) throw error

      // SECURE FALLBACK: If student join fails (due to RLS differences on joins), 
      // fetch student manually if transcript.student is null but we have student context
      const transcriptData = data as any
      if (!transcriptData.student && student) {
        console.log('[Transcript] Join failed, performing manual student fetch fallback')
        const { data: sData } = await supabase
          .from('students')
          .select('*, class:classes(*)')
          .eq('id', transcriptData.student_id)
          .single()
        
        if (sData) {
          transcriptData.student = sData
        }
      }

      setTranscript(transcriptData)
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

    const toastId = toast.loading('Brewing luxury PDF...')
    try {
      const canvas = await html2canvas(element, {
        scale: 4,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById(elementId)
          if (el) {
            el.style.width = '1200px'
            el.style.padding = '20px'
            el.style.height = 'auto'
            el.style.overflow = 'visible'
            el.style.margin = '0px'
            el.style.transform = 'none'
          }
        }
      })
      
      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = imgWidth / imgHeight

      let width = pdfWidth
      let height = pdfWidth / ratio

      if (height > pdfHeight) {
        height = pdfHeight
        width = pdfHeight * ratio
      }

      const xOffset = (pdfWidth - width) / 2
      const yOffset = (pdfHeight - height) / 2
      
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, width, height, undefined, 'FAST')
      
      // Sanitize filename: replace spaces and weird characters with underscores
      const safeName = (transcript?.student?.full_name || 'Student').replace(/[^a-z0-9]/gi, '_')
      const safeTitle = (transcript?.exam_event?.name || 'Report').replace(/[^a-z0-9]/gi, '_')
      const filename = `Transcript_${safeName}_${safeTitle}.pdf`
      
      pdf.save(filename)
      
      toast.success('Delivered!', { id: toastId })
    } catch (err) {
      console.error('PDF error:', err)
      toast.error('PDF Failed', { id: toastId })
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
           <div id="transcript-render">
             <PremiumTranscript transcript={transcript} student={student} />
           </div>
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
