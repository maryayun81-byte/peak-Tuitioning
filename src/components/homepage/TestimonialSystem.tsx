'use client'

import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect, useCallback } from 'react'
import { ShareStoryModal } from './ShareStoryModal'

interface Testimonial {
  id: string
  fullName: string
  role: string
  relationshipLabel?: string
  quote: string
  rating: number
}

const FALLBACK: Testimonial[] = [
  {
    id: '1',
    fullName: 'Mercy Wanjiku',
    role: 'Form 4 Parent',
    quote: 'My child became calmer before exams. The anxiety is gone because she actually understands now. The diagnostic showed us exactly what was wrong — it wasn\'t laziness, it was a gap in algebra foundations.',
    rating: 5,
  },
  {
    id: '2',
    fullName: 'David Ochieng',
    role: 'Grade 8 Parent',
    quote: 'He went from dreading maths to asking for extra practice. The system works because it targets the real problem, not just the symptoms.',
    rating: 5,
  },
  {
    id: '3',
    fullName: 'Sarah Kimani',
    role: 'Form 3 Parent',
    quote: 'The progress reports actually mean something now. I can see exactly what changed and why. No more guessing whether tuition is working.',
    rating: 5,
  },
]

// 3 unique torn paper silhouettes
const TEAR_PATHS = [
  `polygon(2% 0%, 10% 1%, 20% 0%, 30% 2%, 40% 0%, 50% 1%, 60% 0%, 70% 2%, 80% 0%, 90% 1%, 98% 0%, 100% 4%, 99% 15%, 100% 30%, 99% 45%, 100% 60%, 99% 75%, 100% 88%, 99% 96%, 96% 100%, 85% 99%, 70% 100%, 55% 99%, 40% 100%, 25% 99%, 10% 100%, 0% 97%, 1% 80%, 0% 60%, 1% 40%, 0% 20%)`,
  `polygon(0% 2%, 8% 0%, 18% 2%, 28% 0%, 38% 1%, 48% 0%, 58% 2%, 68% 0%, 78% 1%, 88% 0%, 95% 2%, 100% 0%, 99% 12%, 100% 28%, 98% 42%, 100% 58%, 99% 72%, 96% 85%, 90% 95%, 80% 100%, 65% 98%, 50% 100%, 35% 99%, 20% 100%, 5% 98%, 0% 95%, 2% 82%, 0% 65%, 2% 48%, 0% 32%, 2% 15%)`,
  `polygon(3% 0%, 12% 2%, 22% 0%, 32% 1%, 42% 0%, 52% 2%, 62% 0%, 72% 1%, 82% 0%, 92% 2%, 100% 0%, 98% 10%, 100% 22%, 99% 35%, 100% 48%, 98% 62%, 100% 75%, 99% 88%, 97% 100%, 88% 98%, 75% 100%, 62% 99%, 48% 100%, 35% 98%, 22% 100%, 10% 99%, 0% 97%, 1% 85%, 0% 72%, 1% 58%, 0% 45%, 1% 30%, 0% 18%)`,
]

const ACCENT_COLORS = ['#16A34A', '#2563EB', '#0891B2', '#D97706', '#DC2626']

const handStyle = {
  fontFamily: "'Caveat', cursive",
  fontStyle: 'italic' as const,
}

