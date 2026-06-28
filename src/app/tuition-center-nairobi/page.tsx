import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicPortalMenu } from '@/components/ui/PublicPortalMenu'
import {
  ArrowRight,
  Beaker,
  BookOpenCheck,
  Clock,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Users,
  Wifi,
  Zap,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tuition Centre Nairobi | Peak Performance KCSE & CBC Tutoring',
  description:
    'Visit Peak Performance Tutoring, a Nairobi tuition centre for KCSE revision, CBC support, diagnostics, small-group learning and holiday programmes.',
  alternates: {
    canonical: '/tuition-center-nairobi',
  },
  openGraph: {
    title: 'Tuition Centre Nairobi | Peak Performance Tutoring',
    description:
      'A focused Nairobi academic hub for KCSE and CBC learners who need structure, calm, accountability and visible progress.',
    url: 'https://www.peakcampus.co.ke/tuition-center-nairobi',
    siteName: 'Peak Performance Tutoring',
    images: [{ url: '/logo.png', width: 800, height: 600, alt: 'Peak Performance Nairobi tuition centre' }],
  },
}

const facilities = [
  { name: 'Focused study rooms', desc: 'Quiet, supervised zones for deep work and guided revision.', icon: ShieldCheck },
  { name: 'STEM practice setup', desc: 'Spaces for diagrams, practical explanation, and science problem solving.', icon: Beaker },
  { name: 'Digital learning access', desc: 'Live-session support, online resources, and connected progress workflows.', icon: Wifi },
  { name: 'Mentorship corners', desc: 'Small-group correction, reflection, and confidence-building conversations.', icon: Users },
]

const visitSteps = [
  ['Diagnostic conversation', 'We learn the learner profile, current marks, weak subjects, habits, and goals.'],
  ['Programme placement', 'The student is matched to KCSE, CBC, live, or holiday support based on the gap.'],
  ['First session plan', 'Families leave with a clear next step, not a vague promise.'],
]

export default function NairobiCenterPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ed] text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <img src="/media__1776963140335.jpg" alt="Peak Performance Nairobi tuition centre" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/72" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,.94),rgba(2,6,23,.68),rgba(2,6,23,.18))]" />

        <nav className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Peak Performance logo" className="h-10 w-10 rounded-md bg-white object-contain p-1" />
            <span className="text-sm font-black uppercase tracking-[0.24em]">Peak Performance</span>
          </Link>
          <PublicPortalMenu />
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[1fr_390px] lg:px-8 lg:pt-28">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">Nairobi tuition centre</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight sm:text-7xl">
              A focused academic hub for serious progress.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              A calm, guided environment for diagnostics, small-group tutoring, KCSE revision, CBC support, live-session follow-up, and holiday programme work.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 hover:bg-emerald-300">
                Schedule visit <ArrowRight size={17} />
              </Link>
              <Link href="/kcse-and-cbc-tutoring-kenya" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">
                View programmes
              </Link>
            </div>
          </div>
          <div className="self-end rounded-lg border border-white/15 bg-white/10 p-6 backdrop-blur-md">
            <div className="flex items-center gap-3 text-emerald-200">
              <MapPin size={22} />
              <span className="text-sm font-black uppercase tracking-[0.2em]">Primary hub</span>
            </div>
            <div className="mt-5 space-y-4 text-sm leading-6 text-white/78">
              <div className="flex gap-3"><Clock className="mt-0.5 h-5 w-5 text-white/55" /> Open for scheduled tutoring and programme visits.</div>
              <div className="flex gap-3"><Phone className="mt-0.5 h-5 w-5 text-white/55" /> Families can book a diagnostic conversation before placement.</div>
              <div className="flex gap-3"><Navigation className="mt-0.5 h-5 w-5 text-white/55" /> Designed for Nairobi learners who need structure, calm, and accountability.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-px overflow-hidden rounded-lg bg-slate-200 md:grid-cols-4">
          {facilities.map(({ name, desc, icon: Icon }) => (
            <div key={name} className="bg-white p-6">
              <Icon className="h-7 w-7 text-emerald-700" />
              <h2 className="mt-6 text-xl font-black tracking-tight">{name}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="grid grid-cols-2 gap-3">
            <img src="/media__1776963140564.jpg" alt="Peak Performance study area" className="h-64 w-full rounded-lg object-cover sm:h-80" />
            <img src="/media__1776964680100.jpg" alt="Peak Performance guided learning" className="mt-8 h-64 w-full rounded-lg object-cover sm:h-80" />
          </div>
          <div>
            <div className="mb-4 h-1 w-14 bg-emerald-600" />
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-800">What happens when you visit</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">The first conversation is practical, not performative.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              The Nairobi hub is organised around one purpose: understand the learner quickly, place them correctly, and make the next academic action obvious.
            </p>
            <div className="mt-7 grid gap-3">
              {visitSteps.map(([title, body], index) => (
                <div key={title} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-black text-emerald-800">{index + 1}</div>
                  <div>
                    <h3 className="font-black tracking-tight">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">Connected learning</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Centre work connects to live work.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Live classes', 'Learners can continue online when needed.'],
              ['Progress visibility', 'Parents can follow outcomes beyond the physical visit.'],
              ['Teacher tools', 'Guides can use sessions, quizzes, reflections, and whiteboard work.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-lg border border-white/10 bg-white/5 p-5">
                <Zap className="h-6 w-6 text-emerald-300" />
                <h3 className="mt-5 font-black tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-lg border border-slate-200 bg-[#f8f6f1] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-800"><BookOpenCheck size={17} /> Diagnostic-first placement</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Bring the latest report and we will find the real academic gap.</h2>
          </div>
          <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-emerald-800">
            Book diagnostic <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  )
}
