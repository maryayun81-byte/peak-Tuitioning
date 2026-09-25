import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Privacy Policy | Peak Campus' },
  description: 'How Peak Campus collects, uses and protects student and parent data, including ads measurement.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 prose prose-slate">
      <h1>Privacy Policy</h1>
      <p>Last updated: September 2026. Peak Campus (Peak Performance Tutoring), Nairobi, Kenya — info@peakcampus.co.ke, +254 798 971 625.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Contact details you share (name, phone, learner class) via inquiry, contact and registration forms.</li>
        <li>Learning data (enrollments, sessions, attempts, submissions, mastery) to deliver teaching.</li>
        <li>Ads measurement (only with consent): Meta Pixel and Google tags record page views and form submissions.</li>
      </ul>
      <h2>Why</h2>
      <p>To teach, track progress, keep parents informed, and measure whether our Facebook and Google ads reach parents who need tuition.</p>
      <h2>Consent</h2>
      <p>Measurement cookies run only after you tap Accept on our cookie banner. Declining never blocks the site. You can change your choice anytime by clearing site data or contacting us.</p>
      <h2>Sharing</h2>
      <p>We share limited events (e.g. Lead) with Meta and Google for ads measurement. We never sell student data. Teachers see only assigned students; parents see only linked children.</p>
      <h2>Your rights</h2>
      <p>Under Kenya&apos;s Data Protection Act you may request access, correction or deletion: info@peakcampus.co.ke.</p>
    </main>
  )
}
