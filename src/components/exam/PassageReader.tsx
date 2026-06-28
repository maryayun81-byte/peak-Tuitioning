'use client'

/**
 * PassageReader — Split-pane comprehension interface.
 *
 * Features:
 * - Locked passage pane (never disappears)
 * - Numbered paragraphs for quick reference
 * - Text highlighting (yellow, green, blue), underline, strikethrough
 * - Sticky notes on paragraphs
 * - Paragraph bookmarking (★)
 * - Resizable split panes (30/70 to 70/30)
 * - Mobile: Tab-based switching between Passage and Questions
 * - Jump-to-paragraph from question references
 * - Teacher-controlled Ctrl+F search
 * - Accessibility: font size, line spacing, reading font, theme
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Highlighter, Underline, Strikethrough, StickyNote, Star, Search, X,
  ChevronLeft, ChevronRight, BookOpen, MessageSquare, Settings2, ZoomIn, ZoomOut
} from 'lucide-react'

// ─── Annotation Types ──────────────────────────────────────────────────────────
type AnnotationType = 'highlight_yellow' | 'highlight_green' | 'highlight_blue' | 'underline' | 'strikethrough'

interface Annotation {
  id: string
  paragraphIndex: number
  start: number
  end: number
  type: AnnotationType
  note?: string
}

interface BookmarkedParagraph {
  index: number
  label: string
}

// ─── Passage paragraph parser ───────────────────────────────────────────────────
function parsePassageParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}|\n(?=\s*\n)/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
}

// ─── Paragraph renderer with annotations ──────────────────────────────────────
function AnnotatedParagraph({
  text,
  index,
  annotations,
  bookmarked,
  onBookmark,
  onAddNote,
  highlighted,
}: {
  text: string
  index: number
  annotations: Annotation[]
  bookmarked: boolean
  onBookmark: () => void
  onAddNote: (idx: number) => void
  highlighted: boolean
}) {
  const myAnnotations = annotations.filter(a => a.paragraphIndex === index)

  // Build annotated spans
  let rendered = text
  // Simple approach: overlay CSS classes via data attributes
  const hasHighlight = myAnnotations.some(a => a.type.startsWith('highlight'))
  const hasUnderline = myAnnotations.some(a => a.type === 'underline')
  const hasStrikethrough = myAnnotations.some(a => a.type === 'strikethrough')
  const notes = myAnnotations.filter(a => a.note)

  return (
    <div
      id={`paragraph-${index}`}
      className={`relative group mb-6 transition-all duration-300 ${highlighted ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-[var(--bg)] rounded-lg' : ''}`}
    >
      {/* Paragraph number + controls */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 shrink-0 mt-1">
          <span className="text-xs font-black text-indigo-500 bg-indigo-500/10 w-6 h-6 flex items-center justify-center rounded-md">
            {index + 1}
          </span>
          <button
            onClick={onBookmark}
            className={`opacity-0 group-hover:opacity-100 transition-opacity ${bookmarked ? 'opacity-100 text-amber-500' : 'text-muted hover:text-amber-500'}`}
            title="Bookmark paragraph"
          >
            <Star size={12} fill={bookmarked ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => onAddNote(index)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-indigo-500"
            title="Add sticky note"
          >
            <MessageSquare size={12} />
          </button>
        </div>

        <div className="flex-1">
          <p
            className={`leading-8 text-[var(--text)] ${
              hasHighlight ? 'bg-yellow-200/50 dark:bg-yellow-400/20' : ''
            } ${hasUnderline ? 'underline decoration-2' : ''} ${
              hasStrikethrough ? 'line-through' : ''
            }`}
          >
            {text}
          </p>

          {/* Sticky notes */}
          {notes.map((note, i) => (
            <div key={i} className="mt-2 ml-4 p-2.5 bg-amber-100/80 dark:bg-amber-400/10 border-l-4 border-amber-400 rounded-r-lg text-xs font-medium text-amber-900 dark:text-amber-300">
              📝 {note.note}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
interface PassageReaderProps {
  passage: {
    id: string
    title: string
    content: string
    passage_type: string
    allow_search?: boolean
  }
  annotations: Annotation[]
  onAnnotationsChange: (annotations: Annotation[]) => void
  children: React.ReactNode // The question panel
  highlightedParagraph?: number | null
}

export function PassageReader({
  passage,
  annotations,
  onAnnotationsChange,
  children,
  highlightedParagraph = null,
}: PassageReaderProps) {
  const paragraphs = parsePassageParagraphs(passage.content)
  const passageRef = useRef<HTMLDivElement>(null)

  const [splitRatio, setSplitRatio] = useState(50) // percent for passage pane
  const [isDragging, setIsDragging] = useState(false)
  const [mobileTab, setMobileTab] = useState<'passage' | 'questions'>('passage')
  const [bookmarks, setBookmarks] = useState<BookmarkedParagraph[]>([])
  const [activeAnnotationType, setActiveAnnotationType] = useState<AnnotationType>('highlight_yellow')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [stickyNoteModal, setStickyNoteModal] = useState<{ paragraphIndex: number; note: string } | null>(null)

  // Accessibility settings
  const [fontSize, setFontSize] = useState(16)
  const [lineHeight, setLineHeight] = useState(2)
  const [readingFont, setReadingFont] = useState<'serif' | 'sans' | 'dyslexic'>('serif')
  const [showAccessibility, setShowAccessibility] = useState(false)

  // Jump to highlighted paragraph
  useEffect(() => {
    if (highlightedParagraph !== null && passageRef.current) {
      const el = document.getElementById(`paragraph-${highlightedParagraph}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [highlightedParagraph])

  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    const container = document.getElementById('passage-split-container')
    if (!container) return
    const rect = container.getBoundingClientRect()
    const newRatio = Math.min(70, Math.max(30, ((e.clientX - rect.left) / rect.width) * 100))
    setSplitRatio(newRatio)
  }, [isDragging])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag)
      window.addEventListener('mouseup', () => setIsDragging(false))
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag)
      window.removeEventListener('mouseup', () => setIsDragging(false))
    }
  }, [isDragging, handleDrag])

  const handleTextSelect = () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const range = selection.getRangeAt(0)
    const container = selection.anchorNode?.parentElement?.closest('[id^="paragraph-"]')
    if (!container) return

    const paragraphIndex = parseInt(container.id.replace('paragraph-', ''))
    const text = paragraphs[paragraphIndex] || ''
    const selectedText = selection.toString()
    const start = text.indexOf(selectedText)
    if (start < 0) return

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      paragraphIndex,
      start,
      end: start + selectedText.length,
      type: activeAnnotationType,
    }

    onAnnotationsChange([...annotations, newAnnotation])
    selection.removeAllRanges()
  }

  const handleBookmark = (index: number) => {
    const exists = bookmarks.find(b => b.index === index)
    if (exists) {
      setBookmarks(bookmarks.filter(b => b.index !== index))
    } else {
      setBookmarks([...bookmarks, { index, label: `Paragraph ${index + 1}` }])
    }
  }

  const handleSaveNote = () => {
    if (!stickyNoteModal) return
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      paragraphIndex: stickyNoteModal.paragraphIndex,
      start: 0,
      end: 0,
      type: 'highlight_yellow',
      note: stickyNoteModal.note,
    }
    onAnnotationsChange([...annotations, newAnnotation])
    setStickyNoteModal(null)
  }

  const fontFamily = {
    serif: '"Times New Roman", Georgia, serif',
    sans: 'Inter, system-ui, sans-serif',
    dyslexic: 'OpenDyslexic, Comic Sans MS, Arial, sans-serif',
  }[readingFont]

  const passageTypeLabel = {
    poem: '🎵 Poem',
    prose: '📄 Passage',
    dialogue: '💬 Dialogue',
    set_book: '📚 Set Book Extract',
    table: '📊 Table / Data',
    image: '🖼 Image Stimulus',
  }[passage.passage_type] || '📄 Passage'

  return (
    <div className="w-full h-full flex flex-col">
      {/* Mobile Tab Toggle */}
      <div className="md:hidden flex border-b border-[var(--card-border)] bg-[var(--card)] shrink-0">
        <button
          onClick={() => setMobileTab('passage')}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${mobileTab === 'passage' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-muted'}`}
        >
          <BookOpen size={14} className="inline mr-2" /> Passage
        </button>
        <button
          onClick={() => setMobileTab('questions')}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${mobileTab === 'questions' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-muted'}`}
        >
          Questions
        </button>
      </div>

      {/* Desktop Split Pane */}
      <div id="passage-split-container" className="flex-1 flex overflow-hidden relative">
        {/* ─── PASSAGE PANE ─────────────────────────────────────────── */}
        <div
          ref={passageRef}
          className={`${mobileTab === 'questions' ? 'hidden md:flex' : 'flex'} flex-col border-r border-[var(--card-border)] overflow-hidden`}
          style={{ width: `${splitRatio}%` }}
        >
          {/* Passage Toolbar */}
          <div className="shrink-0 border-b border-[var(--card-border)] bg-[var(--card)] px-4 py-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-muted uppercase tracking-widest mr-2">{passageTypeLabel}</span>

            {/* Annotation tools */}
            <div className="flex items-center gap-1 border-r border-[var(--card-border)] pr-2 mr-1">
              {([
                { type: 'highlight_yellow', icon: '🟡', title: 'Highlight Yellow' },
                { type: 'highlight_green', icon: '🟢', title: 'Highlight Green' },
                { type: 'highlight_blue', icon: '🔵', title: 'Highlight Blue' },
                { type: 'underline', icon: <Underline size={14} />, title: 'Underline' },
                { type: 'strikethrough', icon: <Strikethrough size={14} />, title: 'Strikethrough' },
              ] as { type: AnnotationType; icon: any; title: string }[]).map(({ type, icon, title }) => (
                <button
                  key={type}
                  onClick={() => setActiveAnnotationType(type)}
                  title={title}
                  className={`p-1.5 rounded-lg text-sm transition-all ${activeAnnotationType === type ? 'ring-2 ring-indigo-500 bg-indigo-500/10' : 'hover:bg-[var(--input)]'}`}
                >
                  {typeof icon === 'string' ? icon : <span className="text-muted">{icon}</span>}
                </button>
              ))}
            </div>

            {/* Bookmarks */}
            {bookmarks.length > 0 && (
              <div className="flex items-center gap-1 border-r border-[var(--card-border)] pr-2 mr-1">
                {bookmarks.map(b => (
                  <button
                    key={b.index}
                    onClick={() => {
                      document.getElementById(`paragraph-${b.index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className="text-xs font-bold px-2 py-1 bg-amber-500/10 text-amber-500 rounded-lg"
                  >
                    ★ P{b.index + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Search */}
            {passage.allow_search && (
              <button
                onClick={() => setSearchOpen(v => !v)}
                className="p-1.5 rounded-lg text-muted hover:text-indigo-500 hover:bg-indigo-500/10"
                title="Find in passage"
              >
                <Search size={14} />
              </button>
            )}

            {/* Accessibility */}
            <div className="relative ml-auto">
              <button
                onClick={() => setShowAccessibility(v => !v)}
                className="p-1.5 rounded-lg text-muted hover:text-indigo-500 hover:bg-indigo-500/10"
                title="Reading settings"
              >
                <Settings2 size={14} />
              </button>
              {showAccessibility && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-2xl z-50 p-4 space-y-4">
                  <p className="text-xs font-black uppercase tracking-widest text-muted">Reading Settings</p>
                  <div>
                    <label className="text-xs font-bold text-muted block mb-1">Font Size ({fontSize}px)</label>
                    <input type="range" min={12} max={24} value={fontSize} onChange={e => setFontSize(+e.target.value)} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted block mb-1">Line Spacing ({lineHeight})</label>
                    <input type="range" min={1.4} max={3} step={0.1} value={lineHeight} onChange={e => setLineHeight(+e.target.value)} className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted block mb-2">Reading Font</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['serif', 'sans', 'dyslexic'] as const).map(f => (
                        <button key={f} onClick={() => setReadingFont(f)} className={`py-1.5 text-xs font-bold rounded-lg border transition-colors ${readingFont === f ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-[var(--card-border)] text-muted'}`}>
                          {f === 'dyslexic' ? 'Dyslexic' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pane ratio quick buttons */}
            <div className="hidden md:flex items-center gap-1">
              {[['40', '30', '40/60'], ['50', '50', '50/50'], ['60', '60', '60/40'], ['70', '70', '70/30']].map(([pct, val, label]) => (
                <button key={label} onClick={() => setSplitRatio(+val)} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${splitRatio === +val ? 'bg-indigo-500 text-white' : 'text-muted hover:bg-[var(--input)]'}`}>{label}</button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          {searchOpen && passage.allow_search && (
            <div className="shrink-0 border-b border-[var(--card-border)] bg-amber-500/5 px-4 py-2 flex items-center gap-2">
              <Search size={14} className="text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Find in passage..."
                className="flex-1 bg-transparent text-sm outline-none text-[var(--text)]"
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery('') }}>
                <X size={14} className="text-muted" />
              </button>
            </div>
          )}

          {/* Passage title */}
          <div className="shrink-0 px-6 pt-6 pb-2">
            <h2 className="text-lg font-black text-center" style={{ color: 'var(--text)' }}>{passage.title}</h2>
            {passage.passage_type === 'poem' && <div className="w-16 h-0.5 bg-indigo-500 mx-auto mt-2" />}
          </div>

          {/* Passage content */}
          <div
            className="flex-1 overflow-y-auto px-6 py-4 select-text"
            onMouseUp={handleTextSelect}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              fontFamily,
            }}
          >
            {paragraphs.map((para, idx) => {
              const matchesSearch = searchQuery && para.toLowerCase().includes(searchQuery.toLowerCase())
              return (
                <AnnotatedParagraph
                  key={idx}
                  text={matchesSearch
                    ? para.replace(new RegExp(searchQuery, 'gi'), m => `[${m}]`)
                    : para
                  }
                  index={idx}
                  annotations={annotations}
                  bookmarked={!!bookmarks.find(b => b.index === idx)}
                  onBookmark={() => handleBookmark(idx)}
                  onAddNote={i => setStickyNoteModal({ paragraphIndex: i, note: '' })}
                  highlighted={highlightedParagraph === idx}
                />
              )
            })}
          </div>
        </div>

        {/* ─── RESIZE HANDLE ────────────────────────────────────────────── */}
        <div
          className="hidden md:block w-1.5 bg-[var(--card-border)] hover:bg-indigo-500/50 cursor-col-resize transition-colors shrink-0 relative group"
          onMouseDown={() => setIsDragging(true)}
        >
          <div className="absolute inset-y-0 -left-2 -right-2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-12 flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {[0,1,2].map(i => <div key={i} className="w-0.5 h-3 bg-indigo-500 rounded-full" />)}
          </div>
        </div>

        {/* ─── QUESTIONS PANE ───────────────────────────────────────────── */}
        <div
          className={`${mobileTab === 'passage' ? 'hidden md:flex' : 'flex'} flex-col flex-1 overflow-hidden`}
          style={{ width: `${100 - splitRatio}%` }}
        >
          {children}
        </div>
      </div>

      {/* Sticky Note Modal */}
      {stickyNoteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] rounded-3xl border border-[var(--card-border)] p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-black mb-1">Add Sticky Note</h3>
            <p className="text-sm text-muted mb-4">Paragraph {stickyNoteModal.paragraphIndex + 1}</p>
            <textarea
              className="w-full p-3 rounded-xl border border-[var(--card-border)] bg-[var(--input)] text-[var(--text)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4}
              placeholder="Write your note here..."
              value={stickyNoteModal.note}
              onChange={e => setStickyNoteModal({ ...stickyNoteModal, note: e.target.value })}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStickyNoteModal(null)} className="flex-1 py-2 rounded-xl border border-[var(--card-border)] text-sm font-bold text-muted hover:bg-[var(--input)]">Cancel</button>
              <button onClick={handleSaveNote} className="flex-1 py-2 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600">Save Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
