'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Flame, Snowflake, TrendingUp } from 'lucide-react'
import type { DuelStreak } from '@/types/houses'
import { getMyStreak } from '@/app/actions/houses'

export function StreakDisplay() {
  const [streak, setStreak] = useState<DuelStreak | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyStreak().then(s => {
      setStreak(s)
      setLoading(false)
    })
  }, [])

  if (loading || !streak) return null

  const streakLevel = streak.current >= 30 ? 'legendary' : streak.current >= 14 ? 'epic' : streak.current >= 7 ? 'rare' : streak.current >= 3 ? 'common' : 'none'
  const streakColors = {
    legendary: { from: '#EF4444', to: '#F59E0B', shadow: 'rgba(239,68,68,0.4)' },
    epic: { from: '#8B5CF6', to: '#6366F1', shadow: 'rgba(139,92,246,0.4)' },
    rare: { from: '#06B6D4', to: '#0891B2', shadow: 'rgba(6,182,212,0.4)' },
    common: { from: '#F59E0B', to: '#D97706', shadow: 'rgba(245,158,11,0.3)' },
    none: { from: '#64748B', to: '#475569', shadow: 'rgba(100,116,139,0.2)' },
  }
  const sc = streakColors[streakLevel]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-3 rounded-2xl border overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${sc.from}15, transparent)`,
        borderColor: `${sc.from}30`,
      }}
    >
      {/* Fire glow */}
      {streak.current > 0 && (
        <motion.div
          className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${sc.from} 0%, transparent 70%)` }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
      )}

      <div className="relative flex items-center gap-3">
        {/* Streak icon */}
        <motion.div
          animate={streak.current > 0 ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2, delay: 1 }}
          className="relative"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: streak.current > 0 ? `linear-gradient(135deg, ${sc.from}, ${sc.to})` : 'var(--input)',
              boxShadow: streak.current > 0 ? `0 0 20px ${sc.shadow}` : 'none',
            }}>
            <Flame size={22} color="white" />
          </div>
          {/* Streak number badge */}
          {streak.current > 0 && (
            <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-black text-white px-1"
              style={{ background: sc.from }}>
              {streak.current}
            </div>
          )}
        </motion.div>

        {/* Streak info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black" style={{ color: streak.current > 0 ? sc.from : 'var(--text-muted)' }}>
              {streak.current > 0 ? `${streak.current}-Day Streak` : 'Start a Streak'}
            </span>
            {streakLevel !== 'none' && streakLevel !== 'common' && (
              <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                style={{ background: `${sc.from}20`, color: sc.from }}>
                {streakLevel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
              Best: {streak.longest} days
            </span>
            {streak.freezesAvailable > 0 && (
              <span className="flex items-center gap-0.5 text-[9px]" style={{ color: '#06B6D4' }}>
                <Snowflake size={10} /> {streak.freezesAvailable} freeze{streak.freezesAvailable > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* XP multiplier indicator */}
        {streak.current >= 3 && (
          <div className="text-right">
            <div className="text-xs font-black" style={{ color: sc.from }}>
              {streak.current >= 30 ? '5x' : streak.current >= 14 ? '3x' : streak.current >= 7 ? '2x' : '1.5x'}
            </div>
            <div className="text-[7px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>XP Boost</div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
