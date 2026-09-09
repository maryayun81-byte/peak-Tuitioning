'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect, useCallback } from 'react'

const CAMPUS_IMAGES = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
]

export function GalleryCarousel() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const images = CAMPUS_IMAGES.map((num) => ({
    src: `/campus-gallery-${num}.jpeg`,
    alt: `Peak Campus - Session ${num}`,
  }))

  const goTo = useCallback((i: number) => {
    setActiveIndex(((i % images.length) + images.length) % images.length)
  }, [images.length])

  const prev = () => goTo(activeIndex - 1)
  const next = () => goTo(activeIndex + 1)

  useEffect(() => {
    if (isPaused || !isInView) return
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % images.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [isPaused, isInView, images.length])

  return (
    <section id="gallery" ref={ref} className="relative py-12 md:py-16 overflow-hidden bg-white">
      <div className="absolute inset-0 bg-slate-50 opacity-30" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="text-center mb-8 md:mb-10"
        >
          <span className="peak-label peak-label-cyan mb-4 block">CAMPUS GALLERY</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            A Day at
            <br />
            <span className="text-peak-green">Peak.</span>
          </h2>
        </motion.div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="relative max-w-5xl mx-auto"
        >
          {/* Main image */}
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 shadow-lg">
            {images.map((img, i) => (
              <div
                key={img.src}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  i === activeIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent z-20" />

            {/* Image counter */}
            <div className="absolute bottom-4 left-4 z-30 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
              {activeIndex + 1} / {images.length}
            </div>

            {/* Nav arrows */}
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-700 hover:bg-white hover:text-peak-green transition-all shadow-lg"
              aria-label="Previous image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-700 hover:bg-white hover:text-peak-green transition-all shadow-lg"
              aria-label="Next image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Thumbnails */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 hide-scrollbar justify-center">
            {images.map((img, i) => (
              <button
                key={img.src}
                onClick={() => goTo(i)}
                className={`
                  flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all duration-200
                  ${i === activeIndex
                    ? 'border-peak-green shadow-md scale-105'
                    : 'border-slate-200 opacity-60 hover:opacity-100'
                  }
                `}
                aria-label={`View image ${i + 1}`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors
                bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              {isPaused ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                  Pause
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}