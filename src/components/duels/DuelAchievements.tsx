'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Award, Lock, CheckCircle } from 'lucide-react'
import type { DuelAchievement, StudentDuelAchievement } from '@/types/duels'
import { getDuelAchievements } from '@/app/actions/duels'

export function DuelAchievements() {
  const [data, setData] = useState<{ all: DuelAchievement[]; earned: StudentDuelAchievement[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDuelAchievements().then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const earnedIds = new Set(data?.earned.map(e => e.achievement_id) || [])

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
        <Award size={16} /> Achievements
      </h3>

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
          {data?.all.map(ach => {
            const earned = earnedIds.has(ach.id)
            return (
              <motion.div
                key={ach.id}
                whileHover={{ scale: 1.02 }}
                className={`p-3 rounded-xl border ${earned ? '' : 'opacity-50'}`}
                style={{ background: 'var(--card)', borderColor: earned ? 'rgba(16,185,129,0.3)' : 'var(--card-border)' }}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${earned ? 'bg-emerald-500/20' : 'bg-slate-500/20'}`}>
                    {earned ? <CheckCircle size={14} className="text-emerald-500" /> : <Lock size={14} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-black truncate" style={{ color: earned ? 'var(--text)' : 'var(--text-muted)' }}>
                      {ach.title}
                    </div>
                    <div className="text-[9px] leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {ach.description}
                    </div>
                    {!earned && (
                      <div className="text-[8px] mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                        +{ach.reward_xp} XP · +{ach.reward_coins} coins
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
