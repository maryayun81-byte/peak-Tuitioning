'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Download, Printer,
  Star, Info, Eye
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { PremiumTranscript } from '@/components/admin/PremiumTranscript'
import { TranscriptSnapshot } from '@/components/transcripts/TranscriptSnapshot'

export default function StudentTranscriptDetailPage() {
  const params = useParams()
  const router = useRouter()
  const transcriptId = params.id as string
  const supabase = getSupabaseBrowserClient()
  const { student } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [transcript, setTranscript] = useState<any>(null)
  const [showFull, setShowFull] = useState(false)

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
    // The full document must be rendered for capture — expand first if needed.
    if (!showFull) {
      setShowFull(true)
      setTimeout(downloadPDF, 700)
      return
    }
    const toastId = toast.loading('Building premium PDF...')
    try {
      const { downloadTranscriptPdf } = await import('@/lib/transcript-pdf')
      const safeName = (transcript?.student?.full_name || 'Student').replace(/[^a-z0-9]/gi, '_')
      const safeTitle = (transcript?.exam_event?.name || 'Report').replace(/[^a-z0-9]/gi, '_')
      await downloadTranscriptPdf('transcript-render', `Transcript_${safeName}_${safeTitle}.pdf`)
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
        {/* Left Column: document snapshot → full on demand */}
        <div className="lg:col-span-2 space-y-4">
           {!showFull ? (
             <button onClick={() => setShowFull(true)} className="block w-full max-w-sm mx-auto text-left group">
               <div className="transition-transform duration-300 group-hover:-translate-y-1">
                 <TranscriptSnapshot transcript={transcript} student={transcript.student || student} />
               </div>
               <p className="text-center text-xs font-black mt-3 group-hover:text-primary transition-colors" style={{ color: 'var(--primary)' }}>
                 <Eye size={13} className="inline mr-1" /> Tap to open full document
               </p>
             </button>
           ) : (
             <>
               <button
                 onClick={() => setShowFull(false)}
                 className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
               >
                 ← Back to snapshot
               </button>
               <div id="transcript-render" className="overflow-x-auto">
                 <div className="min-w-[640px]">
                   <PremiumTranscript transcript={transcript} student={student} />
                 </div>
               </div>
             </>
           )}
        </div>

        {/* Right Column: Insights & Quick Actions */}
        <div className="space-y-6">
           <Card className="p-6">
             <h3 className="font-bold flex items-center gap-2 mb-4"><Star className="text-primary" /> Quick Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                   <span className="text-xs text-muted-foreground">Highest Mark</span>
                   <span className="font-bold text-sm">
                      {(() => {
                        const vals = (transcript.subject_results || []).map((r: any) => Number(r.marks)).filter((v: number) => !isNaN(v))
                        return vals.length > 0 ? `${Math.max(...vals)}%` : '–'
                      })()}
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
