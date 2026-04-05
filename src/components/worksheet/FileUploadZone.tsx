'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, Image } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface FileUploadZoneProps {
  value: string | null           // current URL
  onChange: (url: string | null) => void
  disabled?: boolean
  bucket?: string
  accept?: Record<string, string[]>
}

export function FileUploadZone({ 
  value, 
  onChange, 
  disabled, 
  bucket = 'assignment-uploads',
  accept
}: FileUploadZoneProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const supabase = getSupabaseBrowserClient()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploading(true)
    setProgress(0)
    console.log('[FileUpload] Starting upload for:', file.name, file.type, file.size)

    try {
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      console.log('[FileUpload] Generated filename:', filename)

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, file, { 
          contentType: file.type, 
          upsert: false,
          onUploadProgress: (ev: any) => {
            if (!ev || !ev.total) {
              console.log('[FileUpload] Progress: total expected but missing', ev)
              return
            }
            const percent = (ev.loaded / ev.total) * 100
            // If we're at 100% byte-wise, show 99% 'Finalising' until the promise resolves
            const nextProgress = Math.min(99, Math.round(percent))
            if (nextProgress !== progress) {
              setProgress(nextProgress)
            }
          }
        } as any)

      if (error) {
        console.error('[FileUpload] Supabase upload error:', error)
        throw new Error(error.message || 'Upload failed')
      }

      // Snap to 100% on success
      setProgress(100)
      console.log('[FileUpload] Upload success, data:', data)

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
      console.log('[FileUpload] Public URL generated:', urlData.publicUrl)

      onChange(urlData.publicUrl)
      toast.success('File uploaded!')

      // Wait a bit so user sees 100%, then hide progress
      setTimeout(() => {
        setUploading(false)
        setProgress(0)
      }, 800)
    } catch (err: any) {
      console.error('[FileUpload] Catch block error:', err)
      toast.error('Upload failed: ' + err.message + `. Check if your Supabase bucket "${bucket}" exists and is PUBLIC.`)
      setUploading(false)
      setProgress(0)
    }
  }, [supabase, onChange, bucket])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept || {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    disabled: disabled || uploading || !!value,
  })

  const remove = () => onChange(null)

  const isPdf = value?.toLowerCase().includes('.pdf') || value?.toLowerCase().endsWith('pdf')

  if (value) {
    return (
      <div className="relative rounded-2xl overflow-hidden border-2 border-dashed"
        style={{ borderColor: 'var(--primary)', background: 'var(--primary-dim)' }}>
        {isPdf ? (
          <div className="flex items-center gap-4 p-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--primary)', color: 'white' }}>
              <FileText size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>
                PDF Document attached
              </div>
              <a href={value} target="_blank" rel="noreferrer"
                className="text-xs underline opacity-70"
                style={{ color: 'var(--primary)' }}>
                Preview PDF
              </a>
            </div>
            {!disabled && (
              <button onClick={remove} className="p-2 rounded-xl transition-all hover:bg-red-500/10"
                style={{ color: '#EF4444' }} title="Remove">
                <X size={18} />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Image preview */}
            <img src={value} alt="Uploaded document"
              className="w-full max-h-64 object-contain rounded-xl"
              style={{ background: 'var(--input)' }} />
            {!disabled && (
              <button onClick={remove}
                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: '#EF4444', color: 'white' }} title="Remove">
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className="rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
      style={{
        borderColor: isDragActive ? 'var(--primary)' : 'var(--card-border)',
        background: isDragActive ? 'var(--primary-dim)' : 'var(--input)',
      }}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="flex flex-col items-center gap-4 py-2">
          {/* Animated upload icon */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-2xl opacity-20 animate-pulse"
              style={{ background: 'var(--primary)' }}
            />
            <Upload size={22} style={{ color: 'var(--primary)' }} className="animate-bounce" />
          </div>

          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold" style={{ color: 'var(--text)' }}>Uploading…</span>
              <span className="font-black tabular-nums" style={{ color: 'var(--primary)' }}>{Math.round(progress)}%</span>
            </div>

            {/* Progress bar track */}
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--card-border)' }}>
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, var(--primary), color-mix(in sRGB, var(--primary) 80%, white 20%))',
                }}
              />
            </div>

            <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
              {progress < 30 ? 'Starting upload…' : progress < 70 ? 'Uploading file…' : progress < 95 ? 'Almost there…' : 'Finalising…'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: isDragActive ? 'var(--primary)' : 'var(--card-border)', color: isDragActive ? 'white' : 'var(--text-muted)' }}>
            <Upload size={22} />
          </div>
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--text)' }}>
              {isDragActive ? 'Drop to upload' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              PDF, PNG, JPG, WEBP supported
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <FileText size={14} /> PDF
            <Image size={14} className="ml-1" /> Images
          </div>
        </div>
      )}
    </div>
  )
}
