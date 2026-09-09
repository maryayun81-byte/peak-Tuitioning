'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, ReactNode } from 'react'

interface EvidenceObjectProps {
  children: ReactNode
  label?: string
  type?: 'paper' | 'data' | 'result' | 'artifact'
  className?: string
  delay?: number
}

export function EvidenceObject({
  children,
  label,
  type = 'paper',
  className = '',
  delay = 0,
}: EvidenceObjectProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-30px' })

  const typeStyles = {
    paper: 'bg-[#FAFBFC] border-[#E2E8F0] text-[#1E293B]',
    data: 'bg-peak-surface border-peak-border text-peak-text',
    result: 'bg-peak-surface border-peak-green/20 text-peak-text',
    artifact: 'bg-peak-elevated border-peak-border-light text-peak-text',
  }

  const accentColors = {
    paper: 'bg-[#E2E8F0]',
    data: 'bg-peak-blue/20',
    result: 'bg-peak-green/20',
    artifact: 'bg-peak-cyan/20',
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, rotate: -1 }}
      animate={isInView ? { opacity: 1, y: 0, rotate: 0 } : {}}
      transition={{ delay, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`
        relative border rounded-lg overflow-hidden
        ${typeStyles[type]}
        ${className}
      `}
    >
      {/* Top accent line */}
      <div className={`h-[2px] ${accentColors[type]}`} />

      {/* Label */}
      {label && (
        <div className="px-4 pt-3">
          <span className="peak-label text-peak-text-dim">{label}</span>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {children}
      </div>
    </motion.div>
  )
}

interface MilestoneProps {
  title: string
  description?: string
  reached?: boolean
  className?: string
  delay?: number
}

export function Milestone({
  title,
  description,
  reached = false,
  className = '',
  delay = 0,
}: MilestoneProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-30px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ delay, duration: 0.6, type: 'spring', stiffness: 200 }}
      className={`flex items-center gap-4 ${className}`}
    >
      {/* Milestone marker */}
      <div className="relative">
        <motion.div
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            ${reached
              ? 'bg-peak-green text-peak-void'
              : 'bg-peak-elevated text-peak-text-dim border-2 border-peak-border'
            }
          `}
          animate={reached ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5 }}
        >
          {reached ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <div className="w-3 h-3 rounded-full bg-peak-border" />
          )}
        </motion.div>

        {reached && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-peak-green"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className={`text-sm font-bold ${reached ? 'text-peak-text' : 'text-peak-text-dim'}`}>
          {title}
        </div>
        {description && (
          <div className="text-xs text-peak-text-dim mt-0.5">{description}</div>
        )}
      </div>
    </motion.div>
  )
}

interface SignalProps {
  type: 'improvement' | 'alert' | 'milestone' | 'info'
  children: ReactNode
  className?: string
  delay?: number
}

export function Signal({
  type,
  children,
  className = '',
  delay = 0,
}: SignalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-20px' })

  const typeStyles = {
    improvement: 'border-peak-green/30 bg-peak-green/5',
    alert: 'border-peak-red/30 bg-peak-red/5',
    milestone: 'border-peak-blue/30 bg-peak-blue/5',
    info: 'border-peak-cyan/30 bg-peak-cyan/5',
  }

  const dotColors = {
    improvement: 'bg-peak-green',
    alert: 'bg-peak-red',
    milestone: 'bg-peak-blue',
    info: 'bg-peak-cyan',
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -10 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay, duration: 0.4 }}
      className={`
        flex items-center gap-3 px-4 py-3
        border rounded-lg
        ${typeStyles[type]}
        ${className}
      `}
    >
      <div className={`w-2 h-2 rounded-full ${dotColors[type]}`} />
      <div className="text-sm text-peak-text">{children}</div>
    </motion.div>
  )
}
