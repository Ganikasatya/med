import { Apple, Play, Download } from 'lucide-react'
import { BRAND } from '../../data/landingData.js'
import { useI18n } from '../../i18n/index.jsx'

// App store listings (placeholders until the real apps are published).
const STORE = {
  android: 'https://play.google.com/store',
  ios: 'https://www.apple.com/app-store/',
}

/**
 * Full-width blue gradient app-download banner at the bottom of the page.
 * Rendered in normal document flow (no position:fixed) so it never overlaps
 * other content. A phone mockup peeks up from the left, clear of the sidebar.
 */
function AppDownloadBanner({ className = '' }) {
  const { t } = useI18n()
  return (
    <section className={`shrink-0 px-5 pb-4 pt-1 ${className}`}>
      <div className="relative flex flex-col gap-4 overflow-visible rounded-2xl bg-gradient-to-r from-brand-blue to-brand-blueDark px-5 py-5 text-white shadow-cardHover lg:px-8 xl:flex-row xl:items-center xl:justify-between">
        {/* Phone mockup peeking up from the left (clears the sidebar) */}
        <div className="absolute -top-9 left-[250px] hidden h-[100px] w-[58px] rotate-[-8deg] rounded-[14px] border-[3px] border-slate-800 bg-white shadow-xl 2xl:flex">
          <div className="flex h-full w-full flex-col items-center justify-center px-1.5 text-center">
            <div className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-blue">
              <span className="text-[10px] font-bold text-white">+</span>
            </div>
            <span className="text-[8px] font-bold leading-tight text-brand-navy">
              {t('app.phoneMock')}
            </span>
          </div>
        </div>

        {/* Left text */}
        <div className="pl-0 2xl:pl-[140px]">
          <h3 className="text-xl font-extrabold leading-tight">
            {t('app.heading')}
          </h3>
          <p className="mt-1 text-[14px] text-blue-100">
            {t('app.subtitlePrefix')}{' '}
            <span className="font-semibold text-white">{BRAND.name}</span>{' '}
            {t('app.subtitleSuffix')}
          </p>
        </div>

        {/* Store buttons */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <StoreButton icon={Play} top={t('app.getItOn')} bottom={t('app.googlePlay')} href={STORE.android} />
          <StoreButton icon={Apple} top={t('app.downloadOnThe')} bottom={t('app.appStore')} href={STORE.ios} />
          <a
            href={STORE.android}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-[15px] font-bold text-brand-blue transition-colors hover:bg-blue-50"
          >
            <Download className="h-4 w-4" />
            {t('app.downloadApp')}
          </a>
        </div>
      </div>
    </section>
  )
}

function StoreButton({ icon: Icon, top, bottom, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2.5 rounded-xl bg-black px-5 py-2.5 text-left text-white transition-transform hover:scale-[1.02]"
    >
      <Icon className="h-7 w-7" />
      <span className="leading-none">
        <span className="block text-[10px] text-slate-300">{top}</span>
        <span className="block text-[15px] font-bold">{bottom}</span>
      </span>
    </a>
  )
}

export default AppDownloadBanner
