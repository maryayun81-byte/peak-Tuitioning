'use client'

import { motion, useInView, useSpring, useMotionValue, useTransform } from 'framer-motion'
import { useRef, useEffect, useState, useMemo } from 'react'

const STATS = [
  { value: 500, suffix: '+', label: 'STUDENTS TRANSFORMED', color: 'green' as const },
  { value: 2, suffix: '×', label: 'AVERAGE GRADE JUMP', color: 'blue' as const },
  { value: 94, suffix: '%', label: 'PARENT SATISFACTION', color: 'cyan' as const },
  { value: 17, suffix: '', label: 'A GRADES ACHIEVED', color: 'green' as const },
]

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297
  return x - Math.floor(x)
}

const PARTICLE_DATA = Array.from({ length: 30 }).map((_, i) => ({
  left: seededRandom(i * 3 + 1) * 100,
  top: seededRandom(i * 3 + 2) * 100,
  duration: 3 + seededRandom(i * 3 + 3) * 2,
  delay: seededRandom(i * 3 + 4) * 3,
}))

function AnimatedNumber({ value, suffix, delay = 0 }: { value: number; suffix: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { stiffness: 60, damping: 15 })
  const display = useTransform(spring, (v) => Math.round(v))

  useEffect(() => {
    if (isInView) {
      const t = setTimeout(() => motionValue.set(value), delay * 1000)
      return () => clearTimeout(t)
    }
  }, [isInView, value, delay, motionValue])

  return (
    <div ref={ref} className="peak-number text-5xl sm:text-6xl md:text-7xl font-bold">
      <motion.span>{display}</motion.span>
      {suffix}
    </div>
  )
}

export function EvidenceWall() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="results" ref={ref} className="relative py-12 md:py-16 overflow-hidden bg-white">
      {/* Background particles — assembled from student data points */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLE_DATA.map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-peak-green/20"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
            }}
            animate={isInView ? {
              opacity: [0, 0.6, 0],
              scale: [0.5, 1.5, 0.5],
            } : {}}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-8 md:mb-10"
        >
          <span className="peak-label peak-label-green mb-4 block">THE EVIDENCE WALL</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            NUMBERS THAT
            <br />
            <span className="text-peak-green">TEACH.</span>
          </h2>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.6 }}
              className="text-center"
            >
              <div className={`
                ${stat.color === 'green' ? 'text-peak-green' : ''}
                ${stat.color === 'blue' ? 'text-peak-blue' : ''}
                ${stat.color === 'cyan' ? 'text-peak-cyan' : ''}
              `}>
                <AnimatedNumber value={stat.value} suffix={stat.suffix} delay={0.3 + i * 0.15} />
              </div>
              <div className="peak-label mt-3 text-slate-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Mark Transformation Engine */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8 }}
          className="mt-20"
        >
          <MarkTransformationEngine />
        </motion.div>
      </div>
    </section>
  )
}

function MarkTransformationEngine() {
  const [slider, setSlider] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  const beforeMarks = { math: 43, chemistry: 38, confidence: 25 }
  const afterMarks = { math: 71, chemistry: 62, confidence: 78 }

  const currentMath = Math.round(beforeMarks.math + (afterMarks.math - beforeMarks.math) * (slider / 100))
  const currentChem = Math.round(beforeMarks.chemistry + (afterMarks.chemistry - beforeMarks.chemistry) * (slider / 100))
  const currentConf = Math.round(beforeMarks.confidence + (afterMarks.confidence - beforeMarks.confidence) * (slider / 100))

  const getGrade = (mark: number) => {
    if (mark >= 80) return 'A'
    if (mark >= 70) return 'B+'
    if (mark >= 60) return 'B'
    if (mark >= 50) return 'C+'
    if (mark >= 40) return 'C'
    if (mark >= 30) return 'D'
    return 'E'
  }

  const getColor = (mark: number) => {
    if (mark >= 70) return 'text-peak-green'
    if (mark >= 50) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <div ref={ref} className="bg-white border border-slate-200 rounded-2xl p-8 max-w-2xl mx-auto shadow-sm">
      <div className="text-center mb-8">
        <span className="peak-label text-slate-500">MARK TRANSFORMATION</span>
        <div className="text-sm text-slate-500 mt-2">
          {slider < 20 ? 'BEFORE PEAK' : slider > 80 ? 'AFTER PEAK' : 'IN PROGRESS'}
        </div>
      </div>

      {/* Marks display */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { label: 'MATHEMATICS', before: beforeMarks.math, current: currentMath },
          { label: 'CHEMISTRY', before: beforeMarks.chemistry, current: currentChem },
          { label: 'CONFIDENCE', before: beforeMarks.confidence, current: currentConf },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div className="peak-label text-slate-400 text-[9px] mb-2">{item.label}</div>
            <div className="relative h-32 flex items-end justify-center">
              {/* Before bar */}
              <div className="absolute bottom-0 w-8 bg-red-100 rounded-t" style={{ height: `${item.before}%` }} />
              {/* Current bar */}
              <div className={`absolute bottom-0 w-8 rounded-t transition-all duration-300 ${
                item.current >= 70 ? 'bg-peak-green' : item.current >= 50 ? 'bg-amber-400' : 'bg-red-400'
              }`} style={{ height: `${item.current}%`, opacity: 0.8 }} />
            </div>
            <div className={`mt-2 text-xl font-bold peak-number ${getColor(item.current)}`}>
              {item.current}
            </div>
            <div className="peak-mono text-[10px] text-slate-400">{getGrade(item.current)}</div>
          </div>
        ))}
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={100}
          value={slider}
          onChange={(e) => setSlider(Number(e.target.value))}
          className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-peak-green [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-sm"
        />
        <div className="flex justify-between text-[10px] text-slate-400 peak-mono">
          <span>BEFORE</span>
          <span>AFTER</span>
        </div>
      </div>
    </div>
  )
}
