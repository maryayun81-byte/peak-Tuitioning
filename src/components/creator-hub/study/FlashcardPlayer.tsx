import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CardContent {
  id: string
  frontHtml: React.ReactNode
  backHtml: React.ReactNode
  themeClass?: string
}

interface FlashcardPlayerProps {
  card: CardContent
  onFlip: () => void
  isFlipped: boolean
}

export default function FlashcardPlayer({ card, onFlip, isFlipped }: FlashcardPlayerProps) {
  return (
    <div className="relative w-full max-w-2xl aspect-[4/3] [perspective:1000px] mx-auto cursor-pointer group" onClick={onFlip}>
      <motion.div
        className="w-full h-full relative [transform-style:preserve-3d] transition-all duration-500 ease-out"
        initial={false}
        animate={{ rotateX: isFlipped ? 180 : 0 }}
      >
        {/* Front Face */}
        <div 
          className={`absolute inset-0 [backface-visibility:hidden] rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col justify-center items-center ${card.themeClass || 'bg-white dark:bg-slate-900'}`}
        >
          <div className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wider text-slate-400 bg-white/50 dark:bg-black/20 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
            Question
          </div>
          {card.frontHtml}
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-sm font-medium text-slate-500 bg-white/80 dark:bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm pointer-events-none">
              Click to reveal answer
            </span>
          </div>
        </div>

        {/* Back Face */}
        <div 
          className={`absolute inset-0 [backface-visibility:hidden] rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col justify-center items-center ${card.themeClass || 'bg-white dark:bg-slate-900'}`}
          style={{ transform: 'rotateX(180deg)' }}
        >
          <div className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
            Answer
          </div>
          {card.backHtml}
        </div>
      </motion.div>
    </div>
  )
}
