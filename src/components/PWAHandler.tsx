'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'
import { usePWAStore } from '@/stores/pwaStore'

export function PWAHandler() {
  const { setInstallPrompt, isIOS, setIsIOS, isStandalone, setIsStandalone } = usePWAStore()

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent
      const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
      setIsIOS(ios)
      
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
      setIsStandalone(standalone)
      
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
    }
  }, [setInstallPrompt, setIsIOS, setIsStandalone])

  return (
    <AnimatePresence>
      {isIOS && !isStandalone && (
        <IOSInstallHint />
      )}
    </AnimatePresence>
  )
}

function IOSInstallHint() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[min(calc(100%-3rem),360px)]"
    >
      <div 
        className="p-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{ 
          background: 'rgba(11,15,26,0.95)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Zap className="text-emerald-500 fill-emerald-500/20" size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-white text-xs mb-1 uppercase tracking-widest leading-none">Install App</h4>
            <p className="text-[10px] text-white/50 leading-tight font-medium">
              Tap the share icon <span className="inline-flex items-center align-middle mx-0.5"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/IOS_share_icon.png" className="w-3.5 h-3.5 invert opacity-80" alt="share" /></span> then select <span className="text-white font-black underline decoration-emerald-500 decoration-2 underline-offset-4">"Add to Home Screen"</span> for the best experience.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
