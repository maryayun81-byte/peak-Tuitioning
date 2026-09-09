'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, CheckCircle2, Sparkles } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const FEATURES = [
  'Your weekly timetable',
  'Learning missions',
  'Teacher-guided sessions',
  'Self-study plans',
  'Peak Coach',
  'Assignments and feedback',
  'Progress tracking',
]

const STORAGE_KEY = 'peak_homeschool_onboarding_done'

export function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function HomeschoolOnboardingModal({ isOpen, onClose }: Props) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setStep(0)
    }
  }, [isOpen])

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal isOpen={isOpen} onClose={handleClose} closable={false} size="sm">
          <div className="text-center space-y-6 py-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 12 }}
              className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/30"
            >
              <GraduationCap size={36} className="text-white" />
            </motion.div>

            <div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-xl font-black"
                style={{ color: 'var(--text)' }}
              >
                Your Homeschooling Program is ready.
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-sm font-semibold text-muted mt-2"
              >
                We&apos;ve prepared your personalized learning space.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2.5 text-left mx-auto max-w-xs"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">You&apos;ll find:</p>
              {FEATURES.map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-500/15 shrink-0">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{feature}</span>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="pt-2"
            >
              <Link href="/student/homeschooling" onClick={handleClose}>
                <Button className="w-full rounded-xl">
                  <Sparkles size={16} /> Explore My Program
                </Button>
              </Link>
            </motion.div>
          </div>
        </Modal>
      )}
    </AnimatePresence>
  )
}
