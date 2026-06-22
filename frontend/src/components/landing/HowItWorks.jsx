import { Fragment, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { HOW_IT_WORKS } from '../../data/landingData.js'
import { useI18n } from '../../i18n/index.jsx'

/**
 * "How it works" — four steps as 3D flip cards.
 *
 * Front shows the step's icon + heading (with a small step number chip). On
 * hover (or tap on touch) the card flips to reveal the description. Cards fade
 * in on scroll; the connectors draw in with an arrow that nudges forward.
 */

// Per-step accent palette: front icon tint + the colourful back face.
const ACCENTS = {
  search: { chip: 'bg-brand-blue', tile: 'text-brand-blue', tileBg: 'bg-brand-blue/10', glow: 'bg-brand-blue/25', back: 'from-brand-blue to-brand-blueDark', backGlow: 'bg-white/25' },
  book: { chip: 'bg-emerald-500', tile: 'text-emerald-600', tileBg: 'bg-emerald-500/10', glow: 'bg-emerald-400/25', back: 'from-emerald-500 to-emerald-600', backGlow: 'bg-white/25' },
  getToken: { chip: 'bg-orange-500', tile: 'text-orange-500', tileBg: 'bg-orange-500/10', glow: 'bg-orange-400/25', back: 'from-orange-500 to-amber-500', backGlow: 'bg-white/25' },
  visitOnTime: { chip: 'bg-teal-600', tile: 'text-teal-600', tileBg: 'bg-teal-500/10', glow: 'bg-teal-400/25', back: 'from-teal-600 to-cyan-600', backGlow: 'bg-white/25' },
}

const EASE = [0.22, 1, 0.36, 1]

function FlipStep({ step, stepKey, Icon, index }) {
  const { t } = useI18n()
  const [flipped, setFlipped] = useState(false)
  const a = ACCENTS[stepKey] || ACCENTS.search

  return (
    <motion.div
      className="flex min-w-[128px] flex-1"
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: EASE, delay: index * 0.12 }}
    >
      <div
        className="h-[188px] w-full cursor-pointer [perspective:1100px]"
        onMouseEnter={() => setFlipped(true)}
        onMouseLeave={() => setFlipped(false)}
        onClick={() => setFlipped((f) => !f)}
      >
        <motion.div
          className="relative h-full w-full [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {/* ---------- Front: icon + heading ---------- */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-slate-100 bg-white px-3 text-center shadow-card [backface-visibility:hidden] transition-shadow group-hover:shadow-lg">
            {/* sheen sweep on hover */}
            <motion.span
              className="pointer-events-none absolute -inset-y-2 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
              animate={flipped ? { x: ['0%', '420%'] } : { x: '0%' }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
            />
            {/* step number chip */}
            <span className={`absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold text-white shadow ${a.chip}`}>
              {step}
            </span>
            {/* icon tile with soft accent glow + gentle float */}
            <div className="relative">
              <span className={`absolute inset-0 -z-10 rounded-2xl blur-xl ${a.glow}`} />
              <motion.span
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${a.tileBg} ${a.tile}`}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
              >
                <Icon className="h-7 w-7" />
              </motion.span>
            </div>
            <h3 className="text-[16px] font-extrabold text-brand-navy">{t(`how.${stepKey}.title`)}</h3>
            <span className="text-[10.5px] font-semibold text-slate-400">{t('how.hint')}</span>
          </div>

          {/* ---------- Back: description ---------- */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2.5 overflow-hidden rounded-3xl bg-gradient-to-br px-4 text-center text-white shadow-[0_20px_45px_rgba(15,23,42,0.22)] [backface-visibility:hidden] [transform:rotateY(180deg)] ${a.back}`}>
            <span className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${a.backGlow}`} />
            <span className={`absolute -bottom-8 -left-6 h-24 w-24 rounded-full blur-2xl ${a.backGlow}`} />
            <motion.span
              className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30"
              animate={flipped ? { scale: [0.5, 1.15, 1], rotate: [0, -10, 0] } : { scale: 1 }}
              transition={{ duration: 0.55, ease: EASE, delay: flipped ? 0.2 : 0 }}
            >
              <Icon className="h-6 w-6" />
            </motion.span>
            <h3 className="relative text-[14px] font-extrabold">{t(`how.${stepKey}.title`)}</h3>
            <p className="relative text-[11.5px] leading-snug text-white/90">{t(`how.${stepKey}.desc`)}</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// Clearly-visible connector: a coloured dashed line on each side of a chevron
// badge that nudges forward, all drawn in once scrolled into view.
function Connector({ index }) {
  const delay = 0.3 + index * 0.12
  const dash = { backgroundImage: 'repeating-linear-gradient(90deg,#94a3b8 0 6px,transparent 6px 12px)' }
  return (
    <div className="flex w-10 shrink-0 items-center self-center gap-0 pt-1 sm:w-12">
      <motion.span
        className="h-[3px] flex-1 origin-left rounded-full"
        style={dash}
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, ease: EASE, delay }}
      />
      <motion.span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 320, damping: 18, delay: delay + 0.15 }}
      >
        <motion.span
          animate={{ x: [0, 3, 0] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 }}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={3} />
        </motion.span>
      </motion.span>
      <motion.span
        className="h-[3px] flex-1 origin-left rounded-full"
        style={dash}
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, ease: EASE, delay: delay + 0.1 }}
      />
    </div>
  )
}

function HowItWorks() {
  const { t } = useI18n()

  return (
    <section className="group flex w-full flex-col">
      <motion.h2
        className="mb-5 text-2xl font-extrabold text-brand-navy"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        {t('how.heading')}
      </motion.h2>

      <div className="flex items-stretch overflow-x-auto pb-1 sm:overflow-x-visible">
        {HOW_IT_WORKS.map(({ step, key, icon: Icon }, i) => (
          <Fragment key={step}>
            <FlipStep step={step} stepKey={key} Icon={Icon} index={i} />
            {i < HOW_IT_WORKS.length - 1 && <Connector index={i} />}
          </Fragment>
        ))}
      </div>
    </section>
  )
}

export default HowItWorks
