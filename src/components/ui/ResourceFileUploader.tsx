'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { 
  Upload, X, FileText, Image, 
  Film, FileSpreadsheet, Presentation,
  Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import toast from 'react-hot-toast'

interface ResourceFileUploaderProps {
  value: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
  bucket?: string
  acceptType?: 'document' | 'video' | 'image' | 'any'
  maxSizeMB?: number
}

function getFileMetadata(url: string) {
  const lower = url.toLowerCase()
  if (lower.includes('.pdf')) return { label: 'PDF DOCUMENT', icon: <FileText size={24} className="text-rose-500" /> }
  if (lower.includes('.doc')) return { label: 'WORD DOC', icon: <FileText size={24} className="text-blue-500" /> }
  if (lower.match(/\.(mp4|mov|webm)$/)) return { label: 'VIDEO RESOURCE', icon: <Film size={24} className="text-indigo-500" /> }
  if (lower.match(/\.(png|jpg|jpeg|webp)$/)) return { label: 'IMAGE RESOURCE', icon: <Image size={24} className="text-emerald-500" /> }
  return { label: 'ATTACHMENT', icon: <FileText size={24} className="text-slate-500" /> }
}

export function ResourceFileUploader({ 
  value, 
  onChange, 
  disabled, 
  bucket = 'resource-uploads',
  acceptType = 'any',
  maxSizeMB = 100
}: ResourceFileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const supabase = getSupabaseBrowserClient()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large! Maximum allowed is ${maxSizeMB}MB.`)
      return
    }

    setUploading(true)
    setProgress(10)

    try {
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, file, {
          onUploadProgress: (evt: any) => {
            const pct = Math.round((evt.loaded / evt.total) * 100)
            setProgress(Math.max(10, pct))
          }
        } as any)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)
      onChange(publicUrl)
      toast.success('Resource uploaded successfully!')
    } catch (err: any) {
      console.error('Upload Error:', err)
      toast.error(`Error: ${err.message}`)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [supabase, onChange, bucket, maxSizeMB])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: disabled || uploading || !!value,
    accept: acceptType === 'document' ? { 'application/pdf': ['.pdf'], 'application/msword': ['.doc', '.docx'] }
          : acceptType === 'video' ? { 'video/*': ['.mp4', '.mov', '.webm'] }
          : acceptType === 'image' ? { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }
          : undefined
  })

  if (value) {
    const { label, icon } = getFileMetadata(value)
    return (
      <Card className="p-4 border-2 border-emerald-500/20 bg-emerald-500/5 transition-all overflow-hidden group">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-emerald-500/20 shadow-sm flex items-center justify-center shrink-0">
               {icon}
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Verified Upload</span>
                  <CheckCircle2 size={10} className="text-emerald-500" />
               </div>
               <h4 className="text-xs font-black uppercase tracking-tight text-slate-800 truncate">{label}</h4>
               <a href={value} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary underline underline-offset-2">Preview Resource</a>
            </div>
            {!disabled && (
               <button onClick={() => onChange(null)} className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors">
                  <X size={18} />
               </button>
            )}
         </div>
      </Card>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={`relative p-8 border-2 border-dashed rounded-3xl text-center transition-all group ${
        isDragActive ? 'border-primary bg-primary/5' : 'border-[var(--card-border)] bg-[var(--input)]'
      }`}
    >
      <input {...getInputProps()} />
      
      {uploading ? (
        <div className="space-y-4">
           <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping" />
              <div className="relative z-10 w-full h-full rounded-2xl bg-primary flex items-center justify-center text-white">
                 <Upload size={24} className="animate-bounce" />
              </div>
           </div>
           <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                 <span>Transmitting...</span>
                 <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                 <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${progress}%` }} 
                    className="h-full bg-primary" 
                 />
              </div>
           </div>
        </div>
      ) : (
        <div className="space-y-4">
           <div className="w-16 h-16 mx-auto rounded-2xl bg-white shadow-sm border border-[var(--card-border)] flex items-center justify-center text-muted group-hover:text-primary group-hover:scale-110 transition-all">
              <Sparkles size={24} />
           </div>
           <div className="space-y-1">
              <p className="text-sm font-black uppercase tracking-tight">
                {isDragActive ? 'Drop it here!' : 'Click to Upload Material'}
              </p>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                PDF, MP4, or Images up to {maxSizeMB}MB
              </p>
           </div>
        </div>
      )}
    </div>
  )
}
