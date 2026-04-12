'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, Image, Film, FileSpreadsheet, Presentation } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/imageOptimization'
import toast from 'react-hot-toast'

interface FileUploadZoneProps {
  value: string | null           // current URL
  onChange: (url: string | null) => void
  disabled?: boolean
  bucket?: string
  accept?: Record<string, string[]>
  /** Allow Word, Excel, PowerPoint, CSV uploads in addition to PDF/images */
  acceptDocs?: boolean
  /** Max file size in MB (default 50) */
  maxSizeMB?: number
  /** Hint the OS to open camera on mobile (for workbook photo uploads) */
  captureCamera?: boolean
  /** Enable client-side image optimization (downsizing/compression) */
  optimize?: boolean
}

// Derive a human-friendly label from a URL or filename
function getFileLabel(url: string): { label: string; icon: React.ReactNode } {
  const lower = url.toLowerCase()
  if (lower.includes('.pdf'))  return { label: 'PDF Document', icon: <FileText size={22} /> }
  if (lower.includes('.doc'))  return { label: 'Word Document', icon: <FileText size={22} /> }
  if (lower.includes('.xls') || lower.includes('.csv')) return { label: 'Spreadsheet', icon: <FileSpreadsheet size={22} /> }
  if (lower.includes('.ppt'))  return { label: 'Presentation', icon: <Presentation size={22} /> }
  if (lower.match(/\.(mp4|mov|webm|avi)$/)) return { label: 'Video File', icon: <Film size={22} /> }
  if (lower.match(/\.(png|jpg|jpeg|webp|gif)$/)) return { label: 'Image', icon: <Image size={22} /> }
  return { label: 'Uploaded File', icon: <FileText size={22} /> }
}

const isImageUrl = (url: string) => /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(url)

