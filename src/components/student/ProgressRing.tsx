'use client'

import { motion } from 'framer-motion'

interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  label?: string
}

export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 8,
  label,
}: ProgressRingProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clampedProgress / 100) * circumference
  const center = size / 2

  const getColor = (p: number) => {
    if (p >= 70) return '#10B981'
    if (p >= 40) return '#F59E0B'
    return '#EF4444'
  }

  const color = getColor(clampedProgress)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--input)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-black leading-none"
          style={{
            fontSize: size * 0.22,
            color: 'var(--text)',
          }}
        >
          {Math.round(clampedProgress)}%
        </span>
        {label && (
          <span
            className="font-bold uppercase tracking-widest mt-0.5"
            style={{
              fontSize: Math.max(7, size * 0.1),
              color: 'var(--text-muted)',
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
