'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export interface OnboardingStep {
  title: string
  subtitle: string
  description: string
  visual: React.ReactNode
  accent: string   // tailwind color class e.g. 'emerald'
}

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  steps: OnboardingStep[]
  finishLabel?: string
}

export function OnboardingModal({ isOpen, onClose, steps, finishLabel = 'Get Started' }: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  const current = steps[step]
  const isLast = step === steps.length - 1

  const next = () => isLast ? onClose() : setStep(s => s + 1)
  const prev = () => setStep(s => s - 1)

  return (
    <Modal isOpen={isOpen} onClose={onClose} closable={false} size="lg">
      <div className="relative overflow-hidden rounded-3xl">
        {/* Skip button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <X size={16} />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {/* Visual Panel */}
            <div className={`relative h-56 flex items-center justify-center overflow-hidden bg-gradient-to-br ${accentGradient(current.accent)}`}>
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 left-8 w-32 h-32 rounded-full bg-white/30 blur-2xl" />
                <div className="absolute bottom-4 right-8 w-24 h-24 rounded-full bg-white/20 blur-xl" />
              </div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="relative z-10"
              >
                {current.visual}
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Step badge */}
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1 rounded-full bg-${current.accent}-500/10 text-${current.accent}-600 border border-${current.accent}-500/20`}>
                  Step {step + 1} of {steps.length}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{current.subtitle}</span>
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter leading-tight">
                  {current.title}
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {current.description}
                </p>
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-2 pt-1">
                {steps.map((_, i) => (
                  <button key={i} onClick={() => setStep(i)} className="focus:outline-none">
                    <motion.div
                      animate={{ width: i === step ? 28 : 8 }}
                      className={`h-2 rounded-full transition-colors ${i === step ? `bg-${current.accent}-500` : i < step ? `bg-${current.accent}-200` : 'bg-slate-200'}`}
                    />
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {step > 0 && (
                  <Button
                    variant="secondary"
                    onClick={prev}
                    className="h-12 px-5 rounded-2xl font-black text-xs uppercase tracking-widest border-slate-200 gap-2"
                  >
                    <ChevronLeft size={15} /> Back
                  </Button>
                )}
                <Button
                  onClick={next}
                  className={`flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 bg-${current.accent}-600 hover:bg-${current.accent}-700 text-white shadow-lg shadow-${current.accent}-500/25 border-none`}
                >
                  {isLast ? finishLabel : 'Continue'} <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Modal>
  )
}

function accentGradient(accent: string) {
  const map: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-600',
    indigo:  'from-indigo-500 to-purple-600',
    amber:   'from-amber-400 to-orange-500',
    rose:    'from-rose-500 to-pink-600',
    sky:     'from-sky-500 to-cyan-600',
    violet:  'from-violet-500 to-purple-700',
  }
  return map[accent] ?? 'from-slate-600 to-slate-800'
}
