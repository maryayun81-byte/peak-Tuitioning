'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Highlighter, ArrowRight, Circle, Minus, Type,
  Pen, Check, X, RotateCcw, Trash2, CheckCircle2,
  Eraser, Palette, PaintBucket, Droplets, ChevronDown, Hand
} from 'lucide-react'

interface AnnotationCanvasProps {
  pageId?: string
  backgroundText?: string
  backgroundJson?: string
  backgroundImageUrl?: string   
  initialJson?: string
  initialData?: string
  onSave: (json: string) => unknown
  readOnly?: boolean
  defaultColor?: string
  height?: number
  /**
   * Pin the toolbar to the top of the scroll viewport (default true).
   * Set false on the teacher marking canvases: a pinned bar permanently
   * covers the top of the photo on small phones, so there the toolbar
   * scrolls away with the content instead.
   */
  stickyToolbar?: boolean
}

type Tool = 'highlight' | 'line' | 'circle' | 'underline' | 'arrow' | 'text' | 'draw' | 'tick' | 'cross' | 'select' | 'pan' | 'ruler' | 'protractor' | 'eraser'

const TOOL_CONFIG: { tool: Tool; icon: React.ReactNode; label: string; color?: string }[] = [
  { tool: 'select',     icon: <CheckCircle2 size={14} />, label: 'Select',     color: '#6366f1' },
  { tool: 'pan',        icon: <Hand size={14} />, label: 'Move / Scroll page', color: '#64748b' },
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

/**
 * Builds a buttery freehand brush. Fabric already renders midpoint-quadratic
 * curves, so the remaining shakiness is 100% input noise: raw touch points
 * (finger jitter at 60–120Hz) fed straight into the path.
 *
 * - `_addPoint` is wrapped with an exponential stabilizer: each incoming
 *   point is pulled toward the running trail (t=0.55). High-frequency jitter
 *   melts away while deliberate direction changes track with no visible lag.
 *   Real fabric.Point instances are preserved (spread would strip class
 *   methods the renderer needs). First point of every stroke passes through
 *   raw so dots and stroke starts land exactly under the finger.
 * - `decimate` 3px (finger-scale) instead of fabric's 0.4px mouse default.
 * - Round caps/joins set explicitly (butt caps would notch every segment).
 */
function makeButteryBrush(
  PencilBrushClass: any,
  PointClass: any,
  canvas: any,
  color: string,
  width: number
): any {
  const brush = new PencilBrushClass(canvas)
  brush.color = color
  brush.width = width
  brush.strokeLineCap = 'round'
  brush.strokeLineJoin = 'round'
  try { brush.decimate = 3 } catch { /* older fabric — default stands */ }

  const origAddPoint = brush._addPoint.bind(brush)
  const SMOOTHING = 0.55
  brush._addPoint = function (pointer: any, ...rest: any[]) {
    try {
      const trail = brush._points
      if (!trail || trail.length === 0 || typeof pointer?.x !== 'number') {
        return origAddPoint(pointer, ...rest)
      }
      const last = trail[trail.length - 1]
      const x = last.x + (pointer.x - last.x) * SMOOTHING
      const y = last.y + (pointer.y - last.y) * SMOOTHING
      return origAddPoint(new PointClass(x, y), ...rest)
    } catch {
      return origAddPoint(pointer, ...rest)
    }
  }
  return brush
}

export function AnnotationCanvas({
  backgroundText, backgroundJson, backgroundImageUrl, initialJson, initialData,
  onSave, readOnly, defaultColor = '#EF4444', height, stickyToolbar = true
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
  // Right-click / long-press context menu (delete marks without hunting
  // for the Delete key or eraser). Position is wrapper-relative.
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; label: string } | null>(null)
  const ctxTargetRef = useRef<any>(null)
  const longPressRef = useRef<{ timer: any; x: number; y: number; baseline: number } | null>(null)
  // QC (mobile): the two-row sticky toolbar used to cover ~90px of the photo
  // at all times (a "dark layer" over the work in dark mode). Fine controls
  // start collapsed on phones; the essential tool row always stays.
  const [toolbarOpen, setToolbarOpen] = useState<boolean>(
    () => typeof window === 'undefined' || window.innerWidth >= 640
  )

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
  const initialJsonRef    = useRef(initialJson ?? initialData)
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
  useEffect(() => {
    widthRef.current = strokeWidth
    // Live-sync width onto the active brush so the slider feels instant —
    // previously it only applied the next time the pen tool was re-tapped.
    try {
      const b = fabricRef.current?.freeDrawingBrush
      if (b && fabricRef.current?.isDrawingMode) b.width = strokeWidth
    } catch {}
  }, [strokeWidth])
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
    // Pinch-to-zoom listener handles (registered inside init, removed in cleanup).
    let touchCleanup: (() => void) | null = null
    const init = async () => {
      if (!canvasRef.current || fabricRef.current) return
      const { Canvas, Textbox, PencilBrush, Point } = await import('fabric')
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
      // (Point already imported at the top of init.)
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


      // ── Touch: pinch-to-zoom (phones/tablets) ──────────────────────────
      // Teachers zoom into handwriting with two fingers. The gesture is fully
      // owned here: browser page-zoom is off app-wide (maximumScale=1), moves
      // are preventDefaulted (non-passive), and drawing is suspended for the
      // gesture so the first finger can't leave a stray stroke. Scroll/draw
      // balance is untouched — single-finger behavior is exactly as before.
      let pinch: { startDist: number; startZoom: number; baseline: number } | null = null
      const touchDist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2 && canvas) {
          const d = touchDist(e.touches[0], e.touches[1])
          if (d > 0) {
            pinch = { startDist: d, startZoom: canvas.getZoom(), baseline: canvas.getObjects().length }
            canvas.isDrawingMode = false
          }
        }
      }
      const onTouchMove = (e: TouchEvent) => {
        if (!pinch || e.touches.length < 2 || !canvasRef.current) return
        e.preventDefault() // own the gesture: no page scroll/zoom mid-pinch
        const d = touchDist(e.touches[0], e.touches[1])
        if (d <= 0) return
        let nz = pinch.startZoom * (d / pinch.startDist)
        if (nz > 5) nz = 5
        if (nz < 1) nz = 1
        const rect = canvasRef.current.getBoundingClientRect()
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top
        canvas.zoomToPoint(new Point(mx, my), nz)
        setZoom(nz)
      }
      const onTouchEnd = (e: TouchEvent) => {
        if (!pinch || e.touches.length >= 2) return
        // Trim any path the first finger started before the second landed —
        // only objects added during the gesture can be pinch artifacts.
        try {
          const objs = canvas.getObjects()
          while (objs.length > pinch.baseline) canvas.remove(objs[objs.length - 1])
          canvas.requestRenderAll()
        } catch {}
        // Restore the tool's drawing state (Move/Select stay non-drawing).
        try { canvas.isDrawingMode = (fabricRef.current as any)?.activeTool === 'draw' } catch {}
        pinch = null
      }
      const killGesture = (e: Event) => { try { e.preventDefault() } catch {} }
      const wrapEl = wrapperRef.current
      wrapEl?.addEventListener('touchstart', onTouchStart, { passive: true })
      wrapEl?.addEventListener('touchmove', onTouchMove, { passive: false })
      wrapEl?.addEventListener('touchend', onTouchEnd)
      wrapEl?.addEventListener('touchcancel', onTouchEnd)
      wrapEl?.addEventListener('gesturestart' as any, killGesture)
      touchCleanup = () => {
        wrapEl?.removeEventListener('touchstart', onTouchStart)
        wrapEl?.removeEventListener('touchmove', onTouchMove)
        wrapEl?.removeEventListener('touchend', onTouchEnd)
        wrapEl?.removeEventListener('touchcancel', onTouchEnd)
        wrapEl?.removeEventListener('gesturestart' as any, killGesture)
      }

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
          } else if (['line', 'circle', 'arrow', 'underline', 'highlight'].includes(activeTool)) {
            isDrawingShape = true
            const pointer = canvas.getScenePoint(opt.e)
            shapeStart = { x: pointer.x, y: pointer.y }
            const { Line, Circle: FC, Group, Triangle, Rect } = await import('fabric')
            const sw = widthRef.current
            const c  = colorRef.current
            const op = opacityRef.current / 100

            if (activeTool === 'highlight') {
               // Drag-to-highlight: grows with the drag, always translucent
               // like a real marker (never an opaque bar).
               shapeObj = new Rect({
                  left: pointer.x, top: pointer.y, width: 4, height: 12,
                  fill: c, opacity: Math.min(op, 0.35),
                  selectable: true,
               })
            } else if (activeTool === 'line' || activeTool === 'underline') {
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
            if (activeTool === 'highlight') {
               // Grow in any drag direction; never collapse below a visible band.
               shapeObj.set({
                  left: Math.min(shapeStart.x, pointer.x),
                  top: Math.min(shapeStart.y, pointer.y),
                  width: Math.max(Math.abs(pointer.x - shapeStart.x), 4),
                  height: Math.max(Math.abs(pointer.y - shapeStart.y), 10),
               })
            } else if (activeTool === 'line' || activeTool === 'underline') {
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

      // Default to draw mode — stabilized brush (see makeButteryBrush).
      // Width scales with canvas size so the pen isn't a fat marker on phones.
      canvas.isDrawingMode = true
      const scaledWidth = Math.max(3, Math.round(containerW / 180))
      const brush = makeButteryBrush(PencilBrush, Point, canvas, defaultColorRef.current, scaledWidth)
      setStrokeWidth(scaledWidth)
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
      try { touchCleanup?.() } catch {}
      touchCleanup = null
      // QC (data loss): saves are debounced 500ms — switching workbook pages
      // (which remounts this canvas per page) right after a stroke used to
      // silently drop it. Flush synchronously before dispose.
      if (debRef.current) {
        clearTimeout(debRef.current)
        debRef.current = null
        try { if (fabricRef.current) onSaveRef.current(serialize(fabricRef.current)) } catch {}
      }
      if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null }
    }
  }, [readOnly, height])

  // ── Object insertion helpers ──────────────────────────────────────────────
  const addObject = useCallback(async (tool: Tool) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const { IText, Circle: FC, Line, Rect, PencilBrush, Point } = await import('fabric')

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
      case 'highlight':
        // Highlight is drag-drawn via mouse handlers (see above) — reaching
        // here would mean a fixed stamp, which is never what teachers want.
        canvas.isDrawingMode = false
        break
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
        canvas.freeDrawingBrush = makeButteryBrush(PencilBrush, Point, canvas, c, sw)
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
    setCtxMenu(null)
    if (fabricRef.current) fabricRef.current.activeTool = t
    const canvas = fabricRef.current
    if (!canvas) return
    // Move tool doubles as page-scroll mode on touch devices: fabric flips
    // the canvas touch-action to `manipulation` so one finger scrolls the
    // page instead of drawing; every marking tool pins it back to `none`.
    // (The wrapper div uses pan-y so it never vetoes the gesture.)
    try { canvas.allowTouchScrolling = (t === 'pan') } catch {}
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
    // Drag tools draw on the canvas — never stamp fixed objects for them
    // (highlight used to drop a full-width bar at a fixed spot).
    if (['line', 'circle', 'arrow', 'underline', 'highlight'].includes(t)) {
      canvas.isDrawingMode = false
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

  // ── Context menu: right-click (desktop) / long-press (touch) → delete ──
  const describeTarget = (t: any): string => {
    if (!t) return 'mark'
    if (t.type === 'i-text' || t.type === 'textbox') {
      return t.text === '✓' || t.text === '✗' ? 'mark' : 'comment'
    }
    return 'mark'
  }

  const openCtxMenuAt = useCallback((clientX: number, clientY: number) => {
    const canvas = fabricRef.current
    const wrap = wrapperRef.current
    if (!canvas || !wrap || readOnly) return false
    let target: any = null
    try {
      // Plain coordinate bag is enough — fabric only reads clientX/clientY.
      target = canvas.findTarget({ clientX, clientY, target: canvasRef.current, type: 'contextmenu' } as any)
    } catch { target = null }
    if (!target || target.data?.background) {
      setCtxMenu(null)
      ctxTargetRef.current = null
      return false
    }
    ctxTargetRef.current = target
    const r = wrap.getBoundingClientRect()
    setCtxMenu({
      x: Math.max(4, Math.min(clientX - r.left, r.width - 164)),
      y: Math.max(4, Math.min(clientY - r.top, r.height - 120)),
      label: describeTarget(target),
    })
    return true
  }, [readOnly])

  const deleteCtxTarget = useCallback(() => {
    const canvas = fabricRef.current
    const target = ctxTargetRef.current
    if (!canvas || !target) { setCtxMenu(null); return }
    canvas.remove(target)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    save(canvas)
    ctxTargetRef.current = null
    setCtxMenu(null)
  }, [save])

  // Escape closes the menu.
  useEffect(() => {
    if (!ctxMenu) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCtxMenu(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ctxMenu])

  const cancelLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer)
      longPressRef.current = null
    }
  }, [])

  return (
    <div
      ref={wrapperRef}
      className="flex flex-col bg-white relative"
      // height prop → contained modal usage. No height → page scrolls past the canvas.
      style={height ? { height: height + 52, overflow: 'hidden' } : {}}
      onContextMenu={(e) => {
        // Desktop right-click on a mark → delete menu (background clicks dismiss).
        e.preventDefault()
        openCtxMenuAt(e.clientX, e.clientY)
      }}
      onTouchStart={(e) => {
        // Touch long-press (550ms, single finger, no drift) → same menu.
        // Armed on empty canvas only in Select mode (a pen stroke must NEVER
        // be interrupted), but anytime directly on an existing mark.
        if (readOnly || e.touches.length !== 1 || longPressRef.current) return
        const t = e.touches[0]
        if (activeTool !== 'select') {
          let onMark = false
          try {
            const c = fabricRef.current
            if (c) {
              const hit = c.findTarget({ clientX: t.clientX, clientY: t.clientY, target: canvasRef.current, type: 'touchstart' } as any)
              onMark = !!(hit && !hit.data?.background)
            }
          } catch { onMark = false }
          if (!onMark) return
        }
        const baseline = fabricRef.current ? fabricRef.current.getObjects().length : 0
        longPressRef.current = {
          timer: setTimeout(() => {
            longPressRef.current = null
            const prevTool = ((fabricRef.current as any)?.activeTool as Tool) || 'draw'
            // Stop inking + select, so the press leaves no dot behind…
            setTool('select')
            try {
              const c = fabricRef.current
              if (c) {
                const objs = c.getObjects()
                while (objs.length > baseline) c.remove(objs[objs.length - 1])
                c.requestRenderAll()
              }
            } catch {}
            // …then offer the menu, restoring the tool if empty space was pressed.
            if (!openCtxMenuAt(t.clientX, t.clientY)) setTool(prevTool)
          }, 550),
          x: t.clientX,
          y: t.clientY,
          baseline,
        }
      }}
      onTouchMove={(e) => {
        const lp = longPressRef.current
        if (lp && e.touches[0] && Math.hypot(e.touches[0].clientX - lp.x, e.touches[0].clientY - lp.y) > 12) {
          cancelLongPress()
        }
      }}
      onTouchEnd={cancelLongPress}
      onTouchCancel={cancelLongPress}
    >
      {!readOnly && (
        <div
          className={stickyToolbar ? 'sticky top-0 z-20' : 'relative z-10'}
          // pan-x pan-y (NOT none): the tool row itself must stay
          // horizontally scrollable on touch — `none` here vetoes every
          // scroll gesture and traps tools off-screen on phones. The fabric
          // canvas element still pins its own touch-action while drawing.
          style={{ touchAction: 'pan-x pan-y' }}
        >          <div style={{
            background: 'var(--card)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--card-border)',
          }}>
            {/* Row 1: Tools — always visible, slim so it never buries the photo */}
            <div className="flex items-center gap-0.5 px-1.5 py-1 overflow-x-auto no-scrollbar" style={{ color: 'var(--text)' }}>
              {/* Selection */}
              <div className="flex items-center gap-0.5">
                {(['select', 'pan'] as const).map(t => {
                  const cfg = TOOL_CONFIG.find(c => c.tool === t)!
                  const active = activeTool === t
                  return (
                    <button key={t} onClick={() => setTool(t)}
                      className="px-1.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1 min-w-[38px] min-h-[38px]"
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
                      className="px-1.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1 min-w-[38px] min-h-[38px]"
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
                      className="px-1.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1 min-w-[38px] min-h-[38px]"
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
                      className="px-1.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1 min-w-[38px] min-h-[38px]"
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
                      className="px-1.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1 min-w-[38px] min-h-[38px]"
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
                      className="px-1.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1 min-w-[38px] min-h-[38px]"
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

              <div className="flex-1" />
              {/* Quick color dot — stays available when fine controls collapse */}
              <button
                onClick={() => setShowColorPicker(v => !v)}
                className="shrink-0 w-[38px] h-[38px] rounded-lg border-2 flex items-center justify-center transition-all hover:scale-105"
                style={{
                  background: color,
                  borderColor: showColorPicker ? '#6366f1' : 'rgba(0,0,0,0.1)',
                  boxShadow: showColorPicker ? '0 0 0 2px rgba(99,102,241,0.35)' : 'none',
                }}
                title={`Pen color: ${color} — tap to change`}
                aria-label="Change pen color"
              />
              {/* Collapse fine controls — the overlay shrinks to one slim row */}
              <button
                onClick={() => setToolbarOpen(v => !v)}
                className="shrink-0 w-[38px] h-[38px] rounded-lg flex items-center justify-center transition-colors"
                style={{ background: toolbarOpen ? 'var(--input)' : 'transparent', color: 'var(--text-muted)' }}
                title={toolbarOpen ? 'Hide pen controls' : 'Show pen controls (color, size)'}
                aria-label={toolbarOpen ? 'Hide pen controls' : 'Show pen controls'}
              >
                <ChevronDown size={16} style={{ transform: toolbarOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            </div>

            {/* Shared color picker — anchored to the toolbar root so it works
                whether fine controls are open or collapsed */}
            {showColorPicker && (
              <div
                className="absolute top-full right-2 mt-1.5 p-2.5 rounded-2xl border shadow-2xl z-30 min-w-[220px]"
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

            {/* Row 2: Color, Width, Font Size, Opacity, Fill, Zoom, Undo, Clear */}
            {toolbarOpen && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-t flex-wrap" style={{ borderColor: 'var(--card-border)' }}>
              {/* Color Picker */}
              <div>
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

              <button onClick={undo} className="min-w-[38px] min-h-[38px] rounded-lg flex items-center justify-center transition-all hover:bg-[var(--input)]" style={{ color: 'var(--text-muted)' }} title="Undo"><RotateCcw size={13} /></button>
              <button onClick={clear} className="min-w-[38px] min-h-[38px] rounded-lg flex items-center justify-center transition-all hover:bg-rose-500/10" style={{ color: 'var(--text-muted)' }} title="Clear all annotations"><Trash2 size={13} /></button>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Canvas fills its natural height — no internal scroll.
          Editable mode uses pan-y (not none): the fabric canvas itself still
          pins touch to `none` while a marking tool is active (so the pen
          draws), but switching to the Move tool flips fabric to
          allowTouchScrolling, letting the finger scroll the page naturally.
          A blanket `none` here would veto that and trap teachers inside the
          photo on phones. */}
      <div style={{ touchAction: readOnly ? 'auto' : 'pan-y' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
      </div>

      {/* Context menu: right-click / long-press → delete this mark */}
      {ctxMenu && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null) }}
          />
          <div
            className="absolute z-[61] min-w-[160px] rounded-2xl border shadow-2xl p-1.5"
            style={{ left: ctxMenu.x, top: ctxMenu.y, background: 'var(--card)', borderColor: 'var(--card-border)' }}
          >
            <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Delete this {ctxMenu.label}?
            </div>
            <button
              onClick={deleteCtxTarget}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black text-white transition-transform active:scale-95"
              style={{ background: '#EF4444' }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}
