import { useState } from 'react'
import { ChevronRight, Calculator, ArrowRight } from 'lucide-react'
import { HEALTH_CALCULATORS } from '../../data/landingData.js'
import { JOURNEY } from '../../data/journeyData.js'
import { CALCULATORS } from '../../lib/calculators.js'
import { useI18n } from '../../i18n/index.jsx'
import { useAuthModal } from '../../context/AuthModalContext.jsx'
import CalculatorModal from './CalculatorModal.jsx'

/**
 * Sweet-looker "CalculatorsAndJourney" section, ported with TapCure's real
 * content: a sticky "Health tools" calculator aside on the left, and the full
 * 6-step patient journey as editorial step cards on the right, closed by a
 * social-proof strip. Calculators stay wired to the existing CalculatorModal.
 */
function ToolsAndJourney() {
  const { t } = useI18n()
  const { openAuth } = useAuthModal()
  const [active, setActive] = useState(null) // open calculator label
  const startPatient = () => openAuth('patient')

  return (
    <section id="journey" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        {/* ── Left: sticky Health tools aside ─────────────────────────────── */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-greenLight text-brand-green">
                <Calculator className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl leading-none text-brand-navy">{t('calc.sidebarTitle')}</h3>
                <p className="mt-1 text-xs text-slate-400">{t('calc.promoLine1')}</p>
              </div>
            </div>

            <ul className="flex flex-col">
              {HEALTH_CALCULATORS.map(({ label, short, icon: Icon }) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => CALCULATORS[label] && setActive(label)}
                    className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-brand-greenLight"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-greenLight text-brand-green group-hover:bg-white">
                      {short ? (
                        <span className="text-[10px] font-extrabold tracking-tight">{short}</span>
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </span>
                    <span className="flex-1 text-sm font-medium text-slate-700">
                      {t(`calc.label.${label}`)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-brand-green" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-2xl bg-brand-greenLight p-4">
              <p className="text-sm font-medium leading-snug text-brand-navy">
                {t('calc.promoLine1')}
                <br />
                {t('calc.promoLine2')}
              </p>
              <button
                type="button"
                onClick={() => setActive('BMI Calculator')}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:gap-1.5"
              >
                {t('calc.explore')} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Right: the 6-step journey ───────────────────────────────────── */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-green">
            {t('how.heading')}
          </p>
          <h2 className="mt-3 max-w-2xl text-4xl leading-tight text-brand-navy sm:text-5xl">
            {t('journey.headingA')} <em className="text-brand-green">{t('journey.headingB')}</em>
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-500">
            {t('journey.subtitle')}
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {JOURNEY.map((s, i) => (
              <JourneyStep key={s.n} step={s} index={i} last={i === JOURNEY.length - 1} />
            ))}
          </div>

          {/* Social-proof strip */}
          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
            <div className="flex -space-x-2">
              {['P', 'R', 'M'].map((c) => (
                <span
                  key={c}
                  className="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-brand-greenLight text-xs font-bold text-brand-green"
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="flex-1 text-sm text-slate-600">{t('journey.trust.patients')}</p>
            <button
              onClick={startPatient}
              className="inline-flex items-center gap-1 rounded-full bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
            >
              {t('hero.bookTitle')} <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <CalculatorModal name={active} onClose={() => setActive(null)} />
    </section>
  )
}

function JourneyStep({ step, index, last }) {
  const { t } = useI18n()
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-cardHover"
    >
      <div className="flex items-start justify-between">
        <span className="font-serif text-4xl italic text-brand-green/70">
          {String(step.n).padStart(2, '0')}
        </span>
        <span
          className={`h-8 w-8 rounded-full transition-all ${
            hover ? 'bg-brand-green' : 'bg-brand-greenLight'
          }`}
        />
      </div>
      <h3 className="mt-4 text-2xl leading-tight text-brand-navy">
        {t(`journey.step${step.n}.title`)}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        {t(`journey.step${step.n}.caption`)}
      </p>
      {!last && (
        <ArrowRight className="absolute -bottom-2 -right-2 h-16 w-16 text-brand-greenLight" />
      )}
    </div>
  )
}

export default ToolsAndJourney
