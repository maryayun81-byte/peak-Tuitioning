'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { 
  Highlighter, ArrowRight, Circle, Minus, Type, 
  Pen, Check, X, RotateCcw, Trash2, CheckCircle2 
} from 'lucide-react'

interface AnnotationCanvasProps {
  backgroundText?: string
  backgroundJson?: string
  backgroundImageUrl?: string   
  initialJson?: string
  onSave: (json: string) => void
  readOnly?: boolean
  defaultColor?: string
  height?: number
}

type Tool = 'highlight' | 'line' | 'circle' | 'underline' | 'arrow' | 'text' | 'draw' | 'tick' | 'cross' | 'select' | 'pan' | 'ruler' | 'protractor'

const TOOL_CONFIG: { tool: Tool; icon: React.ReactNode; label: string; color?: string }[] = [
  { tool: 'select',     icon: <CheckCircle2 size={14} />, label: 'Select',     color: '#6366f1' },
  { tool: 'pan',        icon: <RotateCcw size={14} className="rotate-90" />, label: 'Pan', color: '#64748b' },
  { tool: 'ruler',      icon: <Minus size={14} />, label: 'Ruler', color: '#94a3b8' },
  { tool: 'protractor', icon: <Circle size={14} />, label: 'Protractor', color: '#94a3b8' },
  { tool: 'draw',       icon: <Pen size={14} />,         label: 'Pen',         color: undefined },
  { tool: 'line',       icon: <Minus size={14} />,       label: 'Line',        color: undefined },
  { tool: 'text',       icon: <Type size={14} />,        label: 'Comment',     color: undefined },
  { tool: 'tick',       icon: <Check size={14} />,       label: 'Tick ✓',     color: '#10B981' },
  { tool: 'cross',      icon: <X size={14} />,           label: 'Cross ✗',    color: '#EF4444' },
  { tool: 'highlight',  icon: <Highlighter size={14} />, label: 'Highlight',   color: '#FDE047' },
  { tool: 'underline',  icon: <Minus size={14} />,       label: 'Underline',   color: undefined },
  { tool: 'circle',     icon: <Circle size={14} />,      label: 'Circle',      color: undefined },
  { tool: 'arrow',      icon: <ArrowRight size={14} />,  label: 'Arrow',       color: undefined },
]

