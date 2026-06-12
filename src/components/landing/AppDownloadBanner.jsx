import { Apple, Play, Download } from 'lucide-react'
import { BRAND } from '../../data/landingData.js'

/**
 * Full-width blue gradient app-download banner at the bottom of the page.
 * Rendered in normal document flow (no position:fixed) so it never overlaps
 * other content. A phone mockup peeks up from the left, clear of the sidebar.
 */
function AppDownloadBanner() {
  return (
    <section className="shrink-0 px-5 pb-4 pt-1">
      <div className="relative flex items-center justify-between overflow-visible rounded-2xl bg-gradient-to-r from-brand-blue to-brand-blueDark px-8 py-4 text-white shadow-cardHover">
        {/* Phone mockup peeking up from the left (clears the sidebar) */}
        <div className="absolute -top-9 left-[250px] hidden h-[100px] w-[58px] rotate-[-8deg] rounded-[14px] border-[3px] border-slate-800 bg-white shadow-xl lg:flex">
          <div className="flex h-full w-full flex-col items-center justify-center px-1.5 text-center">
            <div className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-blue">
              <span className="text-[10px] font-bold text-white">+</span>
            </div>
            <span className="text-[8px] font-bold leading-tight text-brand-navy">
              Book Anywhere, Anytime!
            </span>
          </div>
        </div>

        {/* Left text */}
        <div className="pl-2 lg:pl-[140px]">
          <h3 className="text-xl font-extrabold leading-tight">
            Healthcare made simple for you and your family.
          </h3>
          <p className="mt-1 text-[14px] text-blue-100">
            Download the{' '}
            <span className="font-semibold text-white">{BRAND.name}</span> app
            and manage your health on the go.
          </p>
        </div>

        {/* Store buttons */}
        <div className="flex shrink-0 items-center gap-3">
          <StoreButton icon={Play} top="GET IT ON" bottom="Google Play" />
          <StoreButton icon={Apple} top="Download on the" bottom="App Store" />
          <button className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-[15px] font-bold text-brand-blue transition-colors hover:bg-blue-50">
            <Download className="h-4 w-4" />
            Download App
          </button>
        </div>
      </div>
    </section>
  )
}

function StoreButton({ icon: Icon, top, bottom }) {
  return (
    <button className="flex items-center gap-2.5 rounded-xl bg-black px-5 py-2.5 text-left text-white transition-transform hover:scale-[1.02]">
      <Icon className="h-7 w-7" />
      <span className="leading-none">
        <span className="block text-[10px] text-slate-300">{top}</span>
        <span className="block text-[15px] font-bold">{bottom}</span>
      </span>
    </button>
  )
}

export default AppDownloadBanner
