'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dice5, Save, RotateCcw, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import {
  AvatarConfig,
  SKIN_TONES,
  HAIR_COLORS,
  TOPS,
  OUTFITS,
  CLOTHING_COLORS,
  EYES_OPTIONS,
  MOUTHS,
  ACCESSORIES,
  BACKGROUND_COLORS,
  getDefaultConfig,
  getRandomConfig,
  buildAvatarUrl,
} from '@/lib/avatars/avatarData'
import { Button } from '@/components/ui/Button'

interface AvatarStudioProps {
  initialConfig?: AvatarConfig | string | null
  onSave: (config: AvatarConfig) => Promise<void>
  isLoading?: boolean
}

type TabId = 'skin' | 'hair' | 'top' | 'outfit' | 'eyes' | 'mouth' | 'extras' | 'bg'

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'skin', label: 'Skin', emoji: '🎨' },
  { id: 'hair', label: 'Hair', emoji: '💇' },
  { id: 'top', label: 'Style', emoji: '✂️' },
  { id: 'outfit', label: 'Outfit', emoji: '👗' },
  { id: 'eyes', label: 'Eyes', emoji: '👁️' },
  { id: 'mouth', label: 'Mouth', emoji: '😁' },
  { id: 'extras', label: 'Extras', emoji: '🕶️' },
  { id: 'bg', label: 'BG', emoji: '🌈' },
]

