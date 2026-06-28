import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { PublicPortalMenu } from '@/components/ui/PublicPortalMenu'

const phoneNumber = '0798971625'
const internationalPhone = '+254798971625'
const whatsappUrl = 'https://wa.me/254798971625?text=Hello%20Peak%20Performance%20Tutoring%2C%20I%20would%20like%20to%20ask%20about%20KCSE%20or%20CBC%20tuition.'
const mapQuery = encodeURIComponent('St Ignatius Christian School Kinoo')
const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`
const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`

export const metadata: Metadata = {
  title: 'Contact Peak Performance Tutoring Kenya | Kinoo KCSE & CBC Tuition',
  description:
    'Contact Peak Performance Tutoring at St Ignatius Christian School Kinoo. Call or WhatsApp 0798971625 for KCSE revision, CBC support, Nairobi and Kinoo holiday tuition.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Peak Performance Tutoring Kenya',
    description:
      'Call or WhatsApp Peak Performance Tutoring on 0798971625 for KCSE, CBC and holiday tuition support at St Ignatius Christian School Kinoo.',
    url: 'https://www.peakcampus.co.ke/contact',
    siteName: 'Peak Performance Tutoring',
    images: [{ url: '/logo.png', width: 800, height: 600, alt: 'Peak Performance Tutoring contact page' }],
  },
}

const contactOptions = [
  {
    title: 'Call the team',
    body: 'Best for urgent placement questions, fees, schedules and holiday programme availability.',
    href: `tel:${phoneNumber}`,
    cta: phoneNumber,
    icon: Phone,
  },
  {
    title: 'WhatsApp Peak',
    body: 'Send the learner class, curriculum, weak subjects and preferred programme window.',
    href: whatsappUrl,
    cta: 'Open WhatsApp',
    icon: MessageCircle,
  },
  {
    title: 'Register online',
    body: 'Share learner details once so the team can recommend the right KCSE or CBC pathway.',
    href: '/events/register',
    cta: 'Start registration',
    icon: CalendarDays,
  },
]

