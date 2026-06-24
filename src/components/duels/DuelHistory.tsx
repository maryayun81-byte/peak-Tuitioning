'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, TrendingUp, Trophy, Frown } from 'lucide-react'
import type { DuelResultRow } from '@/types/duels'
import { getDuelHistory, getStudentDuelStats } from '@/app/actions/duels'
import type { DuelStats } from '@/types/duels'

export function DuelHistory() {
  const [history, setHistory] = useState<DuelResultRow[]>([])
  const [stats, setStats] = useState<DuelStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDuelHistory(), getStudentDuelStats()]).then(([h, s]) => {
      setHistory(h)
      setStats(s)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
        <Clock size={16} /> Duel History
      </h3>

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Total', value: stats.total_duels, color: 'var(--text)' },
                { label: 'Wins', value: stats.wins, color: '#10B981' },
                { label: 'Win Rate', value: `${stats.win_rate}%`, color: 'var(--primary)' },
                { label: 'Rating', value: stats.rating, color: '#F59E0B' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--input)' }}>
                  <div className="text-sm font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {history.map((h, i) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: 'var(--input)' }}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${h.result === 'win' ? 'bg-emerald-500/20' : h.result === 'loss' ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                  {h.result === 'win' ? <Trophy size={12} className="text-emerald-500" /> : h.result === 'loss' ? <Frown size={12} className="text-red-500" /> : <span className="text-[10px]">=</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold truncate" style={{ color: 'var(--text)' }}>
                    vs {h.opponent?.full_name || 'Unknown'}
                  </div>
                  <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                    +{h.xp_awarded} XP · {h.score}-{h.opponent_score}
                  </div>
                </div>
                <div className="text-[9px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {h.created_at?.slice(0, 10)}
                </div>
              </motion.div>
            ))}
            {history.length === 0 && (
              <div className="text-center py-8 text-xs" style={{ color: 'var(--text-muted)' }}>
                No duels played yet. Start your first duel!
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
