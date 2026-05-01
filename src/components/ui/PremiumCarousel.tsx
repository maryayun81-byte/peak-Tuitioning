'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'

interface PremiumCarouselProps {
  images: string[]
  autoPlayInterval?: number
  className?: string
}

export function PremiumCarousel({ images, autoPlayInterval = 6000, className = '' }: PremiumCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [direction, setDirection] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const nextSlide = useCallback(() => {
    setDirection(1)
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const prevSlide = useCallback(() => {
    setDirection(-1)
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [images.length])

  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(nextSlide, autoPlayInterval)
    return () => clearInterval(timer)
  }, [isPlaying, nextSlide, autoPlayInterval])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) diff > 0 ? nextSlide() : prevSlide()
    touchStartX.current = null
  }

  const variants: Variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1, zIndex: 1 },
    exit: (d: number) => ({
      x: d < 0 ? '100%' : '-100%',
      opacity: 0,
      zIndex: 0,
      transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const }
    }),
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] border border-white/5 bg-black/20 shadow-2xl ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide area — taller on mobile, cinematic on desktop */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] md:aspect-[2.5/1] overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 280, damping: 32 },
              opacity: { duration: 0.5 },
            }}
            className="absolute inset-0"
          >
            <img
              src={images[currentIndex]}
              alt={`Slide ${currentIndex + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050810]/90 via-[#050810]/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050810]/50 via-transparent to-[#050810]/50 hidden md:block" />
          </motion.div>
        </AnimatePresence>

        {/* Content overlay — mobile-safe padding */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 sm:p-8 md:p-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <motion.div
            key={`txt-${currentIndex}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="space-y-2 sm:space-y-3 max-w-lg"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-[2px] bg-emerald-500" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
                Excellence in Motion
              </span>
            </div>
            <h3 className="text-xl sm:text-3xl md:text-5xl font-black uppercase tracking-tighter text-white leading-none">
              Empowering the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                Next Generation
              </span>
            </h3>
            <p className="text-white/55 text-[11px] sm:text-sm leading-relaxed font-medium hidden sm:block">
              State-of-the-art learning in Nairobi for KCSE revision and CBC development.
            </p>
          </motion.div>

          {/* Prev / Play / Next controls */}
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl p-1.5 rounded-full border border-white/10 shrink-0">
            <button onClick={prevSlide} aria-label="Previous"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 active:scale-90 transition-all">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 active:scale-90 transition-all">
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button onClick={nextSlide} aria-label="Next"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 active:scale-90 transition-all">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar — full-width thin bar at very bottom, replaces dots (10 dots = overflow on mobile) */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5 z-30">
        <motion.div
          key={currentIndex}
          className="h-full bg-emerald-500"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: autoPlayInterval / 1000, ease: 'linear' }}
        />
      </div>

      {/* Slide counter — top right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-[10px] font-black text-white/60 tabular-nums">
        {String(currentIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
      </div>
    </div>
  )
}
