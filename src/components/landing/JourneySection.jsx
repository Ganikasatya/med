import { useState, useEffect } from 'react'
import {
  ArrowRight, CheckCircle2, IndianRupee, ShieldCheck,
  MessageSquare, Building2, Heart, Users, Smile,
} from 'lucide-react'
import useInView from '../../hooks/useInView.js'
import { JOURNEY, REMINDERS, LANGUAGES_INFO, TRUST } from '../../data/journeyData.js'

const TRUST_ICONS = { ShieldCheck, Heart, Users, Smile }
const LANG_TONE = { green: 'bg-brand-green', blue: 'bg-brand-blue', orange: 'bg-orange-400' }
const EASE = 'ease-[cubic-bezier(0.16,1,0.3,1)]'

/** Official WhatsApp glyph (lucide has no brand icons) — fill via text color. */
function WhatsAppLogo({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.95.51 3.78 1.4 5.37L2 22l4.85-1.27a9.86 9.86 0 0 0 5.19 1.48h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.1.81.83-3.02-.2-.31a8.18 8.18 0 0 1-1.26-4.39c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
  )
}

/**
 * The mockup illustration for each step — the exact artwork sliced from the
 * Patient Journey poster (public/journey/step{n}.png). Kept inside a fixed-height
 * box so all six columns line up under the connector rail.
 */
function StepVisual({ n }) {
  return (
    <div className="flex h-44 items-center justify-center">
      <img
        src={`/journey/step${n}.png`}
        alt=""
        loading="lazy"
        className="max-h-full max-w-full object-contain"
      />
    </div>
  )
}

