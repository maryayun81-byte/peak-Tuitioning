'use client'

import React, { useState, useRef, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Type, Image as ImageIcon, LayoutTemplate, Shapes, BrainCircuit, 
  Palette, Library, ArrowLeft, MoreHorizontal, Settings, Redo, Undo, 
  Eye, Download, Share2, Plus, Move, Trash2, Maximize2, Save,
  Square, Circle, Triangle, Star, AlignLeft, AlignCenter, AlignRight, Sparkles, Calculator, Sigma, Loader2
} from 'lucide-react'
import FlashcardDesignerLayout from '@/components/creator-hub/designer/FlashcardDesignerLayout'
import 'katex/dist/katex.min.css'
import { BlockMath } from 'react-katex'
import { exportToPng } from '@/lib/exportUtils'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { saveStudioDeck, getStudentIdForUser, loadStudioDeck } from '@/app/actions/flashcards'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import ShareDeckModal from '@/components/creator-hub/ShareDeckModal'
import ExportWizardModal from '@/components/creator-hub/designer/ExportWizardModal'
import { chatWithPeakAI } from '@/app/actions/ai'
import toast from 'react-hot-toast'

interface CanvasElement {
  id: string
  type: 'text' | 'image' | 'sticker' | 'math'
  content: string
  x: number
  y: number
  width?: number
  height?: number
  fontSize?: number
  color?: string
  fontFamily?: string
  zIndex: number
}

interface CardFace {
  background: string
  font?: string
  elements: CanvasElement[]
}

export interface Flashcard {
  id: string
  front: CardFace
  back: CardFace
}

const THEMES = [
  { id: 'girly-pink', name: 'Pastel Dream', bg: 'bg-gradient-to-br from-pink-100 via-rose-100 to-fuchsia-100', font: 'font-sans' },
  { id: 'cute-purple', name: 'Soft Lilac', bg: 'bg-gradient-to-br from-violet-100 via-purple-100 to-fuchsia-50', font: 'font-serif' },
  { id: 'aesthetic-peach', name: 'Peachy', bg: 'bg-gradient-to-br from-orange-100 to-rose-100', font: 'font-[Outfit]' },
  { id: 'minimal', name: 'Clean White', bg: 'bg-white', font: 'font-sans' },
  { id: 'notebook', name: 'Notebook Grid', bg: 'bg-[linear-gradient(#eef2ff_1px,transparent_1px)] bg-[length:100%_28px] bg-white', font: 'font-mono' },
  { id: 'dark-galaxy', name: 'Galaxy', bg: 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white', font: 'font-sans' },
  { id: 'neon-cyber', name: 'Cyberpunk', bg: 'bg-gradient-to-br from-gray-900 via-gray-900 to-black border-2 border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.5)]', font: 'font-mono' },
  { id: 'vintage', name: 'Vintage', bg: 'bg-[#f4ecd8] border-8 border-double border-[#8b7355]', font: 'font-serif' },
  { id: 'math-blue', name: 'Blueprint', bg: 'bg-blue-900 bg-[linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] bg-[size:20px_20px] bg-opacity-20', font: 'font-mono text-white' },
  { id: 'kids-stars', name: 'Starry Magic', bg: 'bg-indigo-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-purple-600 to-indigo-900 text-white', font: 'font-sans' },
  { id: 'kids-pastel', name: 'Unicorn Dream', bg: 'bg-gradient-to-tr from-pink-300 via-purple-300 to-indigo-400', font: 'font-sans' },
  { id: 'kids-water', name: 'Watercolor Art', bg: 'bg-gradient-to-br from-fuchsia-300 via-rose-300 to-blue-400', font: 'font-[Outfit]' },
  { id: 'kids-space', name: 'Space Explorer', bg: 'bg-slate-900 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black text-white', font: 'font-mono text-white' },
  { id: 'kids-play', name: 'Playful Blocks', bg: 'bg-yellow-100 bg-[linear-gradient(45deg,#fcd34d_25%,transparent_25%,transparent_75%,#fcd34d_75%,#fcd34d),linear-gradient(45deg,#fcd34d_25%,transparent_25%,transparent_75%,#fcd34d_75%,#fcd34d)] bg-[size:40px_40px] bg-[position:0_0,20px_20px]', font: 'font-[Outfit]' },
]

const STICKERS = [
  '🌸', '✨', '🎀', '🦋', '💖', '🧸', '🌈', '🍭', '🍓', '🦄', '⭐', '💯', '🔥', '📚', '🧪', '📐',
  '🩷', '💗', '🫶', '😻', '🐱', '🐶', '🐰', '🦊', '🐼', '🐸', '🦁', '🐯', '🦝', '🐨', '🐲',
  '🌟', '💫', '🌺', '🌻', '🌷', '🌹', '🌸', '💐', '🌿', '🍀', '🌴', '🍄',
  '🍎', '🍕', '🧁', '🍦', '🍩', '🍪', '🍫', '🍬', '🍭', '🥤', '🧃',
  '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🎯', '🎲', '🎨', '🎵', '🎶', '🎤',
  '💎', '👑', '🧩', '🔮', '🪄', '💡', '🔬', '📝', '✏️', '🖍️', '📖', '📕',
  '🌈', '☀️', '🌙', '⭐', '🌟', '⛅', '🌊', '🔥', '❄️', '⚡', '🌋',
  '😊', '🥰', '😍', '🤩', '😎', '🥳', '😇', '🤗', '💪', '🧠', '👀', '🎓',
]

export default function FlashcardStudioPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></div>}>
      <FlashcardStudioContent />
    </Suspense>
  )
}

