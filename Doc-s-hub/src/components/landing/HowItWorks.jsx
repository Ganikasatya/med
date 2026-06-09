import { Fragment } from 'react'
import { HOW_IT_WORKS } from '../../data/landingData.js'

/**
 * "How it works" — four numbered steps connected by dotted arrows.
 */
function HowItWorks() {
  return (
    <section className="flex flex-col">
      <h2 className="mb-3 text-2xl font-extrabold text-brand-navy">
        How it works
      </h2>

      <div className="flex items-start">
        {HOW_IT_WORKS.map(({ step, title, desc, icon: Icon }, i) => (
          <Fragment key={step}>
            <div className="flex w-[140px] flex-col items-center text-center">
              <div className="relative">
                <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="absolute -bottom-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-xs font-bold text-white ring-2 ring-white">
                  {step}
                </span>
              </div>
              <h3 className="mt-2.5 text-[15px] font-bold text-brand-navy">
                {title}
              </h3>
              <p className="mt-1 text-[12px] leading-snug text-slate-500">
                {desc}
              </p>
            </div>

            {i < HOW_IT_WORKS.length - 1 && (
              <div className="mt-7 flex flex-1 items-center px-1">
                <span className="w-full border-t-2 border-dashed border-slate-300" />
                <span className="-ml-1 text-lg leading-none text-slate-300">›</span>
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </section>
  )
}

export default HowItWorks
