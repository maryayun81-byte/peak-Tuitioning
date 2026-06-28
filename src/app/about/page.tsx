import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicPortalMenu } from '@/components/ui/PublicPortalMenu'
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Lightbulb,
  LineChart,
  Target,
  Users,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Peak Performance Tutoring Kenya | Diagnostic KCSE & CBC Support',
  description:
    'Learn how Peak Performance Tutoring supports Kenyan KCSE and CBC learners through diagnostic placement, ability-matched groups, active recall and parent-visible progress.',
  alternates: {
    canonical: '/about',
  },
}

const principles = [
  {
    title: 'We guide before we teach',
    body: 'Peak is built around the belief that a learner needs a guide who understands how they learn, where they lose marks, and what confidence looks like for them.',
    icon: Lightbulb,
  },
  {
    title: 'We diagnose the real problem',
    body: 'Transcripts, habits, weak subjects, temperament, and behaviour patterns are reviewed before the first serious intervention begins.',
    icon: ClipboardCheck,
  },
  {
    title: 'We group by goal, not age alone',
    body: 'Every student is placed where the strategy matches the gap: foundations, application, or high-grade precision.',
    icon: Users,
  },
]

const tiers = [
  {
    name: 'The Peak Performers',
    movement: 'B to A',
    role: 'Consultant',
    focus: 'Deliberate pressure, examiner language, advanced rubrics, speed, and precision.',
  },
  {
    name: 'The Momentum Builders',
    movement: 'C to B',
    role: 'Coach',
    focus: 'Varied practice, active recall, Feynman explanations, and application in unfamiliar formats.',
  },
  {
    name: 'The Climbers',
    movement: 'D to C',
    role: 'Mentor',
    focus: 'High-yield fundamentals, scaffolded wins, mark hunting, and rebuilding confidence.',
  },
]

const techniques = [
  ['Socratic Shift', 'Guides answer questions with better questions so students learn how to think through the next step.'],
  ['Active Recall', 'Students retrieve ideas without notes, then mark the true knowledge gap in front of them.'],
  ['Feynman Technique', 'Learners explain a concept simply; confusion becomes visible and fixable.'],
  ['Scaffolded Wins', 'Large concepts are broken into small correct steps so confidence grows with evidence.'],
  ['Deliberate Practice', 'Strong learners train under time pressure and marking-scheme expectations.'],
]

const promises = [
  'Move every learner at least one grade band upward within the programme.',
  'Make the first diagnostic profile matter in every lesson.',
  'Keep students producing more than they consume.',
  'Never let a D-grade student finish without a C-minus floor as the target.',
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ed] text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <img src="/media__1776964680330.jpg" alt="Peak Performance learners in a guided academic setting" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/72" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,.94),rgba(2,6,23,.68),rgba(2,6,23,.2))]" />

        <nav className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Peak Performance logo" className="h-10 w-10 rounded-md bg-white object-contain p-1" />
            <span className="text-sm font-black uppercase tracking-[0.24em]">Peak Performance</span>
          </Link>
          <PublicPortalMenu />
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8 lg:pt-28">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">About Peak Performance</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight sm:text-7xl">
              We do not teach subjects. We build scholars.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              Founded in 2023, Peak Performance Tutoring exists for the learner who needs more than syllabus coverage. We diagnose, group, guide, and measure progress until potential becomes performance.
            </p>
          </div>
          <div className="self-end rounded-lg border border-white/15 bg-white/10 p-6 backdrop-blur-md">
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">Peak promise</div>
            <div className="mt-4 space-y-4">
              {promises.map((promise) => (
                <div key={promise} className="flex gap-3 text-sm leading-6 text-white/80">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <span>{promise}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-px overflow-hidden rounded-lg bg-slate-200 md:grid-cols-3">
          {principles.map(({ title, body, icon: Icon }) => (
            <div key={title} className="bg-white p-6">
              <Icon className="h-7 w-7 text-emerald-700" />
              <h2 className="mt-6 text-2xl font-black tracking-tight">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
            <img src="/media__1776963140480.jpg" alt="Focused lesson at Peak Performance" className="h-[420px] w-full object-cover" />
          </div>
          <div>
            <div className="mb-4 h-1 w-14 bg-emerald-600" />
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-800">Why grouping changes everything</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">The curriculum stays the same. The approach changes completely.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              A crowded classroom must move one pace for everyone. Peak separates learners by performance pattern, then gives teachers a clear role, a clear goal, and a proven intervention for that group.
            </p>
            <div className="mt-7 grid gap-3">
              {tiers.map((tier) => (
                <div key={tier.name} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xl font-black tracking-tight">{tier.name}</h3>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">{tier.movement}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-500">Guide role: {tier.role}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{tier.focus}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">The pedagogy</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Students must produce more than they consume.</h2>
            <p className="mt-5 text-lg leading-8 text-white/70">
              Peak's classroom rule is direct: no guide speaks for more than 15 consecutive minutes without the student performing a task.
            </p>
          </div>
          <div className="mt-9 grid gap-px overflow-hidden rounded-lg bg-white/10 md:grid-cols-5">
            {techniques.map(([name, description]) => (
              <div key={name} className="bg-slate-950 p-5">
                <Brain className="h-6 w-6 text-emerald-300" />
                <h3 className="mt-5 text-lg font-black tracking-tight">{name}</h3>
                <p className="mt-3 text-sm leading-6 text-white/60">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-amber-700">What families feel</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight">Clearer goals. Calmer learners. Better evidence.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {[
              [Target, 'Every lesson has a reason', 'Teachers know the student profile before entering the room.'],
              [BookOpenCheck, 'Practice is not random', 'Tasks are matched to the learner tier and curriculum need.'],
              [LineChart, 'Progress is visible', 'Mistake audits, timed drills, and rubric checks show movement.'],
              [Award, 'Confidence is designed', 'Small wins are used deliberately, especially for anxious learners.'],
            ].map(([Icon, title, body]) => {
              const TypedIcon = Icon as typeof Target
              return (
                <div key={title as string} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <TypedIcon className="h-6 w-6 text-emerald-700" />
                  <h3 className="mt-5 text-xl font-black tracking-tight">{title as string}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{body as string}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-lg border border-slate-200 bg-[#f8f6f1] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-800"><GraduationCap size={17} /> 8-4-4 and CBC programmes</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight">See how the model changes by curriculum.</h2>
          </div>
          <Link href="/kcse-and-cbc-tutoring-kenya" className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-emerald-800">
            Explore methodology <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  )
}
