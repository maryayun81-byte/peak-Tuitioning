import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Thank you | Peak Campus Kenya',
  description: 'Your inquiry was received. We respond within 24 hours.',
  alternates: { canonical: '/thank-you' },
  robots: { index: false, follow: false },
}

export default function ThankYouPage() {
  return (
    <main className="max-w-xl mx-auto px-6 py-24 text-center">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
        <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Thank you — we got it.</h1>
      <p className="text-slate-500 mb-8">A Peak Campus advisor will call or WhatsApp you within 24 hours.</p>
      <div className="flex gap-3 justify-center">
        <Link href="/" className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white">Back home</Link>
        <Link href="/contact" className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700">Contact us</Link>
      </div>
    </main>
  )
}
