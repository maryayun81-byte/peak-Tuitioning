import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LineChart,
  MapPin,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from 'lucide-react'
import { PublicPortalMenu } from '@/components/ui/PublicPortalMenu'

export const metadata: Metadata = {
  title: 'Holiday Tuition Kenya | KCSE & CBC Revision Programmes',
  description:
    'Register for Peak Performance holiday tuition in Kenya for KCSE, CBC, KPSEA and KJSEA learners. Diagnostic revision, small groups, focused practice and parent-visible progress.',
  alternates: {
    canonical: '/holiday-tuition-kenya',
  },
  openGraph: {
    title: 'Holiday Tuition Kenya | Peak Performance Tutoring',
    description:
      'Structured holiday tuition for Kenyan KCSE and CBC learners: diagnostics, revision camps, small groups and measurable academic progress.',
    url: 'https://www.peakcampus.co.ke/holiday-tuition-kenya',
    siteName: 'Peak Performance Tutoring',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 600,
        alt: 'Peak Performance Tutoring holiday tuition Kenya',
      },
    ],
  },
}

const programmeTypes = [
  {
    title: 'KCSE holiday revision',
    body: 'Form 3 and Form 4 learners revise high-yield topics, past-paper patterns, examiner wording, timing, and mark-scoring technique.',
    icon: GraduationCap,
  },
  {
    title: 'CBC holiday support',
    body: 'Grade 6 to Grade 9 learners practise competency tasks, explanations, projects, numeracy, literacy, and practical reasoning.',
    icon: BookOpenCheck,
  },
  {
    title: 'Targeted recovery groups',
    body: 'Learners are grouped by need: foundation repair, momentum building, or high-grade precision for already strong students.',
    icon: TimerReset,
  },
]

const parentProof = [
  'Diagnostic placement before serious teaching begins',
  'Small, ability-matched groups instead of crowded revision halls',
  'KCSE and CBC work kept separate so the learner trains on the right curriculum',
  'Parent-visible progress and clear next steps after each learning cycle',
]

const faq = [
  {
    q: 'Who is the holiday tuition programme for?',
    a: 'Peak supports Kenyan 8-4-4 KCSE learners and CBC learners, especially students who need structured revision during April, August and December holiday windows.',
  },
  {
    q: 'Do you support Form 4 candidates?',
    a: 'Yes. Form 4 holiday tuition is treated as exam preparation: past-paper discipline, high-yield topics, marking-scheme language and strict timing.',
  },
  {
    q: 'Is CBC handled differently from KCSE?',
    a: 'Yes. CBC learners need competency tasks, visual explanations, practical scenarios and rubric-based feedback. They are not trained with KCSE-only methods.',
  },
]

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Course',
      name: 'Holiday Tuition Kenya',
      description:
        'Holiday tuition and revision programmes for KCSE and CBC learners in Kenya.',
      provider: {
        '@type': 'EducationalOrganization',
        name: 'Peak Performance Tutoring',
        url: 'https://www.peakcampus.co.ke',
      },
      educationalLevel: ['KCSE', 'CBC', 'KPSEA', 'KJSEA'],
      areaServed: 'Kenya',
    },
    {
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    },
  ],
}

export default function HolidayTuitionKenyaPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ed] text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
      />

      <section className="relative overflow-hidden bg-[#071a2d] text-white">
        <img
          src="/media__1776963140564.jpg"
          alt="Peak Performance holiday tuition learners in a focused study session"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#071a2d]/78" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,26,45,.96),rgba(7,26,45,.68),rgba(7,26,45,.2))]" />

        <nav className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Peak Performance logo" className="h-10 w-10 rounded-md bg-white object-contain p-1" />
            <span className="text-sm font-black uppercase tracking-[0.24em]">Peak Performance</span>
          </Link>
          <PublicPortalMenu />
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-[1fr_390px] lg:px-8 lg:pb-20 lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#7ed957]/25 bg-[#7ed957]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-[#a5ef87]">
              <Sparkles size={14} /> Holiday tuition Kenya
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.96] tracking-tight sm:text-7xl">
              Holiday revision that actually moves marks.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/76">
              Peak holiday programmes help KCSE and CBC learners use school breaks for focused recovery, revision, confidence and measurable academic progress.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/events/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7ed957] px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#073159] hover:bg-white">
                Register for holiday tuition <ArrowRight size={17} />
              </Link>
              <Link href="/kcse-and-cbc-tutoring-kenya" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">
                View KCSE and CBC support
              </Link>
            </div>
          </div>

          <aside className="self-end rounded-lg border border-white/15 bg-white/10 p-6 backdrop-blur-md">
            <div className="flex items-center gap-3 text-[#a5ef87]">
              <CalendarDays size={22} />
              <span className="text-sm font-black uppercase tracking-[0.2em]">Popular windows</span>
            </div>
            <div className="mt-5 space-y-4 text-sm leading-6 text-white/78">
              <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-[#7ed957]" /> April holiday revision and catch-up groups.</div>
              <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-[#7ed957]" /> August holiday KCSE and CBC intensives.</div>
              <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-[#7ed957]" /> December transition and next-class preparation.</div>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-px overflow-hidden rounded-lg bg-slate-200 md:grid-cols-3">
          {programmeTypes.map(({ title, body, icon: Icon }) => (
            <div key={title} className="bg-white p-6">
              <Icon className="h-8 w-8 text-[#145da0]" />
              <h2 className="mt-5 text-2xl font-black tracking-tight text-[#073159]">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#145da0]">Why parents choose Peak</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-[#073159] sm:text-5xl">
              Holiday time is too valuable for random revision.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              A strong holiday tuition programme should diagnose the learner, match the group, target the exact gap, and prove what improved before the learner goes back to school.
            </p>
            <Link href="/events/register" className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#073159] px-5 py-3 text-sm font-black uppercase tracking-[0.13em] text-white hover:bg-[#145da0]">
              See open holiday programmes <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid gap-4">
            {parentProof.map((item, index) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#eaf3f8] text-[#145da0]">
                    {index === 0 ? <ClipboardCheck size={20} /> : index === 1 ? <ShieldCheck size={20} /> : index === 2 ? <MapPin size={20} /> : <LineChart size={20} />}
                  </div>
                  <p className="pt-2 text-sm font-bold leading-6 text-slate-700">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#071a2d] px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7ed957]">Holiday tuition questions</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {faq.map((item) => (
              <div key={item.q} className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
                <h2 className="text-lg font-black tracking-tight">{item.q}</h2>
                <p className="mt-3 text-sm leading-7 text-white/68">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
