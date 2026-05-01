'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Line, Text, Rect, Circle } from 'react-konva'
import { 
  Type, Square, Circle as CircleIcon, 
  Minus, MousePointer2, Eraser, 
  Undo, Redo, Download, Trash2,
  ChevronDown, Palette
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function PeakWhiteboard({ sessionId }: { sessionId: string }) {
  const [tool, setTool] = useState('pen')
  const [lines, setLines] = useState<any[]>([])
  const isDrawing = useRef(false)
  const [color, setColor] = useState('#10b981') // Emerald

  const handleMouseDown = (e: any) => {
    isDrawing.current = true
    const pos = e.target.getStage().getPointerPosition()
    setLines([...lines, { tool, points: [pos.x, pos.y], color }])
  }

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current) return
    const stage = e.target.getStage()
    const point = stage.getPointerPosition()
    let lastLine = lines[lines.length - 1]
    lastLine.points = lastLine.points.concat([point.x, point.y])
    lines.splice(lines.length - 1, 1, lastLine)
    setLines(lines.concat())
  }

  const handleMouseUp = () => {
    isDrawing.current = false
  }

  const clearBoard = () => setLines([])

  return (
    <div className="h-full w-full bg-[#020406] flex flex-col relative overflow-hidden">
      {/* TOOLBAR */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 z-40 p-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/5 flex flex-col gap-2 shadow-2xl">
         <WhiteboardTool active={tool === 'pen'} icon={<PenToolIcon />} onClick={() => setTool('pen')} />
         <WhiteboardTool active={tool === 'eraser'} icon={<Eraser size={20} />} onClick={() => setTool('eraser')} />
         <div className="h-px bg-white/10 mx-2 my-1" />
         <WhiteboardTool active={false} icon={<Square size={20} />} onClick={() => {}} />
         <WhiteboardTool active={false} icon={<CircleIcon size={20} />} onClick={() => {}} />
         <div className="h-px bg-white/10 mx-2 my-1" />
         <button className="w-12 h-12 rounded-xl flex items-center justify-center text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all" onClick={clearBoard}>
            <Trash2 size={20} />
         </button>
      </div>

      {/* COLOR PICKER */}
      <div className="absolute left-24 top-1/2 -translate-y-1/2 z-40 p-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/5 flex flex-col gap-3">
         {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ffffff'].map(c => (
           <button 
             key={c} onClick={() => setColor(c)}
             className={`w-6 h-6 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : 'opacity-40 hover:opacity-100'}`}
             style={{ backgroundColor: c }}
           />
         ))}
      </div>

      <div className="flex-1 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:40px_40px]">
        <Stage
          width={window.innerWidth - 400} // Sidebar width
          height={window.innerHeight - 176} // Header + Footer height
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          className="cursor-crosshair"
        >
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.tool === 'eraser' ? 30 : 3}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  line.tool === 'eraser' ? 'destination-out' : 'source-over'
                }
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* TOP FLOATING CONTROLS */}
      <div className="absolute top-8 right-8 z-40 flex items-center gap-4">
         <div className="px-5 py-2 rounded-xl bg-black/60 backdrop-blur-xl border border-white/5 flex items-center gap-4 text-slate-500">
            <button className="hover:text-white transition-colors"><Undo size={18} /></button>
            <button className="hover:text-white transition-colors"><Redo size={18} /></button>
            <div className="w-px h-4 bg-white/10" />
            <button className="hover:text-white transition-colors"><Download size={18} /></button>
         </div>
         <div className="px-5 py-2 rounded-xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[9px]">
            Sync Active
         </div>
      </div>
    </div>
  )
}

function WhiteboardTool({ active, icon, onClick }: { active: boolean, icon: any, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-emerald-500 text-black' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
    >
       {icon}
    </button>
  )
}

function PenToolIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l5 5"/>
    </svg>
  )
}
