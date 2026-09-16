'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2, WifiOff, X, Send } from 'lucide-react'

export interface SubmitOverlayProps {
  open: boolean
  /** Stage labels, e.g. ['Saving your work', 'Notifying teacher', 'Awarding XP'] */
  stages: string[]
  /** Index of the currently running stage (stages after it are pending). */
  stageIndex: number
  /** All stages complete — shows the arrival state briefly. */
  done?: boolean
  /** Current attempt (1-based) and total planned attempts. */
  attempt?: number
  maxAttempts?: number
  /** Paused waiting for the network to return. */
  waitingOffline?: boolean
  /** Optional cancel (hidden for timer-forced submits). */
  onCancel?: () => void
}

/**
 * The submit journey, made visible: a rails-style progress rail with a
 * moving glow, a staged checklist that ticks as real work completes, and
 * honest retry/offline states. Parents drive `stageIndex` at each awaited
 * step — nothing here is faked timers.
 */
export function SubmitOverlay({
  open,
  stages,
  stageIndex,
  done = false,
  attempt = 1,
  maxAttempts = 4,
  waitingOffline = false,
  onCancel,
}: SubmitOverlayProps) {
  const total = Math.max(stages.length, 1)
  const pct = done ? 100 : Math.min(99, Math.round(((stageIndex + 0.4) / total) * 100))

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: 'rgba(5,8,20,0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          role="dialog"
          aria-live="polite"
          aria-label="Submitting your work"
        >
          <motion.div
            initial={{ scale: 0.92, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="w-full max-w-sm rounded-[2rem] border p-6 sm:p-8 shadow-2xl overflow-hidden relative"
            style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
          >
            {/* travelling glow */}
            <div
              className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-40 rounded-full opacity-25 blur-3xl"
              style={{ background: 'linear-gradient(90deg, var(--primary), #22D3EE)' }}
            />

            <div className="relative">
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg"
                  style={{ background: done ? '#10B981' : 'linear-gradient(135deg, var(--primary), #7C3AED)' }}
                >
                  {done ? <Check size={22} strokeWidth={3} /> : <Send size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-base leading-tight" style={{ color: 'var(--text)' }}>
                    {done ? 'Submitted! 🎉' : waitingOffline ? 'Waiting for network…' : 'Sending your work…'}
                  </h3>
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {done
                      ? 'All done — taking you there now.'
                      : waitingOffline
                        ? 'Paused — will resume the moment you are back online.'
                        : attempt > 1
                          ? `Retrying… attempt ${attempt} of ${maxAttempts}`
                          : 'Hold on, keeping everything safe.'}
                  </p>
                </div>
                {onCancel && !done && (
                  <button
                    onClick={onCancel}
                    aria-label="Cancel submission"
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors hover:opacity-70"
                    style={{ background: 'var(--input)', color: 'var(--text-muted)' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* rails track */}
              <div className="mt-5 mb-1 flex items-center justify-between text-[10px] font-black tabular-nums">
                <span className="uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Progress rail</span>
                <span style={{ color: 'var(--primary)' }}>{pct}%</span>
              </div>
              <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--input)' }}>
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--primary), #22D3EE, var(--primary))', backgroundSize: '200% 100%' }}
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ ease: 'easeOut', duration: 0.35 }}
                />
                {!done && (
                  <motion.div
                    className="absolute inset-y-0 w-16 rounded-full"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)' }}
                    animate={{ x: ['-4rem', '22rem'] }}
                    transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
                  />
                )}
              </div>

              {/* staged checklist */}
              <ul className="mt-5 space-y-2.5">
                {stages.map((label, i) => {
                  const isDone = done || i < stageIndex
                  const isActive = !done && i === stageIndex
                  return (
                    <motion.li
                      key={label}
                      initial={false}
                      animate={{ opacity: isDone || isActive ? 1 : 0.45 }}
                      className="flex items-center gap-3"
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          background: isDone ? '#10B981' : isActive ? 'var(--primary-dim)' : 'var(--input)',
                          color: isDone ? 'white' : isActive ? 'var(--primary)' : 'var(--text-muted)',
                        }}
                      >
                        {isDone ? (
                          <Check size={13} strokeWidth={3.5} />
                        ) : isActive ? (
                          waitingOffline ? <WifiOff size={12} /> : <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
                        )}
                      </span>
                      <span
                        className="text-xs font-bold"
                        style={{ color: isDone || isActive ? 'var(--text)' : 'var(--text-muted)' }}
                      >
                        {label}
                      </span>
                    </motion.li>
                  )
                })}
              </ul>

              {waitingOffline && (
                <div
                  className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}
                >
                  <WifiOff size={13} className="shrink-0" />
                  No connection — your answers are saved. We resume automatically.
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
