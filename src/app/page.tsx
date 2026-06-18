'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LineChart,
  MapPin,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  ChevronDown,
  Star,
  TrendingUp,
  Award,
  Phone,
  Calendar,
  ArrowUpRight,
  Clock3,
  BrainCircuit,
  Compass,
  HeartHandshake,
  ScanSearch,
} from 'lucide-react'
import { PremiumCarousel } from '@/components/ui/PremiumCarousel'
import { PublicPortalMenu } from '@/components/ui/PublicPortalMenu'

const campusGalleryImages = Array.from(
  { length: 49 },
  (_, index) => `/campus-gallery-${String(index + 1).padStart(2, '0')}.jpeg`
)

const galleryImages = [
  ...campusGalleryImages,
  '/media__1776963140035.jpg',
  '/media__1776963140037.jpg',
  '/media__1776963140335.jpg',
  '/media__1776963140480.jpg',
  '/media__1776963140564.jpg',
  '/media__1776964680100.jpg',
  '/media__1776964680146.jpg',
]

const cbcCurriculumImages = [
  '/cbc-hands-on-01.jpeg',
  '/cbc-hands-on-04.jpeg',
  '/cbc-hands-on-06.jpeg',
  '/cbc-hands-on-09.jpeg',
  '/cbc-hands-on-13.jpeg',
]

const outcomes = [
  { label: 'Diagnostics first', value: '1:1 profile', icon: ClipboardCheck },
  { label: 'Session rhythm', value: '90 minutes', icon: PlayCircle },
  { label: 'Curricula covered', value: '8-4-4 + CBC', icon: GraduationCap },
  { label: 'Program intakes', value: 'Apr / Aug / Dec', icon: BarChart3 },
]

const methodSteps = [
  {
    title: 'Find the exact gap',
    body: 'Every learner starts with a diagnostic profile: marks, habits, confidence, weak subjects, and the reason marks are leaking.',
    icon: Target,
  },
  {
    title: 'Place them in the right tier',
    body: 'Peak Performers chase A-level precision, Momentum Builders convert theory into application, and Climbers rebuild foundations safely.',
    icon: Users,
  },
  {
    title: 'Make students produce',
    body: 'Guides use Socratic questioning, active recall, Feynman explanations, scaffolded wins, and timed deliberate practice.',
    icon: BookOpenCheck,
  },
  {
    title: 'Track visible movement',
    body: 'Progress is measured through mark audits, live corrections, exam language, CBC rubrics, and session-by-session feedback.',
    icon: LineChart,
  },
]

const painSolutions = [
  ['Crowded classrooms', 'Small guided groups by ability, goal, and learning gap.'],
  ['Students who read but forget', 'Active recall and blurting make gaps visible immediately.'],
  ['D and C students losing hope', 'Scaffolded wins rebuild confidence before adding complexity.'],
  ['B students stuck below A', 'Timed exam pressure, marking-scheme language, and harder questions.'],
]

const peakIdentity = [
  {
    title: 'Diagnostic before teaching',
    body: 'We begin by understanding marks, habits, confidence, curriculum gaps, and the learner behind the report card.',
    icon: ScanSearch,
  },
  {
    title: 'Human guidance, precisely matched',
    body: 'Students learn in small, ability-matched groups with a guide who adjusts challenge, pace, and explanation in real time.',
    icon: HeartHandshake,
  },
  {
    title: 'Progress families can see',
    body: 'Practice, feedback, attendance, live sessions, and academic movement stay connected in one Peak learning system.',
    icon: Compass,
  },
]

const programmes = [
  {
    title: 'KCSE Precision',
    body: 'Past-paper strategy, examiner phrasing, timing, mark hunting, and high-yield topic recovery for 8-4-4 learners.',
    href: '/kcse-and-cbc-tutoring-kenya',
  },
  {
    title: 'CBC Competency',
    body: 'Practical scenarios, rubrics, real-world anchors, projects, troubleshooting, and confident explanation.',
    href: '/kcse-and-cbc-tutoring-kenya',
  },
  {
    title: 'Live Sessions',
    body: 'Online learning spaces for classes, chat, quizzes, whiteboard work, reflections, and parent visibility.',
    href: '/student/live',
  },
]

