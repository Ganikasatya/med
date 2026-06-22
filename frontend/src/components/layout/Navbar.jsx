import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, ChevronDown, User, Stethoscope, Menu, X } from 'lucide-react'
import Logo from '../common/Logo.jsx'
import { BRAND } from '../../data/landingData.js'
import { useAuthModal } from '../../context/AuthModalContext.jsx'
import { useI18n, LANGS } from '../../i18n/index.jsx'

const CITIES = ['Vijayawada', 'Hyderabad', 'Guntur', 'Visakhapatnam', 'Bengaluru', 'Chennai']

/**
 * Top navigation bar. Language selector drives the whole UI (i18n); nav links
 * open the patient login/signup flow; city selector is a simple picker.
 */
function Navbar() {
  const navigate = useNavigate()
  const { openAuth: openAuthModal } = useAuthModal()
  const { t, lang, setLang } = useI18n()
  const [langOpen, setLangOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [city, setCity] = useState(BRAND.city)
  const langRef = useRef(null)
  const roleRef = useRef(null)
  const cityRef = useRef(null)
  const mobileRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false)
      if (roleRef.current && !roleRef.current.contains(e.target)) setRoleOpen(false)
      if (cityRef.current && !cityRef.current.contains(e.target)) setCityOpen(false)
      if (mobileRef.current && !mobileRef.current.contains(e.target)) setMobileOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openAuth = (role) => {
    setRoleOpen(false)
    openAuthModal(role)
  }

  const NAV = [
    { key: 'nav.findDoctors', role: 'patient' },
    { key: 'nav.findClinics', role: 'patient' },
    { key: 'nav.healthArticles', role: 'patient' },
  ]

  return (
    <header className="relative z-30 flex h-20 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-6 lg:px-8">
      {/* Left: logo + location */}
      <div className="flex items-center gap-6">
        <Logo />
        <div className="hidden items-center gap-2 border-l border-slate-200 pl-6 lg:flex" ref={cityRef}>
          <MapPin className="h-5 w-5 text-brand-green" />
          <div className="relative leading-tight">
            <button onClick={() => setCityOpen((o) => !o)} className="flex items-center gap-1 text-[15px] font-bold text-brand-navy">
              {city}
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
            </button>
            <button onClick={() => setCityOpen((o) => !o)} className="block text-xs text-slate-400 hover:text-brand-blue">
              {t('nav.changeCity')}
            </button>
            {cityOpen && (
              <ul className="absolute left-0 top-full z-40 mt-1 w-44 overflow-hidden rounded-lg border border-slate-100 bg-white py-1 shadow-cardHover">
                {CITIES.map((c) => (
                  <li key={c}>
                    <button
                      onClick={() => { setCity(c); setCityOpen(false) }}
                      className={`block w-full px-4 py-2 text-left text-[14px] hover:bg-brand-blueLight ${c === city ? 'font-semibold text-brand-blue' : 'text-slate-600'}`}
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Center: nav links → patient app entry */}
      <nav className="hidden items-center gap-10 lg:flex">
        {NAV.map((item) => (
          <button
            key={item.key}
            onClick={() => openAuth(item.role)}
            className="text-[15px] font-medium text-slate-700 transition-colors hover:text-brand-blue"
          >
            {t(item.key)}
          </button>
        ))}
      </nav>

      {/* Right: language + auth (desktop) */}
      <div className="hidden items-center gap-2 sm:gap-3 lg:flex lg:gap-4">
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[15px] font-medium text-brand-navy hover:border-slate-300 lg:px-4"
          >
            {LANGS[lang].label}
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
          </button>
          {langOpen && (
            <ul className="absolute right-0 top-full z-40 mt-1 w-36 overflow-hidden rounded-lg border border-slate-100 bg-white py-1 shadow-cardHover">
              {Object.entries(LANGS).map(([code, meta]) => (
                <li key={code}>
                  <button
                    onClick={() => { setLang(code); setLangOpen(false) }}
                    className={`block w-full px-4 py-2 text-left text-[15px] hover:bg-brand-blueLight ${code === lang ? 'font-semibold text-brand-blue' : 'text-slate-600'}`}
                  >
                    {meta.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Login / Sign up → Patient / Doctor dropdown */}
        <div className="relative" ref={roleRef}>
          <button
            id="login-signup-btn"
            onClick={() => setRoleOpen((o) => !o)}
            className={`flex items-center gap-2 rounded-lg border border-brand-blue px-3 py-2 text-[15px] font-semibold text-brand-blue transition-colors hover:bg-brand-blueLight lg:px-5 ${
              lang === 'te' ? 'ring-2 ring-brand-blue ring-offset-2' : ''
            }`}
          >
            {t('nav.loginSignup')}
            <ChevronDown className={`h-4 w-4 transition-transform ${roleOpen ? 'rotate-180' : ''}`} />
          </button>
          {roleOpen && (
            <ul className="absolute right-0 top-full z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-100 bg-white py-1.5 shadow-cardHover">
              <li>
                <button onClick={() => openAuth('patient')} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-blueLight">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blueLight text-brand-blue">
                    <User className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-brand-navy">{t('nav.patient')}</span>
                    <span className="block text-[11px] text-slate-400">{t('nav.patientDesc')}</span>
                  </span>
                </button>
              </li>
              <li>
                <button onClick={() => openAuth('doctor')} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-greenLight">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-greenLight text-brand-green">
                    <Stethoscope className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-brand-navy">{t('nav.doctor')}</span>
                    <span className="block text-[11px] text-slate-400">{t('nav.doctorDesc')}</span>
                  </span>
                </button>
              </li>
            </ul>
          )}
        </div>

        <button
          onClick={() => navigate('/clinic-login')}
          className="whitespace-nowrap rounded-lg bg-brand-blue px-3 py-2 text-[15px] font-semibold text-white transition-colors hover:bg-brand-blueDark lg:px-5"
        >
          {t('nav.forClinics')}
        </button>
      </div>

      {/* Mobile: hamburger + dropdown (everything from the desktop bar) */}
      <div className="relative lg:hidden" ref={mobileRef}>
        <button
          id="nav-menu-btn"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
          className={`flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-brand-navy hover:border-slate-300 ${
            lang === 'te' ? 'ring-2 ring-brand-blue ring-offset-2' : ''
          }`}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {mobileOpen && (
          <div className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-100 bg-white py-2 shadow-cardHover">
            {/* Nav links */}
            {NAV.map((item) => (
              <button
                key={item.key}
                onClick={() => { setMobileOpen(false); openAuth(item.role) }}
                className="block w-full px-4 py-2.5 text-left text-[15px] font-medium text-slate-700 hover:bg-brand-blueLight"
              >
                {t(item.key)}
              </button>
            ))}

            {/* Auth */}
            <div className="my-1.5 border-t border-slate-100" />
            <button
              onClick={() => { setMobileOpen(false); openAuth('patient') }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-blueLight"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blueLight text-brand-blue">
                <User className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-brand-navy">{t('nav.patient')}</span>
            </button>
            <button
              onClick={() => { setMobileOpen(false); openAuth('doctor') }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-greenLight"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-greenLight text-brand-green">
                <Stethoscope className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-brand-navy">{t('nav.doctor')}</span>
            </button>
            <div className="px-3 pt-1.5">
              <button
                onClick={() => { setMobileOpen(false); navigate('/clinic-login') }}
                className="w-full rounded-lg bg-brand-blue px-4 py-2.5 text-center text-[15px] font-semibold text-white transition-colors hover:bg-brand-blueDark"
              >
                {t('nav.forClinics')}
              </button>
            </div>

            {/* Language */}
            <div className="my-1.5 border-t border-slate-100" />
            <div className="flex flex-wrap gap-2 px-4 pb-1.5 pt-1.5">
              {Object.entries(LANGS).map(([code, meta]) => (
                <button
                  key={code}
                  onClick={() => { setLang(code); setMobileOpen(false) }}
                  className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold ${
                    code === lang ? 'border-brand-blue bg-brand-blueLight text-brand-blue' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Navbar
