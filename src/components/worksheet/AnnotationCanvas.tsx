'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { 
  Highlighter, ArrowRight, Circle, Minus, Type, 
  Pen, Check, X, RotateCcw, Trash2, CheckCircle2 
} from 'lucide-react'

interface AnnotationCanvasProps {
  backgroundText?: string
  backgroundJson?: string
  initialJson?: string
  onSave: (json: string) => void
  readOnly?: boolean
  defaultColor?: string
  /** Pass height ONLY for a contained editor (e.g. inside a modal).
   *  When omitted the canvas auto-expands to fit all content — the page scrolls, not the canvas. */
  height?: number
}

type Tool = 'highlight' | 'arrow' | 'circle' | 'underline' | 'text' | 'draw' | 'tick' | 'cross' | 'select'

const TOOL_CONFIG: { tool: Tool; icon: React.ReactNode; label: string; color?: string }[] = [
  { tool: 'select',     icon: <CheckCircle2 size={14} />, label: 'Select/Move', color: '#6366f1' },
  { tool: 'draw',       icon: <Pen size={14} />,         label: 'Pen',         color: undefined },
  { tool: 'text',       icon: <Type size={14} />,        label: 'Comment',     color: undefined },
  { tool: 'tick',       icon: <Check size={14} />,       label: 'Tick ✓',     color: '#10B981' },
  { tool: 'cross',      icon: <X size={14} />,           label: 'Cross ✗',    color: '#EF4444' },
  { tool: 'highlight',  icon: <Highlighter size={14} />, label: 'Highlight',   color: '#FDE047' },
  { tool: 'underline',  icon: <Minus size={14} />,       label: 'Underline',   color: undefined },
  { tool: 'circle',     icon: <Circle size={14} />,      label: 'Circle',      color: undefined },
  { tool: 'arrow',      icon: <ArrowRight size={14} />,  label: 'Arrow',       color: undefined },
]

