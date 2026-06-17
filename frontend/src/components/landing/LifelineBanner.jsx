import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Phone, Ambulance } from 'lucide-react'
import { useI18n } from '../../i18n/index.jsx'

function EmergencyAmbulance() {
  return (
    <svg
      width="76"
      height="34"
      viewBox="0 0 76 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-[34px] w-[76px] drop-shadow-[0_10px_14px_rgba(15,39,66,0.18)]"
    >
      <path d="M13 8.5H46.5C49.9 8.5 52.8 10.5 54 13.7L57 21.5H8V13.5C8 10.8 10.3 8.5 13 8.5Z" fill="#FFFFFF" />
      <path d="M55 14H64.8C66.2 14 67.5 14.8 68.2 16L72 21.5H57L55 14Z" fill="#FFFFFF" />
      <path d="M15.5 11.5H31V18H15.5V11.5Z" fill="#CFF5F0" />
      <path d="M35 11.5H48.5L51 18H35V11.5Z" fill="#CFF5F0" />
      <path d="M60 16.3H65.7L68.1 20H61.1L60 16.3Z" fill="#A7EDE7" />
      <path d="M7 20.5H72.5C74 20.5 75 21.7 75 23.1V25H5V22.5C5 21.4 5.9 20.5 7 20.5Z" fill="#EF4444" />
      <path d="M6 24.8H75V26.3C75 28.2 73.5 29.7 71.6 29.7H9.4C7.5 29.7 6 28.2 6 26.3V24.8Z" fill="#FFFFFF" />
      <path d="M23 16.8V12.8M21 14.8H25" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      <path d="M38 22.8H52.5" stroke="#0F766E" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M13 8.5H46.5C49.9 8.5 52.8 10.5 54 13.7L57 21.5H72.5C74 21.5 75 22.7 75 24.1V26.3C75 28.2 73.5 29.7 71.6 29.7H9.4C7.5 29.7 6 28.2 6 26.3V13.5C6 10.8 8.3 8.5 13 8.5Z" stroke="#16324F" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M29.5 8.5H40.5L38.4 4.5H31.6L29.5 8.5Z" fill="#EF4444" stroke="#16324F" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M33 5.3H37" stroke="#FECACA" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="21" cy="29" r="4.6" fill="#16324F" />
      <circle cx="21" cy="29" r="2" fill="#CBD5E1" />
      <circle cx="61" cy="29" r="4.6" fill="#16324F" />
      <circle cx="61" cy="29" r="2" fill="#CBD5E1" />
      <path d="M3.5 22H1M4.5 17.5H2" stroke="#EF4444" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

/**
 * "Lifeline — 24/7 Emergency Support" banner for the landing page.
 *
 * Hovering (or focusing) either action button sets `hot`, which makes the heart
 * on the left fill red and beat, the heart tile glow red, and the little ECG
 * trace turn red — a coordinated "this is urgent" cue.
 */
function LifelineBanner() {
  const [hot, setHot] = useState(false)
  const [ambulanceHot, setAmbulanceHot] = useState(false)
  const { t } = useI18n()

  // Shared hover/focus handlers so both buttons drive the same heart animation.
  const arm = {
    onMouseEnter: () => setHot(true),
    onMouseLeave: () => setHot(false),
    onFocus: () => setHot(true),
    onBlur: () => setHot(false),
  }

  const ambulanceArm = {
    onMouseEnter: () => {
      setHot(true)
      setAmbulanceHot(true)
    },
    onMouseLeave: () => {
      setHot(false)
      setAmbulanceHot(false)
    },
    onFocus: () => {
      setHot(true)
      setAmbulanceHot(true)
    },
    onBlur: () => {
      setHot(false)
      setAmbulanceHot(false)
    },
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="px-8"
    >
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white px-6 py-5 shadow-[0_10px_40px_rgba(15,39,66,0.07)]">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-[44%] right-[10.5rem] top-2 z-20 hidden h-10 lg:block xl:left-[42%]"
          initial={false}
          animate={ambulanceHot ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <span className="absolute right-0 top-1 grid h-7 w-7 place-items-center rounded-full border border-red-100 bg-red-50 text-red-500 shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_4px_rgba(254,202,202,0.75)]" />
          </span>
          <motion.span
            className="absolute left-2 right-8 top-4 h-px rounded-full bg-gradient-to-r from-red-400 via-red-200 to-transparent"
            initial={false}
            animate={ambulanceHot ? { scaleX: [0, 1, 1] } : { scaleX: 0 }}
            style={{ transformOrigin: 'left center' }}
            transition={ambulanceHot ? { duration: 4.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.55 } : { duration: 0.2 }}
          />
          <motion.span
            className="absolute top-0 block h-[34px] w-[76px]"
            initial={false}
            animate={
              ambulanceHot
                ? { left: ['0%', 'calc(100% - 104px)'], y: [0, -1, 1, -1, 0], scale: [0.96, 1.01, 1] }
                : { left: '0%', y: 0, scale: 0.9 }
            }
            transition={
              ambulanceHot
                ? {
                    left: { duration: 4.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.55 },
                    y: { duration: 0.6, repeat: Infinity },
                    scale: { duration: 0.3 },
                  }
                : { duration: 0.2 }
            }
          >
            <EmergencyAmbulance />
            <span className="absolute -left-1 top-3 h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_14px_5px_rgba(248,113,113,0.45)]" />
          </motion.span>
        </motion.div>

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left — heart + copy */}
        <div className="flex items-center gap-4">
          <motion.span
            className={`relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl transition-colors duration-500 ${
              hot ? 'bg-red-50 shadow-[0_0_0_8px_rgba(254,226,226,0.55)]' : 'bg-teal-50'
            }`}
            animate={hot ? { scale: [1, 1.2, 0.94, 1.14, 1] } : { scale: 1 }}
            transition={hot ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
          >
            <motion.span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 bg-red-500/15"
              initial={false}
              animate={hot ? { height: '100%' } : { height: '0%' }}
              transition={{ duration: ambulanceHot ? 0.75 : 0.35, ease: 'easeOut' }}
            />
            <Heart
              className={`relative h-7 w-7 transition-colors duration-500 ${
                hot ? 'fill-red-500 stroke-red-500' : 'fill-transparent stroke-teal-600'
              }`}
            />
          </motion.span>

          <div className="leading-tight">
            <h3 className="text-[17px] font-extrabold text-brand-navy">
              {t('life.title')}
            </h3>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {t('life.services')}
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-[12px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {t('life.available')}
              </span>
              <span className="text-slate-300">·</span>
              <span>
                {t('life.avg')} <b className="font-bold text-brand-navy">2–5 min</b>
              </span>
              {/* Flowing ECG trace */}
              <svg width="46" height="14" viewBox="0 0 46 14" className="overflow-visible">
                <motion.polyline
                  points="0,7 8,7 12,2 16,12 20,7 30,7 34,4 38,10 42,7 46,7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="5 5"
                  className={`transition-colors duration-500 ${hot ? 'text-red-500' : 'text-teal-500'}`}
                  animate={{ strokeDashoffset: [10, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Right — actions */}
        <div className="flex flex-wrap gap-3">
          <a
            href="tel:104"
            {...arm}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[14px] font-bold text-brand-navy outline-none transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 hover:shadow-md focus-visible:border-red-300 focus-visible:bg-red-50 focus-visible:text-red-600"
          >
            <Phone className="h-4 w-4" /> {t('life.call')}
          </a>
          <a
            href="tel:108"
            {...ambulanceArm}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[14px] font-bold text-brand-navy outline-none transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 hover:shadow-md focus-visible:border-red-300 focus-visible:bg-red-50 focus-visible:text-red-600"
          >
            <Ambulance className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" /> {t('life.ambulance')}
          </a>
        </div>
        </div>
      </div>
    </motion.section>
  )
}

export default LifelineBanner
