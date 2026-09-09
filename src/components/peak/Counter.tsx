'use client'

import { motion, useInView, useSpring, useTransform, useMotionValue } from 'framer-motion'
import { useRef, useEffect, ReactNode } from 'react'

interface AnimatedCounterProps {
  value: number
  suffix?: string
  prefix?: string
  label: string
  className?: string
  delay?: number
}

export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  label,
  className = '',
  delay = 0,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { stiffness: 80, damping: 20 })
  const displayValue = useTransform(springValue, (v) => Math.round(v))

  useEffect(() => {
    if (isInView) {
      const timeout = setTimeout(() => {
        motionValue.set(value)
      }, delay * 1000)
      return () => clearTimeout(timeout)
    }
  }, [isInView, value, delay, motionValue])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.6 }}
      className={`text-center ${className}`}
    >
      <div className="peak-number text-5xl sm:text-6xl md:text-7xl font-bold text-peak-text">
        {prefix}
        <motion.span>{displayValue}</motion.span>
        {suffix}
      </div>
      <div className="peak-label mt-3 text-peak-text-dim">{label}</div>
    </motion.div>
  )
}

interface ProgressBarProps {
  value: number
  max?: number
  color?: 'green' | 'blue' | 'cyan' | 'red'
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  label?: string
  className?: string
  delay?: number
}

export function ProgressBar({
  value,
  max = 100,
  color = 'green',
  size = 'md',
  showValue = true,
  label,
  className = '',
  delay = 0,
}: ProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-20px' })
  const percentage = Math.min((value / max) * 100, 100)

  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }

  const colorMap = {
    green: 'bg-gradient-to-r from-peak-green-dim to-peak-green',
    blue: 'bg-gradient-to-r from-peak-blue-dim to-peak-blue',
    cyan: 'bg-gradient-to-r from-peak-cyan-dim to-peak-cyan',
    red: 'bg-gradient-to-r from-peak-red-dim to-peak-red',
  }

  return (
    <div ref={ref} className={`${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="peak-label text-peak-text-dim">{label}</span>}
          {showValue && (
            <span className="peak-mono text-xs text-peak-text-muted">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className={`${heights[size]} bg-peak-elevated rounded-full overflow-hidden`}>
        <motion.div
          className={`h-full ${colorMap[color]} rounded-full relative`}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${percentage}%` } : {}}
          transition={{ delay, duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </motion.div>
      </div>
    </div>
  )
}

interface DiagnosticScannerProps {
  className?: string
}

export function DiagnosticScanner({ className = '' }: DiagnosticScannerProps) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-peak-green to-transparent z-10"
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(126, 217, 87, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(126, 217, 87, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Corner markers */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-peak-green/40" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-peak-green/40" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-peak-green/40" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-peak-green/40" />
    </div>
  )
}

interface PeakStatProps {
  value: string
  label: string
  icon?: ReactNode
  color?: 'green' | 'blue' | 'cyan'
  className?: string
  delay?: number
}

export function PeakStat({
  value,
  label,
  icon,
  color = 'green',
  className = '',
  delay = 0,
}: PeakStatProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-30px' })

  const colorMap = {
    green: 'text-peak-green border-peak-green/20 bg-peak-green/5',
    blue: 'text-peak-blue border-peak-blue/20 bg-peak-blue/5',
    cyan: 'text-peak-cyan border-peak-cyan/20 bg-peak-cyan/5',
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5 }}
      className={`
        border rounded-xl p-5
        ${colorMap[color]}
        ${className}
      `}
    >
      {icon && <div className="mb-3 opacity-60">{icon}</div>}
      <div className="peak-number text-3xl font-bold">{value}</div>
      <div className="peak-label mt-1 text-peak-text-dim">{label}</div>
    </motion.div>
  )
}
