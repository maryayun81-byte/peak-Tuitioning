import React from 'react'
import { motion } from 'framer-motion'
import { RefreshCcw, ThumbsUp, PartyPopper } from 'lucide-react'

interface StudyControlsProps {
  onScore: (score: 1 | 3 | 5) => void
  disabled?: boolean
}

export default function StudyControls({ onScore, disabled }: StudyControlsProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center items-center gap-4 mt-8"
    >
      <button
        disabled={disabled}
        onClick={() => onScore(1)}
        className="group relative flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-rose-900/30 hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none"
      >
        <div className="absolute -top-3 bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
          &lt; 1 min
        </div>
        <RefreshCcw size={28} className="text-rose-500 mb-2 group-hover:-rotate-180 transition-transform duration-500" />
        <span className="font-bold text-slate-700 dark:text-slate-200">Hard</span>
      </button>

      <button
        disabled={disabled}
        onClick={() => onScore(3)}
        className="group relative flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-100 dark:border-amber-900/30 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none"
      >
        <div className="absolute -top-3 bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
          10 min
        </div>
        <ThumbsUp size={28} className="text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
        <span className="font-bold text-slate-700 dark:text-slate-200">Good</span>
      </button>

      <button
        disabled={disabled}
        onClick={() => onScore(5)}
        className="group relative flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none"
      >
        <div className="absolute -top-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
          1 day
        </div>
        <PartyPopper size={28} className="text-emerald-500 mb-2 group-hover:rotate-12 transition-transform" />
        <span className="font-bold text-slate-700 dark:text-slate-200">Easy</span>
      </button>
    </motion.div>
  )
}
