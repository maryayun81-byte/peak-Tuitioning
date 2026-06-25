'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { SeasonTheme } from '@/lib/seasonal-theme'

interface Props {
  theme: SeasonTheme
}

export function MotivationMessage({ theme }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-4 rounded-2xl border overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.accentDim}, transparent)`,
        borderColor: `${theme.accent}20`,
      }}
    >
      {/* Accent line */}
      <div
        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
        style={{ background: theme.accent }}
      />

      <div className="relative flex items-start gap-3 ml-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
          style={{ background: theme.accentDim }}
        >
          {theme.messageIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={12} style={{ color: theme.accent }} />
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: theme.accent }}>
              Peak Coach
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {theme.message}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
