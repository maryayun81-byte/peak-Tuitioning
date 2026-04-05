'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ShieldAlert, PenTool, Type, Eraser } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import SignaturePad from 'signature_pad'
import toast from 'react-hot-toast'

interface Assignment {
  id: string
  document_id: string
  status: string
  document: {
    title: string
    content: string
    version: string
  }
}

interface TermsEnforcementModalProps {
  assignment: Assignment
  onSuccess: () => void
}

export function TermsEnforcementModal({ assignment, onSuccess }: TermsEnforcementModalProps) {
  const supabase = getSupabaseBrowserClient()
  
  const [step, setStep] = useState<'reading' | 'signing'>('reading')
  const [signatureMode, setSignatureMode] = useState<'typed' | 'drawn'>('typed')
  const [typedName, setTypedName] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  // Handle Canvas Resizing & Theme colors — PRESERVE DATA
  const initPad = () => {
    if (!canvasRef.current || step !== 'signing' || signatureMode !== 'drawn') return
    
    const canvas = canvasRef.current
    const prevData = padRef.current ? padRef.current.toData() : null
    
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    
    const currentWidth = canvas.offsetWidth
    const currentHeight = canvas.offsetHeight
    
    if (currentWidth === 0 || currentHeight === 0) {
      return // Wait for the poller
    }
    
    if (canvas.width !== currentWidth * ratio || canvas.height !== currentHeight * ratio) {
      canvas.width = currentWidth * ratio
      canvas.height = currentHeight * ratio
      canvas.getContext('2d')?.scale(ratio, ratio)
    }

    // Detect theme colors
    const isDark = document.documentElement.className.includes('dark') || 
                   getComputedStyle(document.body).getPropertyValue('--bg').includes('#0') ||
                   getComputedStyle(document.body).getPropertyValue('--bg').includes('midnight')
    
    if (padRef.current) padRef.current.off()

    padRef.current = new SignaturePad(canvas, {
      backgroundColor: isDark ? 'rgb(15, 23, 42)' : 'rgb(248, 250, 252)',
      penColor: isDark ? 'rgb(248, 250, 252)' : 'rgb(15, 23, 42)'
    })

    // RESTORE PREVIOUS INK DATA
    if (prevData) {
      padRef.current.fromData(prevData)
    }
  }

  useEffect(() => {
    let mountPoller: NodeJS.Timeout | undefined

    if (step === 'signing' && signatureMode === 'drawn') {
      // Poll dynamically because AnimatePresence 'wait' means it might take ~300ms to mount
      mountPoller = setInterval(() => {
        if (canvasRef.current && canvasRef.current.offsetWidth > 0) {
          initPad()
          clearInterval(mountPoller)
        }
      }, 50)
    }
    
    const handleResize = () => {
      // Small debounce/throttle to avoid issues during active scroll
      if (step === 'signing' && signatureMode === 'drawn') {
        initPad()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (mountPoller) clearInterval(mountPoller)
    }
  }, [step, signatureMode])

  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      setScrolledToBottom(true)
    }
  }

  const clearDrawnSignature = () => {
    if (padRef.current) padRef.current.clear()
  }

  const handleSubmit = async () => {
    let signatureData = ''
    
    if (signatureMode === 'typed') {
      if (!typedName.trim()) {
        toast.error('Please type your full name.')
        return
      }
      signatureData = typedName.trim()
    } else {
      if (!padRef.current || padRef.current.isEmpty()) {
        toast.error('Please draw your signature.')
        return
      }
      signatureData = padRef.current.toDataURL()
    }

    if (!consentGiven) {
      toast.error('You must check the consent box.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase
      .from('document_assignments')
      .update({
        status: 'signed',
        signature_type: signatureMode,
        signature_data: signatureData,
        signed_at: new Date().toISOString()
      })
      .eq('id', assignment.id)

    if (error) {
      toast.error('Failed to submit signature.')
      setSubmitting(false)
    } else {
      toast.success('Access granted!')
      onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[var(--bg)] transition-all duration-500 overflow-hidden">
      {/* Premium Header */}
      <div className="bg-primary px-6 py-4 flex items-center justify-between text-white shrink-0 shadow-2xl z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30">
            <ShieldAlert size={22} className="animate-pulse" />
          </div>
          <div>
            <h2 className="font-black text-sm sm:text-base leading-tight uppercase tracking-[0.2em]">Mandatory Compliance</h2>
            <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">{step === 'reading' ? 'Read Document' : 'Finalize Signature'}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        <AnimatePresence mode="wait">
          {step === 'reading' ? (
            <motion.div 
               key="reading"
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="flex-1 flex flex-col min-h-0 overflow-hidden w-full"
            >
              <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 lg:p-20 layout-scroll bg-[var(--bg)] relative overscroll-contain"
              >
                  <div className="max-w-3xl mx-auto mb-10 text-center">
                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight mb-4">{assignment.document.title || 'Official Agreement'}</h1>
                    <div className="flex items-center justify-center gap-2">
                       <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-[var(--input)] text-[var(--text-muted)] border border-[var(--card-border)] uppercase tracking-wider font-mono">ID: {assignment.document.version || '1.0'}</span>
                       <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">Legal Protocol</span>
                    </div>
                  </div>

                 {/* Styled Document Content */}
                 <div className="prose dark:prose-invert prose-slate max-w-3xl mx-auto bg-[var(--card)] p-8 sm:p-12 md:p-20 rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-[var(--card-border)] leading-relaxed relative">
                    {!assignment.document.content ? (
                      <div className="flex flex-col items-center justify-center py-20 opacity-30">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="font-bold uppercase tracking-widest text-xs">Decrypting Document...</p>
                      </div>
                    ) : (
                      <div 
                        className="terms-content text-[var(--text)] text-lg"
                        dangerouslySetInnerHTML={{ __html: assignment.document.content }} 
                      />
                    )}
                    <div className="mt-20 pt-10 border-t border-[var(--card-border)] text-center italic opacity-30 text-sm">
                       End of Peak Performance Agreement
                    </div>
                 </div>

                 {/* Footer Action */}
                 <div className="max-w-3xl mx-auto mt-12 pb-20 flex flex-col items-center">
                    {!scrolledToBottom ? (
                       <div className="flex flex-col items-center gap-4 text-center">
                         <div className="w-12 h-12 rounded-full border-4 border-[var(--card-border)] border-t-primary animate-spin" />
                         <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Please Review Content to Continue</p>
                       </div>
                    ) : (
                       <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                         <Button 
                            size="lg" 
                            className="px-12 py-8 text-base font-black uppercase tracking-[0.2em] shadow-2xl rounded-2xl group relative overflow-hidden"
                            onClick={() => setStep('signing')}
                         >
                            Proceed to Identity Verification <CheckCircle2 className="ml-2 group-hover:scale-110 transition-transform" />
                         </Button>
                       </motion.div>
                    )}
                 </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
               key="signing"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: 20 }}
               className="flex-1 w-full flex flex-col p-4 sm:p-10 bg-[var(--bg)] overflow-y-auto overscroll-contain"
            >
              <div className="w-full max-w-xl mx-auto bg-[var(--card)] p-6 sm:p-12 rounded-[2.5rem] shadow-2xl border-2 border-[var(--card-border)] relative mt-4 mb-20 shrink-0">
                
                <button 
                  onClick={() => setStep('reading')}
                  className="absolute top-6 right-6 sm:top-8 sm:right-8 text-[10px] font-black text-[var(--text-muted)] hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-widest z-10"
                >
                  <Eraser size={12} className="rotate-180" /> Back to Document
                </button>

                <div className="mb-10 mt-10 sm:mt-0 text-center sm:text-left relative">
                  <h3 className="text-3xl font-black tracking-tighter mb-2 uppercase text-primary">Verification</h3>
                  <p className="text-sm text-[var(--text-muted)] font-medium">Capture your digital signature for the record.</p>
                </div>
                
                <div className="flex p-1.5 bg-[var(--input)] rounded-2xl mb-8 border border-[var(--card-border)]">
                   <button 
                     onClick={() => setSignatureMode('typed')}
                     className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${signatureMode === 'typed' ? 'bg-[var(--card)] border border-[var(--card-border)] shadow-xl text-primary' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                   >
                     <Type size={16} /> Type Name
                   </button>
                   <button 
                     onClick={() => setSignatureMode('drawn')}
                     className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${signatureMode === 'drawn' ? 'bg-[var(--card)] border border-[var(--card-border)] shadow-xl text-primary' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                   >
                     <PenTool size={16} /> Digital Ink
                   </button>
                </div>

                <AnimatePresence mode="wait">
                  {signatureMode === 'typed' ? (
                    <motion.div key="typed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                       <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Legal Signature Representation</label>
                       <Input 
                          placeholder="Type full legal name" 
                          value={typedName} 
                          onChange={e => setTypedName(e.target.value)} 
                          className="font-serif italic text-2xl tracking-wide bg-[var(--input)] border-2 border-[var(--card-border)] rounded-2xl px-6 py-10 focus:border-primary transition-all shadow-inner text-center"
                       />
                    </motion.div>
                  ) : (
                    <motion.div key="drawn" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 relative">
                       <div className="flex items-center justify-between ml-1">
                          <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Signature Area</label>
                          <button onClick={clearDrawnSignature} className="flex items-center gap-1.5 text-[9px] font-black text-rose-500 hover:opacity-80 transition-opacity uppercase tracking-widest">
                             <Eraser size={12} /> Reset Canvas
                          </button>
                       </div>
                       <div className="border-2 border-[var(--card-border)] rounded-[2rem] bg-[var(--input)] overflow-hidden touch-none relative shadow-inner">
                         <canvas 
                            ref={canvasRef} 
                            className="w-full h-[250px] cursor-crosshair touch-none"
                            style={{ touchAction: 'none' }}
                         />
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={`mt-10 mb-8 p-6 rounded-3xl border transition-all duration-500 ${consentGiven ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5 shadow-xl' : 'bg-primary/5 border-primary/20'}`}>
                   <label className="flex items-start gap-4 cursor-pointer group">
                     <div className="relative mt-1">
                       <input 
                         type="checkbox" 
                         className="peer w-6 h-6 rounded-lg border-2 border-[var(--card-border)] bg-[var(--input)] checked:bg-emerald-500 checked:border-emerald-500 transition-all appearance-none cursor-pointer"
                         checked={consentGiven}
                         onChange={e => setConsentGiven(e.target.checked)}
                       />
                       <CheckCircle2 size={16} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                     </div>
                     <span className="text-xs font-bold text-[var(--text)]/80 leading-relaxed group-hover:text-[var(--text)] transition-colors">
                       I agree to be legally bound by this document. My digital signature serves as full acceptance of all terms stated.
                     </span>
                   </label>
                </div>

                <Button 
                   size="lg" 
                   className="w-full py-8 text-sm font-black uppercase tracking-[0.2em] shadow-2xl rounded-2xl group relative overflow-hidden" 
                   isLoading={submitting}
                   onClick={handleSubmit}
                   disabled={!consentGiven}
                >
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    Authorize & Complete <CheckCircle2 className="group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-white/10 to-emerald-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </Button>

                <p className="mt-8 text-[9px] text-center text-[var(--text-muted)] font-black uppercase tracking-[0.2em] opacity-30">
                   Peak High-Security Compliance Module v4.2
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
