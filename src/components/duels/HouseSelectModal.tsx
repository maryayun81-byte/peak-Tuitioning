'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, X, ArrowRight, Check } from 'lucide-react'
import { HOUSES, type HouseId } from '@/types/houses'
import { joinHouse } from '@/app/actions/houses'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onComplete: () => void
  onClose: () => void
}

export function HouseSelectModal({ open, onComplete, onClose }: Props) {
  const [selected, setSelected] = useState<HouseId | null>(null)
  const [joining, setJoining] = useState(false)
  const [step, setStep] = useState<'choose' | 'confirm' | 'done'>('choose')

  const handleSelect = async () => {
    if (!selected) return
    if (step === 'choose') {
      setStep('confirm')
      return
    }
    if (step === 'confirm') {
      setJoining(true)
      try {
        await joinHouse(selected)
        setStep('done')
        setTimeout(() => {
          onComplete()
        }, 1500)
      } catch {
        toast.error('Failed to join house')
      } finally {
        setJoining(false)
      }
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative rounded-3xl p-8 max-w-md w-full"
            style={{ background: 'var(--card)' }}
          >
            {/* Close */}
            <button onClick={onClose} className="absolute top-4 right-4 opacity-50 hover:opacity-100">
              <X size={18} />
            </button>

            {step === 'choose' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))' }}>
                    <Shield size={28} style={{ color: '#8B5CF6' }} />
                  </div>
                  <h2 className="text-lg font-black mb-1" style={{ color: 'var(--text)' }}>Choose Your House</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Your house determines your allies in the Territory Wars. Every duel win earns territory for your house!
                  </p>
                </div>

                <div className="space-y-2.5 mb-6">
                  {HOUSES.map(h => (
                    <motion.button
                      key={h.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelected(h.id)}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all`}
                      style={{
                        background: selected === h.id ? `${h.bg}` : 'var(--input)',
                        borderColor: selected === h.id ? h.color : 'var(--card-border)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{h.emoji}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black" style={{ color: 'var(--text)' }}>{h.name}</span>
                            {selected === h.id && (
                              <Check size={14} style={{ color: h.color }} />
                            )}
                          </div>
                          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {h.motto}
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: h.bg }}>
                          <div className="w-3 h-3 rounded" style={{ background: h.color }} />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <button
                  onClick={handleSelect}
                  disabled={!selected}
                  className="w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  style={{
                    background: selected ? 'linear-gradient(135deg, #8B5CF6, #6366F1)' : 'var(--input)',
                    color: selected ? 'white' : 'var(--text-muted)',
                    opacity: selected ? 1 : 0.5,
                  }}
                >
                  Join House <ArrowRight size={16} />
                </button>
              </>
            )}

            {step === 'confirm' && selected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="text-6xl mb-4">{HOUSES.find(h => h.id === selected)?.emoji}</div>
                <h2 className="text-xl font-black mb-2" style={{ color: HOUSES.find(h => h.id === selected)?.color }}>
                  Join {HOUSES.find(h => h.id === selected)?.name}?
                </h2>
                <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>
                  You can't change houses later. Your house is your identity in the Territory Wars.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('choose')}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleSelect}
                    disabled={joining}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${HOUSES.find(h => h.id === selected)?.color}, ${HOUSES.find(h => h.id === selected)?.color}dd)`,
                      color: 'white',
                    }}
                  >
                    {joining ? 'Joining...' : 'Confirm'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'done' && selected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="text-center py-8"
              >
                <div className="text-6xl mb-4">{HOUSES.find(h => h.id === selected)?.emoji}</div>
                <h2 className="text-xl font-black mb-2" style={{ color: HOUSES.find(h => h.id === selected)?.color }}>
                  Welcome to {HOUSES.find(h => h.id === selected)?.name}!
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Your journey begins. Fight for your house!
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
