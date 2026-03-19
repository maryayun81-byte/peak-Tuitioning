'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { 
  Highlighter, ArrowRight, Circle, Minus, Type, 
  Pen, Check, X, RotateCcw, Trash2 
} from 'lucide-react'

interface AnnotationCanvasProps {
  backgroundText?: string  // rendered student answer as text
  initialJson?: string     // Fabric.js JSON to restore  
  onSave: (json: string) => void
  readOnly?: boolean
}

type Tool = 'highlight' | 'arrow' | 'circle' | 'underline' | 'text' | 'draw' | 'tick' | 'cross' | 'select'

const TOOL_CONFIG: { tool: Tool; icon: React.ReactNode; label: string; color: string }[] = [
  { tool: 'highlight',  icon: <Highlighter size={14} />, label: 'Highlight',  color: '#FDE047' },
  { tool: 'underline',  icon: <Minus size={14} />,       label: 'Underline',  color: '#FB923C' },
  { tool: 'circle',     icon: <Circle size={14} />,      label: 'Circle',     color: '#60A5FA' },
  { tool: 'arrow',      icon: <ArrowRight size={14} />,  label: 'Arrow',      color: '#34D399' },
  { tool: 'text',       icon: <Type size={14} />,        label: 'Comment',    color: '#C084FC' },
  { tool: 'draw',       icon: <Pen size={14} />,         label: 'Draw',       color: '#F472B6' },
  { tool: 'tick',       icon: <Check size={14} />,       label: 'Tick ✓',    color: '#10B981' },
  { tool: 'cross',      icon: <X size={14} />,           label: 'Cross ✗',   color: '#EF4444' },
]

export function AnnotationCanvas({ backgroundText, initialJson, onSave, readOnly }: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const [activeTool, setActiveTool] = useState<Tool>('highlight')
  const [color, setColor] = useState('#FDE047')
  const [fabricLoaded, setFabricLoaded] = useState(false)

  // Load fabric dynamically to avoid SSR issues
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      if (!canvasRef.current) return
      const { Canvas, Textbox, Circle: FCircle, Line, Rect, PencilBrush, FabricText } = await import('fabric')
      if (cancelled) return

      const canvas = new Canvas(canvasRef.current, {
        width: canvasRef.current.offsetWidth || 680,
        height: 600, // Increased default height for better visibility
        backgroundColor: '#1a1a2e',
        isDrawingMode: false,
      })

      // Render background text (Student Answer)
      if (backgroundText) {
        const text = new Textbox(backgroundText, {
          left: 20, top: 20, fontSize: 14, fill: '#c9d1d9',
          width: canvas.width! - 40,
          selectable: false,
          evented: false,
          splitByGrapheme: true, // Better wrapping for mixed content
        })
        canvas.add(text)
      }

      // Restore saved annotations
      if (initialJson) {
        try { await canvas.loadFromJSON(JSON.parse(initialJson)) } catch {}
      }

      fabricRef.current = canvas
      setFabricLoaded(true)

      if (readOnly) {
        canvas.selection = false
        canvas.forEachObject((obj: any) => { obj.selectable = false; obj.evented = false })
        return
      }

      // Auto-save on modify
      canvas.on('object:modified', () => { onSave(JSON.stringify(canvas.toJSON())) })
      canvas.on('object:added', () => { onSave(JSON.stringify(canvas.toJSON())) })
    }
    init()
    return () => {
      cancelled = true
      if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null }
    }
  }, [])

  const addObject = useCallback(async (tool: Tool) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const { FabricText, Circle: FCircle, Line, Rect, PencilBrush, Triangle } = await import('fabric')

    canvas.isDrawingMode = false

    const cx = canvas.width! / 2
    const cy = canvas.height! / 2

    if (tool === 'highlight') {
      const rect = new Rect({ left: 60, top: cy, width: 200, height: 18, fill: color, opacity: 0.45, selectable: true })
      canvas.add(rect)
    } else if (tool === 'circle') {
      const c = new FCircle({ left: cx - 40, top: cy - 40, radius: 40, fill: 'transparent', stroke: color, strokeWidth: 3, selectable: true })
      canvas.add(c)
    } else if (tool === 'underline') {
      const line = new Line([60, cy, 260, cy], { stroke: color, strokeWidth: 3, selectable: true })
      canvas.add(line)
    } else if (tool === 'text') {
      const text = new FabricText('Comment here...', { left: cx - 60, top: cy, fontSize: 13, fill: color, selectable: true, editable: true })
      canvas.add(text)
      canvas.setActiveObject(text)
    } else if (tool === 'tick') {
      const text = new FabricText('✓', { left: cx, top: cy - 20, fontSize: 36, fill: '#10B981', selectable: true, fontWeight: 'bold' })
      canvas.add(text)
    } else if (tool === 'cross') {
      const text = new FabricText('✗', { left: cx, top: cy - 20, fontSize: 36, fill: '#EF4444', selectable: true, fontWeight: 'bold' })
      canvas.add(text)
    } else if (tool === 'draw') {
      canvas.isDrawingMode = true
      canvas.freeDrawingBrush = new PencilBrush(canvas)
      canvas.freeDrawingBrush.color = color
      canvas.freeDrawingBrush.width = 3
      return
    }
    canvas.renderAll()
  }, [color])

  const setTool = (t: Tool) => {
    setActiveTool(t)
    const toolColor = TOOL_CONFIG.find(tc => tc.tool === t)?.color ?? color
    setColor(toolColor)
    if (t !== 'draw' && fabricRef.current) fabricRef.current.isDrawingMode = false
    if (t === 'select') return
    addObject(t)
  }

  const undo = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const objects = canvas.getObjects()
    if (objects.length > 0) {
      const last = objects[objects.length - 1]
      if (!(last as any).data?.background) canvas.remove(last)
    }
    onSave(JSON.stringify(canvas.toJSON()))
  }

  const clear = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.getObjects().forEach((obj: any) => { if (!(obj as any).data?.background) canvas.remove(obj) })
    onSave('{}')
  }

  return (
    <div className="flex flex-col h-full">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 p-2" style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--input)' }}>
          {TOOL_CONFIG.map(t => (
            <button
              key={t.tool}
              onClick={() => setTool(t.tool)}
              title={t.label}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: activeTool === t.tool ? t.color : 'transparent',
                color: activeTool === t.tool ? 'white' : 'var(--text-muted)',
              }}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <button onClick={undo} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }} title="Undo"><RotateCcw size={14} /></button>
            <button onClick={clear} className="p-1.5 rounded-lg text-red-400" title="Clear all"><Trash2 size={14} /></button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-hidden rounded-xl" style={{ background: '#1a1a2e' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}
