'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Medal, TrendingUp, Award } from 'lucide-react'
import type { DuelLeaderboardEntry } from '@/types/duels'
import { getRankColor, getRank } from '@/types/duels'
import { getDuelLeaderboard } from '@/app/actions/duels'

export function DuelLeaderboard() {
  const [data, setData] = useState<DuelLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDuelLeaderboard(100).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const top3 = data.slice(0, 3)
  const rest = data.slice(3)

  const rankIcons = [<Crown size={18} style={{ color: '#F59E0B' }} />, <Medal size={18} style={{ color: '#94A3B8' }} />, <Medal size={18} style={{ color: '#CD7F32' }} />]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Award size={18} style={{ color: 'var(--primary)' }} />
        <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>Duel Leaderboard</h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="flex items-end justify-center gap-3 mb-4">
            {[1, 0, 2].map(i => {
              const entry = top3[i]
              if (!entry) return <div key={i} className="w-20" />
              const heights = ['h-24', 'h-28', 'h-20']
              return (
                <div key={entry.student_id} className="flex flex-col items-center gap-1">
                  <div className="text-lg">{rankIcons[i]}</div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>
                    {entry.full_name[0]}
                  </div>
                  <div className="text-[10px] font-black truncate max-w-[80px]" style={{ color: 'var(--text)' }}>{entry.full_name.split(' ')[0]}</div>
                  <div className={`${heights[i]} w-16 rounded-t-xl flex items-center justify-center text-white text-xs font-black`}
                    style={{ background: getRankColor(entry.duel_rating) }}>
                    {entry.duel_rating}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Full list */}
          <div className="space-y-1">
            {rest.map((entry, i) => (
              <motion.div
                key={entry.student_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: 'var(--input)' }}
              >
                <span className="w-6 text-center text-[10px] font-black" style={{ color: 'var(--text-muted)' }}>{i + 4}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                  style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>
                  {entry.full_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{entry.full_name}</div>
                  <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{entry.class_name || ''} · {entry.win_rate}% WR</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black" style={{ color: getRankColor(entry.duel_rating) }}>{entry.duel_rating}</span>
                  <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>{getRank(entry.duel_rating)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
