'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EMOJIS } from '@/types/duels'
import type { EmojiReaction } from '@/types/duels'

interface Props {
  duelId: string
  onReact: (emoji: string) => void
  reactions: Array<{ emoji: string; student_id: string; student?: { full_name: string; avatar_url?: string } }>
  myStudentId?: string
}

export function ReactionBar({ duelId, onReact, reactions, myStudentId }: Props) {
  const recentReactions = reactions.slice(-8)

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {EMOJIS.map(emoji => (
          <motion.button
            key={emoji}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.8 }}
            onClick={() => onReact(emoji)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-sm hover:bg-white/10 transition-colors"
          >
            {emoji}
          </motion.button>
        ))}
      </div>
      <div className="flex gap-1 ml-2">
        <AnimatePresence>
          {recentReactions.map((r, i) => (
            <motion.span
              key={`${r.student_id}-${r.emoji}-${i}`}
              initial={{ opacity: 0, y: 10, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-lg"
              title={r.student?.full_name}
            >
              {r.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
