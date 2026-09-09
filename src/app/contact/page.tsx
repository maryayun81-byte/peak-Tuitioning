import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicPortalMenu } from '@/components/ui/PublicPortalMenu'
import { ContactForm } from './ContactForm'

const phoneNumber = '0798971625'
const internationalPhone = '+254798971625'
const whatsappUrl = 'https://wa.me/254798971625?text=Hello%20Peak%20Performance%20Tutoring%2C%20I%20would%20like%20to%20ask%20about%20KCSE%20or%20CBC%20tuition.'
const mapQuery = encodeURIComponent('St Ignatius Christian School Kinoo')
const mapEmbedUrl = 'https://www.openstreetmap.org/export/embed.html?bbox=36.6810%2C-1.2580%2C36.7050%2C-1.2420&layer=mapnik&marker=-1.2500%2C36.6930'
const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`

export const metadata: Metadata = {
  title: 'Contact Peak Performance Tutoring Kenya | Kinoo KCSE & CBC Tuition',
  description:
    'Contact Peak Performance Tutoring at St Ignatius Christian School Kinoo. Call or WhatsApp 0798971625 for KCSE revision, CBC support, Nairobi and Kinoo holiday tuition.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact Peak Performance Tutoring Kenya',
    description: 'Call or WhatsApp Peak Performance Tutoring on 0798971625 for KCSE, CBC and holiday tuition support.',
    url: 'https://www.peakcampus.co.ke/contact',
    siteName: 'Peak Performance Tutoring',
    images: [{ url: '/logo.png', width: 800, height: 600, alt: 'Peak Performance Tutoring' }],
  },
}

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
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="h-[3px] bg-gradient-to-r from-peak-green via-peak-blue to-peak-cyan" />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Peak Performance Tutoring" className="w-7 h-7 rounded-md object-contain" />
              <span className="hidden sm:inline text-sm font-bold tracking-tight text-slate-900">PEAK PERFORMANCE</span>
            </Link>
            <div className="flex items-center gap-3">
              <PublicPortalMenu />
              <a
                href={`tel:${phoneNumber}`}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 bg-peak-green text-white text-[11px] font-bold uppercase tracking-[0.08em] rounded hover:shadow-lg transition-all"
              >
                Call {phoneNumber}
              </a>
            </div>
          </div>
        </div>
        <div className="h-px bg-slate-200" />
      </header>

      {/* Hero — mobile-first */}
      <section className="relative bg-[#F5F3EF] overflow-hidden">
        {/* Paper texture */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Torn paper edge top */}
        <div
          className="absolute top-0 left-0 right-0 h-3 bg-white"
          style={{
            clipPath: `polygon(0% 0%, 100% 0%, 100% 40%, 97% 80%, 93% 30%, 88% 70%, 82% 20%, 76% 60%, 70% 35%, 64% 75%, 58% 25%, 52% 65%, 46% 40%, 40% 80%, 34% 30%, 28% 70%, 22% 45%, 16% 85%, 10% 35%, 5% 75%, 0% 50%)`,
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-12 sm:pb-20">
          {/* Mobile: stacked. Desktop: side by side */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-start">

            {/* Left column — headline + quick actions */}
            <div className="mb-10 lg:mb-0 lg:sticky lg:top-28">
              {/* Label */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-[2px] bg-peak-green" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Contact Peak
                </span>
              </div>

              {/* Headline — bold, compact on mobile */}
              <h1 className="text-[2rem] sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.08] mb-5">
                Talk to us before<br className="hidden sm:block" /> the next{' '}
                <span className="text-peak-green">gap</span> grows.
              </h1>

              {/* Subtext */}
              <p className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-md mb-8">
                Every conversation starts with understanding where the student actually is.
              </p>

              {/* Quick action cards — stacked on mobile, inline on desktop */}
              <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3 mb-8">
                {/* Call card */}
                <a
                  href={`tel:${phoneNumber}`}
                  className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-peak-green hover:shadow-lg transition-all sm:flex-1"
                >
                  <div className="w-12 h-12 rounded-xl bg-peak-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-peak-green group-hover:text-white transition-colors">
                    <svg className="w-5 h-5 text-peak-green group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Call us
                    </div>
                    <div className="text-sm font-bold text-slate-900">{phoneNumber}</div>
                  </div>
                </a>

                {/* WhatsApp card */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-[#25D366] hover:shadow-lg transition-all sm:flex-1"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#25D366] transition-colors">
                    <svg className="w-5 h-5 text-[#25D366] group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      WhatsApp
                    </div>
                    <div className="text-sm font-bold text-slate-900">Send a message</div>
                  </div>
                </a>
              </div>

              {/* Handwritten note — visible on all screens */}
              <div
                className="hidden sm:block relative p-4 bg-white/60 border border-dashed border-slate-200 rounded-lg max-w-sm"
                style={{ transform: 'rotate(-0.5deg)' }}
              >
                <p
                  className="text-slate-600 leading-relaxed"
                  style={{ fontFamily: "'Caveat', cursive", fontSize: '18px' }}
                >
                  &ldquo;Call first so we can match you with the right tutor. Every student gets a diagnostic before serious teaching begins.&rdquo;
                </p>
                <div
                  className="mt-2 text-slate-400"
                  style={{ fontFamily: "'Caveat', cursive", fontSize: '15px' }}
                >
                  — Peak Team
                </div>
                {/* Tape strip */}
                <div className="absolute -top-2 left-6 w-12 h-4 bg-white/80 border border-slate-100 rotate-2" />
              </div>
            </div>

            {/* Right column — contact form */}
            <div className="lg:pt-0">
              <div
                className="relative"
                style={{
                  clipPath: `polygon(
                    0% 2%, 5% 0%, 15% 1%, 25% 0%, 35% 2%, 45% 0%, 55% 1%, 65% 0%, 75% 2%, 85% 0%, 95% 1%, 100% 0%,
                    99% 8%, 100% 18%, 99% 28%, 100% 38%, 99% 48%, 100% 58%, 99% 68%, 100% 78%, 99% 88%, 100% 98%,
                    95% 100%, 85% 99%, 75% 100%, 65% 99%, 55% 100%, 45% 99%, 35% 100%, 25% 99%, 15% 100%, 5% 99%, 0% 100%,
                    1% 92%, 0% 82%, 1% 72%, 0% 62%, 1% 52%, 0% 42%, 1% 32%, 0% 22%, 1% 12%
                  )`,
                }}
              >
                {/* Shadow */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'rgba(0,0,0,0.06)',
                    filter: 'blur(16px)',
                    transform: 'translate(4px, 8px) scale(0.98)',
                  }}
                />

                <div className="relative bg-white p-5 sm:p-8" style={{ boxShadow: '0 4px 30px -8px rgba(0,0,0,0.08)' }}>
                  {/* Paper grain */}
                  <div
                    className="absolute inset-0 opacity-[0.02] pointer-events-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
                    }}
                  />

                  {/* Red margin line */}
                  <div className="absolute top-0 bottom-0 left-[14%] sm:left-[16%] w-px bg-red-300/20" />

                  {/* Corner fold */}
                  <div
                    className="absolute top-0 right-0 w-10 h-10 bg-gradient-to-bl from-slate-100 to-transparent pointer-events-none"
                    style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
                  />

                  <div className="relative sm:pl-[20%]">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-2 h-2 rounded-full bg-peak-green animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        SEND A MESSAGE
                      </span>
                    </div>
                    <ContactForm />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Torn paper edge bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-3 bg-white"
          style={{
            clipPath: `polygon(0% 60%, 5% 20%, 10% 70%, 16% 30%, 22% 55%, 28% 15%, 34% 65%, 40% 25%, 46% 60%, 52% 10%, 58% 50%, 64% 30%, 70% 70%, 76% 20%, 82% 55%, 88% 35%, 93% 65%, 97% 25%, 100% 50%, 100% 100%, 0% 100%)`,
          }}
        />
      </section>

      {/* Location section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Info */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-[2px] bg-slate-900" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Visit Us</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight mb-4">
                St Ignatius Christian School, Kinoo.
              </h2>

              <p className="text-base text-slate-500 leading-relaxed max-w-lg mb-8">
                Peak uses this location for guided learning conversations, tuition coordination and programme placement. Call first so the visit is purposeful.
              </p>

              {/* What we offer */}
              <div className="space-y-3 mb-8">
                {[
                  'KCSE revision — Form 3 & Form 4',
                  'CBC support — Grade 6 to Grade 9',
                  'Holiday tuition and intake registration',
                  'Diagnostic placement before teaching begins',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <svg className="w-4 h-4 text-peak-green mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold uppercase tracking-wider rounded hover:bg-peak-green transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                  Get directions
                </a>
                <Link
                  href="/events/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 text-slate-700 text-sm font-bold uppercase tracking-wider rounded hover:border-peak-green hover:text-peak-green transition-all"
                >
                  Register learner
                </Link>
              </div>
            </div>

            {/* Map */}
            <div
              className="relative"
              style={{
                clipPath: `polygon(
                  0% 2%, 8% 0%, 18% 2%, 28% 0%, 38% 1%, 48% 0%, 58% 2%, 68% 0%, 78% 1%, 88% 0%, 95% 2%, 100% 0%,
                  99% 10%, 100% 25%, 98% 40%, 100% 55%, 99% 70%, 96% 85%, 90% 95%, 80% 100%, 65% 98%, 50% 100%, 35% 99%, 20% 100%, 5% 98%, 0% 95%,
                  2% 82%, 0% 65%, 2% 48%, 0% 32%, 2% 15%
                )`,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'rgba(0,0,0,0.06)',
                  filter: 'blur(14px)',
                  transform: 'translate(4px, 8px) scale(0.98)',
                }}
              />
              <div className="relative overflow-hidden" style={{ boxShadow: '0 4px 30px -8px rgba(0,0,0,0.08)' }}>
                <iframe
                  title="Map around St Ignatius Christian School Kinoo"
                  src={mapEmbedUrl}
                  className="w-full h-[400px] sm:h-[500px]"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fast placement CTA */}
      <section className="py-16 sm:py-20 bg-[#F5F3EF]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 block mb-4">Fast Placement Route</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4">
            Send the learner details once.<br />Get a clearer recommendation.
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto mb-8">
            Include name, curriculum, class, weak subjects, current marks if available, and whether you need term or holiday tuition.
          </p>

          {/* Best first message card */}
          <div className="inline-block max-w-lg w-full text-left">
            <div
              className="relative bg-white p-6 sm:p-8"
              style={{
                boxShadow: '0 4px 30px -8px rgba(0,0,0,0.06)',
                clipPath: `polygon(2% 0%, 95% 0%, 100% 5%, 100% 95%, 98% 100%, 5% 100%, 0% 97%, 0% 3%)`,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-peak-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-bold text-slate-900">Best first message</span>
              </div>
              <p className="text-slate-600 leading-relaxed italic mb-5" style={{ fontFamily: "'Georgia', serif" }}>
                &ldquo;Hello Peak, my child is in Form 4 or Grade 9. We need help with Mathematics and Science. Can we register for holiday tuition?&rdquo;
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-peak-green text-white text-sm font-bold uppercase tracking-wider rounded hover:shadow-lg transition-all"
              >
                Message on WhatsApp
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Peak" className="w-5 h-5 rounded object-contain" />
            <span className="text-xs text-slate-500">Peak Performance Tutoring · Est. 2022</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link href="/" className="hover:text-peak-green transition-colors">Home</Link>
            <Link href="/about" className="hover:text-peak-green transition-colors">About</Link>
            <Link href="/blog" className="hover:text-peak-green transition-colors">Blog</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}