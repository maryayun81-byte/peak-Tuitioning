import { PeakNavigation } from '../components/homepage/PeakNavigation'
import { InquiryModal } from "../components/homepage/InquiryModal"
import { PeakHero } from '../components/homepage/PeakHero'
import { StoryTransition } from '../components/homepage/StoryTransition'
import { OrdinaryVsPeak } from '../components/homepage/OrdinaryVsPeak'
import { ProgrammeDiscovery } from '../components/homepage/ProgrammeDiscovery'
import { ProgrammesAndFees } from '../components/homepage/ProgrammesAndFees'
import { EvidenceWall } from '../components/homepage/EvidenceWall'
import { TestimonialSystem } from '../components/homepage/TestimonialSystem'
import { TeachersCarousel } from '../components/homepage/TeachersCarousel'
import { CampusSection } from '../components/homepage/CampusSection'
import { GalleryCarousel } from '../components/homepage/GalleryCarousel'
import { UpcomingEvents } from '../components/homepage/UpcomingEvents'
import { BlogHighlights } from '../components/homepage/BlogHighlights'
import { FAQSection } from '../components/homepage/FAQSection'
import { PeakFooter } from '../components/homepage/PeakFooter'
import { PeakEasterEggs } from '../components/homepage/PeakEasterEggs'
import { LearningRoute } from '../components/peak/LearningRoute'

// Brand-entity structured data: this is what teaches Google that
// peakcampus.co.ke IS "Peak Performance Tutoring" (knowledge panel +
// sitelinks eligibility). Facts mirror the public footer/contact details.
const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'EducationalOrganization',
      '@id': 'https://www.peakcampus.co.ke/#organization',
      name: 'Peak Performance Tutoring',
      alternateName: 'Peak Campus',
      url: 'https://www.peakcampus.co.ke/',
      logo: 'https://www.peakcampus.co.ke/logo.png',
      description:
        'Diagnostic, tiered tutoring for Kenyan 8-4-4 and CBC learners — KCSE revision, holiday tuition and parent-visible progress.',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'St Ignatius, Kinoo',
        addressLocality: 'Nairobi',
        addressCountry: 'KE',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'info@peakcampus.co.ke',
        telephone: '+254 798 971 625',
        contactType: 'admissions',
        areaServed: 'KE',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.peakcampus.co.ke/#website',
      url: 'https://www.peakcampus.co.ke/',
      name: 'Peak Performance Tutoring',
      publisher: { '@id': 'https://www.peakcampus.co.ke/#organization' },
      inLanguage: 'en-KE',
    },
  ],
}

export default function HomePage() {
  return (
    <main className="premium-landing overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
      />
      <InquiryModal />
      <PeakNavigation />
      <PeakHero />

      {/* Learning Route — the signature interaction */}
      <div id="how-it-works">
        <LearningRoute />
      </div>

      <StoryTransition />
      <OrdinaryVsPeak />
      <ProgrammeDiscovery />
      <ProgrammesAndFees />
      <EvidenceWall />
      <TestimonialSystem />
      <TeachersCarousel />
      <GalleryCarousel />
      <UpcomingEvents />
      <CampusSection />
      <FAQSection />
      <BlogHighlights />
      <PeakFooter />
      <PeakEasterEggs />
    </main>
  )
}