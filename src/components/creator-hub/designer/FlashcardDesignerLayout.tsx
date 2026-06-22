import React, { useState } from 'react'
import { 
  Type, ImageIcon, Square, Layers, Sparkles, LayoutTemplate, 
  Settings, Save, Undo, Redo, Download, Share2, Eye, LayoutGrid, 
  ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeft, Sigma, Library
} from 'lucide-react'
import Link from 'next/link'

import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'

interface DesignerLayoutProps {
  title?: string
  children: React.ReactNode
  activeTab: 'text' | 'media' | 'shapes' | 'templates' | 'ai' | 'math' | 'subjects'
  setActiveTab: (tab: 'text' | 'media' | 'shapes' | 'templates' | 'ai' | 'math' | 'subjects') => void
  activeFace: 'cover' | 'front' | 'back'
  setActiveFace: (activeFace: 'cover' | 'front' | 'back') => void
  sidebarContent: React.ReactNode
  propertiesContent: React.ReactNode
  onShare?: () => void
  onExport?: () => void
  isExporting?: boolean
  activeCardIndex?: number
  totalCards?: number
  onNextCard?: () => void
  onPrevCard?: () => void
  onAddCard?: () => void
  onDeleteCard?: () => void
}

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
  isExporting = false,
  activeCardIndex = 0,
  totalCards = 1,
  onNextCard,
  onPrevCard,
  onAddCard,
  onDeleteCard
}: DesignerLayoutProps) {
  return (
    <div className="flex flex-col h-[100dvh] bg-slate-100 dark:bg-slate-950 font-sans overflow-hidden">
      
      {/* Top Action Bar */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/student/flashcards" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <h1 className="font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[300px]">{title}</h1>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md">Auto-saved</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 mr-4">
            <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><Undo size={18} /></button>
            <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><Redo size={18} /></button>
          </div>
          
          <button onClick={() => alert('Preview mode will be implemented in Phase 7!')} className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <Eye size={16} /> Preview
          </button>
          <button onClick={onShare} className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <Share2 size={16} /> Share
          </button>

          <button onClick={onExport} disabled={isExporting} className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 hidden sm:flex">
            <Download size={16} /> {isExporting ? 'Exporting...' : 'Export'}
          </button>

          <button onClick={() => alert('Deck saved successfully!')} className="flex items-center gap-2 px-4 py-1.5 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm transition-colors">
            <Save size={16} /> Save
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Tools Sidebar */}
        <aside className="w-16 sm:w-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-4 gap-2 z-10 shrink-0 overflow-y-auto">
          <ToolButton icon={<Type size={20} />} label="Text" active={activeTab === 'text'} onClick={() => setActiveTab('text')} />
          <ToolButton icon={<ImageIcon size={20} />} label="Media" active={activeTab === 'media'} onClick={() => setActiveTab('media')} />
          <ToolButton icon={<Square size={20} />} label="Shapes" active={activeTab === 'shapes'} onClick={() => setActiveTab('shapes')} />
          <ToolButton icon={<Sigma size={20} />} label="Math" active={activeTab === 'math'} onClick={() => setActiveTab('math')} />
          <ToolButton icon={<Library size={20} />} label="Subjects" active={activeTab === 'subjects'} onClick={() => setActiveTab('subjects')} />
          <ToolButton icon={<LayoutTemplate size={20} />} label="Templates" active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} />
          <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 my-2" />
          <ToolButton icon={<Sparkles size={20} />} label="AI Coach" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} className="text-purple-500 hover:text-purple-600 dark:text-purple-400" />
        </aside>

        {/* Tool Settings Panel (Slide-out) */}
        <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-0 flex flex-col overflow-hidden shrink-0 hidden md:flex">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white capitalize">{activeTab} Tools</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {sidebarContent}
          </div>
        </div>

        {/* Center Canvas Area */}
        <main className="flex-1 relative flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
          {/* View toggle (Cover/Front/Back) */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 p-1 z-10">
            <button 
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${activeFace === 'cover' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              onClick={() => setActiveFace('cover')}
            >
              Cover
            </button>
            <button 
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${activeFace === 'front' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              onClick={() => setActiveFace('front')}
            >
              Front
            </button>
            <button 
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${activeFace === 'back' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              onClick={() => setActiveFace('back')}
            >
              Back
            </button>
          </div>

          {/* Actual Canvas */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-8">
            <div className="w-full max-w-2xl aspect-[4/3] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 relative group overflow-hidden">
              {children}
            </div>
          </div>

          {/* Bottom Card Navigation */}
          <div className="h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"><LayoutGrid size={18} /></button>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={onPrevCard}
                disabled={activeCardIndex === 0}
                className="p-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Card {activeCardIndex + 1} <span className="text-slate-400 font-medium">of {totalCards}</span>
              </span>
              <button 
                onClick={onNextCard}
                disabled={activeCardIndex === totalCards - 1}
                className="p-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={onDeleteCard}
                disabled={totalCards <= 1}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
              >
                <Trash2 size={18} />
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
              <button 
                onClick={onAddCard}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Plus size={16} /> Add Card
              </button>
            </div>
          </div>
        </main>

        {/* Right Settings Sidebar (Properties) */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 hidden lg:flex overflow-y-auto">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">Properties</h2>
            <Settings size={16} className="text-slate-400" />
          </div>
          <div className="p-4 flex-1">
            {propertiesContent}
          </div>
        </aside>

      </div>
    </div>
  )
}

function ToolButton({ icon, label, active, onClick, className = '' }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-xl transition-all ${
        active 
        ? 'bg-primary/10 text-primary shadow-sm' 
        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
      } ${className}`}
    >
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  )
}
