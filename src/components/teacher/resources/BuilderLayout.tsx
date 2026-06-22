'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, Save, Download, Eye, Loader2, Share2 } from 'lucide-react'
import { ExportEngineModal } from './ExportEngineModal'
import { ShareResourceModal } from './ShareResourceModal'

interface BuilderLayoutProps {
  title: string
  subtitle: string
  backHref: string
  isSaving: boolean
  onSave: () => void
  onExport?: () => void
  exportData?: any // Add export data to pass down
  resourceSections?: string[]
  children: React.ReactNode
}

export function BuilderLayout({
  title,
  subtitle,
  backHref,
  isSaving,
  onSave,
  exportData,
  resourceSections,
  children
}: BuilderLayoutProps) {
  const [exportOpen, setExportOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const pathname = usePathname()
  const isStudentViewer = pathname.includes('/student/resources/viewer')

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden">
        {/* Builder Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-20 shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <Link href={isStudentViewer ? '/student/resources' : backHref} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <h1 className="font-black text-slate-900 dark:text-white text-lg leading-tight">{title}</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{subtitle}</p>
            </div>
          </div>

          {!isStudentViewer && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => alert('Preview mode coming soon')} 
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Eye size={16} /> Preview
              </button>

              <button 
                onClick={() => setExportOpen(true)} 
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Download size={16} /> Export
              </button>

              <button 
                onClick={() => setShareOpen(true)} 
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
              >
                <Share2 size={16} /> Share
              </button>
              
              <button 
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                {isSaving ? 'Saving...' : 'Save Resource'}
              </button>
            </div>
          )}
        </header>

        {/* Main Canvas Area */}
        <main className={`flex-1 relative overflow-hidden flex ${isStudentViewer ? 'student-viewer-mode pointer-events-none-inputs' : ''}`}>
          <style dangerouslySetInnerHTML={{__html: `
            .student-viewer-mode input, .student-viewer-mode textarea, .student-viewer-mode select { pointer-events: none; }
            .student-viewer-mode button:not(nav button):not(.allow-student-click) { display: none; }
            .student-viewer-mode .react-flow__controls, .student-viewer-mode .react-flow__panel { display: none; }
            .student-viewer-mode .border-rose-200 { border-color: transparent !important; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
          `}} />
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <ExportEngineModal 
        isOpen={exportOpen} 
        onClose={() => setExportOpen(false)} 
        resourceTitle={title} 
        exportData={exportData}
      />
      <ShareResourceModal 
        isOpen={shareOpen} 
        onClose={() => setShareOpen(false)} 
        resourceTitle={title}
        resourceSections={resourceSections}
      />
    </>
  )
}
