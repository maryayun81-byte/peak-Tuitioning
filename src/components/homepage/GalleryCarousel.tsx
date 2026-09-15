'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect, useCallback } from 'react'

const CAMPUS_IMAGES = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
]

// Verified captions for reviewed photos; the rest stay neutral so no image
// is ever mislabelled.
const IMAGE_CAPTIONS: Record<string, string> = {
  '01': 'Exam-prep classroom with chemistry practical · Form 3–4',
  '04': 'Small-group practical session · Peak Campus',
  '08': 'Hands-on titration practical · Holiday tuition',
  '15': 'CBC practical tasks with close tutor guidance',
  '19': 'One-on-one practical guidance · Peak Campus',
  '22': 'Teacher-led classroom session · Peak Campus',
}

export function GalleryCarousel() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const images = CAMPUS_IMAGES.map((num) => ({
    src: `/campus-gallery-${num}.jpeg`,
    alt: IMAGE_CAPTIONS[num] ? `${IMAGE_CAPTIONS[num]} — Peak Performance Tutoring, Kinoo Nairobi` : `Life at Peak Campus — photo ${num}`,
    caption: IMAGE_CAPTIONS[num] ?? 'Life at Peak Campus',
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

      <div className="relative z-10 landing-container">
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

            {/* Caption */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[70%] hidden sm:block">
              <p key={activeIndex} className="text-center text-xs font-bold text-white bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full truncate">
                {images[activeIndex].caption}
              </p>
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
            <a
              href="#fees"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-peak-green hover:shadow-lg transition-all"
            >
              See programmes & fees
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
              </svg>
            </a>
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