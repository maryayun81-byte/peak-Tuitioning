'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, Variants } from 'framer-motion'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

interface PremiumCarouselProps {
  images: string[]
  autoPlayInterval?: number
  className?: string
}

const slideVariants: Variants = {
  enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  }),
}

export function PremiumCarousel({
  images,
  autoPlayInterval = 5200,
  className = '',
}: PremiumCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [direction, setDirection] = useState(1)
  const touchStartX = useRef<number | null>(null)

  const count = images.length

  const goTo = useCallback(
    (nextIndex: number) => {
      if (!count) return
      setDirection(nextIndex > currentIndex ? 1 : -1)
      setCurrentIndex((nextIndex + count) % count)
    },
    [count, currentIndex]
  )

  const nextSlide = useCallback(() => {
    if (!count) return
    setDirection(1)
    setCurrentIndex((prev) => (prev + 1) % count)
  }, [count])

  const prevSlide = useCallback(() => {
    if (!count) return
    setDirection(-1)
    setCurrentIndex((prev) => (prev - 1 + count) % count)
  }, [count])

  useEffect(() => {
    if (!isPlaying || count < 2) return
    const timer = window.setInterval(nextSlide, autoPlayInterval)
    return () => window.clearInterval(timer)
  }, [autoPlayInterval, count, isPlaying, nextSlide])

  if (!count) {
    return (
      <div className={`relative grid aspect-[4/3] place-items-center rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500 ${className}`}>
        Gallery images unavailable
      </div>
    )
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border border-white/15 bg-slate-950 shadow-2xl ${className}`}
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0].clientX
        setIsPlaying(false)
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return
        const diff = touchStartX.current - event.changedTouches[0].clientX
        if (Math.abs(diff) > 42) {
          diff > 0 ? nextSlide() : prevSlide()
        }
        touchStartX.current = null
        setIsPlaying(true)
      }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] lg:aspect-[21/9]">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.img
            key={images[currentIndex]}
            src={images[currentIndex]}
            alt={`Peak Performance gallery image ${currentIndex + 1}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: 'spring', stiffness: 260, damping: 30 }, opacity: { duration: 0.25 } }}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
      </div>

      {count > 1 && (
        <>
          <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between gap-3 sm:inset-x-5 sm:bottom-5">
            <div className="flex max-w-[58%] items-center gap-1.5">
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  aria-label={`Show gallery image ${index + 1}`}
                  onClick={() => goTo(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentIndex ? 'w-8 bg-white' : 'w-3 bg-white/45 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/65 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous gallery image"
                className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setIsPlaying((value) => !value)}
                aria-label={isPlaying ? 'Pause gallery carousel' : 'Play gallery carousel'}
                className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next gallery image"
                className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-slate-950/60 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-md">
            {currentIndex + 1} / {count}
          </div>
        </>
      )}
    </div>
  )
}
