'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Swords, Users, Trophy, Brain, Target, ScrollText, Zap, Medal, Calendar, AlignJustify } from 'lucide-react'
import type { DuelType } from '@/types/duels'
import { DUEL_TYPE_LABELS, DUEL_TYPE_DESCRIPTIONS } from '@/types/duels'

const ICONS: Record<DuelType, React.ReactNode> = {
  quick: <Zap size={24} />,
  friend: <Users size={24} />,
  coach: <Brain size={24} />,
  team: <Users size={24} />,
  classwar: <Swords size={24} />,
  teacher: <Target size={24} />,
  boss: <Trophy size={24} />,
  tournament: <Medal size={24} />,
  daily: <Calendar size={24} />,
  weekly: <AlignJustify size={24} />,
}

interface Props {
  onSelect: (type: DuelType) => void
  onClose: () => void
}

export function DuelTypeSelector({ onSelect, onClose }: Props) {
  const types: DuelType[] = ['quick', 'friend', 'coach', 'team', 'classwar', 'teacher', 'boss', 'tournament', 'daily', 'weekly']

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6"
        style={{ background: 'var(--card)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>Choose Duel Type</h2>
          <button onClick={onClose} className="text-sm opacity-50 hover:opacity-100" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {types.map((type) => (
            <motion.button
              key={type}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(type)}
              className="relative p-4 rounded-2xl border-2 text-left transition-all group hover:border-primary"
              style={{ borderColor: 'var(--card-border)', background: 'var(--input)' }}
            >
              <div className="text-2xl mb-2" style={{ color: 'var(--primary)' }}>{ICONS[type]}</div>
              <div className="text-xs font-black mb-1" style={{ color: 'var(--text)' }}>{DUEL_TYPE_LABELS[type]}</div>
              <div className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>{DUEL_TYPE_DESCRIPTIONS[type]}</div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
