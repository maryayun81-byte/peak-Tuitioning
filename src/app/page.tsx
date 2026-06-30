'use client'

import Link from 'next/link'
import { useState, useEffect, type FormEvent } from 'react'
import toast from 'react-hot-toast'
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
  ChevronLeft,
  ChevronRight,
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
  MessageSquareQuote,
  ScanSearch,
  Send,
  BadgeCheck,
  Wallet,
  Newspaper,
} from 'lucide-react'
import { PremiumCarousel } from '@/components/ui/PremiumCarousel'
import { PublicPortalMenu } from '@/components/ui/PublicPortalMenu'
import { getPublicRegistrationCounts, getPublicTuitionEvents } from '@/app/actions/event-registration'
import { getPublicBlogPosts, type MarketingBlogPost } from '@/app/actions/blog'

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

const publicNavLinks = [
  { label: 'Who We Are', href: '#who-we-are' },
  { label: 'Holiday Tuition', href: '/holiday-tuition-kenya' },
  { label: 'Method', href: '#how-it-works' },
  { label: 'Blog', href: '/blog' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Contact', href: '/contact' },
]

const premiumExperienceTiles = [
  {
    title: 'Focused tuition rooms',
    body: 'Quiet, guided spaces where students solve, explain, correct and try again.',
    image: '/media__1776964680232.jpg',
    href: '/tuition-center-nairobi',
  },
  {
    title: 'CBC practical learning',
    body: 'Competency tasks, hands-on observation and real-world explanations for Grades 6-9.',
    image: '/cbc-hands-on-09.jpeg',
    href: '/kcse-and-cbc-tutoring-kenya',
  },
  {
    title: 'Holiday revision energy',
    body: 'Short, intense programmes for catch-up, confidence and exam discipline.',
    image: '/campus-gallery-36.jpeg',
    href: '/holiday-tuition-kenya',
  },
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

const decisionProof = [
  {
    title: 'You know the exact leak',
    body: 'We identify whether the issue is content, exam language, speed, confidence, carelessness, or weak study rhythm.',
    icon: ScanSearch,
  },
  {
    title: 'Your child is placed correctly',
    body: 'A learner chasing an A and a learner rebuilding from a D should never sit in the same lesson plan.',
    icon: Target,
  },
  {
    title: 'Progress is visible',
    body: 'Parents should not wait for the next report card to know whether tuition is working.',
    icon: LineChart,
  },
]

const comparisonRows = [
  ['Starting point', 'A quick topic revision', 'Diagnostic profile and gap map'],
  ['Grouping', 'Mixed ability by convenience', 'Small groups by level, target, and gap'],
  ['Session style', 'Teacher explains, student listens', 'Student explains, solves, corrects, and repeats'],
  ['Parent visibility', 'Verbal updates when asked', 'Connected progress, attendance, practice, and next steps'],
  ['Outcome focus', 'Cover more notes', 'Move marks, confidence, speed, and exam discipline'],
]

const feeSignals = [
  'Term-based tuition plans',
  'Holiday intensive options',
  'Sibling and referral discounts',
  'Physical, online, and hybrid pathways',
]

type LandingTestimonial = {
  id: string
  full_name: string
  role: 'parent' | 'student' | 'teacher' | 'alumni' | 'guardian' | 'other'
  relationship_label?: string | null
  quote: string
  rating: number
  created_at?: string
}

const fallbackTestimonials: LandingTestimonial[] = [
  {
    id: 'fallback-parent-1',
    full_name: 'Mercy W.',
    role: 'parent',
    relationship_label: 'Form 4 parent',
    quote: 'Peak helped us understand exactly why marks were leaking. The feedback was clear, the practice was disciplined, and my child became calmer before exams.',
    rating: 5,
  },
  {
    id: 'fallback-student-1',
    full_name: 'Brian K.',
    role: 'student',
    relationship_label: 'KCSE learner',
    quote: 'The sessions made hard topics feel possible. I liked how tutors pushed us to explain answers, not just copy notes.',
    rating: 5,
  },
  {
    id: 'fallback-teacher-1',
    full_name: 'Ms. Achieng',
    role: 'teacher',
    relationship_label: 'Mathematics teacher',
    quote: 'The strongest thing about Peak is the follow-through. Learners get structure, parents see progress, and teachers can focus on the exact gaps.',
    rating: 5,
  },
  {
    id: 'fallback-parent-2',
    full_name: 'David M.',
    role: 'guardian',
    relationship_label: 'CBC guardian',
    quote: 'My Grade 7 learner finally started enjoying practice because the work felt active and connected to what they do in school.',
    rating: 5,
  },
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
          <div className="hidden items-center gap-6 text-sm font-semibold text-white/65 lg:flex">
            {publicNavLinks.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
          <PublicPortalMenu />
        </div>
      </nav>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:min-h-[720px] lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:px-8 lg:py-20">
        <div className="order-2 max-w-3xl lg:order-1">
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
              href="/events/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7ed957] px-6 py-3.5 text-sm font-black text-[#073159] shadow-[0_16px_35px_rgba(76,175,37,0.22)] transition hover:-translate-y-0.5 hover:bg-white"
            >
              Register for an intake <ArrowUpRight size={17} />
            </Link>
            <Link
              href="/holiday-tuition-kenya"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              View holiday tuition
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.6, delay: 0.85 } }}
            className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-white/50"
          >
            <span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#7ed957]" /> Small, ability-matched groups</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#7ed957]" /> Parent-visible progress</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#7ed957]" /> Upcoming programmes open now</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1, transition: { duration: 0.8, delay: 0.45 } }}
          className="order-1 relative mx-auto w-full max-w-[570px] lg:order-2 lg:mx-0"
        >
          <div className="absolute -inset-3 rounded-[2rem] border border-white/10 sm:-inset-5 sm:rounded-[2.5rem]" />
          <div className="relative overflow-hidden rounded-[1.5rem] bg-white/10 shadow-[0_36px_90px_rgba(0,0,0,0.4)] sm:rounded-[2rem]">
            <motion.img
              animate={{ scale: [1, 1.035, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              src="/peak-hero-classroom.png"
              alt="Peak Performance students in a focused learning session"
              className="h-[370px] w-full object-cover object-[center_42%] sm:h-[540px]"
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

function PremiumExperienceSection() {
  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.18 }}
      className="relative overflow-hidden bg-[#f6fbff] px-4 py-14 sm:px-6 sm:py-18 lg:px-8"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#145da0]/25 to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <motion.div variants={fadeUp}>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#145da0]">The Peak experience</p>
          <h2 className="mt-4 max-w-2xl text-4xl font-black leading-[0.98] tracking-tight text-[#073159] sm:text-6xl">
            A place students can feel proud to belong to.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-8 text-[#496174]">
            The platform should not feel like ordinary tuition. Peak brings together a physical learning atmosphere, CBC practical work, holiday revision energy, and connected digital progress.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/contact" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#073159] px-5 py-3 text-sm font-black uppercase tracking-[0.13em] text-white transition hover:bg-[#145da0]">
              Contact Peak <Phone size={16} />
            </Link>
            <Link href="/events/register" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#145da0]/20 bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.13em] text-[#145da0] transition hover:bg-[#eaf3f8]">
              See open programmes <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-3">
          {premiumExperienceTiles.map((tile, index) => (
            <motion.div
              key={tile.title}
              custom={index}
              variants={fadeUp}
              whileHover={{ y: -8, scale: 1.01 }}
              className="group relative min-h-[320px] overflow-hidden rounded-[1.5rem] shadow-[0_24px_60px_rgba(7,49,89,0.13)]"
            >
              <img src={tile.image} alt={tile.title} className="absolute inset-0 z-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 z-10 bg-[#020812]/42 transition duration-500 group-hover:bg-[#020812]/34" />
              <div className="absolute inset-x-0 bottom-0 z-20 h-[74%] bg-gradient-to-t from-[#020812]/96 via-[#020812]/68 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 z-30 h-48 bg-[#020812]/42" />
              <div className="absolute inset-x-0 bottom-0 z-40 p-5 text-white">
                <div className="mb-3 inline-flex rounded-full bg-[#7ed957] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#073159] shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
                  {index === 0 ? 'Campus' : index === 1 ? 'CBC' : 'Holiday'}
                </div>
                <h3 className="text-2xl font-black tracking-tight drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)]">{tile.title}</h3>
                <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/88 drop-shadow-[0_1px_10px_rgba(0,0,0,0.45)]">{tile.body}</p>
                <Link href={tile.href} className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#a5ef87] transition group-hover:gap-3">
                  Explore <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-8 grid max-w-7xl gap-3 md:grid-cols-4">
        {[
          { title: 'Kinoo access', body: 'St Ignatius Christian School learning point', icon: MapPin },
          { title: 'Parent confidence', body: 'Clear calls, WhatsApp and registration routes', icon: Phone },
          { title: 'CBC experience', body: 'Visual, practical and competency-led support', icon: Sparkles },
          { title: 'KCSE pressure', body: 'Exam language, timing and mark discipline', icon: Award },
        ].map(({ title, body, icon: Icon }, index) => (
          <motion.div
            key={String(title)}
            custom={index}
            variants={fadeUp}
            className="rounded-2xl border border-[#145da0]/10 bg-white p-4 shadow-sm"
          >
            <Icon className="h-5 w-5 text-[#145da0]" />
            <div className="mt-4 text-sm font-black text-[#073159]">{title}</div>
            <p className="mt-1 text-xs leading-5 text-[#5d7180]">{body}</p>
          </motion.div>
        ))}
      </div>
    </motion.section>
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

function ParentDecisionSection() {
  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      className="border-y border-[#145da0]/12 bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <motion.div variants={fadeUp}>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#145da0]">For parents making a serious decision</p>
          <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-[#073159] sm:text-5xl">
            The question is not "can we find tuition?" It is "will this tuition actually move marks?"
          </h2>
          <p className="mt-5 text-base leading-8 text-[#496174]">
            Peak is built for families who want clarity before payment, structure during learning, and visible movement after every cycle.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/events/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#073159] px-5 py-3 text-sm font-black uppercase tracking-[0.13em] text-white transition hover:bg-[#145da0]">
              Start registration <ArrowRight size={16} />
            </Link>
            <Link href="#fees" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#145da0]/20 px-5 py-3 text-sm font-black uppercase tracking-[0.13em] text-[#145da0] transition hover:bg-[#eaf3f8]">
              Request fee breakdown
            </Link>
          </div>
        </motion.div>

        <div className="grid gap-4">
          {decisionProof.map(({ title, body, icon: Icon }, index) => (
            <motion.article
              key={title}
              custom={index}
              variants={fadeUp}
              className="group rounded-[1.5rem] border border-[#145da0]/12 bg-[#f4f9fc] p-5 transition hover:-translate-y-1 hover:border-[#4caf25]/40 hover:bg-white hover:shadow-[0_22px_55px_rgba(7,49,89,0.1)]"
            >
              <div className="flex gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#073159] text-white transition group-hover:bg-[#145da0]">
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#073159]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5d7180]">{body}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

function WhyPeakComparisonSection() {
  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.18 }}
      className="bg-[#073159] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <motion.div variants={fadeUp}>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7ed957]">Peak vs ordinary tuition</p>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              Ordinary tuition repeats school. Peak diagnoses what school missed.
            </h2>
          </motion.div>
          <motion.p variants={fadeUp} custom={1} className="text-base leading-8 text-white/64">
            This is the strongest message for parents: more lessons are not automatically better. Better diagnosis, better grouping, better practice, and better feedback are what change outcomes.
          </motion.p>
        </div>

        <motion.div
          variants={fadeUp}
          custom={2}
          className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.055]"
        >
          <div className="grid grid-cols-[0.78fr_1fr_1fr] border-b border-white/10 bg-white/[0.055] text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
            <div className="p-4">Decision point</div>
            <div className="border-l border-white/10 p-4">Ordinary tuition</div>
            <div className="border-l border-white/10 p-4 text-[#7ed957]">Peak approach</div>
          </div>
          {comparisonRows.map(([label, ordinary, peak]) => (
            <div key={label} className="grid grid-cols-[0.78fr_1fr_1fr] border-b border-white/10 last:border-b-0">
              <div className="p-4 text-sm font-black text-white">{label}</div>
              <div className="border-l border-white/10 p-4 text-sm leading-6 text-white/54">{ordinary}</div>
              <div className="border-l border-white/10 bg-[#7ed957]/[0.055] p-4 text-sm font-semibold leading-6 text-white">{peak}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  )
}

function FeeExpectationSection() {
  return (
    <motion.section
      id="fees"
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      className="border-y border-[#145da0]/12 bg-[#f4f8fb] px-4 py-14 sm:px-6 lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl gap-6 rounded-[1.5rem] border border-[#145da0]/12 bg-white p-6 shadow-[0_20px_55px_rgba(7,49,89,0.08)] md:grid-cols-[1fr_0.85fr] md:p-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#145da0]">Fees without guesswork</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#073159]">Ask for the exact plan before committing.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5d7180]">
            Pricing depends on curriculum, class level, programme intensity, learning mode, and whether the learner joins a term plan or holiday boost. The next best step is a fee breakdown matched to your child.
          </p>
        </div>
        <div className="rounded-[1.25rem] bg-[#073159] p-5 text-white">
          <div className="grid gap-2">
            {feeSignals.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm font-semibold text-white/80">
                <CheckCircle2 size={15} className="text-[#7ed957]" /> {item}
              </div>
            ))}
          </div>
          <Link href="/events/register" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7ed957] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#073159] transition hover:bg-white">
            Request fee breakdown <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </motion.section>
  )
}

function TestimonialCard({ testimonial, featured = false }: { testimonial: LandingTestimonial; featured?: boolean }) {
  const initials = testimonial.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'P'

  return (
    <article
      className={`relative h-full overflow-hidden rounded-[1.5rem] border border-[#145da0]/12 bg-white p-6 shadow-[0_22px_55px_rgba(7,49,89,0.09)] ${
        featured ? 'min-h-[330px]' : 'min-h-[260px] w-[320px] shrink-0'
      }`}
    >
      <div className="absolute right-5 top-5 text-[#145da0]/10">
        <MessageSquareQuote size={52} />
      </div>
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#073159] text-sm font-black text-white shadow-lg shadow-[#073159]/15">
              {initials}
            </div>
            <div>
              <h3 className="font-black leading-tight text-[#073159]">{testimonial.full_name}</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4caf25]">
                {testimonial.relationship_label || testimonial.role}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 rounded-full bg-amber-50 px-2.5 py-1 text-amber-500">
            {Array.from({ length: Math.max(1, Math.min(5, testimonial.rating || 5)) }).map((_, index) => (
              <Star key={index} size={12} className="fill-amber-400" />
            ))}
          </div>
        </div>

        <p className={`${featured ? 'mt-8 text-xl leading-9' : 'mt-6 text-sm leading-7'} font-medium text-[#496174]`}>
          "{testimonial.quote}"
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-[#145da0]/10 pt-5">
          <span className="rounded-full bg-[#eaf3f8] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#145da0]">
            {testimonial.role}
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {testimonial.created_at ? formatDate(testimonial.created_at, 'short') : 'Verified story'}
          </span>
        </div>
      </div>
    </article>
  )
}

function TestimonialsSection({ initialTestimonials }: { initialTestimonials: LandingTestimonial[] }) {
  const supabase = getSupabaseBrowserClient()
  const [testimonials, setTestimonials] = useState<LandingTestimonial[]>(initialTestimonials)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isInteracting, setIsInteracting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    role: 'parent' as LandingTestimonial['role'],
    relationship_label: '',
    quote: '',
    rating: 5,
  })

  const visibleTestimonials = testimonials.length ? testimonials : fallbackTestimonials
  const active = visibleTestimonials[activeIndex % visibleTestimonials.length]
  const marqueeItems = [...visibleTestimonials, ...visibleTestimonials]

  useEffect(() => {
    setTestimonials(initialTestimonials.length ? initialTestimonials : fallbackTestimonials)
    setActiveIndex(0)
  }, [initialTestimonials])

  useEffect(() => {
    if (isInteracting || visibleTestimonials.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % visibleTestimonials.length)
    }, 5200)
    return () => window.clearInterval(timer)
  }, [isInteracting, visibleTestimonials.length])

  const move = (direction: 1 | -1) => {
    setActiveIndex((index) => (index + direction + visibleTestimonials.length) % visibleTestimonials.length)
  }

  const submitTestimonial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fullName = form.full_name.trim()
    const quote = form.quote.trim()
    const relationship = form.relationship_label.trim()

    if (fullName.length < 2) return toast.error('Please enter your name.')
    if (quote.length < 20) return toast.error('Please write a little more about your experience.')

    setSubmitting(true)
    const optimistic: LandingTestimonial = {
      id: `local-${Date.now()}`,
      full_name: fullName,
      role: form.role,
      relationship_label: relationship || form.role,
      quote,
      rating: form.rating,
      created_at: new Date().toISOString(),
    }

    try {
      const { data, error } = await supabase
        .from('landing_testimonials')
        .insert({
          full_name: optimistic.full_name,
          role: optimistic.role,
          relationship_label: relationship || null,
          quote: optimistic.quote,
          rating: optimistic.rating,
          is_published: true,
          source: 'landing_page',
        })
        .select('id, full_name, role, relationship_label, quote, rating, created_at')
        .single()

      if (error) throw error

      const saved = (data || optimistic) as LandingTestimonial
      setTestimonials((current) => [saved, ...current.filter((item) => !item.id.startsWith('local-'))])
      setActiveIndex(0)
      setForm({ full_name: '', role: 'parent', relationship_label: '', quote: '', rating: 5 })
      toast.success('Thank you! Your testimonial has been added.')
    } catch (error: any) {
      setTestimonials((current) => [optimistic, ...current])
      setActiveIndex(0)
      toast.success('Thank you! Your testimonial is showing now and will sync once the database is ready.')
      console.error('[LandingTestimonials] submit failed:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.section
      id="testimonials"
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      className="relative overflow-hidden border-y border-[#145da0]/12 bg-[#f4f8fb] px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#145da0]/10 blur-3xl" />
      <div className="absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-[#7ed957]/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
          viewport={{ once: true }}
          className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#145da0]">Testimonials</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#073159] sm:text-5xl">
              Parents, students and teachers can speak for the work.
            </h2>
          </div>
          <p className="text-base leading-8 text-[#496174]">
            Real stories help new families understand the Peak experience: the confidence, discipline, support, and visible academic movement.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div
            onMouseEnter={() => setIsInteracting(true)}
            onMouseLeave={() => setIsInteracting(false)}
            onFocus={() => setIsInteracting(true)}
            onBlur={() => setIsInteracting(false)}
            onTouchStart={() => setIsInteracting(true)}
            className="min-w-0 space-y-5"
          >
            <div className="relative">
              <TestimonialCard testimonial={active} featured />
              <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-[#145da0]/30 to-transparent" />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => move(-1)}
                  className="grid h-11 w-11 place-items-center rounded-full border border-[#145da0]/15 bg-white text-[#073159] shadow-sm transition hover:-translate-y-0.5 hover:border-[#4caf25]/60"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  className="grid h-11 w-11 place-items-center rounded-full border border-[#145da0]/15 bg-white text-[#073159] shadow-sm transition hover:-translate-y-0.5 hover:border-[#4caf25]/60"
                  aria-label="Next testimonial"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                {visibleTestimonials.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`h-2.5 rounded-full transition-all ${index === activeIndex ? 'w-8 bg-[#145da0]' : 'w-2.5 bg-[#145da0]/20'}`}
                    aria-label={`Show testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-[#145da0]/10 bg-white/70 py-4">
              <motion.div
                animate={isInteracting ? undefined : { x: ['0%', '-50%'] }}
                transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
                className="flex w-max gap-4 px-4"
              >
                {marqueeItems.map((testimonial, index) => (
                  <button
                    key={`${testimonial.id}-${index}`}
                    type="button"
                    onClick={() => setActiveIndex(index % visibleTestimonials.length)}
                    className="text-left"
                  >
                    <TestimonialCard testimonial={testimonial} />
                  </button>
                ))}
              </motion.div>
            </div>
          </div>

          <motion.form
            onSubmit={submitTestimonial}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } }}
            viewport={{ once: true }}
            className="rounded-[1.5rem] border border-[#145da0]/12 bg-[#073159] p-6 text-white shadow-[0_26px_70px_rgba(7,49,89,0.18)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7ed957]">Share your story</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">Send a testimonial</h3>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#7ed957]">
                <MessageSquareQuote size={24} />
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">Name</span>
                <input
                  value={form.full_name}
                  onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#7ed957]/70"
                  placeholder="Your name"
                  maxLength={90}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">I am a</span>
                  <select
                    value={form.role}
                    onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as LandingTestimonial['role'] }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-[#7ed957]/70"
                  >
                    <option className="text-[#073159]" value="parent">Parent</option>
                    <option className="text-[#073159]" value="student">Student</option>
                    <option className="text-[#073159]" value="teacher">Teacher</option>
                    <option className="text-[#073159]" value="guardian">Guardian</option>
                    <option className="text-[#073159]" value="alumni">Alumni</option>
                    <option className="text-[#073159]" value="other">Other</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">Short description</span>
                  <input
                    value={form.relationship_label}
                    onChange={(event) => setForm((current) => ({ ...current, relationship_label: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#7ed957]/70"
                    placeholder="e.g. Form 4 parent, Grade 9 learner"
                    maxLength={90}
                  />
                  <p className="text-[11px] leading-5 text-white/45">This appears under your name on the testimonial card.</p>
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">Testimonial</span>
                <textarea
                  value={form.quote}
                  onChange={(event) => setForm((current) => ({ ...current, quote: event.target.value }))}
                  className="min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium leading-6 text-white outline-none placeholder:text-white/35 focus:border-[#7ed957]/70"
                  placeholder="Tell families what changed after joining Peak..."
                  maxLength={900}
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, rating: index + 1 }))}
                      className="text-amber-300 transition hover:scale-110"
                      aria-label={`Rate ${index + 1} stars`}
                    >
                      <Star size={20} className={index < form.rating ? 'fill-amber-300' : 'text-white/25'} />
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7ed957] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#073159] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Sending...' : 'Send testimonial'} <Send size={15} />
                </button>
              </div>
            </div>
          </motion.form>
        </div>
      </div>
    </motion.section>
  )
}

type PublicEventSlot = {
  eventId: string
  remaining: number
  capacity: number
  chargeAmount?: number | null
  chargeCurrency?: string | null
  chargeFrequency?: string | null
  chargeUnitLabel?: string | null
}

function resolveEventPosterUrl(event: any) {
  const raw = String(event?.posterUrl || event?.banner_url || event?.poster_url || event?.image_url || '').trim()
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw

  const cleanPath = raw
    .replace(/^event-posters\//, '')
    .replace(/^public\//, '')
    .replace(/^\/+/, '')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return raw
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/event-posters/${cleanPath}`
}

function getEventStartTime(event: any) {
  if (!event?.start_date) return null
  const time = String(event.session_start_time || '00:00').slice(0, 5)
  const date = new Date(`${event.start_date}T${time || '00:00'}:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function getCountdownParts(target: Date | null, nowMs: number) {
  if (!target) return null
  const diff = Math.max(0, target.getTime() - nowMs)
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { diff, days, hours, minutes, seconds }
}

function EventCountdown({ event }: { event: any }) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const parts = getCountdownParts(getEventStartTime(event), nowMs)
  if (!parts) return null

  if (parts.diff <= 0) {
    return (
      <div className="rounded-2xl border border-[#7ed957]/25 bg-[#073159] p-3 text-white shadow-[0_14px_35px_rgba(7,49,89,0.16)]">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#bff8a7]">
          <Clock3 size={13} /> Running now
        </div>
        <div className="mt-1 text-sm font-black">Registration still open while spaces last</div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#145da0]/10 bg-[#073159] p-3 text-white shadow-[0_14px_35px_rgba(7,49,89,0.16)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#bff8a7]">
          <Clock3 size={13} /> Starts in
        </span>
        <span className="rounded-full bg-[#7ed957] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#073159]">
          Live countdown
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[
          ['Days', parts.days],
          ['Hrs', parts.hours],
          ['Min', parts.minutes],
          ['Sec', parts.seconds],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white/10 px-2 py-2 text-center ring-1 ring-white/10">
            <div className="text-lg font-black leading-none tabular-nums">{String(value).padStart(2, '0')}</div>
            <div className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/55">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TuitionEventsSection({ tuitionEvents, eventSlots }: { tuitionEvents: any[]; eventSlots: PublicEventSlot[] }) {
  const [failedPosterIds, setFailedPosterIds] = useState<Set<string>>(() => new Set())

  if (tuitionEvents.length === 0) return null

  const eventMeta = (event: any) => {
    const start = event.start_date ? new Date(event.start_date) : null
    const deadline = start && !Number.isNaN(start.getTime())
      ? new Date(start.getTime() - 24 * 60 * 60 * 1000)
      : null
    const mode = event.mode || event.preferred_mode || event.delivery_mode || 'Physical / online'
    const level = event.class_level || event.target_class || event.target_classes || event.curriculum?.name || '8-4-4 + CBC'
    const location = event.event_location || 'Location to be confirmed'
    const startTime = String(event.session_start_time || '').slice(0, 5)
    const endTime = String(event.session_end_time || '').slice(0, 5)
    const time = startTime || endTime ? [startTime, endTime].filter(Boolean).join(' - ') : 'Time to be confirmed'
    const eventSlotRows = eventSlots.filter((slot) => slot.eventId === event.id)
    const pricedSlots = eventSlotRows
      .map((slot) => Number(slot.chargeAmount))
      .filter((amount) => Number.isFinite(amount) && amount > 0)
    const samplePricedSlot = eventSlotRows.find((slot) => Number(slot.chargeAmount) > 0)
    const amount = Number(event.charge_amount)
    const price = pricedSlots.length > 0
      ? `${samplePricedSlot?.chargeCurrency || 'KES'} ${Math.min(...pricedSlots).toLocaleString()}${Math.max(...pricedSlots) !== Math.min(...pricedSlots) ? ` - ${Math.max(...pricedSlots).toLocaleString()}` : ''} ${samplePricedSlot?.chargeUnitLabel || samplePricedSlot?.chargeFrequency?.replace(/_/g, ' ') || 'per programme'}`
      : Number.isFinite(amount) && amount > 0
        ? `${event.charge_currency || 'KES'} ${amount.toLocaleString()} ${event.charge_unit_label || event.charge_frequency?.replace(/_/g, ' ') || 'per programme'}`
        : 'Fee breakdown available'
    return {
      deadline: deadline ? deadline.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Before groups fill',
      dateRange: `${formatDate(event.start_date)} - ${formatDate(event.end_date)}`,
      mode,
      level,
      location,
      time,
      price,
    }
  }

  const slotMeta = (eventId: string) => {
    const rows = eventSlots.filter((slot) => slot.eventId === eventId)
    const capacity = rows.reduce((sum, slot) => sum + (Number(slot.capacity) || 0), 0)
    const remaining = rows.reduce((sum, slot) => sum + (Number(slot.remaining) || 0), 0)
    return {
      configured: rows.length > 0,
      capacity,
      remaining,
      label: rows.length > 0
        ? remaining > 0
          ? `${remaining} of ${capacity} left`
          : 'Fully booked'
        : 'Limited groups',
    }
  }

  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      className="relative overflow-hidden border-y border-[#145da0]/12 bg-[#eaf3f8] px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.72),rgba(234,243,248,.84)_45%,rgba(126,217,87,.12))]" />
      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
          viewport={{ once: true }}
          className="mb-9 grid gap-5 lg:grid-cols-[1fr_0.74fr] lg:items-end"
        >
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-[#145da0] shadow-sm">
              <Sparkles size={14} /> Upcoming programmes
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Register while the right group is still open.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Active holiday programmes, revision camps, and academic intake groups appear here first so parents can act before groups fill.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[#145da0]/10 bg-white/80 p-5 shadow-[0_18px_55px_rgba(7,49,89,0.08)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#073159] text-[#7ed957]">
                <BadgeCheck size={23} />
              </div>
              <div>
                <div className="text-sm font-black text-[#073159]">Parent decision window</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">Slots, dates, venue and fees are visible before registration.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {tuitionEvents.map((event, i) => (
            (() => {
              const meta = eventMeta(event)
              const slots = slotMeta(event.id)
              const active = event.status === 'active' || event.is_active
              const posterUrl = failedPosterIds.has(event.id) ? '' : resolveEventPosterUrl(event)
              return (
                <motion.div
                  key={event.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <div className="group flex h-full flex-col overflow-hidden rounded-[1.7rem] border border-white bg-white shadow-[0_22px_60px_rgba(7,49,89,0.1)] ring-1 ring-[#145da0]/10 transition hover:-translate-y-1.5 hover:shadow-[0_30px_80px_rgba(7,49,89,0.18)]">
                    <div
                      className="relative h-64 bg-gradient-to-br from-[#073159] via-[#145da0] to-[#4caf25] bg-cover bg-center"
                      style={{
                        backgroundImage: posterUrl ? `url("${posterUrl}")` : undefined,
                        backgroundPosition: event.banner_object_position || 'center center',
                      }}
                    >
                      {posterUrl && (
                        <img
                          src={posterUrl}
                          alt={`${event.name} poster`}
                          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                          style={{ objectPosition: event.banner_object_position || 'center center' }}
                          loading="eager"
                          onError={() => {
                            setFailedPosterIds((prev) => new Set(prev).add(event.id))
                          }}
                        />
                      )}
                      {!posterUrl && (
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(126,217,87,.22),transparent_38%),linear-gradient(45deg,rgba(255,255,255,.08)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.08)_50%,rgba(255,255,255,.08)_75%,transparent_75%,transparent)] bg-[length:auto,22px_22px]" />
                      )}
                      <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-2">
                        <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] shadow-sm ${active ? 'bg-[#7ed957] text-[#073159]' : 'bg-white/92 text-[#145da0]'}`}>
                          {active ? 'Registering now' : 'Upcoming'}
                        </div>
                        <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] shadow-sm ${slots.configured && slots.remaining === 0 ? 'bg-rose-100 text-rose-700' : 'bg-white text-[#073159]'}`}>
                          {slots.label}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-3">
                        <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#2f8517]">
                          <Calendar size={14} /> Register by {meta.deadline}
                        </div>
                        <h3 className="text-2xl font-black leading-tight tracking-tight text-[#073159]">{event.name}</h3>
                      </div>
                      <div className="mb-3">
                        <EventCountdown event={event} />
                      </div>
                      <div className="grid gap-2">
                        {[
                          { label: 'Dates', value: meta.dateRange, icon: Calendar, tone: 'bg-[#eaf3f8] text-[#145da0]' },
                          { label: 'Time', value: meta.time, icon: Clock3, tone: 'bg-[#eef9e9] text-[#2f8517]' },
                          { label: 'Venue', value: meta.location, icon: MapPin, tone: 'bg-[#f4f9fc] text-[#145da0]' },
                          { label: 'Fees', value: meta.price, icon: Wallet, tone: 'bg-[#fff8db] text-[#9a6b00]' },
                        ].map(({ label, value, icon: Icon, tone }) => (
                          <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#145da0]/8 bg-[#f8fbfd] p-3">
                            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
                              <Icon size={17} />
                            </span>
                            <div className="min-w-0">
                              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
                              <div className="mt-0.5 truncate text-sm font-black text-[#073159]">{value}</div>
                            </div>
                          </div>
                        ))}
                        <div className="rounded-2xl border border-[#145da0]/8 bg-[#073159] p-3 text-white">
                          <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[#7ed957]">
                              <Users size={17} />
                            </span>
                            <div className="min-w-0">
                              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">Best for</div>
                              <div className="mt-0.5 truncate text-sm font-black">{meta.level}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {event.pricing_note && <p className="mt-3 rounded-2xl bg-[#fff8db] px-3 py-2 text-xs font-bold leading-5 text-[#7a5a00]">{event.pricing_note}</p>}
                      <p className="mt-4 text-sm leading-relaxed text-slate-500 line-clamp-3">
                        {event.description || 'Intensive revision and curriculum coverage. Secure your spot before groups fill up.'}
                      </p>
                      <Link href={`/events/register?eventId=${event.id}`} className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#073159] px-4 py-3 text-sm font-black uppercase tracking-[0.13em] text-white transition hover:bg-[#145da0]">
                        Secure a place <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )
            })()
          ))}
        </div>
      </div>
    </motion.section>
  )
}

function LatestNewsRail({ posts }: { posts: MarketingBlogPost[] }) {
  if (posts.length === 0) return null

  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.18 }}
      className="bg-white px-4 py-14 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#eaf3f8] px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-[#145da0]">
              <Newspaper size={14} /> Latest news
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight text-[#073159] sm:text-4xl">
              Fresh Peak insights for parents and learners.
            </h2>
          </div>
          <Link href="/blog" className="inline-flex w-fit items-center gap-2 rounded-full border border-[#145da0]/15 px-5 py-3 text-sm font-black uppercase tracking-[0.13em] text-[#145da0] transition hover:bg-[#eaf3f8]">
            View all articles <ArrowRight size={16} />
          </Link>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-4">
            {posts.slice(0, 8).map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group w-[82vw] max-w-[360px] shrink-0 overflow-hidden rounded-[1.5rem] border border-[#145da0]/10 bg-white shadow-[0_16px_45px_rgba(7,49,89,0.1)] transition hover:-translate-y-1 hover:shadow-[0_24px_65px_rgba(7,49,89,0.16)] sm:w-[340px]">
                <div className="relative h-48 bg-[#073159]">
                  {post.coverImageUrl && <img src={post.coverImageUrl} alt={post.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#145da0]">{post.category}</div>
                </div>
                <div className="p-5">
                  <h3 className="line-clamp-2 text-lg font-black leading-tight text-[#073159]">{post.title}</h3>
                  <div className="relative mt-3 h-[4.5rem] overflow-hidden">
                    <p className="text-sm leading-6 text-slate-600">{post.excerpt}</p>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-white/0" />
                  </div>
                  <div className="mt-5 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    <span>{post.readMinutes} min</span>
                    <span className="inline-flex items-center gap-1 text-[#145da0]">Read <ArrowRight size={13} /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  )
}

export default function HomePage() {
  const [tuitionEvents, setTuitionEvents] = useState<any[]>([])
  const [eventSlots, setEventSlots] = useState<PublicEventSlot[]>([])
  const [testimonials, setTestimonials] = useState<LandingTestimonial[]>(fallbackTestimonials)
  const [blogPosts, setBlogPosts] = useState<MarketingBlogPost[]>([])
  
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    getPublicTuitionEvents().then((result) => {
      if (result.success) setTuitionEvents(result.events || [])
    }).catch(() => null)

    supabase.from('landing_testimonials')
      .select('id, full_name, role, relationship_label, quote, rating, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data, error }) => {
        if (!error && data?.length) setTestimonials(data as LandingTestimonial[])
      })

    getPublicRegistrationCounts().then((result) => {
      if (result.success) setEventSlots((result.slots || []) as PublicEventSlot[])
    }).catch(() => null)

    getPublicBlogPosts(4).then((result) => {
      if (result.success) setBlogPosts(result.posts || [])
    }).catch(() => null)
  }, [])

  return (
    <main className="premium-landing min-h-screen bg-[#f4f8fb] font-dm-sans text-[#073159]">
      {/* ── Sticky CTA ── */}
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
      <PremiumExperienceSection />

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

      <TuitionEventsSection tuitionEvents={tuitionEvents} eventSlots={eventSlots} />

      <ParentDecisionSection />

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

      <WhyPeakComparisonSection />

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

      <TestimonialsSection initialTestimonials={testimonials} />

      <FeeExpectationSection />

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
        className="px-4 py-10 sm:px-6 lg:px-8"
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
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">A quick look inside the learning environment.</h2>
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
        </div>
      </motion.section>

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

      <LatestNewsRail posts={blogPosts} />

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
