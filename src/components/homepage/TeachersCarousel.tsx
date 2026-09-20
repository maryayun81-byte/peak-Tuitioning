'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, Calculator, FlaskConical, Dna, Atom,
  Languages, Globe, Landmark, Users, Sparkles, Palette, BookOpen,
  Wrench, Sprout, Microscope, GraduationCap, HeartHandshake, Crown,
} from 'lucide-react'
import { createAvatar } from '@dicebear/core'
import { adventurer, lorelei } from '@dicebear/collection'

// ─── Data (data-driven: add/remove teachers here, no JSX changes needed) ─────
// Leadership order: Director → Heads → teaching team.
export type TeacherRole = 'director' | 'head' | 'teacher'

export interface Teacher {
  name: string
  badge: string
  role: TeacherRole
  subjects: string[]
  focus: string
  /** Small leadership descriptor shown under the badge (heads only). */
  microLabel?: string
  /** Subject specialization line, e.g. "Biology". */
  specialization?: string
  /** Set for female teachers so the illustrated avatar matches. */
  female?: boolean
  /** Anchor-card bullet points (director only). */
  leadershipPoints?: string[]
  /** Optional portrait URL — illustrated avatar is generated when absent. */
  photo?: string
}

const SUBJECT_ICONS: Record<string, any> = {
  Mathematics: Calculator,
  Chemistry: FlaskConical,
  Biology: Dna,
  Physics: Atom,
  Kiswahili: Languages,
  Geography: Globe,
  History: Landmark,
  'Social Studies': Users,
  CRE: Sparkles,
  'Creative Arts': Palette,
  'English Literature': BookOpen,
  'Pre-technical Studies': Wrench,
  Agriculture: Sprout,
  'Integrated Science': Microscope,
}

const ACCENTS = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-orange-500',
  'from-sky-500 to-cyan-500',
  'from-amber-500 to-yellow-500',
  'from-fuchsia-500 to-purple-500',
]

export const TEACHERS: Teacher[] = [
  {
    name: 'Githinji Kamau',
    badge: 'Director',
    role: 'director',
    subjects: ['Mathematics', 'Chemistry'],
    focus: 'Founder. Educator. Leader. Mentor — the vision behind Peak Campus.',
    leadershipPoints: ['Academic Vision', 'Student Growth', 'Mathematics & Chemistry'],
  },
  {
    name: 'Mr Justus',
    badge: 'Head of Academics',
    role: 'head',
    subjects: ['Mathematics', 'Physics'],
    microLabel: 'Academic Leadership',
    focus: 'Owns curriculum, teaching quality and academic standards across Peak Campus.',
  },
  {
    // Head of Discipline & Student Welfare — same profile as the
    // Kiswahili / Geography / Integrated Science teacher (no duplicate card).
    name: 'Joseph Mwaura',
    badge: 'Head of Discipline & Student Welfare',
    role: 'head',
    subjects: ['Kiswahili', 'Geography', 'Integrated Science'],
    microLabel: 'Student Welfare',
    focus: 'Peak Campus cares beyond marks — mentorship, well-being and community.',
  },
  {
    name: 'Antony Mwaura',
    badge: 'BED Science',
    role: 'teacher',
    subjects: ['Mathematics', 'Biology'],
    specialization: 'Biology',
    focus: 'Making biology and mathematics click with clear diagrams and step-by-step mastery.',
  },
  {
    name: 'Vincent Wesala',
    badge: 'BED Science',
    role: 'teacher',
    subjects: ['Mathematics', 'Chemistry', 'Integrated Science'],
    focus: 'Helping students develop mathematical confidence and scientific thinking.',
  },
  {
    name: 'Mr Muchiri',
    badge: 'BED Education',
    role: 'teacher',
    subjects: ['Kiswahili', 'History', 'Social Studies'],
    focus: 'Stories, language and heritage — lessons students remember long after class.',
  },
  {
    name: 'Mr Simon',
    badge: 'Tutor',
    role: 'teacher',
    subjects: ['CRE', 'Creative Arts'],
    focus: 'Nurturing values, faith and creativity in every learner.',
  },
  {
    name: 'Madam Brooklyne',
    badge: 'Tutor',
    role: 'teacher',
    subjects: ['English Literature'],
    female: true,
    focus: 'Bringing set books to life and growing expressive, analytical readers.',
  },
  {
    name: 'Mr Levi',
    badge: 'BED Education',
    role: 'teacher',
    subjects: ['Kiswahili', 'Geography', 'Pre-technical Studies', 'Agriculture'],
    focus: 'Practical skills and academic grounding for confident, capable learners.',
  },
]

