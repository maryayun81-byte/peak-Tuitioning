'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { PowerUp } from '@/types/duels'
import { POWER_UP_LABELS, POWER_UP_DESCRIPTIONS } from '@/types/duels'

interface Props {
  availablePowerUps: PowerUp[]
  onUse: (powerUp: PowerUp) => void
  disabled?: boolean
}

export function PowerUpBar({ availablePowerUps, onUse, disabled }: Props) {
  const [showDesc, setShowDesc] = useState<PowerUp | null>(null)

  if (availablePowerUps.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 justify-center">
      {availablePowerUps.map(pu => (
        <div key={pu} className="relative">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            disabled={disabled}
            onClick={() => onUse(pu)}
            onMouseEnter={() => setShowDesc(pu)}
            onMouseLeave={() => setShowDesc(null)}
            className="px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border"
            style={{
              background: 'rgba(99,102,241,0.1)',
              borderColor: 'rgba(99,102,241,0.2)',
              color: '#818cf8',
            }}
          >
            {POWER_UP_LABELS[pu]}
          </motion.button>
          {showDesc === pu && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-xl whitespace-nowrap text-[10px] z-10 shadow-lg"
              style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--card-border)' }}>
              {POWER_UP_DESCRIPTIONS[pu]}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
