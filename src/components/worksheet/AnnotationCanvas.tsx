'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { 
  Highlighter, ArrowRight, Circle, Minus, Type, 
  Pen, Check, X, RotateCcw, Trash2, CheckCircle2,
  Eraser, Palette, PaintBucket, Droplets
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

type Tool = 'highlight' | 'line' | 'circle' | 'underline' | 'arrow' | 'text' | 'draw' | 'tick' | 'cross' | 'select' | 'pan' | 'ruler' | 'protractor' | 'eraser'

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
  { tool: 'eraser',     icon: <Eraser size={14} />,     label: 'Eraser',      color: undefined },
]

interface ColorOption { name: string; hex: string }
const COLORS: ColorOption[] = [
  { name: 'Correct Green', hex: '#059669' },
  { name: 'Error Red', hex: '#DC2626' },
  { name: 'Warning Amber', hex: '#F59E0B' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Sky Blue', hex: '#0EA5E9' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Black', hex: '#000000' },
  { name: 'Slate', hex: '#475569' },
  { name: 'Stone', hex: '#78716C' },
  { name: 'Gray', hex: '#94A3B8' },
  { name: 'Highlight Yellow', hex: '#FDE047' },
]
const STROKE_WIDTHS = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20]

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
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [fontSize, setFontSize]     = useState(18)
  const [fillMode, setFillMode]     = useState<'fill' | 'outline'>('outline')
  const [opacity, setOpacity]       = useState(100)
  const [colorHistory, setColorHistory] = useState<string[]>(['#EF4444', '#3B82F6', '#10B981'])
  const [hexInput, setHexInput] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)

  useEffect(() => {
    if (color && !colorHistory.includes(color)) {
      setColorHistory(prev => [color, ...prev].slice(0, 6))
    }
  }, [color])

  // Apply color changes to selected objects on canvas
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (canvas.isDrawingMode && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color
    }
    const active = canvas.getActiveObject() as any
    if (!active || active.data?.background) return
    const isText = active.type === 'i-text' || active.type === 'textbox'
    if (isText) {
      if (active.isEditing) {
        // Apply to the selected character range inside the text box
        const start = active.selectionStart ?? 0
        const end   = active.selectionEnd   ?? 0
        if (start !== end) {
          active.setSelectionStyles({ fill: color }, start, end)
        } else {
          // Nothing selected — color the whole object and set as default for next chars
          active.set('fill', color)
        }
      } else {
        active.set('fill', color)
      }
      canvas.renderAll()
    } else if (active.type === 'activeSelection') {
      active.forEachObject((o: any) => {
        if (o.type === 'i-text' || o.type === 'textbox') o.set('fill', color)
        else if (o.stroke) o.set('stroke', color)
      })
      canvas.renderAll()
    } else if (active.stroke) {
      active.set('stroke', color)
      if (active.fill && active.fill !== 'transparent') active.set('fill', color + '33')
      canvas.renderAll()
    }
  }, [color])

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

  // Refs to read live state inside effect closures (canvas event handlers)
  const colorRef       = useRef(color)
  const widthRef       = useRef(strokeWidth)
  const fontSizeRef    = useRef(fontSize)
  const fillRef        = useRef(fillMode)
  const opacityRef     = useRef(opacity)
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => { widthRef.current = strokeWidth }, [strokeWidth])
  useEffect(() => { fontSizeRef.current = fontSize }, [fontSize])
  useEffect(() => { fillRef.current = fillMode }, [fillMode])
  useEffect(() => { opacityRef.current = opacity }, [opacity])

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
      let isErasing = false
      let isDrawingShape = false
      let shapeObj: any = null
      let shapeStart: { x: number, y: number } | null = null
      let lastPosX = 0
      let lastPosY = 0

      canvas.on('mouse:down', async (opt: any) => {
         const activeTool = (fabricRef.current as any).activeTool
         if (activeTool === 'eraser') {
             isErasing = true
             const obj = canvas.findTarget(opt.e)
             if (obj && !(obj as any).data?.background) {
                canvas.remove(obj)
                canvas.requestRenderAll()
             }
          } else if (activeTool === 'pan' || opt.e.altKey) {
            isPanning = true
            canvas.selection = false
            lastPosX = opt.e.clientX
            lastPosY = opt.e.clientY
         } else if (['line', 'circle', 'arrow', 'underline'].includes(activeTool)) {
            isDrawingShape = true
            const pointer = canvas.getScenePoint(opt.e)
            shapeStart = { x: pointer.x, y: pointer.y }
            const { Line, Circle: FC, Group, Triangle } = await import('fabric')
            const sw = widthRef.current
            const c  = colorRef.current
            const op = opacityRef.current / 100
            
            if (activeTool === 'line' || activeTool === 'underline') {
               shapeObj = new Line([pointer.x, pointer.y, pointer.x, pointer.y], { stroke: c, strokeWidth: sw, selectable: true, opacity: op })
            } else if (activeTool === 'circle') {
               const fill = fillRef.current === 'fill' ? c + '33' : 'transparent'
               shapeObj = new FC({ left: pointer.x, top: pointer.y, radius: 0, stroke: c, strokeWidth: sw, fill, selectable: true, originX: 'center', originY: 'center', opacity: op })
            } else if (activeTool === 'arrow') {
               const line = new Line([0, 0, 0, 0], { stroke: c, strokeWidth: sw, opacity: op })
               const head = new Triangle({ left: 0, top: 0, angle: 90, width: Math.max(10, sw * 3), height: Math.max(10, sw * 3), fill: c, originX: 'center', originY: 'center', selectable: false, opacity: op })
               shapeObj = new Group([line, head], { left: pointer.x, top: pointer.y, selectable: true })
               shapeObj.set('data', { isArrow: true })
            }
            if (shapeObj) canvas.add(shapeObj)
         }
      })

      canvas.on('mouse:move', (opt: any) => {
         const activeTool = (fabricRef.current as any).activeTool
         const pointer = canvas.getScenePoint(opt.e)

          if (isErasing && activeTool === 'eraser') {
             const obj = canvas.findTarget(opt.e)
             if (obj && !(obj as any).data?.background) {
               canvas.remove(obj)
               canvas.requestRenderAll()
            }
         } else if (isPanning && fabricRef.current) {
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
         if (isErasing) {
            isErasing = false
            save(canvas)
         }
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
      brush.width = widthRef.current
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
    const sw = widthRef.current
    const c  = colorRef.current
    const op = opacityRef.current / 100

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
      case 'highlight': canvas.add(new Rect({ left: 40, top: cy, width: w - 80, height: 28, fill: c, opacity: op * 0.6, selectable: true })); break
      case 'text': {
        // Place text at the center of the currently visible scroll area
        const scrollTop = wrapperRef.current?.closest('[data-scroll]')?.scrollTop
          ?? wrapperRef.current?.parentElement?.scrollTop
          ?? 0
        const visibleCy = scrollTop + (wrapperRef.current?.offsetHeight ?? 400) / 2
        const t = new IText('Comment...', {
          left: 40,
          top: Math.max(20, visibleCy - 20),
          fontSize: fontSizeRef.current,
          fill: c,
          fontWeight: 'bold',
          selectable: true,
          editable: true,
          opacity: op,
        })
        canvas.add(t); canvas.setActiveObject(t); t.enterEditing(); t.selectAll(); break
      }
      case 'tick':  canvas.add(new IText('✓', { left: cx - 20, top: cy - 20, fontSize: Math.max(24, sw * 6), fill: '#10B981', fontWeight: 'bold', selectable: true, opacity: op })); break
      case 'cross': canvas.add(new IText('✗', { left: cx - 20, top: cy - 20, fontSize: Math.max(24, sw * 6), fill: '#EF4444', fontWeight: 'bold', selectable: true, opacity: op })); break
      case 'draw': {
        canvas.isDrawingMode = true
        const b = new PencilBrush(canvas)
        b.color = c; b.width = sw
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
  }, [save])

  const setTool = (t: Tool) => {
    setActiveTool(t)
    if (fabricRef.current) fabricRef.current.activeTool = t
    const canvas = fabricRef.current
    if (!canvas) return
    if (t === 'select' || t === 'pan' || t === 'eraser') {
      canvas.isDrawingMode = false
      canvas.selection = (t === 'select')
      canvas.forEachObject((o: any) => { 
         if (!o.data?.background) { 
            o.selectable = (t === 'select')
            o.evented = (t === 'select' || t === 'eraser')
         } 
      })
      canvas.defaultCursor = t === 'eraser' ? 'not-allowed' : 'default'
      canvas.renderAll()
      return
    }
    const tc = TOOL_CONFIG.find(c => c.tool === t)?.color
    if (tc) setColor(tc)
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
        <div className="sticky top-0 z-20" style={{ touchAction: 'none' }}>
          <div style={{
            background: 'var(--card)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--card-border)',
          }}>
            {/* Row 1: Tools */}
            <div className="flex items-center gap-0.5 px-1.5 py-1 overflow-x-auto no-scrollbar" style={{ color: 'var(--text)' }}>
              {/* Selection */}
              <div className="flex items-center gap-0.5">
                {(['select', 'pan'] as const).map(t => {
                  const cfg = TOOL_CONFIG.find(c => c.tool === t)!
                  const active = activeTool === t
                  return (
                    <button key={t} onClick={() => setTool(t)}
                      className="px-1.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1"
                      style={{
                        background: active ? (cfg.color || color) : 'transparent',
                        color: active ? 'white' : 'var(--text-muted)',
                      }}
                      title={cfg.label}>
                      {cfg.icon}
                    </button>
                  )
                })}
              </div>
              <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: 'var(--card-border)' }} />

              {/* Draw */}
              <div className="flex items-center gap-0.5">
                {(['draw', 'line', 'arrow', 'circle', 'underline'] as const).map(t => {
                  const cfg = TOOL_CONFIG.find(c => c.tool === t)!
                  const active = activeTool === t
                  return (
                    <button key={t} onClick={() => setTool(t)}
                      className="px-1.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1"
                      style={{
                        background: active ? (cfg.color || color) : 'transparent',
                        color: active ? 'white' : 'var(--text-muted)',
                      }}
                      title={cfg.label}>
                      {cfg.icon}
                      {t === 'draw' && <span className="hidden sm:inline text-[9px]">Pen</span>}
                    </button>
                  )
                })}
              </div>
              <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: 'rgba(0,0,0,0.06)' }} />

              {/* Mark */}
              <div className="flex items-center gap-0.5">
                {(['tick', 'cross', 'highlight'] as const).map(t => {
                  const cfg = TOOL_CONFIG.find(c => c.tool === t)!
                  const active = activeTool === t
                  return (
                    <button key={t} onClick={() => setTool(t)}
                      className="px-1.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1"
                      style={{
                        background: active ? (t === 'tick' ? '#10B981' : t === 'cross' ? '#EF4444' : '#FDE047') : 'transparent',
                        color: active ? (t === 'highlight' ? '#000' : 'white') : 'var(--text-muted)',
                      }}
                      title={cfg.label}>
                      {cfg.icon}
                    </button>
                  )
                })}
              </div>
              <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: 'rgba(0,0,0,0.06)' }} />

              {/* Text */}
              <div className="flex items-center gap-0.5">
                {(['text'] as const).map(t => {
                  const cfg = TOOL_CONFIG.find(c => c.tool === t)!
                  const active = activeTool === t
                  return (
                    <button key={t} onClick={() => setTool(t)}
                      className="px-1.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1"
                      style={{
                        background: active ? (cfg.color || color) : 'transparent',
                        color: active ? 'white' : 'var(--text-muted)',
                      }}
                      title={cfg.label}>
                      {cfg.icon}
                    </button>
                  )
                })}
              </div>
              <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: 'rgba(0,0,0,0.06)' }} />

              {/* Eraser */}
              <div className="flex items-center gap-0.5">
                {(['eraser'] as const).map(t => {
                  const cfg = TOOL_CONFIG.find(c => c.tool === t)!
                  const active = activeTool === t
                  return (
                    <button key={t} onClick={() => setTool(t)}
                      className="px-1.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1"
                      style={{
                        background: active ? 'rgba(239,68,68,0.15)' : 'transparent',
                        color: active ? '#EF4444' : 'var(--text-muted)',
                      }}
                      title={cfg.label}>
                      {cfg.icon}
                    </button>
                  )
                })}
              </div>
              <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: 'rgba(0,0,0,0.06)' }} />

              {/* Instruments */}
              <div className="flex items-center gap-0.5">
                {(['ruler', 'protractor'] as const).map(t => {
                  const cfg = TOOL_CONFIG.find(c => c.tool === t)!
                  const active = activeTool === t
                  return (
                    <button key={t} onClick={() => setTool(t)}
                      className="px-1.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1"
                      style={{
                        background: active ? '#94a3b8' : 'transparent',
                        color: active ? 'white' : 'var(--text-muted)',
                      }}
                      title={cfg.label}>
                      {cfg.icon}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Row 2: Color, Width, Font Size, Opacity, Fill, Zoom, Undo, Clear */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-t flex-wrap" style={{ borderColor: 'var(--card-border)' }}>
              {/* Color Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(v => !v)}
                  className="w-7 h-7 rounded-lg border-2 transition-all hover:scale-105"
                  style={{
                    background: color,
                    borderColor: 'rgba(0,0,0,0.1)',
                    boxShadow: showColorPicker ? '0 0 0 2px rgba(99,102,241,0.35)' : 'none',
                  }}
                  title={`Color: ${color}`}
                />
                {showColorPicker && (
                  <div
                    className="absolute top-full left-0 mt-1.5 p-2.5 rounded-2xl border shadow-2xl z-30 min-w-[220px]"
                    style={{
                      background: 'var(--card)',
                      backdropFilter: 'blur(20px)',
                      borderColor: 'var(--card-border)',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    {colorHistory.length > 0 && (
                      <div className="mb-2">
                        <div className="text-[7px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Recent</div>
                        <div className="flex gap-1 flex-wrap">
                          {colorHistory.map(c => (
                            <button key={c} onClick={() => { setColor(c); setShowColorPicker(false) }}
                              className="w-5 h-5 rounded-md border transition-transform hover:scale-125"
                              style={{ backgroundColor: c, borderColor: 'rgba(0,0,0,0.08)' }} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-6 gap-1 mb-2">
                      {COLORS.map(c => (
                        <button key={c.hex} onClick={() => { setColor(c.hex); setShowColorPicker(false) }}
                          className="w-6 h-6 rounded-lg border transition-all hover:scale-110"
                          style={{
                            backgroundColor: c.hex,
                            borderColor: color === c.hex ? 'rgba(99,102,241,0.5)' : 'rgba(0,0,0,0.06)',
                            outline: color === c.hex ? '2px solid #6366f1' : 'none',
                            outlineOffset: '1px',
                          }}
                          title={c.name} />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono font-black" style={{ color: 'var(--text-muted)' }}>#</span>
                      <input value={hexInput} onChange={e => setHexInput(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))}
                        onKeyDown={e => { if (e.key === 'Enter' && hexInput.length === 6) { setColor(`#${hexInput}`); setShowColorPicker(false) } }}
                        className="flex-1 px-2 py-1 text-[10px] font-mono rounded-lg border focus:outline-none focus:ring-2"
                        style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
                        placeholder="000000" maxLength={6} />
                      {hexInput.length === 6 && (
                        <div className="w-5 h-5 rounded border shrink-0" style={{ backgroundColor: `#${hexInput}`, borderColor: 'rgba(0,0,0,0.08)' }} />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Stroke Width */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--input)' }}>
                <Pen size={10} style={{ color: 'var(--text-muted)' }} />
                <input type="range" min={1} max={20} value={strokeWidth}
                  onChange={e => setStrokeWidth(Number(e.target.value))}
                  className="w-12 h-0.5 accent-indigo-500 cursor-pointer" />
                <div className="flex items-center gap-1 min-w-[26px]">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color, opacity: 0.3 + (strokeWidth / 20) * 0.7 }} />
                  <span className="text-[8px] font-black tabular-nums" style={{ color: 'var(--text-muted)' }}>{strokeWidth}</span>
                </div>
              </div>

              {/* Font Size — only relevant when text tool is active */}
              {activeTool === 'text' && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--input)' }}>
                  <Type size={10} style={{ color: 'var(--text-muted)' }} />
                  <input type="range" min={10} max={72} step={2} value={fontSize}
                    onChange={e => setFontSize(Number(e.target.value))}
                    className="w-12 h-0.5 accent-indigo-500 cursor-pointer" />
                  <span className="text-[8px] font-black tabular-nums" style={{ color: 'var(--text-muted)' }}>{fontSize}px</span>
                </div>
              )}

              {/* Opacity */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--input)' }}>
                <Droplets size={10} style={{ color: 'var(--text-muted)' }} />
                <input type="range" min={10} max={100} step={10} value={opacity}
                  onChange={e => setOpacity(Number(e.target.value))}
                  className="w-10 h-0.5 accent-indigo-500 cursor-pointer" />
                <span className="text-[8px] font-black tabular-nums" style={{ color: 'var(--text-muted)' }}>{opacity}%</span>
              </div>

              {/* Fill toggle */}
              <button onClick={() => setFillMode(f => f === 'fill' ? 'outline' : 'fill')}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: fillMode === 'fill' ? 'rgba(99,102,241,0.12)' : 'var(--input)',
                  color: fillMode === 'fill' ? '#6366f1' : 'var(--text-muted)',
                }}
                title={`Fill: ${fillMode}`}>
                <PaintBucket size={12} />
              </button>

              <div className="w-px h-4" style={{ background: 'var(--card-border)' }} />

              {/* Zoom */}
              <div className="flex items-center rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.04)' }}>
                <button onClick={() => handleManualZoom('out')} className="px-1.5 py-1 text-[10px] font-black transition-all hover:bg-black/5" style={{ color: 'rgba(0,0,0,0.4)' }}>-</button>
                <button onClick={() => handleManualZoom('reset')} className="px-1.5 py-1 text-[8px] font-black tracking-tight border-x" style={{ color: 'rgba(0,0,0,0.5)', borderColor: 'rgba(0,0,0,0.04)' }}>{Math.round(zoom * 100)}%</button>
                <button onClick={() => handleManualZoom('in')} className="px-1.5 py-1 text-[10px] font-black transition-all hover:bg-black/5" style={{ color: 'rgba(0,0,0,0.4)' }}>+</button>
              </div>

              <div className="flex-1" />

              <button onClick={undo} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--input)]" style={{ color: 'var(--text-muted)' }} title="Undo"><RotateCcw size={11} /></button>
              <button onClick={clear} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-rose-500/10" style={{ color: 'var(--text-muted)' }} title="Clear all annotations"><Trash2 size={11} /></button>
            </div>
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
