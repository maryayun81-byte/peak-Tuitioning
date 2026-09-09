'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'

export function PeakEasterEggs() {
  return (
    <>
      {/* Hidden trajectory that appears on hover */}
      <HiddenTrajectory />
      {/* Diagnostic counter that changes subtly */}
      <DiagnosticCounter />
    </>
  )
}

function HiddenTrajectory() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const [hovered, setHovered] = useState(false)

  return (
    <div
      ref={ref}
      className="fixed bottom-6 right-6 z-50"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 5 }}
        className="cursor-pointer"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <motion.path
            d="M12 22L2 2L22 2L12 22Z"
            stroke="currentColor"
            strokeWidth="1"
            className="text-peak-green/20"
            animate={hovered ? { stroke: 'rgba(126, 217, 87, 0.6)' } : {}}
          />
        </svg>

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={hovered ? { opacity: 1, y: 0 } : { opacity: 0, y: 5 }}
          className="absolute bottom-full right-0 mb-2 whitespace-nowrap"
        >
          <div className="bg-peak-surface border border-peak-green/20 rounded-lg px-3 py-1.5 text-[10px] text-peak-green font-bold tracking-wider">
            KEEP CLIMBING.
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

function DiagnosticCounter() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const [count, setCount] = useState(48)

  // Subtly changes as user explores
  const interval = isInView ? setInterval(() => {
    setCount((prev) => {
      const change = Math.random() > 0.5 ? 1 : -1
      return Math.max(45, Math.min(52, prev + change))
    })
  }, 5000) : null

  return (
    <div ref={ref} className="fixed top-1/2 right-4 -translate-y-1/2 z-40 hidden xl:block">
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 3 }}
        className="flex flex-col items-center gap-1"
      >
        <span className="peak-mono text-[8px] text-peak-text-faint tracking-wider">DIAG</span>
        <span className="peak-mono text-xs text-peak-green/30">{count}%</span>
      </motion.div>
    </div>
  )
}
