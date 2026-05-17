'use client'

import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Arrow, Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva'
import { useDataChannel } from '@livekit/components-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Atom,
  Circle as CircleIcon,
  Compass,
  ChevronRight,
  Download,
  Dna,
  Eraser,
  FlaskConical,
  Grid3X3,
  Image as ImageIcon,
  Info,
  Minus,
  Move,
  PenTool,
  RotateCcw,
  RotateCw,
  Ruler,
  Sigma,
  Triangle,
  Trash2,
  Type,
  Undo,
  X,
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

type ToolGroupId = 'draw' | 'math' | 'chemistry' | 'biology' | 'physics'

const TOOL_GROUPS: { id: ToolGroupId; label: string; icon: any; tools: { id: string; label: string; icon: any }[] }[] = [
  {
    id: 'draw', label: 'Draw', icon: PenTool,
    tools: [
      { id: 'pen', label: 'Pen', icon: PenTool },
      { id: 'eraser', label: 'Eraser', icon: Eraser },
      { id: 'line', label: 'Straight Line', icon: Minus },
      { id: 'pan', label: 'Pan / Scroll', icon: Move },
    ],
  },
  {
    id: 'math', label: 'Mathematics', icon: Sigma,
    tools: [
      { id: 'ruler', label: 'Precision Ruler', icon: Ruler },
      { id: 'protractor', label: 'Protractor', icon: Compass },
      { id: 'compass', label: 'Drawing Compass', icon: CircleIcon },
      { id: 'setSquare', label: 'Set Square', icon: Triangle },
      { id: 'grid', label: 'Graph Grid', icon: Grid3X3 },
    ],
  },
  {
    id: 'chemistry', label: 'Chemistry', icon: FlaskConical,
    tools: [
      { id: 'chemistry', label: 'Conical Flask', icon: FlaskConical },
      { id: 'beaker', label: 'Beaker', icon: FlaskConical },
      { id: 'atom', label: 'Atomic Structure', icon: Atom },
    ],
  },
  {
    id: 'biology', label: 'Biology', icon: Dna,
    tools: [
      { id: 'biology', label: 'Cell Structure', icon: CircleIcon },
      { id: 'dna', label: 'DNA Helix', icon: Dna },
    ],
  },
  {
    id: 'physics', label: 'Physics', icon: Atom,
    tools: [
      { id: 'force', label: 'Force Vector', icon: Sigma },
      { id: 'physics', label: 'Circuit Node', icon: Atom },
    ],
  },
]

type DrawingTool = 'pen' | 'eraser' | 'line' | 'pan'
type InstrumentTool = 'ruler' | 'protractor' | 'compass' | 'setSquare' | 'chemistry' | 'beaker' | 'biology' | 'dna' | 'physics' | 'force'
type BoardTool = DrawingTool | InstrumentTool
type BoardTemplate = 'plain' | 'graph' | 'lab' | 'axis'
type InstrumentType = InstrumentTool | 'axis'

type BoardLine = {
  id: string
  tool: DrawingTool
  points: number[]
  color: string
  strokeWidth: number
}

type BoardShape = {
  id: string
  type: InstrumentType
  x: number
  y: number
  color: string
  scale: number
  rotation: number
}

type BoardBackground = {
  name: string
  dataUrl: string
}

type BoardMessage =
  | { type: 'line'; line: BoardLine }
  | { type: 'shape'; shape: BoardShape }
  | { type: 'template'; template: BoardTemplate }
  | { type: 'background'; background: BoardBackground | null }
  | { type: 'request-sync' }
  | { type: 'snapshot'; lines: BoardLine[]; shapes: BoardShape[]; template: BoardTemplate; background: BoardBackground | null }
  | { type: 'clear' }
  | { type: 'undo'; id: string }
  | { type: 'shape-update'; id: string; patch: Partial<BoardShape> }

type BoardPayload = BoardMessage & { sessionId?: string }

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ffffff']
function isDrawingTool(value: BoardTool): value is DrawingTool {
  return value === 'pen' || value === 'eraser' || value === 'line' || value === 'pan'
}

function normalizeSessionId(id: any): string {
  return String(id).trim()
}