function FlashcardStudioContent() {
  const searchParams = useSearchParams()
  const initialTitle = searchParams.get('title') || 'My New Deck'
  const initialIcon = searchParams.get('icon') || '📚'
  const initialBg = searchParams.get('bg') || THEMES[0].bg
  const deckIdParam = searchParams.get('deckId')

  const [activeTab, setActiveTab] = useState<'text' | 'media' | 'shapes' | 'templates' | 'ai' | 'math' | 'subjects' | null>(null)
  const [activeFace, setActiveFace] = useState<'cover' | 'front' | 'back'>('cover')
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [deckId, setDeckId] = useState<string | null>(deckIdParam)
  const [isLoaded, setIsLoaded] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const zoomIn = () => setZoom(prev => Math.min(3, +(prev + 0.1).toFixed(2)))
  const zoomOut = () => setZoom(prev => Math.max(0.25, +(prev - 0.1).toFixed(2)))
  const zoomReset = () => setZoom(1)

  // ── Context Menu ───────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null)

  // ── Multi-select ───────────────────────────────────────
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set())

  const toggleElementSelection = (id: string, shiftKey: boolean) => {
    if (shiftKey) {
      setSelectedElementIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else {
      setSelectedElementIds(new Set([id]))
    }
  }

  // Close context menu on click outside
  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const handleExportAction = async (action: string, options: any) => {
    if (!canvasRef.current) return
    setIsExporting(true)
    try {
      if (action === 'png_current') {
        await exportToPng(canvasRef.current, `${initialTitle.replace(/\s+/g, '_').toLowerCase()}_card.png`)
      } else if (action === 'pdf_cut') {
        const prevFace = activeFace
        const prevCardIndex = activeCardIndex
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const a4W = 210, a4H = 297, mx = 10, my = 15
        const cw = (a4W - mx * 2) / 2, ch = (a4H - my * 2) / 3

        for (let cardIdx = 0; cardIdx < cards.length; cardIdx++) {
          // Set active card and capture front
          setActiveCardIndex(cardIdx)
          setActiveFace('front')
          await new Promise(r => setTimeout(r, 300))
          const frontUrl = await html2canvas(canvasRef.current!, { scale: 2, useCORS: true }).then(c => c.toDataURL('image/png', 0.95))

          // Capture back
          setActiveFace('back')
          await new Promise(r => setTimeout(r, 300))
          const backUrl = await html2canvas(canvasRef.current!, { scale: 2, useCORS: true }).then(c => c.toDataURL('image/png', 0.95))

          if (cardIdx > 0 || pdf.getNumberOfPages() > 0) {
            // Add front page
            pdf.addPage()
          }
          pdf.setFontSize(10); pdf.text(`${initialTitle} - Card ${cardIdx + 1} Front`, mx, 10)
          for (let i = 0; i < 6; i++) {
            const col = i % 2, row = Math.floor(i / 2)
            const x = mx + col * cw, y = my + row * ch
            pdf.addImage(frontUrl, 'PNG', x + 2, y + 2, cw - 4, ch - 4)
            pdf.setDrawColor(200, 200, 200); (pdf as any).setLineDash([1, 1], 0)
            pdf.rect(x, y, cw, ch)
          }

          // Back page
          pdf.addPage()
          pdf.setFontSize(10); pdf.text(`${initialTitle} - Card ${cardIdx + 1} Back`, mx, 10)
          for (let i = 0; i < 6; i++) {
            const mCol = 1 - (i % 2), row = Math.floor(i / 2)
            const x = mx + mCol * cw, y = my + row * ch
            pdf.addImage(backUrl, 'PNG', x + 2, y + 2, cw - 4, ch - 4)
            pdf.setDrawColor(200, 200, 200); (pdf as any).setLineDash([1, 1], 0)
            pdf.rect(x, y, cw, ch)
          }
        }

        // Restore original card and face
        setActiveCardIndex(prevCardIndex)
        setActiveFace(prevFace)

        pdf.save(`${initialTitle.replace(/\s+/g, '_').toLowerCase()}_printable.pdf`)
      } else {
        alert('Advanced export formats (ZIP, PPTX) will be implemented in the next step!')
      }
    } finally {
      setIsExporting(false)
      setIsExportModalOpen(false)
    }
  }

  // Card State
  const [coverFace, setCoverFace] = useState<CardFace>({ 
    background: initialBg, 
    font: THEMES[0].font, 
    elements: [
      { id: 'cover-icon', type: 'text', content: initialIcon, x: 150, y: 40, fontSize: 64, zIndex: 1, color: '#1e293b' },
      { id: 'cover-title', type: 'text', content: initialTitle, x: 30, y: 120, fontSize: 36, zIndex: 1, color: '#1e293b' }
    ] 
  })
  
  const [cards, setCards] = useState<Flashcard[]>([{
    id: 'card-1',
    front: { background: THEMES[0].bg, font: THEMES[0].font, elements: [] },
    back: { background: THEMES[0].bg, font: THEMES[0].font, elements: [] }
  }])
  const [activeCardIndex, setActiveCardIndex] = useState(0)

  // ── Undo/Redo History ──────────────────────────────────
  interface HistoryEntry { coverFace: CardFace; cards: Flashcard[] }
  const [past, setPast] = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])
  const snapshotRef = useRef<HistoryEntry>({ coverFace, cards })
  // Keep snapshotRef.current up-to-date every render
  snapshotRef.current = { coverFace, cards }

  const pushHistory = useCallback(() => {
    setPast(prev => [...prev, snapshotRef.current])
    setFuture([])
  }, [])

  const undo = useCallback(() => {
    if (past.length === 0) return
    const prev = past[past.length - 1]
    const current = snapshotRef.current
    setCoverFace(prev.coverFace)
    setCards(prev.cards)
    setPast(p => p.slice(0, -1))
    setFuture(f => [...f, current])
  }, [past])

  const redo = useCallback(() => {
    if (future.length === 0) return
    const next = future[future.length - 1]
    const current = snapshotRef.current
    setCoverFace(next.coverFace)
    setCards(next.cards)
    setFuture(f => f.slice(0, -1))
    setPast(p => [...p, current])
  }, [future])
  
  const currentFace = activeFace === 'cover' ? coverFace : activeFace === 'front' ? cards[activeCardIndex].front : cards[activeCardIndex].back
  
  const setCurrentFace = (updater: React.SetStateAction<CardFace>) => {
    if (activeFace === 'cover') {
      setCoverFace(updater)
    } else {
      setCards(prev => {
        const newCards = [...prev]
        const targetCard = newCards[activeCardIndex]
        const currentData = activeFace === 'front' ? targetCard.front : targetCard.back
        const newData = typeof updater === 'function' ? updater(currentData) : updater
        
        if (activeFace === 'front') newCards[activeCardIndex] = { ...targetCard, front: newData }
        else newCards[activeCardIndex] = { ...targetCard, back: newData }
        
        return newCards
      })
    }
  }

  const addCard = () => {
    pushHistory()
    setCards(prev => [...prev, {
      id: `card-${Math.random().toString(36).substr(2, 9)}`,
      front: { background: THEMES[0].bg, font: THEMES[0].font, elements: [] },
      back: { background: THEMES[0].bg, font: THEMES[0].font, elements: [] }
    }])
    setActiveCardIndex(cards.length)
    setActiveFace('front')
  }

  const deleteCard = (index: number) => {
    if (cards.length <= 1) return
    pushHistory()
    setCards(prev => prev.filter((_, i) => i !== index))
    setActiveCardIndex(prev => Math.min(prev, cards.length - 2))
  }

  const addElement = (type: CanvasElement['type'], content: string) => {
    pushHistory()
    const newElement: CanvasElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      x: 50,
      y: 50,
      fontSize: type === 'sticker' ? 64 : 24,
      color: '#1e293b',
      zIndex: currentFace.elements.length + 1
    }
    setCurrentFace(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }))
    setSelectedElementId(newElement.id)
    setSelectedElementIds(new Set([newElement.id]))
  }

  const addImageElement = (url: string) => {
    pushHistory()
    const newElement: CanvasElement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'image',
      content: url,
      x: 50,
      y: 50,
      width: 200,
      height: 150,
      zIndex: currentFace.elements.length + 1
    }
    setCurrentFace(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }))
    setSelectedElementId(newElement.id)
    setSelectedElementIds(new Set([newElement.id]))
  }

  const handleImageUpload = async (file: File) => {
    const supabase = getSupabaseBrowserClient()
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
    const { data, error } = await supabase.storage
      .from('flashcard-images')
      .upload(safeName, file, { upsert: true })
    if (error) {
      // Fallback: create a temp blob URL
      addImageElement(URL.createObjectURL(file))
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('flashcard-images').getPublicUrl(safeName)
    addImageElement(publicUrl)
  }

  const updateElementPosition = (id: string, x: number, y: number) => {
    setCurrentFace(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, x, y } : el)
    }))
  }

  const updateMultiplePositions = (updates: { id: string; x: number; y: number }[]) => {
    setCurrentFace(prev => ({
      ...prev,
      elements: prev.elements.map(el => {
        const update = updates.find(u => u.id === el.id)
        return update ? { ...el, x: update.x, y: update.y } : el
      })
    }))
  }

  const updateElementContent = (id: string, content: string) => {
    setCurrentFace(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, content } : el)
    }))
  }

  const updateElementColor = (id: string, color: string) => {
    setCurrentFace(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, color } : el)
    }))
  }

  const updateElementFontFamily = (id: string, fontFamily: string) => {
    setCurrentFace(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, fontFamily } : el)
    }))
  }

  const updateElementFontSize = (id: string, fontSize: number) => {
    setCurrentFace(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, fontSize } : el)
    }))
  }

  const deleteSelectedElements = () => {
    pushHistory()
    const ids = selectedElementIds.size > 0 ? selectedElementIds : (selectedElementId ? new Set([selectedElementId]) : new Set())
    if (ids.size === 0) return
    setCurrentFace(prev => ({
      ...prev,
      elements: prev.elements.filter(el => !ids.has(el.id))
    }))
    setSelectedElementId(null)
    setSelectedElementIds(new Set())
  }

  const duplicateSelectedElements = () => {
    pushHistory()
    setCurrentFace(prev => {
      const newElements = prev.elements
        .filter(el => selectedElementIds.has(el.id) || el.id === selectedElementId)
        .map(el => ({
          ...el,
          id: Math.random().toString(36).substr(2, 9),
          x: el.x + 20,
          y: el.y + 20,
          zIndex: prev.elements.length + 1
        }))
      return { ...prev, elements: [...prev.elements, ...newElements] }
    })
  }

  const reorderElement = (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    pushHistory()
    setCurrentFace(prev => {
      const sorted = [...prev.elements].sort((a, b) => a.zIndex - b.zIndex)
      const idx = sorted.findIndex(e => e.id === id)
      if (idx === -1) return prev
      const [el] = sorted.splice(idx, 1)
      if (direction === 'top') sorted.push(el)
      else if (direction === 'bottom') sorted.unshift(el)
      else if (direction === 'up') sorted.splice(Math.min(idx + 1, sorted.length), 0, el)
      else sorted.splice(Math.max(idx - 1, 0), 0, el)
      return {
        ...prev,
        elements: sorted.map((e, i) => ({ ...e, zIndex: i + 1 }))
      }
    })
  }

  const setBackground = (bgClass: string, fontClass?: string) => {
    pushHistory()
    setCurrentFace(prev => ({ ...prev, background: bgClass, ...(fontClass && { font: fontClass }) }))
  }

  // Deselect when clicking canvas background
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedElementId(null)
      setSelectedElementIds(new Set())
    }
  }

  // Load existing deck if deckId is present
  useEffect(() => {
    if (deckId && !isLoaded) {
      ;(async () => {
        try {
          const { deck: loadedDeck, cards: loadedCards } = await loadStudioDeck(deckId)
          if (loadedDeck.cover_config && typeof loadedDeck.cover_config === 'object') {
            const cc = loadedDeck.cover_config as any
            if (cc.elements) {
              setCoverFace({
                background: cc.background || THEMES[0].bg,
                font: cc.font || THEMES[0].font,
                elements: cc.elements,
              })
            }
          }
          if (loadedCards.length > 0) {
            setCards(loadedCards.map((card: any) => {
              const vc = card.visual_config || {}
              return {
                id: `card-${card.id}`,
                front: (vc as any).front || { background: THEMES[0].bg, font: THEMES[0].font, elements: [] },
                back: (vc as any).back || { background: THEMES[0].bg, font: THEMES[0].font, elements: [] },
              }
            }))
          }
        } catch (e) {
          console.error('Failed to load deck', e)
          toast.error('Could not load existing deck')
        }
        setIsLoaded(true)
      })()
    } else {
      setIsLoaded(true)
    }
  }, [deckId, isLoaded])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const studentId = await getStudentIdForUser()
      const result = await saveStudioDeck(studentId, {
        deckId: deckId || undefined,
        title: initialTitle,
        coverFace,
        cards,
        themeStyle: THEMES[0].id,
      })
      if (result.deckId && !deckId) {
        setDeckId(result.deckId)
        // Update URL with deckId without navigation
        const url = new URL(window.location.href)
        url.searchParams.set('deckId', result.deckId)
        window.history.replaceState({}, '', url.toString())
      }
      toast.success('Deck saved!', { icon: '💾' })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save deck')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAskCoach = async (prompt: string) => {
    if (!prompt.trim() || aiLoading) return
    setAiLoading(true)
    try {
      const response = await chatWithPeakAI([{ role: 'user', content: prompt }])
      const text = response.content || 'No response'
      // Add the AI response as a text element on the current face
      addElement('text', text.slice(0, 200))
    } catch (e) {
      toast.error('AI Coach unavailable right now')
    } finally {
      setAiLoading(false)
      setAiPrompt('')
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.getAttribute('contenteditable') === 'true') return
        deleteSelectedElements()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, deleteSelectedElements])

  const handleDragEnd = (id: string, newX: number, newY: number) => {
    pushHistory()
    if (selectedElementIds.size > 1) {
      const el = currentFace.elements.find(e => e.id === id)
      if (!el) return
      const dx = newX - el.x
      const dy = newY - el.y
      const updates = currentFace.elements
        .filter(e => selectedElementIds.has(e.id))
        .map(e => ({ id: e.id, x: e.x + dx, y: e.y + dy }))
      updateMultiplePositions(updates)
    } else {
      updateElementPosition(id, newX, newY)
    }
  }

  const handleElementSelect = (id: string, shiftKey: boolean) => {
    if (shiftKey) {
      setSelectedElementIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      setSelectedElementId(id)
    } else {
      setSelectedElementIds(new Set([id]))
      setSelectedElementId(id)
    }
  }

  const selectedEl = currentFace.elements.find(e => e.id === selectedElementId)

  return (
    <>
      <FlashcardDesignerLayout 
        title={initialTitle}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeFace={activeFace}
        setActiveFace={setActiveFace}
        onShare={() => setIsShareModalOpen(true)}
        onExport={() => setIsExportModalOpen(true)}
        onSave={handleSave}
        isExporting={isExporting}
        isSaving={isSaving}
        activeCardIndex={activeCardIndex}
        totalCards={cards.length}
        onNextCard={() => setActiveCardIndex(p => Math.min(cards.length - 1, p + 1))}
        onPrevCard={() => setActiveCardIndex(p => Math.max(0, p - 1))}
        onAddCard={addCard}
        onDeleteCard={() => deleteCard(activeCardIndex)}
        onUndo={undo}
        onRedo={redo}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
        onPreview={() => setPreviewOpen(true)}
        sidebarContent={
        <SidebarTools 
          activeTab={activeTab} 
          addElement={addElement} 
          setBackground={setBackground}
          onImageUpload={handleImageUpload}
          handleAskCoach={handleAskCoach}
          selectedEl={selectedEl}
          aiPrompt={aiPrompt}
          setAiPrompt={setAiPrompt}
          aiLoading={aiLoading}
        />
      }
      propertiesContent={
        <PropertiesSidebar 
          selectedElement={selectedEl}
          deleteElement={deleteSelectedElements}
          currentBackground={currentFace.background}
          setBackground={setBackground}
          onColorChange={(color: string) => selectedEl && updateElementColor(selectedEl.id, color)}
          onFontFamilyChange={(font: string) => selectedEl && updateElementFontFamily(selectedEl.id, font)}
          onFontSizeChange={(size: number) => selectedEl && updateElementFontSize(selectedEl.id, size)}
        />
      }
      layersPanel={
        <LayersPanel
          elements={currentFace.elements}
          selectedElementIds={selectedElementIds}
          selectedElementId={selectedElementId}
          onSelect={handleElementSelect}
          onReorder={reorderElement}
        />
      }
    >
      <div
        className={`absolute inset-0 w-full h-full overflow-hidden ${currentFace.background} ${currentFace.font || ''} transition-colors duration-300`}
      >
        <div 
          ref={canvasRef}
          onClick={handleCanvasClick}
          onContextMenu={(e) => {
            if (e.target === canvasRef.current) {
              setContextMenu(null)
            }
          }}
          className="origin-center w-[420px] h-[280px] mx-auto mt-8 rounded-2xl shadow-2xl relative"
          style={{ transform: `scale(${zoom})` }}
        >
        {currentFace.elements.map((el) => (
          <DraggableElement
            key={el.id}
            element={el}
            isSelected={selectedElementIds.has(el.id)}
            onSelect={(shiftKey: boolean) => handleElementSelect(el.id, shiftKey)}
            onDragEnd={(x: number, y: number) => handleDragEnd(el.id, x, y)}
            onChange={(content: string) => updateElementContent(el.id, content)}
            canvasRef={canvasRef}
            onContextMenu={(e: React.MouseEvent) => {
              e.preventDefault()
              e.stopPropagation()
              handleElementSelect(el.id, false)
              setContextMenu({ x: e.clientX, y: e.clientY, elementId: el.id })
            }}
          />
        ))}
        
        {currentFace.elements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <p className="text-xl font-bold">Use the toolbar to add text or stickers!</p>
          </div>
        )}
        </div>
      </div>
      </FlashcardDesignerLayout>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          elementId={contextMenu.elementId}
          onDuplicate={duplicateSelectedElements}
          onDelete={deleteSelectedElements}
          onBringToFront={() => reorderElement(contextMenu.elementId, 'top')}
          onSendToBack={() => reorderElement(contextMenu.elementId, 'bottom')}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative"
              onClick={e => e.stopPropagation()}
            >
              <div className={`w-[620px] h-[414px] rounded-2xl shadow-2xl ${currentFace.background} ${currentFace.font || ''} flex items-center justify-center relative overflow-hidden`}>
                {currentFace.elements.length === 0 ? (
                  <p className="text-2xl font-bold opacity-30">Empty Card</p>
                ) : (
                  currentFace.elements.map(el => (
                    <div
                      key={el.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: el.x,
                        top: el.y,
                        fontSize: el.fontSize || 24,
                        color: el.color || '#1e293b',
                        fontFamily: el.fontFamily || 'inherit',
                        zIndex: el.zIndex,
                        width: el.width,
                        height: el.height,
                      }}
                    >
                      {el.type === 'text' ? (
                        <div dangerouslySetInnerHTML={{ __html: el.content }} />
                      ) : el.type === 'sticker' ? (
                        <span className="text-6xl">{el.content}</span>
                      ) : el.type === 'math' ? (
                        el.content ? <BlockMath math={el.content} /> : <span className="text-slate-400">∅</span>
                      ) : el.type === 'image' ? (
                        <img src={el.content} alt="" className="max-w-[220px] max-h-[180px] rounded-lg object-cover" style={{ width: el.width, height: el.height }} />
                      ) : null}
                    </div>
                  ))
                )}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  {activeFace === 'cover' ? 'Cover' : activeFace === 'front' ? 'Front' : 'Back'}
                </div>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-[#1a1d27] rounded-full shadow-xl flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareDeckModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        deckTitle={initialTitle} 
      />

      <ExportWizardModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExportAction={handleExportAction}
        isExporting={isExporting}
      />
    </>
  )
}