function StepCard({ s, i, show, active }) {
  const tone = s.color === 'blue' ? 'bg-brand-blue' : 'bg-brand-green'
  const glow = s.color === 'blue' ? 'ring-brand-blue/40' : 'ring-brand-green/40'
  const d = i * 110
  return (
    // Outer: one-time scroll reveal (fade + rise, staggered).
    <div
      className={`h-full transform-gpu transition-all duration-[800ms] ${EASE} ${show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
      style={{ transitionDelay: `${d}ms` }}
    >
      {/* The actual card — expands & glows during the bulb chase.
          The numbered badge sits OUTSIDE the card, popped above its top edge. */}
      <div
        className={`relative flex h-full transform-gpu flex-col items-center rounded-3xl border bg-white p-5 pt-9 text-center transition-all duration-500 ${EASE} ${
          active ? `scale-[1.05] border-brand-blue/30 shadow-cardHover ring-1 ${glow}` : 'border-slate-100 shadow-card'
        }`}
      >
        <span
          className={`absolute -top-6 left-1/2 -translate-x-1/2 flex h-12 w-12 items-center justify-center rounded-full text-lg font-extrabold text-white transition-all duration-500 ${tone} ${
            active ? `shadow-lg ring-4 ring-offset-2 ring-offset-white ${glow} brightness-110` : 'shadow-md ring-4 ring-white'
          }`}
        >
          {s.n}
        </span>
        <h3 className={`flex min-h-[44px] items-center text-[15px] font-bold leading-tight transition-colors duration-500 ${active ? 'text-brand-blue' : 'text-brand-navy'}`}>{s.title}</h3>
        <div className="mt-1 w-full"><StepVisual n={s.n} /></div>
        <p className="mt-3 text-[13px] leading-snug text-slate-500">{s.caption}</p>
      </div>
    </div>
  )
}

/** Reusable fade-and-rise wrapper driven by a `show` flag + delay. */
function Reveal({ show, delay = 0, className = '', children }) {
  return (
    <div
      className={`transform-gpu transition-all duration-[800ms] ${EASE} ${show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/**
 * "Patient Journey" section shown on the landing page below the hero.
 * Reveals on scroll, then runs a looping "bulb chase" that lights up and
 * expands each step card 1 → 6, one after another.
 */
function JourneySection() {
  const [topRef, topIn] = useInView()
  const [panelRef, panelIn] = useInView()
  const [footRef, footIn] = useInView()
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!topIn) return
    const id = setInterval(() => setActive((a) => (a + 1) % JOURNEY.length), 1000)
    return () => clearInterval(id)
  }, [topIn])

  return (
    <section className="border-t border-slate-100 bg-gradient-to-b from-white to-brand-blueLight/40">
      {/* Heading + steps */}
      <div ref={topRef} className="mx-auto max-w-[1320px] px-6 pt-14">
        <Reveal show={topIn} className="text-center">
          <h2 className="text-[26px] font-extrabold leading-tight text-brand-navy md:text-[34px]">
            Your Journey to Better Health, <span className="text-brand-blue">Made Simple</span>
          </h2>
          <p className="mt-2 text-[15px] text-slate-500 md:text-lg">Smart booking. Shorter waits. Happier you.</p>
        </Reveal>

        {/* xl: ONE unified card. Numbered circles ride a connector line that
            straddles the card's top edge, with arrows in between (like the poster). */}
        <div className="relative mt-16 hidden xl:block">
          <div className="rounded-[28px] border border-slate-100 bg-white px-2 pb-8 pt-16 shadow-card">
            <div className="grid grid-cols-6">
              {JOURNEY.map((s, i) => {
                const on = topIn && active === i
                return (
                  <Reveal
                    key={s.n}
                    show={topIn}
                    delay={i * 110}
                    className={`flex h-full ${on ? 'relative z-20' : ''} ${i > 0 ? 'border-l border-slate-100' : ''}`}
                  >
                    {/* Inner layer enlarges & lifts when the chase reaches this step. */}
                    <div
                      className={`flex h-full w-full flex-col items-center rounded-2xl px-4 py-2 text-center transition-all duration-500 ${EASE} ${
                        on ? 'scale-[1.07] bg-white shadow-cardHover ring-1 ring-brand-blue/15' : 'scale-100'
                      }`}
                    >
                      <h3 className={`flex min-h-[44px] items-center text-[15px] font-bold leading-tight transition-colors duration-500 ${on ? 'text-brand-blue' : 'text-brand-navy'}`}>{s.title}</h3>
                      <div className="mt-1 w-full"><StepVisual n={s.n} /></div>
                      <p className="mt-3 text-[13px] leading-snug text-slate-500">{s.caption}</p>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>

          {/* Connector rail: line + arrows + numbered circles, centered on the top edge. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 -translate-y-1/2">
            <div className="relative mx-2 h-full">
              {/* horizontal line spanning circle 1 → 6 centers */}
              <span className={`absolute left-[8.33%] right-[8.33%] top-1/2 h-0.5 -translate-y-1/2 bg-brand-green/40 transition-opacity duration-700 ${topIn ? 'opacity-100' : 'opacity-0'}`} />
              {/* arrows at the midpoints between adjacent circles */}
              {[16.67, 33.33, 50, 66.67, 83.33].map((left, i) => (
                <ArrowRight
                  key={left}
                  style={{ left: `${left}%`, transitionDelay: `${i * 110 + 80}ms` }}
                  className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${EASE} ${topIn ? 'opacity-100' : 'opacity-0'} ${active === i || active === i + 1 ? 'text-brand-green' : 'text-brand-green/40'}`}
                />
              ))}
              {/* the numbered circles, one per column center */}
              <div className="grid h-full grid-cols-6">
                {JOURNEY.map((s, i) => {
                  const tone = s.color === 'blue' ? 'bg-brand-blue' : 'bg-brand-green'
                  const glow = s.color === 'blue' ? 'ring-brand-blue/40' : 'ring-brand-green/40'
                  const on = topIn && active === i
                  return (
                    <div key={s.n} className="flex items-center justify-center">
                      <span className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-extrabold text-white ring-4 ring-white transition-all duration-500 ${tone} ${on ? `scale-110 shadow-lg brightness-110 ${glow}` : 'shadow-md'}`}>{s.n}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        {/* smaller: responsive grid */}
        <div className="mt-8 grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:hidden">
          {JOURNEY.map((s, i) => <StepCard key={s.n} s={s} i={i} show={topIn} active={topIn && active === i} />)}
        </div>
      </div>

      {/* Info panels */}
      <div ref={panelRef} className="mx-auto max-w-[1320px] px-6 py-12">
        <div className="grid gap-5 lg:grid-cols-3">
          <Reveal show={panelIn} delay={0} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-card transition-shadow hover:shadow-cardHover">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] shadow-sm"><WhatsAppLogo className="h-7 w-7 text-white" /></span>
              <span className="-ml-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blueLight text-brand-blue ring-4 ring-white"><MessageSquare className="h-6 w-6" /></span>
              <h3 className="text-[17px] font-extrabold text-brand-navy">WhatsApp / SMS Reminders</h3>
            </div>
            <ul className="space-y-2.5">
              {REMINDERS.map((r) => (
                <li key={r} className="flex items-center gap-2.5 text-[14px] text-slate-600">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-green" /> {r}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal show={panelIn} delay={140} className="flex flex-col items-center rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-card transition-shadow hover:shadow-cardHover">
            <h3 className="text-[17px] font-extrabold text-brand-blue">Multilingual Support</h3>
            <div className="mt-4 grid w-full grid-cols-3 gap-2.5">
              {LANGUAGES_INFO.map((l) => (
                <div key={l.lang} className={`flex min-w-0 flex-col items-center rounded-2xl px-2 py-2.5 text-white shadow-md transition-transform duration-300 hover:-translate-y-1 ${LANG_TONE[l.tone]}`}>
                  <p className="text-[14px] font-extrabold leading-tight">{l.lang}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-white/90">{l.sub}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[13px] text-slate-500">Choose your language. Use with ease.</p>
          </Reveal>

          <Reveal show={panelIn} delay={280} className="rounded-3xl border border-blue-100 bg-brand-blueLight/50 p-6 shadow-card">
            <div className="mb-3 flex items-center gap-3">
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-blue shadow-sm">
                <Building2 className="h-6 w-6" />
                {/* money coin badge */}
                <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-green text-white shadow-sm ring-2 ring-white">
                  <IndianRupee className="h-3.5 w-3.5" strokeWidth={2.75} />
                </span>
              </span>
              <div>
                <p className="text-[13px] font-semibold text-slate-500">Important Note</p>
                <p className="text-[15px] font-extrabold leading-tight text-brand-blue">Doctor fee is paid at the hospital / clinic</p>
              </div>
            </div>
            <p className="text-[13.5px] leading-relaxed text-slate-600">
              The <span className="font-bold text-brand-navy">Doctor Mitra platform fee is only ₹10</span>. The doctor's consultation fee is paid directly at the clinic / hospital.
            </p>
          </Reveal>
        </div>
      </div>

      {/* Trust strip */}
      <div ref={footRef} className="border-t border-slate-100 bg-white/70 px-6 py-5">
        <Reveal show={footIn} className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {TRUST.map(({ icon, text }) => {
            const Icon = TRUST_ICONS[icon]
            return (
              <span key={text} className="flex items-center gap-2 text-[13.5px] font-medium text-slate-600">
                <Icon className="h-5 w-5 text-brand-blue" /> {text}
              </span>
            )
          })}
          <span className="text-[14px] font-extrabold">
            <span className="text-brand-blue">Book smart. Reach on time.</span> <span className="text-brand-green">Consult better.</span>
          </span>
        </Reveal>
      </div>
    </section>
  )
}

export default JourneySection
