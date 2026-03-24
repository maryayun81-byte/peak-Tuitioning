'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  FileText, Calendar, Download, Search, 
  Award, ChevronRight, Filter, RefreshCw,
  Clock, ShieldCheck, ArrowRight
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Card, Badge, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/ui/Skeleton'
import { PremiumTranscript } from '@/components/admin/PremiumTranscript'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

export default function ParentTranscriptsPage() {
  const supabase = getSupabaseBrowserClient()
  const { selectedStudent } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [transcripts, setTranscripts] = useState<any[]>([])
  const [activeTranscript, setActiveTranscript] = useState<any>(null)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set()) // This state is no longer used in the new UI, but keeping it for now as it's not explicitly removed in the diff.
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedStudent?.id) loadTranscripts()
  }, [selectedStudent])

  const loadTranscripts = async () => {
    if (!selectedStudent?.id) {
       setLoading(false)
       return
    }
    
    setLoading(true)
    setError(null)
    try {
      console.log('[ParentTranscripts] Loading for student:', selectedStudent.id)
      
      const { data, error } = await supabase
        .from('transcripts')
        .select(`
          *,
          tuition_event:tuition_events(id, name, start_date, end_date),
          exam_event:exam_events(id, name, status),
          student:students(*, class:classes(name))
        `)
        .eq('student_id', selectedStudent.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      console.log('[ParentTranscripts] Loaded transcripts:', data?.length || 0)
      setTranscripts(data || [])
      // Auto-expand all tuition event groups - This logic is no longer relevant for the new UI, but keeping it as it's not explicitly removed.
      const eventIds = new Set(
        (data || []).map((t: any) => t.exam_event?.tuition_event?.id).filter(Boolean)
      ) as Set<string>
      setExpandedEvents(eventIds)
    } catch (err: any) {
      console.error('[ParentTranscripts] Error:', err)
      setError(err.message || 'Failed to sync transcripts')
      toast.error('Sync Error: Authentication or database timeout.')
    } finally {
      setLoading(false)
    }
  }

  // Group transcripts by tuition_event
  const grouped = useMemo(() => {
    const map = new Map<string, { event: any; transcripts: any[] }>()
    for (const t of transcripts) {
      // Prioritize tuition_event directly on transcript, then via exam_event
      const te = t.tuition_event || t.exam_event?.tuition_event
      const key = te?.id ?? '__none__'
      if (!map.has(key)) {
        map.set(key, {
          event: te ?? { id: '__none__', name: 'Uncategorised', start_date: null, end_date: null },
          transcripts: [],
        })
      }
      map.get(key)!.transcripts.push(t)
    }
    return Array.from(map.values())
  }, [transcripts])

  // This function is no longer used in the new UI, but keeping it as it's not explicitly removed.
  const toggleEvent = (id: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const downloadPDF = async (transcript: any) => {
    // The original code used `activeTranscript` and `transcriptRef`.
    // The new UI implies direct download from the list, so we need to render the PremiumTranscript temporarily or use a different approach.
    // For simplicity and to match the diff's intent of passing `t` to `downloadPDF(t)`, we'll assume `activeTranscript` is set for the duration of the download or the PremiumTranscript component can take a prop.
    // Since the diff removes the `activeTranscript` view, we'll need to adapt.
    // A common pattern is to render the component off-screen or in a temporary div for `html2canvas`.
    // For now, I'll keep the `transcriptRef` and `activeTranscript` logic, but the `activeTranscript` would need to be set before calling this.
    // The diff implies `downloadPDF(t)` is called directly, so `activeTranscript` would need to be `t`.
    setActiveTranscript(transcript); // Temporarily set activeTranscript for the ref to pick up.

    // Wait for the state to update and component to potentially re-render if it relies on activeTranscript
    // Increased timeout to 800ms to ensure fonts and data are fully painted before capture
    await new Promise(resolve => setTimeout(resolve, 800)); 

    if (!transcriptRef.current || !transcript) {
      toast.error('Transcript data not available for PDF generation.');
      return;
    }
    setDownloading(true)
    const toastId = toast.loading('Generating PDF…')
    try {
      const element = transcriptRef.current
      const canvas = await html2canvas(element, {
        scale: 4, // Higher scale for even better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        onclone: (doc) => {
          const el = doc.getElementById('transcript-pdf-target')
          if (el) {
            el.style.display = 'block' // Ensure it's rendered for canvas
            el.style.width = '1200px'
            el.style.padding = '40px'
          }
        },
      })

      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      // Split into pages if content is tall
      const pageHeight = pdf.internal.pageSize.getHeight()
      let y = 0
      while (y < pdfHeight) {
        if (y > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -y, pdfWidth, pdfHeight, undefined, 'FAST')
        y += pageHeight
      }

      const safeName = (selectedStudent?.full_name || 'Student').replace(/[^a-z0-9]/gi, '_')
      const safeExam = (transcript.exam_event?.name || 'Exam').replace(/[^a-z0-9]/gi, '_')
      pdf.save(`Transcript_${safeName}_${safeExam}.pdf`)
      toast.success('PDF downloaded!', { id: toastId })
    } catch (err) {
      console.error('[PDF Export]', err)
      toast.error('PDF export failed', { id: toastId })
    } finally {
      setDownloading(false)
      setActiveTranscript(null); // Clear activeTranscript after download
    }
  }

  // The original `if (loading)` block is replaced by the new structure.
  // The original `if (activeTranscript)` block is entirely removed.

  // ── Dossier List View (grouped by tuition event) ────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-10 pb-40 transition-theme">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full w-fit border" style={{ background: 'var(--input)', color: 'var(--primary)', borderColor: 'var(--card-border)' }}>
            <Award size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Credential Repository</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase italic" style={{ color: 'var(--text)' }}>
             Academic Credentials
          </h1>
          <p className="font-bold text-sm uppercase tracking-wide max-w-xl" style={{ color: 'var(--text-muted)' }}>
             Verified transcript telemetry for <span className="text-indigo-600">{selectedStudent?.full_name}</span>. Access certified PDF exports and performance records.
          </p>
        </div>

        <div className="flex items-center gap-3">
           <Button 
             variant="outline" 
             onClick={loadTranscripts}
             className="rounded-2xl border-dashed h-12 px-6 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] hover:text-indigo-600 hover:border-indigo-500/30 transition-all"
           >
              <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Sync Data
           </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-8 mt-10">
          <SkeletonList count={3} />
        </div>
      ) : error ? (
        <Card className="p-20 text-center border-2 border-dashed border-rose-200 rounded-[3rem] space-y-6 max-w-xl mx-auto bg-rose-50/50">
           <div className="w-20 h-20 rounded-[2rem] bg-rose-100 flex items-center justify-center mx-auto text-rose-500">
              <RefreshCw size={40} />
           </div>
           <div className="space-y-2">
              <h2 className="text-2xl font-black text-rose-600 uppercase italic">Sync Connection Interrupted</h2>
              <p className="text-xs font-bold text-rose-400 uppercase tracking-widest leading-relaxed">
                 We couldn&apos;t establish a secure handshake with the records engine. This usually resolves after a manual sync.
              </p>
           </div>
           <Button onClick={loadTranscripts} className="h-14 px-10 rounded-2xl bg-rose-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">
              RETRY CONNECTION
           </Button>
        </Card>
      ) : transcripts.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-8">
           <div className="w-28 h-28 rounded-[2.5rem] bg-[var(--input)] flex items-center justify-center text-[var(--text-muted)] opacity-20 relative">
              <FileText size={64} />
              <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xl border border-slate-100">
                 <ShieldCheck size={20} className="text-emerald-500" />
              </div>
           </div>
           <div className="text-center space-y-3 max-w-sm">
              <h3 className="text-2xl font-black uppercase tracking-tighter italic" style={{ color: 'var(--text)' }}>No Published Records</h3>
              <p className="text-xs font-bold uppercase tracking-widest leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                 The academic board hasn&apos;t authorized any public transcripts for this student yet. Verified documents will appear here automatically.
              </p>
           </div>
           <button 
             onClick={loadTranscripts}
             className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-2"
           >
              RE-SCAN RECORDS <ArrowRight size={14} />
           </button>
        </div>
      ) : (
        <div className="space-y-16">
          {grouped.map(({ event, transcripts: items }) => (
            <div key={event.id} className="space-y-8">
              <div className="flex items-center gap-4">
                 <div className="h-px flex-1 bg-[var(--card-border)]" />
                 <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] flex items-center gap-3">
                    <Calendar size={14} /> {event.name} Collection
                 </h2>
                 <div className="h-px flex-1 bg-[var(--card-border)]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {items.map((t, i) => (
                  <motion.div 
                    key={t.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="group p-8 sm:p-10 rounded-[3rem] border shadow-sm hover:shadow-2xl transition-all duration-700 flex flex-col justify-between h-full relative overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                       <div className="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none">
                          <Award size={120} className="text-indigo-400 -rotate-12 translate-x-10 -translate-y-10" />
                       </div>

                       <div className="space-y-8">
                          <div className="flex items-start justify-between">
                             <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 italic">
                                     {t.exam_event?.name ?? 'Official Examination'}
                                   </p>
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-none" style={{ color: 'var(--text)' }}>
                                   {t.title || 'Academic Transcript'}
                                </h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                   Published: {new Date(t.published_at!).toLocaleDateString()}
                                </p>
                             </div>
                             <div className="w-14 h-14 rounded-2xl bg-[var(--input)] flex items-center justify-center text-indigo-500 group-hover:scale-110 group-hover:rotate-3 transition-all">
                                <FileText size={24} />
                             </div>
                          </div>

                          <div className="flex items-center gap-8 py-6 border-y border-[var(--card-border)]">
                             <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Aggregate</p>
                                <p className="text-2xl font-black italic tracking-tight" style={{ color: 'var(--text)' }}>{t.average_score?.toFixed(1) ?? '0.0'}%</p>
                             </div>
                             <div className="w-px h-10 bg-[var(--card-border)]" />
                             <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Grade</p>
                                <p className="text-2xl font-black italic tracking-tight text-indigo-600">{t.overall_grade || 'N/A'}</p>
                             </div>
                             <div className="w-px h-10 bg-[var(--card-border)] hidden sm:block" />
                             <div className="space-y-1 hidden sm:block">
                                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Subjects</p>
                                <p className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--text)' }}>{t.subject_results?.length || 0} Records</p>
                             </div>
                          </div>
                       </div>

                        <div className="mt-8 flex items-center gap-3">
                           <Button 
                             onClick={() => downloadPDF(t)}
                             className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest shadow-lg transition-all border-none"
                           >
                              <Download size={14} className="mr-2" /> Download Document
                           </Button>
                           <Link href={`/parent/academics/transcripts/${t.id}`}>
                              <Button 
                                variant="outline"
                                className="h-12 px-6 rounded-xl border-[var(--card-border)] bg-[var(--input)] text-[var(--text)] hover:bg-indigo-50 hover:text-indigo-600 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center shrink-0"
                              >
                                 View Dossier <ArrowRight size={14} className="ml-2" />
                              </Button>
                           </Link>
                        </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden Transcript for PDF Rendering (Off-screen, not display:none) */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <div ref={transcriptRef} id="transcript-pdf-target" className="bg-white p-10">
          {activeTranscript && (
            <PremiumTranscript 
              transcript={activeTranscript} 
              student={selectedStudent} 
            />
          )}
        </div>
      </div>
    </div>
  )
}
