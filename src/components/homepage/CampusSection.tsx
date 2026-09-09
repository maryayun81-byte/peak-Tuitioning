'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'

const DAY_SCHEDULE = [
  { time: '07:30', event: 'ARRIVAL', description: 'Students settle in, review yesterday\'s work', icon: '🏫' },
  { time: '08:00', event: 'DIAGNOSE', description: 'Diagnostic assessment identifies current gaps', icon: '🔍' },
  { time: '09:15', event: 'PRACTICE', description: 'Targeted practice based on diagnostic data', icon: '✏️' },
  { time: '10:30', event: 'FEEDBACK', description: 'Real-time correction and teacher guidance', icon: '💬' },
  { time: '12:00', event: 'APPLICATION', description: 'Apply learning to exam-style questions', icon: '📝' },
  { time: '13:30', event: 'REVIEW', description: 'Progress review and next steps planning', icon: '📈' },
]

export function CampusSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [activeEvent, setActiveEvent] = useState(0)

  return (
    <section id="campus" ref={ref} className="relative py-12 md:py-16 overflow-hidden bg-slate-50">
      <div className="relative z-10 landing-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-8 md:mb-10"
        >
          <span className="peak-label peak-label-cyan mb-4 block">THE PEAK CAMPUS</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            A Day at
            <br />
            <span className="text-peak-green">Peak.</span>
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-[2px] bg-slate-200 md:-translate-x-1/2" />

          <div className="space-y-8">
            {DAY_SCHEDULE.map((item, i) => (
              <motion.div
                key={item.time}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + i * 0.1 }}
                className={`relative flex items-start gap-6 md:gap-0 ${
                  i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
                onMouseEnter={() => setActiveEvent(i)}
              >
                {/* Content */}
                <div className={`flex-1 md:w-1/2 ${i % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                  <div className={`
                    bg-white border rounded-xl p-5 transition-all duration-300
                    ${activeEvent === i
                      ? 'border-peak-green/30 shadow-lg'
                      : 'border-slate-200'
                    }
                  `}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">{item.icon}</span>
                      <span className="peak-mono text-xs text-peak-green font-bold">{item.time}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-wider mb-1">{item.event}</h3>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                </div>

                {/* Node */}
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-10">
                  <div className={`
                    w-4 h-4 rounded-full transition-all duration-300
                    ${activeEvent === i
                      ? 'bg-peak-green scale-150 shadow-lg'
                      : 'bg-white border-2 border-slate-300'
                    }
                  `} />
                </div>

                {/* Spacer for other side */}
                <div className="hidden md:block flex-1 md:w-1/2" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}