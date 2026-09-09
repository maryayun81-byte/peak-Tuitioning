'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const STORY_STEPS = [
  {
    id: 'problem',
    label: 'THE PROBLEM',
    headline: 'More tuition isn\'t automatically better.',
    description: 'Students attend classes, complete worksheets, and still lose marks in the same areas. The issue isn\'t effort. It\'s direction.',
    color: 'red',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    id: 'diagnosis',
    label: 'THE DIAGNOSIS',
    headline: 'First, we find the leak.',
    description: 'Every student has specific barriers preventing progress. A content gap looks different from a confidence problem. We identify which one it is.',
    color: 'amber',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    id: 'match',
    label: 'THE MATCH',
    headline: 'Then we place the learner where they can grow.',
    description: 'Not all students need the same thing. We match each learner with the right programme, pace, and support level.',
    color: 'blue',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    id: 'work',
    label: 'THE WORK',
    headline: 'Students don\'t just listen. They produce.',
    description: 'Active problem-solving, timed practice, and real exam conditions. Learning happens through doing, not watching.',
    color: 'cyan',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
  },
  {
    id: 'feedback',
    label: 'THE FEEDBACK',
    headline: 'Every mistake becomes information.',
    description: 'Errors are categorised, tracked, and fed back into the learning plan. Nothing is wasted.',
    color: 'green',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
  {
    id: 'measurement',
    label: 'THE MEASUREMENT',
    headline: 'Every cycle leaves evidence.',
    description: 'Progress is tracked quantitatively. Parents receive clear updates. Teachers see real data. No guesswork.',
    color: 'blue',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    id: 'transformation',
    label: 'THE TRANSFORMATION',
    headline: 'Marks move. Confidence follows.',
    description: 'When the system works, results speak. Students don\'t just improve — they understand why they improved.',
    color: 'green',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
]

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', dot: 'bg-red-500' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', dot: 'bg-amber-500' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', dot: 'bg-blue-500' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', dot: 'bg-cyan-500' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', dot: 'bg-green-500' },
}

export function StoryTransition() {
  return (
    <section className="relative py-12 md:py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="peak-label peak-label-green mb-4 block">HOW PEAK WORKS</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            From Diagnosis to <span className="text-peak-green">Transformation.</span>
          </h2>
        </div>

        {/* Steps grid — 2 cols on desktop, 1 on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STORY_STEPS.map((step, i) => (
            <StoryCard key={step.id} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StoryCard({ step, index }: { step: (typeof STORY_STEPS)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const colors = COLOR_MAP[step.color]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`relative flex items-start gap-4 p-5 rounded-xl border ${colors.border} ${colors.bg} transition-all hover:shadow-sm`}
    >
      {/* Step number + icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${colors.dot} flex items-center justify-center`}>
        <span className="text-white">{step.icon}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="peak-mono text-[10px] text-slate-400">{String(index + 1).padStart(2, '0')}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>{step.label}</span>
        </div>
        <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1">{step.headline}</h3>
        <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
      </div>
    </motion.div>
  )
}