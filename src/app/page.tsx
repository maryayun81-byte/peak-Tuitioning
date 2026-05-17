import Link from 'next/link'
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

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f6f3ed] text-slate-950">
      <section className="relative min-h-[82vh] overflow-hidden bg-slate-950 text-white">
        <img
          src="/media__1776963140564.jpg"
          alt="Peak Performance learning environment"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/68" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,.92)_0%,rgba(2,6,23,.72)_42%,rgba(2,6,23,.18)_100%)]" />

        <nav className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Peak Performance logo" className="h-11 w-11 rounded-md bg-white object-contain p-1" />
            <div>
              <div className="text-sm font-black uppercase tracking-[0.24em]">Peak Performance</div>
              <div className="text-xs text-white/60">Tutoring Kenya</div>
            </div>
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
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-emerald-100 backdrop-blur">
              <Sparkles size={14} /> From potential to performance
            </div>
            <h1 className="text-5xl font-black leading-[0.96] tracking-tight sm:text-7xl lg:text-8xl">
              Peak Performance Tutoring
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78 sm:text-xl">
              A diagnostic, tiered tutoring system for Kenyan 8-4-4 and CBC learners. We identify the exact mark gap, place each student in the right group, and guide them toward visible academic movement.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/enroll"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-emerald-300"
              >
                Start diagnostic <ArrowRight size={17} />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                See the method
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-slate-200 px-0 sm:grid-cols-4">
          {outcomes.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white px-4 py-5 sm:px-6">
              <Icon className="mb-3 h-5 w-5 text-emerald-700" />
              <div className="text-2xl font-black tracking-tight text-slate-950">{value}</div>
              <div className="mt-1 text-sm font-medium text-slate-600">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className="mb-4 h-1 w-14 bg-emerald-600" />
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-800">The problem Peak solves</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Most learners do not need more noise. They need the right intervention.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Schools carry the syllabus. Peak carries the individual learner. Our guides study why a student is losing marks, then adapt every session to the learner's tier, curriculum, confidence, and exam temperament.
            </p>
          </div>
          <div className="grid gap-3">
            {painSolutions.map(([problem, solution]) => (
              <div key={problem} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[180px_1fr]">
                <div className="text-sm font-black uppercase tracking-[0.16em] text-rose-700">{problem}</div>
                <div className="flex gap-3 text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <span>{solution}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-800">CBC curriculum in action</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Hands-on learning is a core part of the Peak promise.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              CBC learners need to build, test, observe, explain, and correct. Peak makes practical work visible through guided tasks, real materials, and reflection that turns activity into competence.
            </p>
            <Link href="/kcse-and-cbc-tutoring-kenya" className="mt-7 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-emerald-800">
              Explore CBC support <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <img src={cbcCurriculumImages[0]} alt="CBC practical learning at Peak Performance" className="col-span-2 h-56 w-full rounded-lg object-cover shadow-sm sm:h-72" />
            {cbcCurriculumImages.slice(1).map((image, index) => (
              <img
                key={image}
                src={image}
                alt={`CBC curriculum hands-on learning ${index + 2}`}
                className="h-32 w-full rounded-lg object-cover shadow-sm sm:h-40"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">Inside the Peak method</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">A simple system students can feel.</h2>
            </div>
            <Link href="/about" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-200 hover:text-white">
              About Peak <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg bg-white/10 md:grid-cols-4">
            {methodSteps.map(({ title, body, icon: Icon }, index) => (
              <div key={title} className="bg-slate-950 p-6">
                <div className="flex items-center justify-between">
                  <Icon className="h-7 w-7 text-emerald-300" />
                  <span className="text-xs font-black text-white/35">0{index + 1}</span>
                </div>
                <h3 className="mt-8 text-xl font-black tracking-tight">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/65">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-800">Campus gallery</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Learning should look focused, warm, and serious.</h2>
            </div>
            <div className="text-sm font-semibold text-slate-500">Swipe on mobile. Hover to pause on desktop.</div>
          </div>
          <PremiumCarousel images={galleryImages} />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {galleryImages.slice(0, 4).map((image, index) => (
              <img
                key={image}
                src={image}
                alt={`Peak Performance learning moment ${index + 1}`}
                className="h-32 w-full rounded-lg border border-white object-cover shadow-sm sm:h-40"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-800">Programmes</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Different curricula. One disciplined performance model.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {programmes.map((programme) => (
              <Link key={programme.title} href={programme.href} className="group rounded-lg border border-slate-200 bg-[#f8f6f1] p-6 transition hover:-translate-y-1 hover:border-emerald-300 hover:bg-emerald-50">
                <h3 className="text-2xl font-black tracking-tight">{programme.title}</h3>
                <p className="mt-3 min-h-24 text-sm leading-6 text-slate-600">{programme.body}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-emerald-800">
                  Explore <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
            <img src="/media__1776964680232.jpg" alt="Focused Peak Performance student study setting" className="h-[360px] w-full object-cover sm:h-[460px]" />
          </div>
          <div>
            <div className="mb-4 h-1 w-14 bg-amber-500" />
            <p className="text-sm font-black uppercase tracking-[0.24em] text-amber-700">Portals</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">The work stays connected after class.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Students, parents, and teachers each get a focused workspace, so live sessions, progress, assignments, and feedback do not disappear after the lesson ends.
            </p>
            <div className="mt-7 grid gap-3">
              {portals.map(({ label, href, icon: Icon }) => (
                <Link key={label} href={href} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 font-bold transition hover:border-emerald-300 hover:bg-emerald-50">
                  <span className="flex items-center gap-3"><Icon className="h-5 w-5 text-emerald-700" /> {label}</span>
                  <ArrowRight size={17} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-300"><MapPin size={16} /> Nairobi · Online · Holiday programmes</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Ready to know exactly where the marks are being lost?</h2>
          </div>
          <Link href="/enroll" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-emerald-100">
            Book diagnostic <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  )
}
