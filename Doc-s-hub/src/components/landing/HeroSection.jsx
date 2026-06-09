import { Search, MapPin, ChevronDown, CalendarDays, Ticket, ChevronRight } from 'lucide-react'
import HeroVisual from './HeroVisual.jsx'
import { POPULAR_SEARCHES, BRAND } from '../../data/landingData.js'

/**
 * Hero: large headline + subtitle, a tall search bar, popular-search chips and
 * two CTA cards on the left; the family photo / hospital visual on the right.
 * Sized to the reference's 16:9 proportions (generous, not compressed).
 */
function HeroSection() {
  return (
    <section className="relative flex shrink-0 gap-6 px-8 pt-3">
      {/* Left column */}
      <div className="flex w-[52%] flex-col">
        <h1 className="text-[46px] font-extrabold leading-[1.04] tracking-tight">
          <span className="block text-brand-navy">Book appointment.</span>
          <span className="block text-brand-navy">Get token.</span>
          <span className="block text-brand-green">Travel at the right time.</span>
        </h1>

        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-slate-500">
          Skip the long queues. Book with trusted doctors &amp; clinics and get
          your token before you visit.
        </p>

        {/* Search bar */}
        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-card">
          <div className="flex flex-1 items-center gap-3 pl-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search doctors, specialties, clinics, hospitals..."
              className="w-full bg-transparent py-2.5 text-[15px] text-brand-navy placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 border-l border-slate-200 px-4">
            <MapPin className="h-5 w-5 text-slate-400" />
            <span className="text-[15px] font-medium text-brand-navy">
              {BRAND.city}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
          <button className="rounded-xl bg-brand-blue px-8 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-blueDark">
            Search
          </button>
        </div>

        {/* Popular searches */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          <span className="text-[14px] font-medium text-slate-500">
            Popular Searches:
          </span>
          {POPULAR_SEARCHES.map((tag) => (
            <button
              key={tag}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:border-brand-blue hover:text-brand-blue"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* CTA cards */}
        <div className="mt-4 flex gap-5">
          <CtaCard
            icon={CalendarDays}
            title="Book Appointment"
            subtitle="Book with ease"
            tone="green"
          />
          <CtaCard
            icon={Ticket}
            title="Get Token"
            subtitle="Save time at the clinic"
            tone="blue"
          />
        </div>
      </div>

      {/* Right column — visual */}
      <div className="relative w-[48%]">
        <HeroVisual />
      </div>
    </section>
  )
}

function CtaCard({ icon: Icon, title, subtitle, tone }) {
  const tones = {
    green: {
      wrap: 'border-green-100 bg-green-50/70 hover:border-brand-green',
      icon: 'bg-white text-brand-green',
      title: 'text-brand-navy',
    },
    blue: {
      wrap: 'border-blue-100 bg-blue-50/70 hover:border-brand-blue',
      icon: 'bg-white text-brand-blue',
      title: 'text-brand-blue',
    },
  }
  const t = tones[tone]
  return (
    <button
      className={`group flex flex-1 items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-colors ${t.wrap}`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${t.icon}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <span className={`block text-[15px] font-bold ${t.title}`}>{title}</span>
        <span className="block text-[13px] text-slate-500">{subtitle}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

export default HeroSection