const PeakWhiteboard = forwardRef(({ sessionId: rawSessionId, readOnly = false, initialBackground }: { sessionId: string | number; readOnly?: boolean; initialBackground?: string }, ref) => {
  const sessionId = useMemo(() => normalizeSessionId(rawSessionId), [rawSessionId])
  const stageRef = useRef<any>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isDrawing = useRef(false)
  const currentLineId = useRef<string | null>(null)
  const currentLine = useRef<BoardLine | null>(null)
  
  const [tool, setTool] = useState<string>('pen')
  const [color, setColor] = useState('#10b981')
  const [lines, setLines] = useState<BoardLine[]>([])
  const [shapes, setShapes] = useState<BoardShape[]>([])
  const [template, setTemplate] = useState<BoardTemplate>('plain')
  const [background, setBackground] = useState<BoardBackground | null>(initialBackground ? { name: 'slide', dataUrl: initialBackground } : null)
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [openGroup, setOpenGroup] = useState<ToolGroupId | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [stageWidth, setStageWidth] = useState(1000)
  const [indicator, setIndicator] = useState<{ x: number, y: number, text: string } | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      if (boardRef.current) {
        setStageWidth(boardRef.current.clientWidth)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const encode = useMemo(() => new TextEncoder(), [])
  const decode = useMemo(() => new TextDecoder(), [])

  const publish = useCallback((message: BoardMessage) => {
    send(encode.encode(JSON.stringify({ ...message, sessionId })), { reliable: true }).catch(console.warn)
  }, [encode, sessionId])

  useImperativeHandle(ref, () => ({
    exportImage: () => {
      if (stageRef.current) {
        return stageRef.current.toDataURL()
      }
      return null
    }
  }))

  const { send } = useDataChannel('WHITEBOARD', (msg) => {
    try {
      const data = JSON.parse(decode.decode(msg.payload)) as BoardPayload
      if (data.sessionId && data.sessionId !== sessionId) return

      if (data.type === 'line') setLines(prev => [...prev, data.line])
      if (data.type === 'shape') setShapes(prev => [...prev, data.shape])
      if (data.type === 'shape-update') setShapes(prev => prev.map(s => s.id === data.id ? { ...s, ...data.patch } : s))
      if (data.type === 'template') setTemplate(data.template)
      if (data.type === 'background') setBackground(data.background)
      if (data.type === 'clear') { setLines([]); setShapes([]); setBackground(null) }
      if (data.type === 'undo') setLines(prev => prev.filter(l => l.id !== data.id))
    } catch (e) { console.warn(e) }
  })

  const updateShape = (id: string, patch: Partial<BoardShape>) => {
    if (readOnly) return
    setShapes(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    publish({ type: 'shape-update', id, patch })
  }

  useEffect(() => {
    let mounted = true
    const loadSnapshot = async () => {
      const { data } = await supabase
        .from('live_session_whiteboards')
        .select('snapshot')
        .eq('session_id', sessionId)
        .maybeSingle()
      if (mounted && data?.snapshot) {
        setLines(data.snapshot.lines || [])
        setShapes(data.snapshot.shapes || [])
        setTemplate(data.snapshot.template || 'plain')
        setBackground(data.snapshot.background || null)
      }
    }
    loadSnapshot()
    return () => { mounted = false }
  }, [sessionId, supabase])

  useEffect(() => {
    if (readOnly) return
    const timer = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('live_session_whiteboards').upsert({
        session_id: sessionId,
        snapshot: { lines, shapes, template, background },
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'session_id' })
    }, 1000)
    return () => clearTimeout(timer)
  }, [lines, shapes, template, background, sessionId, supabase, readOnly])

  const onRotate = (deg: number) => {
    if (!selectedShapeId || readOnly) return
    const shape = shapes.find(s => s.id === selectedShapeId)
    if (shape) updateShape(selectedShapeId, { rotation: (shape.rotation || 0) + deg })
  }

  const handleMouseDown = (e: any) => {
    if (readOnly) return
    const stage = e.target.getStage()
    if (e.target !== stage) return
    
    // Convert screen coordinates to virtual coordinates (1200px width)
    const scale = stageWidth / 1200
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const pos = { x: pointer.x / scale, y: pointer.y / scale }
    
    if (tool !== 'pen' && tool !== 'eraser' && tool !== 'line' && tool !== 'pan') {
       const newShape: BoardShape = { id: Date.now().toString(), type: tool as InstrumentType, x: pos.x, y: pos.y, color, scale: 1, rotation: 0 }
       setShapes(prev => [...prev, newShape])
       publish({ type: 'shape', shape: newShape })
    } else {
       isDrawing.current = true
       currentLineId.current = Date.now().toString()
       const newLine: BoardLine = { id: currentLineId.current, tool: tool as DrawingTool, points: [pos.x, pos.y], color, strokeWidth: tool === 'eraser' ? 20 : 4 }
       currentLine.current = newLine
       setLines(prev => [...prev, newLine])
    }
  }

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || !currentLine.current) return
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const scale = stageWidth / 1200
    const pos = { x: pointer.x / scale, y: pointer.y / scale }

    let nextX = pos.x
    let nextY = pos.y
    let lengthText = ""

    // --- RULER SNAPPING LOGIC ---
    if (tool === 'line' && selectedShapeId) {
      const ruler = shapes.find(s => s.id === selectedShapeId && s.type === 'ruler')
      if (ruler) {
        const rad = (ruler.rotation || 0) * (Math.PI / 180)
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        
        const dx = pos.x - ruler.x
        const dy = pos.y - ruler.y
        const localX = dx * cos + dy * sin
        const localY = -dx * sin + dy * cos
        
        if (Math.abs(localY) < 40 && localX >= 0 && localX <= 400) {
           nextX = ruler.x + localX * cos
           nextY = ruler.y + localX * sin
           lengthText = `${Math.round(localX / 10)} cm`
        }
      }
    }

    if (tool === 'line' && !lengthText) {
       const dx = nextX - currentLine.current.points[0]
       const dy = nextY - currentLine.current.points[1]
       const dist = Math.sqrt(dx*dx + dy*dy)
       lengthText = `${Math.round(dist / 10)} units`
    }

    setIndicator(lengthText ? { x: nextX + 10, y: nextY + 10, text: lengthText } : null)

    const nextPoints = tool === 'line' 
      ? [currentLine.current.points[0], currentLine.current.points[1], nextX, nextY]
      : [...currentLine.current.points, nextX, nextY]

    currentLine.current = { ...currentLine.current, points: nextPoints }
    setLines(prev => prev.map(l => l.id === currentLineId.current ? { ...l, points: nextPoints } : l))
  }

  const handleMouseUp = () => {
    if (isDrawing.current && currentLine.current) publish({ type: 'line', line: currentLine.current })
    isDrawing.current = false
    setIndicator(null)
  }

  const changeTemplate = (t: BoardTemplate) => { setTemplate(t); publish({ type: 'template', template: t }) }
  const clearBoard = () => { setLines([]); setShapes([]); publish({ type: 'clear' }) }
  const undo = () => { const last = lines[lines.length - 1]; if(last) { setLines(p => p.slice(0, -1)); publish({ type: 'undo', id: last.id }) } }
  const importBackground = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => { const bg = { name: file.name, dataUrl: reader.result as string }; setBackground(bg); publish({ type: 'background', background: bg }) }
    reader.readAsDataURL(file)
  }

  return (
    <div className="h-full w-full bg-[#020406] flex flex-col relative overflow-hidden">
      <CompactToolbar 
        tool={tool} color={color} template={template} background={background} selectedShapeId={selectedShapeId}
        openGroup={openGroup} setOpenGroup={setOpenGroup} isMobile={isMobile}
        onSetTool={setTool} onSetColor={setColor} onChangeTemplate={changeTemplate} onRotate={onRotate} onUndo={undo} onClear={clearBoard}
        onSlideClick={() => fileInputRef.current?.click()} onRemoveSlide={() => { setBackground(null); publish({ type: 'background', background: null }); }}
        fileInputRef={fileInputRef} onFileChange={importBackground} 
      />

      <div className={`${templateClass(template)} flex-1 overflow-y-auto overflow-x-auto custom-scrollbar`} 
           style={{ cursor: tool === 'eraser' ? 'crosshair' : 'default' }}>
        <div ref={boardRef} className="min-w-full" style={{ height: '2400px' }}>
          <Stage 
            ref={stageRef}
            width={stageWidth} 
            height={900}
            scaleX={stageWidth / 1200}
            scaleY={stageWidth / 1200}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
            onTouchStart={tool === 'pan' ? undefined : handleMouseDown} 
            onTouchMove={tool === 'pan' ? undefined : handleMouseMove} 
            onTouchEnd={tool === 'pan' ? undefined : handleMouseUp}
            className={tool === 'pan' ? 'touch-auto' : 'touch-none'}
          >
            <Layer>
              {background && (
                <SlideImage url={background.dataUrl} width={3000} height={3000} />
              )}
              {lines.map((line) => (
                <Line
                  key={line.id}
                  points={line.points}
                  stroke={line.color}
                  strokeWidth={line.strokeWidth}
                  tension={line.tool === 'line' ? 0 : 0.45}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'}
                />
              ))}
              {shapes.map((shape) => (
                <BoardShapeView 
                  key={shape.id} 
                  shape={shape} 
                  readOnly={readOnly} 
                  selected={selectedShapeId === shape.id}
                  onSelect={() => setSelectedShapeId(shape.id)}
                  onDragEnd={(x: number, y: number) => updateShape(shape.id, { x, y })}
                  onUpdate={(patch: Partial<BoardShape>) => updateShape(shape.id, patch)}
                />
              ))}
              {indicator && (
                <Group x={indicator.x} y={indicator.y}>
                  <Rect width={60} height={24} fill="rgba(0,0,0,0.8)" cornerRadius={6} stroke="rgba(16,185,129,0.4)" strokeWidth={1} />
                  <Text text={indicator.text} fill="#10b981" fontSize={10} fontStyle="bold" x={8} y={7} />
                </Group>
              )}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  )
})

