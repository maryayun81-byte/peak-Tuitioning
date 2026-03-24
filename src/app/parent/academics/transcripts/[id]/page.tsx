'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Download, FileText, Printer, 
  Award, BookOpen, Star, Info, ShieldCheck
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

export default function ParentTranscriptDetailPage() {
  const params = useParams()
  const router = useRouter()
  const transcriptId = params.id as string
  const supabase = getSupabaseBrowserClient()
  const { selectedStudent } = useAuthStore()

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

    const toastId = toast.loading('Brewing luxury PDF...')
    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById(elementId)
          if (el) {
            el.style.width = '1200px'
            el.style.padding = '20px'
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
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
      
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
          <Link href="/parent/academics/transcripts">
            <button className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-[var(--input)] transition-colors" style={{ border: '1px solid var(--card-border)' }}>
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
             <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Official Dossier</span>
                <div className="w-1 h-1 rounded-full bg-indigo-500" />
             </div>
            <h1 className="text-2xl font-black">{transcript.exam_event?.name || transcript.title}</h1>
            <p className="text-sm text-muted-foreground">Certified Record for {transcript.student?.full_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="secondary" onClick={downloadPDF} className="rounded-xl h-12 px-6">
             <Download size={16} className="mr-2" /> Download Document
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Visual Transcript */}
        <div className="lg:col-span-2">
           <div id="transcript-render">
             <PremiumTranscript transcript={transcript} student={selectedStudent} />
           </div>
        </div>

        {/* Right Column: Insights & Quick Actions */}
        <div className="space-y-6">
           <Card className="p-8 rounded-[2rem] border-none shadow-xl">
             <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6"><Star size={18} className="text-indigo-500" /> Executive Summary</h3>
             <div className="space-y-6">
                <div className="flex justify-between items-end">
                   <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mean Performance</span>
                   <span className="font-black text-2xl text-indigo-600">
                      {transcript.average_score?.toFixed(1)}%
                   </span>
                </div>
                <div className="flex justify-between items-end">
                   <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Overall Grade</span>
                   <span className="font-black text-2xl text-emerald-600">
                      {transcript.overall_grade}
                   </span>
                </div>
                <div className="flex justify-between items-end">
                   <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Subject Count</span>
                   <span className="font-black text-lg">
                      {transcript.subject_results?.length || 0}
                   </span>
                </div>
                
                <div className="pt-6 border-t border-[var(--card-border)]">
                   <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-emerald-500" /> Authenticity Verified
                   </div>
                   <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                      This transcript is a certified digital record of academic performance. 
                      Rankings and remarks are verified by the Director of Academics.
                   </p>
                </div>
             </div>
           </Card>

           <Card className="p-8 rounded-[2rem] bg-indigo-600 text-white border-none shadow-2xl shadow-indigo-200/50">
             <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2 mb-4"><Printer size={18} /> Official Printout</h3>
             <p className="text-xs font-medium text-white/70 mb-6 leading-relaxed">
               Generate a high-resolution PDF dossier for physical records or external submission.
             </p>
             <Button variant="outline" className="w-full h-14 bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest" onClick={downloadPDF}>
               PRINT DISSETATION
             </Button>
           </Card>
        </div>
      </div>
    </div>
  )
}