function DraggableElement({ element, isSelected, onSelect, onDragEnd, onChange, canvasRef, onContextMenu }: any) {
  const editableRef = useRef<HTMLDivElement>(null)
  const dragStarted = useRef(false)
  const [editing, setEditing] = useState(false)

  const handleBlur = useCallback(() => {
    if (editableRef.current && element.type === 'text') {
      const html = editableRef.current.innerHTML
      if (html !== element.content) {
        onChange(html)
      }
    }
    setEditing(false)
  }, [element.content, element.type, onChange])

  useEffect(() => {
    if (element.type === 'text' && editableRef.current && editing) {
      if (editableRef.current.innerHTML !== element.content) {
        editableRef.current.innerHTML = element.content
      }
    }
  }, [element.content, element.type, editing])

  const isText = element.type === 'text'

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={canvasRef}
      animate={{ x: element.x, y: element.y }}
      transition={{ type: 'tween', duration: 0 }}
      onDragStart={() => { dragStarted.current = true }}
      onDragEnd={(_, info) => {
        dragStarted.current = false
        onDragEnd(element.x + info.offset.x, element.y + info.offset.y)
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (!dragStarted.current) onSelect(e.shiftKey)
      }}
      onDoubleClick={() => { if (isText) setEditing(true) }}
      onContextMenu={onContextMenu}
      className={`absolute transition-shadow ${
        isText && !editing ? 'cursor-move' : 'cursor-default'
      } ${
        isSelected
          ? 'ring-2 ring-[#6366f1] ring-offset-2 ring-offset-white/60 rounded-md z-50 shadow-lg'
          : 'hover:ring-1 hover:ring-[#6366f1]/40 rounded-sm'
      }`}
      style={{ 
        zIndex: element.zIndex,
        color: element.color,
        fontSize: `${element.fontSize}px`,
        fontFamily: element.fontFamily || 'inherit'
      }}
    >
      {isText ? (
        <>
          <div
            ref={editableRef}
            contentEditable={editing}
            suppressContentEditableWarning
            onBlur={handleBlur}
            onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') (e.target as HTMLDivElement).blur()
            }}
            className={`outline-none min-w-[40px] min-h-[1em] text-center font-medium whitespace-pre-wrap break-words [&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-slate-400 ${
              !editing ? 'pointer-events-none select-none' : ''
            }`}
            data-placeholder="Type something..."
            style={{ lineHeight: '1.4' }}
          />
          {isSelected && (
            <div
              className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-white dark:bg-[#1a1d27] rounded-lg shadow-xl border border-slate-200 dark:border-[#2a2d3a] px-1.5 py-1 z-[100]"
              onMouseDown={(e) => e.preventDefault()}
              contentEditable={false}
            >
              {[
                { cmd: 'bold', label: 'B', active: false, className: 'font-bold text-sm' },
                { cmd: 'italic', label: 'I', active: false, className: 'italic text-sm' },
                { cmd: 'underline', label: 'U', active: false, className: 'underline text-sm' },
                { cmd: 'strikeThrough', label: 'S', active: false, className: 'line-through text-sm' },
              ].map(({ cmd, label, className }) => (
                <button
                  key={cmd}
                  onClick={() => document.execCommand(cmd)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#2a2d3a] hover:text-slate-900 dark:hover:text-white transition-colors ${className}`}
                >
                  {label}
                </button>
              ))}
              <div className="w-px h-5 bg-slate-200 dark:bg-[#2a2d3a] mx-1" />
              <button
                onClick={() => {
                  const sel = window.getSelection()
                  if (sel && sel.toString()) {
                    const span = document.createElement('span')
                    span.style.backgroundColor = '#fef08a'
                    span.style.color = '#1e293b'
                    try {
                      const range = sel.getRangeAt(0)
                      range.surroundContents(span)
                    } catch {}
                  }
                }}
                className="w-8 h-8 flex items-center justify-center rounded-md text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#2a2d3a] hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Highlight"
              >
                🖍️
              </button>
            </div>
          )}
        </>
      ) : element.type === 'sticker' ? (
        <div className="select-none leading-none drop-shadow-md">{element.content}</div>
      ) : element.type === 'math' ? (
        <div className="flex flex-col items-center gap-2">
          <div className="pointer-events-none select-none px-4 py-2 bg-white/50 dark:bg-black/20 rounded-xl backdrop-blur-sm min-w-[100px] min-h-[50px] flex items-center justify-center">
            {element.content ? (
              <BlockMath math={element.content} />
            ) : (
              <span className="text-slate-400 text-sm">Empty Equation</span>
            )}
          </div>
          {isSelected && (
            <div className="absolute top-full mt-2 w-64 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl p-3 z-50 cursor-auto" onClick={e => e.stopPropagation()}>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">LaTeX Editor</label>
              <textarea
                value={element.content}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. \frac{1}{2} x^2"
                autoFocus
              />
            </div>
          )}
        </div>
      ) : element.type === 'image' ? (
        <img
          src={element.content}
          alt="Flashcard image"
          className="max-w-[220px] max-h-[180px] rounded-xl shadow-md object-cover pointer-events-none"
          style={{ width: element.width || 200, height: element.height || 150 }}
          draggable={false}
        />
      ) : null}
    </motion.div>
  )
}

