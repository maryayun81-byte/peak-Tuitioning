import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Smartphone, CheckCircle, Download, BookOpen } from 'lucide-react'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  deckTitle: string
  price: number
  isLoggedIn: boolean
}

export default function CheckoutModal({ isOpen, onClose, deckTitle, price, isLoggedIn }: CheckoutModalProps) {
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle')

  const handlePayment = () => {
    if (!phone || phone.length < 9) return
    setStatus('processing')
    // Simulate M-Pesa STK push delay
    setTimeout(() => {
      setStatus('success')
    }, 2500)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={status === 'processing' ? undefined : onClose}
        />
        
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          {status !== 'processing' && (
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors z-10"
            >
              <X size={20} />
            </button>
          )}

          {status === 'success' ? (
            <div className="p-8 text-center flex flex-col items-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle size={40} className="text-emerald-500" />
              </motion.div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Payment Successful!</h2>
              <p className="text-slate-500 mb-8 max-w-[250px]">
                You have successfully purchased <strong>{deckTitle}</strong>.
              </p>

              {isLoggedIn ? (
                <button 
                  onClick={onClose}
                  className="w-full py-4 rounded-xl font-bold bg-primary hover:bg-primary-hover text-white transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen size={18} /> Open in My Decks
                </button>
              ) : (
                <button 
                  onClick={onClose}
                  className="w-full py-4 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={18} /> Download Deck (PDF)
                </button>
              )}
            </div>
          ) : (
            <div className="p-8">
              <div className="mb-8">
                <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider rounded-md mb-4">
                  M-Pesa Express
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Complete your purchase</h2>
                <p className="text-slate-500 mt-2">Enter your M-Pesa number to pay <strong>KES {price}</strong> for {deckTitle}.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Smartphone size={20} />
                    </div>
                    <input 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07XX XXX XXX"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
                      disabled={status === 'processing'}
                    />
                  </div>
                </div>

                <button 
                  onClick={handlePayment}
                  disabled={!phone || status === 'processing'}
                  className="w-full py-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all disabled:opacity-50 disabled:hover:bg-emerald-500 flex justify-center items-center h-14"
                >
                  {status === 'processing' ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    `Pay KES ${price}`
                  )}
                </button>
                
                {status === 'processing' && (
                  <p className="text-center text-sm font-medium text-amber-500 animate-pulse">
                    Please check your phone for the M-Pesa pin prompt...
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
