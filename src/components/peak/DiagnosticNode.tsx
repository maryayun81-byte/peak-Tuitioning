'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface DiagnosticNodeProps {
  label: string
  status: 'weak' | 'growing' | 'strong'
  value?: number
  className?: string
  delay?: number
}

export function DiagnosticNode({
  label,
  status,
  value,
  className = '',
  delay = 0,
}: DiagnosticNodeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-30px' })

  const colors = {
    weak: {
      bg: 'bg-peak-red/10',
      border: 'border-peak-red/30',
      text: 'text-peak-red',
      dot: 'bg-peak-red',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]',
    },
    growing: {
      bg: 'bg-peak-amber/10',
      border: 'border-peak-amber/30',
      text: 'text-peak-amber',
      dot: 'bg-peak-amber',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]',
    },
    strong: {
      bg: 'bg-peak-green/10',
      border: 'border-peak-green/30',
      text: 'text-peak-green',
      dot: 'bg-peak-green',
      glow: 'shadow-[0_0_20px_rgba(126,217,87,0.2)]',
    },
  }

  const c = colors[status]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5, type: 'spring', stiffness: 150 }}
      className={`
        relative flex items-center gap-3 px-4 py-3
        ${c.bg} border ${c.border} rounded-xl
        ${c.glow}
        transition-all duration-300
        ${className}
      `}
    >
      {/* Diagnostic dot */}
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${c.dot}`} />
        <motion.div
          className={`absolute inset-0 rounded-full ${c.dot}`}
          animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, delay: delay * 2 }}
        />
      </div>

      {/* Label and value */}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-peak-text-dim">
          {label}
        </div>
        {value !== undefined && (
          <div className={`text-lg font-bold peak-number ${c.text}`}>
            {value}%
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className={`
        text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full
        ${status === 'weak' ? 'bg-peak-red/20 text-peak-red' : ''}
        ${status === 'growing' ? 'bg-peak-amber/20 text-peak-amber' : ''}
        ${status === 'strong' ? 'bg-peak-green/20 text-peak-green' : ''}
      `}>
        {status === 'weak' ? 'WEAK' : status === 'growing' ? 'GROWING' : 'STRONG'}
      </div>
    </motion.div>
  )
}