const visitNotes = [
  'KCSE revision, Form 3 and Form 4 support',
  'CBC Grade 6 to Grade 9 support',
  'Holiday tuition and intake registration',
  'Diagnostic placement before serious teaching begins',
]

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Peak Performance Tutoring',
  alternateName: 'Peak Campus',
  url: 'https://www.peakcampus.co.ke',
  logo: 'https://www.peakcampus.co.ke/icon-512.png',
  telephone: internationalPhone,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'St Ignatius Christian School, Kinoo',
    addressLocality: 'Kinoo',
    addressRegion: 'Kiambu',
    addressCountry: 'KE',
  },
  areaServed: ['Kinoo', 'Nairobi', 'Kiambu', 'Kenya'],
  sameAs: ['https://www.peakcampus.co.ke'],
  description:
    'KCSE and CBC tutoring, holiday tuition, diagnostic placement and small-group academic support for Kenyan learners.',
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ed] text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="relative overflow-hidden bg-[#071a2d] text-white">
        <img
          src="/media__1776963140564.jpg"
          alt="Peak Performance learners in a focused tutoring session"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#071a2d]/82" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,26,45,.97),rgba(7,26,45,.72),rgba(7,26,45,.25))]" />

        <nav className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <img src="/logo.png" alt="Peak Performance logo" className="h-10 w-10 shrink-0 rounded-md bg-white object-contain p-1" />
            <span className="truncate text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.24em]">Peak Performance</span>
          </Link>
          <PublicPortalMenu />
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8 lg:pb-20 lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#7ed957]/25 bg-[#7ed957]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#a5ef87]">
              <Sparkles size={14} /> Contact Peak Performance Tutoring
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.96] tracking-tight sm:text-7xl">
              Talk to Peak before the next academic gap grows.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/74">
              Call, WhatsApp, register online, or visit our Kinoo learning point at St Ignatius Christian School for KCSE, CBC and holiday tuition placement.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={`tel:${phoneNumber}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7ed957] px-6 py-3.5 text-sm font-black uppercase tracking-[0.13em] text-[#073159] shadow-[0_16px_35px_rgba(126,217,87,0.22)] transition hover:-translate-y-0.5 hover:bg-white">
                <Phone size={17} /> Call {phoneNumber}
              </a>
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-6 py-3.5 text-sm font-black uppercase tracking-[0.13em] text-white transition hover:bg-white/12">
                <MessageCircle size={17} /> WhatsApp
              </a>
            </div>
          </div>

          <aside className="self-end rounded-lg border border-white/15 bg-white/10 p-6 backdrop-blur-md">
            <div className="flex items-center gap-3 text-[#a5ef87]">
              <MapPin size={22} />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Learning point</span>
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight">St Ignatius Christian School, Kinoo</h2>
            <p className="mt-3 text-sm leading-7 text-white/70">
              Use the map below for directions, then call or WhatsApp before visiting so the right tutor or programme coordinator can expect you.
            </p>
            <div className="mt-5 grid gap-3 text-sm text-white/78">
              <div className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 text-[#7ed957]" /> Scheduled tuition, diagnostics and intake guidance.</div>
              <div className="flex gap-3"><Users className="mt-0.5 h-5 w-5 text-[#7ed957]" /> Parent, student and school partnership enquiries.</div>
            </div>
          </aside>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {contactOptions.map(({ title, body, href, cta, icon: Icon }) => (
            <a key={title} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#eaf3f8] text-[#145da0] transition group-hover:bg-[#145da0] group-hover:text-white">
                <Icon size={22} />
              </span>
              <h2 className="mt-6 text-2xl font-black tracking-tight text-[#073159]">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.13em] text-[#145da0] transition group-hover:gap-3">
                {cta} <ArrowRight size={15} />
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] lg:grid-cols-[0.86fr_1.14fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#145da0]">Find us in Kinoo</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-[#073159]">
              St Ignatius Christian School, Kinoo.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Peak uses this location for guided learning conversations, tuition coordination and programme placement. Parents should call first so the visit is purposeful.
            </p>

            <div className="mt-7 grid gap-3">
              {visitNotes.map((note) => (
                <div key={note} className="flex items-start gap-3 rounded-lg bg-[#f4f9fc] p-3 text-sm font-bold leading-6 text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#145da0]" />
                  {note}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#073159] px-5 py-3 text-sm font-black uppercase tracking-[0.13em] text-white transition hover:bg-[#145da0]">
                <Navigation size={16} /> Get directions
              </a>
              <Link href="/events/register" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#145da0]/20 px-5 py-3 text-sm font-black uppercase tracking-[0.13em] text-[#145da0] transition hover:bg-[#eaf3f8]">
                Register learner <GraduationCap size={16} />
              </Link>
            </div>
          </div>

          <div className="min-h-[360px] border-t border-slate-200 lg:min-h-[560px] lg:border-l lg:border-t-0">
            <iframe
              title="Map to St Ignatius Christian School Kinoo"
              src={mapEmbedUrl}
              className="h-full min-h-[360px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      <section className="bg-[#071a2d] px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7ed957]">Fast placement route</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Send the learner details once. Get a clearer recommendation.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/68">
              Include the learner name, curriculum, class or grade, weak subjects, current marks if available, and whether you need term tuition or holiday tuition.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <div className="flex gap-4">
              <ShieldCheck className="mt-1 h-7 w-7 shrink-0 text-[#7ed957]" />
              <div>
                <h3 className="text-xl font-black tracking-tight">Best first message</h3>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  "Hello Peak, my child is in Form 4 or Grade 9. We need help with Mathematics and Science. Can we register for holiday tuition?"
                </p>
              </div>
            </div>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7ed957] px-5 py-3 text-sm font-black uppercase tracking-[0.13em] text-[#073159] transition hover:bg-white">
              Message on WhatsApp <MessageCircle size={16} />
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
