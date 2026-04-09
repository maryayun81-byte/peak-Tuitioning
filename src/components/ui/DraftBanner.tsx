'use client'

import { RotateCcw, X, Clock } from 'lucide-react'

interface DraftBannerProps {
  onRestore: () => void
  onDiscard: () => void
  draftAge?: string | null
  label?: string
}

/**
 * DraftBanner
 * A compact sticky banner that appears when a saved draft is detected.
 * Used across assignment, quiz, trivia, and resource creation forms.
 */
export function DraftBanner({ onRestore, onDiscard, draftAge, label = 'draft' }: DraftBannerProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg animate-in slide-in-from-top-2"
      style={{
        background: 'linear-gradient(135deg, var(--primary), color-mix(in sRGB, var(--primary) 70%, #7C3AED 30%))',
        border: '1px solid color-mix(in sRGB, var(--primary) 80%, white 20%)',
      }}
    >
      {/* Icon */}
      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <RotateCcw size={15} className="text-white" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-black uppercase tracking-widest">
          Unsaved {label} found
        </p>
        {draftAge && (
          <p className="text-white/70 text-[10px] flex items-center gap-1 mt-0.5">
            <Clock size={9} /> Saved {draftAge}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRestore}
          className="px-3 py-1.5 rounded-xl bg-white text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
          style={{ color: 'var(--primary)' }}
        >
          Restore
        </button>
        <button
          onClick={onDiscard}
          className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-all"
          title="Discard draft"
        >
          <X size={13} className="text-white" />
        </button>
      </div>
    </div>
  )
}
