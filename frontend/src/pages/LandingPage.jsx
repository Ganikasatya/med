import Navbar from '../components/layout/Navbar.jsx'
import CalculatorSidebar from '../components/landing/CalculatorSidebar.jsx'
import HeroSection from '../components/landing/HeroSection.jsx'
import FeatureCards from '../components/landing/FeatureCards.jsx'
import HowItWorks from '../components/landing/HowItWorks.jsx'
import LifelineBanner from '../components/landing/LifelineBanner.jsx'
import TestimonialCard from '../components/landing/TestimonialCard.jsx'
import AppDownloadBanner from '../components/landing/AppDownloadBanner.jsx'
import JourneySection from '../components/landing/JourneySection.jsx'
import LandingGuide from '../components/landing/LandingGuide.jsx'
import { AuthModalProvider } from '../context/AuthModalContext.jsx'

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
    <AuthModalProvider>
    <div className="h-screen w-full overflow-x-hidden overflow-y-auto bg-gradient-to-b from-brand-blueLight via-white to-white">
      <Navbar />
      <LandingGuide />

      {/* Screen 1: hero fills the rest of the viewport (navbar is h-20 = 5rem) */}
      <div className="flex min-h-[calc(100vh-5rem)] flex-col">
        <div className="flex flex-1 flex-col lg:flex-row">
          <CalculatorSidebar />

          <main className="order-first flex flex-1 flex-col gap-8 pb-12 lg:order-none">
            <HeroSection />
            <FeatureCards />

            {/* Emergency lifeline banner */}
            <LifelineBanner />

            {/* How it works + Testimonial */}
            <div className="flex flex-1 flex-col items-stretch gap-6 px-4 pt-4 sm:px-8 lg:flex-row">
              <div className="flex flex-[1.9] items-start">
                <HowItWorks />
              </div>
              <div className="flex-1">
                <TestimonialCard />
              </div>
            </div>
          </main>
        </div>

      </div>

      {/* Screen 2: Patient Journey (scroll down) */}
      <JourneySection />
      <AppDownloadBanner />
    </div>
    </AuthModalProvider>
  )
}

export default LandingPage
