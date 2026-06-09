import { FEATURES } from '../../data/landingData.js'

/**
 * Horizontal row of six trust/feature cards below the hero search area.
 */
function FeatureCards() {
  return (
    <section className="grid shrink-0 grid-cols-6 gap-4 px-8 pt-3">
      {FEATURES.map(({ title, desc, icon: Icon }) => (
        <div
          key={title}
          className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card transition-shadow hover:shadow-cardHover"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-blueLight text-brand-blue">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[14px] font-bold leading-tight text-brand-navy">
              {title}
            </h3>
            <p className="mt-1 text-[12px] leading-snug text-slate-500">
              {desc}
            </p>
          </div>
        </div>
      ))}
    </section>
  )
}

export default FeatureCards
