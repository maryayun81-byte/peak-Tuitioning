import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FlaskConical,
  GraduationCap,
  Layers3,
  LineChart,
  PenTool,
  Target,
} from 'lucide-react'
import { PremiumCarousel } from '@/components/ui/PremiumCarousel'
import { PublicPortalMenu } from '@/components/ui/PublicPortalMenu'

export const metadata: Metadata = {
  title: 'KCSE & CBC Tutoring Kenya | Peak Performance Tutoring',
  description:
    'KCSE and CBC tutoring in Kenya for Form 3, Form 4 and Grades 6-10. Diagnostic support, small groups, practical CBC tasks and exam-focused KCSE revision.',
  alternates: {
    canonical: '/kcse-and-cbc-tutoring-kenya',
  },
  openGraph: {
    title: 'KCSE & CBC Tutoring Kenya | Peak Performance Tutoring',
    description:
      'Diagnostic-first tutoring for Kenyan 8-4-4 and CBC learners, with KCSE exam strategy and CBC competency support.',
    url: 'https://www.peakcampus.co.ke/kcse-and-cbc-tutoring-kenya',
    siteName: 'Peak Performance Tutoring',
    images: [{ url: '/logo.png', width: 800, height: 600, alt: 'Peak Performance KCSE and CBC tutoring Kenya' }],
  },
}

const cbcGalleryImages = [
  '/cbc-hands-on-01.jpeg',
  '/cbc-hands-on-02.jpeg',
  '/cbc-hands-on-03.jpeg',
  '/cbc-hands-on-04.jpeg',
  '/cbc-hands-on-05.jpeg',
  '/cbc-hands-on-06.jpeg',
  '/cbc-hands-on-07.jpeg',
  '/cbc-hands-on-08.jpeg',
  '/cbc-hands-on-09.jpeg',
  '/cbc-hands-on-10.jpeg',
  '/cbc-hands-on-11.jpeg',
  '/cbc-hands-on-12.jpeg',
  '/cbc-hands-on-13.jpeg',
]

const streams = [
  {
    name: '8-4-4 KCSE',
    principle: 'Every lesson moves the learner closer to exam conditions.',
    focus: ['Past papers as the primary tool', 'KNEC marking scheme language', 'Timing per mark', 'High-yield topic recovery'],
    image: '/media__1776964680146.jpg',
  },
]

const cbcFocus = ['Scenario discussion', 'Practical tasks', 'Rubric-based feedback', 'Real-world Kenyan examples']

const tierStrategy = [
  {
    tier: 'The Climbers',
    movement: 'D to C',
    problem: 'Foundation gaps, anxiety, and subject phobia.',
    kcse: 'High-yield fundamentals, mark hunting, formulas, first correct steps, and confidence.',
    cbc: 'Numbered practical steps, local examples, visual aids, micro-tasks, and immediate feedback.',
  },
  {
    tier: 'The Momentum Builders',
    movement: 'C to B',
    problem: 'They know the basics but fail when the question changes shape.',
    kcse: 'Same concept in five formats, petty mistake audits, Section B work, and marking-scheme mastery.',
    cbc: 'Guided scenarios, troubleshooting, mini-projects, and explaining why each decision works.',
  },
  {
    tier: 'The Peak Performers',
    movement: 'B to A',
    problem: 'They know the content but lose the final precision marks.',
    kcse: 'Hard Section B and C questions, strict timing, self-marking, and examiner phrasing.',
    cbc: 'Advanced rubrics, leadership in practical tasks, evaluation, critique, and cross-strand problems.',
  },
]

const subjectGroups = [
  {
    title: '8-4-4 Form 3 and Form 4',
    subtitle: 'KCSE exam-focused mastery',
    subjects: ['Mathematics', 'Chemistry', 'Biology', 'Physics', 'English', 'Kiswahili'],
  },
  {
    title: 'CBC Grades 6 to 9',
    subtitle: 'Competency and hands-on foundation',
    subjects: ['Mathematics', 'Integrated Science', 'English', 'Kiswahili', 'Social Studies', 'Pre-Technical', 'Agriculture'],
  },
  {
    title: 'CBC Grade 10 STEM',
    subtitle: 'Senior school STEM pathway support',
    subjects: ['Core Mathematics', 'Kiswahili', 'Chemistry', 'Biology', 'Physics', 'English', 'CSL'],
  },
]

const sessionFlow = [
  ['0-10 min', 'Recall check', 'The learner produces before the guide explains.'],
  ['10-35 min', 'Targeted intervention', 'The exact gap is repaired through questioning, modeling, or scaffolded practice.'],
  ['35-70 min', 'Pressure practice', 'Students attempt timed or practical tasks matched to their tier.'],
  ['70-90 min', 'Correction and next step', 'Mistakes are audited, marks are explained, and the next action is clear.'],
]

