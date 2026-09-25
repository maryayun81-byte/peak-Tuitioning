import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Terms of Service | Peak Campus' },
  description: 'Terms for using Peak Campus tuition, homeschooling and portals.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 prose prose-slate">
      <h1>Terms of Service</h1>
      <p>Last updated: September 2026. Peak Campus, Nairobi, Kenya.</p>
      <h2>Services</h2>
      <p>Group tuition, homeschooling missions, teacher feedback and parent reports. Teachers own curriculum and formal assessment; the platform tracks progression and evidence.</p>
      <h2>Accounts</h2>
      <p>One account per learner; parents access linked children only. Keep credentials private.</p>
      <h2>Payments &amp; scheduling</h2>
      <p>Fees, session times and rescheduling are agreed per enrollment. Missed sessions keep progress; contact us to resume.</p>
      <h2>Acceptable use</h2>
      <p>No sharing other students&apos; data, no abuse of staff, no attempts to access unauthorized records or AI internals.</p>
      <h2>Contact</h2>
      <p>info@peakcampus.co.ke · +254 798 971 625 · St Ignatius, Kinoo, Nairobi.</p>
    </main>
  )
}
