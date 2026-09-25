import type { Metadata } from 'next'
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
import { HOMEPAGE_FAQS } from '@/lib/seo/homepage-faqs'
import { PeakFooter } from '../components/homepage/PeakFooter'
import { PeakEasterEggs } from '../components/homepage/PeakEasterEggs'
import { LearningRoute } from '../components/peak/LearningRoute'

// Self-referencing canonical for the homepage only. The root layout no longer
// declares a canonical so that child pages are not forced to inherit "/".
export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

// Organization + WebSite identity lives in the root layout (one copy, every
// page). Here we only add schema unique to this page: the FAQ block below.
const HOMEPAGE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HOMEPAGE_FAQS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a,
    },
  })),
}

export default function HomePage() {
  return (
    <main className="premium-landing overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOMEPAGE_JSON_LD) }}
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