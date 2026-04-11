'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, WifiOff, AlertTriangle, RefreshCw, Activity } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const PROTECTED_ROUTES = ['/teacher', '/student', '/parent', '/finance', '/admin']

/**
 * HydrationGuard
 * The "Iron Gate" for military-grade portal reliability.
 * 
 * Upgraded with "Rescue Mode":
 * If the connection to Supabase holds for too long (>15s), provides 
 * diagnostic tools instead of a blank screen.
 */
export function HydrationGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isInitialRevalidationComplete, reset } = useAuthStore()
  const [showDiagnostic, setShowDiagnostic] = useState(false)
  const [diagnosticTime, setDiagnosticTime] = useState(0)

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))

  // Safety Timer: If handshake takes too long, offer diagnostics
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isProtectedRoute && !isInitialRevalidationComplete) {
      const timer = setTimeout(() => {
        setShowDiagnostic(true)
      }, 15000)

      interval = setInterval(() => {
        setDiagnosticTime(prev => prev + 1)
      }, 1000)

      return () => {
        clearTimeout(timer)
        clearInterval(interval)
      }
    } else {
      setShowDiagnostic(false)
      setDiagnosticTime(0)
    }
  }, [isProtectedRoute, isInitialRevalidationComplete])

  const handleForceRefresh = () => {
    window.location.reload()
  }

  const handleLogoutBypass = () => {
    reset()
    router.push('/auth/login')
  }

  // If not a protected route, just render children
  if (!isProtectedRoute) {
    return <>{children}</>
  }

  // If auth isn't settled yet, show initialization OR diagnostic
  if (!isInitialRevalidationComplete) {
    return (
      <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#0B0F1A]">
        <AnimatePresence mode="wait">
          {!showDiagnostic ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="relative flex flex-col items-center"
            >
              {/* Animated Brain Logo */}
              <div className="relative mb-8">
                 <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse" />
                 <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary via-[#818CF8] to-[#38BDF8] p-0.5 shadow-2xl shadow-primary/20 relative z-10 flex items-center justify-center">
                    <div className="w-full h-full rounded-[1.85rem] bg-[#0B0F1A] flex items-center justify-center overflow-hidden relative">
                       <div className="absolute inset-0 bg-white/5" />
                       <BrainCircuit className="text-white w-10 h-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                    </div>
                 </div>
              </div>

              <div className="text-center space-y-2 relative z-10">
                <h1 className="text-white font-black text-xl italic uppercase tracking-[0.2em]">
                  Security Handshake
                </h1>
                <div className="flex items-center justify-center gap-1.5">
                   <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                   <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '200ms' }} />
                   <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '400ms' }} />
                </div>
                <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-widest pt-4 opacity-40">
                  Initializing Reliable Environment
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="diagnostic"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md w-full px-6"
            >
              <Card className="p-8 border-t-4 border-t-yellow-500 bg-[#161B22]/80 backdrop-blur-xl border-white/5">
                 <div className="flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                       <WifiOff size={32} />
                    </div>
                    
                    <div className="space-y-2">
                       <h2 className="text-xl font-black text-white uppercase tracking-tight">Handshake Timeout</h2>
                       <p className="text-sm text-[#94A3B8] leading-relaxed">
                          Your connection to our secure gateway is taking longer than expected ({diagnosticTime}s). 
                          This usually happens due to temporary network instability.
                       </p>
                    </div>

                    <div className="w-full space-y-3 pt-4 border-t border-white/5">
                       <Button 
                         onClick={handleForceRefresh} 
                         className="w-full bg-white text-black hover:bg-white/90 font-bold h-12 rounded-xl"
                       >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry Handshake
                       </Button>
                       <Button 
                         variant="ghost" 
                         onClick={handleLogoutBypass}
                         className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/5 font-bold h-12 rounded-xl"
                       >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Emergency Session Reset
                       </Button>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-[#94A3B8] opacity-50 uppercase tracking-widest pt-2">
                       <Activity size={12} className="text-emerald-500 animate-pulse" />
                       Systems are healthy — checking local connection
                    </div>
                 </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle scanline effect for technical feel */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>
    )
  }

  // Auth settled — render the portal page cleanly
  return <>{children}</>
}
