'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Zap, Sword, Users } from 'lucide-react'

interface Props {
  searching: boolean
  onCancel: () => void
  searchTime?: number
}

const STATUS_MESSAGES = [
  'Scanning arena for opponents...',
  'Analyzing skill levels...',
  'Warming up match engine...',
  'Almost there...',
  'Aligning ratings...',
]

export function MatchmakingModal({ searching, onCancel, searchTime = 0 }: Props) {
  const [statusIndex, setStatusIndex] = useState(0)
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; delay: number }[]>([])

  useEffect(() => {
    if (!searching) return
    setStatusIndex(0)
    const p = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 200 - 100,
      y: Math.random() * 200 - 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 3,
    }))
    setParticles(p)

    const statusInterval = setInterval(() => {
      setStatusIndex(i => (i + 1) % STATUS_MESSAGES.length)
    }, 3000)
    return () => clearInterval(statusInterval)
  }, [searching])

  if (!searching) return null

  const mins = Math.floor(searchTime / 60)
  const secs = searchTime % 60

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)' }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative rounded-3xl p-10 text-center max-w-sm w-full mx-4 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--card) 0%, rgba(99,102,241,0.08) 100%)', border: '1px solid var(--card-border)' }}
      >
        {/* Background glow */}
        <div className="absolute inset-0 opacity-20" style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(99,102,241,0.3) 0%, transparent 70%)',
        }} />

        <div className="relative z-10">
          {/* Animated rings */}
          <div className="relative w-28 h-28 mx-auto mb-6">
            {/* Outer slow ring */}
            <motion.svg
              className="absolute inset-0"
              viewBox="0 0 112 112"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            >
              <circle cx="56" cy="56" r="52" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="1" />
              <circle cx="56" cy="56" r="52" fill="none" stroke="url(#grad1)" strokeWidth="2"
                strokeDasharray="80 240" strokeLinecap="round" />
            </motion.svg>

            {/* Middle reverse ring */}
            <motion.svg
              className="absolute inset-0"
              viewBox="0 0 112 112"
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            >
              <circle cx="56" cy="56" r="44" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="1" />
              <circle cx="56" cy="56" r="44" fill="none" stroke="url(#grad2)" strokeWidth="1.5"
                strokeDasharray="60 216" strokeLinecap="round" />
            </motion.svg>

            {/* Inner fast ring */}
            <motion.svg
              className="absolute inset-0"
              viewBox="0 0 112 112"
              animate={{ rotate: 720 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            >
              <circle cx="56" cy="56" r="36" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="1" />
              <circle cx="56" cy="56" r="36" fill="none" stroke="url(#grad3)" strokeWidth="2.5"
                strokeDasharray="40 186" strokeLinecap="round" />
            </motion.svg>

            {/* Center icon */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))' }}>
                <Sword size={28} style={{ color: '#8B5CF6' }} />
              </div>
            </motion.div>

            {/* SVG gradients */}
            <svg width="0" height="0">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
              </defs>
            </svg>

            {/* Floating particles */}
            {particles.map(p => (
              <motion.div
                key={p.id}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  background: p.id % 3 === 0 ? '#6366F1' : p.id % 3 === 1 ? '#10B981' : '#F59E0B',
                  left: '50%',
                  top: '50%',
                }}
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: p.x,
                  y: p.y,
                  opacity: [0, 0.8, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2.5,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>

          {/* Status */}
          <motion.div
            key={statusIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-base font-black mb-1" style={{ color: 'var(--text)' }}>
              Finding Opponent
            </h3>
            <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>
              {STATUS_MESSAGES[statusIndex]}
            </p>
          </motion.div>

          {/* Timer */}
          {searchTime > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-5 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#8B5CF6' }}
            >
              <Clock size={12} />
              {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}
            </motion.div>
          )}

          {/* Skill range indicator */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex items-center gap-2 mb-6 origin-center"
          >
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--input)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #A78BFA)',
                }}
                animate={{
                  width: ['30%', '70%', '45%', '80%', '50%'],
                }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              />
            </div>
            <Users size={14} style={{ color: 'var(--text-muted)' }} />
          </motion.div>

          {/* Cancel */}
          <motion.button
            onClick={onCancel}
            className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-muted)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            whileHover={{ background: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.97 }}
          >
            <X size={14} className="inline mr-1.5" /> Cancel
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Clock({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
