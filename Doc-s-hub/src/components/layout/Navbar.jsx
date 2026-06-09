import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, ChevronDown, User, Stethoscope } from 'lucide-react'
import Logo from '../common/Logo.jsx'
import AuthModal from '../auth/AuthModal.jsx'
import { NAV_LINKS, LANGUAGES, BRAND } from '../../data/landingData.js'

/**
 * Top navigation bar (≈80px tall) matching the reference spacing.
 *  - Left: brand logo + location selector
 *  - Center: primary nav links
 *  - Right: language dropdown, Login/Sign up, For Clinics
 *
 * Only the language dropdown is interactive (opens on click, closes outside).
 */
function Navbar() {
  const navigate = useNavigate()
  const [langOpen, setLangOpen] = useState(false)
  const [language, setLanguage] = useState(LANGUAGES[0])
  const [roleOpen, setRoleOpen] = useState(false)
  const [auth, setAuth] = useState({ open: false, role: 'patient' })
  const langRef = useRef(null)
  const roleRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false)
      if (roleRef.current && !roleRef.current.contains(e.target)) setRoleOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openAuth = (role) => {
    setRoleOpen(false)
    setAuth({ open: true, role })
  }

  // Deep-link support: /?auth=patient or /?auth=doctor opens the modal directly.
  useEffect(() => {
    const role = new URLSearchParams(window.location.search).get('auth')
    if (role === 'patient' || role === 'doctor') setAuth({ open: true, role })
  }, [])

  return (
    <header className="z-30 flex h-20 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-8">
      {/* Left: logo + location */}
      <div className="flex items-center gap-6">
        <Logo />
        <div className="hidden items-center gap-2 border-l border-slate-200 pl-6 lg:flex">
          <MapPin className="h-5 w-5 text-brand-green" />
          <div className="leading-tight">
            <div className="flex items-center gap-1 text-[15px] font-bold text-brand-navy">
              {BRAND.city}
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
            <button className="text-xs text-slate-400 hover:text-brand-blue">
              Change City
            </button>
          </div>
        </div>
      </div>

      {/* Center: nav links */}
      <nav className="hidden items-center gap-10 lg:flex">
        {NAV_LINKS.map((link) => (
          <button
            key={link}
            className="text-[15px] font-medium text-slate-700 transition-colors hover:text-brand-blue"
          >
            {link}
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
            {language}
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${
                langOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {langOpen && (
            <ul className="absolute right-0 top-full z-40 mt-1 w-36 overflow-hidden rounded-lg border border-slate-100 bg-white py-1 shadow-cardHover">
              {LANGUAGES.map((lang) => (
                <li key={lang}>
                  <button
                    onClick={() => {
                      setLanguage(lang)
                      setLangOpen(false)
                    }}
                    className={`block w-full px-4 py-2 text-left text-[15px] hover:bg-brand-blueLight ${
                      lang === language
                        ? 'font-semibold text-brand-blue'
                        : 'text-slate-600'
                    }`}
                  >
                    {lang}
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
            Login / Sign up
            <ChevronDown className={`h-4 w-4 transition-transform ${roleOpen ? 'rotate-180' : ''}`} />
          </button>
          {roleOpen && (
            <ul className="absolute right-0 top-full z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-100 bg-white py-1.5 shadow-cardHover">
              <li>
                <button
                  onClick={() => openAuth('patient')}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-blueLight"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blueLight text-brand-blue">
                    <User className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-brand-navy">Patient</span>
                    <span className="block text-[11px] text-slate-400">Book doctors & get tokens</span>
                  </span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => openAuth('doctor')}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-greenLight"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-greenLight text-brand-green">
                    <Stethoscope className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-brand-navy">Doctor</span>
                    <span className="block text-[11px] text-slate-400">Manage patients & schedule</span>
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
          For Clinics
        </button>
      </div>

      <AuthModal
        open={auth.open}
        role={auth.role}
        onClose={() => setAuth((a) => ({ ...a, open: false }))}
      />
    </header>
  )
}

export default Navbar
