import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FEATURES } from '../../data/landingData.js'
import { useI18n } from '../../i18n/index.jsx'

/**
 * Expanding accordion of trust/feature cards below the hero search.
 *
 * Idle: all cards equal, showing icon + title. Hover one and it grows to reveal
 * its description (and lights up in its accent colour) while the rest shrink to
 * icon-only. Tapping toggles it on touch devices.
 */

// Accent per card (cycled across the six features).
const ACCENTS = [
  { tint: 'bg-brand-blue/10 text-brand-blue', grad: 'from-brand-blue to-brand-blueDark' },
  { tint: 'bg-emerald-500/10 text-emerald-600', grad: 'from-emerald-500 to-emerald-600' },
  { tint: 'bg-orange-500/10 text-orange-500', grad: 'from-orange-500 to-amber-500' },
  { tint: 'bg-teal-500/10 text-teal-600', grad: 'from-teal-600 to-cyan-600' },
  { tint: 'bg-purple-500/10 text-purple-600', grad: 'from-purple-500 to-fuchsia-500' },
  { tint: 'bg-rose-500/10 text-rose-500', grad: 'from-rose-500 to-pink-500' },
]

const EASE = [0.22, 1, 0.36, 1]

function FeatureCards() {
  const { t } = useI18n()
  const [active, setActive] = useState(null)

  return (
    <section className="flex shrink-0 items-stretch gap-3 px-8 pt-3">
      {FEATURES.map(({ key, icon: Icon }, i) => {
        const a = ACCENTS[i % ACCENTS.length]
        const isActive = active === i
        const dimmed = active !== null && !isActive
        const flexGrow = isActive ? 3.4 : active !== null ? 0.7 : 1

        return (
          <motion.div
            key={key}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onClick={() => setActive((p) => (p === i ? null : i))}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.45, ease: EASE, delay: i * 0.07 }}
            style={{ flexGrow, flexBasis: 0, minWidth: 66 }}
            className={`relative h-[116px] cursor-pointer select-none overflow-hidden rounded-2xl border bg-white shadow-card [transition:flex-grow_0.5s_cubic-bezier(0.22,1,0.36,1),box-shadow_0.4s,border-color_0.4s] ${
              isActive ? 'border-transparent shadow-cardHover' : 'border-slate-100'
            }`}
          >
            {/* Accent gradient wash — fades in only for the active card. */}
            <motion.span
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${a.grad}`}
              animate={{ opacity: isActive ? 1 : 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            />
            {isActive && (
              <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/25 blur-2xl" />
            )}

            <div className="relative flex h-full flex-col justify-center gap-2 p-4">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 transition-colors duration-300 ${
                  isActive ? 'bg-white/20 text-white ring-white/30' : `${a.tint} ring-transparent`
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>

              {/* Title fades out on the shrunk (dimmed) cards. */}
              <motion.h3
                animate={{ opacity: dimmed ? 0 : 1 }}
                transition={{ duration: 0.25 }}
                className={`whitespace-nowrap text-[14px] font-bold leading-tight transition-colors duration-300 ${
                  isActive ? 'text-white' : 'text-brand-navy'
                }`}
              >
                {t(`feat.${key}.title`)}
              </motion.h3>

              {/* Description revealed only when expanded. */}
              <AnimatePresence>
                {isActive && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.3, ease: EASE, delay: 0.1 }}
                    className="max-w-[260px] text-[12.5px] leading-snug text-white/90"
                  >
                    {t(`feat.${key}.desc`)}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )
      })}
    </section>
  )
}

export default FeatureCards