export function AnnotationCanvas({
  backgroundText, backgroundJson, backgroundImageUrl, initialJson,
  onSave, readOnly, defaultColor = '#EF4444', height
}: AnnotationCanvasProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const fabricRef  = useRef<any>(null)
  const debRef     = useRef<any>(null)
  const [activeTool, setActiveTool] = useState<Tool>(readOnly ? 'select' : 'draw')
  const [color, setColor]           = useState(defaultColor)
  const [zoom, setZoom]             = useState(1)

  const onSaveRef = useRef(onSave)
  useEffect(() => { onSaveRef.current = onSave }, [onSave])

  // Capture initial props in refs so the canvas only reads them ONCE on mount.
  // This is critical: if these were deps, every student save (which updates
  // initialJson via parent state) would teardown+reinit the canvas and wipe drawings.
  const initialJsonRef    = useRef(initialJson)
  const backgroundTextRef = useRef(backgroundText)
  const backgroundJsonRef = useRef(backgroundJson)
  const backgroundImageUrlRef = useRef(backgroundImageUrl)
  const defaultColorRef   = useRef(defaultColor)

  const serialize = useCallback((canvas: any) => {
    if (!canvas) return ''
    // Force a re-render to ensure all data is current
    canvas.renderAll()
    const json = canvas.toJSON(['data', 'selectable', 'evented'])
    
    // Aggressively filter out background objects to prevent duplication
    if (json.objects) {
       json.objects = json.objects.filter((o: any) => {
          // Exclude if explicitly marked as background OR if it's an instrument OR if it's a locked doc layer
          return !o.data?.background && !o.data?.isInstrument && o.selectable !== false
       })
    }
    
    // Save current width to allow scaling on different screens
    json.canvasWidth = canvas.width
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
        backgroundColor: backgroundImageUrlRef.current ? 'transparent' : '#ffffff',
        isDrawingMode: false,
      })

      // ── 0. Background: uploaded document image ────────────────────────────
      if (backgroundImageUrlRef.current) {
        try {
          const { FabricImage } = await import('fabric')
          await new Promise<void>((resolve) => {
            FabricImage.fromURL(backgroundImageUrlRef.current!, { crossOrigin: 'anonymous' }).then((img: any) => {
              const scaleX = containerW / (img.width || containerW)
              img.set({
                left: 0, top: 0,
                scaleX, scaleY: scaleX,
                selectable: false, evented: false,
                data: { background: true },
              })
              canvas.add(img)
              if (!height) {
                const imgH = (img.height || 800) * scaleX
                if (imgH > h) { h = imgH; canvas.setHeight(h) }
              }
              canvas.renderAll()
              resolve()
            }).catch(() => resolve())
          })
        } catch {}
      }

      // ── 1. Background: virtual-paper / diagram JSON ───────────────────────
      if (backgroundJsonRef.current) {
        try {
          const data = JSON.parse(backgroundJsonRef.current)
          
          // Determine scaling factor
          let scaleFactor = 1
          if (data.canvasWidth && data.canvasWidth !== containerW) {
             scaleFactor = containerW / data.canvasWidth
          } else if (!data.canvasWidth && containerW !== 800) {
             scaleFactor = containerW / 800
          }

          const tmp = new Canvas()
          await tmp.loadFromJSON(data)
          const objects = tmp.getObjects()

          if (objects.length > 0) {
            // If we have a document OR we have explicit canvasWidth, we use linear coordinate scaling.
            // If it's a pure diagram (no doc, no width), we use the "fit to width" bounding box logic.
            const useLinearScale = !!backgroundImageUrlRef.current || !!data.canvasWidth
            
            if (useLinearScale) {
               objects.forEach((obj: any) => {
                  obj.set({
                     left:   (obj.left || 0) * scaleFactor,
                     top:    (obj.top || 0) * scaleFactor,
                     scaleX: (obj.scaleX || 1) * scaleFactor,
                     scaleY: (obj.scaleY || 1) * scaleFactor,
                     selectable: false, evented: false,
                     opacity: readOnly ? 1 : 0.85,
                     data: { background: true },
                  })
                  canvas.add(obj)
               })
            } else {
               // Legacy "fit to width" logic for diagrams
               let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
               objects.forEach((obj: any) => {
                  const l = obj.left || 0; const t = obj.top || 0
                  const w = (obj.width || 0) * (obj.scaleX || 1)
                  const wh = (obj.height || 0) * (obj.scaleY || 1)
                  if (l < minX) minX = l; if (t < minY) minY = t
                  if (l + w > maxX) maxX = l + w; if (t + wh > maxY) maxY = t + wh
               })
               const contentW = maxX - minX || 1
               const fitScale = (containerW - 64) / contentW
               objects.forEach((obj: any) => {
                  obj.set({
                     left:   ((obj.left || 0) - minX) * fitScale + 32,
                     top:    ((obj.top || 0) - minY) * fitScale + 32,
                     scaleX: (obj.scaleX || 1) * fitScale,
                     scaleY: (obj.scaleY || 1) * fitScale,
                     selectable: false, evented: false,
                     opacity: readOnly ? 1 : 0.85,
                     data: { background: true },
                  })
                  canvas.add(obj)
               })
            }

            // Adjust height
            if (!height) {
              let maxBottom = h
              canvas.getObjects().forEach((obj: any) => {
                const b = (obj.top || 0) + (obj.height || 0) * (obj.scaleY || 1) + 60
                if (b > maxBottom) maxBottom = b
              })
              if (maxBottom > h) { h = maxBottom; canvas.setHeight(h) }
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
          
          // Determine scaling factor if dimensions changed
          let scaleFactor = 1
          if (data.canvasWidth && data.canvasWidth !== containerW) {
             scaleFactor = containerW / data.canvasWidth
          } else if (!data.canvasWidth && containerW !== 800) {
             // Fallback for legacy JSON: assume it was drawn on an 800px base
             scaleFactor = containerW / 800
          }

          const tmp  = new Canvas()
          await tmp.loadFromJSON(data)
          tmp.getObjects().forEach((obj: any) => {
            const isLegacyBg = obj.type === 'textbox' && obj.text === backgroundTextRef.current
            
            // CRITICAL: Skip if it's explicitly marked as background OR if it's a non-selectable object.
            // In teacher marking sessions, only the teacher's actual marks are selectable.
            // Any "leaked" student work from previous sessions will be non-selectable.
            if (obj.data?.background || isLegacyBg || obj.selectable === false || obj.evented === false) {
               return
            }
            
            // Apply coordinate and size scaling
            if (scaleFactor !== 1) {
               obj.set({
                  left:   (obj.left || 0) * scaleFactor,
                  top:    (obj.top || 0) * scaleFactor,
                  scaleX: (obj.scaleX || 1) * scaleFactor,
                  scaleY: (obj.scaleY || 1) * scaleFactor,
               })
            }
            
            // Ensure data property is preserved
            if (!obj.data) obj.data = {}
            
            canvas.add(obj)
          })
          if (!height) {
            let maxBottom = 200
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
        let contentBottom = 160 // minimum height
        canvas.getObjects().forEach((obj: any) => {
          const bottom = (obj.top || 0) + (obj.height || 0) * (obj.scaleY || 1)
          if (bottom > contentBottom) contentBottom = bottom
        })
        const finalH = contentBottom + 80 // 80px bottom padding
        if (finalH < h) canvas.setHeight(finalH)
      }

      // ── Event Handlers: Zoom & Pan ─────────────────────────────────────────
      const { Point } = await import('fabric')
      canvas.on('mouse:wheel', (opt: any) => {
        const delta = opt.e.deltaY
        let newZoom = canvas.getZoom()
        newZoom *= 0.999 ** delta
        if (newZoom > 5) newZoom = 5
        if (newZoom < 1) newZoom = 1
        canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), newZoom)
        opt.e.preventDefault()
        opt.e.stopPropagation()
        setZoom(newZoom)
      })

      let isPanning = false
      let isDrawingShape = false
      let shapeObj: any = null
      let shapeStart: { x: number, y: number } | null = null
      let lastPosX = 0
      let lastPosY = 0

      canvas.on('mouse:down', async (opt: any) => {
         const activeTool = (fabricRef.current as any).activeTool
         if (activeTool === 'pan' || opt.e.altKey) {
            isPanning = true
            canvas.selection = false
            lastPosX = opt.e.clientX
            lastPosY = opt.e.clientY
         } else if (['line', 'circle', 'arrow', 'underline'].includes(activeTool)) {
            isDrawingShape = true
            const pointer = canvas.getScenePoint(opt.e)
            shapeStart = { x: pointer.x, y: pointer.y }
            const { Line, Circle: FC, Group, Triangle } = await import('fabric')
            
            if (activeTool === 'line' || activeTool === 'underline') {
               shapeObj = new Line([pointer.x, pointer.y, pointer.x, pointer.y], { stroke: color, strokeWidth: 3, selectable: true })
            } else if (activeTool === 'circle') {
               shapeObj = new FC({ left: pointer.x, top: pointer.y, radius: 0, fill: 'transparent', stroke: color, strokeWidth: 3, selectable: true, originX: 'center', originY: 'center' })
            } else if (activeTool === 'arrow') {
               const line = new Line([0, 0, 0, 0], { stroke: color, strokeWidth: 3 })
               const head = new Triangle({ left: 0, top: 0, angle: 90, width: 15, height: 15, fill: color, originX: 'center', originY: 'center', selectable: false })
               shapeObj = new Group([line, head], { left: pointer.x, top: pointer.y, selectable: true })
               shapeObj.set('data', { isArrow: true })
            }
            if (shapeObj) canvas.add(shapeObj)
         }
      })

      canvas.on('mouse:move', (opt: any) => {
         const activeTool = (fabricRef.current as any).activeTool
         const pointer = canvas.getScenePoint(opt.e)

         if (isPanning && fabricRef.current) {
            const e = opt.e
            const vpt = canvas.viewportTransform
            vpt[4] += e.clientX - lastPosX
            vpt[5] += e.clientY - lastPosY
            canvas.requestRenderAll()
            lastPosX = e.clientX
            lastPosY = e.clientY
         } else if (isDrawingShape && shapeObj && shapeStart) {
            if (activeTool === 'line' || activeTool === 'underline') {
               shapeObj.set({ x2: pointer.x, y2: pointer.y })
            } else if (activeTool === 'circle') {
               const radius = Math.sqrt(Math.pow(pointer.x - shapeStart.x, 2) + Math.pow(pointer.y - shapeStart.y, 2))
               shapeObj.set({ radius })
            } else if (activeTool === 'arrow') {
               const line = shapeObj.item(0)
               const head = shapeObj.item(1)
               line.set({ x2: pointer.x - shapeStart.x, y2: pointer.y - shapeStart.y })
               const angle = Math.atan2(pointer.y - shapeStart.y, pointer.x - shapeStart.x) * (180 / Math.PI)
               head.set({ left: pointer.x - shapeStart.x, top: pointer.y - shapeStart.y, angle: angle + 90 })
            }
            canvas.requestRenderAll()
         }
      })
      canvas.on('mouse:up', () => {
         isPanning = false
         if (isDrawingShape) {
            isDrawingShape = false
            shapeObj = null
            shapeStart = null
            save(canvas)
         }
         canvas.selection = true
      })

      fabricRef.current = canvas
      // Help inner logic know about tool
      fabricRef.current.activeTool = activeTool

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
      canvas.on('object:added',    () => {
         // If it's NOT an instrument, save
         const objects = canvas.getObjects()
         const last = objects[objects.length - 1] as any
         if (!last?.data?.isInstrument) save(canvas)
      })
    }

    // ── Keyboard Listeners ────────────────────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
       if (e.key === 'Delete' || e.key === 'Backspace') {
          const active = fabricRef.current?.getActiveObject() as any
          if (active && !active.isEditing) {
             if (active.type === 'activeSelection') {
                active.forEachObject((o: any) => { if (!o.data?.background) fabricRef.current?.remove(o) })
                fabricRef.current?.discardActiveObject()
             } else if (!active.data?.background) {
                fabricRef.current?.remove(active)
             }
             fabricRef.current?.requestRenderAll()
             save(fabricRef.current)
          }
       }
    }
    window.addEventListener('keydown', handleKeyDown)

    init()
    return () => {
      cancelled = true
      window.removeEventListener('keydown', handleKeyDown)
      if (debRef.current) clearTimeout(debRef.current)
      if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null }
    }
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
      case 'ruler': {
         const { Rect, Group, Line, IText } = await import('fabric')
         const base = new Rect({ width: 400, height: 60, fill: 'rgba(255, 255, 255, 0.4)', stroke: '#94a3b8', strokeWidth: 1 })
         const items: any[] = [base]
         // Add 20 ticks
         for (let i = 0; i <= 20; i++) {
            const x = (i / 20) * 400
            const h = i % 5 === 0 ? 15 : 8
            items.push(new Line([x, 0, x, h], { stroke: '#475569', strokeWidth: 1 }))
            if (i % 5 === 0) items.push(new IText((i/2).toString(), { left: x - 4, top: 18, fontSize: 10, fill: '#475569' }))
         }
         const ruler = new Group(items, { left: 100, top: 100 })
         ruler.set('data', { isInstrument: true })
         canvas.add(ruler); canvas.setActiveObject(ruler); break
      }
      case 'protractor': {
         const { Circle: FC, Group, Line, IText } = await import('fabric')
         const base = new FC({ radius: 100, startAngle: 180, endAngle: 360, fill: 'rgba(255, 255, 255, 0.4)', stroke: '#94a3b8', strokeWidth: 1 })
         const bottomLine = new Line([0, 100, 200, 100], { stroke: '#94a3b8', strokeWidth: 1 })
         const items: any[] = [base, bottomLine]
         for (let i = 0; i <= 180; i += 10) {
            const rad = (i - 180) * (Math.PI / 180)
            const x1 = 100 + 100 * Math.cos(rad); const y1 = 100 + 100 * Math.sin(rad)
            const x2 = 100 + 85 * Math.cos(rad);  const y2 = 100 + 85 * Math.sin(rad)
            items.push(new Line([x1, y1, x2, y2], { stroke: '#475569', strokeWidth: 1 }))
            const tx = 100 + 70 * Math.cos(rad); const ty = 100 + 70 * Math.sin(rad)
            items.push(new IText(i.toString(), { left: tx - 5, top: ty - 5, fontSize: 8, fill: '#475569' }))
         }
         const protractor = new Group(items, { left: 100, top: 100 })
         protractor.set('data', { isInstrument: true })
         canvas.add(protractor); canvas.setActiveObject(protractor); break
      }
      case 'highlight': canvas.add(new Rect({ left: 40, top: cy, width: w - 80, height: 28, fill: color, opacity: 0.4, selectable: true })); break
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
    if (fabricRef.current) fabricRef.current.activeTool = t
    const tc = TOOL_CONFIG.find(c => c.tool === t)?.color ?? color
    setColor(tc)
    const canvas = fabricRef.current
    if (!canvas) return
    if (t === 'select' || t === 'pan') {
      canvas.isDrawingMode = false
      canvas.selection = (t === 'select')
      canvas.forEachObject((o: any) => { 
         if (!o.data?.background) { 
            o.selectable = (t === 'select')
            o.evented = (t === 'select')
         } 
      })
      canvas.renderAll()
      return
    }
    addObject(t)
  }

  const handleManualZoom = (direction: 'in' | 'out' | 'reset') => {
     const canvas = fabricRef.current; if (!canvas) return
     let newZoom = canvas.getZoom()
     if (direction === 'in') newZoom *= 1.2
     else if (direction === 'out') newZoom /= 1.2
     else newZoom = 1
     
     if (newZoom > 5) newZoom = 5
     if (newZoom < 1) newZoom = 1
     
     // Zoom to center
     canvas.zoomToPoint({ x: canvas.width / 2, y: 100 } as any, newZoom)
     setZoom(newZoom)
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
            <div className="flex bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mr-2">
               <button onClick={() => handleManualZoom('out')} className="px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 border-r border-slate-50 text-xs font-black">-</button>
               <button onClick={() => handleManualZoom('reset')} className="px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 border-r border-slate-50 text-[10px] font-black">{Math.round(zoom * 100)}%</button>
               <button onClick={() => handleManualZoom('in')} className="px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 text-xs font-black">+</button>
            </div>
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