export function TestimonialSystem() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const { getPublicTestimonials } = await import('@/app/actions/testimonials')
        const result = await getPublicTestimonials(10)
        if (result.success && result.testimonials.length > 0) {
          setTestimonials(result.testimonials)
        } else {
          setTestimonials(FALLBACK)
        }
      } catch {
        setTestimonials(FALLBACK)
      } finally {
        setLoading(false)
      }
    }
    fetchTestimonials()
  }, [])

  const next = useCallback(() => {
    setActive((p) => (p + 1) % testimonials.length)
  }, [testimonials.length])

  const prev = useCallback(() => {
    setActive((p) => (p - 1 + testimonials.length) % testimonials.length)
  }, [testimonials.length])

  // Auto-scroll — simplest possible approach
  useEffect(() => {
    if (testimonials.length <= 1) return
    const t = setInterval(() => {
      setActive((p) => (p + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(t)
  }, [testimonials.length])

  if (loading) {
    return (
      <section ref={sectionRef} className="relative py-12 md:py-16 bg-[#F5F3EF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="h-4 w-48 mx-auto bg-slate-200 rounded mb-4" />
            <div className="h-10 w-64 mx-auto bg-slate-200 rounded" />
          </div>
          <div className="h-80 bg-slate-200/50 rounded animate-pulse" />
        </div>
      </section>
    )
  }

  const current = testimonials[active]
  const tearIdx = active % TEAR_PATHS.length
  const accentIdx = active % ACCENT_COLORS.length

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="relative py-12 md:py-16 bg-[#F5F3EF] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Paper texture */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-14"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-[2px] bg-slate-900" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Evidence of Transformation
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-[1.1]">
            STUDENT <span className="text-peak-green">EVIDENCE</span>
          </h2>
          <p className="text-slate-500 text-sm mt-2">Files pulled from the archive.</p>
        </motion.div>

        {/* Carousel */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 60, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: -60, rotate: -2 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <ArtifactCard
                testimonial={current}
                tearPath={TEAR_PATHS[tearIdx]}
                accentColor={ACCENT_COLORS[accentIdx]}
                rotation={(tearIdx - 1) * 1.2}
              />
            </motion.div>
          </AnimatePresence>

          {/* Nav arrows */}
          {testimonials.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-12 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-peak-green hover:border-peak-green/30 transition-all z-10"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                onClick={next}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-12 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-peak-green hover:border-peak-green/30 transition-all z-10"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        {testimonials.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {testimonials.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setActive(i)}
                className={`transition-all duration-300 rounded-full ${active === i ? 'w-6 h-1.5 bg-peak-green' : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'}`}
                aria-label={`View testimonial from ${t.fullName}`}
              />
            ))}
          </div>
        )}

        {/* Share Story */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
          className="text-center mt-10"
        >
          <button
            onClick={() => setShowModal(true)}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full text-sm font-bold uppercase tracking-wider hover:bg-peak-green transition-all duration-500 hover:shadow-[0_0_30px_rgba(22,163,74,0.2)]"
          >
            <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Share Your Story
          </button>
        </motion.div>
      </div>

      <ShareStoryModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </section>
  )
}

function ArtifactCard({
  testimonial,
  tearPath,
  accentColor,
  rotation,
}: {
  testimonial: Testimonial
  tearPath: string
  accentColor: string
  rotation: number
}) {
  const [isHovered, setIsHovered] = useState(false)
  const initials = testimonial.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)

  return (
    <div
      className="relative max-w-3xl mx-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Shadow */}
      <div
        className="absolute inset-0 transition-all duration-500"
        style={{
          background: 'rgba(0,0,0,0.06)',
          filter: 'blur(14px)',
          transform: isHovered ? 'translate(5px, 10px) scale(0.98)' : 'translate(3px, 6px) scale(0.99)',
        }}
      />

      {/* Under-paper accent */}
      <div
        className="absolute -inset-1 transition-all duration-500 opacity-0 group-hover:opacity-100"
        style={{
          background: `linear-gradient(135deg, ${accentColor}08, ${accentColor}04)`,
          clipPath: tearPath,
        }}
      />

      {/* Main paper */}
      <div
        className="relative transition-transform duration-500"
        style={{
          clipPath: tearPath,
          transform: `rotate(${rotation}deg)${isHovered ? ' translateY(-4px)' : ''}`,
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            backgroundColor: '#FDFCFA',
            boxShadow: isHovered
              ? '0 20px 60px -15px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)'
              : '0 4px 20px -4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6)',
          }}
        >
          {/* Paper grain */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Red margin line */}
          <div className="absolute top-0 bottom-0 left-[16%] w-px bg-red-300/25" />

          {/* Ruled lines */}
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute left-[16%] right-6 h-px bg-slate-300/15"
              style={{ top: `${100 + i * 40}px` }}
            />
          ))}

          <div className="relative p-6 sm:p-8 sm:pl-[20%]">
            {/* Tape strip */}
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-4 opacity-30"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.4))',
                border: '1px solid rgba(200,200,200,0.3)',
              }}
            />

            {/* Top row — name + role */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">
                  Student Record
                </div>
                <div
                  className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight"
                  style={handStyle}
                >
                  {testimonial.fullName}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-slate-600">{testimonial.role}</span>
                  {testimonial.relationshipLabel && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500">{testimonial.relationshipLabel}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Initials portrait */}
              <div className="flex-shrink-0 ml-4">
                <div
                  className="w-16 h-20 sm:w-20 sm:h-24 relative overflow-hidden"
                  style={{
                    clipPath: 'polygon(0% 0%, 92% 0%, 100% 8%, 100% 100%, 8% 100%, 0% 92%)',
                    filter: 'contrast(1.1) saturate(0.3)',
                  }}
                >
                  <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                    <span className="text-3xl sm:text-4xl font-bold text-slate-400" style={handStyle}>
                      {initials}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-slate-900/5 mix-blend-multiply" />
                </div>
                <div className="text-[8px] text-slate-400 mt-1 text-center" style={handStyle}>
                  Portrait
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="flex gap-0.5 mb-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  className={`w-3.5 h-3.5 ${i < testimonial.rating ? 'text-amber-400' : 'text-slate-200'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            {/* Quote */}
            <blockquote
              className="text-base sm:text-lg text-slate-800 leading-relaxed italic mb-4"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              &ldquo;{testimonial.quote}&rdquo;
            </blockquote>

            {/* Handwritten annotation */}
            <div
              className="inline-block px-3 py-1 opacity-60"
              style={{
                ...handStyle,
                color: accentColor,
                fontSize: '15px',
                border: `2px solid ${accentColor}30`,
                borderRadius: '2px',
                transform: `rotate(${rotation > 0 ? 3 : -2}deg)`,
              }}
            >
              EVIDENCE ARCHIVE
            </div>
          </div>

          {/* Corner fold */}
          <div
            className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, transparent 50%, ${accentColor}08 50%)`,
            }}
          />
        </div>
      </div>

      {/* Detached scraps */}
      <div
        className="absolute -bottom-2 -left-3 w-7 h-3 opacity-25 pointer-events-none transition-all duration-500"
        style={{
          backgroundColor: '#FDFCFA',
          transform: `rotate(${rotation * -3 - 12}deg)`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      />
      <div
        className="absolute -top-1 -right-2 w-4 h-3 opacity-20 pointer-events-none transition-all duration-500"
        style={{
          backgroundColor: '#FDFCFA',
          transform: `rotate(${rotation * 2 + 18}deg)`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      />
    </div>
  )
}