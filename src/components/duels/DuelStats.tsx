'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, BarChart3, Target, Clock, Zap, Award } from 'lucide-react'
import { getDuelAnalytics } from '@/app/actions/duels'

export function DuelStats() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDuelAnalytics().then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
        <BarChart3 size={16} /> Performance Analytics
      </h3>

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : !data ? (
        <div className="text-center py-8 text-xs" style={{ color: 'var(--text-muted)' }}>No data yet. Play some duels!</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total Duels', value: data.total, icon: <Zap size={14} />, color: 'var(--primary)' },
              { label: 'Win Rate', value: data.total > 0 ? `${Math.round((data.wins / data.total) * 100)}%` : '0%', icon: <Target size={14} />, color: '#10B981' },
              { label: 'Avg Score', value: data.avgScore, icon: <Award size={14} />, color: '#F59E0B' },
              { label: 'Best Score', value: data.bestScore, icon: <Trophy size={14} />, color: '#8B5CF6' },
              { label: 'Total XP', value: data.totalXp, icon: <TrendingUp size={14} />, color: '#3B82F6' },
              { label: 'W/L/D', value: `${data.wins}/${data.losses}/${data.draws}`, icon: <BarChart3 size={14} />, color: '#EC4899' },
            ].map(s => (
              <div key={s.label} className="p-2.5 rounded-xl text-center" style={{ background: 'var(--input)' }}>
                <div style={{ color: s.color }} className="mb-0.5">{s.icon}</div>
                <div className="text-sm font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[8px] font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Mini chart - recent results */}
          <div className="p-3 rounded-xl" style={{ background: 'var(--input)' }}>
            <div className="text-[10px] font-black mb-2" style={{ color: 'var(--text-muted)' }}>Recent Results</div>
            <div className="flex gap-1 items-end h-12">
              {data.recentResults?.slice(-10).map((r: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${(r.score / (data.bestScore || 1)) * 100}%` }}
                  className="flex-1 rounded-t-sm"
                  style={{
                    background: r.result === 'win' ? '#10B981' : r.result === 'loss' ? '#EF4444' : '#F59E0B',
                    minHeight: 4,
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