const portals = [
  { label: 'Student Portal', href: '/auth/login?role=student', icon: GraduationCap },
  { label: 'Parent Portal', href: '/auth/login?role=parent', icon: ShieldCheck },
  { label: 'Teacher Studio', href: '/auth/login?role=teacher', icon: Users },
]

const results = [
  { value: '500+', label: 'Students tutored', icon: Users },
  { value: '2x', label: 'Average grade jump', icon: TrendingUp },
  { value: '94%', label: 'Parent satisfaction', icon: Star },
  { value: '17', label: 'A grades (2025)', icon: Award },
]

const faqs = [
  {
    q: 'Which curricula do you cover?',
    a: 'Both 8-4-4 (KCSE) and CBC (KPSEA, KJSEA, Senior School). Every session is aligned to the specific syllabus, exam format, and marking scheme your child follows at school.',
  },
  {
    q: 'How much does it cost?',
    a: 'Sessions are priced per term with sibling and referral discounts. Contact us for a personalised fee breakdown — we work with families to find a plan that fits.',
  },
  {
    q: 'Where do sessions take place?',
    a: 'At our Nairobi hub (for in-person guided sessions) and online via the Peak platform for live classes, quizzes, assignments, and parent progress reports.',
  },
  {
    q: 'How do you group students?',
    a: 'After a diagnostic assessment, learners are placed into one of three tiers: Peak Performers (A-target), Momentum Builders (C→B), or Climbers (foundation recovery). Groups are small — 3 to 6 students per guide.',
  },
  {
    q: 'When do new intakes start?',
    a: 'Three intake windows per year: April, August, and December. Holiday boost programmes also run between terms.',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.12, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } }),
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.7 } },
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-bold text-[#073159]">{question}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="pb-4 text-sm leading-6 text-slate-600">{answer}</div>
      )}
    </div>
  )
}

