'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { HOUSES, type HouseId } from '@/types/houses'
import { getTerritoryMap } from '@/app/actions/houses'

interface TerritoryData {
  id: string
  name: string
  owner: HouseId
  points: number
  threshold: number
  adjacent: string[]
}

const TERRITORY_LAYOUT: { id: string; x: number; y: number }[] = [
  { id: 'highlands', x: 15, y: 5 },
  { id: 'lowlands', x: 25, y: 15 },
  { id: 'coast', x: 10, y: 18 },
  { id: 'forest', x: 22, y: 25 },
  { id: 'desert', x: 35, y: 10 },
  { id: 'valley', x: 32, y: 22 },
  { id: 'mountains', x: 45, y: 12 },
  { id: 'peaks', x: 52, y: 20 },
  { id: 'city', x: 55, y: 30 },
  { id: 'tundra', x: 65, y: 8 },
  { id: 'delta', x: 60, y: 22 },
  { id: 'plains', x: 50, y: 38 },
  { id: 'harbor', x: 65, y: 35 },
  { id: 'ridge', x: 42, y: 35 },
  { id: 'islands', x: 72, y: 28 },
  { id: 'capital', x: 48, y: 28 },
]

export function TerritoryMap() {
  const [territories, setTerritories] = useState<TerritoryData[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTerritoryMap().then(data => {
      setTerritories(data as any)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-transparent border-t-purple-500" />
      </div>
    )
  }

  const selectedTerr = territories.find(t => t.id === selected)

  return (
    <div className="relative">
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border"
        style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.98) 100%)', borderColor: 'var(--card-border)' }}>
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Connections between adjacent territories */}
        <svg className="absolute inset-0 w-full h-full">
          {territories.map(t => {
            const from = TERRITORY_LAYOUT.find(l => l.id === t.id)
            if (!from) return null
            return t.adjacent.map(adjId => {
              const to = TERRITORY_LAYOUT.find(l => l.id === adjId)
              if (!to || t.id > adjId) return null
              const house = HOUSES.find(h => h.id === t.owner)
              return (
                <line key={`${t.id}-${adjId}`}
                  x1={`${from.x}%`} y1={`${from.y}%`}
                  x2={`${to.x}%`} y2={`${to.y}%`}
                  stroke={house?.color || '#334155'}
                  strokeWidth="1.5"
                  strokeOpacity="0.3"
                  strokeDasharray="4 3"
                />
              )
            })
          })}
        </svg>

        {/* Territory nodes */}
        {territories.map(t => {
          const layout = TERRITORY_LAYOUT.find(l => l.id === t.id)
          if (!layout) return null
          const house = HOUSES.find(h => h.id === t.owner)
          const isSelected = selected === t.id

          return (
            <motion.button
              key={t.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 100, damping: 15, delay: Math.random() * 0.3 }}
              onClick={() => setSelected(isSelected ? null : t.id)}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: `${layout.x}%`, top: `${layout.y}%` }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              <div className="relative flex items-center justify-center">
                {/* Glow */}
                <motion.div
                  animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="absolute w-12 h-12 rounded-full"
                  style={{ background: `radial-gradient(circle, ${house?.color}40 0%, transparent 70%)` }}
                />
                {/* Node */}
                <div className={`relative w-8 h-8 rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg`}
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${house?.color}, ${house?.color}dd)`
                      : house?.bg || 'rgba(255,255,255,0.05)',
                    border: `2px solid ${isSelected ? house?.color : `${house?.color}60`}`,
                    boxShadow: isSelected ? `0 0 20px ${house?.color}60` : 'none',
                  }}>
                  <span className="text-[10px] font-black" style={{ color: isSelected ? 'white' : house?.color }}>
                    {house?.emoji}
                  </span>
                </div>
                {/* Territory name label */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-[7px] font-bold uppercase tracking-wider"
                    style={{ color: house?.color, opacity: isSelected ? 1 : 0.6 }}>
                    {t.name}
                  </span>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Territory info panel */}
      <AnimatedInfo selected={selectedTerr} onClose={() => setSelected(null)} />

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-3">
        {HOUSES.map(h => (
          <div key={h.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded" style={{ background: h.color }} />
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {h.emoji} {h.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnimatedInfo({ selected, onClose }: { selected: TerritoryData | undefined; onClose: () => void }) {
  if (!selected) return null
  const house = HOUSES.find(h => h.id === selected.owner)
  const progress = Math.min(selected.points / selected.threshold, 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl border z-10"
      style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs font-black" style={{ color: 'var(--text)' }}>{selected.name}</div>
          <div className="text-[10px]" style={{ color: house?.color }}>
            {house?.emoji} Controlled by {house?.name}
          </div>
        </div>
        <button onClick={onClose} className="opacity-50 hover:opacity-100">
          <Info size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--input)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            className="h-full rounded-full"
            style={{ background: house?.color }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
          {selected.points}/{selected.threshold}
        </span>
      </div>
    </motion.div>
  )
}
