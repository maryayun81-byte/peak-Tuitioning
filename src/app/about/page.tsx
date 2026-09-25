import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicPortalMenu } from '@/components/ui/PublicPortalMenu'

export const metadata: Metadata = {
  // `absolute` bypasses the root "%s | Peak Performance Tutoring" template,
  // which was appending the brand twice (96-char titles got truncated in SERPs).
  title: { absolute: 'About Peak Performance Tutoring | Kenya' },
  description:
    'Learn how Peak Performance Tutoring supports Kenyan KCSE and CBC learners through diagnostic placement, ability-matched groups, and visible progress.',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="relative overflow-hidden pt-20">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='60' height='60' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-peak-green via-peak-blue to-peak-cyan"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="relative z-10 flex items-center justify-between mb-12 pb-4 border-b border-slate-100">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Peak Performance" className="w-7 h-7 rounded-md object-contain" />
              <span className="hidden sm:inline text-sm font-bold tracking-tight text-slate-900">PEAK PERFORMANCE</span>
            </Link>
            <PublicPortalMenu />
          </nav>

          {/* Hero content */}
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            {/* Left: text content */}
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-peak-green mb-4">About Peak Performance</p>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.05] mb-6">
                We do not teach subjects. We build scholars.
              </h1>

              <p className="text-base sm:text-lg text-slate-500 leading-relaxed mb-8 max-w-lg">
                Founded in 2023, Peak Performance Tutoring exists for the learner who needs more than syllabus coverage. We diagnose, group, guide, and measure progress until potential becomes performance.
              </p>

              {/* Principles section */}
              <div className="space-y-4 mb-12">
                <h2 className="text-xl font-bold text-slate-800 mb-3">Our principles</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { title: 'We guide before we teach', desc: 'Peak is built around the belief that a learner needs a guide who understands how they learn, where they lose marks, and what confidence looks like for them.' },
                    { title: 'We diagnose the real problem', desc: 'Transcripts, habits, weak subjects, temperament, and behaviour patterns are reviewed before the first serious intervention begins.' },
                    { title: 'We group by goal, not age alone', desc: 'Every student is placed where the strategy matches the gap: foundations, application, or high-grade precision.' },
                  ].map(({ title, desc }, i) => (
                    <div key={i} className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="font-bold text-slate-800">{title}</div>
                      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Promise section */}
              <div className="pt-8 border-t border-slate-100">
                <p className="text-sm font-bold uppercase tracking-[0.15em] text-peak-green mb-4">Our promise</p>
                <div className="grid grid-cols-2 gap-3 text-sm text-slate-500">
                  <div>Move every learner at least one grade band upward within the programme.</div>
                  <div>Make the first diagnostic profile matter in every lesson.</div>
                  <div>Keep students producing more than they consume.</div>
                  <div>Never let a D-grade student finish without a C-minus floor as the target.</div>
                </div>
              </div>
            </div>

            {/* Right: visual card */}
            <div>
              {/* Paper artifact card */}
              <div
                className="relative rounded-2xl bg-white shadow-sm overflow-hidden transform hover:scale-[1.02] transition-transform"
                style={{
                  clipPath: `polygon(
                    0% 0%, 5% 1%, 15% 0%, 25% 2%, 35% 0%, 45% 1%, 55% 0%, 65% 2%, 75% 1%, 85% 0%, 95% 1%, 100% 0%,
                    98% 8%, 100% 18%, 98% 28%, 100% 38%, 98% 48%, 100% 58%, 98% 68%, 100% 78%, 98% 88%, 100% 98%,
                    95% 100%, 85% 99%, 75% 100%, 65% 99%, 55% 100%, 45% 99%, 35% 100%, 25% 99%, 15% 100%, 5% 99%, 0% 100%,
                    1% 92%, 0% 82%, 1% 72%, 0% 62%, 1% 52%, 0% 42%, 1% 32%, 0% 22%, 1% 12%
                  )`,
                }}
              >
                {/* Shadow */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'rgba(0,0,0,0.08)',
                    filter: 'blur(16px)',
                    transform: 'translate(4px, 8px) scale(0.98)',
                  }}
                />

                {/* Paper grain */}
                <div
                  className="absolute inset-0 opacity-[0.02] pointer-events-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
                  }}
                />

                {/* Red margin line */}
                <div className="absolute top-0 bottom-0 left-[14%] w-px bg-red-300/20" />

                {/* Corner fold */}
                <div
                  className="absolute top-0 right-0 w-10 h-10 bg-gradient-to-bl from-slate-100 to-transparent pointer-events-none"
                  style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
                />

                <div className="relative p-6 pt-0">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-peak-green/10 flex items-center justify-center mb-6">
                    <svg className="w-5 h-5 text-peak-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>

                  {/* Headline */}
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
                    Potential becomes performance
                  </h2>

                  {/* Key stat */}
                  <p className="text-sm text-slate-500">
                    Since 2023, learners have moved up one full grade band on average.
                  </p>

                  {/* CTA */}
                  <a
                    href="/kcse-and-cbc-tutoring-kenya"
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-peak-green text-white text-sm font-bold uppercase tracking-wider rounded hover:shadow-lg transition-all"
                  >
                    Explore methodology
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l13 13l-13 13" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum comparison section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            {/* Left: text */}
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.15em] text-peak-green mb-4">By curriculum</p>

              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.05] mb-6">
                See how the model changes by curriculum.
              </h2>

              <p className="text-base text-slate-500 leading-relaxed mb-8 max-w-lg">
                Peak adapts its diagnostic, grouping, and teaching approach to match the unique structure of 8-4-4 and CBC curriculums. The core principles remain the same — but the pathways differ.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* These previously pointed at /8-4-4-tutoring-kenya and
                    /cbc-tutoring-kenya — routes that do not exist and returned
                    live 404s. Both curriculums are served by one real page. */}
                <Link
                  href="/kcse-and-cbc-tutoring-kenya"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-black uppercase tracking-wider text-white hover:bg-peak-green transition-colors"
                >
                  8-4-4 &amp; CBC Programme
                </Link>
                <Link
                  href="/holiday-tuition-kenya"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-black uppercase tracking-wider text-slate-700 hover:border-peak-green hover:text-peak-green transition-all"
                >
                  Holiday Tuition
                </Link>
              </div>
            </div>

            {/* Right: visual illustration */}
            <div>
              <div
                className="relative rounded-2xl bg-slate-50 overflow-hidden shadow-sm"
                style={{
                  clipPath: `polygon(
                    0% 2%, 8% 0%, 18% 2%, 28% 0%, 38% 1%, 48% 0%, 58% 2%, 68% 0%, 78% 1%, 88% 0%, 95% 2%, 100% 0%,
                    99% 10%, 100% 25%, 98% 40%, 100% 55%, 99% 70%, 96% 85%, 90% 95%, 80% 100%, 65% 98%, 50% 100%, 35% 99%, 20% 100%, 5% 98%, 0% 95%,
                    2% 82%, 0% 65%, 2% 48%, 0% 32%, 2% 15%
                  )`,
                }}
              >
                <iframe
                  className="w-full h-[300px] sm:h-[350px] lg:h-[400px]"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=36.6810%2C-1.2580%2C36.7050%2C-1.2420&layer=mapnik&marker=-1.2500%2C36.6930"
                  style={{ border: 'none' }}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'rgba(0,0,0,0.04)',
                    filter: 'blur(8px)',
                    transform: 'translate(4px, 4px) scale(0.98)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 bg-[#F5F3EF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.15em] text-peak-green mb-4">Ready to begin?</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4">
            Let's find the right path for your learner.
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto mb-8">
            Share their class, curriculum, and weak subjects — we'll diagnose and recommend the best pathway.
          </p>
          <a
            href={`tel:0798971625`}
            className="inline-flex items-center gap-2 px-8 py-3 bg-peak-green text-white text-sm font-bold uppercase tracking-wider rounded hover:shadow-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Peak" className="w-5 h-5 rounded object-contain" />
            <span className="text-slate-500">Peak Performance Tutoring · Est. 2023</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-sm">
            <a href="/" className="hover:text-peak-green transition-colors">Home</a>
            <a href="/about" className="hover:text-peak-green transition-colors">About</a>
            <a href="/contact" className="hover:text-peak-green transition-colors">Contact</a>
          </div>
          <div className="relative">
            <span className="text-slate-400 text-sm">Subscribe</span>
            <form
              action=""
              className="mt-1 flex items-center gap-2 w-48"
            >
              <input
                type="email"
                placeholder="enter@email.com"
                className="flex-1 bg-slate-100 border border-slate-200 rounded py-1.5 px-2 text-sm placeholder-slate-400 focus:outline-none focus:border-peak-green"
              />
              <button
                type="submit"
                className="bg-peak-green text-white py-1.5 px-3 rounded text-sm font-bold uppercase tracking-[0.1em] transition"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </footer>
    </main>
  )
}