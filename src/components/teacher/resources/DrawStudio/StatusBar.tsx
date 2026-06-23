'use client'

import { Grid3X3, ZoomIn, ZoomOut, Maximize2, Minimize2, Undo2, Redo2, Layers, Sun, Moon } from 'lucide-react'

interface StatusBarProps {
  elementCount: number
  zoom: number
  gridMode: boolean
  snapToGrid: boolean
  darkMode: boolean
  isSaving: boolean
  saveSuccess: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleGrid: () => void
  onToggleSnap: () => void
  onToggleFullscreen: () => void
  onToggleDarkMode: () => void
  onUndo: () => void
  onRedo: () => void
}

export default function StatusBar({
  elementCount,
  zoom,
  gridMode,
  snapToGrid,
  darkMode,
  isSaving,
  saveSuccess,
  onZoomIn,
  onZoomOut,
  onToggleGrid,
  onToggleSnap,
  onToggleFullscreen,
  onToggleDarkMode,
  onUndo,
  onRedo,
}: StatusBarProps) {
  const isFullscreen = false

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
      {/* Element count */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
        <Layers size={12} />
        <span>{elementCount} {elementCount === 1 ? 'el' : 'els'}</span>
      </div>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

      {/* Save status */}
      <div className="px-2.5 py-1">
        {isSaving ? (
          <span className="text-amber-500">Saving...</span>
        ) : saveSuccess ? (
          <span className="text-emerald-500">Saved</span>
        ) : (
          <span className="text-slate-400">Auto</span>
        )}
      </div>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

      {/* Undo/Redo */}
      <button onClick={onUndo} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" title="Undo">
        <Undo2 size={14} />
      </button>
      <button onClick={onRedo} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" title="Redo">
        <Redo2 size={14} />
      </button>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

      {/* Grid toggle */}
      <button
        onClick={onToggleGrid}
        className={`p-1.5 rounded-lg transition-all ${gridMode ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        title="Toggle Grid"
      >
        <Grid3X3 size={14} />
      </button>

      {/* Snap to grid (only when grid is on) */}
      {gridMode && (
        <button
          onClick={onToggleSnap}
          className={`p-1.5 rounded-lg transition-all text-[8px] font-black uppercase ${
            snapToGrid ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'
          }`}
          title="Snap to Grid"
        >
          Snap
        </button>
      )}

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

      {/* Zoom controls */}
      <button onClick={onZoomOut} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" title="Zoom Out">
        <ZoomOut size={14} />
      </button>
      <span className="min-w-[48px] text-center font-mono text-xs">{Math.round(zoom * 100)}%</span>
      <button onClick={onZoomIn} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" title="Zoom In">
        <ZoomIn size={14} />
      </button>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

      {/* Dark mode */}
      <button onClick={onToggleDarkMode} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" title="Toggle Theme">
        {darkMode ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      {/* Fullscreen */}
      <button onClick={onToggleFullscreen} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" title="Fullscreen">
        <Maximize2 size={14} />
      </button>
    </div>
  )
}
