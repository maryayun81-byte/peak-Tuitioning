import { PeakNavigation } from '../components/homepage/PeakNavigation'
import { InquiryModal } from "../components/homepage/InquiryModal"
import { PeakHero } from '../components/homepage/PeakHero'
import { StoryTransition } from '../components/homepage/StoryTransition'
import { OrdinaryVsPeak } from '../components/homepage/OrdinaryVsPeak'
import { ProgrammeDiscovery } from '../components/homepage/ProgrammeDiscovery'
import { ProgrammesAndFees } from '../components/homepage/ProgrammesAndFees'
import { EvidenceWall } from '../components/homepage/EvidenceWall'
import { TestimonialSystem } from '../components/homepage/TestimonialSystem'
import { CampusSection } from '../components/homepage/CampusSection'
import { GalleryCarousel } from '../components/homepage/GalleryCarousel'
import { UpcomingEvents } from '../components/homepage/UpcomingEvents'
import { BlogHighlights } from '../components/homepage/BlogHighlights'
import { FAQSection } from '../components/homepage/FAQSection'
import { PeakFooter } from '../components/homepage/PeakFooter'
import { PeakEasterEggs } from '../components/homepage/PeakEasterEggs'
import { LearningRoute } from '../components/peak/LearningRoute'

export default function HomePage() {
  return (
    <main className="premium-landing overflow-x-hidden">
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