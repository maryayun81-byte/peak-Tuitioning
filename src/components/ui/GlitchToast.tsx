'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, Zap, X, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface GlitchToastProps {
  message: string
  isVisible: boolean
  onClose: () => void
}

export function GlitchToast({ message, isVisible, onClose }: GlitchToastProps) {
  const [glitch, setGlitch] = useState(false)

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setGlitch(true)
        setTimeout(() => setGlitch(false), 150)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [isVisible])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          className="fixed bottom-10 right-10 z-[10000] w-full max-w-md overflow-hidden rounded-3xl bg-black border-2 border-rose-500/50 shadow-[0_0_50px_rgba(244,63,94,0.3)] backdrop-blur-3xl"
        >
          {/* Animated Mesh Background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/40 via-transparent to-rose-900/40" />
            <div className="absolute top-0 left-0 w-full h-px bg-rose-500 animate-[scan_2s_linear_infinite]" />
          </div>

          <div className="relative p-8 flex gap-6">
            <div className="relative shrink-0">
               <div className="w-16 h-16 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg relative z-10">
                 <ShieldAlert size={32} className={glitch ? 'animate-ping' : ''} />
               </div>
               <div className="absolute -inset-2 bg-rose-500/20 blur-xl animate-pulse" />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-500">Security Access Denied</span>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                  <X size={16} className="text-white/40" />
                </button>
              </div>
              <h4 className={`text-xl font-black uppercase tracking-tighter leading-none text-white ${glitch ? 'skew-x-12 translate-x-1' : ''}`}>
                Ecosystem Restriction
              </h4>
              <p className="text-[11px] font-medium leading-relaxed text-white/60 font-mono">
                {message}
              </p>
              
              <div className="pt-4 flex items-center gap-4">
                 <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 5 }}
                      onAnimationComplete={onClose}
                      className="h-full bg-rose-500" 
                    />
                 </div>
                 <span className="text-[8px] font-black uppercase tracking-widest text-rose-500/60">Auto-Purging Logs...</span>
              </div>
            </div>
          </div>
          
          <style jsx global>{`
            @keyframes scan {
              0% { top: 0%; opacity: 0; }
              50% { opacity: 1; }
              100% { top: 100%; opacity: 0; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
