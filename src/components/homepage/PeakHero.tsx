'use client'

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { BarChart3, Target, TrendingUp, BadgeCheck, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const LEAK_CAUSES = [
  'CONTENT GAP',
  'SPEED',
  'CONFIDENCE',
  'EXAM TECHNIQUE',
  'CARELESSNESS',
  'WEAK FOUNDATIONS',
  'INCONSISTENT PRACTICE',
]

export function PeakHero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const y = useTransform(scrollYProgress, [0, 0.5], [0, -50])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])

  const [phase, setPhase] = useState<'initial' | 'scanning' | 'detected'>('initial')
  const [highlightedCause, setHighlightedCause] = useState<number | null>(null)

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase('scanning'), 1500)
    const timer2 = setTimeout(() => {
      setHighlightedCause(5)
      setPhase('detected')
    }, 3500)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative overflow-hidden bg-white lg:min-h-[90vh]">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(22, 163, 74, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37, 99, 235, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <motion.div
        style={{ opacity, y, scale }}
        className="relative z-10 landing-container pt-20 sm:pt-24 pb-10 sm:pb-16 min-h-0 lg:min-h-[90vh] flex flex-col justify-center"
      >
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div className="space-y-5 lg:space-y-7">
            {/* Diagnostic label */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-[2px] bg-peak-green" />
              <span className="font-bold text-slate-900 text-xs uppercase tracking-[0.15em]">Peak Performance Tutoring</span>
            </motion.div>

            {/* Main headline — single H1 for SEO */}
            <div className="space-y-2">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-slate-900 leading-[0.95]"
              >
                EVERY LOST MARK{' '}
                <span className="text-peak-green">HAS A CAUSE.</span>
              </motion.h1>
            </div>

            {/* Subhead — the promise, immediately */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-lg"
            >
              We diagnose what&apos;s really holding your child back — then build a focused route to fix it. Marks actually move.
            </motion.p>

            {/* CTAs — never gated behind animation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 pt-1"
            >
              <a
                href="https://wa.me/254798971625?text=Hello%20Peak%20Performance%20Tutoring%2C%20I%20would%20like%20to%20ask%20about%20KCSE%20or%20CBC%20tuition."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#25D366] text-white text-sm font-bold uppercase tracking-wider rounded-xl hover:shadow-lg transition-all min-h-[48px]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp Us
              </a>
              <button
                onClick={() => document.getElementById('inquiry-modal')?.classList.remove('hidden')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-slate-300 text-slate-700 text-sm font-bold uppercase tracking-wider rounded-xl hover:border-peak-green hover:text-peak-green transition-all min-h-[48px]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Free Inquiry
              </button>
            </motion.div>

            {/* Pause beat */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="h-[2px] w-16 bg-slate-300"
            />
            {/* Founder story */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.8 }}
              className="relative"
            >
              <p
                className="text-lg sm:text-xl text-slate-700 leading-relaxed max-w-lg mb-3"
                
              >
                Peak was established in 2022 with a simple belief:
                <span className="font-semibold text-peak-green"> students can improve</span> when we find the real cause.
              </p>
              {/* Why Peak? — premium proof card */}
              <div className="w-full rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-white p-5 sm:p-6 lg:p-8 shadow-[0_24px_60px_-24px_rgba(22,163,74,0.35)]">
                <div className="flex items-center gap-3 mb-5">
                  <span className="grid h-10 w-10 lg:h-12 lg:w-12 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
                    <BadgeCheck size={20} />
                  </span>
                  <span>
                    <span className="block text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-slate-900 leading-tight">
                      Why Peak?
                    </span>
                    <span className="block text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">
                      Diagnosis before tuition
                    </span>
                  </span>
                </div>
                <div className="space-y-3 lg:space-y-4">
                  {[
                    { title: 'We diagnose first', desc: 'Every learner assessed before placement' },
                    { title: 'We fix the root cause', desc: 'Causal repair, not topical revision' },
                    { title: 'Marks actually move', desc: 'Tracked session by session' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-500" />
                      <span>
                        <span className="block text-sm sm:text-base lg:text-lg font-bold text-slate-900 leading-snug">
                          {item.title}
                        </span>
                        <span className="block text-xs sm:text-sm text-slate-500 leading-relaxed">
                          {item.desc}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div className="w-8 h-[2px] bg-emerald-500" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Est. 2022 · Nairobi
                </span>
              </div>

              <p className="leading-relaxed max-w-xl text-slate-600 text-xl sm:text-2xl pt-2" style={{ fontFamily: "'Caveat', cursive" }}>
                Sometimes it&apos;s a gap in understanding, sometimes a lack of practice, confidence, consistency, or the right support. Our job is to identify what&apos;s holding each student back and help them move forward.
              </p>
            </motion.div>

            {/* Second line */}
            {/* Second line */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-500 tracking-tight"
            >
              SOMETHING IS GETTING
              <br />
              <span className="text-peak-green">IN THE WAY.</span>
            </motion.h2>

            {/* Diagnostic scan — causes */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="space-y-2 pt-2"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">SCANNING POTENTIAL CAUSES</div>
              <div className="flex flex-wrap gap-2">
                {LEAK_CAUSES.map((cause, i) => (
                  <motion.div
                    key={cause}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                      opacity: highlightedCause === i ? 1 : phase === 'scanning' ? [0.3, 0.8, 0.3] : 0.4,
                      scale: highlightedCause === i ? 1.05 : 1,
                    }}
                    transition={
                      highlightedCause === i
                        ? { duration: 0.3 }
                        : phase === 'scanning'
                        ? { duration: 1.5, repeat: Infinity, delay: i * 0.15 }
                        : { delay: 2.2 + i * 0.1 }
                    }
                    className={`
                      px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                      border transition-all duration-500
                      ${highlightedCause === i
                        ? 'bg-red-50 border-red-300 text-red-600 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                      }
                    `}
                  >
                    {cause}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Primary leak detected */}
            <AnimatePresence>
              {phase === 'detected' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[11px] font-bold tracking-wider text-red-500 uppercase">
                      PRIMARY LEAK DETECTED
                    </span>
                  </div>

                  {/* Paper card with torn edge */}
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="relative"
                  >
                    <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                      {/* Torn paper top edge */}
                      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-red-100 to-transparent" />
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">ROOT CAUSE</div>
                      <div className="text-lg font-bold text-red-600">WEAK ALGEBRAIC FOUNDATIONS</div>
                    </div>
                    {/* Shredded bottom edge */}
                    <svg className="w-full h-3 -mt-px" viewBox="0 0 400 12" preserveAspectRatio="none">
                      <path d="M0,0 L8,8 L16,2 L24,10 L32,4 L40,9 L48,1 L56,7 L64,3 L72,10 L80,2 L88,8 L96,4 L104,9 L112,1 L120,7 L128,3 L136,10 L144,2 L152,8 L160,4 L168,9 L176,1 L184,7 L192,3 L200,10 L208,2 L216,8 L224,4 L232,9 L240,1 L248,7 L256,3 L264,10 L272,2 L280,8 L288,4 L296,9 L304,1 L312,7 L320,3 L328,10 L336,2 L344,8 L352,4 L360,9 L368,1 L376,7 L384,3 L392,10 L400,0 L400,12 L0,12 Z" fill="white" />
                    </svg>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Right: premium campus showcase */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative flex justify-center lg:justify-end lg:sticky lg:top-24 lg:self-start"
          >
            {/* Ambient glow */}
            <div
              className="absolute -inset-6 sm:-inset-8 rounded-[48px] pointer-events-none"
              aria-hidden="true"
              style={{
                background: 'linear-gradient(135deg, rgba(22,163,74,0.16), transparent 45%, rgba(37,99,235,0.16))',
                filter: 'blur(32px)',
              }}
            />

            {/* Showcase card */}
            <div className="relative w-full max-w-[420px] sm:max-w-[500px] lg:max-w-[560px] xl:max-w-[640px] overflow-hidden rounded-[28px] bg-slate-950 shadow-[0_32px_80px_-24px_rgba(2,6,23,0.5)] ring-1 ring-slate-950/10">
              {/* Image */}
              <div className="relative">
                <Image
                  src="/peak-hero-classroom.png"
                  alt="Students learning in a Peak Performance diagnostic classroom"
                  className="w-full h-[280px] sm:h-[340px] lg:h-[430px] xl:h-[500px] object-cover"
                  width={1000}
                  height={750}
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" aria-hidden="true" />

                {/* Top badges */}
                <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white backdrop-blur-md ring-1 ring-white/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Peak Campus
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/90 backdrop-blur-md ring-1 ring-white/20">
                    Est. 2022 · Nairobi
                  </span>
                </div>

                {/* Headline over image */}
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <p className="text-2xl sm:text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
                    Diagnostic Learning Centre
                  </p>
                  <p className="mt-2 max-w-md text-sm sm:text-[15px] leading-relaxed text-slate-200/90">
                    Small focused groups. Every lost mark traced to its cause — then fixed with a personal plan.
                  </p>
                </div>
              </div>

              {/* Proof bar */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 bg-slate-950 px-6 py-5 sm:px-8">
                {[
                  { icon: BarChart3, title: 'Real-time tracking', desc: 'Every session measured' },
                  { icon: Target, title: 'Personalised plans', desc: 'Built per learner' },
                  { icon: TrendingUp, title: 'Measurable results', desc: 'Marks actually move' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/20">
                      <Icon size={16} />
                    </span>
                    <span>
                      <span className="block text-[13px] font-bold leading-tight text-white">{title}</span>
                      <span className="block text-[11px] font-medium leading-tight text-slate-400">{desc}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating result badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.6 }}
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:-right-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_16px_40px_-12px_rgba(2,6,23,0.35)] ring-1 ring-slate-900/5 whitespace-nowrap"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500 text-white">
                <BadgeCheck size={16} />
              </span>
              <span>
                <span className="block text-[13px] font-black leading-tight text-slate-900">This is Peak.</span>
                <span className="block text-[11px] font-medium leading-tight text-slate-500">Diagnosis before tuition</span>
              </span>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10" />
    </div>
  )
}            {/* Main story text — handwritten */}
