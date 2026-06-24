'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, X, Zap } from 'lucide-react'

interface Props {
  searching: boolean
  onCancel: () => void
}

export function MatchmakingModal({ searching, onCancel }: Props) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (!searching) return
    const interval = setInterval(() => setDots(p => p.length >= 3 ? '' : p + '.'), 500)
    return () => clearInterval(interval)
  }, [searching])

  if (!searching) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="rounded-3xl p-8 text-center max-w-sm w-full mx-4"
        style={{ background: 'var(--card)' }}
      >
        <div className="relative w-20 h-20 mx-auto mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Search size={28} style={{ color: 'var(--primary)' }} />
          </div>
        </div>

        <h3 className="text-lg font-black mb-2" style={{ color: 'var(--text)' }}>Finding Opponent{dots}</h3>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          Searching for a student of similar skill level...
        </p>

        <motion.div className="flex gap-2 justify-center mb-6" animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <Zap size={16} style={{ color: '#F59E0B' }} />
          <Zap size={16} style={{ color: '#10B981' }} />
          <Zap size={16} style={{ color: '#3B82F6' }} />
        </motion.div>

        <button
          onClick={onCancel}
          className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:opacity-70"
          style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
        >
          <X size={14} className="inline mr-1" /> Cancel
        </button>
      </motion.div>
    </motion.div>
  )
}
