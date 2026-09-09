'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Upload, X, FileText, Image as ImageIcon, CheckCircle2,
  Send, AlertTriangle, Award, RefreshCw, Camera
} from 'lucide-react'
import { Card, Badge } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  getSessionAssignment, getSessionSubmission, submitSessionWork,
} from '@/app/actions/homeschooling'
import toast from 'react-hot-toast'

interface Props {
  sessionId: string
  submissionRequired: boolean
  onSubmitted?: () => void
}

interface PendingFile {
  id: string
  file: File
  preview: string | null
  status: 'pending' | 'uploading' | 'done' | 'error'
  url: string | null
  error?: string
}

const MAX_FILES = 8
const MAX_SIZE_MB = 15

export default function SessionSubmissionPanel({ sessionId, submissionRequired, onSubmitted }: Props) {
  const [loading, setLoading] = useState(true)
  const [assignment, setAssignment] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [answerText, setAnswerText] = useState('')
  const [files, setFiles] = useState<PendingFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [sessionId])

  const load = async () => {
    setLoading(true)
    try {
      const [assignRes, subRes] = await Promise.all([
        getSessionAssignment(sessionId),
        getSessionSubmission(sessionId),
      ])
      if (assignRes.success) setAssignment(assignRes.data)
      if (subRes.success) {
        setSubmission(subRes.data)
        if (subRes.data) {
          try {
            const parsed = JSON.parse(subRes.data.content || '{}')
            setAnswerText(parsed.text || '')
            const prevFiles: string[] = parsed.files || []
            setFiles(prevFiles.map((url, i) => ({
              id: `prev-${i}`, file: null as any, preview: url,
              status: 'done' as const, url,
            })))
          } catch { /* legacy TipTap content — start fresh */ }
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const incoming = Array.from(list)
    if (files.filter(f => f.status !== 'error').length + incoming.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files per submission`)
      return
    }
    const mapped: PendingFile[] = []
    for (const file of incoming) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name} exceeds ${MAX_SIZE_MB}MB`)
        continue
      }
      mapped.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        status: 'pending',
        url: null,
      })
    }
    setFiles(prev => [...prev, ...mapped])
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadOne = async (pf: PendingFile): Promise<PendingFile> => {
    if (pf.status === 'done' && pf.url) return pf
    const supabase = getSupabaseBrowserClient()
    setFiles(prev => prev.map(f => f.id === pf.id ? { ...f, status: 'uploading' as const, error: undefined } : f))
    try {
      const ext = pf.file.name.split('.').pop() || 'jpg'
      const filename = `session-${sessionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage
        .from('assignment-uploads')
        .upload(filename, pf.file, { contentType: pf.file.type, upsert: false })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('assignment-uploads').getPublicUrl(data.path)
      const done = { ...pf, status: 'done' as const, url: urlData.publicUrl }
      setFiles(prev => prev.map(f => f.id === pf.id ? done : f))
      return done
    } catch (err: any) {
      const failed = { ...pf, status: 'error' as const, error: err.message || 'Upload failed' }
      setFiles(prev => prev.map(f => f.id === pf.id ? failed : f))
      return failed
    }
  }

  const handleSubmit = async () => {
    const toUpload = files.filter(f => f.status !== 'done')
    let uploaded = files.filter(f => f.status === 'done')

    for (const pf of toUpload) {
      const result = await uploadOne(pf)
      if (result.status === 'done' && result.url) uploaded = [...uploaded, result]
    }

    const failed = files.filter(f => f.status === 'error')
    if (failed.length > 0 || uploaded.length + (answerText.trim() ? 1 : 0) === 0) {
      if (uploaded.length === 0 && !answerText.trim()) {
        toast.error('Write an answer or upload your work before submitting.')
        return
      }
      toast.error(`${failed.length} file${failed.length !== 1 ? 's' : ''} failed to upload. Retry or remove them.`)
      return
    }

    setSubmitting(true)
    try {
      const res = await submitSessionWork(sessionId, {
        answerText: answerText.trim() || undefined,
        fileUrls: uploaded.map(f => f.url!),
      })
      if (!res.success) throw new Error(res.error)
      toast.success(submission ? 'Work resubmitted!' : 'Work submitted!')
      const subRes = await getSessionSubmission(sessionId)
      if (subRes.success) setSubmission(subRes.data)
      onSubmitted?.()
    } catch (err: any) {
      toast.error(err.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-5 rounded-2xl animate-pulse" style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
        <div className="h-3 w-32 rounded bg-[var(--input)] mb-2" />
        <div className="h-10 w-full rounded-xl bg-[var(--input)]" />
      </div>
    )
  }

  if (!assignment) {
    if (!submissionRequired) return null
    return (
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: '#F59E0B' }} />
          <div>
            <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>Submission Required</h3>
            <p className="text-xs font-medium opacity-50 mt-1">Your teacher hasn&apos;t attached the assignment for this session yet. Check back soon.</p>
          </div>
        </div>
      </Card>
    )
  }

  const isReviewed = submission && (submission.status === 'marked' || submission.status === 'returned' || submission.marks != null || submission.feedback)
  const failedCount = files.filter(f => f.status === 'error').length
  const uploadingCount = files.filter(f => f.status === 'uploading').length

  let existing: { text?: string; files?: string[] } = {}
  try { existing = submission ? JSON.parse(submission.content || '{}') : {} } catch { /* ignore */ }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText size={18} style={{ color: 'var(--primary)' }} />
            <div>
              <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>Submit Your Work</h3>
              <p className="text-[11px] font-semibold opacity-50">
                {assignment.title}
                {assignment.max_marks ? ` · ${assignment.max_marks} marks` : ''}
                {assignment.due_date ? ` · Due ${new Date(assignment.due_date).toLocaleDateString()}` : ''}
              </p>
            </div>
          </div>
          {submission && (
            <Badge variant={isReviewed ? 'success' : 'warning'} className="text-[10px] uppercase shrink-0">
              {isReviewed ? 'Reviewed' : submission.status}
            </Badge>
          )}
        </div>

        {isReviewed && (
          <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <div className="flex items-center gap-2">
              <Award size={15} style={{ color: '#10B981' }} />
              <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: '#10B981' }}>
                Teacher Feedback {submission.marks != null ? `· ${submission.marks} marks` : ''}
                {submission.grade ? ` · Grade ${submission.grade}` : ''}
              </h4>
            </div>
            {submission.feedback && <p className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>{submission.feedback}</p>}
            {submission.strengths && <p className="text-xs leading-relaxed"><span className="font-black" style={{ color: '#10B981' }}>Strengths: </span><span style={{ color: 'var(--text)' }}>{submission.strengths}</span></p>}
            {submission.weaknesses && <p className="text-xs leading-relaxed"><span className="font-black" style={{ color: '#EF4444' }}>Work on: </span><span style={{ color: 'var(--text)' }}>{submission.weaknesses}</span></p>}
          </div>
        )}

        {submission && !isReviewed && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <CheckCircle2 size={14} style={{ color: '#F59E0B' }} className="shrink-0" />
            <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
              Submitted{submission.submitted_at ? ` on ${new Date(submission.submitted_at).toLocaleDateString()}` : ''} — awaiting teacher review. You can update and resubmit below.
            </p>
          </div>
        )}

        <Textarea
          placeholder="Type your answers here (optional if uploading photos)..."
          rows={4}
          value={answerText}
          onChange={e => setAnswerText(e.target.value)}
        />

        <div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
            {files.map(f => (
              <div key={f.id} className="relative rounded-xl overflow-hidden border" style={{ borderColor: f.status === 'error' ? '#EF4444' : 'var(--card-border)', aspectRatio: '3/4', background: 'var(--input)' }}>
                {f.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.preview} alt="Work page" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                    {f.file?.type?.startsWith('image/') || f.url?.match(/\.(png|jpg|jpeg|webp|gif)(\?|$)/i)
                      ? <ImageIcon size={20} className="opacity-40" />
                      : <FileText size={20} className="opacity-40" />}
                    <span className="text-[9px] font-bold opacity-50 truncate w-full text-center">
                      {f.file?.name || 'Attached file'}
                    </span>
                  </div>
                )}
                {f.status === 'uploading' && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                {f.status === 'done' && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#10B981' }}>
                    <CheckCircle2 size={13} className="text-white" />
                  </div>
                )}
                {f.status === 'error' && (
                  <button
                    onClick={() => uploadOne(f)}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                    style={{ background: 'rgba(239,68,68,0.15)' }}
                    aria-label="Retry upload"
                  >
                    <RefreshCw size={16} style={{ color: '#EF4444' }} />
                    <span className="text-[9px] font-bold" style={{ color: '#EF4444' }}>Retry</span>
                  </button>
                )}
                {f.status !== 'uploading' && (
                  <button
                    onClick={() => removeFile(f.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)' }}
                    aria-label="Remove file"
                  >
                    <X size={12} className="text-white" />
                  </button>
                )}
              </div>
            ))}

            {files.filter(f => f.status !== 'error').length < MAX_FILES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 hover:opacity-80 transition-opacity"
                style={{ borderColor: 'var(--primary)', aspectRatio: '3/4', background: 'var(--input)', color: 'var(--primary)' }}
              >
                <Upload size={20} />
                <span className="text-[9px] font-black uppercase tracking-wider">Upload</span>
                <span className="text-[9px] opacity-60">{files.length}/{MAX_FILES}</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={e => { addFiles(e.target.files); e.target.value = '' }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => { addFiles(e.target.files); e.target.value = '' }}
          />

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => cameraInputRef.current?.click()}>
              <Camera size={13} /> Photo of Work
            </Button>
            {failedCount > 0 && (
              <span className="text-[11px] font-bold" style={{ color: '#EF4444' }}>
                {failedCount} failed — tap to retry
              </span>
            )}
            {uploadingCount > 0 && (
              <span className="text-[11px] font-bold opacity-50">Uploading {uploadingCount}…</span>
            )}
          </div>
        </div>

        <Button onClick={handleSubmit} isLoading={submitting} className="w-full rounded-xl h-11 font-black">
          <Send size={15} /> {submission ? 'Update Submission' : 'Submit Work'}
        </Button>
      </Card>
    </motion.div>
  )
}
