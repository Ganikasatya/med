import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, X, Volume2 } from 'lucide-react'
import { useI18n } from '../../i18n/index.jsx'
import { useAuthModal } from '../../context/AuthModalContext.jsx'
import { speak, stopSpeaking } from '../../lib/voice.js'

/**
 * Telugu coach-mark for the landing page.
 *
 * When the UI language is Telugu, a spoken instruction plays and an animated
 * arrow + bubble points at the top-right login / sign-up entry (the desktop
 * "Login / Sign up" button and the mobile hamburger both live there). Tapping
 * "Start sign up" opens the patient modal, where the in-modal voice guide takes
 * over and fills the form by voice.
 *
 * Narration goes through lib/voice.js `speak()`, which uses cloud TTS (Cartesia
 * Sonic — real Telugu voices) when configured and the browser voice otherwise.
 */
export default function LandingGuide() {
  const { lang, t, speech } = useI18n()
  const { openAuth } = useAuthModal()
  const [show, setShow] = useState(false)
  const [anchor, setAnchor] = useState(null) // { right, top } in px, from the real button
  const spokenFor = useRef(null)

  // Show only for Telugu; reset when the user dismisses or switches away.
  useEffect(() => {
    if (lang === 'te') {
      setShow(true)
    } else {
      setShow(false)
      stopSpeaking()
      spokenFor.current = null
    }
  }, [lang])

  // Anchor the arrow to the actual entry button: the "Login / Sign up" button on
  // desktop, the hamburger on mobile (NOT the rightmost "For Clinics" button).
  // Measured from the live DOM so it stays aligned across languages/widths.
  useEffect(() => {
    if (!show) return
    const measure = () => {
      const desktop = window.matchMedia('(min-width: 1024px)').matches
      const el = document.getElementById(desktop ? 'login-signup-btn' : 'nav-menu-btn')
      if (!el) { setAnchor(null); return }
      const r = el.getBoundingClientRect()
      setAnchor({ right: Math.max(8, Math.round(window.innerWidth - r.right)), top: Math.round(r.bottom + 10) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [show])

  // Speak the instruction once per time it appears for Telugu.
  useEffect(() => {
    if (show && spokenFor.current !== lang) {
      spokenFor.current = lang
      speak(t('land.guide.speak'), speech)
    }
  }, [show, lang, t, speech])

  useEffect(() => () => stopSpeaking(), [])

  const startSignup = () => {
    stopSpeaking()
    setShow(false)
    openAuth('patient')
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{ right: anchor?.right ?? 12, top: anchor?.top ?? 86 }}
          className="fixed z-[60] w-[260px]"
        >
          {/* Arrow pointing up toward the login / menu button */}
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
            className="mb-1 flex justify-end pr-6"
          >
            <ArrowUp className="h-6 w-6 text-brand-blue" strokeWidth={2.5} />
          </motion.div>

          <div className="relative rounded-2xl border border-brand-blue/20 bg-white p-4 shadow-cardHover">
            <button
              onClick={() => { stopSpeaking(); setShow(false) }}
              aria-label={t('land.guide.dismiss')}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-2 pr-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blueLight text-brand-blue">
                <Volume2 className="h-4 w-4" />
              </span>
              <p className="text-[13px] font-semibold leading-snug text-brand-navy">
                {t('land.guide.bubble')}
              </p>
            </div>

            <button
              onClick={startSignup}
              className="mt-3 w-full rounded-xl bg-brand-blue py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-blueDark"
            >
              {t('land.guide.cta')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
