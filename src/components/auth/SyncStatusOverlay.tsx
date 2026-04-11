'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, Activity } from 'lucide-react'

interface SyncStatusOverlayProps {
  isVisible: boolean
  status?: string
}

/**
 * SyncStatusOverlay
 * A "Military-Grade" non-blocking status indicator for progressive hydration.
 * Shows at the top of the portal to inform the user of background security sync.
 */
export function SyncStatusOverlay({ isVisible, status = 'Initializing Security Layer' }: SyncStatusOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] pointer-events-none"
        >
          <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3">
             <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-sm rounded-full animate-pulse" />
                <BrainCircuit size={16} className="text-primary relative z-10" />
             </div>
             
             <div className="flex flex-col">
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black uppercase tracking-wider text-white">
                      {status}
                   </span>
                   <div className="flex gap-0.5">
                      <motion.span 
                        animate={{ opacity: [0.3, 1, 0.3] }} 
                        transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
                        className="w-1 h-1 rounded-full bg-primary" 
                      />
                      <motion.span 
                        animate={{ opacity: [0.3, 1, 0.3] }} 
                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                        className="w-1 h-1 rounded-full bg-primary" 
                      />
                      <motion.span 
                        animate={{ opacity: [0.3, 1, 0.3] }} 
                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                        className="w-1 h-1 rounded-full bg-primary" 
                      />
                   </div>
                </div>
                <p className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest opacity-60">
                   Background Synchronization Active
                </p>
             </div>

             <div className="w-px h-6 bg-white/5 mx-1" />

             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <Activity size={10} className="text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-500 uppercase">Cloud Link Secured</span>
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
