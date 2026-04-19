'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  RefreshCw, 
  FileText, 
  Download, 
  Eye, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Image as ImageIcon
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, Badge } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SkeletonList } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

export default function AdminCredentialsPage() {
  const supabase = getSupabaseBrowserClient()
  const [batches, setBatches] = useState<any[]>([])
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [summary, setSummary] = useState<any | null>(null)
  const [previewBatch, setPreviewBatch] = useState<any | null>(null)
  const [generationErrors, setGenerationErrors] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [bRes, dRes, eRes] = await Promise.all([
        supabase
          .from('credential_batches')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('duplicate_flags')
          .select('*, registration:event_registrations(*)')
          .eq('status', 'pending'),
        supabase
          .from('tuition_events')
          .select('id, name')
          .order('start_date', { ascending: false })
      ])

      setBatches(bRes.data || [])
      setDuplicates(dRes.data || [])
      setEvents(eRes.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load credentials data.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setProcessing(true)
    setSummary(null)
    setGenerationErrors([])
    const toastId = toast.loading('Scanning registrations and generating accounts...')
    
    try {
      const response = await fetch('/api/admin/generate-from-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: selectedEventId || undefined })
      })

      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Generation failed')

      setSummary(result.summary)
      if (result.errors && result.errors.length > 0) {
        setGenerationErrors(result.errors)
        toast.error(`Completed with ${result.errors.length} failures.`, { id: toastId })
      } else {
        toast.success(result.message || 'Generation complete!', { id: toastId })
      }
      loadData()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Something went wrong', { id: toastId })
    } finally {
      setProcessing(false)
    }
  }

  const handleResolveDuplicate = async (flagId: string, regId: string, studentId: string | null) => {
    try {
      if (studentId) {
        // Link manually
        const { error: linkError } = await supabase
          .from('event_registrations')
          .update({ student_id: studentId })
          .eq('id', regId)
        
        if (linkError) throw linkError
        toast.success('Successfully linked student.')
      } else {
        // Ignore (Allow future manual creation or just skip)
        toast.success('Duplicate ignored.')
      }

      await supabase
        .from('duplicate_flags')
        .update({ status: studentId ? 'resolved' : 'ignored' })
        .eq('id', flagId)
      
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Resolution failed.')
    }
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Credential Management
          </h1>
          <p className="text-[var(--text-muted)] mt-2 font-medium">
            Automate student account creation and generate login credential batches.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="px-4 py-2.5 rounded-xl border-none outline-none font-bold text-sm bg-[var(--input)] text-[var(--text)] min-w-[200px]"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            <option value="">All Active Events</option>
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <Button 
            onClick={handleGenerate} 
            isLoading={processing}
            disabled={processing}
            className="px-8 shadow-lg shadow-primary/20"
          >
            <RefreshCw size={18} className={processing ? 'animate-spin' : ''} />
            Generate Accounts
          </Button>
        </div>
      </div>

      {loading ? (
        <SkeletonList count={3} />
      ) : (
        <>
          {/* Summary Cards */}
          <AnimatePresence>
            {summary && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                <SummaryCard label="Processed" value={summary.processed} icon={<Users size={20} />} color="#6366F1" />
                <SummaryCard label="Created" value={summary.created} icon={<CheckCircle2 size={20} />} color="#10B981" />
                <SummaryCard label="Existing Linked" value={summary.linked} icon={<ShieldCheck size={20} />} color="#3B82F6" />
                <SummaryCard label="Flagged" value={summary.flagged} icon={<AlertTriangle size={20} />} color="#F59E0B" />
                {summary.failed > 0 && (
                  <SummaryCard label="Failed" value={summary.failed} icon={<AlertTriangle size={20} />} color="#EF4444" />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Duplicates Review */}
            <div className="lg:col-span-1 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black flex items-center gap-2">
                  <AlertTriangle className="text-amber-500" size={20} />
                  Pending Review
                  <Badge variant="warning" className="ml-2">{duplicates.length}</Badge>
                </h2>
              </div>
              
              {duplicates.length === 0 ? (
                <Card className="p-8 text-center flex flex-col items-center justify-center border-dashed">
                  <CheckCircle2 size={40} className="text-emerald-500/20 mb-3" />
                  <p className="text-sm font-bold text-[var(--text-muted)]">All clear! No pending duplicates.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {duplicates.map((dup) => (
                    <Card key={dup.id} className="p-4 border-l-4 border-amber-500">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm">{dup.registration?.student_name}</span>
                          <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Reg ID: {dup.registration_id.slice(0,8)}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-black text-[var(--text-muted)] mb-2">Possible Matches:</p>
                          {dup.possible_matches.map((match: any) => (
                            <div key={match.id} className="flex items-center justify-between bg-[var(--input)] p-2 rounded-lg group">
                              <span className="text-xs font-bold">{match.full_name}</span>
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-7 text-[10px] px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleResolveDuplicate(dup.id, dup.registration_id, match.id)}
                              >
                                Link Existing
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button 
                            className="text-[10px] font-black uppercase text-red-500 hover:underline"
                            onClick={() => handleResolveDuplicate(dup.id, dup.registration_id, null)}
                          >
                            Ignore Duplicate
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Batch History */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-lg font-black flex items-center gap-2">
                <FileText className="text-primary" size={20} />
                Generated Batches
              </h2>

              <div className="bg-[var(--card)] rounded-[2rem] border border-[var(--card-border)] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[var(--input)] border-b border-[var(--card-border)]">
                        <th className="px-6 py-4 font-black uppercase text-[10px] text-[var(--text-muted)]">Date</th>
                        <th className="px-6 py-4 font-black uppercase text-[10px] text-[var(--text-muted)]">New Students</th>
                        <th className="px-6 py-4 font-black uppercase text-[10px] text-[var(--text-muted)] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--card-border)]">
                      {batches.map((batch) => (
                        <tr key={batch.id} className="hover:bg-[var(--input)]/50 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="font-black">{formatDate(batch.created_at, 'long')}</span>
                              <span className="text-[10px] text-[var(--text-muted)] font-medium">Batch: {batch.id.slice(0,13)}...</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <Badge variant="success" className="font-black">{batch.total_created}</Badge>
                              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Created</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex justify-end gap-2">
                              {batch.image_url && (
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  className="h-9 px-3"
                                  onClick={() => setPreviewBatch(batch)}
                                >
                                  <Eye size={14} />
                                </Button>
                              )}
                              {batch.pdf_url && (
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  className="h-9 px-3"
                                  onClick={() => window.open(batch.pdf_url, '_blank')}
                                >
                                  <FileText size={14} />
                                </Button>
                              )}
                              <a 
                                href={batch.image_url} 
                                download={`credentials_${batch.id}.png`}
                                className="inline-flex items-center justify-center h-9 px-3 rounded-xl bg-[var(--input)] hover:bg-slate-200 transition-colors"
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {batches.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-[var(--text-muted)] italic">
                            No batches generated yet. Click "Generate Accounts" to start.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Preview Modal */}
      <Modal 
        isOpen={!!previewBatch} 
        onClose={() => setPreviewBatch(null)}
        title="Credential Snapshot Preview"
        size="xl"
      >
        <div className="flex flex-col gap-6">
          <div className="bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 min-h-[300px] relative">
            {previewBatch?.image_url ? (
              <img 
                src={previewBatch.image_url} 
                alt="Credential Preview" 
                className="w-full h-auto object-contain shadow-2xl"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm font-medium text-slate-400">Loading preview image...</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setPreviewBatch(null)}>Close</Button>
            <Button onClick={() => window.open(previewBatch.pdf_url, '_blank')} className="gap-2 shadow-lg shadow-primary/20">
              <Download size={16} />
              Open PDF Document
            </Button>
          </div>
        </div>
      </Modal>

      {/* Errors Modal */}
      <Modal
        isOpen={generationErrors.length > 0}
        onClose={() => setGenerationErrors([])}
        title="Generation Failures"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-red-500">
            The following student records could not be created. Please check if they already exist or have invalid data.
          </p>
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {generationErrors.map((err, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-red-50 border border-red-100">
                <p className="font-black text-sm text-red-700">{err.name}</p>
                <p className="text-xs text-red-600 mt-1">{err.error}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setGenerationErrors([])}>Close Report</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function SummaryCard({ label, value, icon, color }: any) {
  return (
    <Card className="p-6 relative overflow-hidden group">
      <div className="absolute -right-2 -bottom-2 opacity-[0.05] group-hover:scale-110 transition-transform duration-500" style={{ color }}>
        {icon}
      </div>
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + '15', color }}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="text-2xl font-black" style={{ color: 'var(--text)' }}>{value}</p>
        </div>
      </div>
    </Card>
  )
}
