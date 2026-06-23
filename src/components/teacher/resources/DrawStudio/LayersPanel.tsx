'use client'

import { Eye, EyeOff, Lock, Unlock, Trash2, GripHorizontal } from 'lucide-react'

interface LayerEntry {
  id: string
  type: string
  text?: string
  visible: boolean
  locked: boolean
}

interface LayersPanelProps {
  elements: any[]
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onDelete: (id: string) => void
  onReorder: (id: string, direction: 'up' | 'down') => void
}

function getElementIcon(type: string): string {
  switch (type) {
    case 'rectangle': return '▬'
    case 'ellipse': return '●'
    case 'arrow': return '→'
    case 'line': return '╱'
    case 'text': return 'T'
    case 'freedraw': return '✏'
    case 'image': return '🖼'
    default: return '◇'
  }
}

function getElementSummary(el: any): string {
  if (el.text) return el.text.slice(0, 40)
  if (el.type === 'rectangle') return 'Rectangle'
  if (el.type === 'ellipse') return el.width === el.height ? 'Circle' : 'Ellipse'
  if (el.type === 'arrow') return 'Arrow'
  if (el.type === 'line') return 'Line'
  if (el.type === 'freedraw') return 'Drawing'
  if (el.type === 'image') return 'Image'
  return el.type || 'Element'
}

export default function LayersPanel({
  elements,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onReorder,
}: LayersPanelProps) {
  const reversed = [...elements].reverse()

  if (elements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-3xl mb-3 opacity-30">🎨</div>
        <p className="text-sm font-bold text-slate-400">No elements yet</p>
        <p className="text-xs text-slate-400 mt-1">Draw something to see layers</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
          {elements.length} {elements.length === 1 ? 'Layer' : 'Layers'}
        </span>
        <span className="text-[10px] text-slate-400 italic">Top = Front</span>
      </div>
      {reversed.map((el: any, idx: number) => (
        <div
          key={el.id}
          className="group flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all"
        >
          {/* Reorder handle */}
          <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onReorder(el.id, 'up')} className="text-[8px] leading-none text-slate-300 hover:text-slate-600">▲</button>
            <button onClick={() => onReorder(el.id, 'down')} className="text-[8px] leading-none text-slate-300 hover:text-slate-600">▼</button>
          </div>

          {/* Type icon */}
          <span className="w-5 text-center text-xs font-bold text-slate-400">{getElementIcon(el.type)}</span>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{getElementSummary(el)}</p>
          </div>

          {/* Actions */}
          <button
            onClick={() => onToggleVisibility(el.id)}
            className={`p-1 rounded-md transition-all ${el.isDeleted ? 'text-slate-300' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            title={el.isDeleted ? 'Hidden' : 'Visible'}
          >
            {el.isDeleted ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          <button
            onClick={() => onToggleLock(el.id)}
            className={`p-1 rounded-md transition-all ${el.locked ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            title={el.locked ? 'Locked' : 'Unlocked'}
          >
            {el.locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
          <button
            onClick={() => onDelete(el.id)}
            className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
