import React, { useState } from 'react'
import {
  Type, ImageIcon, Square, Sparkles, LayoutTemplate,
  Settings, Save, Undo, Redo, Download, Share2, Eye,
  ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeft, Sigma, Library,
  Maximize2, Minus, Plus as ZoomIn, Grid3X3, Loader2
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface DesignerLayoutProps {
  title?: string
  children: React.ReactNode
  activeTab: 'text' | 'media' | 'shapes' | 'templates' | 'ai' | 'math' | 'subjects' | null
  setActiveTab: (tab: 'text' | 'media' | 'shapes' | 'templates' | 'ai' | 'math' | 'subjects' | null) => void
  activeFace: 'cover' | 'front' | 'back'
  setActiveFace: (activeFace: 'cover' | 'front' | 'back') => void
  sidebarContent: React.ReactNode
  propertiesContent: React.ReactNode
  onShare?: () => void
  onExport?: () => void
  onSave?: () => void
  isExporting?: boolean
  isSaving?: boolean
  activeCardIndex?: number
  totalCards?: number
  onNextCard?: () => void
  onPrevCard?: () => void
  onAddCard?: () => void
  onDeleteCard?: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  layersPanel?: React.ReactNode
  zoom?: number
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoomReset?: () => void
  onPreview?: () => void
}

const tools = [
  { id: 'text' as const, icon: Type, label: 'Text' },
  { id: 'media' as const, icon: ImageIcon, label: 'Media' },
  { id: 'shapes' as const, icon: Square, label: 'Shapes' },
  { id: 'math' as const, icon: Sigma, label: 'Math' },
  { id: 'subjects' as const, icon: Library, label: 'Subjects' },
  { id: 'templates' as const, icon: LayoutTemplate, label: 'Templates' },
]

export default function FlashcardDesignerLayout({
  title = 'Untitled Deck',
  children,
  activeTab,
  setActiveTab,
  activeFace,
  setActiveFace,
  sidebarContent,
  propertiesContent,
  onShare,
  onExport,
  onSave,
  isExporting = false,
  isSaving = false,
  activeCardIndex = 0,
  totalCards = 1,
  onNextCard,
  onPrevCard,
  onAddCard,
  onDeleteCard,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  layersPanel,
  zoom = 1,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onPreview,
}: DesignerLayoutProps) {
  const [showProperties, setShowProperties] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const showPanel = activeTab !== null

  return (
    <div className="flex flex-col fixed inset-0 z-50 bg-[#f0f2f5] dark:bg-[#0f1117] font-sans overflow-hidden">

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <header className="h-14 bg-white dark:bg-[#1a1d27] border-b border-[#e5e7eb] dark:border-[#2a2d3a] flex items-center justify-between px-4 z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/student/flashcards"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="w-px h-5 bg-[#e5e7eb] dark:bg-[#2a2d3a]" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[#111] dark:text-white truncate max-w-[200px] sm:max-w-[320px]">{title}</h1>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#059669] bg-[#ecfdf5] dark:bg-[#064e3b]/40 dark:text-[#6ee7b7] px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Auto-saved
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1 mr-2">
            <button onClick={onUndo} disabled={!canUndo} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#111] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] transition-colors disabled:opacity-30 disabled:pointer-events-none">
              <Undo size={16} />
            </button>
            <button onClick={onRedo} disabled={!canRedo} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#111] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] transition-colors disabled:opacity-30 disabled:pointer-events-none">
              <Redo size={16} />
            </button>
          </div>

          <button
            onClick={onPreview}
            className="hidden sm:flex items-center gap-2 h-8 px-3 text-sm font-semibold text-[#6b7280] hover:text-[#111] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] rounded-lg transition-colors"
          >
            <Eye size={16} /> Preview
          </button>
          <button
            onClick={onShare}
            className="hidden sm:flex items-center gap-2 h-8 px-3 text-sm font-semibold text-[#6b7280] hover:text-[#111] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] rounded-lg transition-colors"
          >
            <Share2 size={16} /> Share
          </button>
          <button
            onClick={onExport}
            disabled={isExporting}
            className="hidden sm:flex items-center gap-2 h-8 px-3 text-sm font-semibold text-[#6b7280] hover:text-[#111] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] rounded-lg transition-colors disabled:opacity-50"
          >
            <Download size={16} /> {isExporting ? 'Exporting...' : 'Export'}
          </button>

          <div className="w-px h-5 bg-[#e5e7eb] dark:bg-[#2a2d3a] mx-1" />

          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 h-8 px-4 text-sm font-bold bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg transition-colors shadow-sm disabled:opacity-60"
          >
            {isSaving ? (
              <><Loader2 size={15} className="animate-spin" /> Saving...</>
            ) : (
              <><Save size={15} /> Save</>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Workspace ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Tool Rail ─────────────────────────────────── */}
        <nav className="w-[68px] bg-white dark:bg-[#1a1d27] border-r border-[#e5e7eb] dark:border-[#2a2d3a] flex flex-col items-center pt-3 gap-1 z-20 shrink-0">
          {tools.map(t => {
            const Icon = t.icon
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(isActive ? null : t.id)}
                className={`w-12 h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#6366f1]/10 text-[#6366f1] shadow-sm'
                    : 'text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] hover:text-[#374151] dark:hover:text-white'
                }`}
              >
                <Icon size={20} strokeWidth={1.5} />
                <span className="text-[8px] font-bold uppercase tracking-wider">{t.label}</span>
              </button>
            )
          })}
          <div className="w-6 h-px bg-[#e5e7eb] dark:bg-[#2a2d3a] my-2" />
          <button
            onClick={() => setActiveTab('ai')}
            className={`w-12 h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all ${
              activeTab === 'ai'
                ? 'bg-[#a855f7]/10 text-[#a855f7] shadow-sm'
                : 'text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] hover:text-[#374151] dark:hover:text-white'
            }`}
          >
            <Sparkles size={20} strokeWidth={1.5} />
            <span className="text-[8px] font-bold uppercase tracking-wider">AI</span>
          </button>
        </nav>

        {/* ── Tool Panel (slide-out) ─────────────────────────── */}
        <AnimatePresence>
          {showPanel && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="bg-white dark:bg-[#1a1d27] border-r border-[#e5e7eb] dark:border-[#2a2d3a] flex flex-col overflow-hidden shrink-0 hidden md:flex"
            >
              <div className="shrink-0 px-5 py-4 border-b border-[#e5e7eb] dark:border-[#2a2d3a] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#111] dark:text-white capitalize">
                  {activeTab === 'ai' ? 'AI Coach' : `${tools.find(t => t.id === activeTab)?.label || ''} Tools`}
                </h2>
                <button
                  onClick={() => setActiveTab(null)}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-[#9ca3af] hover:text-[#111] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {sidebarContent}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Canvas Area ──────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Face tabs — shrink-0 so they never overlap the card */}
          <div className="shrink-0 flex items-center justify-center pt-2 pb-1 z-10">
            <div className="flex items-center bg-white dark:bg-[#1a1d27] rounded-xl shadow-sm border border-[#e5e7eb] dark:border-[#2a2d3a] p-1">
              {(['cover', 'front', 'back'] as const).map(face => (
                <button
                  key={face}
                  onClick={() => setActiveFace(face)}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeFace === face
                      ? 'bg-[#6366f1] text-white shadow-sm'
                      : 'text-[#6b7280] hover:text-[#111] dark:hover:text-white'
                  }`}
                >
                  {face === 'cover' ? 'Cover' : face === 'front' ? 'Front' : 'Back'}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto flex items-center justify-center px-8 lg:px-12 pb-8 lg:pb-12">
            <motion.div
              layout
              className={`w-full max-w-[640px] aspect-[4/3] bg-white dark:bg-[#1a1d27] rounded-2xl shadow-xl border border-[#e5e7eb] dark:border-[#2a2d3a] relative group overflow-hidden transition-shadow hover:shadow-2xl`}
            >
              {children}
            </motion.div>
          </div>

          {/* Bottom card navigation */}
          <div className="h-16 bg-white dark:bg-[#1a1d27] border-t border-[#e5e7eb] dark:border-[#2a2d3a] flex items-center justify-between px-6 shrink-0">
            <button
              onClick={() => setShowLayers(!showLayers)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                showLayers
                  ? 'bg-[#6366f1]/10 text-[#6366f1]'
                  : 'text-[#9ca3af] hover:text-[#111] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a]'
              }`}
            >
              <Grid3X3 size={16} />
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={onPrevCard}
                disabled={activeCardIndex === 0}
                className="w-9 h-9 flex items-center justify-center rounded-full border border-[#e5e7eb] dark:border-[#2a2d3a] text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] transition-colors disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-[#374151] dark:text-[#d1d5db] select-none">
                Card <span className="text-[#111] dark:text-white">{activeCardIndex + 1}</span>
                <span className="text-[#9ca3af] font-normal"> / {totalCards}</span>
              </span>
              <button
                onClick={onNextCard}
                disabled={activeCardIndex === totalCards - 1}
                className="w-9 h-9 flex items-center justify-center rounded-full border border-[#e5e7eb] dark:border-[#2a2d3a] text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] transition-colors disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onDeleteCard}
                disabled={totalCards <= 1}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#ef4444] hover:bg-[#fef2f2] dark:hover:bg-[#450a0a]/40 transition-colors disabled:opacity-40"
              >
                <Trash2 size={16} />
              </button>
              <div className="w-px h-5 bg-[#e5e7eb] dark:bg-[#2a2d3a]" />
              <button
                onClick={onAddCard}
                className="flex items-center gap-2 h-9 px-4 text-sm font-bold bg-[#f3f4f6] dark:bg-[#2a2d3a] text-[#374151] dark:text-[#d1d5db] hover:bg-[#e5e7eb] dark:hover:bg-[#3a3d4a] rounded-lg transition-colors"
              >
                <Plus size={16} /> Add Card
              </button>

              <button
                onClick={() => setShowProperties(!showProperties)}
                className={`ml-2 w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                  showProperties
                    ? 'bg-[#6366f1]/10 text-[#6366f1]'
                    : 'text-[#9ca3af] hover:text-[#111] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a]'
                }`}
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
        </main>

        {/* ── Right Panels ──────────────────────────────────── */}
        <AnimatePresence>
          {showProperties && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="bg-white dark:bg-[#1a1d27] border-l border-[#e5e7eb] dark:border-[#2a2d3a] flex flex-col shrink-0 hidden lg:flex overflow-hidden"
            >
              <div className="shrink-0 px-5 py-4 border-b border-[#e5e7eb] dark:border-[#2a2d3a] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#111] dark:text-white">Properties</h2>
                <button
                  onClick={() => setShowProperties(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-[#9ca3af] hover:text-[#111] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {propertiesContent}
              </div>
            </motion.aside>
          )}
          {showLayers && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="bg-white dark:bg-[#1a1d27] border-l border-[#e5e7eb] dark:border-[#2a2d3a] flex flex-col shrink-0 hidden lg:flex overflow-hidden"
            >
              <div className="shrink-0 px-5 py-4 border-b border-[#e5e7eb] dark:border-[#2a2d3a] flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#111] dark:text-white">Layers</h2>
                <button
                  onClick={() => setShowLayers(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-[#9ca3af] hover:text-[#111] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {layersPanel || (
                  <p className="text-xs text-[#9ca3af]">Move elements on the canvas to see their layers.</p>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

      </div>

      {/* ── Zoom / Layout controls ───────────────────────────── */}
      <div className="hidden lg:flex absolute bottom-20 left-1/2 -translate-x-1/2 items-center gap-2 bg-white/90 dark:bg-[#1a1d27]/90 backdrop-blur-md border border-[#e5e7eb] dark:border-[#2a2d3a] rounded-full px-3 py-1.5 shadow-lg z-10">
        <button onClick={onZoomOut} className="w-7 h-7 flex items-center justify-center rounded-full text-[#6b7280] hover:text-[#111] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] transition-colors">
          <Minus size={14} />
        </button>
        <button onClick={onZoomReset} className="text-xs font-semibold text-[#374151] dark:text-[#d1d5db] min-w-[36px] text-center hover:text-primary transition-colors">{Math.round((zoom || 1) * 100)}%</button>
        <button onClick={onZoomIn} className="w-7 h-7 flex items-center justify-center rounded-full text-[#6b7280] hover:text-[#111] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] transition-colors">
          <ZoomIn size={14} />
        </button>
        <div className="w-px h-4 bg-[#e5e7eb] dark:bg-[#2a2d3a]" />
        <button onClick={onPreview} className="w-7 h-7 flex items-center justify-center rounded-full text-[#6b7280] hover:text-[#111] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] transition-colors">
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  )
}
