'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, AlertTriangle, RefreshCw, Activity } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SyncStatusOverlay } from './SyncStatusOverlay'

const PROTECTED_ROUTES = ['/teacher', '/student', '/parent', '/finance', '/admin']

/**
 * HydrationGuard (Military-Grade Progressive Edition)
 * 
 * Unlike the previous blocking version, this edition renders the portal shell
 * IMMEDIATELY to provide a "slick, flawless" perception of speed. 
 * It manages background revalidation transparency via a non-blocking overlay.
 */
export function HydrationGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isInitialRevalidationComplete, reset } = useAuthStore()
  const [showDiagnostic, setShowDiagnostic] = useState(false)
  const [diagnosticTime, setDiagnosticTime] = useState(0)

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))

  // Safety Timer: If handshake takes too long (>15s), offer diagnostics
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

  // 1. Transparent Mounting: If not a protected route, or if we want progressive loading
  // we render the children. Protected portal shells will handle their own internal skeletons.
  const shouldRenderContent = true // Always true in Progressive edition

  return (
    <>
      {/* 2. Background Sync Indicator (Non-blocking) */}
      <SyncStatusOverlay 
        isVisible={isProtectedRoute && !isInitialRevalidationComplete && !showDiagnostic} 
        status="Securing Connection..."
      />

      {/* 3. Serious Connectivity Failure UI (Only blocks after 15s hang) */}
      <AnimatePresence>
        {showDiagnostic && (
          <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-[#0B0F1A]/95 backdrop-blur-md px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full"
            >
              <Card className="p-8 border-t-4 border-t-yellow-500 bg-[#161B22] border-white/5 shadow-2xl">
                 <div className="flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                       <WifiOff size={32} />
                    </div>
                    
                    <div className="space-y-2">
                       <h2 className="text-xl font-black text-white uppercase tracking-tight">Sync Delayed</h2>
                       <p className="text-sm text-[#94A3B8] leading-relaxed">
                          Your connection to our secure cloud is unstable ({diagnosticTime}s). 
                          The system is retrying, but you can force a refresh.
                       </p>
                    </div>

                    <div className="w-full space-y-3 pt-4 border-t border-white/5">
                       <Button 
                         onClick={handleForceRefresh} 
                         className="w-full bg-white text-black hover:bg-white/90 font-bold h-12 rounded-xl"
                       >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry Full Sync
                       </Button>
                       <Button 
                         variant="ghost" 
                         onClick={handleLogoutBypass}
                         className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/5 font-bold h-12 rounded-xl"
                       >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Emergency Exit
                       </Button>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-[#94A3B8] opacity-50 uppercase tracking-widest pt-2">
                       <Activity size={12} className="text-emerald-500 animate-pulse" />
                       Retrying Infrastructure Link...
                    </div>
                 </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. The Content Shell (Instantly Visible) */}
      {shouldRenderContent && children}
    </>
  )
}
