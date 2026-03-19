'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as fabric from 'fabric'
import { 
  Pencil, Type, Square, Circle, 
  Trash2, Undo, Redo, Download, 
  Check, X, MousePointer2, Move,
  Palette, MousePointer
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import toast from 'react-hot-toast'

interface AnnotationEngineProps {
  imageUrl: string
  initialData?: any
  onSave: (data: any) => void
  readOnly?: boolean
}

export default function AnnotationEngine({ imageUrl, initialData, onSave, readOnly = false }: AnnotationEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [activeTool, setActiveTool] = useState('pen')
  const [color, setColor] = useState('#EF4444') // Default correction red
  const [brushSize, setBrushSize] = useState(3)
  
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: 800,
      isDrawingMode: !readOnly,
    })

    fabricRef.current = canvas

    // Load background image
    fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      const scale = canvas.width! / img.width!
      img.set({
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
      })
      canvas.add(img)
      canvas.sendObjectToBack(img)
      canvas.setHeight(img.height! * scale)
      
      // Load initial data if provided
      if (initialData) {
        canvas.loadFromJSON(initialData).then(() => {
          canvas.renderAll()
          saveHistory()
        })
      } else {
        saveHistory()
      }

      // Set initial brush
      setupBrush(canvas)

      // Events
      canvas.on('object:added', () => saveHistory())
      canvas.on('object:modified', () => saveHistory())
    }).catch(err => {
      console.error('Error loading image:', err)
      toast.error('Failed to load image')
    })

    return () => {
      canvas.dispose()
    }
  }, [imageUrl])

  const setupBrush = (canvas: fabric.Canvas) => {
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color
      canvas.freeDrawingBrush.width = brushSize
    }
  }

  useEffect(() => {
    if (fabricRef.current && fabricRef.current.freeDrawingBrush) {
        fabricRef.current.isDrawingMode = activeTool === 'pen' && !readOnly
        fabricRef.current.freeDrawingBrush.color = color
        fabricRef.current.freeDrawingBrush.width = brushSize
    }
  }, [activeTool, color, brushSize])

  const saveHistory = () => {
    if (!fabricRef.current) return
    const json = JSON.stringify(fabricRef.current.toJSON())
    setHistory(prev => [...prev.slice(0, historyIndex + 1), json])
    setHistoryIndex(prev => prev + 1)
  }

  const undo = () => {
    if (historyIndex <= 0 || !fabricRef.current) return
    const prev = history[historyIndex - 1]
    fabricRef.current.loadFromJSON(prev).then(() => {
      if (fabricRef.current) {
        fabricRef.current.renderAll()
        setHistoryIndex(historyIndex - 1)
      }
    })
  }

  const addText = () => {
    if (!fabricRef.current) return
    setActiveTool('select')
    const text = new fabric.IText('Add comment...', {
      left: 100,
      top: 100,
      fontFamily: 'Inter',
      fontSize: 20,
      fill: color,
    })
    fabricRef.current.add(text)
    fabricRef.current.setActiveObject(text)
  }

  const addStamp = (type: 'tick' | 'cross') => {
    if (!fabricRef.current) return
    setActiveTool('select')
    const text = new fabric.Text(type === 'tick' ? '✓' : '✗', {
      left: 150,
      top: 150,
      fontSize: 40,
      fontWeight: 'bold',
      fill: type === 'tick' ? '#10B981' : '#EF4444',
    })
    fabricRef.current.add(text)
  }

  const deleteSelected = () => {
    if (!fabricRef.current) return
    const activeObjects = fabricRef.current.getActiveObjects()
    fabricRef.current.remove(...activeObjects)
    fabricRef.current.discardActiveObject()
  }

  const handleSave = () => {
    if (!fabricRef.current) return
    onSave(fabricRef.current.toJSON())
    toast.success('Annotations saved locally!')
  }

  const COLORS = ['#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#000000']

  return (
    <Card className="flex flex-col h-full overflow-hidden border-none shadow-none">
       {/* Toolbar */}
       {!readOnly && (
         <div className="p-3 bg-[var(--input)] border-b border-[var(--card-border)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1 p-1 bg-[var(--bg)] rounded-xl border border-[var(--card-border)]">
               <ToolBtn icon={<MousePointer size={18} />} active={activeTool === 'select'} onClick={() => setActiveTool('select')} title="Select" />
               <ToolBtn icon={<Pencil size={18} />} active={activeTool === 'pen'} onClick={() => setActiveTool('pen')} title="Pen" />
               <ToolBtn icon={<Type size={18} />} active={false} onClick={addText} title="Text" />
               <div className="w-px h-6 bg-[var(--card-border)] mx-1" />
               <ToolBtn icon={<Check size={18} className="text-emerald-500" />} active={false} onClick={() => addStamp('tick')} title="Tick" />
               <ToolBtn icon={<X size={18} className="text-rose-500" />} active={false} onClick={() => addStamp('cross')} title="Cross" />
            </div>

            <div className="flex items-center gap-3">
               <div className="flex gap-1.5 px-2">
                  {COLORS.map(c => (
                    <button 
                      key={c} 
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'scale-125 border-white' : 'border-transparent'}`}
                      style={{ background: c }}
                    />
                  ))}
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Brush</span>
                  <input type="range" min="1" max="10" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} className="w-20 accent-[var(--primary)]" />
               </div>
            </div>

            <div className="flex items-center gap-1">
               <ToolBtn icon={<Undo size={18} />} active={false} onClick={undo} disabled={historyIndex <= 0} title="Undo" />
               <ToolBtn icon={<Trash2 size={18} />} active={false} onClick={deleteSelected} title="Delete" />
               <Button size="sm" onClick={handleSave} className="ml-2"><Download size={14} className="mr-2" /> Save Annotations</Button>
            </div>
         </div>
       )}

       <div ref={containerRef} className="flex-1 bg-slate-200 overflow-auto flex items-center justify-center p-8 bg-grid-pattern">
          <div className="shadow-2xl bg-white leading-[0]">
             <canvas ref={canvasRef} />
          </div>
       </div>
    </Card>
  )
}

function ToolBtn({ icon, active, onClick, disabled, title }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-lg transition-colors ${active ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:bg-[var(--input)]'}`}
      style={{ opacity: disabled ? 0.3 : 1 }}
    >
      {icon}
    </button>
  )
}
