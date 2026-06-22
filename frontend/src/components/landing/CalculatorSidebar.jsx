import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { HEALTH_CALCULATORS } from '../../data/landingData.js'
import { CALCULATORS } from '../../lib/calculators.js'
import { useI18n } from '../../i18n/index.jsx'
import CalculatorModal from './CalculatorModal.jsx'

/**
 * Left sidebar listing all health calculators with a promo card at the bottom.
 * Sits below the navbar and fills the available content height — every item is
 * visible without any internal scrollbar.
 */
function CalculatorSidebar() {
  const { t } = useI18n()
  const [active, setActive] = useState(null) // label of the open calculator

  return (
    <aside className="flex h-full w-full shrink-0 flex-col gap-4 overflow-hidden px-4 py-5 lg:w-[280px] lg:pl-5 lg:pr-1">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-card">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blueLight text-brand-blue">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <rect
                x="4"
                y="2"
                width="16"
                height="20"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M8 6h8M8 10h2M12 10h4M8 14h2M12 14h4M8 18h2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2 className="text-base font-bold text-brand-navy">
            {t('calc.sidebarTitle')}
          </h2>
        </div>

        {/* List — evenly distributed, no scrollbar */}
        <ul className="flex min-h-0 flex-1 flex-col justify-between py-1">
          {HEALTH_CALCULATORS.map(({ label, short, icon: Icon }) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => CALCULATORS[label] && setActive(label)}
                className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-brand-greenLight"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-greenLight text-brand-green group-hover:bg-white">
                  {short ? (
                    <span className="text-[11px] font-extrabold tracking-tight">
                      {short}
                    </span>
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </span>
                <span className="flex-1 text-[14px] font-medium leading-tight text-slate-700">
                  {t(`calc.label.${label}`)}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-brand-green" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Promo card */}
      <div className="shrink-0 rounded-2xl border border-green-100 bg-brand-greenLight p-4">
        <p className="text-[13px] font-semibold leading-snug text-brand-navy">
          {t('calc.promoLine1')}
          <br />
          {t('calc.promoLine2')}
        </p>
        <button
          type="button"
          onClick={() => setActive('BMI Calculator')}
          className="mt-2 flex items-center gap-1 text-[13.5px] font-semibold text-brand-green hover:gap-1.5"
        >
          {t('calc.explore')}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <CalculatorModal name={active} onClose={() => setActive(null)} />
    </aside>
  )
}

export default CalculatorSidebar