export default function ProgrammesPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ed] text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <img src="/media__1776963140037.jpg" alt="Peak Performance programme session" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/72" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,.94),rgba(2,6,23,.68),rgba(2,6,23,.18))]" />

        <nav className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Peak Performance logo" className="h-10 w-10 rounded-md bg-white object-contain p-1" />
            <span className="text-sm font-black uppercase tracking-[0.24em]">Peak Performance</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hidden text-sm font-bold text-white/75 hover:text-white sm:inline">About</Link>
            <PublicPortalMenu />
          </div>
        </nav>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pt-28">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">KCSE and CBC tutoring in Kenya</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight sm:text-7xl">
            One academic engine. Two curriculum strategies.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
            Peak supports Kenyan learners through exam-centric KCSE preparation and application-led CBC development, without treating the two systems as the same problem.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 hover:bg-emerald-300">
              Start diagnostic <ArrowRight size={17} />
            </Link>
            <Link href="/about" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">
              Read the method
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-800">KCSE stream</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Exam preparation has its own rhythm.</h2>
          </div>
          {streams.map((stream) => (
            <article key={stream.name} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <img src={stream.image} alt={`${stream.name} learning stream`} className="h-56 w-full object-cover" />
              <div className="p-6">
                <h2 className="text-3xl font-black tracking-tight">{stream.name}</h2>
                <p className="mt-3 text-lg font-semibold leading-7 text-slate-700">{stream.principle}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {stream.focus.map((item) => (
                    <div key={item} className="flex gap-3 text-sm text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-800">CBC competency and hands-on learning</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Every question moves from "what is this?" to "how do we use this?"</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Students build, test, observe, explain, and correct. CBC works best when learners handle materials, discuss observations, troubleshoot, and connect science to visible evidence.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {cbcFocus.map((item) => (
                <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700 shadow-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <PremiumCarousel images={cbcGalleryImages} autoPlayInterval={4300} />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {cbcGalleryImages.slice(0, 4).map((image, index) => (
                <img
                  key={image}
                  src={image}
                  alt={`CBC hands-on classroom moment ${index + 1}`}
                  className="h-28 w-full rounded-lg border border-white object-cover shadow-sm sm:h-36"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-800">Tier by tier strategy</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Every grade band receives a different kind of help.</h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[1fr_0.75fr_1.2fr_1.2fr] border-b border-slate-200 bg-slate-950 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white md:grid">
              <div>Tier</div>
              <div>Movement</div>
              <div>KCSE strategy</div>
              <div>CBC strategy</div>
            </div>
            {tierStrategy.map((tier) => (
              <div key={tier.tier} className="grid gap-4 border-b border-slate-200 p-5 last:border-b-0 md:grid-cols-[1fr_0.75fr_1.2fr_1.2fr]">
                <div>
                  <h3 className="text-xl font-black tracking-tight">{tier.tier}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{tier.problem}</p>
                </div>
                <div>
                  <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">{tier.movement}</span>
                </div>
                <p className="text-sm leading-6 text-slate-600">{tier.kcse}</p>
                <p className="text-sm leading-6 text-slate-600">{tier.cbc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">90 minute lesson design</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Short enough to stay sharp. Structured enough to change marks.</h2>
            <p className="mt-5 text-lg leading-8 text-white/70">
              The session rhythm keeps learners active. Listening is never the main event.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg bg-white/10">
            {sessionFlow.map(([time, title, body]) => (
              <div key={time} className="grid gap-3 bg-slate-950 p-5 sm:grid-cols-[110px_190px_1fr]">
                <div className="flex items-center gap-2 text-sm font-black text-emerald-300"><Clock3 size={16} /> {time}</div>
                <div className="font-black tracking-tight">{title}</div>
                <div className="text-sm leading-6 text-white/65">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-amber-700">Subjects by curriculum</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Clear subject pathways for KCSE, CBC junior school, and CBC Grade 10 STEM.</h2>
            <div className="mt-7 grid gap-4">
              {subjectGroups.map((group) => (
                <div key={group.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xl font-black tracking-tight">{group.title}</h3>
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{group.subtitle}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {group.subjects.map((subject) => (
                      <span key={subject} className="rounded-full border border-slate-200 bg-[#f8f6f1] px-3 py-2 text-sm font-bold text-slate-800">
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            {[
              [Target, 'Mark hunting', 'Students learn how to earn marks even when they cannot finish a full question.'],
              [PenTool, 'Petty mistake audit', 'Repeated error types are named, tracked, and removed from the next paper.'],
              [FlaskConical, 'Real-world anchors', 'CBC tasks connect to local observations, household items, community issues, and practical demonstrations.'],
              [BrainCircuit, 'Application pressure', 'Learners practise the same concept in multiple formats so understanding survives change.'],
              [Layers3, 'Scaffolded tasks', 'Complex work is divided into a clear sequence of correct, confidence-building steps.'],
              [LineChart, 'Progress evidence', 'Students and parents see movement through corrections, reflections, and performance records.'],
            ].map(([Icon, title, body]) => {
              const TypedIcon = Icon as typeof Target
              return (
                <div key={title as string} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <TypedIcon className="mt-1 h-6 w-6 shrink-0 text-emerald-700" />
                  <div>
                    <h3 className="font-black tracking-tight">{title as string}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{body as string}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-lg border border-slate-200 bg-[#f8f6f1] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-800"><GraduationCap size={17} /> April, August, and December programmes</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Place the learner where the strategy matches the gap.</h2>
          </div>
          <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-emerald-800">
            Enroll now <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  )
}
