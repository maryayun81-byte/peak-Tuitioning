'use client'

import React, { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Type, Image as ImageIcon, LayoutTemplate, Shapes, BrainCircuit, 
  Palette, Library, ArrowLeft, MoreHorizontal, Settings, Redo, Undo, 
  Eye, Download, Share2, Plus, Move, Trash2, Maximize2, Save,
  Square, Circle, Triangle, Star, AlignLeft, AlignCenter, AlignRight, Sparkles, Calculator, Sigma, Loader2
} from 'lucide-react'
import FlashcardDesignerLayout from '@/components/creator-hub/designer/FlashcardDesignerLayout'
import 'katex/dist/katex.min.css'
import { BlockMath } from 'react-katex'
import { exportToPng, exportToPdf } from '@/lib/exportUtils'
import ShareDeckModal from '@/components/creator-hub/ShareDeckModal'
import ExportWizardModal from '@/components/creator-hub/designer/ExportWizardModal'

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

const STICKERS = ['🌸', '✨', '🎀', '🦋', '💖', '🧸', '🌈', '🍭', '🍓', '🦄', '⭐', '💯', '🔥', '📚', '🧪', '📐']

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

  const [activeTab, setActiveTab] = useState<'text' | 'media' | 'shapes' | 'templates' | 'ai' | 'math' | 'subjects'>('text')
  const [activeFace, setActiveFace] = useState<'cover' | 'front' | 'back'>('cover')
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleExportAction = async (action: string, options: any) => {
    if (!canvasRef.current) return
    setIsExporting(true)
    try {
      if (action === 'png_current') {
        await exportToPng(canvasRef.current, `${initialTitle.replace(/\s+/g, '_').toLowerCase()}_card.png`)
      } else if (action === 'pdf_cut') {
        await exportToPdf(canvasRef.current, canvasRef.current, initialTitle) // Will be updated to handle multi-card
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
      { id: 'cover-icon', type: 'text', content: initialIcon, x: 0, y: -40, fontSize: 64, zIndex: 1, color: '#1e293b' },
      { id: 'cover-title', type: 'text', content: initialTitle, x: 0, y: 30, fontSize: 40, zIndex: 1, color: '#1e293b' }
    ] 
  })
  
  const [cards, setCards] = useState<Flashcard[]>([{
    id: 'card-1',
    front: { background: THEMES[0].bg, font: THEMES[0].font, elements: [] },
    back: { background: THEMES[0].bg, font: THEMES[0].font, elements: [] }
  }])
  const [activeCardIndex, setActiveCardIndex] = useState(0)
  
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
    setCards(prev => prev.filter((_, i) => i !== index))
    setActiveCardIndex(prev => Math.min(prev, cards.length - 2))
  }

  const addElement = (type: CanvasElement['type'], content: string) => {
    const newElement: CanvasElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      x: 50,
      y: 50,
      fontSize: type === 'sticker' ? 64 : 24,
      color: '#1e293b', // slate-800
      zIndex: currentFace.elements.length + 1
    }
    setCurrentFace(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }))
    setSelectedElementId(newElement.id)
  }

  const updateElementPosition = (id: string, x: number, y: number) => {
    setCurrentFace(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, x, y } : el)
    }))
  }

  const updateElementContent = (id: string, content: string) => {
    setCurrentFace(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, content } : el)
    }))
  }

  const deleteElement = (id: string) => {
    setCurrentFace(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id)
    }))
    setSelectedElementId(null)
  }

  const setBackground = (bgClass: string, fontClass?: string) => {
    setCurrentFace(prev => ({ ...prev, background: bgClass, ...(fontClass && { font: fontClass }) }))
  }

  // Deselect when clicking canvas background
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedElementId(null)
    }
  }

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
        isExporting={isExporting}
        activeCardIndex={activeCardIndex}
        totalCards={cards.length}
        onNextCard={() => setActiveCardIndex(p => Math.min(cards.length - 1, p + 1))}
        onPrevCard={() => setActiveCardIndex(p => Math.max(0, p - 1))}
        onAddCard={addCard}
        onDeleteCard={() => deleteCard(activeCardIndex)}
        sidebarContent={
        <SidebarTools 
          activeTab={activeTab} 
          addElement={addElement} 
          setBackground={setBackground}
        />
      }
      propertiesContent={
        <PropertiesSidebar 
          selectedElement={currentFace.elements.find(e => e.id === selectedElementId)}
          deleteElement={() => selectedElementId && deleteElement(selectedElementId)}
          currentBackground={currentFace.background}
          setBackground={setBackground}
        />
      }
    >
      <div 
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`absolute inset-0 w-full h-full overflow-hidden ${currentFace.background} ${currentFace.font || ''} transition-colors duration-300`}
      >
        {currentFace.elements.map((el) => (
          <DraggableElement
            key={el.id}
            element={el}
            isSelected={selectedElementId === el.id}
            onSelect={() => setSelectedElementId(el.id)}
            onDragEnd={(x: number, y: number) => updateElementPosition(el.id, x, y)}
            onChange={(content: string) => updateElementContent(el.id, content)}
            canvasRef={canvasRef}
          />
        ))}
        
        {currentFace.elements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <p className="text-xl font-bold">Use the toolbar to add text or stickers!</p>
          </div>
        )}
      </div>
      </FlashcardDesignerLayout>

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

