import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, ChevronDown, User, Stethoscope } from 'lucide-react'
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
  const [city, setCity] = useState(BRAND.city)
  const langRef = useRef(null)
  const roleRef = useRef(null)
  const cityRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false)
      if (roleRef.current && !roleRef.current.contains(e.target)) setRoleOpen(false)
      if (cityRef.current && !cityRef.current.contains(e.target)) setCityOpen(false)
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
    <header className="z-30 flex h-20 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-8">
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

      {/* Right: language + auth */}
      <div className="flex items-center gap-4">
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-[15px] font-medium text-brand-navy hover:border-slate-300"
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
            onClick={() => setRoleOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-brand-blue px-5 py-2 text-[15px] font-semibold text-brand-blue transition-colors hover:bg-brand-blueLight"
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
          className="rounded-lg bg-brand-blue px-5 py-2 text-[15px] font-semibold text-white transition-colors hover:bg-brand-blueDark"
        >
          {t('nav.forClinics')}
        </button>
      </div>
    </header>
  )
}

export default Navbar