const SHORT_HAIR = [
  'short01', 'short02', 'short03', 'short04', 'short05', 'short06',
  'short07', 'short08', 'short09', 'short10', 'short11', 'short12',
  'short13', 'short14', 'short15', 'short16', 'short17', 'short18', 'short19',
]

function avatarFor(name: string, female = false): string {
  if (female) {
    // Feminine-presenting set for Madam Brooklyne.
    return createAvatar(lorelei, {
      seed: name,
      backgroundColor: ['e0e7ff', 'd1fae5', 'fee2e2', 'fef3c7', 'e0f2fe', 'f3e8ff'],
    }).toDataUri()
  }
  // Masculine-presenting: short natural-dark hair only, never earrings,
  // so every male teacher reads clearly male.
  return createAvatar(adventurer, {
    seed: name,
    backgroundColor: ['e0e7ff', 'd1fae5', 'fee2e2', 'fef3c7', 'e0f2fe', 'f3e8ff'],
    hair: SHORT_HAIR,
    hairColor: ['0e0e0e', '2f2f2f', '4a3728'],
    earringsProbability: 0,
  }).toDataUri()
}

function TeacherCard({ teacher, accent }: { teacher: Teacher; accent: string }) {
  const avatar = useMemo(
    () => teacher.photo || avatarFor(teacher.name, teacher.female),
    [teacher.photo, teacher.name, teacher.female]
  )
  const LeadIcon = SUBJECT_ICONS[teacher.subjects[0]] || GraduationCap
  const isDirector = teacher.role === 'director'
  const isHead = teacher.role === 'head'
  const isLeader = isDirector || isHead
  const HeadIcon = teacher.name === 'Mr Justus' ? GraduationCap : HeartHandshake

  return (
    <article
      className={`group relative h-full rounded-3xl bg-white border p-7 text-center transition-all duration-500 hover:-translate-y-2 overflow-hidden ${
        isDirector
          ? 'pt-9 border-amber-200 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.4)] hover:shadow-[0_30px_70px_-15px_rgba(15,23,42,0.45)]'
          : 'pt-9 border-slate-100 shadow-[0_10px_40px_-15px_rgba(15,23,42,0.25)] hover:shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)]'
      }`}
    >
      {/* Accent wash + floating subject glyph */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${accent} ${isDirector ? 'opacity-20 group-hover:opacity-30' : 'opacity-10'} transition-opacity duration-500`} aria-hidden />
      <LeadIcon
        className="pointer-events-none absolute -right-4 -bottom-4 w-28 h-28 text-slate-100 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
        aria-hidden
      />

      {/* Leadership eyebrow (spotlight tag, not a separate section) */}
      {isLeader && (
        <p className="relative text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">
          Leadership
        </p>
      )}

      {/* Avatar — director gets larger portrait + animated accent ring + emblem */}
      <div className={`relative mx-auto mb-4 ${isDirector ? 'w-28 h-28' : 'w-24 h-24'}`}>
        <div
          className={`absolute -inset-1.5 rounded-full bg-gradient-to-tr ${accent} opacity-60 transition-all duration-500 group-hover:opacity-100 group-hover:rotate-12`}
          aria-hidden
        />
        <div className="absolute -inset-1.5 rounded-full bg-white" aria-hidden />
        <img
          src={avatar}
          alt={`Illustrated avatar of ${teacher.name}`}
          loading="lazy"
          draggable={false}
          className={`relative rounded-full object-cover bg-slate-50 transition-transform duration-500 group-hover:scale-105 ${isDirector ? 'w-28 h-28' : 'w-24 h-24'}`}
        />
        {isDirector && (
          <span className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-white flex items-center justify-center shadow-lg" title="Peak Campus Director">
            <Crown size={16} aria-hidden />
          </span>
        )}
      </div>

      <h3 className={`font-bold text-slate-900 ${isDirector ? 'text-2xl tracking-tight' : 'text-xl'}`}>
        {teacher.name}
      </h3>
      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest text-white transition-shadow duration-500 group-hover:shadow-lg ${isDirector ? `bg-gradient-to-r ${accent} shadow-md` : `bg-gradient-to-r ${accent}`}`}>
        {teacher.badge}
      </span>
      {isHead && teacher.microLabel && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <HeadIcon size={13} aria-hidden /> {teacher.microLabel}
        </p>
      )}

      {/* Director anchor line */}
      {isDirector && (
        <p className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
          Leadership • Mathematics • Chemistry
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-1.5 mt-4">
        {teacher.subjects.map((s) => (
          <span
            key={s}
            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold transition-colors duration-300 group-hover:bg-indigo-50 group-hover:text-indigo-700"
          >
            {s}
          </span>
        ))}
      </div>
      {teacher.specialization && (
        <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-emerald-600">
          Specialization: {teacher.specialization}
        </p>
      )}

      {/* Director anchor bullets */}
      {isDirector && teacher.leadershipPoints && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-sm font-bold text-slate-700">Leading Peak Campus</p>
          <ul className="mt-2 space-y-1">
            {teacher.leadershipPoints.map((pt) => (
              <li key={pt} className="text-xs font-semibold text-slate-500">• {pt}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Hover-revealed focus line */}
      <p className="text-sm text-slate-500 leading-relaxed mt-4 max-h-0 opacity-0 overflow-hidden transition-all duration-500 group-hover:max-h-28 group-hover:opacity-100">
        “{teacher.focus}”
      </p>
      {/* Always-visible on touch devices where hover doesn't exist */}
      <p className="text-sm text-slate-500 leading-relaxed mt-4 [@media(hover:hover)]:hidden">
        “{teacher.focus}”
      </p>
    </article>
  )
}

export function TeachersCarousel() {
  const ref = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  const [perView, setPerView] = useState(3)
  const [index, setIndex] = useState(TEACHERS.length) // start on middle copy
  const [animate, setAnimate] = useState(true)
  const [paused, setPaused] = useState(false)
  const [dragPx, setDragPx] = useState(0)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchX = useRef<number | null>(null)
  const drag = useRef<{ startX: number; lastX: number; lastT: number; velocity: number; moved: boolean } | null>(null)

  const N = TEACHERS.length
  const loop = useMemo(() => [...TEACHERS, ...TEACHERS, ...TEACHERS], [])
  const pos = ((index % N) + N) % N

  // Responsive visible count: 3 / 2 / 1
  useEffect(() => {
    const update = () => {
      setPerView(window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const goTo = useCallback((i: number) => setIndex(i), [])
  const prev = useCallback(() => setIndex((v) => v - 1), [])
  const next = useCallback(() => setIndex((v) => v + 1), [])

  // Seamless infinite loop: when the transition lands on an outer copy,
  // jump (without animation) to the identical middle-copy position.
  const handleTransitionEnd = useCallback(() => {
    if (index >= 2 * N) {
      setAnimate(false)
      setIndex(index - N)
    } else if (index < N) {
      setAnimate(false)
      setIndex(index + N)
    }
  }, [index, N])

  useEffect(() => {
    if (!animate) {
      const raf = requestAnimationFrame(() => setAnimate(true))
      return () => cancelAnimationFrame(raf)
    }
  }, [animate])

  // Autoplay with pause-on-hover / interaction, resume when idle.
  // Disabled entirely when the user prefers reduced motion.
  useEffect(() => {
    if (paused || !isInView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setIndex((v) => v + 1), 4500)
    return () => clearInterval(timer)
  }, [paused, isInView])

  const poke = useCallback(() => {
    setPaused(true)
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setPaused(false), 6000)
  }, [])

  useEffect(() => () => { if (idleTimer.current) clearTimeout(idleTimer.current) }, [])

  // Touch swipe support
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 40) return
    poke()
    if (dx < 0) next()
    else prev()
  }

  // Mouse / pointer drag with momentum + snap
  const cardPx = () => {
    const vp = viewportRef.current
    if (!vp) return 300
    return vp.clientWidth / perView
  }
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    poke()
    drag.current = { startX: e.clientX, lastX: e.clientX, lastT: Date.now(), velocity: 0, moved: false }
    setAnimate(false)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) > 6) d.moved = true
    const now = Date.now()
    const dt = Math.max(1, now - d.lastT)
    d.velocity = (e.clientX - d.lastX) / dt // px per ms
    d.lastX = e.clientX
    d.lastT = now
    setDragPx(dx)
  }
  const endDrag = useCallback(() => {
    const d = drag.current
    drag.current = null
    if (!d || !d.moved) {
      setDragPx(0)
      setAnimate(true)
      return
    }
    const w = cardPx()
    const travelled = d.startX - d.lastX // >0 means dragged left → next
    let steps = Math.round(travelled / w)
    // Momentum: fast flicks carry one extra card
    if (Math.abs(d.velocity) > 0.5) steps += travelled > 0 ? 1 : -1
    if (steps === 0) steps = travelled > 0 ? 1 : -1
    // Clamp to sane range so a wild drag can't fling across copies
    steps = Math.max(-2, Math.min(2, steps))
    setDragPx(0)
    setAnimate(true)
    setIndex((v) => v + steps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perView])
  const onPointerUp = () => endDrag()
  const onPointerCancel = () => { drag.current = null; setDragPx(0); setAnimate(true) }

  return (
    <section id="teachers" ref={ref} className="relative py-16 md:py-24 overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/60 via-transparent to-slate-50/60" aria-hidden />

      <div className="relative z-10 landing-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-14 max-w-2xl mx-auto"
        >
          <span className="peak-label peak-label-cyan mb-4 block">MEET OUR TEACHERS</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            Meet Our Teachers
          </h2>
          <p className="mt-3 text-lg font-semibold text-peak-green">
            The people behind Peak Campus
          </p>
          <p className="mt-3 text-slate-500 leading-relaxed">
            Our teachers do more than teach subjects. They help students build confidence,
            develop discipline, understand difficult concepts, and discover what they are
            capable of. Great learning starts with great people.
          </p>
        </motion.div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative max-w-6xl mx-auto"
          role="region"
          aria-roledescription="carousel"
          aria-label="Meet our teachers"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') { poke(); prev() }
            if (e.key === 'ArrowRight') { poke(); next() }
          }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {/* Chevrons */}
          <button
            onClick={() => { poke(); prev() }}
            aria-label="Previous teachers"
            className="hidden sm:flex absolute -left-5 lg:-left-7 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-slate-100 items-center justify-center text-slate-700 transition-all hover:scale-110 hover:bg-slate-900 hover:text-white"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => { poke(); next() }}
            aria-label="Next teachers"
            className="hidden sm:flex absolute -right-5 lg:-right-7 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-slate-100 items-center justify-center text-slate-700 transition-all hover:scale-110 hover:bg-slate-900 hover:text-white"
          >
            <ChevronRight size={20} />
          </button>

          <div
            ref={viewportRef}
            className="overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y select-none"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
          >
            <div
              className="flex"
              style={{
                transform: `translateX(calc(-${(index * 100) / perView}% + ${dragPx}px))`,
                transition: animate ? 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
              }}
              onTransitionEnd={handleTransitionEnd}
              aria-live="polite"
            >
              {loop.map((t, i) => (
                <div
                  key={`${t.name}-${i}`}
                  className="shrink-0 px-3"
                  style={{ width: `${100 / perView}%` }}
                  aria-hidden={i % N !== pos}
                >
                  <TeacherCard teacher={t} accent={ACCENTS[(i % N) % ACCENTS.length]} />
                </div>
              ))}
            </div>
          </div>

          {/* Position dots (mobile-first indicator) */}
          <div className="flex justify-center gap-2 mt-8" role="tablist" aria-label="Carousel position">
            {TEACHERS.map((t, i) => (
              <button
                key={t.name}
                role="tab"
                aria-selected={i === pos}
                aria-label={`Go to teacher ${i + 1}: ${t.name}`}
                onClick={() => { poke(); goTo(N + i) }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === pos ? 'w-8 bg-slate-900' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
          {/* Mobile chevrons */}
          <div className="flex sm:hidden justify-center gap-4 mt-5">
            <button
              onClick={() => { poke(); prev() }}
              aria-label="Previous teachers"
              className="w-11 h-11 rounded-full bg-white shadow border border-slate-100 flex items-center justify-center text-slate-700"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => { poke(); next() }}
              aria-label="Next teachers"
              className="w-11 h-11 rounded-full bg-white shadow border border-slate-100 flex items-center justify-center text-slate-700"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>

        {/* Trust statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="text-center mt-12 max-w-xl mx-auto"
        >
          <p className="text-xl font-bold text-slate-900">More Than Teachers</p>
          <p className="mt-2 text-slate-500 leading-relaxed">
            Our teachers are mentors, guides, and people who genuinely care about the
            growth of every student.
          </p>
          <p className="mt-3 text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
            Academic excellence. Discipline. Confidence. Character.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
