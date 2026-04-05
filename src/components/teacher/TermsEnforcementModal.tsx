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
  
  const [signatureMode, setSignatureMode] = useState<'typed' | 'drawn'>('typed')
  const [typedName, setTypedName] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)

  useEffect(() => {
    // Lock body scroll
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  useEffect(() => {
    if (signatureMode === 'drawn' && canvasRef.current) {
      if (!padRef.current) {
        // Init pad
        padRef.current = new SignaturePad(canvasRef.current, {
          backgroundColor: 'rgb(255, 255, 255)',
          penColor: 'rgb(15, 23, 42)'
        })
      }
    }
  }, [signatureMode])

  const clearDrawnSignature = () => {
    if (padRef.current) {
      padRef.current.clear()
    }
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
      signatureData = padRef.current.toDataURL('image/png')
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
      console.error('Failed to submit signature', error)
      toast.error('Failed to submit signature. Check connection.')
      setSubmitting(false)
    } else {
      toast.success('Thank you! Access granted.')
      onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[var(--background)]">
      {/* Top Banner */}
      <div className="bg-primary px-6 py-4 flex items-center justify-between text-white shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <ShieldAlert size={24} />
          <div>
            <h2 className="font-black text-lg leading-tight uppercase tracking-widest">Action Required</h2>
            <p className="text-xs opacity-80">You must sign the latest Terms & Conditions to continue.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Document Viewer Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 border-r border-[var(--card-border)]">
          <div className="p-6 bg-white dark:bg-slate-950 border-b border-[var(--card-border)] shrink-0">
            <h1 className="text-2xl font-black">{assignment.document.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[var(--input)] text-[var(--text-muted)]">Version: {assignment.document.version}</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 md:p-12 layout-scroll">
             <div 
               className="prose prose-slate dark:prose-invert max-w-none bg-white dark:bg-slate-950 p-8 md:p-12 rounded-2xl shadow-sm border border-[var(--card-border)] min-h-full"
               dangerouslySetInnerHTML={{ __html: assignment.document.content }} 
             />
          </div>
        </div>

        {/* Signature Area */}
        <div className="w-full md:w-[450px] bg-[var(--card)] flex flex-col shrink-0 overflow-y-auto shadow-[-4px_0_24px_rgba(0,0,0,0.05)] z-10">
          <div className="p-8 flex-1 flex flex-col justify-center">
            
            <h3 className="text-xl font-black mb-6">Signature Required</h3>
            
            <div className="flex p-1 bg-[var(--input)] rounded-xl mb-6">
               <button 
                 onClick={() => setSignatureMode('typed')}
                 className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${signatureMode === 'typed' ? 'bg-[var(--card)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
               >
                 <Type size={16} /> Type Name
               </button>
               <button 
                 onClick={() => setSignatureMode('drawn')}
                 className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${signatureMode === 'drawn' ? 'bg-[var(--card)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
               >
                 <PenTool size={16} /> Draw Signature
               </button>
            </div>

            <AnimatePresence mode="wait">
              {signatureMode === 'typed' ? (
                <motion.div key="typed" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Type Full Legal Name</label>
                     <Input 
                        placeholder="John Doe" 
                        value={typedName} 
                        onChange={e => setTypedName(e.target.value)} 
                        className="font-serif italic text-lg tracking-wide bg-white dark:bg-slate-900 border-2"
                     />
                   </div>
                </motion.div>
              ) : (
                <motion.div key="drawn" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                   <div className="space-y-2 relative">
                     <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Digital Ledger Canvas</label>
                     <div className="border-2 border-dashed border-[var(--card-border)] rounded-2xl bg-white overflow-hidden touch-none relative">
                       <canvas 
                         ref={canvasRef} 
                         width={400} 
                         height={200} 
                         className="w-full h-[200px] cursor-crosshair touch-none"
                         style={{ touchAction: 'none' }}
                       />
                       <button onClick={clearDrawnSignature} className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-[var(--input)] text-[var(--text-muted)] hover:text-[var(--text)] shadow-sm" title="Clear Canvas">
                          <Eraser size={14} />
                       </button>
                     </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-10 mb-8 p-4 bg-primary/5 border border-primary/20 rounded-xl">
               <label className="flex items-start gap-3 cursor-pointer">
                 <input 
                   type="checkbox" 
                   className="mt-1 w-5 h-5 rounded border-2 border-primary accent-primary text-primary"
                   checked={consentGiven}
                   onChange={e => setConsentGiven(e.target.checked)}
                 />
                 <span className="text-sm font-semibold opacity-80 leading-snug">
                   I have read, understood, and agree to the Terms and Conditions presented in this document. My signature serves as a legally binding acceptance.
                 </span>
               </label>
            </div>

            <Button 
              size="lg" 
              className="w-full py-6 text-base shadow-xl" 
              isLoading={submitting}
              onClick={handleSubmit}
              disabled={!consentGiven}
            >
              Sign & Complete <CheckCircle2 className="ml-2" />
            </Button>

          </div>
        </div>
      </div>
    </div>
  )
}
