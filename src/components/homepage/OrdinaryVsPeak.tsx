'use client'

import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

const OLD_WAY = [
  '30 students.',
  'Same worksheet.',
  'Same pace.',
  'Same explanation.',
  'Teacher talks.',
  'Students copy.',
  'Marks arrive later.',
]

const PEAK_WAY = [
  'DIAGNOSE',
  'MATCH',
  'QUESTION',
  'PRACTICE',
  'CORRECT',
  'REPEAT',
  'MEASURE',
]

export function OrdinaryVsPeak() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const oldWayOpacity = useTransform(scrollYProgress, [0.1, 0.4, 0.6], [1, 1, 0.2])
  const peakWayOpacity = useTransform(scrollYProgress, [0.3, 0.6, 0.8], [0.3, 1, 1])
  const oldWayBlurValue = useTransform(scrollYProgress, [0.4, 0.65], [0, 8])
  const oldWayBlur = useTransform(oldWayBlurValue, (v) => `blur(${v}px)`)
  const peakScale = useTransform(scrollYProgress, [0.3, 0.6], [0.95, 1])
  const dissolveOpacity = useTransform(scrollYProgress, [0.5, 0.7], [0, 0.8])

  return (
    <section ref={containerRef} className="relative py-12 md:py-16 overflow-hidden bg-slate-50">
      <div className="relative z-10 landing-container">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 md:mb-10"
        >
          <span className="peak-label peak-label-green mb-4 block">THE COMPARISON</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            Ordinary Tuition Repeats School.
            <br />
            <span className="text-peak-green">Peak Finds What School Missed.</span>
          </h2>
        </motion.div>

        {/* Comparison */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-start">
          {/* Old way */}
          <motion.div style={{ opacity: oldWayOpacity }}>
            <motion.div
              style={{ filter: oldWayBlur }}
              className="relative"
            >
              <div className="bg-white/50 border border-slate-200 rounded-2xl p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                  <div className="w-3 h-3 rounded-full bg-red-400/60" />
                  <span className="peak-label text-red-400/60">THE OLD WAY</span>
                </div>

                {/* Items */}
                <div className="space-y-4">
                  {OLD_WAY.map((item, i) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -20 }}
                      animate={isInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3 text-slate-500"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <span className="text-sm">{item}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Summary */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="peak-label text-slate-400 text-[9px]">RESULT</div>
                  <div className="text-sm text-slate-500 mt-1">Same outcome for every student.</div>
                </div>
              </div>

              {/* Dissolve overlay */}
              <motion.div
                className="absolute inset-0 bg-slate-50 rounded-2xl pointer-events-none"
                style={{ opacity: dissolveOpacity }}
              />
            </motion.div>
          </motion.div>

          {/* Peak way */}
          <motion.div style={{ opacity: peakWayOpacity, scale: peakScale }}>
            <div className="bg-white border border-peak-green/20 rounded-2xl p-8 space-y-6 relative overflow-hidden">
              {/* Glow */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-peak-green/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="relative flex items-center gap-3 pb-4 border-b border-peak-green/10">
                <div className="w-3 h-3 rounded-full bg-peak-green" />
                <span className="peak-label peak-label-green">THE PEAK WAY</span>
              </div>

              {/* Items */}
              <div className="relative space-y-3">
                {PEAK_WAY.map((item, i) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: 20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-8 h-8 rounded-full bg-peak-green/10 border border-peak-green/20 flex items-center justify-center flex-shrink-0">
                      <span className="peak-mono text-[10px] text-peak-green font-bold">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 tracking-wider">{item}</span>
                    {i < PEAK_WAY.length - 1 && (
                      <svg className="w-3 h-3 text-peak-green/40 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                      </svg>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Summary */}
              <div className="relative pt-4 border-t border-peak-green/10">
                <div className="peak-label peak-label-green text-[9px]">RESULT</div>
                <div className="text-sm text-slate-900 mt-1">Each student gets what they need.</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}