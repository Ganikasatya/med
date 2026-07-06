import { Search, MapPin, ChevronDown, CalendarDays, Ticket, ChevronRight, ShieldCheck, Star } from 'lucide-react'
import HeroVisual from './HeroVisual.jsx'
import { POPULAR_SEARCHES, BRAND } from '../../data/landingData.js'
import { useAuthModal } from '../../context/AuthModalContext.jsx'
import { useI18n } from '../../i18n/index.jsx'

/**
 * Hero: large headline + subtitle, a tall search bar, popular-search chips and
 * two CTA cards on the left; the family photo / hospital visual on the right.
 * Sized to the reference's 16:9 proportions (generous, not compressed).
 */
function HeroSection() {
  const { openAuth } = useAuthModal()
  const { t } = useI18n()
  const startPatient = () => openAuth('patient')

  return (
    <section className="relative flex shrink-0 flex-col gap-6 px-4 pt-3 sm:px-8 lg:flex-row">
      {/* Left column */}
      <div className="flex w-full flex-col lg:w-[52%]">
        <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-xs font-medium text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
          {t('journey.trust.patients')}
        </span>

        <h1 className="text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-[46px] lg:leading-[1.04]">
          <span className="block text-brand-navy">{t('hero.line1')}</span>
          <span className="block text-brand-navy">{t('hero.line2')}</span>
          <span className="block text-brand-green">{t('hero.line3')}</span>
        </h1>

        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-slate-500">
          {t('hero.subtitle')}
        </p>

        {/* Search bar */}
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-card">
          <div className="flex min-w-0 flex-1 basis-full items-center gap-3 pl-3 sm:basis-0">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder={t('hero.searchPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && startPatient()}
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
          <button
            onClick={startPatient}
            className="flex-1 rounded-xl bg-brand-blue px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-blueDark sm:flex-none sm:px-8"
          >
            {t('hero.search')}
          </button>
        </div>

        {/* Popular searches */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          <span className="text-[14px] font-medium text-slate-500">
            {t('hero.popular')}
          </span>
          {POPULAR_SEARCHES.map((tag) => (
            <button
              key={tag}
              onClick={startPatient}
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
            title={t('hero.bookTitle')}
            subtitle={t('hero.bookSub')}
            tone="green"
            onClick={startPatient}
          />
          <CtaCard
            icon={Ticket}
            title={t('hero.tokenTitle')}
            subtitle={t('hero.tokenSub')}
            tone="blue"
            onClick={startPatient}
          />
        </div>
      </div>

      {/* Right column — visual + floating trust badges */}
      <div className="relative min-h-[320px] w-full lg:min-h-0 lg:w-[48%]">
        <HeroVisual />

        <div className="absolute left-1 top-8 hidden rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-cardHover lg:block">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-greenLight text-brand-green">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="text-xs">
              <p className="font-semibold text-brand-navy">{t('feat.trustedDoctors.title')}</p>
              <p className="text-slate-400">{t('feat.trustedDoctors.desc')}</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 right-1 hidden rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-cardHover lg:block">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-amber-500">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </span>
            <div className="text-xs">
              <p className="font-semibold text-brand-navy">4.9 · 12k+</p>
              <p className="text-slate-400">{t('feat.saveTime.title')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CtaCard({ icon: Icon, title, subtitle, tone, onClick }) {
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
      onClick={onClick}
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
