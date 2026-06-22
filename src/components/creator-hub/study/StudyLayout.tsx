import React from 'react'
import { X, Trophy, Clock, Target } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface StudyLayoutProps {
  title: string
  progress: number // 0 to 100
  xp: number
  timeSpentStr: string
  accuracy: number // 0 to 100
  children: React.ReactNode
  onExit?: () => void
}

export default function StudyLayout({ title, progress, xp, timeSpentStr, accuracy, children, onExit }: StudyLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0B0F1A]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            <Link href="/student/flashcards" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500" onClick={onExit}>
              <X size={20} />
            </Link>
            <h1 className="font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">{title}</h1>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold text-sm">
              <Clock size={16} className="text-slate-400" /> {timeSpentStr}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold text-sm">
              <Target size={16} className="text-primary" /> {accuracy}%
            </div>
            <div className="flex items-center gap-1.5 text-amber-500 font-black text-sm bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full shadow-sm">
              <Trophy size={16} /> {xp} XP
            </div>
          </div>

        </div>
        
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeInOut", duration: 0.3 }}
          />
        </div>
      </header>

      {/* Main Study Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        {/* Subtle background grid for focus */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="relative z-10 w-full max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  )
}