function PremiumLandingHero() {
  return (
    <section className="relative overflow-hidden bg-[#071a2d] text-white">
      <motion.div
        aria-hidden="true"
        animate={{ x: [0, 45, 0], y: [0, -30, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-32 top-28 h-80 w-80 rounded-full bg-[#145da0]/20 blur-3xl"
      />
      <div className="absolute right-0 top-0 h-full w-2/3 bg-[radial-gradient(circle_at_70%_35%,rgba(183,239,101,0.12),transparent_42%)]" />

      <nav className="relative z-50 mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-5 lg:px-8">
        <div className="flex h-[64px] items-center justify-between rounded-2xl border border-white/10 bg-white/[0.07] px-3 shadow-[0_18px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:h-[72px] sm:px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <motion.img
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.5 } }}
              src="/logo.png"
              alt="Peak Performance logo"
              className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-0.5 shadow-lg sm:h-12 sm:w-12"
              loading="eager"
            />
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.1 } }}
              className="min-w-0"
            >
              <div className="truncate font-playfair text-[17px] font-semibold leading-none tracking-[-0.02em] sm:text-xl">Peak Performance</div>
              <div className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.2em] text-[#7ed957] sm:text-[10px]">Tutoring Kenya</div>
            </motion.div>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-semibold text-white/65 md:flex">
            <Link href="#who-we-are" className="transition hover:text-white">Who We Are</Link>
            <Link href="#how-it-works" className="transition hover:text-white">How It Works</Link>
            <Link href="#programmes" className="transition hover:text-white">Programmes</Link>
            <Link href="/tuition-center-nairobi" className="transition hover:text-white">Nairobi Campus</Link>
          </div>
          <PublicPortalMenu />
        </div>
      </nav>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:min-h-[720px] lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:px-8 lg:py-20">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.2 } }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#7ed957]/25 bg-[#7ed957]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#a5ef87] backdrop-blur sm:text-xs"
          >
            <Sparkles size={14} /> Nairobi&apos;s diagnostic-first learning studio
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] } }}
            className="font-playfair text-[clamp(3.25rem,9vw,5.9rem)] font-semibold leading-[0.88] tracking-[-0.055em]"
          >
            Tutoring built for <span className="text-[#7ed957]">measurable</span> progress.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.5 } }}
            className="mt-7 max-w-2xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8"
          >
            We find the exact reason marks are being lost, build a personal learning route, and turn every session into visible academic movement for Kenyan 8-4-4 and CBC learners.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.65 } }}
            className="mt-9 flex flex-col gap-3 min-[430px]:flex-row"
          >
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7ed957] px-6 py-3.5 text-sm font-black text-[#073159] shadow-[0_16px_35px_rgba(76,175,37,0.22)] transition hover:-translate-y-0.5 hover:bg-white"
            >
              Book a free diagnostic <ArrowUpRight size={17} />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Explore the Peak method
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.6, delay: 0.85 } }}
            className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-white/50"
          >
            <span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#7ed957]" /> Small, ability-matched groups</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#7ed957]" /> Parent-visible progress</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1, transition: { duration: 0.8, delay: 0.45 } }}
          className="relative mx-auto w-full max-w-[570px] lg:mx-0"
        >
          <div className="absolute -inset-3 rounded-[2rem] border border-white/10 sm:-inset-5 sm:rounded-[2.5rem]" />
          <div className="relative overflow-hidden rounded-[1.5rem] bg-white/10 shadow-[0_36px_90px_rgba(0,0,0,0.4)] sm:rounded-[2rem]">
            <motion.img
              animate={{ scale: [1, 1.035, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              src="/media__1776963140564.jpg"
              alt="Peak Performance students in a focused learning session"
              className="h-[370px] w-full object-cover object-center sm:h-[540px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071a2d]/75 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
              <div className="max-w-sm rounded-2xl border border-white/15 bg-[#071a2d]/75 p-4 backdrop-blur-xl sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7ed957]">The Peak difference</span>
                  <BrainCircuit size={18} className="text-[#7ed957]" />
                </div>
                <p className="mt-2 font-playfair text-xl font-semibold leading-tight sm:text-2xl">Every learner gets a route, not a routine.</p>
              </div>
            </div>
          </div>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-1 top-5 rounded-2xl border border-white/15 bg-white px-3 py-3 text-[#071a2d] shadow-2xl sm:-right-7 sm:top-9 sm:px-4"
          >
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#145da0]"><Clock3 size={14} /> Focused rhythm</div>
            <div className="mt-1 font-playfair text-lg font-semibold sm:text-xl">90-minute sessions</div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

function HowPeakTutors() {
  return (
    <motion.section
      id="how-it-works"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      className="relative overflow-hidden bg-[#073159] px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8"
    >
      <motion.div
        aria-hidden="true"
        animate={{ x: ['-15%', '115%'] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        className="absolute top-0 h-px w-1/3 bg-gradient-to-r from-transparent via-[#7ed957] to-transparent"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_90%,rgba(20,93,160,0.42),transparent_32%)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <motion.div variants={fadeUp}>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7ed957]">How we do tutoring</p>
            <h2 className="mt-5 text-4xl font-semibold leading-none sm:text-6xl">A deliberate journey from diagnosis to independence.</h2>
          </motion.div>
          <motion.div variants={fadeUp} custom={1} className="max-w-2xl lg:justify-self-end">
            <p className="text-base leading-8 text-white/64">
              Peak is not homework supervision. Each learner moves through a repeatable teaching cycle that reveals gaps, builds understanding, tests application, and records the next best action.
            </p>
            <Link href="/about" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#7ed957] transition hover:gap-3 hover:text-white">
              Explore our full teaching philosophy <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>

        <div className="relative mt-14 grid gap-4 lg:grid-cols-4">
          <div className="absolute left-[12%] right-[12%] top-9 hidden h-px bg-gradient-to-r from-[#4caf25]/20 via-[#7ed957] to-[#4caf25]/20 lg:block" />
          {methodSteps.map(({ title, body, icon: Icon }, index) => (
            <motion.article
              key={title}
              custom={index}
              variants={fadeUp}
              whileHover={{ y: -10, scale: 1.015 }}
              className="group relative rounded-[1.5rem] border border-white/12 bg-white/[0.055] p-6 backdrop-blur-sm transition-colors hover:border-[#7ed957]/40 hover:bg-white/[0.09]"
            >
              <motion.div
                whileHover={{ rotate: 8, scale: 1.08 }}
                className="relative z-10 grid h-[72px] w-[72px] place-items-center rounded-2xl border border-[#7ed957]/25 bg-[#062744] text-[#7ed957] shadow-xl"
              >
                <Icon size={29} />
              </motion.div>
              <div className="mt-8 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7ed957]">Stage {index + 1}</span>
                <span className="font-playfair text-2xl text-white/20">0{index + 1}</span>
              </div>
              <h3 className="mt-3 text-2xl font-semibold leading-tight">{title}</h3>
              <p className="mt-4 text-sm leading-7 text-white/58">{body}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scaleX: 0.85 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 rounded-2xl border border-[#145da0]/40 bg-[#062744] px-5 py-4 text-xs font-bold text-white/65"
        >
          <span>Diagnostic profile</span>
          <ArrowRight size={14} className="text-[#7ed957]" />
          <span>Ability-matched group</span>
          <ArrowRight size={14} className="text-[#7ed957]" />
          <span>Active production</span>
          <ArrowRight size={14} className="text-[#7ed957]" />
          <span>Measured next step</span>
        </motion.div>
      </div>
    </motion.section>
  )
}

export default function HomePage() {
  const [tuitionEvents, setTuitionEvents] = useState<any[]>([])
  
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    supabase.from('tuition_events')
      .select('*')
      .eq('is_active', true)
      .order('start_date', { ascending: true })
      .limit(3)
      .then(({ data }) => {
        if (data) setTuitionEvents(data)
      })
  }, [])

  return (
    <main className="premium-landing min-h-screen bg-[#f4f8fb] pb-[64px] font-dm-sans text-[#073159] sm:pb-[68px]">
      {/* ── Sticky CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#071a2d]/95 shadow-[0_-16px_45px_rgba(2,6,23,0.18)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-3 py-2.5 sm:justify-between sm:px-6 lg:px-8">
          <span className="hidden text-sm font-bold text-white sm:inline">
            Begin with clarity. Your first diagnostic session is complimentary.
          </span>
          <Link
            href="/auth/register"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7ed957] px-5 py-2.5 text-xs font-black uppercase tracking-[0.13em] text-[#073159] transition hover:bg-white sm:w-auto sm:text-sm"
          >
            <Phone size={14} /> Book free diagnostic
          </Link>
        </div>
      </div>

      <PremiumLandingHero />

      <div className="overflow-hidden border-y border-white/10 bg-[#145da0] py-3 text-white">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          className="flex w-max items-center whitespace-nowrap"
        >
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center">
              {['Diagnose precisely', 'Match intelligently', 'Teach actively', 'Measure visibly', 'Build independence'].map((item) => (
                <span key={`${copy}-${item}`} className="flex items-center">
                  <span className="px-7 text-[10px] font-black uppercase tracking-[0.24em] sm:px-10 sm:text-xs">{item}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7ed957]" />
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Stats ── */}
      <motion.section
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="border-b border-[#145da0]/12 bg-[#eaf3f8]"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-2 sm:grid-cols-4">
          {outcomes.map(({ label, value, icon: Icon }, i) => (
            <motion.div
              key={label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              whileHover={{ y: -5, backgroundColor: '#ffffff' }}
              className="border-b border-r border-[#071a2d]/10 px-4 py-6 sm:border-b-0 sm:px-6 sm:py-8"
            >
              <Icon className="mb-4 h-5 w-5 text-[#145da0]" />
              <div className="font-playfair text-2xl font-semibold tracking-tight text-[#071a2d] sm:text-3xl">{value}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Who Peak is ── */}
      <section id="who-we-are" className="relative overflow-hidden bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <motion.div
          aria-hidden="true"
          animate={{ rotate: 360 }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          className="absolute -right-32 top-16 h-80 w-80 rounded-full border border-[#145da0]/10"
        />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-end lg:gap-20">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0, transition: { duration: 0.6 } }}
            viewport={{ once: true }}
          >
            <div className="mb-5 h-px w-16 bg-[#4caf25]" />
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#145da0]">Who is Peak Performance Tutoring?</p>
            <h2 className="mt-5 text-4xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl">A learning studio built around the individual student.</h2>
            <p className="mt-6 text-base leading-8 text-[#496174]">
              Peak Performance Tutoring is a Nairobi-based academic support system for Kenyan 8-4-4 and CBC learners. We combine skilled human tutoring, small-group attention, diagnostic insight, and a connected digital campus.
            </p>
            <p className="mt-4 text-base leading-8 text-[#496174]">
              Schools carry the syllabus. Peak carries the learner: how they think, where confidence drops, why marks leak, and what must happen next.
            </p>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-3">
            {peakIdentity.map(({ title, body, icon: Icon }, i) => (
              <motion.div
                key={title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.25 }}
                whileHover={{ y: -8 }}
                className="group relative overflow-hidden rounded-[1.5rem] border border-[#145da0]/12 bg-[#f4f9fc] p-6 shadow-[0_18px_45px_rgba(7,49,89,0.06)] transition-shadow hover:shadow-[0_24px_60px_rgba(7,49,89,0.13)]"
              >
                <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#145da0] to-[#4caf25] transition-transform duration-500 group-hover:scale-x-100" />
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#073159] text-white shadow-lg shadow-[#073159]/15">
                  <Icon size={22} />
                </div>
                <div className="mt-8 text-[10px] font-black uppercase tracking-[0.18em] text-[#4caf25]">0{i + 1}</div>
                <h3 className="mt-3 text-xl font-semibold leading-tight text-[#073159]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5d7180]">{body}</p>
              </motion.div>
            ))}
          </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.15 } }}
            viewport={{ once: true }}
            className="mt-16 grid overflow-hidden rounded-[1.5rem] border border-[#145da0]/12 bg-[#073159] sm:grid-cols-2 lg:grid-cols-4"
          >
            {painSolutions.map(([problem, solution], index) => (
              <div key={problem} className="border-b border-white/10 p-5 sm:border-r lg:border-b-0 lg:p-6">
                <div className="text-[10px] font-black uppercase tracking-[0.17em] text-[#7ed957]">What changes</div>
                <div className="mt-2 text-sm font-bold text-white">{problem}</div>
                <p className="mt-2 text-xs leading-5 text-white/58">{solution}</p>
                <div className="mt-4 h-0.5 w-8 bg-[#4caf25]" style={{ opacity: 1 - index * 0.14 }} />
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <HowPeakTutors />

      {/* ── Results counter ── */}
      <motion.section
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="border-y border-[#145da0]/20 bg-[#0b4d83] px-4 py-14 text-white sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
            viewport={{ once: true }}
            className="text-center text-xs font-black uppercase tracking-[0.22em] text-[#7ed957]"
          >
            Real results from real students
          </motion.p>
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {results.map(({ value, label, icon: Icon }, i) => (
              <motion.div
                key={label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ y: -6, scale: 1.03 }}
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 text-center"
              >
                <Icon className="mx-auto h-6 w-6 text-[#7ed957]" />
                <div className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{value}</div>
                <div className="mt-1 text-sm font-medium text-white/60">{label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── CBC section ── */}
      <motion.section
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="border-y border-[#145da0]/12 bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0, transition: { duration: 0.6 } }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#145da0]">CBC curriculum in action</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Hands-on learning is a core part of the Peak promise.</h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              CBC learners need to build, test, observe, explain, and correct. Peak makes practical work visible through guided tasks, real materials, and reflection that turns activity into competence.
            </p>
            <Link href="/kcse-and-cbc-tutoring-kenya" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#073159] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#145da0]">
              Explore CBC support <ArrowRight size={16} />
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0, transition: { duration: 0.6, delay: 0.15 } }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-3"
          >
            <motion.img
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1, transition: { duration: 0.5 } }}
              viewport={{ once: true }}
              src={cbcCurriculumImages[0]}
              alt="CBC practical learning at Peak Performance"
              whileHover={{ scale: 1.015 }}
              className="col-span-2 h-56 w-full rounded-2xl object-cover shadow-[0_20px_50px_rgba(7,49,89,0.12)] sm:h-72"
              loading="lazy"
            />
            {cbcCurriculumImages.slice(1).map((image, index) => (
              <motion.img
                key={image}
                custom={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: index * 0.1 } }}
                viewport={{ once: true }}
                src={image}
                alt={`CBC curriculum hands-on learning ${index + 2}`}
                whileHover={{ y: -5, scale: 1.02 }}
                className="h-32 w-full rounded-2xl object-cover shadow-sm sm:h-40"
                loading="lazy"
              />
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ── Gallery ── */}
      <motion.section
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="px-4 py-14 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
            viewport={{ once: true }}
            className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#145da0]">Campus gallery</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Learning should look focused, warm, and serious.</h2>
            </div>
            <div className="text-sm font-medium text-slate-500">Swipe on mobile. Hover to pause on desktop.</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.6 } }}
            viewport={{ once: true }}
          >
            <PremiumCarousel images={galleryImages} />
          </motion.div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {galleryImages.slice(0, 4).map((image, index) => (
              <motion.img
                key={image}
                custom={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: index * 0.08 } }}
                viewport={{ once: true }}
                src={image}
                alt={`Peak Performance learning moment ${index + 1}`}
                className="h-32 w-full rounded-lg border border-white object-cover shadow-sm sm:h-40"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Programmes ── */}
      <motion.section
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        id="programmes"
        className="scroll-mt-6 border-y border-[#145da0]/12 bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
            viewport={{ once: true }}
            className="mb-8 max-w-3xl"
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#145da0]">Programmes</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Different curricula. One disciplined performance model.</h2>
          </motion.div>
          <div className="grid gap-4 md:grid-cols-3">
            {programmes.map((programme, i) => (
              <motion.div
                key={programme.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <div className="group relative overflow-hidden rounded-2xl border border-[#145da0]/12 bg-[#f4f9fc] p-6 transition hover:-translate-y-2 hover:border-[#4caf25]/40 hover:shadow-[0_22px_55px_rgba(7,49,89,0.12)]">
                  <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#145da0] to-[#4caf25] transition-transform duration-500 group-hover:scale-x-100" />
                  <h3 className="text-2xl font-black tracking-tight">{programme.title}</h3>
                  <p className="mt-3 min-h-24 text-sm leading-relaxed text-slate-600">{programme.body}</p>
                  <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                    <Link href={`/events/register?programme=${encodeURIComponent(programme.title)}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#073159] px-4 py-2.5 text-sm font-black uppercase tracking-wider text-white transition hover:bg-[#145da0]">
                      Register Now <ArrowRight size={16} />
                    </Link>
                    <Link href={programme.href} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#145da0]/20 px-4 py-2.5 text-sm font-bold text-[#145da0]">
                      Explore
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Active Tuition Events ── */}
      {tuitionEvents.length > 0 && (
        <motion.section
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="border-y border-[#145da0]/12 bg-[#eaf3f8] px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
              viewport={{ once: true }}
              className="mb-8 max-w-3xl"
            >
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#145da0]">Upcoming Events</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Join our intensive tuition camps.</h2>
            </motion.div>
            <div className="grid gap-4 md:grid-cols-3">
              {tuitionEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <div className="group block overflow-hidden rounded-[1.6rem] border border-[#145da0]/15 bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#4caf25]/50 hover:shadow-xl">
                    <div className="relative h-52 bg-gradient-to-br from-[#073159] via-[#145da0] to-[#4caf25]">
                      {event.banner_url && (
                        <img src={event.banner_url} alt={`${event.name} poster`} className="h-full w-full object-cover" loading="lazy" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#071a2d]/90 via-[#071a2d]/25 to-transparent" />
                      <div className="absolute inset-x-4 bottom-4 text-white">
                        <div className="mb-3 inline-block rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#2f8517] shadow-sm">
                          {event.is_active ? 'Registering Now' : 'Upcoming'}
                        </div>
                        <h3 className="text-2xl font-black tracking-tight">{event.name}</h3>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="space-y-2 text-sm font-bold text-slate-600">
                        <p className="flex items-center gap-2"><Calendar size={16} className="text-[#145da0]" /> {formatDate(event.start_date)} - {formatDate(event.end_date)}</p>
                      </div>
                      <p className="mt-4 min-h-16 text-sm leading-relaxed text-slate-500 line-clamp-3">
                        {event.description || 'Intensive revision and curriculum coverage. Secure your spot before groups fill up.'}
                      </p>
                      <Link href={`/events/register?eventId=${event.id}`} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#073159] px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition group-hover:bg-[#145da0]">
                        Register Now <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* ── Portals ── */}
      <motion.section
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="px-4 py-14 sm:px-6 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -30, scale: 0.98 }}
            whileInView={{ opacity: 1, x: 0, scale: 1, transition: { duration: 0.6 } }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.01 }}
            className="overflow-hidden rounded-[1.5rem] border border-[#145da0]/12 bg-[#073159] shadow-[0_24px_60px_rgba(7,49,89,0.14)]"
          >
            <img src="/media__1776964680232.jpg" alt="Focused Peak Performance student study setting" className="h-[360px] w-full object-cover sm:h-[460px]" loading="lazy" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0, transition: { duration: 0.6, delay: 0.1 } }}
            viewport={{ once: true }}
          >
            <div className="mb-4 h-1 w-14 bg-[#4caf25]" />
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#145da0]">Connected Peak campus</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">The work stays connected after class.</h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              Students, parents, and teachers each get a focused workspace, so live sessions, progress, assignments, and feedback do not disappear after the lesson ends.
            </p>
            <div className="mt-7 grid gap-3">
              {portals.map(({ label, href, icon: Icon }, i) => (
                <motion.div
                  key={label}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <Link href={href} className="group flex items-center justify-between rounded-2xl border border-[#145da0]/12 bg-white p-4 font-semibold transition hover:-translate-y-0.5 hover:border-[#4caf25]/50 hover:bg-[#f4f9fc]">
                    <span className="flex items-center gap-3"><Icon className="h-5 w-5 text-[#145da0] transition group-hover:text-[#4caf25]" /> {label}</span>
                    <ArrowRight size={17} />
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── FAQ ── */}
      <motion.section
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="border-y border-[#145da0]/12 bg-white px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
            viewport={{ once: true }}
            className="mb-8 max-w-2xl"
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#145da0]">Frequently asked questions</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Everything you need to know before you start.</h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } }}
            viewport={{ once: true }}
            className="divide-y divide-[#145da0]/10 rounded-2xl border border-[#145da0]/12 bg-[#f4f9fc] px-5 shadow-[0_18px_45px_rgba(7,49,89,0.06)]"
          >
            {faqs.map((faq) => (
              <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ── CTA ── */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1, transition: { duration: 0.6 } }}
        viewport={{ once: true }}
        className="bg-[#073159] px-4 py-14 text-white sm:px-6 lg:px-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
          viewport={{ once: true }}
          className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#7ed957]"><MapPin size={16} /> Nairobi · Online · Holiday programmes</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Ready to know exactly where the marks are being lost?</h2>
          </div>
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7ed957] px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-[#073159] transition hover:-translate-y-0.5 hover:bg-white"
          >
            Book diagnostic <ArrowRight size={17} />
          </Link>
        </motion.div>
      </motion.section>
    </main>
  )
}
