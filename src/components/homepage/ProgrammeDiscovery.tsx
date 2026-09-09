'use client'

import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'

const GRADES = [
  { grade: 'GRADE 4', level: 'junior', subjects: ['Mathematics', 'English', 'Science', 'Social Studies'] },
  { grade: 'GRADE 5', level: 'junior', subjects: ['Mathematics', 'English', 'Science', 'Social Studies'] },
  { grade: 'GRADE 6', level: 'junior', subjects: ['Mathematics', 'English', 'Science', 'Social Studies'] },
  { grade: 'GRADE 7', level: 'junior', subjects: ['Mathematics', 'English', 'Science', 'Social Studies', 'Pre-Technical'] },
  { grade: 'GRADE 8', level: 'junior', subjects: ['Mathematics', 'English', 'Science', 'Social Studies', 'Pre-Technical'] },
  { grade: 'GRADE 9', level: 'junior', subjects: ['Mathematics', 'English', 'Science', 'Social Studies', 'Pre-Technical'] },
  { grade: 'GRADE 10', level: 'senior', subjects: ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology'] },
  { grade: 'FORM 3', level: '844', subjects: ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History'] },
  { grade: 'FORM 4', level: '844', subjects: ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History'] },
]

const TIERS = [
  {
    name: 'CLIMBERS',
    subtitle: 'FOUNDATION',
    trajectory: ['FOUNDATION', 'CONFIDENCE', 'CONSISTENCY', 'GROWTH'],
    color: 'green',
    description: 'For students building fundamental understanding.',
  },
  {
    name: 'MOMENTUM BUILDERS',
    subtitle: 'APPLICATION',
    trajectory: ['UNDERSTANDING', 'APPLICATION', 'SPEED', 'ACCURACY'],
    color: 'blue',
    description: 'For students ready to accelerate.',
  },
  {
    name: 'PEAK PERFORMERS',
    subtitle: 'MASTERY',
    trajectory: ['PRECISION', 'PRESSURE', 'MASTERY', 'EXCELLENCE'],
    color: 'cyan',
    description: 'For students aiming for top grades.',
  },
]

export function ProgrammeDiscovery() {
  const [selectedGrade, setSelectedGrade] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const currentGrade = GRADES[selectedGrade]

  return (
    <section id="programmes" ref={ref} className="relative py-12 md:py-16 overflow-hidden bg-white">
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-8 md:mb-10"
        >
          <span className="peak-label peak-label-blue mb-4 block">PROGRAMMES</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            Where Are You on
            <br />
            <span className="text-peak-green">The Climb?</span>
          </h2>
        </motion.div>

        {/* Grade selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar justify-start lg:justify-center">
            {GRADES.map((grade, i) => (
              <button
                key={grade.grade}
                onClick={() => setSelectedGrade(i)}
                className={`
                  flex-shrink-0 px-4 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider
                  transition-all duration-300
                  ${selectedGrade === i
                    ? 'bg-peak-green text-white shadow-lg'
                    : 'bg-slate-100 border border-slate-200 text-slate-600 hover:border-peak-green/30'
                  }
                `}
              >
                {grade.grade}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Grade detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedGrade}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-10"
          >
            {/* Subjects */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-peak-green/10 border border-peak-green/20 flex items-center justify-center">
                  <span className="text-lg">📚</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900">{currentGrade.grade}</div>
                  <div className="peak-label text-slate-500">
                    {currentGrade.level === 'junior' ? 'CBC CURRICULUM' : currentGrade.level === '844' ? '8-4-4 CURRICULUM' : 'SENIOR PROGRAMME'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {currentGrade.subjects.map((subject, i) => (
                  <motion.div
                    key={subject}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-lg"
                  >
                    <div className="w-2 h-2 rounded-full bg-peak-green/40" />
                    <span className="text-sm text-slate-900">{subject}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Programme structure */}
            <div className="space-y-4">
              <div className="peak-label text-slate-500 mb-4">PROGRAMME STRUCTURE</div>
              {[
                { label: 'DIAGNOSTIC ASSESSMENT', desc: 'Identify current level and gaps' },
                { label: 'PERSONALISED LEARNING PLAN', desc: 'Targeted route based on diagnosis' },
                { label: 'WEEKLY PRACTICE SESSIONS', desc: 'Focused practice with feedback' },
                { label: 'PROGRESS TRACKING', desc: 'Measurable improvement each cycle' },
                { label: 'PARENT REPORTS', desc: 'Regular updates on performance' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-4 p-4 bg-white/50 border border-slate-200/30 rounded-xl"
                >
                  <div className="w-6 h-6 rounded-full bg-peak-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="peak-mono text-[10px] text-peak-blue font-bold">{i + 1}</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{item.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Tiers */}
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.4 }}
            className="text-center mb-12"
          >
            <span className="peak-label peak-label-green">PEAK TIERS</span>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 + i * 0.15 }}
                className={`
                  relative p-6 rounded-2xl overflow-hidden
                  ${tier.color === 'green' ? 'bg-peak-green/5 border border-peak-green/15' : ''}
                  ${tier.color === 'blue' ? 'bg-peak-blue/5 border border-peak-blue/15' : ''}
                  ${tier.color === 'cyan' ? 'bg-peak-cyan/5 border border-peak-cyan/15' : ''}
                `}
              >
                {/* Glow */}
                <div className={`
                  absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none
                  ${tier.color === 'green' ? 'bg-peak-green/10' : ''}
                  ${tier.color === 'blue' ? 'bg-peak-blue/10' : ''}
                  ${tier.color === 'cyan' ? 'bg-peak-cyan/10' : ''}
                `} />

                <div className="relative">
                  <div className="text-xs font-bold tracking-wider text-slate-500 mb-1">{tier.subtitle}</div>
                  <h3 className={`text-lg font-bold mb-2 ${
                    tier.color === 'green' ? 'text-peak-green' : ''
                  }${tier.color === 'blue' ? 'text-peak-blue' : ''}${tier.color === 'cyan' ? 'text-peak-cyan' : ''}`}>
                    {tier.name}
                  </h3>
                  <p className="text-xs text-slate-500 mb-6">{tier.description}</p>

                  {/* Trajectory */}
                  <div className="space-y-2">
                    {tier.trajectory.map((step, j) => (
                      <div key={step} className="flex items-center gap-2">
                        <div className={`
                          w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold
                          ${j === tier.trajectory.length - 1
                            ? `${tier.color === 'green' ? 'bg-peak-green text-white' : ''}${tier.color === 'blue' ? 'bg-peak-blue text-white' : ''}${tier.color === 'cyan' ? 'bg-peak-cyan text-white' : ''}`
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }
                        `}>
                          {j + 1}
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 tracking-wider">{step}</span>
                        {j < tier.trajectory.length - 1 && (
                          <svg className="w-3 h-3 text-slate-300 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}