export function AnnotationCanvas({
  backgroundText, backgroundJson, initialJson,
  onSave, readOnly, defaultColor = '#EF4444', height
}: AnnotationCanvasProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const fabricRef  = useRef<any>(null)
  const debRef     = useRef<any>(null)
  const [activeTool, setActiveTool] = useState<Tool>(readOnly ? 'select' : 'draw')
  const [color, setColor]           = useState(defaultColor)

  const onSaveRef = useRef(onSave)
  useEffect(() => { onSaveRef.current = onSave }, [onSave])

  // Capture initial props in refs so the canvas only reads them ONCE on mount.
  // This is critical: if these were deps, every student save (which updates
  // initialJson via parent state) would teardown+reinit the canvas and wipe drawings.
  const initialJsonRef    = useRef(initialJson)
  const backgroundTextRef = useRef(backgroundText)
  const backgroundJsonRef = useRef(backgroundJson)
  const defaultColorRef   = useRef(defaultColor)

  const serialize = useCallback((canvas: any) => {
    if (!canvas) return ''
    const json = canvas.toJSON(['data'])
    json.objects = json.objects.filter((o: any) => !o.data?.background)
    return JSON.stringify(json)
  }, [])

  const save = useCallback((canvas: any) => {
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => onSaveRef.current(serialize(canvas)), 500)
  }, [serialize])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      if (!canvasRef.current || fabricRef.current) return
      const { Canvas, Textbox, PencilBrush } = await import('fabric')
      if (cancelled) return

      // Defer measurement so the container has its final layout dimensions
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      if (cancelled) return

      const containerW = wrapperRef.current?.offsetWidth || window.innerWidth || 680

      // Start with full height; we'll shrink after content is measured
      let h = height ?? 800

      const canvas = new Canvas(canvasRef.current, {
        width: containerW,
        height: h,
        backgroundColor: '#ffffff',
        isDrawingMode: false,
      })

      // ── 1. Background: virtual-paper / diagram JSON ───────────────────────
      if (backgroundJsonRef.current) {
        try {
          const data = JSON.parse(backgroundJsonRef.current)
          const tmp = new Canvas()
          await tmp.loadFromJSON(data)
          const objects = tmp.getObjects()

          if (objects.length > 0) {
            // Measure the actual bounding box of the saved content
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
            objects.forEach((obj: any) => {
              const l = obj.left  || 0
              const t = obj.top   || 0
              const w = (obj.width  || 0) * (obj.scaleX || 1)
              const wh = (obj.height || 0) * (obj.scaleY || 1)
              if (l       < minX) minX = l
              if (t       < minY) minY = t
              if (l + w   > maxX) maxX = l + w
              if (t + wh  > maxY) maxY = t + wh
            })

            const contentW = maxX - minX || 1
            const contentH = maxY - minY || 1
            // Scale so the full diagram width fills the container (with 32px padding each side)
            const fitScale = (containerW - 64) / contentW

            objects.forEach((obj: any) => {
              obj.set({
                left:   ((obj.left  || 0) - minX) * fitScale + 32,
                top:    ((obj.top   || 0) - minY) * fitScale + 32,
                scaleX: (obj.scaleX || 1) * fitScale,
                scaleY: (obj.scaleY || 1) * fitScale,
                selectable: false, evented: false,
                opacity: readOnly ? 1 : 0.85,
                data: { background: true },
              })
              canvas.add(obj)
            })

            // Set canvas height to fit the scaled content
            if (!height) {
              const scaledH = contentH * fitScale + 80
              if (scaledH > h) { h = scaledH; canvas.setHeight(h) }
            }
          }
        } catch {}
      }

      // ── 2. Background: plain text essay ───────────────────────────────────
      if (backgroundTextRef.current && !backgroundJsonRef.current) {
        const tb = new Textbox(backgroundTextRef.current, {
          left: 40, top: 40,
          fontSize: 16,
          lineHeight: 1.6,
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fill: '#1e293b',
          width: containerW - 80,
          selectable: false, evented: false,
          data: { background: true },
        })
        canvas.add(tb)
        if (!height) {
          const needed = (tb.height || 0) + 160
          if (needed > h) { h = needed; canvas.setHeight(h) }
        }
      }

      // ── 3. Annotation marks (teacher OR student prior saves) ──────────────
      if (initialJsonRef.current) {
        try {
          const data = JSON.parse(initialJsonRef.current)
          const tmp  = new Canvas()
          await tmp.loadFromJSON(data)
          tmp.getObjects().forEach((obj: any) => {
            const isLegacyBg = obj.type === 'textbox' && obj.text === backgroundTextRef.current
            if (obj.data?.background || isLegacyBg) return
            canvas.add(obj)
          })
          if (!height) {
            let maxBottom = h
            canvas.getObjects().forEach((obj: any) => {
              const b = (obj.top || 0) + (obj.height || 0) * (obj.scaleY || 1) + 60
              if (b > maxBottom) maxBottom = b
            })
            if (maxBottom > h) { h = maxBottom; canvas.setHeight(h) }
          }
        } catch {}
      }

      canvas.renderAll()

      // ── Shrink canvas to actual content height (no excess whitespace) ────
      if (!height) {
        let contentBottom = 120 // minimum height
        canvas.getObjects().forEach((obj: any) => {
          const bottom = (obj.top || 0) + (obj.height || 0) * (obj.scaleY || 1)
          if (bottom > contentBottom) contentBottom = bottom
        })
        const finalH = contentBottom + 48 // 48px bottom padding
        if (finalH < h) canvas.setHeight(finalH)
      }

      fabricRef.current = canvas

      if (readOnly) {
        canvas.selection = false
        canvas.forEachObject((obj: any) => { obj.selectable = false; obj.evented = false })
        return
      }

      // Default to draw mode
      canvas.isDrawingMode = true
      const brush = new PencilBrush(canvas)
      brush.color = defaultColorRef.current
      brush.width = 2
      canvas.freeDrawingBrush = brush

      canvas.on('object:modified', () => save(canvas))
      canvas.on('object:added',    () => save(canvas))
    }

    init()
    return () => {
      cancelled = true
      if (debRef.current) clearTimeout(debRef.current)
      if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null }
    }
  // Only height and readOnly legitimately require a fresh canvas.
  // Everything else (initialJson, backgroundText, etc.) is captured in refs above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, height])

  // ── Object insertion helpers ──────────────────────────────────────────────
  const addObject = useCallback(async (tool: Tool) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const { IText, Circle: FC, Line, Rect, PencilBrush } = await import('fabric')

    const w  = canvas.width  || 680
    const cx = w / 2
    // Place new marks at vertical center of the *current viewport scroll position*
    const cy = 200

    canvas.isDrawingMode = false

    switch (tool) {
      case 'highlight': canvas.add(new Rect({ left: 40, top: cy, width: w - 80, height: 28, fill: color, opacity: 0.4, selectable: true })); break
      case 'circle':    canvas.add(new FC  ({ left: cx - 50, top: cy - 50, radius: 50, fill: 'transparent', stroke: color, strokeWidth: 5, selectable: true })); break
      case 'underline': canvas.add(new Line([40, cy, w - 40, cy], { stroke: color, strokeWidth: 5, selectable: true })); break
      case 'text': {
        const t = new IText('Comment...', { left: 40, top: cy, fontSize: 16, fill: color, fontWeight: 'bold', selectable: true, editable: true })
        canvas.add(t); canvas.setActiveObject(t); t.enterEditing(); t.selectAll(); break
      }
      case 'tick':  canvas.add(new IText('✓', { left: cx - 20, top: cy - 20, fontSize: 46, fill: '#10B981', fontWeight: 'bold', selectable: true })); break
      case 'cross': canvas.add(new IText('✗', { left: cx - 20, top: cy - 20, fontSize: 46, fill: '#EF4444', fontWeight: 'bold', selectable: true })); break
      case 'draw': {
        canvas.isDrawingMode = true
        const b = new PencilBrush(canvas)
        b.color = color; b.width = 5
        canvas.freeDrawingBrush = b
        return
      }
      case 'select':
        canvas.selection = true
        canvas.forEachObject((o: any) => { if (!o.data?.background) { o.selectable = true; o.evented = true } })
        break
    }
    canvas.renderAll()
    save(canvas)
  }, [color, save])

  const setTool = (t: Tool) => {
    setActiveTool(t)
    const tc = TOOL_CONFIG.find(c => c.tool === t)?.color ?? color
    setColor(tc)
    const canvas = fabricRef.current
    if (!canvas) return
    if (t === 'select') {
      canvas.isDrawingMode = false
      canvas.selection = true
      canvas.forEachObject((o: any) => { if (!o.data?.background) { o.selectable = true; o.evented = true } })
      canvas.renderAll()
      return
    }
    addObject(t)
  }

  const undo = () => {
    const canvas = fabricRef.current; if (!canvas) return
    const last = canvas.getObjects().filter((o: any) => !o.data?.background).pop()
    if (last) canvas.remove(last)
    save(canvas)
  }
  const clear = () => {
    const canvas = fabricRef.current; if (!canvas) return
    canvas.getObjects().forEach((o: any) => { if (!o.data?.background) canvas.remove(o) })
    save(canvas)
  }

  return (
    <div
      ref={wrapperRef}
      className="flex flex-col bg-white"
      // height prop → contained modal usage. No height → page scrolls past the canvas.
      style={height ? { height: height + 52, overflow: 'hidden' } : {}}
    >
      {!readOnly && (
        <div
          className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-100 sticky top-0 z-10"
          style={{ touchAction: 'none' }}
        >
          {TOOL_CONFIG.map(t => (
            <button
              key={t.tool}
              onClick={() => setTool(t.tool)}
              title={t.label}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-sm border"
              style={{
                background:   activeTool === t.tool ? (t.color || color) : 'white',
                color:        activeTool === t.tool ? 'white' : '#64748b',
                borderColor:  activeTool === t.tool ? 'transparent' : '#f1f5f9',
              }}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <button onClick={undo}  className="p-2 rounded-xl bg-white border border-slate-100 shadow-sm text-slate-400 hover:text-slate-700" title="Undo"><RotateCcw size={14} /></button>
            <button onClick={clear} className="p-2 rounded-xl bg-white border border-slate-100 shadow-sm text-red-300 hover:text-red-500"   title="Clear"><Trash2 size={14} /></button>
          </div>
        </div>
      )}

      {/* Canvas fills its natural height — no internal scroll */}
      <div style={{ touchAction: readOnly ? 'auto' : 'none' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
      </div>
    </div>
  )
}
