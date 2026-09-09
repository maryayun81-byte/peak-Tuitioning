'use client'

import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'

const FAQS = [
  {
    q: 'How does the diagnostic assessment work?',
    a: 'Every student begins with a diagnostic that maps their current understanding across key topics. We identify specific gaps, weaknesses, and patterns — not just overall level. This becomes the foundation for their personalised learning plan.',
  },
  {
    q: 'What makes Peak different from regular tuition?',
    a: 'Regular tuition repeats what school already does — same explanation, same pace, same worksheet. Peak starts by finding what\'s actually causing the lost marks, then builds a targeted route to fix it. Every session has purpose.',
  },
  {
    q: 'How do parents track progress?',
    a: 'Parents receive regular progress updates through the Parent Portal. You see exactly what changed — marks improved, practice completed, areas addressed. No guesswork, no vague reassurances.',
  },
  {
    q: 'What curriculums do you support?',
    a: 'Peak supports both CBC (Grades 4–9) and 8-4-4 (Form 3–4) curriculums, plus senior programme (Grade 10). Each curriculum has its own adapted diagnostic and learning system.',
  },
  {
    q: 'How are classes structured?',
    a: 'Classes are small and focused. Students are grouped by learning need, not just age or grade. Each session follows the Peak cycle: diagnose, practice, feedback, measure.',
  },
]

export function FAQSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section ref={ref} className="relative py-12 md:py-16 overflow-hidden bg-white">
      <div className="relative z-10 max-w-3xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-8 md:mb-10"
        >
          <span className="peak-label peak-label-blue mb-4 block">QUESTIONS</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            What Parents Ask.
          </h2>
        </motion.div>

        {/* FAQs */}
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.08 }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full text-left bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-peak-green/30 hover:bg-white transition-all duration-300"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-900">{faq.q}</span>
                  <motion.div
                    animate={{ rotate: openIndex === i ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center"
                  >
                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </motion.div>
                </div>

                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}