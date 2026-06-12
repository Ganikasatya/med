import Navbar from '../components/layout/Navbar.jsx'
import CalculatorSidebar from '../components/landing/CalculatorSidebar.jsx'
import HeroSection from '../components/landing/HeroSection.jsx'
import FeatureCards from '../components/landing/FeatureCards.jsx'
import HowItWorks from '../components/landing/HowItWorks.jsx'
import TestimonialCard from '../components/landing/TestimonialCard.jsx'
import AppDownloadBanner from '../components/landing/AppDownloadBanner.jsx'
import JourneySection from '../components/landing/JourneySection.jsx'

/**
 * Doctor Mitra Landing Page.
 *
 * Scrollable, full-bleed page:
 *  • Screen 1 — the hero console fills the viewport (navbar + content = 100vh).
 *  • Screen 2 — the "Patient Journey" section sits directly below; scroll down
 *    to reveal it (its animations trigger on scroll).
 */
function LandingPage() {
  return (
    <div className="h-screen w-screen overflow-y-auto bg-gradient-to-b from-brand-blueLight via-white to-white">
      <Navbar />

      {/* Screen 1: hero fills the rest of the viewport (navbar is h-20 = 5rem) */}
      <div className="flex min-h-[calc(100vh-5rem)] flex-col">
        <div className="flex flex-1">
          <CalculatorSidebar />

          <main className="flex flex-1 flex-col">
            <HeroSection />
            <FeatureCards />

            {/* How it works + Testimonial */}
            <div className="flex flex-1 items-stretch gap-6 px-8 pt-2">
              <div className="flex flex-[1.9] items-start pt-1">
                <HowItWorks />
              </div>
              <div className="flex-1 py-1">
                <TestimonialCard />
              </div>
            </div>
          </main>
        </div>

        {/* Full-width bottom banner */}
        <AppDownloadBanner />
      </div>

      {/* Screen 2: Patient Journey (scroll down) */}
      <JourneySection />
    </div>
  )
}

export default LandingPage
