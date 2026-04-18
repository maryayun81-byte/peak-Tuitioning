'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, X, Send, FileText, Image as ImageIcon, 
  Loader2, CheckCircle2, AlertCircle, ChevronRight,
  UploadCloud, Brain, Zap, Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAIFormStore } from '@/stores/aiFormStore'
import { processTeacherInstruction, extractTextFromFileAction } from '@/app/actions/ai-teacher'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export function TeacherAIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState<{ file: File, type: 'source' | 'media', url?: string }[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<'idle' | 'uploading' | 'parsing' | 'generating'>('idle')

  const { setParsedData, setStatus, clear } = useAIFormStore()
  const supabase = getSupabaseBrowserClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'source' | 'media') => {
    const selectedFiles = Array.from(e.target.files || [])
    const newFiles = selectedFiles.map(file => ({ file, type }))
    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleProcess = async () => {
    if (!prompt.trim() && files.length === 0) {
      toast.error('Please provide instructions or a document.')
      return
    }

    setIsProcessing(true)
    setProgress('uploading')
    setStatus('parsing')

    try {
      const mediaUrls: { name: string, url: string }[] = []
      let sourceText = ''

      // 1. Handle Uploads & Extraction
      for (const item of files) {
        const filePath = `teacher-ai/${Date.now()}_${item.file.name}`
        const { data, error } = await supabase.storage
          .from('teacher-resources')
          .upload(filePath, item.file)

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
          .from('teacher-resources')
          .getPublicUrl(filePath)

        if (item.type === 'media') {
          mediaUrls.push({ name: item.file.name, url: publicUrl })
        } else {
          setProgress('parsing')
          const text = await extractTextFromFileAction(publicUrl, item.file.name)
          sourceText += `--- Content from ${item.file.name} ---\n${text}\n\n`
        }
      }

      setProgress('generating')
      
      // 2. Call AI Action
      const result = await processTeacherInstruction(prompt, sourceText, mediaUrls)

      if (result.error) {
        toast.error(result.error)
        setStatus('failed')
      } else {
        setParsedData(result.data, result.data.type)
        toast.success(`AI generated a ${result.data.type}! All fields ready.`)
        setIsOpen(false)
        setPrompt('')
        setFiles([])
      }
    } catch (err: any) {
      console.error(err)
      toast.error('AI processing failed. Please check your connection.')
      setStatus('failed')
    } finally {
      setIsProcessing(false)
      setProgress('idle')
    }
  }

  return (
    <>
      {/* Floating Toggle */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-primary text-white shadow-2xl flex items-center justify-center group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
        </motion.button>
      )}

      {/* Main Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isProcessing && setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[51]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed bottom-6 right-6 z-[52] w-full max-w-md bg-[var(--card)] border border-[var(--card-border)] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: 'calc(100vh - 8rem)' }}
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-primary to-accent text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                    <Brain size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Peak Creator AI</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-bold opacity-80">Form Operator Active</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  disabled={isProcessing}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="What should we create today? e.g. 'Create a Form 3 Chemistry quiz on acids...'"
                      className="w-full min-h-[120px] p-5 rounded-2xl bg-[var(--input)] border-2 border-transparent focus:border-primary/30 outline-none text-sm font-medium transition-all resize-none no-scrollbar"
                      style={{ color: 'var(--text)' }}
                      disabled={isProcessing}
                    />
                    <div className="absolute bottom-4 right-4 text-[10px] text-[var(--text-muted)] font-black uppercase flex items-center gap-1 opacity-50">
                      <Zap size={10} className="text-amber-500" /> Advanced Reasoning
                    </div>
                  </div>

                  {/* File Upload Zones */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-primary hover:bg-primary/5'}`} style={{ borderColor: 'var(--card-border)' }}>
                      <FileText size={20} className="text-primary mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-center">Add Doc</span>
                      <input type="file" multiple accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => handleFileChange(e, 'source')} />
                    </label>
                    <label className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-primary hover:bg-primary/5'}`} style={{ borderColor: 'var(--card-border)' }}>
                      <ImageIcon size={20} className="text-accent mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-center">Add Media</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'media')} />
                    </label>
                  </div>

                  {/* File List */}
                  {files.length > 0 && (
                    <div className="space-y-2">
                       {files.map((f, i) => (
                         <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--input)] border border-[var(--card-border)] group">
                            <div className="flex items-center gap-3 min-w-0">
                               {f.type === 'source' ? <FileText size={14} className="text-primary shrink-0" /> : <ImageIcon size={14} className="text-accent shrink-0" />}
                               <span className="text-[11px] font-medium truncate" style={{ color: 'var(--text)' }}>{f.file.name}</span>
                            </div>
                            <button 
                              onClick={() => removeFile(i)}
                              className="p-1 hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                         </div>
                       ))}
                    </div>
                  )}
                </div>

                {isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-4"
                  >
                    <Loader2 size={24} className="text-primary animate-spin" />
                    <div className="flex-1">
                      <div className="text-xs font-black uppercase tracking-widest text-primary">
                        {progress === 'uploading' ? 'Analyzing Files...' : progress === 'parsing' ? 'Extracting Wisdom...' : 'Architecting Content...'}
                      </div>
                      <div className="mt-1 h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-primary"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-[var(--card-border)] bg-[var(--input)]/50">
                <Button 
                  className="w-full h-12 rounded-2xl shadow-xl shadow-primary/20 gap-2 font-black uppercase tracking-widest"
                  onClick={handleProcess}
                  disabled={isProcessing || (!prompt.trim() && files.length === 0)}
                >
                  {isProcessing ? (
                    'Processing Experience...'
                  ) : (
                    <>
                      Construct Form <ChevronRight size={18} />
                    </>
                  )}
                </Button>
                <div className="mt-4 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50">
                   Proprietary AI Engine • High Fidelity Synthesis
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
