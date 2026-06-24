'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Star, Trophy } from 'lucide-react'
import type { HallOfFameEntry } from '@/types/duels'
import { getHallOfFame } from '@/app/actions/duels'

export function HallOfFame() {
  const [data, setData] = useState<HallOfFameEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState<string>()

  useEffect(() => {
    getHallOfFame(season).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [season])

  const top3Medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Crown size={16} style={{ color: '#F59E0B' }} /> Hall of Fame
        </h3>
        <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
          Season: {season || 'Current'}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-1">
          {data.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-2.5 rounded-xl"
              style={{ background: i < 3 ? 'rgba(245,158,11,0.08)' : 'var(--input)' }}
            >
              <span className="w-8 text-center text-sm">{i < 3 ? top3Medals[i] : `#${entry.rank}`}</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>
                {entry.student?.full_name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{entry.student?.full_name || 'Unknown'}</div>
                <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  {entry.total_wins} wins · {entry.win_rate}% WR
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Star size={12} style={{ color: '#F59E0B' }} />
                <span className="text-xs font-black" style={{ color: '#F59E0B' }}>{entry.total_points}</span>
              </div>
            </motion.div>
          ))}
          {data.length === 0 && (
            <div className="text-center py-8 text-xs" style={{ color: 'var(--text-muted)' }}>
              No hall of fame entries yet. Compete in weekly championships!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
