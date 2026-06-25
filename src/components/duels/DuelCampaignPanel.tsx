'use client'

import { motion } from 'framer-motion'
import { CalendarClock, Crown, Gift, MapPinned, Target, Trophy } from 'lucide-react'
import type { DuelType } from '@/types/duels'
import { DUEL_MODE_EXPERIENCE, DUEL_QUESTS, TERRITORY_BONUSES, getCurrentDuelSeason } from '@/lib/duels/engagement'

interface Props {
  onStartMode: (type: DuelType) => void
}

export function DuelCampaignPanel({ onStartMode }: Props) {
  const season = getCurrentDuelSeason()
  const featuredModes: DuelType[] = ['weekly', 'boss', 'daily']

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: '#F59E0B' }}>
              <Crown size={14} /> Weekly House War
            </div>
            <h2 className="mt-1 text-lg font-black" style={{ color: 'var(--text)' }}>{season.title}</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {season.weekStart} to {season.weekEnd} · {season.resetLabel}
            </p>
          </div>
          <button
            onClick={() => onStartMode('weekly')}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider"
            style={{ background: 'var(--primary)', color: 'white' }}
          >
            <Trophy size={14} /> Enter Season
          </button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {[
            { label: 'Titles', value: season.titles[season.titles.length - 1], icon: <Crown size={14} /> },
            { label: 'Rewards', value: season.rewards.join(', '), icon: <Gift size={14} /> },
            { label: 'Reset', value: 'Monday', icon: <CalendarClock size={14} /> },
            { label: 'Goal', value: 'Capture realms', icon: <MapPinned size={14} /> },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-3" style={{ background: 'var(--input)' }}>
              <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {item.icon} {item.label}
              </div>
              <div className="text-xs font-black line-clamp-2" style={{ color: 'var(--text)' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-2 md:grid-cols-3">
          {featuredModes.map(type => {
            const mode = DUEL_MODE_EXPERIENCE[type]
            return (
              <motion.button
                key={type}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onStartMode(type)}
                className="rounded-2xl border p-4 text-left"
                style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
              >
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}>
                  {type === 'boss' ? <Trophy size={18} /> : type === 'weekly' ? <Crown size={18} /> : <Target size={18} />}
                </div>
                <div className="text-sm font-black" style={{ color: 'var(--text)' }}>{mode.title}</div>
                <p className="mt-1 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{mode.promise}</p>
                <div className="mt-3 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wider" style={{ background: 'var(--input)', color: 'var(--text-muted)' }}>
                  {mode.rewardHook}
                </div>
              </motion.button>
            )
          })}
        </div>

        <div className="rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
          <div className="mb-3 flex items-center gap-2 text-xs font-black" style={{ color: 'var(--text)' }}>
            <Target size={15} style={{ color: '#10B981' }} /> Active Quests
          </div>
          <div className="space-y-2">
            {DUEL_QUESTS.map(quest => (
              <div key={quest.id} className="rounded-xl p-3" style={{ background: 'var(--input)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-black" style={{ color: 'var(--text)' }}>{quest.title}</div>
                    <p className="mt-1 text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{quest.description}</p>
                  </div>
                  <div className="rounded-lg px-2 py-1 text-[9px] font-black" style={{ background: 'rgba(16,185,129,0.14)', color: '#10B981' }}>
                    +{quest.rewardXp} XP
                  </div>
                </div>
                <div className="mt-2 text-[9px] font-black uppercase tracking-wider" style={{ color: '#F59E0B' }}>
                  Title: {quest.rewardTitle}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        {TERRITORY_BONUSES.map(bonus => (
          <div key={bonus.territoryId} className="rounded-xl border p-3" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider" style={{ color: '#38BDF8' }}>
              <MapPinned size={13} /> {bonus.realmName}
            </div>
            <div className="mt-1 text-xs font-black" style={{ color: 'var(--text)' }}>{bonus.label}</div>
            <div className="mt-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>+{bonus.pointBonus} territory pressure on wins</div>
          </div>
        ))}
      </div>
    </div>
  )
}
