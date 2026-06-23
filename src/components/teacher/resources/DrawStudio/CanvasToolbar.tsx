'use client'

import { useState, useCallback } from 'react'
import {
  MousePointer2, Pen, Highlighter, Type,
  Square, Circle, Minus, ArrowRight,
  Palette, SlidersHorizontal, Undo2, Redo2,
  ChevronDown,
} from 'lucide-react'

interface CanvasToolbarProps {
  excalidrawRef: React.MutableRefObject<any>
  onNotify: (msg: string) => void
  isCanvasReady?: boolean
}

const COLORS = [
  '#000000', '#333333', '#666666', '#999999',
  '#dc2626', '#ea580c', '#d97706', '#65a30d',
  '#16a34a', '#0891b2', '#2563eb', '#4f46e5',
  '#7c3aed', '#db2777', '#ec4899', '#f43f5e',
  '#fde047', '#a855f7',
]

const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8, 12]

type ToolCategory = 'draw' | 'shapes' | 'arrows' | 'actions'

function getApi(ref: React.MutableRefObject<any>) {
  return ref.current
}

export default function CanvasToolbar({
  excalidrawRef,
  onNotify,
  isCanvasReady = false,
}: CanvasToolbarProps) {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('draw')
  const [strokeColor, setStrokeColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showWidthPicker, setShowWidthPicker] = useState(false)

  const setTool = useCallback((toolType: string) => {
    const attempt = (retries: number) => {
      const api = getApi(excalidrawRef)
      if (api?.setActiveTool) {
        try {
          api.setActiveTool({ type: toolType })
          api.setAppState?.({ currentItemStrokeColor: strokeColor, currentItemStrokeWidth: strokeWidth })
        } catch {
          onNotify('Could not switch tool')
        }
      } else if (retries > 0) {
        setTimeout(() => attempt(retries - 1), 150)
      }
    }
    attempt(10)
  }, [excalidrawRef, strokeColor, strokeWidth, onNotify])

  const undo = useCallback(() => {
    const api = getApi(excalidrawRef)
    try { api?.history?.undo?.() } catch {}
  }, [excalidrawRef])

  const redo = useCallback(() => {
    const api = getApi(excalidrawRef)
    try { api?.history?.redo?.() } catch {}
  }, [excalidrawRef])

  const insertElements = useCallback((type: string) => {
    const api = getApi(excalidrawRef)
    if (!api) { return }

    const center = (() => {
      try {
        const state = api.getAppState?.()
        return {
          x: (state?.offsetLeft || 0) + (state?.width || 1200) / 2,
          y: (state?.offsetTop || 0) + (state?.height || 800) / 2,
        }
      } catch { return { x: 500, y: 300 } }
    })()

    const newId = () => `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const seed = () => Math.floor(Math.random() * 1_000_000) + 1

    const base = (type: string, x: number, y: number, w: number, h: number, overrides: any = {}) => ({
      id: newId(), type, x, y, width: w, height: h,
      strokeColor: '#000000', backgroundColor: 'transparent',
      fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
      roughness: 0, opacity: 100, groupIds: [], roundness: null,
      seed: seed(), version: 1, versionNonce: seed(),
      isDeleted: false, boundElements: null,
      updated: Date.now(), link: null, locked: false,
      ...overrides,
    })

    const rect = (x: number, y: number, w: number, h: number, o: any = {}) => base('rectangle', x, y, w, h, o)
    const ellipse = (x: number, y: number, w: number, h: number, o: any = {}) => base('ellipse', x, y, w, h, o)
    const line = (x: number, y: number, pts: number[][], o: any = {}) => {
      const xs = pts.map(p => p[0]); const ys = pts.map(p => p[1])
      return base('line', x, y, Math.max(...xs) - Math.min(...xs) || 1, Math.max(...ys) - Math.min(...ys) || 1, { points: pts, ...o })
    }
    const arrow_ = (x: number, y: number, pts: number[][], o: any = {}) => {
      const xs = pts.map(p => p[0]); const ys = pts.map(p => p[1])
      return base('arrow', x, y, Math.max(...xs) - Math.min(...xs) || 1, Math.max(...ys) - Math.min(...ys) || 1, { points: pts, ...o })
    }
    const text_ = (x: number, y: number, w: number, h: number, str: string, fontSize = 16, o: any = {}) =>
      base('text', x, y, w, h, { text: str, fontSize, fontFamily: 1, textAlign: 'left', verticalAlign: 'top', baseline: fontSize - 2, ...o })

    let els: any[] = []
    switch (type) {
      case 'reaction-arrow':
        els = [arrow_(center.x, center.y, [[0, 0], [150, 0]], { strokeWidth: 3 })]
        break
      case 'equilibrium-arrow':
        els = [
          arrow_(center.x, center.y, [[0, 0], [120, 0]], { strokeWidth: 3 }),
          arrow_(center.x + 120, center.y, [[0, 0], [-120, 0]], { strokeWidth: 2, strokeColor: '#666666' }),
        ]
        break
      case 'curved-arrow':
        els = [line(center.x, center.y, [[0, 0], [40, -30], [80, 0]], { strokeWidth: 3 })]
        break
      case 'double-arrow':
        els = [
          arrow_(center.x, center.y - 6, [[0, 0], [100, 0]], { strokeWidth: 3 }),
          arrow_(center.x, center.y + 6, [[0, 0], [100, 0]], { strokeWidth: 3 }),
        ]
        break
      case 'sticky-note':
        els = [
          rect(center.x, center.y, 180, 140, { backgroundColor: '#fef3c7', fillStyle: 'solid', strokeColor: '#f59e0b', roundness: { type: 3 } }),
          text_(center.x + 10, center.y + 8, 160, 124, 'Type your note...', 14, { strokeColor: '#92400e' }),
        ]
        break
      case 'observation-box':
        els = [
          rect(center.x, center.y, 220, 100, { strokeColor: '#2563eb', backgroundColor: '#eff6ff', fillStyle: 'solid', roundness: { type: 3 } }),
          rect(center.x, center.y, 220, 28, { strokeColor: '#2563eb', backgroundColor: '#2563eb', fillStyle: 'solid' }),
          text_(center.x + 8, center.y, 204, 28, '🔬 OBSERVATION', 11, { strokeColor: '#ffffff' }),
          text_(center.x + 10, center.y + 34, 200, 60, 'Describe what you observe...', 12, { strokeColor: '#1e3a5f' }),
        ]
        break
      case 'inference-box':
        els = [
          rect(center.x, center.y, 220, 100, { strokeColor: '#059669', backgroundColor: '#ecfdf5', fillStyle: 'solid', roundness: { type: 3 } }),
          rect(center.x, center.y, 220, 28, { strokeColor: '#059669', backgroundColor: '#059669', fillStyle: 'solid' }),
          text_(center.x + 8, center.y, 204, 28, '💡 INFERENCE', 11, { strokeColor: '#ffffff' }),
          text_(center.x + 10, center.y + 34, 200, 60, 'What can you conclude?...', 12, { strokeColor: '#064e3b' }),
        ]
        break
      case 'examiner-note':
        els = [
          rect(center.x, center.y, 240, 70, { strokeColor: '#7c3aed', backgroundColor: '#f5f3ff', fillStyle: 'solid', roundness: { type: 3 }, strokeStyle: 'dashed' }),
          text_(center.x + 10, center.y + 8, 220, 54, '📝 Examiner tip...', 12, { strokeColor: '#5b21b6' }),
        ]
        break
      case 'callout-box':
        els = [
          rect(center.x, center.y, 200, 60, { strokeColor: '#4f46e5', backgroundColor: '#eef2ff', fillStyle: 'solid', roundness: { type: 3 } }),
          text_(center.x + 10, center.y + 8, 180, 44, 'Label text', 12, { strokeColor: '#4f46e5' }),
          arrow_(center.x, center.y + 30, [[0, 0], [-40, 0]], { strokeColor: '#4f46e5' }),
        ]
        break
      case 'warning-box':
        els = [
          rect(center.x, center.y, 220, 80, { strokeColor: '#dc2626', backgroundColor: '#fef2f2', fillStyle: 'solid', roundness: { type: 3 } }),
          text_(center.x + 10, center.y + 10, 200, 60, '⚠️ Common mistake...', 13, { strokeColor: '#991b1b' }),
        ]
        break
      case 'clear':
        if (window.confirm('Clear the entire canvas?')) {
          try { api.resetScene?.() } catch {}
        }
        return
    }

    if (els.length > 0) {
      try {
        const scene = api.getSceneElements?.() || []
        api.updateScene({ elements: [...scene, ...els], appState: api.getAppState?.() })
        onNotify(`${type.replace(/-/g, ' ')} added!`)
      } catch {
        onNotify('Failed to add elements')
      }
    }
  }, [excalidrawRef, onNotify])

  const categories: { id: ToolCategory; label: string }[] = [
    { id: 'draw', label: 'Draw' },
    { id: 'shapes', label: 'Shapes' },
    { id: 'arrows', label: 'Arrows' },
    { id: 'actions', label: 'Actions' },
  ]

  return (
    <div className="w-72 bg-white/97 dark:bg-slate-900/97 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-2xl">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <h2 className="font-black text-xs text-slate-800 dark:text-white uppercase tracking-widest">🎨 Draw Tools</h2>
      </div>

      <div className="flex border-b border-slate-100 dark:border-slate-800">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all ${
              activeCategory === cat.id
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeCategory === 'draw' && (
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Drawing Tools</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setTool('selection')} className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 dark:text-slate-400 transition-all">
                <MousePointer2 size={18} /><span className="text-[8px] font-bold">Select</span>
              </button>
              <button onClick={() => setTool('freedraw')} className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 dark:text-slate-400 transition-all">
                <Pen size={18} /><span className="text-[8px] font-bold">Pen</span>
              </button>
              <button onClick={() => { setTool('freedraw'); onNotify('Use thick yellow stroke for highlighter effect') }} className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 dark:text-slate-400 transition-all">
                <Highlighter size={18} /><span className="text-[8px] font-bold">Marker</span>
              </button>
              <button onClick={() => setTool('text')} className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 dark:text-slate-400 transition-all">
                <Type size={18} /><span className="text-[8px] font-bold">Text</span>
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Color & Width</p>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-10 h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-sm hover:scale-105 transition-all"
                    style={{ backgroundColor: strokeColor }}
                  />
                  {showColorPicker && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} />
                      <div className="absolute left-12 top-0 z-20 p-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl grid grid-cols-6 gap-1">
                        {COLORS.map(c => (
                          <button key={c} onClick={() => {
                            setStrokeColor(c);
                            setShowColorPicker(false);
                            const api = getApi(excalidrawRef);
                            api?.setAppState?.({ currentItemStrokeColor: c });
                          }}
                            className={`w-7 h-7 rounded-lg border-2 hover:scale-110 transition-all ${c === strokeColor ? 'border-indigo-500 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="relative flex-1">
                  <button onClick={() => setShowWidthPicker(!showWidthPicker)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 transition-all"
                  >
                    <SlidersHorizontal size={14} /><span>{strokeWidth}px</span><ChevronDown size={12} className="ml-auto" />
                  </button>
                  {showWidthPicker && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowWidthPicker(false)} />
                      <div className="absolute top-full mt-1 left-0 right-0 z-20 p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl">
                        {STROKE_WIDTHS.map(w => (
                          <button key={w} onClick={() => {
                            setStrokeWidth(w);
                            setShowWidthPicker(false);
                            const api = getApi(excalidrawRef);
                            api?.setAppState?.({ currentItemStrokeWidth: w });
                          }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:bg-indigo-50 ${w === strokeWidth ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 dark:text-slate-400'}`}
                          >
                            <div className="w-8 h-4 flex items-center">
                              <div className="rounded-full bg-current" style={{ width: Math.min(w * 2, 24), height: Math.max(w, 2) }} />
                            </div>
                            <span>{w}px</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={undo} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
                <Undo2 size={14} /> Undo
              </button>
              <button onClick={redo} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
                <Redo2 size={14} /> Redo
              </button>
            </div>
          </div>
        )}

        {activeCategory === 'shapes' && (
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Shapes</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'rectangle', icon: Square, label: 'Rectangle' },
                { id: 'ellipse', icon: Circle, label: 'Ellipse' },
                { id: 'line', icon: Minus, label: 'Line' },
                { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
              ].map(shape => (
                <button key={shape.id} onClick={() => setTool(shape.id)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 dark:text-slate-400 transition-all"
                >
                  <shape.icon size={20} /><span className="text-[9px] font-bold">{shape.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeCategory === 'arrows' && (
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Chemistry Arrows</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'reaction-arrow', label: 'Reaction →', icon: '→', desc: 'A → B' },
                { id: 'equilibrium-arrow', label: 'Equilibrium ⇌', icon: '⇌', desc: 'A ⇌ B' },
                { id: 'curved-arrow', label: 'Curved', icon: '↪', desc: 'Electron flow' },
                { id: 'double-arrow', label: 'Double ⟷', icon: '⟷', desc: 'Resonance' },
              ].map(a => (
                <button key={a.id} onClick={() => insertElements(a.id)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{a.icon}</span>
                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{a.label}</span>
                  <span className="text-[8px] text-slate-400">{a.desc}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Annotation Boxes</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'sticky-note', label: 'Sticky Note', icon: '📝' },
                  { id: 'observation-box', label: 'Observation', icon: '🔬' },
                  { id: 'inference-box', label: 'Inference', icon: '💡' },
                  { id: 'examiner-note', label: 'Examiner Note', icon: '📌' },
                  { id: 'callout-box', label: 'Callout', icon: '💬' },
                  { id: 'warning-box', label: 'Warning', icon: '⚠️' },
                ].map(b => (
                  <button key={b.id} onClick={() => insertElements(b.id)}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                  >
                    <span className="text-lg">{b.icon}</span>
                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'actions' && (
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Canvas Actions</p>
            <div className="space-y-2">
              <button onClick={undo} className="w-full flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
                <Undo2 size={16} /> Undo
              </button>
              <button onClick={redo} className="w-full flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
                <Redo2 size={16} /> Redo
              </button>
              <button onClick={() => insertElements('clear')} className="w-full flex items-center gap-2 p-3 rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 text-xs font-bold">
                Clear Canvas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
