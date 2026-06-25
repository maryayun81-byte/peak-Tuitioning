'use client'

import type { ReactNode } from 'react'
import type { SeasonTheme } from '@/lib/seasonal-theme'

interface Props {
  theme: SeasonTheme
  children: ReactNode
  className?: string
  glow?: boolean
}

export function SeasonalCard({ theme, children, className = '', glow }: Props) {
  const isWinter = theme.season === 'winter'
  const isSpring = theme.season === 'spring'
  const isAutumn = theme.season === 'autumn'
  const isSummer = theme.season === 'summer'

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden ${className}`}
      style={{
        background: theme.cardBg,
        borderColor: theme.cardBorder,
        backdropFilter: isWinter ? 'blur(12px)' : 'blur(8px)',
        WebkitBackdropFilter: isWinter ? 'blur(12px)' : 'blur(8px)',
        boxShadow: glow ? `0 0 30px ${theme.cardGlow}` : 'none',
      }}
    >
      {/* Subtle frost highlight for winter */}
      {isWinter && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
          }}
        />
      )}

      {/* Spring border accent */}
      {isSpring && (
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, transparent, #34D399, transparent)' }} />
      )}

      {/* Autumn warm glow */}
      {isAutumn && (
        <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full pointer-events-none"
          style={{ background: 'rgba(251,146,60,0.06)', filter: 'blur(15px)' }} />
      )}

      {/* Summer light accent */}
      {isSummer && (
        <div className="absolute top-0 left-1/4 right-1/4 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(250,204,21,0.2), transparent)' }} />
      )}

      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
