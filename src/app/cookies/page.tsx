import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Cookie Policy | Peak Campus' },
  description: 'Which cookies Peak Campus uses: essential, preferences and (with consent) ads measurement.',
  alternates: { canonical: '/cookies' },
}

export default function CookiesPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 prose prose-slate">
      <h1>Cookie Policy</h1>
      <p>Last updated: September 2026.</p>
      <h2>Essential</h2>
      <p>Login sessions, security, load balancing. Always on — the site cannot work without them.</p>
      <h2>Preferences</h2>
      <p>Theme and your cookie choice itself (<code>peak-ads-consent-v1</code>, kept on your device with a cookie fallback).</p>
      <h2>Ads measurement (consent only)</h2>
      <ul>
        <li>Meta Pixel (<code>_fbp</code>): measures ad-driven visits and Lead events.</li>
        <li>Google tags: measures page views, generate_lead, sign_up and purchase events.</li>
      </ul>
      <p>These load only after you tap Accept. Decline, and they never load. Change your mind anytime by clearing this site&apos;s data in your browser.</p>
    </main>
  )
}