export const AvatarStudio = ({ initialConfig, onSave, isLoading }: AvatarStudioProps) => {
  const [config, setConfig] = useState<AvatarConfig>(() => {
    if (!initialConfig) return getDefaultConfig()
    try {
      const parsed = typeof initialConfig === 'string' ? JSON.parse(initialConfig) : initialConfig
      return { ...getDefaultConfig(), ...parsed }
    } catch {
      return getDefaultConfig()
    }
  })

  const [activeTab, setActiveTab] = useState<TabId>('skin')
  const [saved, setSaved] = useState(false)

  const update = useCallback((key: keyof AvatarConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleRandomize = useCallback(() => {
    setConfig(getRandomConfig())
  }, [])

  const handleSave = useCallback(async () => {
    await onSave(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }, [config, onSave])

  const avatarUrl = useMemo(() => buildAvatarUrl(config), [config])

  // Tab navigation
  const currentTabIdx = TABS.findIndex(t => t.id === activeTab)
  const goNext = () => setActiveTab(TABS[Math.min(currentTabIdx + 1, TABS.length - 1)].id)
  const goPrev = () => setActiveTab(TABS[Math.max(currentTabIdx - 1, 0)].id)

  return (
    <div className="w-full flex flex-col gap-6">
      {/* ── PREVIEW ── */}
      <div className="flex flex-col items-center gap-4">
        {/* Avatar bubble */}
        <motion.div
          key={avatarUrl}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative w-36 h-36 sm:w-44 sm:h-44"
        >
          {/* Glow ring */}
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
          />
          <img
            src={avatarUrl}
            alt="Your avatar"
            className="relative z-10 w-full h-full rounded-full border-4 border-white shadow-2xl shadow-primary/20 bg-slate-100"
          />
        </motion.div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleRandomize}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
          >
            <Dice5 size={15} />
            <span className="hidden sm:inline">Surprise Me</span>
            <span className="sm:hidden">Random</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setConfig(getDefaultConfig())}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset</span>
          </motion.button>
        </div>
      </div>

      {/* ── CUSTOMIZER ── */}
      <div
        className="rounded-[2rem] overflow-hidden shadow-xl"
        style={{ background: 'var(--card)', border: '2px solid var(--card-border)' }}
      >
        {/* Tab Bar */}
        <div className="flex overflow-x-auto scrollbar-hide border-b border-[var(--card-border)] px-2 pt-2 gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-shrink-0 flex flex-col items-center gap-0.5 px-3 sm:px-4 py-2 rounded-t-2xl text-[10px] font-black uppercase tracking-widest transition-all
                ${activeTab === tab.id
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-[var(--text-muted)] hover:bg-[var(--input)]'}
              `}
            >
              <span className="text-base leading-none">{tab.emoji}</span>
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {/* SKIN */}
              {activeTab === 'skin' && (
                <div className="space-y-4">
                  <p className="text-xs font-black tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Choose your skin tone</p>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                    {SKIN_TONES.map(sk => {
                      // visual color map
                      const colorMap: Record<string, string> = {
                        pale: '#FFDBAC', light: '#EDB88B', yellow: '#F1C27D',
                        tan: '#C68642', brown: '#8D5524', darkBrown: '#5A3825', black: '#2D1B0E'
                      }
                      const hex = colorMap[sk.value] || '#EDB88B'
                      return (
                        <button
                          key={sk.value}
                          onClick={() => update('skin', sk.value)}
                          title={sk.name}
                          className={`
                            aspect-square rounded-2xl border-4 transition-all relative
                            ${config.skin === sk.value ? 'border-primary ring-4 ring-primary/20 scale-110' : 'border-white hover:scale-105 hover:border-slate-200'}
                          `}
                          style={{ backgroundColor: hex }}
                        >
                          {config.skin === sk.value && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check size={16} className="text-white drop-shadow" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* HAIR COLOR */}
              {activeTab === 'hair' && (
                <div className="space-y-4">
                  <p className="text-xs font-black tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Pick a hair colour</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {HAIR_COLORS.map(hc => (
                      <button
                        key={hc.value}
                        onClick={() => update('hairColor', hc.value)}
                        title={hc.name}
                        className={`
                          aspect-square rounded-2xl border-4 transition-all relative
                          ${config.hairColor === hc.value ? 'border-primary ring-4 ring-primary/20 scale-110' : 'border-white hover:scale-105'}
                        `}
                        style={{ backgroundColor: hc.hex }}
                      >
                        {config.hairColor === hc.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check size={16} className="text-white drop-shadow" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TOP / HAIRSTYLE */}
              {activeTab === 'top' && (
                <div className="space-y-4">
                  <p className="text-xs font-black tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Hairstyle & head gear</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {TOPS.map(t => (
                      <button
                        key={t.value}
                        onClick={() => update('top', t.value)}
                        className={`
                          p-3 rounded-2xl border-2 transition-all text-center text-xs font-bold
                          ${config.top === t.value
                            ? 'border-primary bg-primary/10 text-primary scale-105 shadow-md'
                            : 'border-[var(--card-border)] bg-[var(--input)] hover:border-primary/30 hover:scale-105'}
                        `}
                        style={{ color: config.top === t.value ? undefined : 'var(--text-muted)' }}
                      >
                        <span className="text-2xl block mb-1">{t.emoji}</span>
                        <span className="text-[10px] uppercase tracking-wide leading-tight">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* OUTFIT */}
              {activeTab === 'outfit' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-xs font-black tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Clothing style</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {OUTFITS.map(o => (
                        <button
                          key={o.value}
                          onClick={() => update('clotheType', o.value)}
                          className={`
                            p-3 rounded-2xl border-2 transition-all text-center
                            ${config.clotheType === o.value
                              ? 'border-primary bg-primary/10 scale-105 shadow-md'
                              : 'border-[var(--card-border)] bg-[var(--input)] hover:border-primary/30 hover:scale-105'}
                          `}
                        >
                          <span className="text-2xl block mb-1">{o.emoji}</span>
                          <span className="text-[10px] font-black uppercase tracking-wide leading-tight" style={{ color: config.clotheType === o.value ? 'var(--primary)' : 'var(--text-muted)' }}>{o.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-black tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Colour</p>
                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                      {CLOTHING_COLORS.map(cc => (
                        <button
                          key={cc.value}
                          onClick={() => update('clotheColor', cc.value)}
                          title={cc.name}
                          className={`
                            aspect-square rounded-xl border-4 transition-all relative
                            ${config.clotheColor === cc.value ? 'border-primary ring-4 ring-primary/20 scale-110' : 'border-white hover:scale-105'}
                          `}
                          style={{ backgroundColor: cc.hex }}
                        >
                          {config.clotheColor === cc.value && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check size={12} className="text-white drop-shadow" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* EYES */}
              {activeTab === 'eyes' && (
                <div className="space-y-4">
                  <p className="text-xs font-black tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Eye expression</p>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {EYES_OPTIONS.map(e => (
                      <button
                        key={e.value}
                        onClick={() => update('eyes', e.value)}
                        className={`
                          p-3 rounded-2xl border-2 transition-all text-center
                          ${config.eyes === e.value
                            ? 'border-primary bg-primary/10 scale-105 shadow-md'
                            : 'border-[var(--card-border)] bg-[var(--input)] hover:border-primary/30 hover:scale-105'}
                        `}
                      >
                        <span className="text-2xl block mb-1">{e.emoji}</span>
                        <span className="text-[10px] font-black uppercase tracking-wide leading-tight" style={{ color: config.eyes === e.value ? 'var(--primary)' : 'var(--text-muted)' }}>{e.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MOUTH */}
              {activeTab === 'mouth' && (
                <div className="space-y-4">
                  <p className="text-xs font-black tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Choose a smile 😊</p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {MOUTHS.map(m => (
                      <button
                        key={m.value}
                        onClick={() => update('mouth', m.value)}
                        className={`
                          p-3 rounded-2xl border-2 transition-all text-center
                          ${config.mouth === m.value
                            ? 'border-primary bg-primary/10 scale-105 shadow-md'
                            : 'border-[var(--card-border)] bg-[var(--input)] hover:border-primary/30 hover:scale-105'}
                        `}
                      >
                        <span className="text-2xl block mb-1">{m.emoji}</span>
                        <span className="text-[10px] font-black uppercase tracking-wide leading-tight" style={{ color: config.mouth === m.value ? 'var(--primary)' : 'var(--text-muted)' }}>{m.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* EXTRAS — accessories */}
              {activeTab === 'extras' && (
                <div className="space-y-4">
                  <p className="text-xs font-black tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Accessories</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {ACCESSORIES.map(a => (
                      <button
                        key={a.value}
                        onClick={() => {
                          update('accessories', a.value)
                          update('accessoriesChance', a.chance)
                        }}
                        className={`
                          p-4 rounded-2xl border-2 transition-all text-center
                          ${config.accessories === a.value
                            ? 'border-primary bg-primary/10 scale-105 shadow-md'
                            : 'border-[var(--card-border)] bg-[var(--input)] hover:border-primary/30 hover:scale-105'}
                        `}
                      >
                        <span className="text-2xl block mb-1">
                          {a.value === 'blank' ? '🚫' : a.value.includes('sun') ? '😎' : a.value.includes('kurt') ? '🤓' : '🕶️'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: config.accessories === a.value ? 'var(--primary)' : 'var(--text-muted)' }}>{a.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* BACKGROUND */}
              {activeTab === 'bg' && (
                <div className="space-y-4">
                  <p className="text-xs font-black tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Pick a background vibe</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {BACKGROUND_COLORS.map(bg => (
                      <button
                        key={bg.hex}
                        onClick={() => update('backgroundColor', bg.hex)}
                        title={bg.name}
                        className={`
                          aspect-square rounded-2xl border-4 transition-all relative
                          ${config.backgroundColor === bg.hex ? 'border-primary ring-4 ring-primary/20 scale-110' : 'border-white hover:scale-105'}
                        `}
                        style={{ backgroundColor: `#${bg.hex}` }}
                      >
                        {config.backgroundColor === bg.hex && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check size={16} className="text-slate-800 opacity-60" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Tab navigation arrows */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--card-border)]">
            <button
              onClick={goPrev}
              disabled={currentTabIdx === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--input)]"
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
              {currentTabIdx + 1} / {TABS.length}
            </span>
            <button
              onClick={goNext}
              disabled={currentTabIdx === TABS.length - 1}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--input)]"
              style={{ color: 'var(--primary)' }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── SAVE BUTTON ── */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={isLoading}
        className={`
          w-full py-5 rounded-3xl font-black text-base uppercase tracking-widest transition-all
          flex items-center justify-center gap-3 shadow-2xl
          ${saved
            ? 'bg-emerald-500 text-white shadow-emerald-500/30'
            : 'bg-primary text-white shadow-primary/30 hover:brightness-110'}
        `}
      >
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
              <Check size={20} strokeWidth={3} /> Avatar Locked In! ✨
            </motion.span>
          ) : isLoading ? (
            <motion.span key="loading" className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </motion.span>
          ) : (
            <motion.span key="save" className="flex items-center gap-2">
              <Save size={20} /> Deploy My Avatar
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <p className="text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        Changes appear across the whole platform ✦
      </p>
    </div>
  )
}
