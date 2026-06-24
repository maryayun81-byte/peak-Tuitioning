'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Frown, TrendingUp, Target, Clock, Zap } from 'lucide-react'
import type { Duel, DuelParticipantWithStudent } from '@/types/duels'
import { getRankColor, getRank } from '@/types/duels'

interface Props {
  duel: Duel
  participants: DuelParticipantWithStudent[]
  myStudentId: string
  onReturn: () => void
  onRematch?: () => void
}

export function DuelResult({ duel, participants, myStudentId, onReturn, onRematch }: Props) {
  const me = participants.find(p => p.student_id === myStudentId)
  const opponent = participants.find(p => p.student_id !== myStudentId)

  if (!me || !opponent) return null

  const isWin = me.score > opponent.score
  const isDraw = me.score === opponent.score
  const accuracy = me.answer_history?.length
    ? Math.round((me.answer_history.filter(a => a.is_correct).length / me.answer_history.length) * 100)
    : 0
  const avgTime = me.answer_history?.length
    ? Math.round(me.answer_history.reduce((s, a) => s + a.time_spent, 0) / me.answer_history.length)
    : 0
  const maxStreak = me.max_streak || 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center p-8 gap-6 min-h-[60vh]"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        {isWin ? (
          <Trophy size={80} style={{ color: '#F59E0B' }} />
        ) : isDraw ? (
          <Medal size={80} style={{ color: '#94A3B8' }} />
        ) : (
          <Frown size={80} style={{ color: '#EF4444' }} />
        )}
      </motion.div>

      {/* Result text */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <h2 className="text-2xl font-black mb-1" style={{ color: isWin ? '#10B981' : isDraw ? '#F59E0B' : '#EF4444' }}>
          {isWin ? 'Victory!' : isDraw ? 'Draw!' : 'Defeat'}
        </h2>
        <p style={{ color: 'var(--text-muted)' }} className="text-sm">
          {isWin ? 'Excellent performance!' : isDraw ? 'A hard-fought battle!' : 'Keep practicing!'}
        </p>
      </motion.div>

      {/* Scores */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-8 p-6 rounded-2xl border w-full max-w-sm justify-center"
        style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
      >
        <div className="text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <span className="text-lg font-black text-emerald-500">{me.score}</span>
          </div>
          <div className="text-[10px] font-black uppercase" style={{ color: 'var(--text-muted)' }}>You</div>
        </div>
        <div className="text-2xl font-black opacity-30" style={{ color: 'var(--text-muted)' }}>VS</div>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <span className="text-lg font-black text-red-500">{opponent.score}</span>
          </div>
          <div className="text-[10px] font-black uppercase truncate max-w-[80px]" style={{ color: 'var(--text-muted)' }}>
            {opponent.student?.full_name?.split(' ')[0] || 'AI'}
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-3 gap-3 w-full max-w-sm"
      >
        <div className="p-3 rounded-xl text-center" style={{ background: 'var(--input)' }}>
          <Target size={16} className="mx-auto mb-1" style={{ color: 'var(--primary)' }} />
          <div className="text-sm font-black" style={{ color: 'var(--text)' }}>{accuracy}%</div>
          <div className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Accuracy</div>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: 'var(--input)' }}>
          <Clock size={16} className="mx-auto mb-1" style={{ color: '#F59E0B' }} />
          <div className="text-sm font-black" style={{ color: 'var(--text)' }}>{avgTime}s</div>
          <div className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Avg Time</div>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: 'var(--input)' }}>
          <Zap size={16} className="mx-auto mb-1" style={{ color: '#8B5CF6' }} />
          <div className="text-sm font-black" style={{ color: 'var(--text)' }}>{maxStreak}</div>
          <div className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Best Streak</div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="flex gap-3 w-full max-w-sm"
      >
        {onRematch && (
          <button
            onClick={onRematch}
            className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            style={{ background: 'var(--primary)', color: 'white' }}
          >
            <Zap size={14} className="inline mr-1" /> Rematch
          </button>
        )}
        <button
          onClick={onReturn}
          className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:opacity-70"
          style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
        >
          Return to Lobby
        </button>
      </motion.div>
    </motion.div>
  )
}
