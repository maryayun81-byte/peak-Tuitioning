'use client'

import { useMemo } from 'react'
import type { Season } from '@/lib/seasonal-theme'

interface Props {
  season: Season
  particleCount: number
  particleColor: string
  reducedMotion?: boolean
}

export function SeasonalBackground({ season, particleCount, particleColor, reducedMotion }: Props) {
  if (reducedMotion) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {season === 'winter' && <Snowflakes count={particleCount} color={particleColor} />}
      {season === 'spring' && <Petals count={particleCount} color={particleColor} />}
      {season === 'autumn' && <Leaves count={particleCount} color={particleColor} />}
      {season === 'summer' && <Clouds count={particleCount} color={particleColor} />}
    </div>
  )
}

function Snowflakes({ count, color }: { count: number; color: string }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: 2 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.5,
      duration: 6 + Math.random() * 8,
      delay: Math.random() * 10,
      sway: 30 + Math.random() * 60,
    })), [count])

  return (
    <div className="snowflakes">
      <style>{`
        @keyframes snowfall {
          0% { transform: translateY(-10px) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.8; }
          100% { transform: translateY(100vh) translateX(var(--sway)); opacity: 0; }
        }
        @keyframes sway {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(var(--sway)); }
        }
      `}</style>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: '-10px',
            width: p.size,
            height: p.size,
            background: color,
            opacity: p.opacity,
            animation: `snowfall ${p.duration}s ${p.delay}s linear infinite`,
            '--sway': `${p.sway}px`,
            filter: 'blur(0.5px)',
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

function Petals({ count, color }: { count: number; color: string }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: 4 + Math.random() * 6,
      duration: 10 + Math.random() * 8,
      delay: Math.random() * 12,
      spin: 60 + Math.random() * 120,
    })), [count])

  return (
    <div className="petals">
      <style>{`
        @keyframes petalfall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          15% { opacity: 0.8; }
          85% { opacity: 0.6; }
          100% { transform: translateY(100vh) rotate(var(--spin)); opacity: 0; }
        }
      `}</style>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: p.left,
            top: '-20px',
            width: p.size,
            height: p.size * 0.7,
            background: color,
            borderRadius: '50% 0 50% 0',
            opacity: 0.5,
            animation: `petalfall ${p.duration}s ${p.delay}s ease-in infinite`,
            '--spin': `${p.spin}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

function Leaves({ count, color }: { count: number; color: string }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: 5 + Math.random() * 7,
      duration: 9 + Math.random() * 7,
      delay: Math.random() * 10,
      drift: 40 + Math.random() * 80,
    })), [count])

  return (
    <div className="leaves">
      <style>{`
        @keyframes leaffall {
          0% { transform: translateY(-15px) translateX(0) rotate(0deg); opacity: 0; }
          15% { opacity: 0.7; }
          85% { opacity: 0.5; }
          100% { transform: translateY(100vh) translateX(var(--drift)) rotate(360deg); opacity: 0; }
        }
      `}</style>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: '-15px',
            width: p.size,
            height: p.size * 0.8,
            background: color,
            borderRadius: '2px 10px 2px 10px',
            opacity: 0.5,
            animation: `leaffall ${p.duration}s ${p.delay}s ease-in-out infinite`,
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

function Clouds({ count, color }: { count: number; color: string }) {
  const clouds = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      top: `${5 + Math.random() * 25}%`,
      size: 60 + Math.random() * 100,
      duration: 30 + Math.random() * 40,
      delay: Math.random() * 20,
    })), [count])

  return (
    <div className="clouds">
      <style>{`
        @keyframes clouddrift {
          0% { transform: translateX(-200px); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 0.8; }
          100% { transform: translateX(calc(100vw + 200px)); opacity: 0; }
        }
      `}</style>
      {clouds.map(c => (
        <div
          key={c.id}
          className="absolute"
          style={{
            top: c.top,
            width: c.size,
            height: c.size * 0.4,
            background: color,
            borderRadius: '50%',
            filter: 'blur(20px)',
            animation: `clouddrift ${c.duration}s ${c.delay}s linear infinite`,
          }}
        />
      ))}
    </div>
  )
}
