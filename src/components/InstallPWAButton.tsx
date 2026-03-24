'use client'

import { Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePWAStore } from '@/stores/pwaStore'
import { Button } from '@/components/ui/Button'

interface InstallPWAButtonProps {
  variant?: 'minimal' | 'full'
  className?: string
}

export function InstallPWAButton({ variant = 'full', className = '' }: InstallPWAButtonProps) {
  const { installPrompt, setInstallPrompt, isStandalone, isIOS } = usePWAStore()

  // Don't show if already installed (standalone)
  if (isStandalone) return null

  const handleInstallClick = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
    }
  }

  // If no prompt yet, but we're in a browser that supports it or iOS
  // (We only show the button if installPrompt exists for Chrome/Android, 
  // or a special hint for iOS but the hint is handled separately)
  if (!installPrompt && !isIOS) return null

  if (isIOS) {
    // We could show a specific iOS "How to install" button here if we want, 
    // but usually, a floating hint is better. 
    // For now, let's keep it consistent with the desktop/android button if we can trigger something, 
    // but iOS doesn't have a programmatic prompt.
    return null 
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        {variant === 'full' ? (
          <Button
            onClick={handleInstallClick}
            className={`flex px-4 py-2 rounded-xl text-sm font-bold text-white items-center gap-2 hover:opacity-90 transition-all bg-gradient-to-r from-emerald-500 to-teal-600 border-none shadow-lg shadow-emerald-500/20 ${className}`}
          >
            <Zap size={14} className="fill-white" />
            Install App
          </Button>
        ) : (
          <button
            onClick={handleInstallClick}
            className={`p-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all ${className}`}
            title="Install App"
          >
            <Zap size={18} className="fill-emerald-600" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