function DraggableElement({ element, isSelected, onSelect, onDragEnd, onChange, canvasRef }: any) {
  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={canvasRef}
      animate={{ x: element.x, y: element.y }}
      transition={{ type: 'tween', duration: 0 }} // Instant update when state changes
      onDragEnd={(_, info) => {
        onDragEnd(element.x + info.offset.x, element.y + info.offset.y)
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      className={`absolute cursor-move ${isSelected ? 'ring-2 ring-primary ring-offset-4 ring-offset-white/50 rounded-md z-50' : ''}`}
      style={{ 
        zIndex: element.zIndex,
        color: element.color,
        fontSize: `${element.fontSize}px`
      }}
    >
      {element.type === 'text' ? (
        <textarea
          value={element.content}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent outline-none resize-none overflow-visible text-center font-medium placeholder:text-slate-400"
          style={{ height: `${element.fontSize * 1.5}px`, minWidth: '100px' }}
          placeholder="Type something..."
          autoFocus={isSelected}
          onFocus={(e) => {
            const val = e.target.value;
            e.target.value = '';
            e.target.value = val;
          }}
        />
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
      ) : null}
    </motion.div>
  )
}

function SidebarTools({ activeTab, addElement, setBackground }: any) {
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
          
          <button className="w-full text-left bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-purple-100 dark:border-purple-800 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 hover:border-purple-300 transition-colors">
            Generate 10 review questions
          </button>
          
          <button className="w-full text-left bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-purple-100 dark:border-purple-800 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 hover:border-purple-300 transition-colors">
            Format my raw text to LaTeX
          </button>

          <button className="w-full text-left bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-purple-100 dark:border-purple-800 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-purple-300 transition-colors">
            Suggest a mnemonic device
          </button>
        </div>

        <div className="mt-4">
          <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Custom Prompt</label>
          <textarea 
            placeholder="Ask Peak Coach..."
            className="w-full h-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-purple-500 outline-none"
          />
          <button className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm py-2 rounded-xl transition-colors shadow-md shadow-purple-500/20 flex items-center justify-center gap-2">
            <Sparkles size={16} /> Ask Coach
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

function PropertiesSidebar({ selectedElement, deleteElement, currentBackground, setBackground }: any) {
  if (selectedElement) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Element Properties</h3>
          <button 
            onClick={deleteElement}
            className="w-full flex items-center justify-center gap-2 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg font-bold text-sm transition-colors"
          >
            Delete Element
          </button>
        </div>
        
        {selectedElement.type === 'text' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Font Size</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium bg-slate-100 px-3 py-1 rounded-md">{selectedElement.fontSize}px</span>
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