PeakWhiteboard.displayName = 'PeakWhiteboard'

// ─── Compact Categorized Toolbar ─────────────────────────────────────
function CompactToolbar({
  tool, color, template, background, selectedShapeId, openGroup, setOpenGroup, isMobile,
  onSetTool, onSetColor, onChangeTemplate, onRotate, onUndo, onClear,
  onSlideClick, onRemoveSlide, fileInputRef, onFileChange,
}: {
  tool: string; color: string; template: string; background: any;
  selectedShapeId: string | null; openGroup: ToolGroupId | null; setOpenGroup: (g: ToolGroupId | null) => void; isMobile: boolean;
  onSetTool: (t: string) => void;
  onSetColor: (c: string) => void;
  onChangeTemplate: (t: BoardTemplate) => void;
  onRotate: (deg: number) => void;
  onUndo: () => void;
  onClear: () => void;
  onSlideClick: () => void;
  onRemoveSlide: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (f: File) => void;
}) {
  const activeGroup = TOOL_GROUPS.find(g => g.tools.some(t => t.id === tool))

  const containerClass = isMobile 
    ? "fixed bottom-4 left-4 right-4 z-[150] flex flex-row items-center gap-2 px-4 py-2 bg-[#0A0C10]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-x-auto"
    : "absolute left-4 top-4 bottom-24 z-40 flex flex-col gap-2 pointer-events-none"

  const sidebarClass = isMobile
    ? "flex flex-row gap-2 shrink-0"
    : "pointer-events-auto flex flex-col gap-2 w-14 bg-[#0A0C10]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-1.5 shadow-2xl overflow-y-auto scrollbar-none"

  return (
    <div className={containerClass}>
      <div className={sidebarClass}>
        {/* Colors (Horizontal on both for space) */}
        <div className={`flex ${isMobile ? 'flex-row' : 'flex-col'} gap-1.5 p-1`}>
          {COLORS.slice(0, isMobile ? 3 : COLORS.length).map((c) => (
            <button key={c} onClick={() => onSetColor(c)}
              className={`w-7 h-7 rounded-lg transition-all ${color === c ? 'ring-2 ring-emerald-500 scale-110' : 'opacity-40 hover:opacity-100'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {!isMobile && <div className="h-px bg-white/5 mx-2" />}

        {/* Tool groups */}
        {TOOL_GROUPS.map((group) => {
          const Icon = group.icon
          const isActive = activeGroup?.id === group.id
          const isOpen = openGroup === group.id
          return (
            <button key={group.id}
              onClick={() => setOpenGroup(isOpen ? null : group.id)}
              className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all mx-auto shrink-0 ${
                isActive ? 'bg-emerald-500 text-black' :
                isOpen ? 'bg-white/10 text-white' :
                'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              <span className="text-[5px] font-black uppercase tracking-widest">{group.id.substring(0,3)}</span>
            </button>
          )
        })}

        <div className={isMobile ? "w-px h-8 bg-white/10 mx-1" : "h-px bg-white/5 mx-2"} />

        {/* Action Toggles */}
        <button onClick={() => onChangeTemplate(template === 'plain' ? 'axis' : 'plain')} 
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${template !== 'plain' ? 'bg-sky-500 text-black' : 'text-slate-500 hover:text-white'}`}>
          <Grid3X3 size={16} />
        </button>

        <button onClick={onSlideClick} 
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-slate-500 hover:text-white transition-all"
          title="Upload Slide (Image)">
          <ImageIcon size={16} />
        </button>

        <button onClick={onUndo} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-slate-500 hover:text-white transition-all">
          <Undo size={16} />
        </button>
      </div>

      {/* Tool group flyout - Responsive positioning */}
      <AnimatePresence>
        {openGroup && (() => {
          const group = TOOL_GROUPS.find(g => g.id === openGroup)!
          return (
            <motion.div 
              initial={isMobile ? { opacity: 0, y: 10 } : { opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0, y: 0 }} 
              exit={isMobile ? { opacity: 0, y: 10 } : { opacity: 0, x: -10 }}
              className={`pointer-events-auto flex ${isMobile ? 'flex-row' : 'flex-col'} gap-1.5 bg-[#0A0C10]/98 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 shadow-2xl min-w-[120px] ${isMobile ? 'fixed bottom-20 left-4 right-4 overflow-x-auto' : 'ml-2'}`}
            >
              <div className="px-3 py-1 mb-2 border-b border-white/5">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500">{group.label}</p>
              </div>
              <div className="grid gap-1">
                {group.tools.map((t) => {
                  const Icon = t.icon
                  const isSelected = tool === t.id
                  return (
                    <button key={t.id} onClick={() => { onSetTool(t.id); setOpenGroup(null); }}
                      className={`flex items-center gap-3 px-4 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        isSelected ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}>
                      <Icon size={16} className={isSelected ? 'text-black' : 'text-emerald-500'} />
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}

// ─── Axis Guide Overlay ────────────────────────────────────────────────
function AxisGuide({ onSetupGraph }: { onSetupGraph?: () => void }) {
  const [visible, setVisible] = useState(true)
  if (!visible) return (
    <button onClick={() => setVisible(true)}
      className="absolute top-4 right-20 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest shadow-xl">
      <Info size={14} /> Axis Help
    </button>
  )
  return (
    <div className="absolute top-4 right-20 z-40 w-80 bg-[#0A0C10]/95 backdrop-blur-3xl border border-emerald-500/20 rounded-[2rem] p-6 shadow-2xl ring-1 ring-emerald-500/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-widest text-white">Graphing Intelligence</span>
        </div>
        <button onClick={() => setVisible(false)} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
      </div>
      <div className="space-y-3 text-[11px] text-slate-400 leading-relaxed">
        <p>📊 <strong>Scrolling:</strong> Select the <span className="text-emerald-400">Pan / Scroll</span> (Move) tool to drag the canvas up or down.</p>
        <p>📏 <strong>Ruler & Compass:</strong> Click a tool to place it. Drag the green circle at the top to <strong>rotate</strong>.</p>
        <p>📐 <strong>Axis:</strong> Click the <span className="text-emerald-400">Grid</span> icon. Use <strong>Straight Line</strong> to plot functions.</p>
        <p>✏️ <strong>Precision:</strong> Use your mouse wheel or two-finger swipe while the Pan tool is active.</p>
      </div>
      {onSetupGraph && (
        <button 
          onClick={onSetupGraph}
          className="w-full mt-6 py-4 rounded-2xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20"
        >
          Initialize Graph Template
        </button>
      )}
    </div>
  )
}

function templateClass(template: BoardTemplate) {
  if (template === 'graph') {
    return 'bg-[#020406] bg-[linear-gradient(rgba(59,130,246,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,.12)_1px,transparent_1px)] [background-size:32px_32px]'
  }
  if (template === 'axis') {
    // Professional X-Y Axis Background with Major and Minor Grids
    return `
      bg-[#020406] 
      bg-[
        linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),
        linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px),
        linear-gradient(rgba(16,185,129,0.4)_2px,transparent_2px),
        linear-gradient(90deg,rgba(16,185,129,0.4)_2px,transparent_2px)
      ] 
      [background-size:32px_32px,32px_32px,100%_2px,2px_100%] 
      [background-position:center]
      bg-no-repeat-y,bg-no-repeat-x,center,center
    `.trim().replace(/\n\s*/g, ' ')
  }
  if (template === 'lab') {
    return 'bg-[#020406] bg-[radial-gradient(rgba(16,185,129,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:24px_24px,160px_160px]'
  }
  return 'bg-[#020406] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px]'
}

function BoardShapeView({
  shape,
  readOnly,
  selected,
  onSelect,
  onDragEnd,
  onUpdate,
}: {
  shape: BoardShape
  readOnly: boolean
  selected: boolean
  onSelect: () => void
  onDragEnd: (x: number, y: number) => void
  onUpdate: (patch: Partial<BoardShape>) => void
}) {
  const { x, y, color, scale } = shape
  const selectionStroke = selected ? '#ffffff' : color
  const common = {
    x,
    y,
    scaleX: scale,
    scaleY: scale,
    rotation: shape.rotation || 0,
    draggable: !readOnly,
    onMouseDown: (event: any) => {
      event.cancelBubble = true
      onSelect()
    },
    onTouchStart: (event: any) => {
      event.cancelBubble = true
      onSelect()
    },
    onDragEnd: (event: any) => onDragEnd(event.target.x(), event.target.y()),
  }

  const RotationHandle = () => {
    if (readOnly || !selected) return null
    return (
      <Circle
        x={0}
        y={-60}
        radius={8}
        fill="#10b981"
        stroke="#ffffff"
        strokeWidth={2}
        draggable
        onDragMove={(e) => {
          const stage = e.target.getStage()
          const pos = stage?.getPointerPosition()
          if (pos) {
            const dx = pos.x - x
            const dy = pos.y - y
            const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90
            onUpdate({ rotation: angle })
          }
          // Reset handle position so it doesn't actually move away from shape
          e.target.x(0)
          e.target.y(-60)
        }}
      />
    )
  }

  if (shape.type === 'ruler') {
    return (
      <Group {...common} offsetX={0} offsetY={0}>
        <Rect width={400} height={40} fill="rgba(255,255,255,0.05)" stroke={selectionStroke} strokeWidth={selected ? 3 : 1} cornerRadius={4} />
        {Array.from({ length: 41 }).map((_, i) => (
          <Line key={i} points={[i * 10, 0, i * 10, i % 5 === 0 ? 15 : 8]} stroke={color} strokeWidth={1} />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <Text key={i} x={i * 100 + 4} y={18} text={`${i * 10}`} fill={color} fontSize={9} fontStyle="bold opacity-40" />
        ))}
        <Text x={350} y={12} text="CM" fill={color} fontSize={10} fontStyle="bold" letterSpacing={1} />
        <RotationHandle />
      </Group>
    )
  }

  if (shape.type === 'axis') {
    return (
      <Group {...common}>
        {/* GRID LINES */}
        {Array.from({ length: 11 }).map((_, i) => {
          const pos = (i - 5) * 40
          return (
            <Group key={i}>
              <Line points={[-200, pos, 200, pos]} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
              <Line points={[pos, -200, pos, 200]} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
            </Group>
          )
        })}
        {/* MAIN AXIS */}
        <Arrow points={[-220, 0, 220, 0]} stroke={color} fill={color} strokeWidth={2} pointerLength={10} pointerWidth={8} />
        <Arrow points={[0, 220, 0, -220]} stroke={color} fill={color} strokeWidth={2} pointerLength={10} pointerWidth={8} />
        <Text x={210} y={10} text="X" fill={color} fontSize={12} fontStyle="bold" />
        <Text x={10} y={-210} text="Y" fill={color} fontSize={12} fontStyle="bold" />
        <RotationHandle />
      </Group>
    )
  }

  if (shape.type === 'protractor') {
    const arcPoints = Array.from({ length: 37 }).flatMap((_, index) => {
      const angle = Math.PI - (Math.PI * index) / 36
      return [Math.cos(angle) * 86, -Math.sin(angle) * 86]
    })
    return (
      <Group {...common}>
        <Line points={arcPoints} stroke={selectionStroke} strokeWidth={selected ? 4 : 3} lineCap="round" lineJoin="round" />
        <Line points={[-92, 0, 92, 0]} stroke={color} strokeWidth={3} />
        {Array.from({ length: 7 }).map((_, index) => {
          const angle = Math.PI - (Math.PI * index) / 6
          return <Line key={index} points={[Math.cos(angle) * 70, -Math.sin(angle) * 70, Math.cos(angle) * 88, -Math.sin(angle) * 88]} stroke={color} strokeWidth={2} />
        })}
        <Text x={-30} y={-36} text="180 deg" fill={color} fontSize={12} fontStyle="bold" />
        <RotationHandle />
      </Group>
    )
  }

  if (shape.type === 'compass') {
    return (
      <Group {...common} offsetX={50} offsetY={58}>
        <Circle x={50} y={18} radius={9} stroke={selectionStroke} strokeWidth={selected ? 4 : 3} />
        <Line points={[50, 26, 18, 116]} stroke={color} strokeWidth={4} lineCap="round" />
        <Line points={[50, 26, 84, 116]} stroke={color} strokeWidth={4} lineCap="round" />
        <Line points={[31, 78, 71, 78]} stroke={color} strokeWidth={2} />
        <Text x={10} y={122} text="COMPASS" fill={color} fontSize={11} fontStyle="bold" letterSpacing={2} />
        <RotationHandle />
      </Group>
    )
  }

  if (shape.type === 'setSquare') {
    return (
      <Group {...common} offsetX={70} offsetY={54}>
        <Line points={[0, 108, 132, 108, 0, 0, 0, 108]} stroke={selectionStroke} strokeWidth={selected ? 4 : 3} closed />
        <Line points={[24, 88, 86, 88, 24, 40, 24, 88]} stroke={color} strokeWidth={2} opacity={0.8} closed />
        <Text x={22} y={112} text="45/90" fill={color} fontSize={11} fontStyle="bold" letterSpacing={2} />
        <RotationHandle />
      </Group>
    )
  }

  if (shape.type === 'chemistry') {
    return (
      <Group {...common} offsetX={50} offsetY={74}>
        <Line points={[35, 0, 35, 32, 12, 82, 88, 82, 65, 32, 65, 0]} stroke={selectionStroke} strokeWidth={selected ? 4 : 3} closed={false} lineJoin="round" />
        <Line points={[22, 62, 78, 62]} stroke={color} strokeWidth={3} />
        <Circle x={36} y={56} radius={4} fill={color} opacity={0.8} />
        <Circle x={62} y={68} radius={3} fill={color} opacity={0.8} />
        <Text x={18} y={90} text="CHEM" fill={color} fontSize={11} fontStyle="bold" letterSpacing={2} />
      </Group>
    )
  }

  if (shape.type === 'beaker') {
    return (
      <Group {...common} offsetX={54} offsetY={66}>
        <Line points={[22, 0, 22, 84, 86, 84, 86, 0]} stroke={selectionStroke} strokeWidth={selected ? 4 : 3} lineJoin="round" />
        <Line points={[10, 0, 98, 0]} stroke={color} strokeWidth={3} />
        <Line points={[24, 56, 84, 56]} stroke={color} strokeWidth={3} />
        <Circle x={42} y={48} radius={4} fill={color} opacity={0.8} />
        <Circle x={66} y={64} radius={3} fill={color} opacity={0.8} />
        <Text x={24} y={92} text="BEAKER" fill={color} fontSize={11} fontStyle="bold" letterSpacing={2} />
        <RotationHandle />
      </Group>
    )
  }

  if (shape.type === 'biology') {
    return (
      <Group {...common} offsetX={72} offsetY={48}>
        <Circle x={70} y={48} radius={48} stroke={selectionStroke} strokeWidth={selected ? 4 : 3} />
        <Circle x={82} y={42} radius={16} stroke={color} strokeWidth={3} />
        <Line points={[24, 58, 48, 48, 66, 62, 94, 56, 112, 35]} stroke={color} strokeWidth={2} tension={0.45} />
        <Text x={38} y={100} text="CELL" fill={color} fontSize={11} fontStyle="bold" letterSpacing={2} />
      </Group>
    )
  }

  if (shape.type === 'dna') {
    return (
      <Group {...common} offsetX={50} offsetY={72}>
        {Array.from({ length: 7 }).map((_, index) => (
          <Line key={index} points={[24, index * 20, 78, index * 20]} stroke={color} strokeWidth={2} opacity={0.75} />
        ))}
        <Line points={[24, 0, 76, 20, 24, 40, 76, 60, 24, 80, 76, 100, 24, 120]} stroke={selectionStroke} strokeWidth={selected ? 4 : 3} tension={0.45} />
        <Line points={[76, 0, 24, 20, 76, 40, 24, 60, 76, 80, 24, 100, 76, 120]} stroke={color} strokeWidth={3} tension={0.45} />
        <Text x={34} y={128} text="DNA" fill={color} fontSize={11} fontStyle="bold" letterSpacing={2} />
        <RotationHandle />
      </Group>
    )
  }

  if (shape.type === 'force') {
    return (
      <Group {...common} offsetX={88} offsetY={36}>
        <Line points={[0, 36, 140, 36]} stroke={selectionStroke} strokeWidth={selected ? 5 : 4} lineCap="round" />
        <Line points={[124, 22, 140, 36, 124, 50]} stroke={selectionStroke} strokeWidth={selected ? 5 : 4} lineCap="round" lineJoin="round" />
        <Line points={[0, 36, 0, 10]} stroke={color} strokeWidth={3} />
        <Rect x={-18} y={50} width={36} height={22} cornerRadius={4} fill="rgba(255,255,255,0.08)" stroke={color} strokeWidth={2} />
        <Text x={48} y={6} text="FORCE" fill={color} fontSize={11} fontStyle="bold" letterSpacing={2} />
        <RotationHandle />
      </Group>
    )
  }

  return (
    <Group {...common} offsetX={92} offsetY={46}>
      <Line points={[0, 46, 34, 46, 46, 22, 58, 70, 70, 22, 82, 70, 94, 46, 134, 46, 134, 20, 170, 20, 170, 72, 134, 72, 134, 46, 184, 46]} stroke={selectionStroke} strokeWidth={selected ? 4 : 3} lineCap="round" lineJoin="round" />
      <Line points={[14, 32, 14, 60]} stroke={color} strokeWidth={3} />
      <Line points={[22, 38, 22, 54]} stroke={color} strokeWidth={3} />
      <Text x={64} y={82} text="CIRCUIT" fill={color} fontSize={11} fontStyle="bold" letterSpacing={2} />
      <RotationHandle />
    </Group>
  )
}

function BoardShapeViewLegacy({ shape }: { shape: BoardShape }) {
  const { x, y, color, scale } = shape

  if (shape.type === 'ruler') {
    return (
      <Group x={x - 120} y={y - 18} scaleX={scale} scaleY={scale}>
        <Rect width={240} height={36} cornerRadius={6} fill="rgba(255,255,255,0.08)" stroke={color} strokeWidth={2} />
        {Array.from({ length: 13 }).map((_, index) => (
          <Line key={index} points={[index * 20, 0, index * 20, index % 2 === 0 ? 22 : 14]} stroke={color} strokeWidth={2} />
        ))}
        <Text x={90} y={12} text="RULER" fill={color} fontSize={10} fontStyle="bold" letterSpacing={2} />
      </Group>
    )
  }

  if (shape.type === 'protractor') {
    const arcPoints = Array.from({ length: 37 }).flatMap((_, index) => {
      const angle = Math.PI - (Math.PI * index) / 36
      return [x + Math.cos(angle) * 86, y - Math.sin(angle) * 86]
    })
    return (
      <Group>
        <Line points={arcPoints} stroke={color} strokeWidth={3} lineCap="round" lineJoin="round" />
        <Line points={[x - 92, y, x + 92, y]} stroke={color} strokeWidth={3} />
        {Array.from({ length: 7 }).map((_, index) => {
          const angle = Math.PI - (Math.PI * index) / 6
          return (
            <Line
              key={index}
              points={[
                x + Math.cos(angle) * 70,
                y - Math.sin(angle) * 70,
                x + Math.cos(angle) * 88,
                y - Math.sin(angle) * 88,
              ]}
              stroke={color}
              strokeWidth={2}
            />
          )
        })}
        <Text x={x - 22} y={y - 36} text="180°" fill={color} fontSize={12} fontStyle="bold" />
      </Group>
    )
  }

  if (shape.type === 'chemistry') {
    return (
      <Group x={x - 50} y={y - 74}>
        <Line points={[35, 0, 35, 32, 12, 82, 88, 82, 65, 32, 65, 0]} stroke={color} strokeWidth={3} closed={false} lineJoin="round" />
        <Line points={[22, 62, 78, 62]} stroke={color} strokeWidth={3} />
        <Circle x={36} y={56} radius={4} fill={color} opacity={0.8} />
        <Circle x={62} y={68} radius={3} fill={color} opacity={0.8} />
        <Text x={18} y={90} text="CHEM" fill={color} fontSize={11} fontStyle="bold" letterSpacing={2} />
      </Group>
    )
  }

  if (shape.type === 'biology') {
    return (
      <Group x={x - 72} y={y - 48}>
        <Circle x={70} y={48} radius={48} stroke={color} strokeWidth={3} />
        <Circle x={82} y={42} radius={16} stroke={color} strokeWidth={3} />
        <Line points={[24, 58, 48, 48, 66, 62, 94, 56, 112, 35]} stroke={color} strokeWidth={2} tension={0.45} />
        <Text x={38} y={100} text="CELL" fill={color} fontSize={11} fontStyle="bold" letterSpacing={2} />
      </Group>
    )
  }

  return (
    <Group x={x - 92} y={y - 46}>
      <Line points={[0, 46, 34, 46, 46, 22, 58, 70, 70, 22, 82, 70, 94, 46, 134, 46, 134, 20, 170, 20, 170, 72, 134, 72, 134, 46, 184, 46]} stroke={color} strokeWidth={3} lineCap="round" lineJoin="round" />
      <Line points={[14, 32, 14, 60]} stroke={color} strokeWidth={3} />
      <Line points={[22, 38, 22, 54]} stroke={color} strokeWidth={3} />
      <Text x={64} y={82} text="CIRCUIT" fill={color} fontSize={11} fontStyle="bold" letterSpacing={2} />
    </Group>
  )
}

function Divider() {
  return <div className="w-px h-8 md:w-8 md:h-px bg-white/10 mx-1 md:mx-1 md:my-1 shrink-0" />
}

function TemplateButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean
  label: string
  icon?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 transition-all ${
        active ? 'bg-white text-black' : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function WhiteboardTool({
  active,
  icon,
  label,
  onClick,
  disabled = false,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/25' : 'text-slate-500 hover:text-white hover:bg-white/10'
      }`}
      title={label}
    >
      {icon}
    </button>
  )
}
function SlideImage({ url, width, height }: { url: string; width: number; height: number }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.src = url
    img.onload = () => setImage(img)
  }, [url])

  if (!image) return null

  const scale = Math.min(1200 / image.width, 900 / image.height) * 1.5

  return (
    <Group x={100} y={100}>
       <Rect 
         width={image.width * scale} 
         height={image.height * scale} 
         fillPatternImage={image} 
         fillPatternScale={{ x: scale, y: scale }}
         cornerRadius={20}
         shadowBlur={40}
         shadowColor="rgba(0,0,0,0.5)"
       />
    </Group>
  )
}

export default PeakWhiteboard
