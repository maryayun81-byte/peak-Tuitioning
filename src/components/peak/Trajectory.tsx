'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface TrajectoryProps {
  steps: string[]
  currentStep?: number
  direction?: 'horizontal' | 'vertical'
  className?: string
  showLabels?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Trajectory({
  steps,
  currentStep = 0,
  direction = 'horizontal',
  className = '',
  showLabels = true,
  size = 'md',
}: TrajectoryProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  const nodeSizes = {
    sm: 'w-6 h-6 text-[9px]',
    md: 'w-10 h-10 text-[11px]',
    lg: 'w-14 h-14 text-xs',
  }

  const lineThickness = {
    sm: 'h-[2px]',
    md: 'h-[3px]',
    lg: 'h-[4px]',
  }

  const isVertical = direction === 'vertical'

  return (
    <div
      ref={ref}
      className={`flex ${isVertical ? 'flex-col items-center' : 'flex-row items-center'} gap-0 ${className}`}
    >
      {steps.map((step, i) => {
        const isActive = i === currentStep
        const isCompleted = i < currentStep
        const isPending = i > currentStep

        return (
          <div
            key={step}
            className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center`}
          >
            {/* Node */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={isInView ? { scale: 1, opacity: 1 } : {}}
              transition={{ delay: i * 0.1, duration: 0.4, type: 'spring', stiffness: 200 }}
              className="relative flex flex-col items-center gap-2"
            >
              <div
                className={`
                  ${nodeSizes[size]} rounded-full flex items-center justify-center
                  font-bold tracking-wider transition-all duration-500
                  ${isActive ? 'bg-peak-green text-peak-void shadow-peak-glow-green' : ''}
                  ${isCompleted ? 'bg-peak-blue text-white' : ''}
                  ${isPending ? 'bg-peak-elevated text-peak-text-dim border-2 border-peak-border' : ''}
                `}
              >
                {isCompleted ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="peak-mono">{i + 1}</span>
                )}
              </div>

              {/* Pulse ring for active */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-peak-green"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}

              {/* Label */}
              {showLabels && (
                <motion.span
                  initial={{ opacity: 0, y: isVertical ? -5 : 0, x: isVertical ? 0 : -5 }}
                  animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
                  transition={{ delay: i * 0.1 + 0.2 }}
                  className={`
                    text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap
                    ${isActive ? 'text-peak-green' : ''}
                    ${isCompleted ? 'text-peak-blue' : ''}
                    ${isPending ? 'text-peak-text-faint' : ''}
                  `}
                >
                  {step}
                </motion.span>
              )}
            </motion.div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={`
                  ${isVertical ? `w-[3px] h-12 ${lineThickness[size]}` : `h-[3px] w-12 flex-1 min-w-[2rem] ${lineThickness[size]}`}
                  ${isCompleted ? 'bg-peak-blue' : 'bg-peak-border'}
                  transition-colors duration-500
                `}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
