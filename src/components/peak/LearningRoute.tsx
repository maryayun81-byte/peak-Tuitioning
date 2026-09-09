'use client'

import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

interface LearningRouteProps {
  className?: string
}

const ROUTE_STEPS = [
  { id: 'diagnose', label: 'DIAGNOSE', icon: '🔍', color: 'red' },
  { id: 'profile', label: 'PROFILE', icon: '📊', color: 'amber' },
  { id: 'placement', label: 'PLACEMENT', icon: '🎯', color: 'blue' },
  { id: 'practice', label: 'PRACTICE', icon: '✏️', color: 'cyan' },
  { id: 'feedback', label: 'FEEDBACK', icon: '💬', color: 'blue' },
  { id: 'reassess', label: 'REASSESS', icon: '🔄', color: 'green' },
  { id: 'progress', label: 'PROGRESS', icon: '📈', color: 'green' },
  { id: 'mastery', label: 'MASTERY', icon: '🏆', color: 'green' },
]

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', dot: 'bg-red-500' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', dot: 'bg-amber-500' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', dot: 'bg-blue-500' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', dot: 'bg-cyan-500' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', dot: 'bg-green-500' },
}

export function LearningRoute({ className = '' }: LearningRouteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const lineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <div ref={containerRef} className={`relative py-12 bg-white ${className}`}>
      {/* Section label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        className="text-center mb-8"
      >
        <span className="peak-label peak-label-green">THE PEAK ACADEMIC SYSTEM</span>
      </motion.div>

      {/* Horizontal scrollable steps */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex overflow-x-auto gap-3 pb-4 hide-scrollbar -mx-2 px-2">
          {ROUTE_STEPS.map((step, i) => (
            <RouteStep key={step.id} step={step} index={i} />
          ))}
        </div>
      </div>

      {/* Connecting line below */}
      <div className="max-w-6xl mx-auto px-6 mt-4">
        <div className="relative h-[2px] bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-peak-green via-peak-blue to-peak-cyan rounded-full"
            style={{ width: lineHeight }}
          />
        </div>
      </div>
    </div>
  )
}

function RouteStep({
  step,
  index,
}: {
  step: (typeof ROUTE_STEPS)[number]
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const colors = COLOR_CLASSES[step.color]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 15 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="flex-shrink-0"
    >
      <div className={`flex flex-col items-center gap-2 px-5 py-4 rounded-xl border ${colors.border} ${colors.bg} min-w-[100px] transition-all hover:shadow-sm`}>
        {/* Step number */}
        <span className="peak-mono text-[9px] text-slate-400">{String(index + 1).padStart(2, '0')}</span>

        {/* Icon */}
        <div className="text-2xl">{step.icon}</div>

        {/* Label */}
        <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>{step.label}</span>
      </div>
    </motion.div>
  )
}

interface LearningRouteCompactProps {
  currentStep?: number
  className?: string
}

export function LearningRouteCompact({
  currentStep = 0,
  className = '',
}: LearningRouteCompactProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <div ref={ref} className={`flex items-center gap-0 overflow-x-auto py-4 ${className}`}>
      {ROUTE_STEPS.map((step, i) => {
        const isActive = i === currentStep
        const isCompleted = i < currentStep
        const colors = COLOR_CLASSES[step.color]

        return (
          <div key={step.id} className="flex items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                ${isActive ? `${colors.bg} ${colors.text} border ${colors.border}` : ''}
                ${isCompleted ? 'bg-green-50 text-green-600 border border-green-200' : ''}
                ${i > currentStep ? 'bg-slate-50 text-slate-400 border border-slate-200' : ''}
              `}
            >
              <span>{step.icon}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </motion.div>

            {i < ROUTE_STEPS.length - 1 && (
              <div className={`w-4 h-[2px] ${isCompleted ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}