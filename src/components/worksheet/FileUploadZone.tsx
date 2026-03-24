'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface FileUploadZoneProps {
  value: string | null           // current URL
  onChange: (url: string | null) => void
  disabled?: boolean
}

export function FileUploadZone({ value, onChange, disabled }: FileUploadZoneProps) {
  const [uploading, setUploading] = useState(false)
  const supabase = getSupabaseBrowserClient()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploading(true)
    console.log('[FileUpload] Starting upload for:', file.name, file.type, file.size)
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timed out (30s)')), 30000))
    
    try {
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      console.log('[FileUpload] Generated filename:', filename)
      
      const uploadPromise = supabase.storage
        .from('assignment-uploads')
        .upload(filename, file, { contentType: file.type, upsert: false })

      const { data, error }: any = await Promise.race([uploadPromise, timeoutPromise])

      if (error) {
        console.error('[FileUpload] Supabase upload error:', error)
        throw error
      }

      console.log('[FileUpload] Upload success, data:', data)

      const { data: urlData } = supabase.storage
        .from('assignment-uploads')
        .getPublicUrl(data.path)

      console.log('[FileUpload] Public URL generated:', urlData.publicUrl)

      onChange(urlData.publicUrl)
      toast.success('File uploaded!')
    } catch (err: any) {
      console.error('[FileUpload] Catch block error:', err)
      toast.error('Upload failed: ' + err.message + '. Check if your Supabase bucket "assignment-uploads" exists and is PUBLIC.')
    } finally {
      setUploading(false)
    }
  }, [supabase, onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
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
              style={{ background: '#f8fafc' }} />
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
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            Uploading...
          </p>
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
