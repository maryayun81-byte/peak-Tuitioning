'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SplashScreenProps {
  storageKey?: string
  role?: 'teacher' | 'admin' | 'student' | 'parent' | 'landing'
  done?: boolean
}

const ROLE_LABELS = {
  teacher: 'Teacher Portal',
  admin: 'Admin Portal',
  student: 'Student Portal',
  parent: 'Parent Portal',
  landing: 'Tutoring',
}

export function SplashScreen({ storageKey, role = 'landing', done: manualDone }: SplashScreenProps) {
  const [internalVisible, setInternalVisible] = useState(false)
  
  // If manualDone is provided, we respect that. 
  // If not, we use storageKey/timer logic.
  const isSelfManaged = manualDone !== undefined
  const isVisible = isSelfManaged ? !manualDone : internalVisible

  useEffect(() => {
    // HARD DISMISS: Senior Engineer safety - never lock out the user
    // No matter what happens with auth or RLS, hide the splash after 4 seconds
    const hardDismiss = setTimeout(() => {
      setInternalVisible(false)
    }, 4000)

    if (isSelfManaged) return () => clearTimeout(hardDismiss)

    if (storageKey) {
      const seen = sessionStorage.getItem(storageKey)
      if (!seen) {
        setInternalVisible(true)
        sessionStorage.setItem(storageKey, '1')
        const t = setTimeout(() => setInternalVisible(false), 3000)
        return () => { clearTimeout(t); clearTimeout(hardDismiss); }
      }
    } else {
      setInternalVisible(true)
      const t = setTimeout(() => setInternalVisible(false), 3000)
      return () => { clearTimeout(t); clearTimeout(hardDismiss); }
    }
  }, [storageKey, isSelfManaged])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: '#0B0F1A' }}
        >
          <div className="text-center">
            {/* Logo mark */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15, delay: 0.2 }}
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/20"
              style={{ background: 'white', overflow: 'hidden' }}
            >
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-3xl font-bold mb-2 tracking-tight"
              style={{ color: 'white' }}
            >
              Peak Performance
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-lg font-medium mb-10"
              style={{ color: '#4F8CFF' }}
            >
              {ROLE_LABELS[role]}
            </motion.p>

            {/* Loader bar */}
            <motion.div
              className="w-48 h-1 rounded-full mx-auto overflow-hidden bg-white/10"
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #4F8CFF, #22D3EE)' }}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.2, delay: 0.3, ease: 'easeOut' }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