export function FileUploadZone({ 
  value, 
  onChange, 
  disabled, 
  bucket = 'assignment-uploads',
  accept,
  acceptDocs = false,
  maxSizeMB = 50,
  captureCamera = false,
  optimize = true,
}: FileUploadZoneProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const supabase = getSupabaseBrowserClient()
  const progressInterval = useRef<NodeJS.Timeout | null>(null)
  const lastProgressTime = useRef<number>(0)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    let file = acceptedFiles[0]
    if (!file) return

    // Optimization: More aggressive for camera/workbook photos to ensure fast upload
    if (optimize && file.type.startsWith('image/')) {
       setStatus('Optimizing photo...')
       const compressionOptions = captureCamera 
         ? { maxWidth: 1600, quality: 0.6 } // Clearer text, smaller file
         : { maxWidth: 1280, quality: 0.8 } // Default
       
       if (file.size > 150 * 1024) {
          file = await compressImage(file, compressionOptions)
       }
    }

    // Client-side size validation
    const fileSizeMB = file.size / (1024 * 1024)
    const limit = captureCamera ? 2 : maxSizeMB // Strict 2MB limit for workbook photos
    if (fileSizeMB > limit) {
      toast.error(`File too large. Maximum size for ${captureCamera ? 'workbook photos' : 'uploads'} is ${limit}MB (your file is ${fileSizeMB.toFixed(1)}MB).`)
      return
    }

    setUploading(true)
    setProgress(5) // Immediate feedback jump
    setStatus('Connecting to server...')
    lastProgressTime.current = Date.now()
    
    // Intelligent Synthetic Progress
    // We crawl initially fast to 30%, then slow down and continue to 90% 
    // to give the user constant visual confirmation that the system is working.
    progressInterval.current = setInterval(() => {
       setProgress(prev => {
          if (prev >= 90) return prev
          const increment = prev < 30 ? 2 : prev < 60 ? 0.5 : 0.1
          return Math.min(90, prev + increment)
       })
    }, 500)

    try {
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timed out. Please check your connection and try again.')), 300000) // 5 Minutes
      )

      const { data, error } = await Promise.race([
        supabase.storage
          .from(bucket)
          .upload(filename, file, { 
            contentType: file.type || 'application/octet-stream',
            upsert: false,
            onUploadProgress: (evt: any) => {
              if (progressInterval.current) {
                 clearInterval(progressInterval.current)
                 progressInterval.current = null
              }
              setStatus('Finalizing transmission...')
              const pct = (evt.loaded / evt.total) * 100
              // Real progress takes over
              const realProgress = Math.max(5, Math.min(95, Math.round(pct)))
              setProgress(realProgress)

              // 90% Failsafe: If stuck at 95% for too long during final handshake, 
              // we force resolve to 100% so user doesn't feel stuck.
              if (realProgress >= 90) {
                 setTimeout(() => setProgress(100), 1500)
              }
            }
          } as any),
        timeoutPromise
      ]) as any

      if (error) {
        console.error('[FileUpload] Supabase error:', error)
        throw new Error(error.message || 'Upload failed')
      }

      // Snap to 100% on success
      setProgress(100)
      setStatus('Success!')
      console.log(`[FileUpload] Successful upload of ${file.name} to ${data.path}`)

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
      onChange(urlData.publicUrl)
      toast.success('File uploaded successfully!', { id: 'upload-success' })

      // Brief pause so user sees 100%, then hide spinner
      setTimeout(() => {
        setUploading(false)
        setProgress(0)
      }, 700)

    } catch (err: any) {
      console.error('[FileUpload] Error:', err)
      toast.error(
        `Upload failed: ${err.message}. ` +
        `Ensure the Supabase bucket "${bucket}" exists and is set to PUBLIC.`
      )
      if (progressInterval.current) clearInterval(progressInterval.current)
      setUploading(false)
      setProgress(0)
      setStatus('')
    }
  }, [supabase, onChange, bucket, maxSizeMB])

  // Build the accepted MIME types map
  const buildAccept = (): Record<string, string[]> => {
    if (accept) return accept
    const base: Record<string, string[]> = {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    }
    if (acceptDocs) {
      // Extensive MIME types for maximum compatibility (Win/Mac/Old Browser)
      base['application/msword'] = ['.doc']
      base['application/vnd.ms-word'] = ['.doc']
      base['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] = ['.docx']
      base['application/vnd.ms-word.document.macroEnabled.12'] = ['.docm']
      
      base['application/vnd.ms-excel'] = ['.xls']
      base['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] = ['.xlsx']
      base['application/vnd.ms-excel.sheet.macroEnabled.12'] = ['.xlsm']
      
      base['application/vnd.ms-powerpoint'] = ['.ppt']
      base['application/vnd.openxmlformats-officedocument.presentationml.presentation'] = ['.pptx']
      
      base['text/csv'] = ['.csv']
      base['application/csv'] = ['.csv']
    }
    return base
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: buildAccept(),
    maxFiles: 1,
    disabled: disabled || uploading || !!value,
  })

  // Build input props
  const inputProps = getInputProps()
  if (captureCamera) {
    // We removed capture="environment" to allow Gallery vs Camera choice
    // for significantly better mobile reliability and user flexibility.
    ;(inputProps as any).accept = 'image/*'
  }

  const remove = () => onChange(null)

  // ─── Uploaded State ───────────────────────────────────────────────────────
  if (value) {
    const { label, icon } = getFileLabel(value)
    const isImage = isImageUrl(value)

    return (
      <div className="relative rounded-2xl overflow-hidden border-2 border-dashed"
        style={{ borderColor: 'var(--primary)', background: 'var(--primary-dim)' }}>
        {isImage ? (
          <div className="relative">
            <img src={value} alt="Uploaded file"
              className="w-full max-h-72 object-contain rounded-xl"
              style={{ background: 'var(--input)' }} />
            {!disabled && (
              <button onClick={remove}
                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: '#EF4444', color: 'white' }} title="Remove">
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--primary)', color: 'white' }}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black truncate" style={{ color: 'var(--text)' }}>
                {label} attached
              </div>
              <a href={value} 
                target="_blank" 
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs underline opacity-70"
                style={{ color: 'var(--primary)' }}>
                Open / Preview
              </a>
            </div>
            {!disabled && (
              <button onClick={remove} className="p-2 rounded-xl transition-all hover:bg-red-500/10"
                style={{ color: '#EF4444' }} title="Remove">
                <X size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─── Upload Zone ──────────────────────────────────────────────────────────
  return (
    <div
      {...getRootProps()}
      className="rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
      style={{
        borderColor: isDragActive ? 'var(--primary)' : 'var(--card-border)',
        background: isDragActive ? 'var(--primary-dim)' : 'var(--input)',
        opacity: (disabled && !uploading) ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <input {...inputProps} />

      {uploading ? (
        <div className="flex flex-col items-center gap-4 py-2">
          {/* Animated upload icon */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl opacity-20 animate-pulse"
              style={{ background: 'var(--primary)' }} />
            <Upload size={22} style={{ color: 'var(--primary)' }} className="animate-bounce" />
          </div>

          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold" style={{ color: 'var(--text)' }}>Uploading…</span>
              <span className="font-black tabular-nums" style={{ color: 'var(--primary)' }}>
                {progress < 100 ? `${Math.round(progress)}%` : '✓ Done!'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--card-border)' }}>
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${progress}%`,
                  background: progress === 100
                    ? '#10B981'
                    : 'linear-gradient(90deg, var(--primary), color-mix(in sRGB, var(--primary) 80%, white 20%))',
                }}
              />
            </div>

            <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
              {status || (progress < 100 ? 'Processing...' : 'Upload complete!')}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: isDragActive ? 'var(--primary)' : 'var(--card-border)',
              color: isDragActive ? 'white' : 'var(--text-muted)',
            }}>
            {captureCamera ? <Image size={22} /> : <Upload size={22} />}
          </div>
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--text)' }}>
              {captureCamera
                ? 'Tap to take a photo or choose from gallery'
                : isDragActive ? 'Drop to upload' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {captureCamera
                ? 'JPG, PNG, WEBP — up to 50MB'
                : acceptDocs
                  ? `PDF, Images, Word, Excel, PowerPoint — up to ${maxSizeMB}MB`
                  : `PDF, PNG, JPG, WEBP — up to ${maxSizeMB}MB`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap justify-center" style={{ color: 'var(--text-muted)' }}>
            <FileText size={14} /> PDF
            <Image size={14} className="ml-1" /> Images
            {acceptDocs && <><span className="ml-1 font-bold">DOCX</span> <span>XLSX</span> <span>PPTX</span></>}
          </div>
        </div>
      )}
    </div>
  )
}
