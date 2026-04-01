'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { Stage, Layer, Line, Rect, Text } from 'react-konva'
import { X, Image as ImageIcon, PenTool, Upload, RefreshCw, Check, Type, Trash2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'

interface Props {
  imageUrl: string | null
  onImageChange: (url: string | null) => void
  disabled?: boolean
  sessionImages?: string[] // URLs of images already uploaded in this session
}

type DrawElement = 
  | { type: 'line', points: number[], color: string, strokeWidth: number }
  | { type: 'text', x: number, y: number, text: string, color: string }

export function TriviaImageUploader({ imageUrl, onImageChange, disabled, sessionImages = [] }: Props) {
  const supabase = getSupabaseBrowserClient()
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<'upload' | 'draw' | 'gallery'>('upload')
  const [isUploading, setIsUploading] = useState(false)

  // Drawing state
  const stageRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const isDrawing = useRef(false)
  const [elements, setElements] = useState<DrawElement[]>([])
  const [color, setColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [tool, setTool] = useState<'pen' | 'eraser' | 'text'>('pen')
  
  // Text input overlay state
  const [textInput, setTextInput] = useState<{ x: number, y: number } | null>(null)
  const [textValue, setTextValue] = useState('')

  useEffect(() => {
    if (isOpen && tab === 'draw' && containerRef.current) {
      setSize({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      })
    }
  }, [isOpen, tab])

  useEffect(() => {
    const handleResize = () => {
      if (isOpen && tab === 'draw' && containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isOpen, tab])

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    const ext = file.name.split('.').pop() || 'png'
    const filename = `trivia/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
    
    try {
      const { error } = await supabase.storage.from('avatars').upload(filename, file)
      
      if (error) {
        toast.error('Upload failed. ' + error.message)
        return
      }
      
      const url = supabase.storage.from('avatars').getPublicUrl(filename).data.publicUrl
      onImageChange(url)
      setIsOpen(false)
      toast.success('Visual attached successfully!')
    } catch (e: any) {
      toast.error('Upload crashed: ' + (e.message || 'Unknown error'))
    } finally {
      setIsUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxSize: 5 * 1024 * 1024,
    onDrop: acceptedFiles => {
      if (acceptedFiles[0]) uploadFile(acceptedFiles[0])
    },
    onDropRejected: () => toast.error('Max size 5MB. Must be an image.')
  })

  const saveDrawing = async () => {
    if (!stageRef.current) return
    setIsUploading(true)
    
    try {
      const dataUri = stageRef.current.toDataURL({ pixelRatio: 2, mimeType: 'image/png' })
      const res = await fetch(dataUri)
      const blob = await res.blob()
      await uploadFile(new File([blob], 'drawing.png', { type: 'image/png' }))
    } catch (e) {
      toast.error('Failed to export diagram')
      setIsUploading(false)
    }
  }

  // Pointer Handlers
  const handlePointerDown = (e: any) => {
    if (tool === 'text') {
      const pos = e.target.getStage().getPointerPosition()
      if (pos) {
         setTextInput({ x: pos.x, y: pos.y })
         setTextValue('')
      }
      return
    }

    isDrawing.current = true
    const pos = e.target.getStage().getPointerPosition()
    if (!pos) return
    setElements([...elements, {
      type: 'line',
      points: [pos.x, pos.y],
      color: tool === 'eraser' ? '#ffffff' : color,
      strokeWidth: tool === 'eraser' ? strokeWidth * 5 : strokeWidth
    }])
  }

  const handlePointerMove = (e: any) => {
    if (!isDrawing.current || tool === 'text') return
    const stage = e.target.getStage()
    const point = stage.getPointerPosition()
    if (!point) return

    setElements(prev => {
      if (prev.length === 0) return prev
      const arr = [...prev]
      const lastLine = { ...arr[arr.length - 1] } as Extract<DrawElement, { type: 'line' }>
      if (lastLine.type !== 'line') return prev
      lastLine.points = lastLine.points.concat([point.x, point.y])
      arr[arr.length - 1] = lastLine
      return arr
    })
  }

  const handlePointerUp = () => {
    isDrawing.current = false
  }

  const handleTextSubmit = () => {
    if (textInput && textValue.trim() !== '') {
      setElements([...elements, { type: 'text', x: textInput.x, y: textInput.y, text: textValue, color }])
    }
    setTextInput(null)
  }

  return (
    <>
      {/* Trigger Area */}
      {imageUrl ? (
        <div className="relative group rounded-xl border-2 overflow-hidden bg-[var(--input)] border-[var(--card-border)] aspect-video">
          <img src={imageUrl} alt="Attached" className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
             <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} disabled={disabled} className="bg-black/50 hover:bg-black text-white border-0">
               <RefreshCw size={16} className="mr-2" /> Replace
             </Button>
             <Button variant="outline" size="sm" onClick={() => onImageChange(null)} disabled={disabled} className="bg-red-500/50 hover:bg-red-500 text-white border-0">
               <Trash2 size={16} className="mr-2" /> Remove
             </Button>
          </div>
        </div>
      ) : (
        <button
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          className="w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-8 transition-all hover:bg-[var(--card)] group"
          style={{ borderColor: 'var(--card-border)', background: 'var(--input)' }}
        >
           <div className="w-12 h-12 rounded-full bg-[var(--card-border)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-primary group-hover:scale-110 transition-all mb-3">
              <ImageIcon size={24} />
           </div>
           <p className="text-sm font-black text-[var(--text)] uppercase tracking-tight">Attach Visual Context</p>
           <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Upload an image or draw a diagram</p>
        </button>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isUploading && setIsOpen(false)} />
            
            <motion.div 
               initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
               className="bg-[var(--bg)] w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden relative z-10 flex flex-col border"
               style={{ maxHeight: 'calc(100vh - 40px)', borderColor: 'var(--card-border)' }}
            >
               {/* Modal Header */}
               <div className="p-4 sm:p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                 <div className="flex bg-[var(--input)] p-1 rounded-xl">
                   <button onClick={() => setTab('upload')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tab === 'upload' ? 'bg-[var(--bg)] text-primary shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                     <Upload size={14} className="inline mr-2" /> Upload
                   </button>
                   <button onClick={() => setTab('draw')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tab === 'draw' ? 'bg-[var(--bg)] text-primary shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                     <PenTool size={14} className="inline mr-2" /> Draw Diagram
                   </button>
                   {sessionImages.length > 0 && (
                     <button onClick={() => setTab('gallery')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tab === 'gallery' ? 'bg-[var(--bg)] text-primary shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                       <ImageIcon size={14} className="inline mr-2" /> Library
                     </button>
                   )}
                 </div>
                 <button onClick={() => setIsOpen(false)} disabled={isUploading} className="text-[var(--text-muted)] hover:text-red-500 transition-colors">
                   <X size={24} />
                 </button>
               </div>

               {/* Modal Body */}
               <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--bg)] min-h-[400px]">
                 
                 {tab === 'upload' && (
                   <div {...getRootProps()} className={`h-full flex flex-col items-center justify-center border-2 border-dashed rounded-[2rem] p-10 transition-colors cursor-pointer min-h-[300px] ${isDragActive ? 'border-primary bg-primary/5' : 'border-[var(--card-border)] bg-[var(--input)]'}`}>
                     <input {...getInputProps()} />
                     <div className="w-20 h-20 rounded-full bg-[var(--card)] shadow-xl flex items-center justify-center text-primary mb-6 animate-bounce">
                       <Upload size={32} />
                     </div>
                     <h3 className="text-xl font-black text-[var(--text)] text-center uppercase tracking-tight">Drop Image Here</h3>
                     <p className="text-sm text-[var(--text-muted)] text-center mt-2 max-w-sm">JPEGs, PNGs up to 5MB. For PDFs, please use your device's snipping tool and upload the screenshot.</p>
                     
                     <div className="mt-8 bg-[var(--text)] text-[var(--bg)] hover:bg-[var(--text-muted)] font-black uppercase tracking-widest px-8 py-3 rounded-full text-sm transition-all pointer-events-none">Browse Files</div>
                   </div>
                 )}

                 {tab === 'gallery' && (
                   <div className="space-y-4 h-full flex flex-col">
                     <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest opacity-40">Session Library</h3>
                        <span className="text-[10px] font-bold py-1 px-2 rounded-lg bg-primary/10 text-primary uppercase">Recent Images</span>
                     </div>
                     {Array.from(new Set(sessionImages)).length === 0 ? (
                       <div className="flex-1 flex flex-col items-center justify-center opacity-40 text-center space-y-2">
                          <ImageIcon size={40} />
                          <p className="text-xs font-bold uppercase">No images uploaded yet in this session</p>
                       </div>
                     ) : (
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4">
                         {Array.from(new Set(sessionImages)).map((url, idx) => (
                           <div 
                             key={idx} 
                             onClick={() => { onImageChange(url); setIsOpen(false); }}
                             className={`group relative aspect-video rounded-2xl border-2 overflow-hidden bg-[var(--input)] cursor-pointer transition-all hover:scale-[1.03] active:scale-95 ${imageUrl === url ? 'border-primary ring-4 ring-primary/10' : 'border-[var(--card-border)] hover:border-primary/50'}`}
                           >
                              <img src={url} alt="Gallery item" className="w-full h-full object-contain" />
                              {imageUrl === url && (
                                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                   <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
                                     <Check size={18} />
                                   </div>
                                </div>
                              )}
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 )}

                 {tab === 'draw' && (
                   <div className="h-[500px] flex flex-col gap-4">
                     {/* Toolbar */}
                     <div className="flex flex-wrap items-center gap-4 bg-[var(--card)] p-3 rounded-2xl border" style={{ borderColor: 'var(--card-border)' }}>
                       <div className="flex gap-2">
                         <button onClick={() => setTool('pen')} className={`p-2 rounded-lg transition-colors ${tool === 'pen' ? 'bg-primary text-white' : 'hover:bg-[var(--input)] text-[var(--text)]'}`} title="Pen"><PenTool size={18} /></button>
                         <button onClick={() => setTool('text')} className={`p-2 rounded-lg transition-colors ${tool === 'text' ? 'bg-primary text-white' : 'hover:bg-[var(--input)] text-[var(--text)]'}`} title="Text"><Type size={18} /></button>
                       </div>
                       <div className="w-px h-6 bg-[var(--card-border)]" />
                       <div className="flex gap-2">
                         {['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B'].map(c => (
                           <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'scale-110 border-primary' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                         ))}
                       </div>
                       <div className="w-px h-6 bg-[var(--card-border)]" />
                       <Button variant="ghost" size="sm" onClick={() => setElements([])} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 uppercase font-black text-xs tracking-widest"><Trash2 size={14} className="mr-2"/> Clear Canvas</Button>
                     </div>

                     {/* Canvas Container */}
                     <div ref={containerRef} className="flex-1 bg-white rounded-2xl border relative overflow-hidden" style={{ borderColor: 'var(--card-border)', touchAction: 'none' }}>
                        {size.width > 0 && (
                          <Stage
                            width={size.width}
                            height={size.height}
                            onMouseDown={handlePointerDown}
                            onMouseMove={handlePointerMove}
                            onMouseUp={handlePointerUp}
                            onTouchStart={handlePointerDown}
                            onTouchMove={handlePointerMove}
                            onTouchEnd={handlePointerUp}
                            ref={stageRef}
                          >
                            <Layer>
                              <Rect x={0} y={0} width={size.width} height={size.height} fill="#ffffff" />
                              {elements.map((el, i) => {
                                if (el.type === 'line') {
                                  return <Line key={i} points={el.points} stroke={el.color} strokeWidth={el.strokeWidth} tension={0.5} lineCap="round" lineJoin="round" globalCompositeOperation={el.color === '#ffffff' ? 'destination-out' : 'source-over'} />
                                }
                                if (el.type === 'text') {
                                  return <Text key={i} x={el.x} y={el.y} text={el.text} fill={el.color} fontSize={20} fontFamily="Inter, sans-serif" fontStyle="bold" />
                                }
                                return null
                              })}
                            </Layer>
                          </Stage>
                        )}

                        {/* Text Input Overlay */}
                        <AnimatePresence>
                           {textInput && (
                              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute z-10 flex flex-col gap-2 bg-[var(--card)] p-2 rounded-xl shadow-2xl border border-[var(--card-border)]" style={{ left: Math.min(textInput.x, size.width - 200), top: Math.min(textInput.y, size.height - 100) }}>
                                 <input autoFocus type="text" value={textValue} onChange={e => setTextValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTextSubmit()} placeholder="Type something..." className="bg-[var(--input)] text-[var(--text)] px-3 py-2 rounded-lg text-sm outline-none border border-[var(--card-border)]" />
                                 <Button size="sm" onClick={handleTextSubmit} className="uppercase font-black text-xs">Place Text</Button>
                              </motion.div>
                           )}
                        </AnimatePresence>
                     </div>

                     {/* Draw Actions */}
                     <div className="flex justify-end pt-2">
                       <Button onClick={saveDrawing} isLoading={isUploading} className="bg-primary hover:bg-primary-hover text-white font-black uppercase tracking-widest px-8">
                         <Check size={18} className="mr-2" /> Inject Diagram
                       </Button>
                     </div>
                   </div>
                 )}
               </div>

               {isUploading && (
                 <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white">
                   <RefreshCw className="animate-spin mb-4" size={40} />
                   <div className="font-black uppercase tracking-widest">Processing Artifact...</div>
                 </div>
               )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