function SidebarTools({ activeTab, addElement, setBackground, onImageUpload, handleAskCoach, selectedEl, aiPrompt, setAiPrompt, aiLoading }: any) {
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const pickImage = () => fileRef.current?.click()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImg(true)
    try {
      await onImageUpload(file)
    } finally {
      setUploadingImg(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  if (activeTab === 'text') {
    return (
      <div className="space-y-4">
        <button onClick={() => addElement('text', 'Add a heading')} className="w-full p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl text-left font-black text-xl">
          Add a heading
        </button>
        <button onClick={() => addElement('text', 'Add a subheading')} className="w-full p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl text-left font-bold text-lg">
          Add a subheading
        </button>
        <button onClick={() => addElement('text', 'Add a little bit of body text')} className="w-full p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl text-left font-medium text-sm">
          Add a little bit of body text
        </button>
      </div>
    )
  }

  if (activeTab === 'shapes') {
    return (
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Basic Shapes</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => addElement('sticker', '⬛')} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex flex-col items-center gap-2 transition-colors">
            <div className="w-8 h-8 bg-slate-400 rounded-sm"></div>
            <span className="text-xs font-bold text-slate-500">Square</span>
          </button>
          <button onClick={() => addElement('sticker', '⬤')} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex flex-col items-center gap-2 transition-colors">
            <div className="w-8 h-8 bg-slate-400 rounded-full"></div>
            <span className="text-xs font-bold text-slate-500">Circle</span>
          </button>
          <button onClick={() => addElement('sticker', '▲')} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex flex-col items-center gap-2 transition-colors">
            <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-b-[28px] border-l-transparent border-r-transparent border-b-slate-400"></div>
            <span className="text-xs font-bold text-slate-500">Triangle</span>
          </button>
          <button onClick={() => addElement('sticker', '⭐')} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex flex-col items-center gap-2 transition-colors">
            <div className="text-3xl text-slate-400 leading-none">★</div>
            <span className="text-xs font-bold text-slate-500">Star</span>
          </button>
        </div>
      </div>
    )
  }

  if (activeTab === 'media') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Upload Images</h3>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <button
            onClick={pickImage}
            disabled={uploadingImg}
            className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all disabled:opacity-60"
          >
            {uploadingImg ? (
              <><Loader2 size={18} className="animate-spin" /> Uploading...</>
            ) : (
              <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Upload Image</>
            )}
          </button>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Stickers & Emojis</h3>
          <div className="grid grid-cols-4 gap-2">
            {STICKERS.map(sticker => (
              <button 
                key={sticker}
                onClick={() => addElement('sticker', sticker)}
                className="text-2xl hover:scale-125 transition-transform p-2 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center shadow-sm"
              >
                {sticker}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (activeTab === 'subjects') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Biology</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => addElement('sticker', '🧬')} className="p-2 text-xl bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm hover:scale-105 transition-transform flex flex-col items-center gap-1">
              🧬 <span className="text-[9px] font-bold uppercase text-slate-500">DNA</span>
            </button>
            <button onClick={() => addElement('sticker', '🦠')} className="p-2 text-xl bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm hover:scale-105 transition-transform flex flex-col items-center gap-1">
              🦠 <span className="text-[9px] font-bold uppercase text-slate-500">Cell</span>
            </button>
            <button onClick={() => addElement('sticker', '🫀')} className="p-2 text-xl bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm hover:scale-105 transition-transform flex flex-col items-center gap-1">
              🫀 <span className="text-[9px] font-bold uppercase text-slate-500">Organ</span>
            </button>
            <button onClick={() => addElement('sticker', '🌱')} className="p-2 text-xl bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm hover:scale-105 transition-transform flex flex-col items-center gap-1">
              🌱 <span className="text-[9px] font-bold uppercase text-slate-500">Botany</span>
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Physics & Chem</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => addElement('sticker', '🧲')} className="p-2 text-xl bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm hover:scale-105 transition-transform flex flex-col items-center gap-1">
              🧲 <span className="text-[9px] font-bold uppercase text-slate-500">Magnet</span>
            </button>
            <button onClick={() => addElement('sticker', '⚡')} className="p-2 text-xl bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm hover:scale-105 transition-transform flex flex-col items-center gap-1">
              ⚡ <span className="text-[9px] font-bold uppercase text-slate-500">Energy</span>
            </button>
            <button onClick={() => addElement('sticker', '🧪')} className="p-2 text-xl bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm hover:scale-105 transition-transform flex flex-col items-center gap-1">
              🧪 <span className="text-[9px] font-bold uppercase text-slate-500">Flask</span>
            </button>
            <button onClick={() => addElement('sticker', '⚛️')} className="p-2 text-xl bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm hover:scale-105 transition-transform flex flex-col items-center gap-1">
              ⚛️ <span className="text-[9px] font-bold uppercase text-slate-500">Atom</span>
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Geography</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => addElement('sticker', '🌍')} className="p-2 text-xl bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm hover:scale-105 transition-transform flex flex-col items-center gap-1">
              🌍 <span className="text-[9px] font-bold uppercase text-slate-500">Globe</span>
            </button>
            <button onClick={() => addElement('sticker', '⛰️')} className="p-2 text-xl bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm hover:scale-105 transition-transform flex flex-col items-center gap-1">
              ⛰️ <span className="text-[9px] font-bold uppercase text-slate-500">Relief</span>
            </button>
            <button onClick={() => addElement('sticker', '☀️')} className="p-2 text-xl bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm hover:scale-105 transition-transform flex flex-col items-center gap-1">
              ☀️ <span className="text-[9px] font-bold uppercase text-slate-500">Climate</span>
            </button>
            <button onClick={() => addElement('sticker', '🧭')} className="p-2 text-xl bg-slate-50 dark:bg-slate-800 rounded-lg shadow-sm hover:scale-105 transition-transform flex flex-col items-center gap-1">
              🧭 <span className="text-[9px] font-bold uppercase text-slate-500">Compass</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (activeTab === 'math') {
    return (
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Equation Templates</h3>
        <button onClick={() => addElement('math', 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}')} className="w-full p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl text-left font-mono text-sm overflow-hidden flex flex-col gap-2">
          <span className="text-[10px] uppercase font-black text-slate-500">Quadratic Formula</span>
          <BlockMath math="x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}" />
        </button>
        <button onClick={() => addElement('math', '\\int_{a}^{b} x^2 dx')} className="w-full p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl text-left font-mono text-sm overflow-hidden flex flex-col gap-2">
          <span className="text-[10px] uppercase font-black text-slate-500">Integral</span>
          <BlockMath math="\int_{a}^{b} x^2 dx" />
        </button>
        <button onClick={() => addElement('math', '\\ce{H2O ->[H+] H+ + OH-}')} className="w-full p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl text-left font-mono text-sm overflow-hidden flex flex-col gap-2">
          <span className="text-[10px] uppercase font-black text-slate-500">Chemistry (mhchem)</span>
          <BlockMath math="\ce{H2O ->[H+] H+ + OH-}" />
        </button>
        <button onClick={() => addElement('math', 'E = mc^2')} className="w-full p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl text-center font-black text-primary shadow-sm">
          + Add Blank Equation
        </button>
      </div>
    )
  }

  if (activeTab === 'templates') {
    return (
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Beautiful Backgrounds</h3>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map(theme => (
            <button 
              key={theme.id}
              onClick={() => setBackground(theme.bg, theme.font)}
              className={`h-20 rounded-xl border border-slate-200 shadow-sm flex items-end p-2 ${theme.bg} hover:ring-2 ring-primary transition-all overflow-hidden`}
            >
              <span className="text-[10px] font-bold bg-white/80 dark:bg-black/50 px-1.5 py-0.5 rounded text-slate-900 dark:text-white backdrop-blur-sm">
                {theme.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (activeTab === 'ai') {
    return (
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-500 mb-2 flex items-center gap-2">
          <Sparkles size={14} /> Peak AI Coach
        </h3>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/50 rounded-xl p-3 text-sm text-purple-900 dark:text-purple-300">
          <p className="mb-3 font-medium text-xs">How can I help you build this deck?</p>
          
          <button
            onClick={() => handleAskCoach('Generate 10 review questions for this subject with answers')}
            disabled={aiLoading}
            className="w-full text-left bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-purple-100 dark:border-purple-800 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 hover:border-purple-300 transition-colors disabled:opacity-50"
          >
            {aiLoading ? 'Thinking...' : 'Generate 10 review questions'}
          </button>
          
          <button
            onClick={() => handleAskCoach('Convert this text to LaTeX math notation: ' + (selectedEl?.type === 'math' ? selectedEl.content : 'E = mc^2'))}
            disabled={aiLoading}
            className="w-full text-left bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-purple-100 dark:border-purple-800 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 hover:border-purple-300 transition-colors disabled:opacity-50"
          >
            Format my raw text to LaTeX
          </button>

          <button
            onClick={() => handleAskCoach('Suggest a mnemonic device for this topic')}
            disabled={aiLoading}
            className="w-full text-left bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-purple-100 dark:border-purple-800 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-purple-300 transition-colors disabled:opacity-50"
          >
            Suggest a mnemonic device
          </button>
        </div>

        <div className="mt-4">
          <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Custom Prompt</label>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ask Peak Coach..."
            className="w-full h-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-purple-500 outline-none"
          />
          <button
            onClick={() => handleAskCoach(aiPrompt)}
            disabled={aiLoading || !aiPrompt.trim()}
            className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm py-2 rounded-xl transition-colors shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {aiLoading ? <><Loader2 size={16} className="animate-spin" /> Thinking...</> : <><Sparkles size={16} /> Ask Coach</>}
          </button>
        </div>
      </div>
    )
  }


  return (
    <div className="text-sm text-slate-500">
      Select an item from the left toolbar.
    </div>
  )
}

const FONTS = [
  { value: 'font-sans', label: 'Sans Serif' },
  { value: 'font-serif', label: 'Serif' },
  { value: 'font-mono', label: 'Monospace' },
  { value: 'font-[Outfit]', label: 'Outfit' },
  { value: 'font-[Comic_Neue]', label: 'Comic Neue' },
  { value: 'font-[Fredoka_One]', label: 'Fredoka' },
  { value: 'font-[Baloo_2]', label: 'Baloo' },
]

function PropertiesSidebar({ selectedElement, deleteElement, currentBackground, setBackground, onColorChange, onFontFamilyChange, onFontSizeChange }: any) {
  if (selectedElement) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Element Properties</h3>
          <button
            onClick={deleteElement}
            className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-2.5 py-1 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>

        {/* Color */}
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Text Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={selectedElement.color || '#1e293b'}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-lg"
            />
            <span className="text-xs font-mono font-bold text-slate-400">{selectedElement.color || '#1e293b'}</span>
          </div>
        </div>

        {/* Font Family */}
        {selectedElement.type === 'text' && (
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Font</label>
            <select
              value={selectedElement.fontFamily || 'font-sans'}
              onChange={(e) => onFontFamilyChange(e.target.value)}
              className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary"
            >
              {FONTS.map(f => (
                <option key={f.value} value={f.value} className={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Font Size */}
        {selectedElement.type === 'text' && (
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">
              Font Size: <span className="text-slate-700 dark:text-slate-300">{selectedElement.fontSize || 24}px</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onFontSizeChange(Math.max(8, (selectedElement.fontSize || 24) - 2))}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-lg transition-colors"
              >−</button>
              <input
                type="range"
                min="8"
                max="120"
                value={selectedElement.fontSize || 24}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none bg-slate-200 dark:bg-slate-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md cursor-pointer"
              />
              <button
                onClick={() => onFontSizeChange(Math.min(120, (selectedElement.fontSize || 24) + 2))}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-lg transition-colors"
              >+</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Card Background</h3>
        <div className="grid grid-cols-4 gap-2">
          {THEMES.map(theme => (
            <button 
              key={theme.id}
              onClick={() => setBackground(theme.bg, theme.font)}
              className={`w-full aspect-square rounded-full border-2 transition-transform hover:scale-110 ${theme.bg} ${currentBackground === theme.bg ? 'border-primary shadow-md' : 'border-slate-200'} overflow-hidden`}
              title={theme.name}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">Select an element on the canvas to see more properties.</p>
    </div>
  )
}

function ContextMenu({ x, y, elementId, onDuplicate, onDelete, onBringToFront, onSendToBack, onClose }: any) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      if (rect.right > window.innerWidth) {
        ref.current.style.left = `${window.innerWidth - rect.width - 8}px`
      }
      if (rect.bottom > window.innerHeight) {
        ref.current.style.top = `${window.innerHeight - rect.height - 8}px`
      }
    }
  }, [x, y])

  return (
    <div
      ref={ref}
      className="fixed z-[9999] w-48 bg-white dark:bg-[#1a1d27] rounded-xl shadow-2xl border border-[#e5e7eb] dark:border-[#2a2d3a] py-1.5 overflow-hidden"
      style={{ left: x, top: y }}
    >
      <button onClick={onDuplicate} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#374151] dark:text-[#d1d5db] hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] transition-colors text-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Duplicate
      </button>
      <button onClick={onBringToFront} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#374151] dark:text-[#d1d5db] hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] transition-colors text-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14 9 18 5 22 9"/><line x1="18" y1="5" x2="18" y2="15"/><rect x="2" y="13" width="12" height="8" rx="1"/></svg>
        Bring to Front
      </button>
      <button onClick={onSendToBack} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#374151] dark:text-[#d1d5db] hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] transition-colors text-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14 15 18 19 22 15"/><line x1="18" y1="19" x2="18" y2="9"/><rect x="2" y="4" width="12" height="8" rx="1"/></svg>
        Send to Back
      </button>
      <div className="h-px bg-[#e5e7eb] dark:bg-[#2a2d3a] my-1" />
      <button onClick={onDelete} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Delete
      </button>
    </div>
  )
}

function LayersPanel({ elements, selectedElementIds, selectedElementId, onSelect, onReorder }: any) {
  const sorted = [...elements].sort((a: any, b: any) => a.zIndex - b.zIndex)

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-3">
        {elements.length} {elements.length === 1 ? 'element' : 'elements'}
      </p>
      {sorted.length === 0 && (
        <p className="text-xs text-[#9ca3af]">No elements yet. Add something!</p>
      )}
      {sorted.map((el: any, idx: number) => {
        const isSel = selectedElementIds.has(el.id) || el.id === selectedElementId
        const label = el.type === 'text' ? (el.content?.slice(0, 24) || 'Text')
          : el.type === 'sticker' ? `${el.content} Sticker`
          : el.type === 'math' ? 'Equation'
          : el.type === 'image' ? 'Image'
          : 'Element'
        return (
          <button
            key={el.id}
            onClick={() => onSelect(el.id, false)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
              isSel
                ? 'bg-[#6366f1]/10 text-[#6366f1] ring-1 ring-[#6366f1]/30'
                : 'text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] hover:text-[#374151] dark:hover:text-[#d1d5db]'
            }`}
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[#f3f4f6] dark:bg-[#2a2d3a] text-[10px] font-bold text-[#9ca3af] shrink-0">
              {idx + 1}
            </div>
            <span className="text-xs font-medium truncate flex-1">{label}</span>
            <div className="flex gap-1">
              <span onClick={(e) => { e.stopPropagation(); onReorder(el.id, 'up') }} className="w-5 h-5 flex items-center justify-center rounded text-[#9ca3af] hover:text-[#374151] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] cursor-pointer">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 15l-6-6-6 6"/></svg>
              </span>
              <span onClick={(e) => { e.stopPropagation(); onReorder(el.id, 'down') }} className="w-5 h-5 flex items-center justify-center rounded text-[#9ca3af] hover:text-[#374151] dark:hover:text-white hover:bg-[#f3f4f6] dark:hover:bg-[#2a2d3a] cursor-pointer">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
