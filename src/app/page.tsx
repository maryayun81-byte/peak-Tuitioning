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
        <span className="text-sm font-bold text-slate-900">{question}</span>
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
    <main className="min-h-screen bg-[#f6f3ed] text-slate-950 pb-[52px] sm:pb-[56px]">
      {/* ── Sticky CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
          <span className="hidden text-sm font-bold text-white sm:inline">
            First diagnostic session free
          </span>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-300 sm:text-sm"
          >
            <Phone size={14} /> Book free diagnostic
          </Link>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative min-h-[82vh] overflow-hidden bg-slate-950 text-white">
        <motion.img
          initial={{ scale: 1.15 }}
          animate={{ scale: 1, transition: { duration: 8, ease: 'easeOut' } }}
          src="/media__1776963140564.jpg"
          alt="Peak Performance learning environment"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/68" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,.92)_0%,rgba(2,6,23,.72)_42%,rgba(2,6,23,.18)_100%)]" />

        <nav className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <motion.img
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.5 } }}
              src="/logo.png"
              alt="Peak Performance logo"
              className="h-11 w-11 rounded-md bg-white object-contain p-1"
              loading="eager"
            />
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.1 } }}
            >
              <div className="text-sm font-black uppercase tracking-[0.24em]">Peak Performance</div>
              <div className="text-xs text-white/60">Tutoring Kenya</div>
            </motion.div>
          </Link>
          <div className="hidden items-center gap-7 text-sm font-semibold text-white/75 md:flex">
            <Link href="/about" className="hover:text-white">About</Link>
            <Link href="/kcse-and-cbc-tutoring-kenya" className="hover:text-white">Programmes</Link>
            <Link href="/tuition-center-nairobi" className="hover:text-white">Nairobi Hub</Link>
          </div>
          <PublicPortalMenu />
        </nav>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-center px-4 pb-14 pt-20 sm:px-6 lg:min-h-[66vh] lg:px-8">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.2 } }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-emerald-100 backdrop-blur"
            >
              <Sparkles size={14} /> From potential to performance
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] } }}
              className="text-4xl font-black leading-[0.96] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Peak Performance Tutoring
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.5 } }}
              className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg"
            >
              A diagnostic, tiered tutoring system for Kenyan 8-4-4 and CBC learners. We identify the exact mark gap, place each student in the right group, and guide them toward visible academic movement.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.65 } }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-300"
              >
                Start diagnostic <ArrowRight size={17} />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                See the method
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <motion.section
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="border-y border-slate-200 bg-white"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-slate-200 px-0 sm:grid-cols-4">
          {outcomes.map(({ label, value, icon: Icon }, i) => (
            <motion.div
              key={label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-white px-4 py-5 sm:px-6"
            >
              <Icon className="mb-3 h-5 w-5 text-emerald-700" />
              <div className="text-2xl font-black tracking-tight text-slate-950">{value}</div>
              <div className="mt-1 text-sm font-medium text-slate-600">{label}</div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Problem ── */}
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0, transition: { duration: 0.6 } }}
            viewport={{ once: true }}
          >
            <div className="mb-4 h-1 w-14 bg-emerald-600" />
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-800">The problem Peak solves</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Most learners do not need more noise. They need the right intervention.</h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              Schools carry the syllabus. Peak carries the individual learner. Our guides study why a student is losing marks, then adapt every session to the learner&apos;s tier, curriculum, confidence, and exam temperament.
            </p>
          </motion.div>
          <div className="grid gap-3">
            {painSolutions.map(([problem, solution], i) => (
              <motion.div
                key={problem}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid gap-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[180px_1fr]"
              >
                <div className="text-sm font-bold uppercase tracking-[0.14em] text-rose-700">{problem}</div>
                <div className="flex gap-3 text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <span className="leading-relaxed">{solution}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Results counter ── */}
      <motion.section
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        className="border-y border-slate-200 bg-emerald-950 px-4 py-12 text-white sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
            viewport={{ once: true }}
            className="text-center text-sm font-bold uppercase tracking-[0.22em] text-emerald-300"
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
                className="text-center"
              >
                <Icon className="mx-auto h-6 w-6 text-emerald-300" />
                <div className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{value}</div>
                <div className="mt-1 text-sm font-medium text-emerald-200/70">{label}</div>
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
        className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0, transition: { duration: 0.6 } }}
            viewport={{ once: true }}
          >
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-800">CBC curriculum in action</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Hands-on learning is a core part of the Peak promise.</h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              CBC learners need to build, test, observe, explain, and correct. Peak makes practical work visible through guided tasks, real materials, and reflection that turns activity into competence.
            </p>
            <Link href="/kcse-and-cbc-tutoring-kenya" className="mt-7 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-emerald-800">
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
              className="col-span-2 h-56 w-full rounded-lg object-cover shadow-sm sm:h-72"
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
                className="h-32 w-full rounded-lg object-cover shadow-sm sm:h-40"
                loading="lazy"
              />
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ── Method ── */}
      <motion.section
        variants={fadeIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="border-y border-slate-200 bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
            viewport={{ once: true }}
            className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-300">Inside the Peak method</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">A simple system students can feel.</h2>
            </div>
            <Link href="/about" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200 hover:text-white">
              About Peak <ArrowRight size={16} />
            </Link>
          </motion.div>
          <div className="grid gap-px overflow-hidden rounded-lg bg-white/10 md:grid-cols-4">
            {methodSteps.map(({ title, body, icon: Icon }, index) => (
              <motion.div
                key={title}
                custom={index}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-slate-950 p-6"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-7 w-7 text-emerald-300" />
                  <span className="text-xs font-bold text-white/35">0{index + 1}</span>
                </div>
                <h3 className="mt-8 text-xl font-black tracking-tight">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65">{body}</p>
              </motion.div>
            ))}
          </div>
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
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-800">Campus gallery</p>
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
        className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
            viewport={{ once: true }}
            className="mb-8 max-w-3xl"
          >
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-800">Programmes</p>
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
                <Link href={programme.href} className="group block rounded-lg border border-slate-200 bg-[#f8f6f1] p-6 transition hover:-translate-y-1 hover:border-emerald-300 hover:bg-emerald-50">
                  <h3 className="text-2xl font-black tracking-tight">{programme.title}</h3>
                  <p className="mt-3 min-h-24 text-sm leading-relaxed text-slate-600">{programme.body}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-800">
                    Explore <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                  </div>
                </Link>
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
          className="border-y border-slate-200 bg-[#f6f3ed] px-4 py-14 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
              viewport={{ once: true }}
              className="mb-8 max-w-3xl"
            >
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-800">Upcoming Events</p>
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
                  <div className="group block rounded-lg border border-emerald-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-md">
                    <div className="mb-4 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
                      {event.is_active ? 'Registering Now' : 'Upcoming'}
                    </div>
                    <h3 className="text-xl font-black tracking-tight text-slate-900">{event.name}</h3>
                    <div className="mt-3 space-y-2 text-sm font-medium text-slate-600">
                      <p className="flex items-center gap-2"><Calendar size={16} className="text-emerald-600" /> {formatDate(event.start_date)} - {formatDate(event.end_date)}</p>
                    </div>
                    <p className="mt-4 min-h-16 text-sm leading-relaxed text-slate-500 line-clamp-3">
                      {event.description || 'Intensive revision and curriculum coverage. Secure your spot before groups fill up.'}
                    </p>
                    <Link href={`/events/register?eventId=${event.id}`} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition group-hover:bg-emerald-600">
                      Enroll Now <ArrowRight size={16} />
                    </Link>
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
            className="overflow-hidden rounded-lg border border-slate-200 bg-slate-900"
          >
            <img src="/media__1776964680232.jpg" alt="Focused Peak Performance student study setting" className="h-[360px] w-full object-cover sm:h-[460px]" loading="lazy" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0, transition: { duration: 0.6, delay: 0.1 } }}
            viewport={{ once: true }}
          >
            <div className="mb-4 h-1 w-14 bg-amber-500" />
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-700">Portals</p>
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
                  <Link href={href} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 font-semibold transition hover:border-emerald-300 hover:bg-emerald-50">
                    <span className="flex items-center gap-3"><Icon className="h-5 w-5 text-emerald-700" /> {label}</span>
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
        className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
            viewport={{ once: true }}
            className="mb-8 max-w-2xl"
          >
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-800">Frequently asked questions</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Everything you need to know before you start.</h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } }}
            viewport={{ once: true }}
            className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-[#f8f6f1] px-5"
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
        className="bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
          viewport={{ once: true }}
          className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-300"><MapPin size={16} /> Nairobi · Online · Holiday programmes</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Ready to know exactly where the marks are being lost?</h2>
          </div>
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-100"
          >
            Book diagnostic <ArrowRight size={17} />
          </Link>
        </motion.div>
      </motion.section>
    </main>
  )
}
