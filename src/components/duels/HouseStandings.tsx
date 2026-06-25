'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, MapPin, Trophy } from 'lucide-react'
import { HOUSES, type HouseStanding } from '@/types/houses'
import { getHouseStandings } from '@/app/actions/houses'

export function HouseStandings() {
  const [standings, setStandings] = useState<HouseStanding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHouseStandings().then(data => {
      setStandings(data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="w-6 h-6 rounded-full border-2 border-transparent border-t-purple-500" />
      </div>
    )
  }

  const sorted = [...standings].sort((a, b) => b.territoryCount - a.territoryCount || b.totalPoints - a.totalPoints)

  return (
    <div className="space-y-2">
      {sorted.map((s, i) => {
        const house = HOUSES.find(h => h.id === s.houseId)
        if (!house) return null
        const isTop = i === 0

        return (
          <motion.div
            key={s.houseId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`relative p-3 rounded-2xl border transition-all ${isTop ? 'border' : ''}`}
            style={{
              background: isTop ? `linear-gradient(135deg, ${house.bg}, transparent)` : 'var(--card)',
              borderColor: isTop ? house.color : 'var(--card-border)',
            }}
          >
            {/* Rank badge */}
            <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black"
              style={{
                background: isTop ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'var(--input)',
                color: isTop ? 'white' : 'var(--text-muted)',
                boxShadow: isTop ? '0 0 12px rgba(245,158,11,0.4)' : 'none',
              }}>
              {isTop && <Trophy size={12} />}
              {!isTop && i + 1}
            </div>

            <div className="flex items-center gap-3 ml-4">
              <div className="text-xl">{house.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black" style={{ color: 'var(--text)' }}>{house.name}</span>
                  {isTop && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                      Leading
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>
                    <MapPin size={10} /> {s.territoryCount} territories
                  </span>
                  <span className="flex items-center gap-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>
                    <Users size={10} /> {s.memberCount}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black" style={{ color: house.color }}>{s.territoryCount}</div>
                <div className="text-[8px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Territories</div>
              </div>
            </div>

            {/* Battle bar */}
            <div className="mt-2 flex gap-0.5 ml-4">
              {Array.from({ length: 16 }, (_, j) => (
                <div key={j}
                  className="flex-1 h-1 rounded-full transition-all duration-500"
                  style={{
                    background: j < s.territoryCount ? house.color : 'var(--input)',
                    opacity: j < s.territoryCount ? 0.8 : 0.3,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
