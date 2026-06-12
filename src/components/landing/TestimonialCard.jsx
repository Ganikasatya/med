import { Quote, Star } from 'lucide-react'
import { TESTIMONIALS } from '../../data/landingData.js'

/**
 * Testimonial card shown beside "How it works".
 * Renders the first testimonial with a static carousel dot indicator.
 */
function TestimonialCard() {
  const t = TESTIMONIALS[0]

  return (
    <section className="flex h-full flex-col rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
      <h2 className="text-lg font-extrabold text-brand-navy">
        What our users say
      </h2>

      <div className="mt-2 flex flex-1 flex-col">
        <div className="flex items-start gap-2">
          <Quote className="h-7 w-7 shrink-0 rotate-180 fill-brand-blue/20 text-brand-blue/30" />
          <p className="text-[14px] leading-relaxed text-slate-600">
            {t.quote}
          </p>
        </div>

        <div className="mt-3 flex gap-0.5">
          {Array.from({ length: t.rating }).map((_, i) => (
            <Star key={i} className="h-[18px] w-[18px] fill-amber-400 text-amber-400" />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-base font-bold text-white">
            {t.name.charAt(0)}
          </div>
          <div className="leading-tight">
            <div className="text-[14px] font-bold text-brand-navy">{t.name}</div>
            <div className="text-[12px] text-slate-500">{t.city}</div>
          </div>
        </div>
      </div>

      {/* Carousel dots (static) */}
      <div className="mt-3 flex justify-center gap-1.5">
        <span className="h-2 w-5 rounded-full bg-brand-blue" />
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        <span className="h-2 w-2 rounded-full bg-slate-300" />
      </div>
    </section>
  )
}

export default TestimonialCard
